import { calculateScenarioCost } from './costing'
import type { ModelRecord, ScenarioInput } from '../types/domain'

export interface RankedModel {
  model: ModelRecord
  recurring: number
  monthly: number
  deltaFromSelected: number
}

export function rankModelsForScenario(
  catalog: ModelRecord[],
  scenario: ScenarioInput,
  selectedModelId: string,
) {
  const selectedModel = catalog.find((model) => model.id === selectedModelId) ?? catalog[0]
  const selectedCost = calculateScenarioCost(selectedModel, scenario)

  return catalog
    .map((model) => {
      const cost = calculateScenarioCost(model, scenario)
      return {
        model,
        recurring: cost.totalRecurring,
        monthly: cost.monthlyRecurring,
        deltaFromSelected: cost.totalRecurring - selectedCost.totalRecurring,
      }
    })
    .sort((left, right) => left.recurring - right.recurring)
}

export function getCatalogHealthCounts(
  catalog: ModelRecord[],
  providers: { id: string; pricingStatus: string }[],
) {
  const modelCount = catalog.length
  const verifiedModels = catalog.filter((model) => model.pricingStatus === 'verified').length
  const mixedModels = catalog.filter((model) => model.pricingStatus === 'mixed').length
  const seedModels = catalog.filter((model) => model.pricingStatus === 'seed').length
  const sourceLinkedModels = catalog.filter((model) => Boolean(model.sourceUrl)).length
  const verifiedProviders = providers.filter(
    (provider) => provider.pricingStatus === 'verified',
  ).length
  const mixedProviders = providers.filter(
    (provider) => provider.pricingStatus === 'mixed',
  ).length
  const seedProviders = providers.filter(
    (provider) => provider.pricingStatus === 'seed',
  ).length

  return {
    modelCount,
    verifiedModels,
    mixedModels,
    seedModels,
    sourceLinkedModels,
    verifiedProviders,
    mixedProviders,
    seedProviders,
  }
}
