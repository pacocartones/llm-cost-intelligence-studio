# LLM Cost Intelligence Studio

LLM Cost Intelligence Studio is a product for estimating, comparing, optimizing, and forecasting AI model costs across providers, use cases, and workflow architectures.

Live demo: https://pacocartones.github.io/LLM-Cost-Intelligence-Studio/

The app is deployed automatically to GitHub Pages from `main` via GitHub Actions.

## What it does

- compares model economics across Anthropic, OpenAI, Google Gemini, Mistral, xAI, and DeepSeek
- models token costs by scenario shape, output size, caching, and batch assumptions
- designs, saves, and compares multi-model routing mixes instead of assuming a single universal model
- scores benchmark-style use-case packs for support, coding, research, tutoring, and sales
- forecasts recurring spend and margin-sensitive planning metrics
- compares several products, teams, or deployments at once in portfolio mode

## Product direction

This is being built as an AI economics workspace, not just a prompt calculator.

The long-term goal is to help teams answer questions like:

- which default model should we ship?
- where should we route cheap, normal, and premium traffic?
- how much margin do we lose when prompts or outputs grow?
- when should we optimize architecture versus upgrading models?

## Project structure

- `docs/` product strategy, build brief, and phased roadmap
- `src/` application source code
- `public/` static assets

## Deploy

- GitHub Pages is configured through `.github/workflows/deploy-pages.yml`
- every push to `main` builds and deploys the app automatically


## License

MIT.
