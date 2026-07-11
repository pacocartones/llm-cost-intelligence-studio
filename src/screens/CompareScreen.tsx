import { useState } from 'react'
import { calculateScenarioCost } from '../lib/costing'
import type { ModelRecord, ScenarioInput } from '../types/domain'

type DecisionMode = 'cheapest' | 'balanced' | 'context' | 'premium'

const decisionModes: {
  id: DecisionMode
  label: string
  description: string
}[] = [
  {
    id: 'balanced',
    label: 'Best default',
    description: 'Good product tradeoff between economics and capability.',
  },
  {
    id: 'cheapest',
    label: 'Cheapest',
    description: 'Optimize for cost first.',
  },
  {
    id: 'context',
    label: 'Long context',
    description: 'Bias toward heavy-context and retrieval scenarios.',
  },
  {
    id: 'premium',
    label: 'Premium quality',
    description: 'Bias toward stronger capability even if cost rises.',
  },
]

function getModeScore(
  model: ModelRecord,
  recurringCost: number,
  cheapestCost: number,
  mode: DecisionMode,
) {
  const costRatio = recurringCost > 0 ? cheapestCost / recurringCost : 1
  const reasoning = model.capabilities.reasoning ? 1 : 0
  const vision = model.capabilities.vision ? 1 : 0
  const tools = model.capabilities.tools ? 1 : 0
  const caching = model.capabilities.caching ? 1 : 0
  const contextFactor = model.contextWindowK / 1000
  const tierFactor =
    model.tier === 'flagship' ? 1 : model.tier === 'balanced' ? 0.7 : 0.4

  if (mode === 'cheapest') {
    return costRatio * 0.8 + caching * 0.1 + tools * 0.1
  }

  if (mode === 'context') {
    return contextFactor * 0.45 + caching * 0.2 + reasoning * 0.15 + costRatio * 0.2
  }

  if (mode === 'premium') {
    return tierFactor * 0.35 + reasoning * 0.2 + vision * 0.1 + tools * 0.1 + contextFactor * 0.1 + costRatio * 0.15
  }

  return tierFactor * 0.25 + costRatio * 0.35 + reasoning * 0.15 + tools * 0.1 + caching * 0.1 + contextFactor * 0.05
}

function getModeNarrative(mode: DecisionMode) {
  if (mode === 'cheapest') {
    return 'Use this lens when budget pressure dominates and you need a viable low-cost default.'
  }

  if (mode === 'context') {
    return 'Use this lens when retrieved context, long sessions, or large docs are driving architecture decisions.'
  }

  if (mode === 'premium') {
    return 'Use this lens when quality, reasoning depth, or flagship product moments justify higher cost.'
  }

  return 'Use this lens when you want the best overall product default rather than the absolute cheapest model.'
}

function buildRoutingBlueprint(
  entries: Array<{
    model: ModelRecord
    cost: ReturnType<typeof calculateScenarioCost>
  }>,
) {
  const routerEntry =
    entries.find((entry) => entry.model.tier === 'efficient') ?? entries[0]
  const defaultEntry =
    entries.find(
      (entry) =>
        entry.model.id !== routerEntry.model.id && entry.model.tier === 'balanced',
    ) ??
    entries.find((entry) => entry.model.id !== routerEntry.model.id) ??
    entries[0]
  const premiumEntry =
    entries.find(
      (entry) =>
        entry.model.id !== routerEntry.model.id &&
        entry.model.id !== defaultEntry.model.id &&
        entry.model.tier === 'flagship',
    ) ??
    entries.find(
      (entry) =>
        entry.model.id !== routerEntry.model.id &&
        entry.model.id !== defaultEntry.model.id,
    ) ??
    defaultEntry

  const stack = [
    {
      role: 'Router / cheap path',
      share: 0.65,
      entry: routerEntry,
      note: 'Handles triage, simple transforms, and the bulk of traffic.',
    },
    {
      role: 'Primary default',
      share: 0.25,
      entry: defaultEntry,
      note: 'Owns the main product experience for normal user requests.',
    },
    {
      role: 'Premium fallback',
      share: 0.1,
      entry: premiumEntry,
      note: 'Reserved for hard reasoning, longer context, or high-value moments.',
    },
  ]

  const blendedRecurring = stack.reduce(
    (total, slot) => total + slot.entry.cost.totalRecurring * slot.share,
    0,
  )
  const blendedMonthly = stack.reduce(
    (total, slot) => total + slot.entry.cost.monthlyRecurring * slot.share,
    0,
  )

  return {
    stack,
    blendedRecurring,
    blendedMonthly,
  }
}

interface CompareScreenProps {
  models: ModelRecord[]
  scenario: ScenarioInput
  selectedModelId: string
  selectedProviderId: string
}

export function CompareScreen({
  models,
  scenario,
  selectedModelId,
  selectedProviderId,
}: CompareScreenProps) {
  const [mode, setMode] = useState<DecisionMode>('balanced')
  const sameProvider = models.filter((model) => model.providerId === selectedProviderId)
  const crossProvider = [
    ...sameProvider,
    ...models.filter((model) => model.providerId !== selectedProviderId),
  ]

  const comparisonSource = sameProvider.length >= 2 ? crossProvider : models
  const costEntries = comparisonSource
    .map((model) => ({
      model,
      cost: calculateScenarioCost(model, scenario),
    }))
    .sort((left, right) => left.cost.totalRecurring - right.cost.totalRecurring)
  const cheapestCost = costEntries[0]?.cost.totalRecurring ?? 1
  const allEntries = costEntries
    .map((entry) => ({
      ...entry,
      score: getModeScore(entry.model, entry.cost.totalRecurring, cheapestCost, mode),
    }))
    .sort((left, right) => right.score - left.score)
  const comparison = allEntries
    .slice(0, 6)

  const winner = comparison[0]
  const currentEntry =
    allEntries.find((entry) => entry.model.id === selectedModelId) ?? allEntries[0]
  const flagshipEntry =
    comparison.find((entry) => entry.model.tier === 'flagship') ?? comparison[0]
  const balancedEntry =
    comparison.find((entry) => entry.model.tier === 'balanced') ?? comparison[0]
  const efficientEntry =
    comparison.find((entry) => entry.model.tier === 'efficient') ?? comparison[0]
  const routingBlueprint = buildRoutingBlueprint(comparison)

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Compare</p>
          <h2>Best candidates for the same scenario</h2>
        </div>
      </div>

      <div className="mode-strip">
        {decisionModes.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={entry.id === mode ? 'active' : ''}
            onClick={() => setMode(entry.id)}
          >
            <span>{entry.label}</span>
            <small>{entry.description}</small>
          </button>
        ))}
      </div>

      <div className="decision-grid">
        <article className="decision-card">
          <span>Cheapest path</span>
          <strong>{efficientEntry.model.name}</strong>
          <p>${efficientEntry.cost.totalRecurring.toFixed(4)} per recurring request</p>
        </article>
        <article className="decision-card">
          <span>Strong default</span>
          <strong>{balancedEntry.model.name}</strong>
          <p>Most likely product default when cost and capability both matter</p>
        </article>
        <article className="decision-card">
          <span>Premium ceiling</span>
          <strong>{flagshipEntry.model.name}</strong>
          <p>Use only if quality or reasoning changes the outcome materially</p>
        </article>
      </div>

      <div className="winner-banner">
        <span>{decisionModes.find((entry) => entry.id === mode)?.label} winner</span>
        <strong>{winner.model.name}</strong>
        <p>
          {getModeNarrative(mode)} Current recurring request cost is $
          {winner.cost.totalRecurring.toFixed(4)}.
        </p>
      </div>

      <section className="routing-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Routing blueprint</p>
            <h3>Suggested multi-model stack for this workload</h3>
          </div>
        </div>
        <div className="routing-grid">
          {routingBlueprint.stack.map((slot) => (
            <article key={slot.role} className="routing-card">
              <span className="soft-badge">{Math.round(slot.share * 100)}% traffic</span>
              <strong>{slot.role}</strong>
              <h4>{slot.entry.model.name}</h4>
              <p>{slot.note}</p>
              <small>${slot.entry.cost.totalRecurring.toFixed(4)} recurring per request</small>
            </article>
          ))}
        </div>
        <div className="routing-blended">
          <div>
            <span>Blended recurring/request</span>
            <strong>${routingBlueprint.blendedRecurring.toFixed(4)}</strong>
          </div>
          <div>
            <span>Blended monthly run-rate</span>
            <strong>${routingBlueprint.blendedMonthly.toFixed(2)}</strong>
          </div>
          <div>
            <span>Why it matters</span>
            <strong>Most real AI products ship mixes, not one universal model</strong>
          </div>
        </div>
      </section>

      <div className="micro-metrics">
        <div>
          <span>Current comparison set</span>
          <strong>{comparisonSource.length} models</strong>
        </div>
        <div>
          <span>Selected baseline</span>
          <strong>{currentEntry?.model.name ?? selectedModelId}</strong>
        </div>
        <div>
          <span>Winner monthly run-rate</span>
          <strong>${winner.cost.monthlyRecurring.toFixed(2)}</strong>
        </div>
      </div>

      <div className="compare-grid">
        {comparison.map(({ model, cost }) => (
          <article
            key={model.id}
            className={`compare-card ${model.id === selectedModelId ? 'selected' : ''}`}
          >
            <div className="compare-card__head">
              <div>
                <strong>{model.name}</strong>
                <p>{model.summary}</p>
              </div>
              {model.id === winner.model.id ? <span className="winner-badge">Winner</span> : null}
            </div>
            <dl>
              <div>
                <dt>Recurring/request</dt>
                <dd>${cost.totalRecurring.toFixed(4)}</dd>
              </div>
              <div>
                <dt>Monthly</dt>
                <dd>${cost.monthlyRecurring.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Input/output</dt>
                <dd>
                  ${model.inputPerMTok} / ${model.outputPerMTok}
                </dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>{model.contextWindowK}k</dd>
              </div>
              <div>
                <dt>Delta vs current</dt>
                <dd className={model.id === winner.model.id ? 'good' : undefined}>
                  {model.id === selectedModelId
                    ? 'Current'
                    : `${cost.totalRecurring < currentEntry.cost.totalRecurring
                        ? '-'
                        : '+'}$${Math.abs(
                        cost.totalRecurring -
                          currentEntry.cost.totalRecurring,
                      ).toFixed(4)}`}
                </dd>
              </div>
              <div>
                <dt>Recommendation score</dt>
                <dd>{winner.model.id === model.id ? 'Top pick' : entryScoreLabel(model.id, comparison)}</dd>
              </div>
            </dl>
            <div className="badge-row">
              {model.badges.map((badge) => (
                <span key={badge} className="soft-badge">
                  {badge}
                </span>
              ))}
            </div>
            <p className="compare-note">
              Best for {model.recommendedFor.slice(0, 2).join(' and ')}.
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function entryScoreLabel(
  modelId: string,
  entries: Array<{ model: ModelRecord; score: number }>,
) {
  const index = entries.findIndex((entry) => entry.model.id === modelId)
  if (index === -1) return 'Candidate'
  if (index === 1) return 'Runner-up'
  if (index === 2) return 'Strong option'
  return 'Candidate'
}
