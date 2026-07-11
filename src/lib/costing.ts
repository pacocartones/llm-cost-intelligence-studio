import type { CostBreakdown, ModelRecord, ScenarioInput } from '../types/domain'

export function getInputTokens(scenario: ScenarioInput) {
  return scenario.systemTokens + scenario.userTokens + scenario.retrievedTokens + scenario.toolTokens
}

export function calculateScenarioCost(
  model: ModelRecord,
  scenario: ScenarioInput,
): CostBreakdown {
  const inputTokens = getInputTokens(scenario)
  const cachedTokens =
    scenario.useCaching && model.capabilities.caching
      ? Math.min(scenario.cachedTokens, inputTokens)
      : 0
  const standardInputTokens = Math.max(0, inputTokens - cachedTokens)

  const recurringInputCost =
    (standardInputTokens / 1_000_000) * model.inputPerMTok
  const cachedReadCost =
    cachedTokens > 0 && model.cacheReadPerMTok
      ? (cachedTokens / 1_000_000) * model.cacheReadPerMTok
      : 0
  const cachedWriteCost =
    cachedTokens > 0 && model.cacheWritePerMTok
      ? (cachedTokens / 1_000_000) * model.cacheWritePerMTok
      : 0
  const outputCost = (scenario.outputTokens / 1_000_000) * model.outputPerMTok

  const rawRecurring = recurringInputCost + cachedReadCost + outputCost
  const rawFirstRun = recurringInputCost + cachedWriteCost + outputCost
  const batchMultiplier = scenario.useBatch ? 0.5 : 1

  const totalRecurring = rawRecurring * batchMultiplier
  const totalFirstRun = rawFirstRun * batchMultiplier
  const batchDiscount = rawRecurring - totalRecurring
  const monthlyRecurring =
    totalRecurring * scenario.requestsPerDay * scenario.daysPerMonth

  return {
    inputTokens,
    recurringInputCost,
    cachedReadCost,
    cachedWriteCost,
    outputCost,
    batchDiscount,
    totalFirstRun,
    totalRecurring,
    monthlyRecurring,
  }
}
