import { useEffect, useMemo, useState } from 'react'
import type { ModelRecord, ModelTier, Provider, ProviderId } from '../types/domain'

interface ModelPickerProps {
  models: ModelRecord[]
  providers: Provider[]
  providerId: ProviderId
  selectedModelId: string
  onProviderChange: (providerId: ProviderId) => void
  onModelChange: (modelId: string) => void
}

const providerOrder: { id: ProviderId; label: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'google', label: 'Google' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'xai', label: 'xAI' },
  { id: 'deepseek', label: 'DeepSeek' },
]

type CapabilityFilter = 'all' | 'reasoning' | 'tools' | 'vision' | 'caching'
type TierFilter = 'all' | ModelTier

const tierFilters: Array<{ id: TierFilter; label: string }> = [
  { id: 'all', label: 'All tiers' },
  { id: 'flagship', label: 'Flagship' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'efficient', label: 'Efficient' },
]

const capabilityFilters: Array<{ id: CapabilityFilter; label: string }> = [
  { id: 'all', label: 'Any capability' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'tools', label: 'Tools' },
  { id: 'vision', label: 'Vision' },
  { id: 'caching', label: 'Caching' },
]

export function ModelPicker({
  models,
  providers,
  providerId,
  selectedModelId,
  onProviderChange,
  onModelChange,
}: ModelPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [capabilityFilter, setCapabilityFilter] = useState<CapabilityFilter>('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const providerModels = useMemo(
    () => models.filter((model) => model.providerId === providerId),
    [models, providerId],
  )
  const provider = providers.find((entry) => entry.id === providerId)
  const selectedModel =
    providerModels.find((model) => model.id === selectedModelId) ?? providerModels[0]
  const filteredProviderModels = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return providerModels.filter((model) => {
      if (verifiedOnly && model.pricingStatus !== 'verified') return false
      if (tierFilter !== 'all' && model.tier !== tierFilter) return false
      if (capabilityFilter !== 'all' && !model.capabilities[capabilityFilter]) return false

      if (!normalizedQuery) return true

      return [
        model.name,
        model.summary,
        model.label,
        model.family,
        ...model.badges,
        ...model.recommendedFor,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [capabilityFilter, providerModels, searchQuery, tierFilter, verifiedOnly])
  const compareModels = useMemo(
    () => providerModels.filter((model) => compareIds.includes(model.id)),
    [compareIds, providerModels],
  )

  useEffect(() => {
    setCompareIds((current) =>
      current.filter((modelId) => providerModels.some((model) => model.id === modelId)),
    )
  }, [providerModels])

  function toggleCompare(modelId: string) {
    setCompareIds((current) => {
      if (current.includes(modelId)) {
        return current.filter((entry) => entry !== modelId)
      }

      if (current.length >= 3) {
        return [...current.slice(1), modelId]
      }

      return [...current, modelId]
    })
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h3>Provider and model selection</h3>
        </div>
        <p className="muted-copy model-picker__summary">
          Pick the provider family first, then choose the model that should anchor this
          workflow before you compare routing or forecast spend.
        </p>
      </div>

      <div className="provider-pills" role="tablist" aria-label="Provider families">
        {providerOrder.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className={provider.id === providerId ? 'active' : ''}
            aria-pressed={provider.id === providerId}
            onClick={() => onProviderChange(provider.id)}
          >
            {provider.label}
          </button>
        ))}
      </div>

      <section className="catalog-toolbar" aria-label="Model catalog filters">
        <label className="catalog-toolbar__search">
          Search models
          <input
            type="search"
            placeholder="Search by name, badge, use case, or family"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <label>
          Tier
          <select
            value={tierFilter}
            onChange={(event) => setTierFilter(event.target.value as TierFilter)}
          >
            {tierFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Capability
          <select
            value={capabilityFilter}
            onChange={(event) =>
              setCapabilityFilter(event.target.value as CapabilityFilter)
            }
          >
            {capabilityFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`toggle-pill ${verifiedOnly ? 'active' : ''}`}
          aria-pressed={verifiedOnly}
          onClick={() => setVerifiedOnly((current) => !current)}
        >
          Verified only
        </button>
      </section>

      {provider ? (
        <div className="provider-summary">
          <div>
            <span className={`status-pill status-${provider.pricingStatus}`}>
              {provider.pricingStatus}
            </span>
            <strong>{provider.name}</strong>
            <p>{provider.summary}</p>
            <div className="provider-summary__chips">
              <span className="soft-badge">{providerModels.length} mapped models</span>
              <span className="soft-badge">Source-linked pricing</span>
            </div>
          </div>
          <div className="provider-summary__meta">
            <span>Last verified</span>
            <strong>{provider.pricingLastVerified}</strong>
            {provider.sourceUrl ? (
              <a href={provider.sourceUrl} target="_blank" rel="noreferrer">
                {provider.sourceLabel ?? 'Source'}
              </a>
            ) : (
              <small>{provider.sourceLabel ?? 'Internal seed data'}</small>
            )}
          </div>
        </div>
      ) : null}

      {selectedModel ? (
        <div className="selected-model-summary">
          <div className="selected-model-summary__copy">
            <p className="eyebrow">Current model in focus</p>
            <h4>{selectedModel.name}</h4>
            <p>{selectedModel.summary}</p>
            <div className="selected-model-summary__chips">
              {selectedModel.recommendedFor.slice(0, 3).map((item) => (
                <span key={item} className="soft-badge">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <dl className="selected-model-summary__stats">
            <div>
              <dt>Tier</dt>
              <dd>{selectedModel.label}</dd>
            </div>
            <div>
              <dt>Context</dt>
              <dd>{selectedModel.contextWindowK}k</dd>
            </div>
            <div>
              <dt>Input / Output</dt>
              <dd>
                ${selectedModel.inputPerMTok} / ${selectedModel.outputPerMTok}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {compareModels.length > 0 ? (
        <section className="compare-tray" aria-label="Pinned model comparison">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quick compare tray</p>
              <h4>Hold up to three candidates side by side</h4>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setCompareIds([])}
            >
              Clear tray
            </button>
          </div>
          <div className="compare-tray__grid">
            {compareModels.map((model) => (
              <article key={model.id} className="compare-tray__card">
                <div className="compare-tray__head">
                  <strong>{model.name}</strong>
                  <span className={`tier-badge tier-${model.tier}`}>{model.label}</span>
                </div>
                <div className="compare-tray__stats">
                  <div>
                    <span>Input</span>
                    <strong>${model.inputPerMTok}/M</strong>
                  </div>
                  <div>
                    <span>Output</span>
                    <strong>${model.outputPerMTok}/M</strong>
                  </div>
                  <div>
                    <span>Context</span>
                    <strong>{model.contextWindowK}k</strong>
                  </div>
                </div>
                <p>{model.summary}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="catalog-results-bar" aria-live="polite">
        <span>{filteredProviderModels.length} models visible</span>
        <small>
          {compareModels.length > 0
            ? `${compareModels.length} pinned for quick comparison`
            : 'Pin up to 3 models to compare them side by side'}
        </small>
      </div>

      <div className="model-grid">
        {filteredProviderModels.map((model) => {
          const isSelected = model.id === selectedModelId
          const isPinned = compareIds.includes(model.id)

          return (
          <article
            key={model.id}
            className={`model-card ${isSelected ? 'selected' : ''}`}
          >
            <div className="model-card__top">
              <div>
                <strong>{model.name}</strong>
                <p>{model.summary}</p>
              </div>
              <span className={`tier-badge tier-${model.tier}`}>{model.label}</span>
            </div>

            <div className="badge-row">
              {model.badges.map((badge) => (
                <span key={badge} className="soft-badge">
                  {badge}
                </span>
              ))}
            </div>

            <dl className="mini-stats">
              <div>
                <dt>Input</dt>
                <dd>${model.inputPerMTok}/M</dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>${model.outputPerMTok}/M</dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>{model.contextWindowK}k</dd>
              </div>
            </dl>
            <p className="model-card__note">
              Best for {model.recommendedFor.slice(0, 2).join(' and ')}.
            </p>
            <div className="model-card__actions">
              <button
                type="button"
                className="ghost-button"
                aria-pressed={isSelected}
                onClick={() => onModelChange(model.id)}
              >
                {isSelected ? 'Selected model' : 'Select model'}
              </button>
              <button
                type="button"
                className={`toggle-pill ${isPinned ? 'active' : ''}`}
                aria-pressed={isPinned}
                onClick={() => toggleCompare(model.id)}
              >
                {isPinned ? 'Pinned' : 'Pin to compare'}
              </button>
            </div>
            <div className="model-card__footer">
              <span className={`status-pill status-${model.pricingStatus}`}>
                {model.pricingStatus}
              </span>
              {model.sourceUrl ? (
                <a href={model.sourceUrl} target="_blank" rel="noreferrer">
                  {model.sourceLabel ?? 'Source'}
                </a>
              ) : (
                <small>{model.sourceLabel ?? 'Internal catalog note'}</small>
              )}
            </div>
          </article>
        )})}
      </div>

      {filteredProviderModels.length === 0 ? (
        <div className="notice info">
          <strong>No models match these filters.</strong> Try clearing the search or
          relaxing the tier and capability filters.
        </div>
      ) : null}
    </section>
  )
}
