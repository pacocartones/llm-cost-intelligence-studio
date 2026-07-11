import type { CostBreakdown, ModelRecord, ScenarioInput } from '../types/domain'

export interface Insight {
  tone: 'good' | 'warning' | 'info'
  category?: 'model' | 'output' | 'retrieval' | 'platform' | 'prompt'
  impact?: 'high' | 'medium' | 'low'
  title: string
  body: string
}

export function buildScenarioInsights(
  model: ModelRecord,
  scenario: ScenarioInput,
  cost: CostBreakdown,
): Insight[] {
  const insights: Insight[] = []
  const inputShare =
    cost.totalRecurring > 0
      ? ((cost.recurringInputCost + cost.cachedReadCost) / cost.totalRecurring) * 100
      : 0
  const outputShare =
    cost.totalRecurring > 0 ? (cost.outputCost / cost.totalRecurring) * 100 : 0

  if (outputShare > 55) {
    insights.push({
      tone: 'warning',
      category: 'output',
      impact: 'high',
      title: 'Output is your biggest cost driver',
      body: `Output tokens account for about ${Math.round(outputShare)}% of recurring request cost. Tightening response length often saves more than trimming prompt text.`,
    })
  }

  if (scenario.useCaching && model.capabilities.caching && cost.cachedReadCost > 0) {
    insights.push({
      tone: 'good',
      category: 'platform',
      impact: 'medium',
      title: 'Caching is doing useful work',
      body: `About ${scenario.cachedTokens.toLocaleString()} stable tokens are being treated as cached prefix. Model this carefully across repeat traffic because first-run and recurring economics diverge.`,
    })
  }

  if (!scenario.useBatch) {
    insights.push({
      tone: 'info',
      category: 'platform',
      impact: 'medium',
      title: 'Batch is still an untapped lever',
      body: 'If this workflow is asynchronous, batch processing is often the easiest first discount to model explicitly.',
    })
  }

  if (scenario.retrievedTokens > scenario.userTokens * 2) {
    insights.push({
      tone: 'warning',
      category: 'retrieval',
      impact: 'high',
      title: 'Retrieved context may be bloated',
      body: 'The scenario spends more tokens on retrieved context than on the user request by a wide margin. This is a good candidate for chunk pruning or answer-first retrieval.',
    })
  }

  if (model.tier === 'flagship' && cost.monthlyRecurring > 500) {
    insights.push({
      tone: 'warning',
      category: 'model',
      impact: 'high',
      title: 'Premium model economics may be hard to justify',
      body: 'This scenario scales into a meaningful monthly spend. You should compare at least one balanced model before locking the architecture.',
    })
  }

  if (inputShare > 60 && scenario.systemTokens > 1000) {
    insights.push({
      tone: 'info',
      category: 'prompt',
      impact: 'medium',
      title: 'System instructions are material',
      body: 'Stable instruction blocks are large enough to deserve their own cost strategy: caching, prompt minimization, or split-step routing.',
    })
  }

  if (!insights.length) {
    insights.push({
      tone: 'good',
      category: 'model',
      impact: 'low',
      title: 'This is a healthy baseline scenario',
      body: 'Nothing is obviously broken here. The next useful move is comparing at least one cheaper and one stronger model against the same traffic pattern.',
    })
  }

  return insights
}
