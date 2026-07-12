import { useState } from 'react'
import type { CostBreakdown, ScenarioInput } from '../types/domain'
import { computeMarginSnapshot, projectSpend } from '../lib/finance'
import type { FinanceInput } from '../types/domain'

type GrowthPosture = 'conservative' | 'launch' | 'aggressive'

const postureOptions: { id: GrowthPosture; label: string; multiplier: number }[] = [
  { id: 'conservative', label: 'Conservative', multiplier: 0.9 },
  { id: 'launch', label: 'Launch plan', multiplier: 1.15 },
  { id: 'aggressive', label: 'Aggressive', multiplier: 1.35 },
]

const PROJECTION_HORIZON = 12

function formatCompactMoney(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

interface ForecastScreenProps {
  scenario: ScenarioInput
  cost: CostBreakdown
}

export function ForecastScreen({ scenario, cost }: ForecastScreenProps) {
  const [finance, setFinance] = useState<FinanceInput>({
    monthlyBudget: 2000,
    targetMarginPercent: 20,
    growthRatePercent: 12,
    growthPosture: 'launch',
  })

  const posture = postureOptions.find((p) => p.id === finance.growthPosture) ?? postureOptions[1]

  // Margin snapshot
  const margin = computeMarginSnapshot(
    [{ label: scenario.name, monthly: cost.monthlyRecurring }],
    finance,
  )

  // Projection series
  const projections = projectSpend(
    cost.monthlyRecurring,
    finance.growthRatePercent,
    posture.multiplier,
    PROJECTION_HORIZON,
  )

  // Quick projection points
  const month3 = projections[2]
  const month6 = projections[5]
  const month12 = projections[11]
  const overrunMonth = projections.find((projection) => projection.cost > finance.monthlyBudget)
  const maxProjectedCost = projections.reduce(
    (largest, projection) => Math.max(largest, projection.cost),
    cost.monthlyRecurring || 1,
  )
  const budgetReachRequests =
    cost.totalRecurring > 0
      ? Math.floor(finance.monthlyBudget / cost.totalRecurring)
      : 0
  const budgetUtilization =
    finance.monthlyBudget > 0 ? (margin.monthlyTotal / finance.monthlyBudget) * 100 : 0
  const outputShare =
    cost.totalRecurring > 0 ? (cost.outputCost / cost.totalRecurring) * 100 : 0
  const scenarioPressureCards = [
    {
      label: 'Monthly baseline',
      value: formatCompactMoney(cost.monthlyRecurring),
      detail: `${scenario.requestsPerDay.toLocaleString()} requests/day at the current shape`,
    },
    {
      label: 'Budget pressure',
      value: `${Math.round(budgetUtilization)}%`,
      detail: overrunMonth
        ? `At this trajectory the budget breaks in month ${overrunMonth.month}`
        : 'Still inside budget across the current 12-month view',
    },
    {
      label: 'Output sensitivity',
      value: `${Math.round(outputShare)}%`,
      detail: 'Share of recurring request cost driven by generated output',
    },
    {
      label: 'Budget capacity',
      value: budgetReachRequests > 0 ? budgetReachRequests.toLocaleString() : '—',
      detail: 'Maximum monthly requests at the current recurring request cost',
    },
  ]
  const projectionSnapshots = [
    {
      label: 'Month 1',
      cost: projections[0]?.cost ?? cost.monthlyRecurring,
      narrative: 'Where the current launch assumption starts.',
    },
    {
      label: 'Month 3',
      cost: month3.cost,
      narrative: 'Useful for early go-to-market and staffing planning.',
    },
    {
      label: 'Month 6',
      cost: month6.cost,
      narrative: 'A good checkpoint for changing default model policy.',
    },
    {
      label: 'Month 12',
      cost: month12.cost,
      narrative: 'End-of-year pressure if growth compounds as modeled.',
    },
  ]

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Forecast</p>
          <h2>Translate request economics into product economics</h2>
        </div>
      </div>

      <div className="forecast-command-grid">
        {scenarioPressureCards.map((card) => (
          <article key={card.label} className="forecast-command-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      {/* Budget guardrail banner */}
      <div className={`guardrail-banner ${margin.tone === 'overrun' ? 'danger' : margin.tone === 'tight' ? 'warning' : 'ok'}`}>
        <div>
          <strong>
            {margin.headroom >= 0
              ? `$${margin.headroom.toLocaleString()} monthly headroom`
              : `$${Math.abs(margin.headroom).toLocaleString()} monthly overrun`}
          </strong>
          <p>{margin.headroom >= 0 ? 'Within budget.' : 'Budget exceeded.'}</p>
        </div>
        <div className="guardrail-banner__meter">
          <div
            className="guardrail-meter__fill"
            style={{
              width: `${Math.max(0, Math.min(100, 100 - margin.headroomPercent))}%`,
            }}
          />
          <span>{margin.headroomPercent.toFixed(0)}%</span>
        </div>
      </div>

      <section className="forecast-storyboard">
        <div className="forecast-storyboard__main">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trajectory map</p>
              <h3>Watch the budget break before it happens</h3>
            </div>
          </div>
          <div className="trajectory-stack">
            {projectionSnapshots.map((snapshot) => (
              <article key={snapshot.label} className="trajectory-card">
                <div className="trajectory-card__header">
                  <span>{snapshot.label}</span>
                  <strong>{formatCompactMoney(snapshot.cost)}</strong>
                </div>
                <div className="trajectory-bar">
                  <div
                    className="trajectory-bar__fill"
                    style={{
                      width: `${Math.max((snapshot.cost / maxProjectedCost) * 100, 12)}%`,
                    }}
                  />
                </div>
                <p>{snapshot.narrative}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="forecast-storyboard__side">
          <article className="forecast-outcome-card">
            <span>Budget break point</span>
            <strong>{overrunMonth ? `Month ${overrunMonth.month}` : 'No break in horizon'}</strong>
            <p>
              {overrunMonth
                ? `${formatCompactMoney(overrunMonth.cost)} projected spend at the first overrun point.`
                : 'The current budget still contains the scenario through month 12.'}
            </p>
          </article>
          <article className="forecast-outcome-card">
            <span>Annualized from today</span>
            <strong>{formatCompactMoney(cost.monthlyRecurring * 12)}</strong>
            <p>Useful as a fast finance-side translation of the current plan.</p>
          </article>
          <article className="forecast-outcome-card">
            <span>Best lever to pull</span>
            <strong>{outputShare >= 45 ? 'Trim outputs' : 'Tighten growth assumptions'}</strong>
            <p>
              {outputShare >= 45
                ? 'This scenario is output-heavy, so answer length discipline will change the curve quickly.'
                : 'The spend curve is more sensitive to traffic growth than to token mix right now.'}
            </p>
          </article>
        </div>
      </section>

      {/* Assumptions controls */}
      <div className="forecast-controls">
        <div className="finance-slider-card">
          <label>
            Monthly budget
            <input
              type="number"
              min="10"
              step="50"
              value={finance.monthlyBudget}
              onChange={(event) =>
                setFinance((f) => ({ ...f, monthlyBudget: Number(event.target.value) || 0 }))
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
                setFinance((f) => ({ ...f, targetMarginPercent: Number(event.target.value) || 0 }))
              }
            />
          </label>
          <div className="slider-meta">
            <span>Minimum margin to maintain across the portfolio</span>
            <strong>{finance.targetMarginPercent}%</strong>
          </div>
        </div>
      </div>

      {/* Growth posture */}
      <div className="mode-strip forecast-mode-strip">
        {postureOptions.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={mode.id === finance.growthPosture ? 'active' : ''}
            onClick={() => setFinance((f) => ({ ...f, growthPosture: mode.id }))}
          >
            <span>{mode.label}</span>
            <small>{mode.multiplier.toFixed(2)}x demand posture</small>
          </button>
        ))}
      </div>

      {/* Growth rate */}
      <div className="finance-slider-card">
        <label>
          Monthly growth rate
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={finance.growthRatePercent}
            onChange={(event) =>
              setFinance((f) => ({ ...f, growthRatePercent: Number(event.target.value) || 0 }))
            }
          />
        </label>
        <div className="slider-meta">
          <span>Growth assumption</span>
          <strong>{finance.growthRatePercent}% / month</strong>
        </div>
      </div>

      {/* Margin insights */}
      <div className="insight-stack">
        {margin.insights.map((insight, i) => (
          <article key={i} className={`insight ${insight.tone === 'healthy' ? 'good' : insight.tone === 'overrun' ? 'warning' : 'info'}`}>
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
            {margin.overrunItems.join(', ')} is the largest contributor to the
            overrun.
          </p>
        </div>
      ) : null}

      {/* Projection table */}
      <div className="projection-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Projection</p>
            <h3>12-month spend projection</h3>
          </div>
        </div>
        <div className="projection-table-scroll">
          <table className="projection-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Monthly spend</th>
                <th>Cumulative</th>
                <th>Budget</th>
                <th>Headroom</th>
              </tr>
            </thead>
            <tbody>
              {[...projections].reverse().map((p) => (
                <tr key={p.month} className={p.cost > finance.monthlyBudget ? 'overrun-row' : ''}>
                  <td>{p.month}</td>
                  <td>${p.cost.toFixed(2)}</td>
                  <td>${p.cumulative.toFixed(2)}</td>
                  <td>${finance.monthlyBudget.toFixed(2)}</td>
                  <td className={p.cost <= finance.monthlyBudget ? 'good' : ''}>
                    ${(finance.monthlyBudget - p.cost).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick projection cards */}
      <div className="projection-grid">
        <div className="projection-card">
          <span>Month 3</span>
          <strong>${month3.cost.toFixed(2)}</strong>
          <p>Useful for early launch planning and infra sanity checks.</p>
        </div>
        <div className="projection-card">
          <span>Month 6</span>
          <strong>${month6.cost.toFixed(2)}</strong>
          <p>Halfway point — check if the default model still makes sense.</p>
        </div>
        <div className="projection-card">
          <span>Month 12</span>
          <strong>${month12.cost.toFixed(2)}</strong>
          <p>Full-year outlook at the assumed growth rate and posture.</p>
        </div>
      </div>

      {/* Traffic assumptions */}
      <div className="two-up">
        <div className="panel compact nested">
          <p className="eyebrow">Assumptions</p>
          <h3>Current traffic model</h3>
          <ul className="plain-list">
            <li>{scenario.requestsPerDay.toLocaleString()} requests per day</li>
            <li>{scenario.daysPerMonth} active days per month</li>
            <li>{scenario.activeUsers.toLocaleString()} active users</li>
            <li>
              ${
                scenario.activeUsers > 0
                  ? (cost.monthlyRecurring / scenario.activeUsers).toFixed(2)
                  : '—'
              } per active user per month
            </li>
          </ul>
        </div>

        <div className="panel compact nested">
          <p className="eyebrow">Budget planner</p>
          <h3>How far does the budget go?</h3>
          <ul className="plain-list">
            <li>
              {margin.headroom >= 0
                ? `Headroom left: $${margin.headroom.toFixed(2)}`
                : `Budget overrun: $${Math.abs(margin.headroom).toFixed(2)}`}
            </li>
            <li>
              Max requests at this budget:{' '}
              {cost.totalRecurring > 0
                ? Math.floor(finance.monthlyBudget / cost.totalRecurring).toLocaleString()
                : '—'}
            </li>
            <li>Use this to compare model choices before you scale traffic.</li>
            <li>Revisit this after changing the decision mode in Compare.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
