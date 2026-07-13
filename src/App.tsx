import { useEffect, useMemo, useRef, useState } from 'react'
import './styles/global.css'
import './App.css'
import { ExecutiveBriefPanel } from './components/ExecutiveBriefPanel'
import { Icons } from './components/Icons'
import { ModelPicker } from './components/ModelPicker'
import { RecentScenarios } from './components/RecentScenarios'
import { SectionNav } from './components/SectionNav'
import { ArtifactViewer } from './components/ArtifactViewer'
import { defaultScenario, models, providers } from './data/catalog'
import { useCaseTemplates } from './data/templates'
import { calculateScenarioCost } from './lib/costing'
import { buildScenarioInsights } from './lib/insights'
import { getCatalogHealthCounts, rankModelsForScenario } from './lib/market'
import { buildOptimizationPlan } from './lib/optimizer'
import { resolveTemplateScenario } from './lib/benchmarks'
import { buildRoutingMixFromCatalog } from './lib/routing'
import { decodeShareData, clearShareFromUrl } from './lib/share'
import { loadWorkspaceSnapshot, persistWorkspaceSnapshot } from './lib/workspace'
import { CompareScreen } from './screens/CompareScreen'
import { ExploreScreen } from './screens/ExploreScreen'
import { ForecastScreen } from './screens/ForecastScreen'
import { OptimizeScreen } from './screens/OptimizeScreen'
import { PlanScreen } from './screens/PlanScreen'
import { PortfolioScreen } from './screens/PortfolioScreen'
import type {
  ProviderId,
  RoutingSlotInput,
  SavedScenario,
  SavedRoutingStack,
  ScenarioInput,
  ShareableArtifact,
  UseCaseTemplate,
  ViewId,
} from './types/domain'

const savedScenariosKey = 'llm-cost-studio-scenarios'
const savedRoutingStacksKey = 'llm-cost-studio-routing-stacks'
const viewSpotlights: Record<
  ViewId,
  {
    label: string
    kicker: string
    description: string
    nextLabel: string
    nextView: ViewId
  }
> = {
  plan: {
    label: 'Plan',
    kicker: 'Shape the workload',
    description:
      'Model a realistic scenario first so every later routing, savings, and finance decision has a trustworthy baseline.',
    nextLabel: 'Compare model options',
    nextView: 'compare',
  },
  compare: {
    label: 'Compare',
    kicker: 'Choose your default path',
    description:
      'Decide whether one model should stay in the main request path or whether a routing mix is the smarter default.',
    nextLabel: 'Stress-test growth',
    nextView: 'forecast',
  },
  optimize: {
    label: 'Optimize',
    kicker: 'Sequence the savings work',
    description:
      'Turn the estimate into an action queue so the team knows which cheap wins to ship before bigger architecture moves.',
    nextLabel: 'Stress-test budget impact',
    nextView: 'forecast',
  },
  explore: {
    label: 'Explore',
    kicker: 'Start from proven patterns',
    description:
      'Use pre-built product patterns and benchmark packs instead of inventing scenarios from scratch every time.',
    nextLabel: 'Load a planning template',
    nextView: 'plan',
  },
  forecast: {
    label: 'Forecast',
    kicker: 'Test budget and scale',
    description:
      'Project when the current plan breaks budget and whether growth, outputs, or model choice will hurt you first.',
    nextLabel: 'Review portfolio exposure',
    nextView: 'portfolio',
  },
  portfolio: {
    label: 'Portfolio',
    kicker: 'Allocate capital across bets',
    description:
      'See which workloads deserve budget, which ones dominate spend, and where concentration risk is starting to form.',
    nextLabel: 'Return to scenario planning',
    nextView: 'plan',
  },
}

const heroContentByView: Record<
  ViewId,
  {
    eyebrow: string
    title: string
    body: string
    primaryLabel: string
    primaryView: ViewId
    secondaryLabel: string
    secondaryView: ViewId
  }
> = {
  plan: {
    eyebrow: 'Verified pricing intelligence',
    title: 'Model realistic AI workloads before you pick the model.',
    body:
      'Start with the shape of the product, not a vague token guess. Then move into compare, routing, optimization, and budget stress-testing.',
    primaryLabel: 'Start scenario planning',
    primaryView: 'plan',
    secondaryLabel: 'Explore product patterns',
    secondaryView: 'explore',
  },
  compare: {
    eyebrow: 'Default-model decision',
    title: 'Compare candidates and design the traffic path you actually want to ship.',
    body:
      'This is where the product stops being a calculator and becomes a model policy tool for defaults, fallbacks, and premium moments.',
    primaryLabel: 'Review routing options',
    primaryView: 'compare',
    secondaryLabel: 'Forecast scale impact',
    secondaryView: 'forecast',
  },
  optimize: {
    eyebrow: 'Savings workbench',
    title: 'Turn cost signals into a prioritized optimization sprint.',
    body:
      'Use this area to decide what to fix first: prompt length, retrieval discipline, caching, routing, or model tier selection.',
    primaryLabel: 'Open action board',
    primaryView: 'optimize',
    secondaryLabel: 'Compare alternatives',
    secondaryView: 'compare',
  },
  explore: {
    eyebrow: 'Pattern library',
    title: 'Browse proven AI product patterns instead of starting from a blank sheet.',
    body:
      'Templates and benchmark packs help teams reason from concrete product shapes like support, coding, research, tutoring, and sales.',
    primaryLabel: 'Browse templates',
    primaryView: 'explore',
    secondaryLabel: 'Load into planning',
    secondaryView: 'plan',
  },
  forecast: {
    eyebrow: 'Finance and growth',
    title: 'See how fast the current product plan pushes into budget pressure.',
    body:
      'Forecast connects request economics to monthly burn, annual exposure, and the moment where growth breaks the current operating model.',
    primaryLabel: 'Stress-test growth',
    primaryView: 'forecast',
    secondaryLabel: 'Review portfolio',
    secondaryView: 'portfolio',
  },
  portfolio: {
    eyebrow: 'Allocation board',
    title: 'Decide which products deserve budget and which ones dominate the burn.',
    body:
      'Portfolio mode makes the product useful for leadership reviews, capital allocation, and comparing multiple workloads at once.',
    primaryLabel: 'Review portfolio',
    primaryView: 'portfolio',
    secondaryLabel: 'Return to planning',
    secondaryView: 'plan',
  },
}

const workspaceParts: Array<{
  id: string
  label: string
  description: string
  views: ViewId[]
}> = [
  {
    id: 'foundation',
    label: 'Foundation',
    description: 'Define the workload and load realistic product patterns.',
    views: ['plan', 'explore'],
  },
  {
    id: 'decision',
    label: 'Decision',
    description: 'Choose defaults, route traffic, and sequence optimizations.',
    views: ['compare', 'optimize'],
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Stress-test budgets and compare multiple bets side by side.',
    views: ['forecast', 'portfolio'],
  },
]

const guidedWorkflow = [
  {
    id: 'foundation',
    title: 'Frame the workload',
    description: 'Start from a product pattern and make the scenario realistic.',
    views: ['explore', 'plan'] as ViewId[],
    primaryView: 'plan' as ViewId,
  },
  {
    id: 'decision',
    title: 'Pick the operating default',
    description: 'Compare candidates, pin tradeoffs, and choose the production path.',
    views: ['compare', 'optimize'] as ViewId[],
    primaryView: 'compare' as ViewId,
  },
  {
    id: 'finance',
    title: 'Validate the budget',
    description: 'Stress growth, portfolio exposure, and executive tradeoffs.',
    views: ['forecast', 'portfolio'] as ViewId[],
    primaryView: 'forecast' as ViewId,
  },
]

function loadSavedScenarios() {
  const raw = window.localStorage.getItem(savedScenariosKey)
  if (!raw) return [] as SavedScenario[]

  try {
    return JSON.parse(raw) as SavedScenario[]
  } catch {
    return [] as SavedScenario[]
  }
}

function loadSavedRoutingStacks() {
  const raw = window.localStorage.getItem(savedRoutingStacksKey)
  if (!raw) return [] as SavedRoutingStack[]

  try {
    return JSON.parse(raw) as SavedRoutingStack[]
  } catch {
    return [] as SavedRoutingStack[]
  }
}

function App() {
  const workspaceAnchorRef = useRef<HTMLElement | null>(null)
  const hasMountedRef = useRef(false)
  const workspaceSeedRef = useRef(loadWorkspaceSnapshot())
  const [activeView, setActiveView] = useState<ViewId>(
    () => workspaceSeedRef.current?.activeView ?? 'plan',
  )
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(
    () => workspaceSeedRef.current?.selectedProviderId ?? 'anthropic',
  )
  const [selectedModelId, setSelectedModelId] = useState(
    () => workspaceSeedRef.current?.selectedModelId ?? 'claude-sonnet-5',
  )
  const [scenario, setScenario] = useState<ScenarioInput>(
    () => workspaceSeedRef.current?.scenario ?? defaultScenario,
  )
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() =>
    loadSavedScenarios(),
  )
  const [savedRoutingStacks, setSavedRoutingStacks] = useState<SavedRoutingStack[]>(() =>
    loadSavedRoutingStacks(),
  )
  const [routingPreset, setRoutingPreset] = useState<SavedRoutingStack | null>(null)
  const [shareData, setShareData] = useState<ShareableArtifact | null>(() => decodeShareData())

  // Portfolio state (shared with PortfolioScreen)
  const [teamMultiplier, _setTeamMultiplier] = useState(2)
  const [selectedTemplateIds, _setSelectedTemplateIds] = useState<string[]>(
    useCaseTemplates.slice(0, 3).map((template) => template.id),
  )
  const [selectedStackIds, _setSelectedStackIds] = useState<string[]>(
    savedRoutingStacks.slice(0, 2).map((stack) => stack.id),
  )

  useEffect(() => {
    if (shareData) {
      setActiveView('plan')
    }
  }, [shareData])

  function clearShare() {
    setShareData(null)
    clearShareFromUrl()
  }

  useEffect(() => {
    const nextModel = models.find((model) => model.id === selectedModelId)
    if (!nextModel || nextModel.providerId !== selectedProviderId) {
      const providerDefault = models.find(
        (model) => model.providerId === selectedProviderId,
      )
      if (providerDefault) {
        setSelectedModelId(providerDefault.id)
      }
    }
  }, [selectedModelId, selectedProviderId])

  useEffect(() => {
    window.localStorage.setItem(savedScenariosKey, JSON.stringify(savedScenarios))
  }, [savedScenarios])

  useEffect(() => {
    window.localStorage.setItem(
      savedRoutingStacksKey,
      JSON.stringify(savedRoutingStacks),
    )
  }, [savedRoutingStacks])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    workspaceAnchorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [activeView])

  useEffect(() => {
    if (shareData) return

    persistWorkspaceSnapshot({
      version: 1,
      activeView,
      selectedProviderId,
      selectedModelId,
      scenario,
    })
  }, [activeView, scenario, selectedModelId, selectedProviderId, shareData])

  const selectedModel =
    models.find((model) => model.id === selectedModelId) ?? models[0]
  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ?? providers[0]
  const currentCost = calculateScenarioCost(selectedModel, scenario)
  const insights = buildScenarioInsights(selectedModel, scenario, currentCost)
  const optimizationPlan = buildOptimizationPlan(
    selectedModel,
    scenario,
    currentCost,
    models,
  )
  const rankedModels = rankModelsForScenario(models, scenario, selectedModelId)
  const alternativeModel = rankedModels.find(
    (entry) => entry.model.id !== selectedModelId && entry.recurring < currentCost.totalRecurring,
  )
  const catalogHealth = getCatalogHealthCounts(models, providers)
  const costPerUser =
    scenario.activeUsers > 0 ? currentCost.monthlyRecurring / scenario.activeUsers : 0
  const costPer1kRequests = currentCost.totalRecurring * 1000
  const verifiedCoverage =
    catalogHealth.modelCount > 0
      ? Math.round((catalogHealth.verifiedModels / catalogHealth.modelCount) * 100)
      : 0
  const cheapestScenarioModel = rankedModels[0]
  const allPortfolioItems: Array<{ id: string; label: string; monthly: number; annual: number; type: 'template' | 'stack' }> = useMemo(
    () => {
      const templateItems = useCaseTemplates
        .filter((template) => selectedTemplateIds.includes(template.id))
        .map((template) => {
          const model =
            models.find((entry) => entry.id === template.suggestedModelIds[0]) ??
            models[0]
          const scenario = resolveTemplateScenario(template)
          const sc = calculateScenarioCost(model, scenario)

          return {
            id: template.id,
            label: template.name,
            monthly: sc.monthlyRecurring * teamMultiplier,
            annual: sc.monthlyRecurring * 12 * teamMultiplier,
            type: 'template' as const,
          }
        })
      const stackItems = savedRoutingStacks
        .filter((stack) => selectedStackIds.includes(stack.id))
        .map((stack) => {
          const cost = buildRoutingMixFromCatalog(models, stack.scenario, stack.slots)
          return {
            id: stack.id,
            label: stack.name,
            monthly: cost.blendedMonthly * teamMultiplier,
            annual: cost.blendedMonthly * 12 * teamMultiplier,
            type: 'stack' as const,
          }
        })
      return [...templateItems, ...stackItems]
    },
    [
      savedRoutingStacks,
      selectedTemplateIds,
      selectedStackIds,
      teamMultiplier,
    ],
  )
  const totalRequestTokens = currentCost.inputTokens + scenario.outputTokens
  const outputShare =
    totalRequestTokens > 0 ? scenario.outputTokens / totalRequestTokens : 0
  const cacheCoverage =
    currentCost.inputTokens > 0
      ? Math.min(1, scenario.cachedTokens / currentCost.inputTokens)
      : 0
  const scenarioRiskScore = Math.min(
    99,
    Math.round(
      outputShare * 38 +
        (scenario.requestsPerDay >= 5000 ? 18 : scenario.requestsPerDay >= 1500 ? 10 : 4) +
        (scenario.retrievedTokens > scenario.userTokens ? 14 : 6) +
        (scenario.useCaching ? -8 : scenario.cachedTokens > 0 ? 12 : 4) +
        (alternativeModel ? 10 : 0),
    ),
  )
  const scenarioRiskLabel =
    scenarioRiskScore >= 60
      ? 'Volatile spend profile'
      : scenarioRiskScore >= 35
        ? 'Watch growth drivers'
        : 'Healthy baseline'
  const monthlySavingsOpportunity = alternativeModel
    ? Math.max(0, currentCost.monthlyRecurring - alternativeModel.recurring * scenario.requestsPerDay * scenario.daysPerMonth)
    : 0
  const activeViewSpotlight = viewSpotlights[activeView]
  const activeHeroContent = heroContentByView[activeView]
  const activeWorkspacePart =
    workspaceParts.find((part) => part.views.includes(activeView)) ?? workspaceParts[0]
  const activeJourneyIndex = guidedWorkflow.findIndex((step) =>
    step.views.includes(activeView),
  )
  const nextJourneyStep =
    guidedWorkflow[Math.min(activeJourneyIndex + 1, guidedWorkflow.length - 1)]
  const showHomeScaffold = activeView === 'plan' && !shareData
  const showModelPicker =
    !shareData &&
    ['plan', 'compare', 'optimize', 'forecast'].includes(activeView)
  const commandCenterCards = [
    {
      label: 'Default model now',
      value: selectedModel.name,
      detail: `${selectedProvider.name} · $${currentCost.monthlyRecurring.toFixed(0)}/mo modeled`,
    },
    {
      label: 'Cheapest fit',
      value: cheapestScenarioModel.model.name,
      detail: `$${cheapestScenarioModel.monthly.toFixed(0)}/mo floor for this workload`,
    },
    {
      label: 'Savings unlocked',
      value: alternativeModel ? `$${monthlySavingsOpportunity.toFixed(0)}/mo` : 'No obvious switch',
      detail: alternativeModel
        ? `${alternativeModel.model.name} is currently cheaper than your selected model`
        : 'The current model is already close to the scenario floor',
    },
    {
      label: 'Scenario pressure',
      value: `${scenarioRiskScore}/99`,
      detail: `${scenarioRiskLabel} · ${Math.round(cacheCoverage * 100)}% cacheable input`,
    },
  ]

  const repoUrl = 'https://github.com/pacocartones/llm-cost-intelligence-studio'
  const liveDemoUrl = 'https://pacocartones.github.io/llm-cost-intelligence-studio/'
  const executiveSummary = alternativeModel
    ? `${alternativeModel.model.name} is currently the fastest savings move for this workload without changing the product shape first.`
    : `${selectedModel.name} is already close to the cost floor, so the next win is more architectural than vendor-driven.`
  const executiveRecommendation = alternativeModel
    ? `Shift the default lane toward ${alternativeModel.model.name} or make it the cheaper tier inside a routing mix.`
    : `Keep ${selectedModel.name} as the anchor, but tighten output policy, caching discipline, and retrieval overhead before changing vendors.`
  const executiveRisk = `${scenarioRiskLabel}. ${Math.round(outputShare * 100)}% of request tokens are output, and the current run-rate models at $${currentCost.monthlyRecurring.toFixed(0)}/month.`
  const executiveNextStep = `${nextJourneyStep.title} in ${viewSpotlights[nextJourneyStep.primaryView].label}.`
  const executiveMetrics = [
    {
      label: 'Current default',
      value: selectedModel.name,
      detail: `${selectedProvider.name} · ${selectedModel.label}`,
    },
    {
      label: 'Monthly run-rate',
      value: `$${currentCost.monthlyRecurring.toFixed(0)}`,
      detail: `${scenario.requestsPerDay.toLocaleString()} requests/day modeled`,
    },
    {
      label: 'Cheapest viable floor',
      value: `$${cheapestScenarioModel.monthly.toFixed(0)}`,
      detail: cheapestScenarioModel.model.name,
    },
    {
      label: 'Savings headroom',
      value: alternativeModel ? `$${monthlySavingsOpportunity.toFixed(0)}/mo` : 'Architectural',
      detail: alternativeModel
        ? `Compared with ${selectedModel.name}`
        : 'No obvious cheaper one-model switch',
    },
  ]

  const planShareArtifact: ShareableArtifact = {
    version: 1,
    scenario: {
      name: scenario.name,
      systemTokens: scenario.systemTokens,
      userTokens: scenario.userTokens,
      retrievedTokens: scenario.retrievedTokens,
      toolTokens: scenario.toolTokens,
      cachedTokens: scenario.cachedTokens,
      outputTokens: scenario.outputTokens,
      requestsPerDay: scenario.requestsPerDay,
      daysPerMonth: scenario.daysPerMonth,
      activeUsers: scenario.activeUsers,
      useBatch: scenario.useBatch,
      useCaching: scenario.useCaching,
    },
    routingSlots: routingPreset?.slots ?? [],
    portfolioItems: [],
    createdAt: new Date().toISOString(),
  }

  const compareShareArtifact: ShareableArtifact = {
    version: 1,
    scenario: {
      name: scenario.name,
      systemTokens: scenario.systemTokens,
      userTokens: scenario.userTokens,
      retrievedTokens: scenario.retrievedTokens,
      toolTokens: scenario.toolTokens,
      cachedTokens: scenario.cachedTokens,
      outputTokens: scenario.outputTokens,
      requestsPerDay: scenario.requestsPerDay,
      daysPerMonth: scenario.daysPerMonth,
      activeUsers: scenario.activeUsers,
      useBatch: scenario.useBatch,
      useCaching: scenario.useCaching,
    },
    routingSlots: routingPreset?.slots ?? [],
    portfolioItems: [],
    createdAt: new Date().toISOString(),
  }

  const portfolioShareArtifact: ShareableArtifact = {
    version: 1,
    scenario: {
      name: scenario.name,
      systemTokens: scenario.systemTokens,
      userTokens: scenario.userTokens,
      retrievedTokens: scenario.retrievedTokens,
      toolTokens: scenario.toolTokens,
      cachedTokens: scenario.cachedTokens,
      outputTokens: scenario.outputTokens,
      requestsPerDay: scenario.requestsPerDay,
      daysPerMonth: scenario.daysPerMonth,
      activeUsers: scenario.activeUsers,
      useBatch: scenario.useBatch,
      useCaching: scenario.useCaching,
    },
    routingSlots: routingPreset?.slots ?? [],
    portfolioItems: allPortfolioItems.map((item) => ({
      id: item.id,
      label: item.label,
      monthly: item.monthly,
      annual: item.annual,
      type: item.type,
    })),
    createdAt: new Date().toISOString(),
  }

  function updateScenario(patch: Partial<ScenarioInput>) {
    setRoutingPreset(null)
    setScenario((current) => ({
      ...current,
      ...patch,
    }))
  }

  function applyTemplate(template: UseCaseTemplate) {
    setRoutingPreset(null)
    setScenario((current) => ({
      ...current,
      ...template.scenarioSeed,
      name: template.scenarioSeed.name ?? template.name,
    }))

    const suggestedModel = template.suggestedModelIds
      .map((modelId) => models.find((model) => model.id === modelId))
      .find(Boolean)

    if (suggestedModel) {
      setSelectedProviderId(suggestedModel.providerId)
      setSelectedModelId(suggestedModel.id)
    }

    setActiveView('plan')
  }

  function saveScenario() {
    const savedScenario: SavedScenario = {
      id: `${Date.now()}`,
      modelId: selectedModel.id,
      providerId: selectedProvider.id,
      createdAt: new Date().toISOString(),
      scenario,
    }

    setSavedScenarios((current) => [savedScenario, ...current].slice(0, 8))
  }

  function loadScenario(savedScenario: SavedScenario) {
    setRoutingPreset(null)
    setSelectedProviderId(savedScenario.providerId)
    setSelectedModelId(savedScenario.modelId)
    setScenario(savedScenario.scenario)
    setActiveView('plan')
  }

  function saveRoutingStack(draft: { name: string; slots: RoutingSlotInput[] }) {
    const stack: SavedRoutingStack = {
      id: `${Date.now()}`,
      name: draft.name,
      scenarioName: scenario.name,
      baselineModelId: selectedModel.id,
      baselineProviderId: selectedProvider.id,
      createdAt: new Date().toISOString(),
      scenario,
      slots: draft.slots,
    }

    setSavedRoutingStacks((current) => [stack, ...current].slice(0, 12))
    setRoutingPreset(stack)
  }

  function loadRoutingStack(stack: SavedRoutingStack) {
    setSelectedProviderId(stack.baselineProviderId)
    setSelectedModelId(stack.baselineModelId)
    setScenario(stack.scenario)
    setRoutingPreset(stack)
    setActiveView('compare')
  }

  function renderActiveScreen() {
    if (shareData) {
      return <ArtifactViewer data={shareData} onBack={clearShare} />
    }

    if (activeView === 'plan') {
      return (
        <>
          <PlanScreen
            provider={selectedProvider}
            model={selectedModel}
            scenario={scenario}
            cost={currentCost}
            insights={insights}
            costPer1kRequests={costPer1kRequests}
            costPerUser={costPerUser}
            alternativeModel={
              alternativeModel
                ? {
                    name: alternativeModel.model.name,
                    recurring: alternativeModel.recurring,
                    delta: alternativeModel.deltaFromSelected,
                  }
                : null
            }
            templates={useCaseTemplates}
            onScenarioChange={updateScenario}
            onSaveScenario={saveScenario}
            onApplyTemplate={applyTemplate}
            shareArtifact={planShareArtifact}
          />
          <RecentScenarios scenarios={savedScenarios} onLoad={loadScenario} />
        </>
      )
    }

    if (activeView === 'compare') {
      return (
        <CompareScreen
          models={models}
          scenario={scenario}
          selectedModelId={selectedModelId}
          selectedProviderId={selectedProviderId}
          savedRoutingStacks={savedRoutingStacks}
          routingPreset={routingPreset}
          onSaveRoutingStack={saveRoutingStack}
          onLoadRoutingStack={loadRoutingStack}
          shareArtifact={compareShareArtifact}
        />
      )
    }

    if (activeView === 'optimize') {
      return (
        <OptimizeScreen
          model={selectedModel}
          scenario={scenario}
          insights={insights}
          optimizationPlan={optimizationPlan}
        />
      )
    }

    if (activeView === 'explore') {
      return (
        <ExploreScreen
          templates={useCaseTemplates}
          models={models}
          onApplyTemplate={applyTemplate}
        />
      )
    }

    if (activeView === 'forecast') {
      return <ForecastScreen scenario={scenario} cost={currentCost} />
    }

    return (
      <PortfolioScreen
        templates={useCaseTemplates}
        models={models}
        savedRoutingStacks={savedRoutingStacks}
        onApplyTemplate={applyTemplate}
        onLoadRoutingStack={loadRoutingStack}
        shareArtifact={portfolioShareArtifact}
      />
    )
  }

  return (
    <div className={`site-shell site-shell--${activeView}`}>
      <header className="site-header">
        <div className="site-header__inner">
          <button
            type="button"
            className="site-brand"
            onClick={() => setActiveView('plan')}
          >
            <span className="site-brand__mark">LCI</span>
            <span className="site-brand__copy">
              <strong>LLM Cost Intelligence Studio</strong>
              <small>Multi-provider AI economics workspace</small>
            </span>
          </button>

          <div className="site-header__status" aria-live="polite">
            <span className="text-label">Current workspace</span>
            <strong>{activeViewSpotlight.label}</strong>
            <small>{activeViewSpotlight.kicker}</small>
          </div>

          <div className="site-header__actions">
            <a className="ghost-button" href={repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </header>

      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-main">
            <p className="eyebrow">{activeHeroContent.eyebrow}</p>
            <h1 className="gradient-text">{activeHeroContent.title}</h1>
            <p className="hero-copy">
              {activeHeroContent.body}
            </p>
            <div className="hero-pill-row">
              <span className="hero-pill">
                {catalogHealth.verifiedProviders}/{providers.length} providers verified
              </span>
              <span className="hero-pill">{catalogHealth.verifiedModels} verified models</span>
              <span className="hero-pill">{catalogHealth.sourceLinkedModels} source-linked cards</span>
            </div>
            <div className="hero-action-row">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setActiveView(activeHeroContent.primaryView)}
              >
                {activeHeroContent.primaryLabel}
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => setActiveView(activeHeroContent.secondaryView)}
              >
                {activeHeroContent.secondaryLabel}
              </button>
            </div>
          </div>
          <div className="topbar-card">
            <span>Current planning stack</span>
            <strong className="gradient-text">{selectedModel.name}</strong>
            <small>{selectedProvider.name}</small>
            <div className="topbar-card__metrics">
              <div>
                <span>Recurring per request</span>
                <strong>${currentCost.totalRecurring.toFixed(4)}</strong>
              </div>
              <div>
                <span>Pricing status</span>
                <strong>{selectedProvider.pricingStatus}</strong>
              </div>
              <div>
                <span>Last verified</span>
                <strong>{selectedProvider.pricingLastVerified}</strong>
              </div>
            </div>
          </div>
        </header>

        {!shareData ? (
          <section className="guided-workflow" aria-label="Guided workflow">
            <div className="guided-workflow__header">
              <div>
                <p className="eyebrow">Start here</p>
                <h2>Run the workspace in three deliberate passes</h2>
              </div>
              <p className="guided-workflow__copy">
                This makes the product easier to read: define the workload, decide the
                operating model, then validate the budget and executive implications.
              </p>
            </div>
            <div className="guided-workflow__grid">
              {guidedWorkflow.map((step, index) => {
                const isActive = step.views.includes(activeView)
                const isComplete = activeJourneyIndex > index
                const stateLabel = isActive
                  ? 'Current'
                  : isComplete
                    ? 'Completed'
                    : 'Upcoming'

                return (
                  <article
                    key={step.id}
                    className={`guided-step ${isActive ? 'active' : ''} ${
                      isComplete ? 'complete' : ''
                    }`}
                  >
                    <div className="guided-step__header">
                      <span>{`0${index + 1}`}</span>
                      <strong>{stateLabel}</strong>
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <button
                      type="button"
                      className="ghost-button"
                      aria-pressed={isActive}
                      onClick={() => setActiveView(step.primaryView)}
                    >
                      {isActive ? 'You are here' : `Open ${viewSpotlights[step.primaryView].label}`}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {showHomeScaffold ? (
          <>
            <section className="overview-band">
              <article className="overview-card">
                <span>Catalog coverage</span>
                <strong>{catalogHealth.modelCount}</strong>
                <small>{providers.length} providers mapped into the workspace</small>
              </article>
              <article className="overview-card">
                <span>Verified coverage</span>
                <strong>{verifiedCoverage}%</strong>
                <small>
                  {catalogHealth.verifiedModels} verified, {catalogHealth.mixedModels} mixed,
                  {catalogHealth.seedModels} seed
                </small>
              </article>
              <article className="overview-card">
                <span>Current monthly run-rate</span>
                <strong>${currentCost.monthlyRecurring.toFixed(0)}</strong>
                <small>{scenario.requestsPerDay.toLocaleString()} daily requests modeled</small>
              </article>
              <article className="overview-card">
                <span>Scenario floor</span>
                <strong>${cheapestScenarioModel.monthly.toFixed(0)}</strong>
                <small>
                  {cheapestScenarioModel.model.name} is the cheapest fit for this workload
                </small>
              </article>
            </section>

            <section className="trust-band">
              <article className="trust-card">
                <span className="eyebrow">Catalog pulse</span>
                <h3>Built to answer “which model should we ship?” not just “what does one prompt cost?”</h3>
                <p>
                  Every provider card is linked to a primary pricing source, so the product can
                  evolve into a serious planning surface for routing, budgeting, and AI portfolio
                  decisions.
                </p>
              </article>
              <article className="trust-card compact-stat">
                <span>Cost per active user</span>
                <strong>${costPerUser.toFixed(2)}</strong>
                <small>{scenario.activeUsers.toLocaleString()} active users assumed</small>
              </article>
              <article className="trust-card compact-stat">
                <span>Cost per 1k requests</span>
                <strong>${costPer1kRequests.toFixed(2)}</strong>
                <small>Useful for pricing your own product tiers and margins</small>
              </article>
            </section>

            <section className="command-center">
              <div className="command-center__header">
                <div>
                  <p className="eyebrow">Decision cockpit</p>
                  <h2>Read the decision before you dive into the controls</h2>
                </div>
                <p className="command-center__copy">
                  This layer turns the workspace into a quick executive readout:
                  what to ship now, what costs most, and where the next savings are.
                </p>
              </div>
              <div className="command-center__grid">
                {commandCenterCards.map((card) => (
                  <article key={card.label} className="command-card">
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{card.detail}</p>
                  </article>
                ))}
              </div>
              <div className="command-center__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setActiveView('plan')}
                >
                  Tune scenario inputs
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setActiveView('compare')}
                >
                  Review routing options
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setActiveView('forecast')}
                >
                  Stress-test growth
                </button>
              </div>
            </section>

            <ExecutiveBriefPanel
              eyebrow="Executive brief"
              title="Decision memo for product, finance, and leadership"
              summary={executiveSummary}
              recommendation={executiveRecommendation}
              risk={executiveRisk}
              nextStep={executiveNextStep}
              metrics={executiveMetrics}
              onPrimaryAction={() => setActiveView(nextJourneyStep.primaryView)}
              primaryActionLabel={`Open ${viewSpotlights[nextJourneyStep.primaryView].label}`}
            />
          </>
        ) : null}

        {!shareData ? (
          <section className="workspace-parts" aria-label="Workspace parts">
            {workspaceParts.map((part) => {
              const isActivePart = part.id === activeWorkspacePart.id
              return (
                <article
                  key={part.id}
                  className={`workspace-part-card workspace-part-card--${part.id} ${
                    isActivePart ? 'active' : ''
                  }`}
                >
                  <div className="workspace-part-card__header">
                    <span>{part.label}</span>
                    <strong>{part.views.length} views</strong>
                  </div>
                  <p>{part.description}</p>
                  <div className="workspace-part-card__actions">
                    {part.views.map((view) => (
                      <button
                        key={view}
                        type="button"
                        className={view === activeView ? 'active' : ''}
                        aria-pressed={view === activeView}
                        onClick={() => setActiveView(view)}
                      >
                        {viewSpotlights[view].label}
                      </button>
                    ))}
                  </div>
                </article>
              )
            })}
          </section>
        ) : null}

        <section ref={workspaceAnchorRef} className="workspace-anchor">
          <SectionNav activeView={activeView} onChange={setActiveView} />

          {!shareData ? (
            <section className="view-spotlight">
              <div className="view-spotlight__copy">
                <p className="eyebrow">{activeViewSpotlight.label}</p>
                <h2>{activeViewSpotlight.kicker}</h2>
                <p>{activeViewSpotlight.description}</p>
              </div>
              <div className="view-spotlight__meta">
                <div>
                  <span>Current model</span>
                  <strong>{selectedModel.name}</strong>
                </div>
                <div>
                  <span>Current provider</span>
                  <strong>{selectedProvider.name}</strong>
                </div>
                <div>
                  <span>Next useful move</span>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setActiveView(activeViewSpotlight.nextView)}
                  >
                    {activeViewSpotlight.nextLabel}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {showModelPicker ? (
            <ModelPicker
              models={models}
              providers={providers}
              providerId={selectedProviderId}
              selectedModelId={selectedModelId}
              onProviderChange={setSelectedProviderId}
              onModelChange={setSelectedModelId}
            />
          ) : null}
        </section>

        <main className="content-stack">
          <section className={`screen-stage screen-stage--${activeView}`}>
            <div className="screen-stage__header">
              <div>
                <span>{activeWorkspacePart.label}</span>
                <strong>{activeViewSpotlight.label}</strong>
              </div>
              <p>{activeViewSpotlight.description}</p>
            </div>
            <div className="screen-stage__body">{renderActiveScreen()}</div>
          </section>
        </main>
      </div>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__copy">
            <strong>LLM Cost Intelligence Studio</strong>
            <p>
              Product planning for AI economics: estimate, compare, route, optimize, and
              forecast across multiple model providers.
            </p>
            <div className="site-footer__socials">
              <a href={repoUrl} target="_blank" rel="noreferrer" title="GitHub">
                {Icons.external}
                <span>GitHub</span>
              </a>
              <a href={liveDemoUrl} target="_blank" rel="noreferrer" title="Live demo">
                {Icons.zap}
                <span>Demo</span>
              </a>
            </div>
          </div>
          <div className="site-footer__links">
            <strong className="text-label">Product</strong>
            <a href={liveDemoUrl} target="_blank" rel="noreferrer">
              Live demo
            </a>
            <a href={repoUrl} target="_blank" rel="noreferrer">
              GitHub repo
            </a>
            <span>Source-linked provider catalog in app</span>
          </div>
          <div className="site-footer__meta">
            <strong className="text-label">Stats</strong>
            <span>{catalogHealth.verifiedProviders} verified providers</span>
            <span>{catalogHealth.verifiedModels} verified models</span>
            <span>Token economics first, infra costs next</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
