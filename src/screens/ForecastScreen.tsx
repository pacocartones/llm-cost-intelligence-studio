import { useState } from 'react'
import type { CostBreakdown, ScenarioInput } from '../types/domain'

type GrowthMode = 'conservative' | 'launch' | 'aggressive'

const growthModes: { id: GrowthMode; label: string; multiplier: number }[] = [
  { id: 'conservative', label: 'Conservative', multiplier: 0.9 },
  { id: 'launch', label: 'Launch plan', multiplier: 1.15 },
  { id: 'aggressive', label: 'Aggressive', multiplier: 1.35 },
]

interface ForecastScreenProps {
  scenario: ScenarioInput
  cost: CostBreakdown
}

export function ForecastScreen({ scenario, cost }: ForecastScreenProps) {
  const [monthlyBudget, setMonthlyBudget] = useState(500)
  const [growthMode, setGrowthMode] = useState<GrowthMode>('launch')
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState(12)
  const bestCase = cost.monthlyRecurring * 0.7
  const expectedCase = cost.monthlyRecurring
  const worstCase = cost.monthlyRecurring * 1.45
  const costPerUser =
    scenario.activeUsers > 0 ? expectedCase / scenario.activeUsers : 0
  const budgetHeadroom = monthlyBudget - expectedCase
  const maxRequestsWithinBudget =
    cost.totalRecurring > 0 ? Math.floor(monthlyBudget / cost.totalRecurring) : 0
  const modeMultiplier =
    growthModes.find((mode) => mode.id === growthMode)?.multiplier ?? 1
  const projectedMonth3 =
    expectedCase * modeMultiplier * Math.pow(1 + monthlyGrowthRate / 100, 3)
  const projectedMonth12 =
    expectedCase * modeMultiplier * Math.pow(1 + monthlyGrowthRate / 100, 12)
  const budgetSupportedUsers =
    costPerUser > 0 ? Math.floor(monthlyBudget / costPerUser) : 0

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Forecast</p>
          <h2>Translate request economics into product economics</h2>
        </div>
      </div>

      <div className="forecast-band">
        <div>
          <span>Best case</span>
          <strong>${bestCase.toFixed(2)}</strong>
        </div>
        <div>
          <span>Expected</span>
          <strong>${expectedCase.toFixed(2)}</strong>
        </div>
        <div>
          <span>Worst case</span>
          <strong>${worstCase.toFixed(2)}</strong>
        </div>
      </div>

      <div className="forecast-controls">
        <div className="mode-strip forecast-mode-strip">
          {growthModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={mode.id === growthMode ? 'active' : ''}
              onClick={() => setGrowthMode(mode.id)}
            >
              <span>{mode.label}</span>
              <small>{mode.multiplier.toFixed(2)}x demand posture</small>
            </button>
          ))}
        </div>

        <div className="forecast-slider-card">
          <label>
            Monthly growth rate
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={monthlyGrowthRate}
              onChange={(event) =>
                setMonthlyGrowthRate(Number(event.target.value) || 0)
              }
            />
          </label>
          <div className="slider-meta">
            <span>Growth assumption</span>
            <strong>{monthlyGrowthRate}% / month</strong>
          </div>
        </div>
      </div>

      <div className="projection-grid">
        <div className="projection-card">
          <span>Projected month 3</span>
          <strong>${projectedMonth3.toFixed(2)}</strong>
          <p>Useful for early launch planning and infra sanity checks.</p>
        </div>
        <div className="projection-card">
          <span>Projected month 12</span>
          <strong>${projectedMonth12.toFixed(2)}</strong>
          <p>Use this to pressure-test whether your default model still makes sense.</p>
        </div>
        <div className="projection-card">
          <span>Users supported by budget</span>
          <strong>{budgetSupportedUsers.toLocaleString()}</strong>
          <p>Approximate active users at current cost-per-user before budget pressure starts.</p>
        </div>
      </div>

      <div className="two-up">
        <div className="panel compact nested">
          <p className="eyebrow">Assumptions</p>
          <h3>Current traffic model</h3>
          <ul className="plain-list">
            <li>{scenario.requestsPerDay.toLocaleString()} requests per day</li>
            <li>{scenario.daysPerMonth} active days per month</li>
            <li>{scenario.activeUsers.toLocaleString()} active users</li>
            <li>${costPerUser.toFixed(2)} per active user per month</li>
          </ul>
        </div>

        <div className="panel compact nested">
          <p className="eyebrow">Budget planner</p>
          <h3>How far does the budget go?</h3>
          <label>
            Monthly budget
            <input
              type="number"
              min="10"
              step="10"
              value={monthlyBudget}
              onChange={(event) => setMonthlyBudget(Number(event.target.value) || 0)}
            />
          </label>
          <ul className="plain-list">
            <li>
              {budgetHeadroom >= 0
                ? `Headroom left: $${budgetHeadroom.toFixed(2)}`
                : `Budget overrun: $${Math.abs(budgetHeadroom).toFixed(2)}`}
            </li>
            <li>
              Max requests at this budget: {maxRequestsWithinBudget.toLocaleString()}
            </li>
            <li>Use this to compare model choices before you scale traffic.</li>
            <li>Revisit this after changing the decision mode in Compare.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
