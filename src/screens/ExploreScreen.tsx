import { useMemo, useState } from 'react'
import type { ModelRecord, UseCaseTemplate } from '../types/domain'

type ExploreFilter = 'all' | 'starter' | 'growth' | 'serious'

interface ExploreScreenProps {
  templates: UseCaseTemplate[]
  models: ModelRecord[]
  onApplyTemplate: (template: UseCaseTemplate) => void
}

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

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>What can you build with this product?</h2>
        </div>
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

      <div className="template-grid">
        {!visibleTemplates.length ? (
          <article className="template-card">
            <h3>No templates in this filter yet</h3>
            <p>
              This budget tier is a good place to add more scenario packs later, such as RAG-heavy backoffice tools or multi-agent internal workflows.
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
