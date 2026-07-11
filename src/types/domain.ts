export type ViewId = 'plan' | 'compare' | 'optimize' | 'explore' | 'forecast'

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'xai'
  | 'deepseek'

export type ModelTier = 'flagship' | 'balanced' | 'efficient'
export type PricingStatus = 'verified' | 'mixed' | 'seed'

export interface Provider {
  id: ProviderId
  name: string
  shortName: string
  summary: string
  pricingStatus: PricingStatus
  pricingLastVerified: string
  notes: string
  sourceLabel?: string
  sourceUrl?: string
}

export interface ModelCapabilityFlags {
  vision: boolean
  tools: boolean
  reasoning: boolean
  caching: boolean
}

export interface ModelRecord {
  id: string
  providerId: ProviderId
  name: string
  family: string
  tier: ModelTier
  label: string
  summary: string
  pricingStatus: PricingStatus
  inputPerMTok: number
  outputPerMTok: number
  cacheReadPerMTok?: number
  cacheWritePerMTok?: number
  contextWindowK: number
  maxOutputK: number
  badges: string[]
  recommendedFor: string[]
  capabilities: ModelCapabilityFlags
  sourceLabel?: string
  sourceUrl?: string
}

export interface ScenarioInput {
  name: string
  systemTokens: number
  userTokens: number
  retrievedTokens: number
  toolTokens: number
  cachedTokens: number
  outputTokens: number
  requestsPerDay: number
  daysPerMonth: number
  activeUsers: number
  useBatch: boolean
  useCaching: boolean
}

export interface SavedScenario {
  id: string
  modelId: string
  providerId: ProviderId
  createdAt: string
  scenario: ScenarioInput
}

export interface CostBreakdown {
  inputTokens: number
  recurringInputCost: number
  cachedReadCost: number
  cachedWriteCost: number
  outputCost: number
  batchDiscount: number
  totalFirstRun: number
  totalRecurring: number
  monthlyRecurring: number
}

export interface UseCaseTemplate {
  id: string
  category: string
  name: string
  description: string
  recommendedStack: string
  suggestedModelIds: string[]
  tokenPattern: string
  monthlyBudgetHint: string
  budgetTier: 'starter' | 'growth' | 'serious'
  tips: string[]
  scenarioSeed: Partial<ScenarioInput>
}
