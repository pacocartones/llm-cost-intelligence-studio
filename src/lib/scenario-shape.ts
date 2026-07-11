import type { ScenarioInput } from '../types/domain'

export interface TokenSlice {
  key: 'system' | 'user' | 'retrieved' | 'tool' | 'output'
  label: string
  tokens: number
  percentage: number
}

export function buildTokenSlices(scenario: ScenarioInput): TokenSlice[] {
  const slices = [
    { key: 'system' as const, label: 'System', tokens: scenario.systemTokens },
    { key: 'user' as const, label: 'User', tokens: scenario.userTokens },
    { key: 'retrieved' as const, label: 'Retrieved', tokens: scenario.retrievedTokens },
    { key: 'tool' as const, label: 'Tool overhead', tokens: scenario.toolTokens },
    { key: 'output' as const, label: 'Output', tokens: scenario.outputTokens },
  ]

  const total = slices.reduce((sum, slice) => sum + slice.tokens, 0) || 1

  return slices.map((slice) => ({
    ...slice,
    percentage: (slice.tokens / total) * 100,
  }))
}

export function describeScenarioShape(scenario: ScenarioInput) {
  if (scenario.retrievedTokens > scenario.userTokens + scenario.systemTokens) {
    return 'Retrieval-heavy workload'
  }

  if (scenario.outputTokens > scenario.userTokens && scenario.outputTokens > 900) {
    return 'Generation-heavy workflow'
  }

  if (scenario.systemTokens > 1500 && scenario.cachedTokens > 0) {
    return 'Instruction-heavy assistant'
  }

  if (scenario.toolTokens > 500) {
    return 'Tool-augmented workflow'
  }

  return 'Balanced request pattern'
}
