import type { ModelRecord, ScenarioInput } from '../types/domain'
import type { Insight } from '../lib/insights'
import type { OptimizationPlan } from '../lib/optimizer'

interface OptimizeScreenProps {
  model: ModelRecord
  scenario: ScenarioInput
  insights: Insight[]
  optimizationPlan: OptimizationPlan
}

export function OptimizeScreen({
  model,
  scenario,
  insights,
  optimizationPlan,
}: OptimizeScreenProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Optimize</p>
          <h2>Turn the estimate into decisions</h2>
        </div>
      </div>

      <div className="optimize-hero">
        <div>
          <p className="eyebrow">Primary recommendation</p>
          <h3>{optimizationPlan.headline}</h3>
          <p>{optimizationPlan.subhead}</p>
        </div>
        <div className="optimize-hero__stats">
          <div>
            <span>Model</span>
            <strong>{model.name}</strong>
          </div>
          <div>
            <span>Requests/day</span>
            <strong>{scenario.requestsPerDay.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="two-up">
        <div className="panel compact nested">
          <p className="eyebrow">Current focus</p>
          <h3>{model.name}</h3>
          <p className="muted-copy">
            This screen is a seed rule engine. Claude Code can later grow it into prompt, routing, caching, and architecture recommendations.
          </p>
          <ul className="plain-list">
            <li>System tokens: {scenario.systemTokens.toLocaleString()}</li>
            <li>Retrieved context: {scenario.retrievedTokens.toLocaleString()}</li>
            <li>Output budget: {scenario.outputTokens.toLocaleString()}</li>
            <li>Cached prefix: {scenario.cachedTokens.toLocaleString()}</li>
          </ul>
        </div>

        <div className="insight-stack">
          {insights.map((insight) => (
            <article key={insight.title} className={`insight ${insight.tone}`}>
              <strong>{insight.title}</strong>
              <p>{insight.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="optimize-grid">
        <section className="panel compact nested">
          <p className="eyebrow">Quick wins</p>
          <h3>Low-effort savings</h3>
          <div className="move-stack">
            {optimizationPlan.quickWins.length ? (
              optimizationPlan.quickWins.map((move) => (
                <article key={move.id} className="move-card">
                  <div className="move-card__head">
                    <strong>{move.title}</strong>
                    <span className={`impact-pill impact-${move.impact}`}>
                      {move.impact} impact
                    </span>
                  </div>
                  <p>{move.summary}</p>
                  <div className="move-meta">
                    <span>{move.effort} effort</span>
                    {move.savingsMonthly ? (
                      <strong>${move.savingsMonthly.toFixed(0)}/month</strong>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="muted-copy">
                No obvious low-effort savings lever stands out right now.
              </p>
            )}
          </div>
        </section>

        <section className="panel compact nested">
          <p className="eyebrow">Structural moves</p>
          <h3>Bigger architectural improvements</h3>
          <div className="move-stack">
            {optimizationPlan.structuralMoves.length ? (
              optimizationPlan.structuralMoves.map((move) => (
                <article key={move.id} className="move-card">
                  <div className="move-card__head">
                    <strong>{move.title}</strong>
                    <span className={`impact-pill impact-${move.impact}`}>
                      {move.impact} impact
                    </span>
                  </div>
                  <p>{move.summary}</p>
                  <div className="move-meta">
                    <span>{move.effort} effort</span>
                    {move.savingsMonthly ? (
                      <strong>${move.savingsMonthly.toFixed(0)}/month</strong>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="muted-copy">
                This scenario does not yet show a clear structural refactor with strong ROI.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="panel compact nested">
        <p className="eyebrow">Guardrails</p>
        <h3>What not to ignore as this scales</h3>
        <div className="move-stack">
          {optimizationPlan.guardrails.length ? (
            optimizationPlan.guardrails.map((move) => (
              <article key={move.id} className="move-card">
                <div className="move-card__head">
                  <strong>{move.title}</strong>
                  <span className={`impact-pill impact-${move.impact}`}>
                    {move.impact} impact
                  </span>
                </div>
                <p>{move.summary}</p>
                <div className="move-meta">
                  <span>{move.effort} effort</span>
                  <span>{move.category}</span>
                </div>
              </article>
            ))
          ) : (
            <p className="muted-copy">
              No major guardrail warning is triggered at the moment.
            </p>
          )}
        </div>
      </section>
    </section>
  )
}
