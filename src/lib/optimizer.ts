import { calculateScenarioCost } from './costing'
import type { CostBreakdown, ModelRecord, ScenarioInput } from '../types/domain'

export interface OptimizationMove {
  id: string
  title: string
  category: 'model' | 'output' | 'retrieval' | 'platform' | 'prompt' | 'architecture'
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  summary: string
  savingsPerRequest?: number
  savingsMonthly?: number
}

export interface OptimizationPlan {
  headline: string
  subhead: string
  quickWins: OptimizationMove[]
  structuralMoves: OptimizationMove[]
  guardrails: OptimizationMove[]
}

function estimateMonthlySavings(
  savingsPerRequest: number,
  scenario: ScenarioInput,
) {
  return savingsPerRequest * scenario.requestsPerDay * scenario.daysPerMonth
}

export function buildOptimizationPlan(
  model: ModelRecord,
  scenario: ScenarioInput,
  cost: CostBreakdown,
  catalog: ModelRecord[],
) {
  const quickWins: OptimizationMove[] = []
  const structuralMoves: OptimizationMove[] = []
  const guardrails: OptimizationMove[] = []

  const outputShare =
    cost.totalRecurring > 0 ? cost.outputCost / cost.totalRecurring : 0
  const inputCostPerToken =
    cost.inputTokens > 0
      ? (cost.recurringInputCost + cost.cachedReadCost) / cost.inputTokens
      : 0
  const outputCostPerToken =
    scenario.outputTokens > 0 ? cost.outputCost / scenario.outputTokens : 0

  if (!scenario.useBatch) {
    const savings = cost.totalRecurring * 0.5
    quickWins.push({
      id: 'batch',
      title: 'Model async work as batch jobs',
      category: 'platform',
      impact: 'high',
      effort: 'low',
      summary:
        'If the workflow is not user-blocking, batch is usually the fastest discount lever available.',
      savingsPerRequest: savings,
      savingsMonthly: estimateMonthlySavings(savings, scenario),
    })
  }

  if (!scenario.useCaching && model.capabilities.caching && scenario.systemTokens > 800) {
    const savings =
      ((Math.min(scenario.systemTokens, cost.inputTokens) / 1_000_000) *
        (model.inputPerMTok - (model.cacheReadPerMTok ?? model.inputPerMTok))) || 0
    quickWins.push({
      id: 'cache-system',
      title: 'Cache the stable prompt prefix',
      category: 'platform',
      impact: 'medium',
      effort: 'low',
      summary:
        'Large repeated system instructions should usually be treated as cached prefix rather than fresh input every time.',
      savingsPerRequest: savings,
      savingsMonthly: estimateMonthlySavings(savings, scenario),
    })
  }

  if (outputShare > 0.5 && scenario.outputTokens > 500) {
    const savings = scenario.outputTokens * 0.2 * outputCostPerToken
    quickWins.push({
      id: 'trim-output',
      title: 'Reduce the default output budget',
      category: 'output',
      impact: 'high',
      effort: 'low',
      summary:
        'This workload is output-heavy. Tightening answer length or response format can cut spend with minimal architecture changes.',
      savingsPerRequest: savings,
      savingsMonthly: estimateMonthlySavings(savings, scenario),
    })
  }

  if (scenario.retrievedTokens > scenario.userTokens * 1.5) {
    const savings = scenario.retrievedTokens * 0.3 * inputCostPerToken
    structuralMoves.push({
      id: 'retrieval-prune',
      title: 'Prune retrieved context',
      category: 'retrieval',
      impact: 'high',
      effort: 'medium',
      summary:
        'The workload is retrieval-heavy. A tighter chunking and ranking strategy will likely matter more than switching providers.',
      savingsPerRequest: savings,
      savingsMonthly: estimateMonthlySavings(savings, scenario),
    })
  }

  const balancedAlternatives = catalog
    .filter((entry) => entry.id !== model.id && entry.tier === 'balanced')
    .map((entry) => ({
      model: entry,
      cost: calculateScenarioCost(entry, scenario),
    }))
    .sort((left, right) => left.cost.totalRecurring - right.cost.totalRecurring)

  const bestBalanced = balancedAlternatives[0]
  if (bestBalanced && bestBalanced.cost.totalRecurring < cost.totalRecurring) {
    const savings = cost.totalRecurring - bestBalanced.cost.totalRecurring
    structuralMoves.push({
      id: 'switch-balanced',
      title: `Test ${bestBalanced.model.name} as the default tier`,
      category: 'model',
      impact: 'high',
      effort: 'medium',
      summary:
        'Your current model looks expensive relative to a balanced alternative. Validate whether premium quality is actually changing product outcomes.',
      savingsPerRequest: savings,
      savingsMonthly: estimateMonthlySavings(savings, scenario),
    })
  }

  if (model.tier === 'flagship' && cost.monthlyRecurring > 500) {
    guardrails.push({
      id: 'flagship-guardrail',
      title: 'Do not lock flagship into every request path',
      category: 'architecture',
      impact: 'high',
      effort: 'medium',
      summary:
        'Premium models are often best reserved for fallback paths, difficult cases, or high-value moments rather than being the universal default.',
    })
  }

  if (scenario.systemTokens > 1500) {
    guardrails.push({
      id: 'prompt-modularization',
      title: 'Modularize system instructions',
      category: 'prompt',
      impact: 'medium',
      effort: 'medium',
      summary:
        'Large instruction blocks often hide repeated policy text, examples, or formatting rules that can be trimmed or split into cheaper routing steps.',
    })
  }

  if (scenario.toolTokens > 500) {
    guardrails.push({
      id: 'tool-discipline',
      title: 'Track tool-output token growth',
      category: 'architecture',
      impact: 'medium',
      effort: 'high',
      summary:
        'Tool messages tend to grow quietly. Measure how much of the request is model work versus tool chatter before scaling the architecture.',
    })
  }

  const topMove = quickWins[0] ?? structuralMoves[0] ?? guardrails[0]

  return {
    headline: topMove
      ? topMove.title
      : 'No major inefficiency detected yet',
    subhead: topMove
      ? topMove.summary
      : 'The next best move is to compare one cheaper and one stronger model against this same workload.',
    quickWins,
    structuralMoves,
    guardrails,
  } satisfies OptimizationPlan
}
