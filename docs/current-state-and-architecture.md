# Current State And Architecture

## Product status

`LLM Cost Intelligence Studio` is live and deployed on GitHub Pages:

- `https://pacocartones.github.io/llm-cost-intelligence-studio/`

It is no longer a starter or wireframe. It already behaves like a working product shell for multi-provider AI economics planning.

## Current screens

1. `Plan`
   Purpose: model a single workload, token shape, and monthly run-rate.
2. `Compare`
   Purpose: compare models, build routing mixes, save routing stacks.
3. `Optimize`
   Purpose: surface prompt, architecture, and model-level savings ideas.
4. `Explore`
   Purpose: browse templates, benchmark use cases, and score models by scenario.
5. `Forecast`
   Purpose: translate request-level economics into growth and budget planning.
6. `Portfolio`
   Purpose: compare several products, teams, or saved routing deployments together.

## Current code structure

### App shell

- `src/App.tsx`
- `src/App.css`
- `src/index.css`

Responsibilities:

- top-level navigation
- global hero and shell
- local storage persistence
- selected provider/model/scenario state
- screen composition

### Components

- `src/components/ModelPicker.tsx`
- `src/components/RecentScenarios.tsx`
- `src/components/SectionNav.tsx`

### Data

- `src/data/catalog.ts`
- `src/data/templates.ts`

Responsibilities:

- provider catalog
- model catalog
- default scenario
- scenario templates

### Domain types

- `src/types/domain.ts`

Responsibilities:

- providers and models
- scenarios
- cost breakdowns
- routing slots
- saved routing stacks
- benchmark score shapes

### Libraries

- `src/lib/costing.ts`
- `src/lib/insights.ts`
- `src/lib/market.ts`
- `src/lib/optimizer.ts`
- `src/lib/scenario-shape.ts`
- `src/lib/routing.ts`
- `src/lib/benchmarks.ts`

Responsibilities:

- cost calculation
- insights and optimization hints
- model ranking and market summary
- workload shape analysis
- routing mix normalization and blended economics
- benchmark scoring

### Screens

- `src/screens/PlanScreen.tsx`
- `src/screens/CompareScreen.tsx`
- `src/screens/OptimizeScreen.tsx`
- `src/screens/ExploreScreen.tsx`
- `src/screens/ForecastScreen.tsx`
- `src/screens/PortfolioScreen.tsx`

## Current product capabilities

### Pricing and catalog

- multi-provider model catalog
- verified/source-linked pricing emphasis
- provider trust/status messaging

### Cost planning

- request-level recurring and first-run modeling
- caching and batch toggles
- monthly and annualized estimates
- cost per user and cost per 1k requests

### Routing

- editable multi-model routing mix
- traffic allocation by role
- blended recurring and monthly cost
- saved routing stacks in local storage

### Benchmarks

- scenario packs for support, coding, research, tutoring, and sales
- simple benchmark scoring model
- model leaderboard by use case

### Portfolio

- multi-workload planning view
- compare product lines and saved routing deployments together
- simple scaling multiplier for teams/business units
- margin targets and budget thresholds
- overrun warnings with contributor breakdown
- implied margin calculation

### Forecast

- translate request-level economics into growth and budget planning
- budget guardrail banner with headroom meter
- margin insights generated from budget, growth, and target-margin inputs
- 12-month projection table with overrun highlighting

### Artifacts and sharing

- URL-encoded share links that reconstruct a planning state
- Printable report view with clean typography
- JSON export for offline archival

## Persistence

Local storage keys currently used:

- `llm-cost-studio-scenarios`
- `llm-cost-studio-routing-stacks`

## Deployment

GitHub Pages deploys automatically from `main` via:

- `.github/workflows/deploy-pages.yml`

Vite uses the GitHub Pages base path in:

- `vite.config.ts`

## Known strengths

- strong product framing
- coherent premium visual language
- reusable routing and benchmark logic
- live deploy pipeline already working
- good foundation for future analytics

## Known weaknesses

- no backend or shared persistence
- benchmark scoring is heuristic, not benchmark-data-driven
- no historical pricing change tracking yet
- no export/share/report workflow yet
- no latency, retrieval, or external API cost modeling yet
- no scenario diffing or stack versioning yet

## Best next directions

1. shared/exportable planning artifacts
2. historical pricing and catalog change tracking
3. richer benchmark methodology and scenario scoring transparency
4. non-token cost modeling
