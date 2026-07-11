import type { ModelRecord, Provider, ProviderId } from '../types/domain'

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

export function ModelPicker({
  models,
  providers,
  providerId,
  selectedModelId,
  onProviderChange,
  onModelChange,
}: ModelPickerProps) {
  const providerModels = models.filter((model) => model.providerId === providerId)
  const provider = providers.find((entry) => entry.id === providerId)

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h3>Provider and model selection</h3>
        </div>
      </div>

      <div className="provider-pills">
        {providerOrder.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className={provider.id === providerId ? 'active' : ''}
            onClick={() => onProviderChange(provider.id)}
          >
            {provider.label}
          </button>
        ))}
      </div>

      {provider ? (
        <div className="provider-summary">
          <div>
            <span className={`status-pill status-${provider.pricingStatus}`}>
              {provider.pricingStatus}
            </span>
            <strong>{provider.name}</strong>
            <p>{provider.summary}</p>
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

      <div className="model-grid">
        {providerModels.map((model) => (
          <button
            key={model.id}
            type="button"
            className={`model-card ${model.id === selectedModelId ? 'selected' : ''}`}
            onClick={() => onModelChange(model.id)}
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
          </button>
        ))}
      </div>
    </section>
  )
}
