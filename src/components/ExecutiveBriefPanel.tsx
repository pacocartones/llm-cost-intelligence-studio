import { useState } from 'react'

interface ExecutiveBriefPanelProps {
  eyebrow: string
  title: string
  summary: string
  recommendation: string
  risk: string
  nextStep: string
  metrics: Array<{
    label: string
    value: string
    detail: string
  }>
  onPrimaryAction?: () => void
  primaryActionLabel?: string
}

export function ExecutiveBriefPanel({
  eyebrow,
  title,
  summary,
  recommendation,
  risk,
  nextStep,
  metrics,
  onPrimaryAction,
  primaryActionLabel,
}: ExecutiveBriefPanelProps) {
  const [copied, setCopied] = useState(false)

  const memo = [
    title,
    '',
    `Summary: ${summary}`,
    `Recommendation: ${recommendation}`,
    `Risk: ${risk}`,
    `Next step: ${nextStep}`,
    '',
    'Key metrics:',
    ...metrics.map((metric) => `- ${metric.label}: ${metric.value} (${metric.detail})`),
  ].join('\n')

  function handleCopyMemo() {
    navigator.clipboard.writeText(memo).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section className="executive-brief" aria-label="Executive brief">
      <div className="executive-brief__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
        <div className="executive-brief__actions">
          {onPrimaryAction && primaryActionLabel ? (
            <button
              type="button"
              className="ghost-button"
              onClick={onPrimaryAction}
            >
              {primaryActionLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="ghost-button"
            aria-live="polite"
            onClick={handleCopyMemo}
          >
            {copied ? 'Memo copied!' : 'Copy memo'}
          </button>
        </div>
      </div>

      <div className="executive-brief__grid">
        <article className="executive-brief__card">
          <span>Recommendation</span>
          <strong>{recommendation}</strong>
        </article>
        <article className="executive-brief__card">
          <span>Risk</span>
          <strong>{risk}</strong>
        </article>
        <article className="executive-brief__card">
          <span>Next step</span>
          <strong>{nextStep}</strong>
        </article>
      </div>

      <div className="executive-brief__metrics">
        {metrics.map((metric) => (
          <article key={metric.label} className="executive-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

