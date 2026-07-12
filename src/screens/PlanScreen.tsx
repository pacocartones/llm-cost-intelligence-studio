import type {
  CostBreakdown,
  ModelRecord,
  Provider,
  ScenarioInput,
  ShareableArtifact,
  UseCaseTemplate,
} from '../types/domain'
import type { Insight } from '../lib/insights'
import { buildTokenSlices, describeScenarioShape } from '../lib/scenario-shape'
import { ShareButton } from '../components/ShareButton'

const quickScenarioRecipes: Array<{
  id: string
  label: string
  description: string
  patch: Partial<ScenarioInput>
}> = [
  {
    id: 'support',
    label: 'Lean support copilot',
    description: 'High volume, short answers, strong fit for caching and cheap defaults.',
    patch: {
      requestsPerDay: 3200,
      activeUsers: 1400,
      systemTokens: 650,
      userTokens: 520,
      retrievedTokens: 280,
      toolTokens: 120,
      cachedTokens: 500,
      outputTokens: 260,
      useCaching: true,
    },
  },
  {
    id: 'research',
    label: 'Retrieval analyst',
    description: 'Document-heavy prompts where context cost and long sessions dominate.',
    patch: {
      requestsPerDay: 900,
      activeUsers: 240,
      systemTokens: 900,
      userTokens: 800,
      retrievedTokens: 2800,
      toolTokens: 350,
      cachedTokens: 750,
      outputTokens: 620,
      useCaching: true,
    },
  },
  {
    id: 'generator',
    label: 'Content generator',
    description: 'Output-heavy workflow where every extra answer token matters.',
    patch: {
      requestsPerDay: 1800,
      activeUsers: 520,
      systemTokens: 550,
      userTokens: 700,
      retrievedTokens: 180,
      toolTokens: 120,
      cachedTokens: 180,
      outputTokens: 1500,
      useCaching: false,
    },
  },
]

interface PlanScreenProps {
  provider: Provider
  model: ModelRecord
  scenario: ScenarioInput
  cost: CostBreakdown
  insights: Insight[]
  costPer1kRequests: number
  costPerUser: number
  alternativeModel: {
    name: string
    recurring: number
    delta: number
  } | null
  templates: UseCaseTemplate[]
  onScenarioChange: (patch: Partial<ScenarioInput>) => void
  onSaveScenario: () => void
  onApplyTemplate: (template: UseCaseTemplate) => void
  shareArtifact: ShareableArtifact
}

function getPlanningNarrative(
  scenarioShape: string,
  provider: Provider,
  model: ModelRecord,
) {
  if (scenarioShape === 'Retrieval-heavy workload') {
    return `This looks like a context-heavy assistant. ${provider.name} + ${model.name} should be validated against a cheaper long-context alternative before scaling traffic.`
  }

  if (scenarioShape === 'Generation-heavy workflow') {
    return `Output length is likely to dominate economics here. ${model.name} should earn its keep through answer quality, not habit.`
  }

  if (scenarioShape === 'Instruction-heavy assistant') {
    return `This is a strong candidate for aggressive prompt caching and system-prompt trimming. The architecture matters almost as much as the model.`
  }

  if (scenarioShape === 'Tool-augmented workflow') {
    return `Tool overhead is material in this scenario. Model choice should be evaluated together with tool-call frequency and output discipline.`
  }

  return `This scenario is fairly balanced, which makes it a good baseline for comparing providers and finding your default production tier.`
}

export function PlanScreen({
  provider,
  model,
  scenario,
  cost,
  insights,
  costPer1kRequests,
  costPerUser,
  alternativeModel,
  templates,
  onScenarioChange,
  onSaveScenario,
  onApplyTemplate,
  shareArtifact,
}: PlanScreenProps) {
  const tokenSlices = buildTokenSlices(scenario)
  const scenarioShape = describeScenarioShape(scenario)
  const monthlyRequests = scenario.requestsPerDay * scenario.daysPerMonth
  const annualizedRunRate = cost.monthlyRecurring * 12
  const planningNarrative = getPlanningNarrative(scenarioShape, provider, model)
  const totalRequestTokens = cost.inputTokens + scenario.outputTokens
  const monthlyTokenVolume = totalRequestTokens * monthlyRequests
  const cacheCoverage =
    cost.inputTokens > 0 ? Math.min(1, scenario.cachedTokens / cost.inputTokens) : 0
  const outputShare =
    totalRequestTokens > 0 ? scenario.outputTokens / totalRequestTokens : 0
  const dominantSlice =
    tokenSlices.length > 0
      ? [...tokenSlices].sort((left, right) => right.tokens - left.tokens)[0]
      : null
  const builderStages = [
    {
      label: 'Traffic',
      value: `${scenario.requestsPerDay.toLocaleString()}/day`,
      detail:
        scenario.requestsPerDay >= 5000
          ? 'Scaled production lane'
          : scenario.requestsPerDay >= 1500
            ? 'Growing product lane'
            : 'Pilot traffic lane',
    },
    {
      label: 'Prompt shape',
      value: scenarioShape,
      detail: dominantSlice ? `${dominantSlice.label} is the largest bucket` : 'No token mix yet',
    },
    {
      label: 'Output policy',
      value: `${Math.round(outputShare * 100)}% output share`,
      detail:
        outputShare >= 0.4
          ? 'Answer length is a major spend driver'
          : 'Output length is still under control',
    },
    {
      label: 'Efficiency',
      value: scenario.useCaching ? 'Caching on' : 'Caching off',
      detail: `${Math.round(cacheCoverage * 100)}% of input is cacheable today`,
    },
  ]
  const nextMove = alternativeModel
    ? `Switching to ${alternativeModel.name} or using it in a routing mix is the fastest near-term savings move.`
    : 'The fastest win is now architectural: tighten outputs, batch async flows, or increase cache reuse.'

  return (
    <div className="screen-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Scenario planning</p>
            <h2>Plan request and scenario economics</h2>
          </div>
          <div className="share-group">
            <button type="button" className="ghost-button" onClick={onSaveScenario}>
              Save scenario
            </button>
            <ShareButton artifact={shareArtifact} />
          </div>
        </div>

        <div className="preset-strip">
          {templates.slice(0, 4).map((template) => (
            <button
              key={template.id}
              type="button"
              className="preset-card"
              onClick={() => onApplyTemplate(template)}
            >
              <span>{template.category}</span>
              <strong>{template.name}</strong>
              <small>{template.monthlyBudgetHint}</small>
            </button>
          ))}
        </div>

        <div className="notice info">
          <strong>Catalog status:</strong> this workspace is now built around source-linked provider pricing. It is strong enough for planning and comparison, while deeper vendor-specific fees can be layered in later.
        </div>

        <div className="notice info">
          <strong>{provider.name}</strong> pricing status is <strong>{provider.pricingStatus}</strong>. Last verified on {provider.pricingLastVerified}. {provider.notes}
        </div>

        <div className="notice warning">
          <strong>Modeling boundary:</strong> these estimates focus on token economics. Retrieval, grounding, tool APIs, storage, and latency costs should be added in later phases for full business planning.
        </div>

        <div className="plan-brief">
          <div className="plan-brief__copy">
            <p className="eyebrow">Scenario brief</p>
            <h3>{scenario.name}</h3>
            <p>{planningNarrative}</p>
          </div>
          <div className="plan-brief__stats">
            <div>
              <span>Monthly requests</span>
              <strong>{monthlyRequests.toLocaleString()}</strong>
            </div>
            <div>
              <span>Annualized run-rate</span>
              <strong>${annualizedRunRate.toFixed(0)}</strong>
            </div>
            <div>
              <span>Provider posture</span>
              <strong>{provider.pricingStatus}</strong>
            </div>
          </div>
        </div>

        <div className="builder-stage-grid">
          {builderStages.map((stage) => (
            <article key={stage.label} className="builder-stage-card">
              <span>{stage.label}</span>
              <strong>{stage.value}</strong>
              <p>{stage.detail}</p>
            </article>
          ))}
        </div>

        <div className="scenario-cockpit-grid">
          <article className="scenario-cockpit-card scenario-cockpit-card--hero">
            <span>Cost pressure now</span>
            <strong>${cost.monthlyRecurring.toFixed(0)}/mo</strong>
            <p>{nextMove}</p>
          </article>
          <article className="scenario-cockpit-card">
            <span>Monthly token volume</span>
            <strong>{monthlyTokenVolume.toLocaleString()}</strong>
            <p>Useful for spotting when a small prompt increase becomes a real budget issue.</p>
          </article>
          <article className="scenario-cockpit-card">
            <span>Dominant spend lever</span>
            <strong>{dominantSlice?.label ?? 'No driver yet'}</strong>
            <p>
              {dominantSlice
                ? `${dominantSlice.percentage.toFixed(0)}% of the request shape today.`
                : 'Start filling in token inputs to reveal cost pressure.'}
            </p>
          </article>
        </div>

        <div className="recipe-heading">
          <div>
            <p className="eyebrow">Quick scenario recipes</p>
            <h3>Jump to a realistic operating pattern</h3>
          </div>
          <p className="muted-copy">
            These are lighter-weight than templates. Use them when you want to
            reshape the workload quickly without leaving the planning surface.
          </p>
        </div>

        <div className="recipe-grid">
          {quickScenarioRecipes.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              className="recipe-card"
              onClick={() => onScenarioChange(recipe.patch)}
            >
              <strong>{recipe.label}</strong>
              <p>{recipe.description}</p>
            </button>
          ))}
        </div>

        <div className="field-grid">
          <label>
            Scenario name
            <input
              type="text"
              value={scenario.name}
              onChange={(event) => onScenarioChange({ name: event.target.value })}
            />
          </label>
          <label>
            Requests per day
            <input
              type="number"
              min="1"
              value={scenario.requestsPerDay}
              onChange={(event) =>
                onScenarioChange({ requestsPerDay: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label>
            Days per month
            <input
              type="number"
              min="1"
              value={scenario.daysPerMonth}
              onChange={(event) =>
                onScenarioChange({ daysPerMonth: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label>
            Active users
            <input
              type="number"
              min="1"
              value={scenario.activeUsers}
              onChange={(event) =>
                onScenarioChange({ activeUsers: Number(event.target.value) || 0 })
              }
            />
          </label>
        </div>

        <div className="scenario-dial-grid">
          <article className="dial-card">
            <div className="dial-card__header">
              <span>Requests per day</span>
              <strong>{scenario.requestsPerDay.toLocaleString()}</strong>
            </div>
            <input
              type="range"
              min="100"
              max="15000"
              step="100"
              value={Math.min(scenario.requestsPerDay, 15000)}
              onChange={(event) =>
                onScenarioChange({ requestsPerDay: Number(event.target.value) || 0 })
              }
            />
            <p>Use this as the first stress lever before changing model selection.</p>
          </article>
          <article className="dial-card">
            <div className="dial-card__header">
              <span>Active users</span>
              <strong>{scenario.activeUsers.toLocaleString()}</strong>
            </div>
            <input
              type="range"
              min="50"
              max="10000"
              step="50"
              value={Math.min(scenario.activeUsers, 10000)}
              onChange={(event) =>
                onScenarioChange({ activeUsers: Number(event.target.value) || 0 })
              }
            />
            <p>Helps frame per-user economics, support tiers, and premium packaging.</p>
          </article>
          <article className="dial-card">
            <div className="dial-card__header">
              <span>Output tokens</span>
              <strong>{scenario.outputTokens.toLocaleString()}</strong>
            </div>
            <input
              type="range"
              min="0"
              max="4000"
              step="25"
              value={Math.min(scenario.outputTokens, 4000)}
              onChange={(event) =>
                onScenarioChange({ outputTokens: Number(event.target.value) || 0 })
              }
            />
            <p>Usually the fastest hidden driver when teams feel spend drifting upward.</p>
          </article>
          <article className="dial-card">
            <div className="dial-card__header">
              <span>Cached prefix tokens</span>
              <strong>{scenario.cachedTokens.toLocaleString()}</strong>
            </div>
            <input
              type="range"
              min="0"
              max="3000"
              step="25"
              value={Math.min(scenario.cachedTokens, 3000)}
              onChange={(event) =>
                onScenarioChange({ cachedTokens: Number(event.target.value) || 0 })
              }
            />
            <p>Great for modeling shared system prompts, reusable instructions, and stable context.</p>
          </article>
        </div>

        <div className="micro-metrics">
          <div>
            <span>Total input tokens</span>
            <strong>{cost.inputTokens.toLocaleString()}</strong>
          </div>
          <div>
            <span>Recurring cost / 1k requests</span>
            <strong>${costPer1kRequests.toFixed(2)}</strong>
          </div>
          <div>
            <span>Cost / active user</span>
            <strong>${costPerUser.toFixed(2)}</strong>
          </div>
        </div>

        <div className="shape-panel">
          <div className="shape-panel__header">
            <div>
              <p className="eyebrow">Workload shape</p>
              <h3>{scenarioShape}</h3>
            </div>
            <span className="soft-badge">Planning view</span>
          </div>
          <div className="slice-stack">
            {tokenSlices.map((slice) => (
              <div key={slice.key} className="slice-row">
                <div className="slice-row__meta">
                  <span>{slice.label}</span>
                  <strong>
                    {slice.tokens.toLocaleString()} · {slice.percentage.toFixed(0)}%
                  </strong>
                </div>
                <div className="slice-bar">
                  <div
                    className={`slice-bar__fill slice-${slice.key}`}
                    style={{ width: `${Math.max(slice.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="token-grid">
          <label>
            System tokens
            <input
              type="number"
              min="0"
              value={scenario.systemTokens}
              onChange={(event) =>
                onScenarioChange({ systemTokens: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label>
            User tokens
            <input
              type="number"
              min="0"
              value={scenario.userTokens}
              onChange={(event) =>
                onScenarioChange({ userTokens: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label>
            Retrieved context tokens
            <input
              type="number"
              min="0"
              value={scenario.retrievedTokens}
              onChange={(event) =>
                onScenarioChange({ retrievedTokens: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label>
            Tool/input overhead tokens
            <input
              type="number"
              min="0"
              value={scenario.toolTokens}
              onChange={(event) =>
                onScenarioChange({ toolTokens: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label>
            Cached prefix tokens
            <input
              type="number"
              min="0"
              value={scenario.cachedTokens}
              onChange={(event) =>
                onScenarioChange({ cachedTokens: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label>
            Output tokens
            <input
              type="number"
              min="0"
              value={scenario.outputTokens}
              onChange={(event) =>
                onScenarioChange({ outputTokens: Number(event.target.value) || 0 })
              }
            />
          </label>
        </div>

        <div className="toggle-row">
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={scenario.useCaching}
              onChange={(event) => onScenarioChange({ useCaching: event.target.checked })}
            />
            <span className="toggle-switch"><span className="toggle-track" /></span>
            Model recurring traffic with cache reads
          </label>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={scenario.useBatch}
              onChange={(event) => onScenarioChange({ useBatch: event.target.checked })}
            />
            <span className="toggle-switch"><span className="toggle-track" /></span>
            Assume batch discount for asynchronous jobs
          </label>
        </div>
      </section>

      <aside className="sticky-rail">
        <section className="hero-panel">
          <p className="eyebrow">Live estimate</p>
          <h2 className="gradient-text">{model.name}</h2>
          <div className="hero-metric">${cost.totalRecurring.toFixed(4)}</div>
          <p className="hero-subtitle">Recurring cost per request</p>
          <div className="sub-metric">
            <span>First cache warm-up</span>
            <strong>${cost.totalFirstRun.toFixed(4)}</strong>
          </div>
          <div className="sub-metric">
            <span>Monthly recurring estimate</span>
            <strong>${cost.monthlyRecurring.toFixed(2)}</strong>
          </div>
          <div className="sub-metric">
            <span>Current scenario type</span>
            <strong>{scenarioShape}</strong>
          </div>
          <div className="sub-metric">
            <span>Annualized estimate</span>
            <strong>${annualizedRunRate.toFixed(0)}</strong>
          </div>
          {alternativeModel ? (
            <div className="alternative-callout">
              <span>Cheaper nearby option</span>
              <strong>{alternativeModel.name}</strong>
              <p>
                Saves ${Math.abs(alternativeModel.delta).toFixed(4)} per request
                compared with the current selection.
              </p>
            </div>
          ) : null}
        </section>

        <section className="panel compact">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cost anatomy</p>
              <h3>What drives the number</h3>
            </div>
          </div>
          <div className="breakdown-list">
            <div>
              <span>Standard input</span>
              <strong>${cost.recurringInputCost.toFixed(4)}</strong>
            </div>
            <div>
              <span>Cached read</span>
              <strong>${cost.cachedReadCost.toFixed(4)}</strong>
            </div>
            <div>
              <span>Cached first write</span>
              <strong>${cost.cachedWriteCost.toFixed(4)}</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>${cost.outputCost.toFixed(4)}</strong>
            </div>
            <div>
              <span>Batch savings</span>
              <strong className="good">-${cost.batchDiscount.toFixed(4)}</strong>
            </div>
          </div>
          <p className="support-copy">
            Treat first-run cache writes and recurring cache reads separately. That distinction matters quickly once the same prefix appears at scale.
          </p>
        </section>

        <section className="panel compact">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Insights</p>
              <h3>What Claude should optimize next</h3>
            </div>
          </div>
          <div className="insight-stack">
            {insights.map((insight) => (
              <article key={insight.title} className={`insight ${insight.tone}`}>
                <strong>{insight.title}</strong>
                <p>{insight.body}</p>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}
