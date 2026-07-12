import { useMemo, useState } from 'react'
import { resolveTemplateScenario, evaluateBenchmarkModel, evaluateRoutingBenchmark } from '../lib/benchmarks'
import { calculateScenarioCost } from '../lib/costing'
import { buildRoutingMixFromCatalog } from '../lib/routing'
import { computeMarginSnapshot } from '../lib/finance'
import { ShareButton } from '../components/ShareButton'
import type {
  ModelRecord,
  SavedRoutingStack,
  UseCaseTemplate,
  FinanceInput,
  ShareableArtifact,
} from '../types/domain'

function formatCompactMoney(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

interface PortfolioScreenProps {
  templates: UseCaseTemplate[]
  models: ModelRecord[]
  savedRoutingStacks: SavedRoutingStack[]
  onApplyTemplate: (template: UseCaseTemplate) => void
  onLoadRoutingStack: (stack: SavedRoutingStack) => void
  shareArtifact: ShareableArtifact
}

export function PortfolioScreen({
  templates,
  models,
  savedRoutingStacks,
  onApplyTemplate,
  onLoadRoutingStack,
  shareArtifact,
}: PortfolioScreenProps) {
  const [teamMultiplier, setTeamMultiplier] = useState(2)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    templates.slice(0, 3).map((template) => template.id),
  )
  const [selectedStackIds, setSelectedStackIds] = useState<string[]>(
    savedRoutingStacks.slice(0, 2).map((stack) => stack.id),
  )
  const [finance, setFinance] = useState<FinanceInput>({
    monthlyBudget: 5000,
    targetMarginPercent: 25,
    growthRatePercent: 10,
    growthPosture: 'launch',
  })

  const templatePortfolio = useMemo(
    () =>
      templates
        .filter((template) => selectedTemplateIds.includes(template.id))
        .map((template) => {
          const model =
            models.find((entry) => entry.id === template.suggestedModelIds[0]) ??
            models[0]
          const scenario = resolveTemplateScenario(template)
          const sc = calculateScenarioCost(model, scenario)
          const score = evaluateBenchmarkModel(template, model)

          return {
            id: template.id,
            label: template.name,
            owner: template.category,
            monthly: sc.monthlyRecurring * teamMultiplier,
            annual: sc.monthlyRecurring * 12 * teamMultiplier,
            score: score.overall,
            summary: score.summary,
            type: 'template' as const,
            template,
          }
        }),
    [models, selectedTemplateIds, teamMultiplier, templates],
  )

  const routingPortfolio = useMemo(
    () =>
      savedRoutingStacks
        .filter((stack) => selectedStackIds.includes(stack.id))
        .map((stack) => {
          const cost = buildRoutingMixFromCatalog(models, stack.scenario, stack.slots)
          const matchingTemplate =
            templates.find(
              (template) =>
                template.scenarioSeed.name === stack.scenario.name,
            ) ??
            templates.find(
              (template) =>
                stack.scenarioName
                  .toLowerCase()
                  .includes(template.name.toLowerCase()),
            )
          const score = matchingTemplate
            ? evaluateRoutingBenchmark(models, matchingTemplate, stack.slots)
            : null

          return {
            id: stack.id,
            label: stack.name,
            owner: stack.scenarioName,
            monthly: cost.blendedMonthly * teamMultiplier,
            annual: cost.blendedMonthly * 12 * teamMultiplier,
            score: score?.overall ?? 0,
            summary:
              score?.summary ??
              'Saved routing deployment for a custom workload or team-specific operating model.',
            type: 'stack' as const,
            stack,
          }
        }),
    [models, savedRoutingStacks, selectedStackIds, teamMultiplier, templates],
  )

  const allPortfolioItems = [...templatePortfolio, ...routingPortfolio]
  const totalMonthly = allPortfolioItems.reduce(
    (sum, item) => sum + item.monthly,
    0,
  )
  const totalAnnual = allPortfolioItems.reduce(
    (sum, item) => sum + item.annual,
    0,
  )
  const highestBurnItem =
    [...allPortfolioItems].sort(
      (left, right) => right.monthly - left.monthly,
    )[0] ?? { label: '—', monthly: 0 }
  const averageScore =
    allPortfolioItems.length > 0
      ? Math.round(
          allPortfolioItems.reduce(
            (sum, item) => sum + item.score,
            0,
          ) / allPortfolioItems.length,
        )
      : 0

  // Finance layer
  const margin = computeMarginSnapshot(
    allPortfolioItems.map((item) => ({
      label: item.label,
      monthly: item.monthly,
    })),
    finance,
  )

  const impliedMargin =
    finance.monthlyBudget > 0
      ? ((finance.monthlyBudget - totalMonthly) / finance.monthlyBudget) * 100
      : 0
  const allocationItems = [...allPortfolioItems].sort((left, right) => right.monthly - left.monthly)
  const concentrationShare =
    totalMonthly > 0 ? ((highestBurnItem.monthly ?? 0) / totalMonthly) * 100 : 0
  const portfolioPosture =
    impliedMargin < 0
      ? 'Over-allocated'
      : impliedMargin < finance.targetMarginPercent
        ? 'Margin below target'
        : impliedMargin < finance.targetMarginPercent + 15
          ? 'Tight but workable'
          : 'Healthy allocation'
  const executiveCards = [
    {
      label: 'Portfolio posture',
      value: portfolioPosture,
      detail: `${Math.abs(impliedMargin).toFixed(1)}% implied margin against the current budget`,
    },
    {
      label: 'Largest capital draw',
      value: highestBurnItem.label,
      detail: `${formatCompactMoney(highestBurnItem.monthly)} monthly · ${concentrationShare.toFixed(0)}% of total`,
    },
    {
      label: 'Active bets',
      value: `${allPortfolioItems.length}`,
      detail: `${selectedTemplateIds.length} templates + ${selectedStackIds.length} routing deployments selected`,
    },
    {
      label: 'Annual exposure',
      value: formatCompactMoney(totalAnnual),
      detail: 'Useful for budget reviews, hiring plans, and infrastructure commitment',
    },
  ]

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    )
  }

  function toggleStack(id: string) {
    setSelectedStackIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    )
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h2>Compare several products or teams at once</h2>
        </div>
      </div>

      <div className="portfolio-command-grid">
        {executiveCards.map((card) => (
          <article key={card.label} className="portfolio-command-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      {/* Portfolio totals */}
      <div className="portfolio-band">
        <div>
          <span>Portfolio monthly</span>
          <strong>${totalMonthly.toFixed(2)}</strong>
        </div>
        <div>
          <span>Portfolio annual</span>
          <strong>${totalAnnual.toFixed(0)}</strong>
        </div>
        <div>
          <span>Average benchmark fit</span>
          <strong>{averageScore}</strong>
        </div>
        <div>
          <span>Highest burn item</span>
          <strong>{highestBurnItem.label}</strong>
        </div>
      </div>

      {/* Finance controls */}
      <div className="portfolio-controls">
        <div className="finance-slider-card">
          <label>
            Monthly budget
            <input
              type="number"
              min="10"
              step="50"
              value={finance.monthlyBudget}
              onChange={(event) =>
                setFinance((f) => ({
                  ...f,
                  monthlyBudget: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <div className="slider-meta">
            <span>Set this to match your actual spend ceiling</span>
            <strong>${finance.monthlyBudget.toLocaleString()}</strong>
          </div>
        </div>

        <div className="finance-slider-card">
          <label>
            Target margin (%)
            <input
              type="number"
              min="0"
              max="80"
              step="1"
              value={finance.targetMarginPercent}
              onChange={(event) =>
                setFinance((f) => ({
                  ...f,
                  targetMarginPercent: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <div className="slider-meta">
            <span>Minimum margin to maintain across the portfolio</span>
            <strong>{finance.targetMarginPercent}%</strong>
          </div>
        </div>

        <div className="finance-slider-card">
          <label>
            Team multiplier
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={teamMultiplier}
              onChange={(event) =>
                setTeamMultiplier(Number(event.target.value) || 1)
              }
            />
          </label>
          <div className="slider-meta">
            <span>Apply this to every selected workload</span>
            <strong>{teamMultiplier} teams / product units</strong>
          </div>
        </div>
      </div>

      {/* Share controls */}
      <div className="share-group">
        <ShareButton artifact={shareArtifact} />
      </div>

      {/* Margin banner */}
      <div
        className={`margin-banner ${
          margin.tone === 'overrun'
            ? 'danger'
            : margin.tone === 'tight'
              ? 'warning'
              : 'ok'
        }`}
      >
        <div>
          <span>Implied margin</span>
          <strong>
            {impliedMargin >= 0
              ? `${impliedMargin.toFixed(1)}%`
              : `-${Math.abs(impliedMargin).toFixed(1)}%`}
          </strong>
          <p>
            {impliedMargin >= 0
              ? `Headroom: $${margin.headroom.toLocaleString()}`
              : `Overrun: $${Math.abs(margin.headroom).toLocaleString()}`}
          </p>
        </div>
        <div className="margin-banner__meter">
          <div
            className="margin-meter__fill"
            style={{
              width: `${Math.max(0, Math.min(100, 100 - margin.headroomPercent))}%`,
            }}
          />
          <span>{margin.headroomPercent.toFixed(0)}%</span>
        </div>
      </div>

      {/* Margin insights */}
      <div className="insight-stack">
        {margin.insights.map((insight, i) => (
          <article
            key={i}
            className={`insight ${
              insight.tone === 'healthy'
                ? 'good'
                : insight.tone === 'overrun'
                  ? 'warning'
                  : 'info'
            }`}
          >
            <strong>{insight.title}</strong>
            <p>{insight.body}</p>
          </article>
        ))}
      </div>

      {/* Overrun items */}
      {margin.overrunItems.length > 0 ? (
        <div className="notice warning">
          <strong>Overrun contributors</strong>
          <p>
            {margin.overrunItems.join(', ')} are the largest contributors to the
            overrun.
          </p>
        </div>
      ) : null}

      <section className="allocation-board">
        <div className="allocation-board__main">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Allocation map</p>
              <h3>See where the portfolio is actually spending money</h3>
            </div>
          </div>
          <div className="allocation-stack">
            {!allocationItems.length ? (
              <article className="allocation-item">
                <div className="allocation-item__meta">
                  <div>
                    <strong>No portfolio items selected yet</strong>
                    <p>Select templates or routing stacks to build the board.</p>
                  </div>
                </div>
              </article>
            ) : null}
            {allocationItems.map((item) => {
              const share = totalMonthly > 0 ? (item.monthly / totalMonthly) * 100 : 0
              return (
                <article key={item.id} className="allocation-item">
                  <div className="allocation-item__meta">
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.type === 'stack' ? 'Routing stack' : item.owner}</p>
                    </div>
                    <div className="allocation-item__stats">
                      <span>{share.toFixed(0)}% of portfolio</span>
                      <strong>{formatCompactMoney(item.monthly)}</strong>
                    </div>
                  </div>
                  <div className="allocation-item__bar">
                    <div
                      className="allocation-item__fill"
                      style={{ width: `${Math.max(share, 8)}%` }}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className="allocation-board__side">
          <article className="allocation-outcome-card">
            <span>Budget headroom</span>
            <strong>{formatCompactMoney(Math.abs(margin.headroom))}</strong>
            <p>
              {margin.headroom >= 0
                ? 'Remaining monthly room before you hit the current budget.'
                : 'Monthly overrun that needs trimming or a larger spend ceiling.'}
            </p>
          </article>
          <article className="allocation-outcome-card">
            <span>Concentration risk</span>
            <strong>{concentrationShare.toFixed(0)}%</strong>
            <p>The share held by the single most expensive workload in the portfolio.</p>
          </article>
          <article className="allocation-outcome-card">
            <span>Best next action</span>
            <strong>{margin.overrunItems.length ? 'Trim top contributors' : 'Scale the best-fit bets'}</strong>
            <p>
              {margin.overrunItems.length
                ? `${margin.overrunItems.join(', ')} should be reviewed first for routing or model changes.`
                : 'The portfolio is still inside budget, so focus on the highest-confidence growth lanes.'}
            </p>
          </article>
        </div>
      </section>

      <div className="portfolio-selector-grid">
        <section className="panel compact nested">
          <p className="eyebrow">Template portfolio</p>
          <h3>Product lines</h3>
          <div className="portfolio-selector-list">
            {templates.map((template) => (
              <label
                key={template.id}
                className="portfolio-selector-item"
              >
                <input
                  type="checkbox"
                  checked={selectedTemplateIds.includes(template.id)}
                  onChange={() => toggleTemplate(template.id)}
                />
                <span>{template.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel compact nested">
          <p className="eyebrow">Routing deployments</p>
          <h3>Saved operating models</h3>
          <div className="portfolio-selector-list">
            {!savedRoutingStacks.length ? (
              <p className="muted-copy">
                Save a few routing mixes in Compare and they will appear here
                automatically.
              </p>
            ) : null}
            {savedRoutingStacks.map((stack) => (
              <label
                key={stack.id}
                className="portfolio-selector-item"
              >
                <input
                  type="checkbox"
                  checked={selectedStackIds.includes(stack.id)}
                  onChange={() => toggleStack(stack.id)}
                />
                <span>{stack.name}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      {/* Portfolio items */}
      <div className="portfolio-grid">
        {allPortfolioItems.map((item) => (
          <article key={item.id} className="portfolio-card">
            <div className="portfolio-card__head">
              <div>
                <span className="soft-badge">
                  {item.type === 'stack' ? 'Routing stack' : item.owner}
                </span>
                <h3>{item.label}</h3>
              </div>
              <strong>{item.score}</strong>
            </div>
            <p>{item.summary}</p>
            <dl className="template-meta">
              <div>
                <dt>Monthly</dt>
                <dd>${item.monthly.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Annual</dt>
                <dd>${item.annual.toFixed(0)}</dd>
              </div>
              <div>
                <dt>Scaled by</dt>
                <dd>{teamMultiplier}x</dd>
              </div>
              {item.monthly > 0 && finance.monthlyBudget > 0 ? (
                <div>
                  <dt>Budget share</dt>
                  <dd className={item.monthly > finance.monthlyBudget ? '' : 'good'}>
                    {(
                      (item.monthly / finance.monthlyBudget) *
                      100
                    ).toFixed(1)}
                    %
                  </dd>
                </div>
              ) : null}
            </dl>
            {item.type === 'template' ? (
              <button
                type="button"
                className="ghost-button template-action"
                onClick={() => onApplyTemplate(item.template)}
              >
                Open template
              </button>
            ) : (
              <button
                type="button"
                className="ghost-button template-action"
                onClick={() => onLoadRoutingStack(item.stack)}
              >
                Load routing stack
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
