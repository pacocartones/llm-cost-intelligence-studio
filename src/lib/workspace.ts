import type { ProviderId, ScenarioInput, ViewId } from '../types/domain'

const WORKSPACE_KEY = 'lci-workspace-state'
const WORKSPACE_PARAM = 'workspace'
const VERSION = 1

export interface WorkspaceSnapshot {
  version: 1
  activeView: ViewId
  selectedProviderId: ProviderId
  selectedModelId: string
  scenario: ScenarioInput
}

function encodeText(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

function decodeText(value: string) {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function parseWorkspaceSnapshot(raw: string | null): WorkspaceSnapshot | null {
  if (!raw) return null

  try {
    const snapshot = JSON.parse(raw) as WorkspaceSnapshot
    if (snapshot.version !== VERSION) return null
    return snapshot
  } catch {
    return null
  }
}

export function loadWorkspaceSnapshot() {
  const url = new URL(window.location.href)
  const encoded = url.searchParams.get(WORKSPACE_PARAM)

  if (encoded) {
    try {
      const decoded = decodeText(encoded)
      const parsed = parseWorkspaceSnapshot(decoded)
      if (parsed) return parsed
    } catch {
      // Ignore malformed deep links and fall back to local storage.
    }
  }

  return parseWorkspaceSnapshot(window.localStorage.getItem(WORKSPACE_KEY))
}

export function persistWorkspaceSnapshot(snapshot: WorkspaceSnapshot) {
  const data = JSON.stringify(snapshot)
  window.localStorage.setItem(WORKSPACE_KEY, data)

  const url = new URL(window.location.href)
  url.searchParams.set(WORKSPACE_PARAM, encodeText(data))
  window.history.replaceState({}, '', url.toString())
}

