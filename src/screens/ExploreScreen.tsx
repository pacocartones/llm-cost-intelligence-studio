import { useMemo, useState } from 'react'
import { rankBenchmarkModels } from '../lib/benchmarks'
import type { ModelRecord, UseCaseTemplate } from '../types/domain'

type ExploreFilter = 'all' | 'starter' | 'growth' | 'serious'

function formatCompactMoney(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

interface ExploreScreenProps {
  templates: UseCaseTemplate[]
  models: ModelRecord[]
  onApplyTemplate: (template: UseCaseTemplate) => void
}

const benchmarkPacks = [
  {
    templateId: 'support-copilot',
    headline: 'Lean support benchmark',
    stressor: 'Tests retrieval discipline, throughput, and short-answer economics.',
    successMetric: 'Keep recurring cost low without letting context bloat dominate.',
  },
  {
    templateId: 'coding-assistant',
    headline: 'Developer copilot benchmark',
    stressor: 'Stresses long context, tool overhead, and escalation to premium models.',
    successMetric: 'Find a cheap default path with a strong premium fallback.',
  },
  {
    templateId: 'research-assistant',
    headline: 'Research workflow benchmark',
    stressor: 'Pushes grounding, synthesis, and output-length economics.',
    successMetric: 'Separate retrieval and synthesis so output quality justifies cost.',
  },
  {
    templateId: 'ai-tutor',
    headline: 'High-volume education benchmark',
    stressor: 'Reveals how multi-turn growth compounds token costs at scale.',
    successMetric: 'Use cheap turn-by-turn routing and save premium reasoning for special moments.',
  },
] as const

const ambitionTracks = [
  {
    title: 'AI portfolio planner',
    summary:
      'Turn the app into a command center for choosing model mixes by product, team, or customer segment.',
    examples: 'Compare fallback ladders, premium tiers, and routing policies before launch.',
  },
  {
    title: 'Procurement and finance cockpit',
    summary:
      'Model monthly burn, margin pressure, and budget guardrails for multiple providers at once.',
    examples: 'Useful for vendor negotiations, CFO reviews, and pricing your own SaaS plans.',
  },
  {
    title: 'Prompt and architecture lab',
    summary:
      'Show how prompt length, retrieval size, caching, tools, and output policies reshape economics.',
    examples: 'Great for PMs and engineers deciding whether to fix architecture before upgrading models.',
  },
  {
    title: 'Agent operations simulator',
    summary:
      'Estimate the economics of multi-step agents, routers, evaluators, and supervisor patterns.',
    examples: 'Model cheap triage + premium final answer flows instead of single-model assumptions.',
  },
] as const

const roadmapMoves = [
  'Add benchmark packs by use case: support, coding, tutoring, research, sales, backoffice automation.',
  'Support model routing trees instead of one selected model per scenario.',
  'Track price changes over time and surface a market-change feed.',
  'Layer in non-token costs later: retrieval, grounding, tool APIs, storage, and latency tradeoffs.',
] as const

export function ExploreScreen({
  templates,
  models,
  onApplyTemplate,
}: ExploreScreenProps) {
  const [filter, setFilter] = useState<ExploreFilter>('all')
  const benchmarkCards = useMemo(
    () =>
      benchmarkPacks.reduce<Array<(typeof benchmarkPacks)[number] & { template: UseCaseTemplate }>>(
        (list, pack) => {
          const template = templates.find((entry) => entry.id === pack.templateId)
          if (!template) return list

          list.push({
            ...pack,
            template,
          })

          return list
        },
        [],
      ),
    [templates],
  )
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(
    benchmarkPacks[0].templateId,
  )

  const visibleTemplates = useMemo(
    () =>
      filter === 'all'
        ? templates
        : templates.filter((template) => template.budgetTier === filter),
    [filter, templates],
  )
  const referencedProviderCount = useMemo(
    () =>
      new Set(
        templates.flatMap((template) =>
          template.suggestedModelIds
            .map((id) => models.find((model) => model.id === id)?.providerId)
            .filter(Boolean),
        ),
      ).size,
    [models, templates],
  )
  const selectedBenchmark =
    benchmarkCards.find((pack) => pack.template.id === selectedBenchmarkId) ??
    benchmarkCards[0]
  const benchmarkRanking = useMemo(
    () =>
      selectedBenchmark ? rankBenchmarkModels(models, selectedBenchmark.template) : [],
    [models, selectedBenchmark],
  )
  const benchmarkLeader = benchmarkRanking[0]
  const benchmarkRunnerUp = benchmarkRanking[1]
  const categoryCount = new Set(templates.map((template) => template.category)).size
  const exploreCards = [
    {
      label: 'Pattern library',
      value: `${templates.length} templates`,
      detail: `${categoryCount} product categories already mapped into the workspace`,
    },
    {
      label: 'Provider coverage',
      value: `${referencedProviderCount} providers`,
      detail: 'Useful for comparing not just models, but default product strategies',
    },
    {
      label: 'Current benchmark leader',
      value: benchmarkLeader?.model.name ?? 'No leader yet',
      detail: benchmarkLeader
        ? `${benchmarkLeader.score.overall} overall score on the selected pack`
        : 'Pick a benchmark pack to simulate model fit',
    },
    {
      label: 'Budget lane in view',
      value:
        filter === 'all'
          ? 'All bands'
          : `${filter.charAt(0).toUpperCase()}${filter.slice(1)} lane`,
      detail: `${visibleTemplates.length} visible templates in the current filter`,
    },
  ]

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>What can you build with this product?</h2>
        </div>
      </div>

      <div className="explore-command-grid">
        {exploreCards.map((card) => (
          <article key={card.label} className="explore-command-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="explore-hero">
        <div>
          <p className="eyebrow">Use-case planning</p>
          <h3>Start from a realistic product pattern, not an empty calculator.</h3>
          <p className="muted-copy">
            These templates are here to turn the tool into a product-planning assistant:
            choose a pattern, inspect the economics, and then tune the architecture.
          </p>
        </div>
        <div className="explore-stats">
          <div>
            <span>Templates</span>
            <strong>{templates.length}</strong>
          </div>
          <div>
            <span>Providers referenced</span>
            <strong>{referencedProviderCount}</strong>
          </div>
        </div>
      </div>

      <div className="mode-strip">
        {([
          ['all', 'All templates', 'Browse the full starter library'],
          ['starter', 'Starter budget', 'Lean MVPs and early experiments'],
          ['growth', 'Growth budget', 'More serious product workflows'],
          ['serious', 'Serious budget', 'Team-facing and revenue-driving tools'],
        ] as const).map(([id, label, description]) => (
          <button
            key={id}
            type="button"
            className={id === filter ? 'active' : ''}
            aria-pressed={id === filter}
            onClick={() => setFilter(id)}
          >
            <span>{label}</span>
            <small>{description}</small>
          </button>
        ))}
      </div>

      <section className="ambition-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Product direction</p>
            <h3>What this can become beyond a calculator</h3>
          </div>
        </div>
        <div className="ambition-grid">
          {ambitionTracks.map((track) => (
            <article key={track.title} className="ambition-card">
              <strong>{track.title}</strong>
              <p>{track.summary}</p>
              <small>{track.examples}</small>
            </article>
          ))}
        </div>
        <div className="roadmap-card">
          <span className="soft-badge">Next ambitious moves</span>
          <ul className="plain-list">
            {roadmapMoves.map((move) => (
              <li key={move}>{move}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="benchmark-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Benchmark library</p>
            <h3>Scenario packs that pressure-test different AI product patterns</h3>
          </div>
        </div>
        <div className="benchmark-grid">
          {benchmarkCards.map((pack) => (
            <article key={pack.template.id} className="benchmark-card">
              <span className="soft-badge">{pack.template.category}</span>
              <h3>{pack.headline}</h3>
              <p>{pack.stressor}</p>
              <dl className="template-meta">
                <div>
                  <dt>Template</dt>
                  <dd>{pack.template.name}</dd>
                </div>
                <div>
                  <dt>Budget band</dt>
                  <dd>{pack.template.budgetTier}</dd>
                </div>
                <div>
                  <dt>Success metric</dt>
                  <dd>{pack.successMetric}</dd>
                </div>
              </dl>
              <div className="benchmark-card__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setSelectedBenchmarkId(pack.template.id)}
                >
                  Score models
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onApplyTemplate(pack.template)}
                >
                  Load benchmark
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedBenchmark && benchmarkLeader ? (
        <section className="benchmark-lab">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Benchmark scoring</p>
              <h3>{selectedBenchmark.template.name} model leaderboard</h3>
            </div>
          </div>
          <div className="benchmark-leader">
            <div>
              <span className="soft-badge">Top simulated fit</span>
              <h3>{benchmarkLeader.model.name}</h3>
              <p>{benchmarkLeader.score.summary}</p>
            </div>
            <div className="benchmark-leader__score">
              <span>Overall score</span>
              <strong>{benchmarkLeader.score.overall}</strong>
            </div>
          </div>
          <div className="benchmark-score-grid">
            {benchmarkRanking.slice(0, 4).map(({ model, score }, index) => (
              <article key={model.id} className="benchmark-score-card">
                <div className="benchmark-score-card__head">
                  <div>
                    <span className="soft-badge">#{index + 1}</span>
                    <h4>{model.name}</h4>
                  </div>
                  <strong>{score.overall}</strong>
                </div>
                <dl className="template-meta">
                  <div>
                    <dt>Quality</dt>
                    <dd>{score.quality}</dd>
                  </div>
                  <div>
                    <dt>Cost fit</dt>
                    <dd>{score.cost}</dd>
                  </div>
                  <div>
                    <dt>Speed</dt>
                    <dd>{score.speed}</dd>
                  </div>
                  <div>
                    <dt>Workflow fit</dt>
                    <dd>{score.fit}</dd>
                  </div>
                  <div>
                    <dt>Monthly</dt>
                    <dd>${score.monthly.toFixed(2)}</dd>
                  </div>
                </dl>
                <p>{score.summary}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedBenchmark && benchmarkLeader ? (
        <section className="pattern-lab">
          <div className="pattern-lab__main">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Pattern lab</p>
                <h3>What this benchmark is really testing</h3>
              </div>
            </div>
            <div className="pattern-lab__cards">
              <article className="pattern-card pattern-card--lead">
                <span>Primary stressor</span>
                <strong>{selectedBenchmark.stressor}</strong>
                <p>{selectedBenchmark.successMetric}</p>
              </article>
              <article className="pattern-card">
                <span>Top fit</span>
                <strong>{benchmarkLeader.model.name}</strong>
                <p>{benchmarkLeader.score.summary}</p>
              </article>
              <article className="pattern-card">
                <span>Runner-up</span>
                <strong>{benchmarkRunnerUp?.model.name ?? 'No challenger yet'}</strong>
                <p>
                  {benchmarkRunnerUp
                    ? `${benchmarkRunnerUp.score.overall} score · ${formatCompactMoney(
                        benchmarkRunnerUp.score.monthly,
                      )}/mo in this pattern`
                    : 'A second model will appear here once the pack has enough candidates.'}
                </p>
              </article>
            </div>
          </div>
          <div className="pattern-lab__side">
            <article className="pattern-outcome-card">
              <span>Best use of this pack</span>
              <strong>Choose defaults before launch</strong>
              <p>
                Treat these packs as pre-built product situations, not demos. The goal is to
                pressure-test model policy early.
              </p>
            </article>
            <article className="pattern-outcome-card">
              <span>Next decision</span>
              <strong>{benchmarkLeader.model.tier === 'flagship' ? 'Test routing' : 'Load template'}</strong>
              <p>
                {benchmarkLeader.model.tier === 'flagship'
                  ? 'A flagship leader often means the next question is where to reserve it rather than whether to use it everywhere.'
                  : 'A non-flagship leader is a strong signal that this workload can scale efficiently with the right defaults.'}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      <div className="template-grid">
        {!visibleTemplates.length ? (
          <article className="template-card">
            <h3>No templates in this filter yet</h3>
            <p>
              This budget tier is a good place to add more scenario packs later, such as
              RAG-heavy backoffice tools or multi-agent internal workflows.
            </p>
          </article>
        ) : null}
        {visibleTemplates.map((template) => (
          <article key={template.id} className="template-card">
            <div className="template-card__header">
              <div>
                <span className={`soft-badge budget-${template.budgetTier}`}>
                  {template.category} · {template.budgetTier}
                </span>
                <h3>{template.name}</h3>
              </div>
            </div>
            <p>{template.description}</p>
            <dl className="template-meta">
              <div>
                <dt>Stack</dt>
                <dd>{template.recommendedStack}</dd>
              </div>
              <div>
                <dt>Token pattern</dt>
                <dd>{template.tokenPattern}</dd>
              </div>
              <div>
                <dt>Budget hint</dt>
                <dd>{template.monthlyBudgetHint}</dd>
              </div>
              <div>
                <dt>Traffic seed</dt>
                <dd>
                  {template.scenarioSeed.requestsPerDay?.toLocaleString() ?? '—'} req/day
                </dd>
              </div>
            </dl>
            <div className="badge-row">
              {template.suggestedModelIds.map((modelId) => {
                const model = models.find((entry) => entry.id === modelId)
                if (!model) return null
                return (
                  <span key={modelId} className="soft-badge">
                    {model.name}
                  </span>
                )
              })}
            </div>
            <ul className="plain-list">
              {template.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <button
              type="button"
              className="ghost-button template-action"
              onClick={() => onApplyTemplate(template)}
            >
              Use as planning preset
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
