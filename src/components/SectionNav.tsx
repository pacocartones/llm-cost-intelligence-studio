import { Icons } from '../components/Icons'
import type { ViewId } from '../types/domain'

const sections: { id: ViewId; label: string; kicker: string; icon: keyof typeof Icons }[] = [
  { id: 'plan', label: 'Plan', kicker: 'Shape workload', icon: 'plan' },
  { id: 'compare', label: 'Compare', kicker: 'Pick default', icon: 'compare' },
  { id: 'optimize', label: 'Optimize', kicker: 'Cut waste', icon: 'optimize' },
  { id: 'explore', label: 'Explore', kicker: 'Load patterns', icon: 'explore' },
  { id: 'forecast', label: 'Forecast', kicker: 'Stress growth', icon: 'forecast' },
  { id: 'portfolio', label: 'Portfolio', kicker: 'Allocate capital', icon: 'portfolio' },
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
            className={`section-nav__item ${isActive ? 'active' : ''}`}
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
