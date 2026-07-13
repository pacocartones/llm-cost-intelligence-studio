import { Icons } from '../components/Icons'
import type { ViewId } from '../types/domain'

const sections: {
  id: ViewId
  label: string
  kicker: string
  icon: keyof typeof Icons
  tone: 'plan' | 'compare' | 'optimize' | 'explore' | 'forecast' | 'portfolio'
}[] = [
  { id: 'plan', label: 'Plan', kicker: 'Shape workload', icon: 'plan', tone: 'plan' },
  { id: 'compare', label: 'Compare', kicker: 'Pick default', icon: 'compare', tone: 'compare' },
  { id: 'optimize', label: 'Optimize', kicker: 'Cut waste', icon: 'optimize', tone: 'optimize' },
  { id: 'explore', label: 'Explore', kicker: 'Load patterns', icon: 'explore', tone: 'explore' },
  { id: 'forecast', label: 'Forecast', kicker: 'Stress growth', icon: 'forecast', tone: 'forecast' },
  { id: 'portfolio', label: 'Portfolio', kicker: 'Allocate capital', icon: 'portfolio', tone: 'portfolio' },
]

interface SectionNavProps {
  activeView: ViewId
  onChange: (view: ViewId) => void
}

export function SectionNav({ activeView, onChange }: SectionNavProps) {
  return (
    <nav className="section-nav" aria-label="Primary">
      {sections.map((section) => {
        const isActive = section.id === activeView
        return (
          <button
            key={section.id}
            type="button"
            className={`section-nav__item section-nav__item--${section.tone} ${isActive ? 'active' : ''}`}
            aria-pressed={isActive}
            aria-label={`${section.label}: ${section.kicker}`}
            onClick={() => onChange(section.id)}
          >
            <span className="section-nav__icon">{Icons[section.icon]}</span>
            <span className="section-nav__label">{section.label}</span>
            <span className="section-nav__kicker">{section.kicker}</span>
          </button>
        )
      })}
    </nav>
  )
}
