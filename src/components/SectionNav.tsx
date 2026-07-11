import type { ViewId } from '../types/domain'

const sections: { id: ViewId; label: string; kicker: string }[] = [
  { id: 'plan', label: 'Plan', kicker: 'Estimate costs' },
  { id: 'compare', label: 'Compare', kicker: 'Choose models' },
  { id: 'optimize', label: 'Optimize', kicker: 'Find savings' },
  { id: 'explore', label: 'Explore', kicker: 'Use-case templates' },
  { id: 'forecast', label: 'Forecast', kicker: 'Project spend' },
  { id: 'portfolio', label: 'Portfolio', kicker: 'Compare products' },
]

interface SectionNavProps {
  activeView: ViewId
  onChange: (view: ViewId) => void
}

export function SectionNav({ activeView, onChange }: SectionNavProps) {
  return (
    <nav className="section-nav" aria-label="Primary">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={section.id === activeView ? 'active' : ''}
          onClick={() => onChange(section.id)}
        >
          <span>{section.label}</span>
          <small>{section.kicker}</small>
        </button>
      ))}
    </nav>
  )
}
