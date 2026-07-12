# Claude Code Handoff

## Mission

Continue evolving `LLM Cost Intelligence Studio` as a serious AI economics workspace.

The product should help a real team answer:

- which model should we ship?
- how should we route traffic between cheap, default, and premium paths?
- what is the true monthly/annual budget impact across several products?
- where do we optimize architecture versus upgrading models?

## What Claude Code should not do

- do not treat this as a blank starter
- do not reset the product direction back to a simple calculator
- do not replace the current visual direction with generic SaaS UI
- do not remove the multi-provider framing
- do not strip out routing, benchmarks, or portfolio concepts

## UX guardrails

- keep the product premium, deliberate, and product-grade
- preserve the current dark/slate visual language unless there is a very strong reason
- avoid generic dashboard clutter
- explain cost drivers clearly
- prefer product decision support over raw tables

## Technical guardrails

- keep logic modular in `src/lib/`
- keep domain shapes clean in `src/types/domain.ts`
- preserve local persistence unless replacing it with something clearly better
- do not break GitHub Pages deployment
- keep `npm run build` and `npm run lint` green

## Current live links

- Repo: `https://github.com/pacocartones/llm-cost-intelligence-studio`
- Live demo: `https://pacocartones.github.io/llm-cost-intelligence-studio/`

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Highest-leverage next milestone candidates

Choose one after auditing the codebase:

1. `Artifacts and sharing`
   Add exportable planning artifacts, sharable summaries, and printable decision outputs.

2. `Historical market intelligence`
   Add provider/model price history, change tracking, and “what changed” UI.

3. `Non-token cost modeling`
   Add latency, retrieval, grounding, and tool-API cost estimation.

4. `Scenario versioning`
   Add stack comparison history, scenario diffing, and “before/after optimization” views.

## Implemented milestones

- Routing builder and multi-model routing stacks
- Benchmark scoring and model leaderboards
- Portfolio planning with margin targets and budget guardrails
- Forecast screen with 12-month projection table and overrun detection
- Exportable planning artifacts: URL-encoded sharing, print view, JSON export

## Suggested first response from Claude Code

Claude should first provide:

1. current screen map
2. component map
3. data model review
4. strongest product qualities
5. highest-risk weaknesses
6. best next milestone
7. concrete implementation order

## Recommended kickoff prompt

```text
Read README.md, START-HERE.md, docs/current-state-and-architecture.md, and docs/claude-code-handoff.md first.

Then inspect the codebase and tell me:
1. what is already strong
2. what feels weak or unfinished
3. what the best next milestone is
4. the implementation order you recommend

After that, implement the milestone directly without changing the product direction.
Keep the UI premium and the architecture extensible.
```
