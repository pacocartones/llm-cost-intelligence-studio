import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split('/')[1] ??
  process.env.npm_package_name ??
  'llm-cost-intelligence-studio'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? `/${repositoryName}/` : '/',
}))
