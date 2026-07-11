import { defaultScenario } from '../data/catalog'
import { calculateScenarioCost } from './costing'
import { buildRoutingMixFromCatalog } from './routing'
import type {
  BenchmarkScore,
  ModelRecord,
  RoutingSlotInput,
  ScenarioInput,
  UseCaseTemplate,
} from '../types/domain'

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function resolveTemplateScenario(template: UseCaseTemplate): ScenarioInput {
  return {
    ...defaultScenario,
    ...template.scenarioSeed,
    name: template.scenarioSeed.name ?? template.name,
  }
}

function getCategoryFit(template: UseCaseTemplate, model: ModelRecord) {
  const category = template.category.toLowerCase()
  let fit = 50

  if (category.includes('support')) {
    fit += model.capabilities.tools ? 16 : 0
    fit += model.capabilities.caching ? 10 : 0
    fit += model.tier === 'efficient' || model.tier === 'balanced' ? 12 : -2
  }

  if (category.includes('developer')) {
    fit += model.capabilities.reasoning ? 18 : 0
    fit += model.capabilities.tools ? 14 : 0
    fit += model.tier === 'balanced' ? 10 : model.tier === 'flagship' ? 8 : 0
  }

  if (category.includes('knowledge') || category.includes('research')) {
    fit += model.capabilities.reasoning ? 16 : 0
    fit += model.capabilities.vision ? 10 : 0
    fit += Math.min(model.contextWindowK / 25, 22)
  }

  if (category.includes('education')) {
    fit += model.tier === 'efficient' ? 14 : 0
    fit += model.capabilities.caching ? 10 : 0
    fit += model.capabilities.reasoning ? 8 : 0
  }

  if (category.includes('revenue') || category.includes('sales')) {
    fit += model.capabilities.tools ? 12 : 0
    fit += model.capabilities.reasoning ? 12 : 0
    fit += model.tier === 'balanced' ? 12 : 0
  }

  return clampScore(fit)
}

function buildSummary(template: UseCaseTemplate, score: BenchmarkScore, model: ModelRecord) {
  if (score.cost >= 80 && score.speed >= 75) {
    return `${model.name} is a strong volume play for ${template.name.toLowerCase()}.`
  }

  if (score.quality >= 82 && score.fit >= 75) {
    return `${model.name} looks strong when the product moment needs higher answer quality.`
  }

  if (score.fit >= 78) {
    return `${model.name} maps well to this workflow pattern without looking overbuilt.`
  }

  return `${model.name} is viable here, but the architecture may matter more than the model tier.`
}

export function evaluateBenchmarkModel(
  template: UseCaseTemplate,
  model: ModelRecord,
): BenchmarkScore {
  const scenario = resolveTemplateScenario(template)
  const cost = calculateScenarioCost(model, scenario)
  const quality = clampScore(
    34 +
      (model.tier === 'flagship' ? 28 : model.tier === 'balanced' ? 18 : 10) +
      (model.capabilities.reasoning ? 14 : 0) +
      (model.capabilities.vision ? 8 : 0) +
      Math.min(model.contextWindowK / 30, 16),
  )
  const speed = clampScore(
    92 -
      (model.tier === 'flagship' ? 26 : model.tier === 'balanced' ? 12 : 2) -
      Math.min(model.outputPerMTok * 3, 18),
  )
  const budgetTarget =
    template.budgetTier === 'starter' ? 180 : template.budgetTier === 'growth' ? 700 : 1500
  const costScore = clampScore(
    100 - Math.min((cost.monthlyRecurring / budgetTarget) * 55, 92),
  )
  const fit = getCategoryFit(template, model)
  const overall = clampScore(
    quality * 0.32 + costScore * 0.28 + speed * 0.14 + fit * 0.26,
  )
  const score: BenchmarkScore = {
    overall,
    quality,
    cost: costScore,
    speed,
    fit,
    recurring: cost.totalRecurring,
    monthly: cost.monthlyRecurring,
    summary: '',
  }

  score.summary = buildSummary(template, score, model)
  return score
}

export function rankBenchmarkModels(models: ModelRecord[], template: UseCaseTemplate) {
  return models
    .map((model) => ({
      model,
      score: evaluateBenchmarkModel(template, model),
    }))
    .sort((left, right) => right.score.overall - left.score.overall)
}

export function evaluateRoutingBenchmark(
  models: ModelRecord[],
  template: UseCaseTemplate,
  slots: RoutingSlotInput[],
) {
  const scenario = resolveTemplateScenario(template)
  const routingCost = buildRoutingMixFromCatalog(models, scenario, slots)
  const weighted = routingCost.stack.reduce(
    (acc, slot) => {
      const score = evaluateBenchmarkModel(template, slot.entry.model)
      return {
        overall: acc.overall + score.overall * slot.normalizedShare,
        quality: acc.quality + score.quality * slot.normalizedShare,
        cost: acc.cost + score.cost * slot.normalizedShare,
        speed: acc.speed + score.speed * slot.normalizedShare,
        fit: acc.fit + score.fit * slot.normalizedShare,
      }
    },
    { overall: 0, quality: 0, cost: 0, speed: 0, fit: 0 },
  )

  return {
    overall: clampScore(weighted.overall),
    quality: clampScore(weighted.quality),
    cost: clampScore(weighted.cost),
    speed: clampScore(weighted.speed),
    fit: clampScore(weighted.fit),
    recurring: routingCost.blendedRecurring,
    monthly: routingCost.blendedMonthly,
    summary: 'Routing stack blends cheap traffic, default flows, and premium fallback quality.',
  }
}
