import { useMemo, useState } from 'react'
import { resolveTemplateScenario, evaluateBenchmarkModel, evaluateRoutingBenchmark } from '../lib/benchmarks'
import { calculateScenarioCost } from '../lib/costing'
import { buildRoutingMixFromCatalog } from '../lib/routing'
import type { ModelRecord, SavedRoutingStack, UseCaseTemplate } from '../types/domain'

interface PortfolioScreenProps {
  templates: UseCaseTemplate[]
  models: ModelRecord[]
  savedRoutingStacks: SavedRoutingStack[]
  onApplyTemplate: (template: UseCaseTemplate) => void
  onLoadRoutingStack: (stack: SavedRoutingStack) => void
}

export function PortfolioScreen({
  templates,
  models,
  savedRoutingStacks,
  onApplyTemplate,
  onLoadRoutingStack,
}: PortfolioScreenProps) {
  const [teamMultiplier, setTeamMultiplier] = useState(2)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    templates.slice(0, 3).map((template) => template.id),
  )
  const [selectedStackIds, setSelectedStackIds] = useState<string[]>(
    savedRoutingStacks.slice(0, 2).map((stack) => stack.id),
  )

  const templatePortfolio = useMemo(
    () =>
      templates
        .filter((template) => selectedTemplateIds.includes(template.id))
        .map((template) => {
          const model = models.find((entry) => entry.id === template.suggestedModelIds[0]) ?? models[0]
          const scenario = resolveTemplateScenario(template)
          const cost = calculateScenarioCost(model, scenario)
          const score = evaluateBenchmarkModel(template, model)

          return {
            id: template.id,
            label: template.name,
            owner: template.category,
            monthly: cost.monthlyRecurring * teamMultiplier,
            annual: cost.monthlyRecurring * 12 * teamMultiplier,
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
            templates.find((template) => template.scenarioSeed.name === stack.scenario.name) ??
            templates.find((template) => stack.scenarioName.toLowerCase().includes(template.name.toLowerCase()))
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
  const totalMonthly = allPortfolioItems.reduce((sum, item) => sum + item.monthly, 0)
  const totalAnnual = allPortfolioItems.reduce((sum, item) => sum + item.annual, 0)
  const highestBurnItem = [...allPortfolioItems].sort((left, right) => right.monthly - left.monthly)[0]
  const averageScore =
    allPortfolioItems.length > 0
      ? Math.round(allPortfolioItems.reduce((sum, item) => sum + item.score, 0) / allPortfolioItems.length)
      : 0

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  function toggleStack(id: string) {
    setSelectedStackIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
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
          <strong>{highestBurnItem?.label ?? '—'}</strong>
        </div>
      </div>

      <div className="portfolio-controls">
        <div className="forecast-slider-card">
          <label>
            Team multiplier
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={teamMultiplier}
              onChange={(event) => setTeamMultiplier(Number(event.target.value) || 1)}
            />
          </label>
          <div className="slider-meta">
            <span>Apply this to every selected workload</span>
            <strong>{teamMultiplier} teams / product units</strong>
          </div>
        </div>

        <div className="panel compact nested">
          <p className="eyebrow">Why this view matters</p>
          <h3>Budget decisions rarely happen one scenario at a time</h3>
          <p className="muted-copy">
            Portfolio mode lets you estimate what happens when several products, regions,
            squads, or customer segments all ship AI features at once.
          </p>
        </div>
      </div>

      <div className="portfolio-selector-grid">
        <section className="panel compact nested">
          <p className="eyebrow">Template portfolio</p>
          <h3>Product lines</h3>
          <div className="portfolio-selector-list">
            {templates.map((template) => (
              <label key={template.id} className="portfolio-selector-item">
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
                Save a few routing mixes in Compare and they will appear here automatically.
              </p>
            ) : null}
            {savedRoutingStacks.map((stack) => (
              <label key={stack.id} className="portfolio-selector-item">
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

      <div className="portfolio-grid">
        {allPortfolioItems.map((item) => (
          <article key={item.id} className="portfolio-card">
            <div className="portfolio-card__head">
              <div>
                <span className="soft-badge">{item.type === 'stack' ? 'Routing stack' : item.owner}</span>
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
