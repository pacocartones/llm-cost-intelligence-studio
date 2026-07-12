import type { ModelRecord, ScenarioInput } from '../types/domain'
import type { Insight } from '../lib/insights'
import type { OptimizationPlan } from '../lib/optimizer'

function formatCompactMoney(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

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
  const topQuickWin = optimizationPlan.quickWins[0] ?? null
  const topStructuralMove = optimizationPlan.structuralMoves[0] ?? null
  const topGuardrail = optimizationPlan.guardrails[0] ?? null
  const savingsPotential = optimizationPlan.quickWins
    .concat(optimizationPlan.structuralMoves)
    .reduce((sum, move) => sum + (move.savingsMonthly ?? 0), 0)
  const outputPressure =
    scenario.outputTokens >= Math.max(scenario.userTokens, scenario.systemTokens)
  const retrievalPressure = scenario.retrievedTokens > scenario.userTokens * 1.5
  const optimizeCards = [
    {
      label: 'Fastest savings move',
      value: topQuickWin?.title ?? 'No easy lever',
      detail: topQuickWin?.savingsMonthly
        ? `${formatCompactMoney(topQuickWin.savingsMonthly)}/month upside`
        : 'No immediate low-effort savings surfaced',
    },
    {
      label: 'Structural upside',
      value: topStructuralMove?.title ?? 'No major refactor yet',
      detail: topStructuralMove?.savingsMonthly
        ? `${formatCompactMoney(topStructuralMove.savingsMonthly)}/month modeled`
        : 'The current scenario does not justify a larger refactor yet',
    },
    {
      label: 'Guardrail risk',
      value: topGuardrail?.title ?? 'No red flag',
      detail: topGuardrail
        ? `${topGuardrail.category} risk worth monitoring before scale`
        : 'No major architecture guardrail triggered',
    },
    {
      label: 'Total modeled upside',
      value: savingsPotential > 0 ? formatCompactMoney(savingsPotential) : '$0',
      detail: 'Combined monthly upside from the current recommended moves',
    },
  ]

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Optimize</p>
          <h2>Turn the estimate into decisions</h2>
        </div>
      </div>

      <div className="optimize-command-grid">
        {optimizeCards.map((card) => (
          <article key={card.label} className="optimize-command-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
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

      <section className="optimize-priority-board">
        <div className="optimize-priority-board__main">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Priority board</p>
              <h3>Sequence the next optimization sprint</h3>
            </div>
          </div>
          <div className="priority-lane">
            <article className="priority-card priority-card--primary">
              <span>Do first</span>
              <strong>{topQuickWin?.title ?? optimizationPlan.headline}</strong>
              <p>{topQuickWin?.summary ?? optimizationPlan.subhead}</p>
            </article>
            <article className="priority-card">
              <span>Then validate</span>
              <strong>{topStructuralMove?.title ?? 'Run compare-mode experiments'}</strong>
              <p>
                {topStructuralMove?.summary ??
                  'If easy savings are exhausted, test whether a cheaper default or routing mix changes economics enough to matter.'}
              </p>
            </article>
            <article className="priority-card">
              <span>Protect against</span>
              <strong>{topGuardrail?.title ?? 'Silent token growth'}</strong>
              <p>
                {topGuardrail?.summary ??
                  'Monitor for hidden growth in output length, tool chatter, or context payload before traffic scales.'}
              </p>
            </article>
          </div>
        </div>

        <div className="optimize-priority-board__side">
          <article className="optimize-outcome-card">
            <span>Scenario pressure</span>
            <strong>{outputPressure ? 'Output-heavy' : retrievalPressure ? 'Retrieval-heavy' : 'Balanced shape'}</strong>
            <p>
              {outputPressure
                ? 'Generated answer length is likely the first place to look for savings.'
                : retrievalPressure
                  ? 'Context discipline and ranking quality matter more than another model upgrade.'
                  : 'The scenario is balanced enough that model choice and architecture both deserve testing.'}
            </p>
          </article>
          <article className="optimize-outcome-card">
            <span>Traffic intensity</span>
            <strong>{scenario.requestsPerDay.toLocaleString()}/day</strong>
            <p>Higher traffic makes low-effort changes compound faster, so prioritize the cheapest safe win first.</p>
          </article>
          <article className="optimize-outcome-card">
            <span>Current focus model</span>
            <strong>{model.name}</strong>
            <p>Use this screen to decide whether this model deserves to stay in the main request path.</p>
          </article>
        </div>
      </section>

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
