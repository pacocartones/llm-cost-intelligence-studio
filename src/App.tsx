import { useEffect, useMemo, useState } from 'react'
import './styles/global.css'
import './App.css'
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
const headerSections: { id: ViewId; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'compare', label: 'Compare' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'explore', label: 'Explore' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'portfolio', label: 'Portfolio' },
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
  const [activeView, setActiveView] = useState<ViewId>('plan')
  const [selectedProviderId, setSelectedProviderId] =
    useState<ProviderId>('anthropic')
  const [selectedModelId, setSelectedModelId] = useState('claude-sonnet-5')
  const [scenario, setScenario] = useState<ScenarioInput>(defaultScenario)
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
      models,
      savedRoutingStacks,
      selectedTemplateIds,
      selectedStackIds,
      teamMultiplier,
    ],
  )

  const repoUrl = 'https://github.com/pacocartones/LLM-Cost-Intelligence-Studio'
  const liveDemoUrl = 'https://pacocartones.github.io/LLM-Cost-Intelligence-Studio/'

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

  return (
    <div className="site-shell">
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

          <nav className="site-header__nav" aria-label="Site">
            {headerSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={section.id === activeView ? 'active' : ''}
                onClick={() => setActiveView(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="site-header__actions">
            <a className="text-link" href={selectedProvider.sourceUrl} target="_blank" rel="noreferrer">
              Pricing source
            </a>
            <a className="ghost-button" href={repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </header>

      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-main">
            <p className="eyebrow">Verified pricing intelligence</p>
            <h1 className="gradient-text">LLM Cost Intelligence Studio</h1>
            <p className="hero-copy">
              A multi-provider workspace for planning AI economics across Anthropic,
              OpenAI, Gemini, Mistral, xAI, and DeepSeek with source-linked pricing,
              comparison, optimization, benchmark exploration, and forecast workflows.
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
                onClick={() => setActiveView('compare')}
              >
                Build routing mix
              </button>
              <a className="text-link" href={liveDemoUrl} target="_blank" rel="noreferrer">
                Public demo
              </a>
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

        <SectionNav activeView={activeView} onChange={setActiveView} />

        <ModelPicker
          models={models}
          providers={providers}
          providerId={selectedProviderId}
          selectedModelId={selectedModelId}
          onProviderChange={setSelectedProviderId}
          onModelChange={setSelectedModelId}
        />

        <main className="content-stack">
          {shareData ? (
            <ArtifactViewer data={shareData} onBack={clearShare} />
          ) : null}

          {activeView === 'plan' ? (
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
          ) : null}

          {activeView === 'compare' ? (
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
          ) : null}

          {activeView === 'optimize' ? (
            <OptimizeScreen
              model={selectedModel}
              scenario={scenario}
              insights={insights}
              optimizationPlan={optimizationPlan}
            />
          ) : null}

          {activeView === 'explore' ? (
            <ExploreScreen
              templates={useCaseTemplates}
              models={models}
              onApplyTemplate={applyTemplate}
            />
          ) : null}

          {activeView === 'forecast' ? (
            <ForecastScreen scenario={scenario} cost={currentCost} />
          ) : null}

          {activeView === 'portfolio' ? (
            <PortfolioScreen
              templates={useCaseTemplates}
              models={models}
              savedRoutingStacks={savedRoutingStacks}
              onApplyTemplate={applyTemplate}
              onLoadRoutingStack={loadRoutingStack}
              shareArtifact={portfolioShareArtifact}
            />
          ) : null}
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
            <a href={selectedProvider.sourceUrl} target="_blank" rel="noreferrer">
              Current pricing source
            </a>
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
