import type { SavedScenario } from '../types/domain'

interface RecentScenariosProps {
  scenarios: SavedScenario[]
  onLoad: (scenario: SavedScenario) => void
}

export function RecentScenarios({ scenarios, onLoad }: RecentScenariosProps) {
  if (!scenarios.length) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Recent scenarios</p>
            <h3>No saved scenarios yet</h3>
          </div>
        </div>
        <p className="muted-copy">
          Save a few realistic scenarios here so Claude Code can iterate on real product cases rather than empty states.
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Recent scenarios</p>
          <h3>Seed your product thinking with examples</h3>
        </div>
      </div>

      <div className="scenario-list">
        {scenarios.map((entry) => (
          <button key={entry.id} type="button" className="scenario-item" onClick={() => onLoad(entry)}>
            <div>
              <strong>{entry.scenario.name}</strong>
              <p>
                {entry.providerId} · {entry.modelId}
              </p>
            </div>
            <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
