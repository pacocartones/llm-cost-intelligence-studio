import { useEffect, useMemo, useState } from 'react'
import { calculateScenarioCost } from '../lib/costing'
import {
  buildDefaultRoutingSlots,
  buildRoutingMix,
  buildRoutingMixFromCatalog,
  routingSlotsEqual,
  sanitizeRoutingSlots,
} from '../lib/routing'
import { ShareButton } from '../components/ShareButton'
import type {
  ModelRecord,
  RoutingRoleId,
  RoutingSlotInput,
  SavedRoutingStack,
  ScenarioInput,
  ShareableArtifact,
} from '../types/domain'

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

function formatMonthlyValue(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

interface CompareScreenProps {
  models: ModelRecord[]
  scenario: ScenarioInput
  selectedModelId: string
  selectedProviderId: string
  savedRoutingStacks: SavedRoutingStack[]
  routingPreset: SavedRoutingStack | null
  onSaveRoutingStack: (draft: { name: string; slots: RoutingSlotInput[] }) => void
  onLoadRoutingStack: (stack: SavedRoutingStack) => void
  shareArtifact: ShareableArtifact
}

export function CompareScreen({
  models,
  scenario,
  selectedModelId,
  selectedProviderId,
  savedRoutingStacks,
  routingPreset,
  onSaveRoutingStack,
  onLoadRoutingStack,
  shareArtifact,
}: CompareScreenProps) {
  const [mode, setMode] = useState<DecisionMode>('balanced')
  const [routingSlots, setRoutingSlots] = useState<RoutingSlotInput[]>([])
  const [routingName, setRoutingName] = useState(`${scenario.name} routing mix`)
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
  const comparison = allEntries.slice(0, 6)

  const winner = comparison[0]
  const currentEntry =
    allEntries.find((entry) => entry.model.id === selectedModelId) ?? allEntries[0]
  const flagshipEntry =
    comparison.find((entry) => entry.model.tier === 'flagship') ?? comparison[0]
  const balancedEntry =
    comparison.find((entry) => entry.model.tier === 'balanced') ?? comparison[0]
  const efficientEntry =
    comparison.find((entry) => entry.model.tier === 'efficient') ?? comparison[0]

  const routingBlueprint = buildRoutingMix(comparison, routingSlots)
  const savingsVsSelected = currentEntry.cost.totalRecurring - routingBlueprint.blendedRecurring
  const maxRecurring = comparison.reduce(
    (largest, entry) => Math.max(largest, entry.cost.totalRecurring),
    0.0001,
  )
  const maxScore = comparison.reduce(
    (largest, entry) => Math.max(largest, entry.score),
    0.0001,
  )
  const winnerMonthlyDelta = currentEntry.cost.monthlyRecurring - winner.cost.monthlyRecurring
  const growthPreview = [
    { label: 'Now', multiplier: 1 },
    { label: '2x traffic', multiplier: 2 },
    { label: '5x traffic', multiplier: 5 },
  ].map((entry) => ({
    ...entry,
    selected: currentEntry.cost.monthlyRecurring * entry.multiplier,
    winner: winner.cost.monthlyRecurring * entry.multiplier,
    routing: routingBlueprint.blendedMonthly * entry.multiplier,
  }))

  const savedStackSummaries = useMemo(
    () =>
      savedRoutingStacks.map((stack) => ({
        stack,
        cost: buildRoutingMixFromCatalog(models, stack.scenario, stack.slots),
      })),
    [models, savedRoutingStacks],
  )

  useEffect(() => {
    setRoutingSlots((current) => {
      const next = sanitizeRoutingSlots(current, comparison)
      return routingSlotsEqual(current, next) ? current : next
    })
  }, [comparison])

  useEffect(() => {
    setRoutingName(`${scenario.name} routing mix`)
  }, [scenario.name])

  useEffect(() => {
    if (!routingPreset) return

    setRoutingName(routingPreset.name)
    setRoutingSlots((current) => {
      const next = sanitizeRoutingSlots(routingPreset.slots, comparison)
      return routingSlotsEqual(current, next) ? current : next
    })
  }, [comparison, routingPreset])

  function updateRoutingModel(roleId: RoutingRoleId, modelId: string) {
    setRoutingSlots((current) =>
      current.map((slot) => (slot.roleId === roleId ? { ...slot, modelId } : slot)),
    )
  }

  function updateRoutingShare(roleId: RoutingRoleId, share: number) {
    const nextShare = Math.max(0, Math.min(100, share))
    setRoutingSlots((current) =>
      current.map((slot) => (slot.roleId === roleId ? { ...slot, share: nextShare } : slot)),
    )
  }

  function applyRoutingPreset(preset: 'cost' | 'balanced' | 'premium') {
    const defaults = buildDefaultRoutingSlots(comparison)
    const efficient = defaults.find((slot) => slot.roleId === 'router') ?? defaults[0]
    const balanced = defaults.find((slot) => slot.roleId === 'default') ?? defaults[1]
    const premium = defaults.find((slot) => slot.roleId === 'premium') ?? defaults[2]

    if (preset === 'cost') {
      setRoutingSlots([
        { ...efficient, share: 75 },
        { ...balanced, share: 20 },
        { ...premium, share: 5 },
      ])
      return
    }

    if (preset === 'premium') {
      setRoutingSlots([
        { ...efficient, share: 35 },
        { ...balanced, share: 35 },
        { ...premium, share: 30 },
      ])
      return
    }

    setRoutingSlots([
      { ...efficient, share: 60 },
      { ...balanced, share: 30 },
      { ...premium, share: 10 },
    ])
  }

  function normalizeRoutingShares() {
    setRoutingSlots((current) => {
      const total = current.reduce((sum, slot) => sum + slot.share, 0)
      if (total <= 0) return sanitizeRoutingSlots(current, comparison)

      let remainder = 100
      return current.map((slot, index) => {
        const normalized =
          index === current.length - 1
            ? remainder
            : Math.round((slot.share / total) * 100)
        remainder -= normalized
        return {
          ...slot,
          share: normalized,
        }
      })
    })
  }

  function saveCurrentRoutingStack() {
    onSaveRoutingStack({
      name: routingName.trim() || `${scenario.name} routing mix`,
      slots: routingSlots,
    })
  }

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

      <section className="compare-lab">
        <div className="compare-lab__main">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Decision spectrum</p>
              <h3>See the tradeoff, not just the winner</h3>
            </div>
          </div>
          <div className="spectrum-stack">
            {comparison.map((entry) => (
              <article key={entry.model.id} className="spectrum-row">
                <div className="spectrum-row__meta">
                  <div>
                    <strong>{entry.model.name}</strong>
                    <p>{entry.model.summary}</p>
                  </div>
                  <div className="spectrum-row__values">
                    <span>{formatMonthlyValue(entry.cost.monthlyRecurring)}</span>
                    <small>{Math.round((entry.score / maxScore) * 100)} fit score</small>
                  </div>
                </div>
                <div className="spectrum-row__bars">
                  <div className="spectrum-bar">
                    <div
                      className="spectrum-bar__fill"
                      style={{ width: `${Math.max((entry.cost.totalRecurring / maxRecurring) * 100, 10)}%` }}
                    />
                  </div>
                  <div className="spectrum-score">
                    <div
                      className="spectrum-score__fill"
                      style={{ width: `${Math.max((entry.score / maxScore) * 100, 8)}%` }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="compare-lab__side">
          <article className="decision-outcome-card">
            <span>Keep current</span>
            <strong>{currentEntry.model.name}</strong>
            <p>{formatMonthlyValue(currentEntry.cost.monthlyRecurring)} monthly at the modeled workload.</p>
          </article>
          <article className="decision-outcome-card decision-outcome-card--winner">
            <span>Switch default</span>
            <strong>{winner.model.name}</strong>
            <p>
              {winnerMonthlyDelta >= 0 ? 'Saves' : 'Adds'} {formatMonthlyValue(Math.abs(winnerMonthlyDelta))} per month right away.
            </p>
          </article>
          <article className="decision-outcome-card">
            <span>Route traffic</span>
            <strong>{formatMonthlyValue(routingBlueprint.blendedMonthly)}</strong>
            <p>Use a mix when one model is too expensive and one model is too limiting.</p>
          </article>
        </div>
      </section>

      <section className="growth-preview">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Growth preview</p>
            <h3>What the decision looks like when usage climbs</h3>
          </div>
        </div>
        <div className="growth-preview__grid">
          {growthPreview.map((entry) => (
            <article key={entry.label} className="growth-preview-card">
              <span>{entry.label}</span>
              <strong>{formatMonthlyValue(entry.selected)}</strong>
              <p>
                Current default. Winner: {formatMonthlyValue(entry.winner)}. Routing:
                {' '}
                {formatMonthlyValue(entry.routing)}.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="routing-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Routing blueprint</p>
            <h3>Design your own multi-model stack for this workload</h3>
          </div>
          <div className="routing-actions">
            <button type="button" className="ghost-button" onClick={() => applyRoutingPreset('cost')}>
              Cost-first
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => applyRoutingPreset('balanced')}
            >
              Balanced
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => applyRoutingPreset('premium')}
            >
              Premium moments
            </button>
          </div>
        </div>

        <div className="routing-savebar">
          <label>
            Stack name
            <input
              type="text"
              value={routingName}
              onChange={(event) => setRoutingName(event.target.value)}
            />
          </label>
          <div className="share-group">
            <button type="button" className="ghost-button" onClick={saveCurrentRoutingStack}>
              Save routing stack
            </button>
            <ShareButton artifact={shareArtifact} />
          </div>
        </div>

        <div className={`routing-notice ${routingBlueprint.totalShare === 100 ? 'good' : ''}`}>
          <span>Traffic allocation total</span>
          <strong>{routingBlueprint.totalShare}%</strong>
          <button type="button" className="text-link" onClick={normalizeRoutingShares}>
            Normalize to 100%
          </button>
        </div>

        <div className="mix-meter">
          {routingBlueprint.stack.map((slot) => (
            <div
              key={slot.roleId}
              className={`mix-meter__segment mix-meter__segment--${slot.roleId}`}
              style={{ width: `${Math.max(slot.normalizedShare * 100, 8)}%` }}
            >
              <span>{slot.roleLabel}</span>
              <strong>{Math.round(slot.normalizedShare * 100)}%</strong>
            </div>
          ))}
        </div>

        <div className="routing-architecture">
          {routingBlueprint.stack.map((slot) => (
            <article key={slot.roleId} className="routing-architecture__card">
              <span>{slot.roleLabel}</span>
              <strong>{slot.entry.model.name}</strong>
              <p>{slot.note}</p>
              <small>
                {slot.share}% assigned · ${slot.entry.cost.totalRecurring.toFixed(4)} recurring
              </small>
            </article>
          ))}
        </div>

        <div className="routing-grid">
          {routingBlueprint.stack.map((slot) => (
            <article key={slot.roleId} className="routing-card">
              <span className="soft-badge">
                {Math.round(slot.normalizedShare * 100)}% effective share
              </span>
              <strong>{slot.roleLabel}</strong>
              <select
                value={slot.entry.model.id}
                onChange={(event) => updateRoutingModel(slot.roleId, event.target.value)}
              >
                {comparison.map((entry) => (
                  <option key={entry.model.id} value={entry.model.id}>
                    {entry.model.name}
                  </option>
                ))}
              </select>
              <div className="routing-share">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={slot.share}
                  onChange={(event) =>
                    updateRoutingShare(slot.roleId, Number(event.target.value) || 0)
                  }
                />
                <label>
                  Traffic %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={slot.share}
                    onChange={(event) =>
                      updateRoutingShare(slot.roleId, Number(event.target.value) || 0)
                    }
                  />
                </label>
              </div>
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
            <span>Savings vs selected model</span>
            <strong className={savingsVsSelected >= 0 ? 'good' : undefined}>
              {savingsVsSelected >= 0 ? '-' : '+'}${Math.abs(savingsVsSelected).toFixed(4)} per request
            </strong>
          </div>
        </div>
      </section>

      <section className="saved-routing-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Saved stacks</p>
            <h3>Compare routing mixes across scenarios</h3>
          </div>
        </div>
        <div className="saved-routing-grid">
          {!savedStackSummaries.length ? (
            <article className="routing-card">
              <strong>No saved routing stacks yet</strong>
              <p>Save a few routing mixes here, then use Portfolio to compare several products or teams at once.</p>
            </article>
          ) : null}
          {savedStackSummaries.map(({ stack, cost }) => (
            <article key={stack.id} className="routing-card saved-routing-card">
              <div className="saved-routing-card__top">
                <div>
                  <strong>{stack.name}</strong>
                  <p>{stack.scenarioName}</p>
                </div>
                <span className="soft-badge">{new Date(stack.createdAt).toLocaleDateString()}</span>
              </div>
              <dl className="template-meta">
                <div>
                  <dt>Blended recurring</dt>
                  <dd>${cost.blendedRecurring.toFixed(4)}</dd>
                </div>
                <div>
                  <dt>Monthly</dt>
                  <dd>${cost.blendedMonthly.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Traffic mix</dt>
                  <dd>{stack.slots.map((slot) => `${slot.share}%`).join(' / ')}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="ghost-button template-action"
                onClick={() => onLoadRoutingStack(stack)}
              >
                Load stack
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="micro-metrics">
        <div>
          <span>Current comparison set</span>
          <strong>{comparisonSource.length} models</strong>
        </div>
        <div>
          <span>Selected baseline</span>
          <strong>{currentEntry.model.name}</strong>
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
                    : `${cost.totalRecurring < currentEntry.cost.totalRecurring ? '-' : '+'}$${Math.abs(
                        cost.totalRecurring - currentEntry.cost.totalRecurring,
                      ).toFixed(4)}`}
                </dd>
              </div>
              <div>
                <dt>Recommendation score</dt>
                <dd>
                  {winner.model.id === model.id
                    ? 'Top pick'
                    : entryScoreLabel(model.id, comparison)}
                </dd>
              </div>
            </dl>
            <div className="badge-row">
              {model.badges.map((badge) => (
                <span key={badge} className="soft-badge">
                  {badge}
                </span>
              ))}
            </div>
            <div className="compare-scorebar">
              <div
                className="compare-scorebar__fill"
                style={{ width: `${Math.max((allEntries.find((entry) => entry.model.id === model.id)?.score ?? 0) / maxScore * 100, 8)}%` }}
              />
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
