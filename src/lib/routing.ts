import { calculateScenarioCost } from './costing'
import type {
  CostBreakdown,
  ModelRecord,
  RoutingSlotInput,
  ScenarioInput,
} from '../types/domain'

export interface RoutingEntry {
  model: ModelRecord
  cost: CostBreakdown
}

export interface RoutingMixSlot extends RoutingSlotInput {
  entry: RoutingEntry
  normalizedShare: number
}

export interface RoutingMixResult {
  stack: RoutingMixSlot[]
  totalShare: number
  blendedRecurring: number
  blendedMonthly: number
}

export function buildDefaultRoutingSlots(entries: RoutingEntry[]) {
  const routerEntry =
    entries.find((entry) => entry.model.tier === 'efficient') ?? entries[0]
  const defaultEntry =
    entries.find(
      (entry) =>
        entry.model.id !== routerEntry.model.id && entry.model.tier === 'balanced',
    ) ??
    entries.find((entry) => entry.model.id !== routerEntry.model.id) ??
    entries[0]
  const premiumEntry =
    entries.find(
      (entry) =>
        entry.model.id !== routerEntry.model.id &&
        entry.model.id !== defaultEntry.model.id &&
        entry.model.tier === 'flagship',
    ) ??
    entries.find(
      (entry) =>
        entry.model.id !== routerEntry.model.id &&
        entry.model.id !== defaultEntry.model.id,
    ) ??
    defaultEntry

  return [
    {
      roleId: 'router' as const,
      roleLabel: 'Router / cheap path',
      share: 65,
      modelId: routerEntry.model.id,
      note: 'Handles triage, simple transforms, and the bulk of traffic.',
    },
    {
      roleId: 'default' as const,
      roleLabel: 'Primary default',
      share: 25,
      modelId: defaultEntry.model.id,
      note: 'Owns the main product experience for normal user requests.',
    },
    {
      roleId: 'premium' as const,
      roleLabel: 'Premium fallback',
      share: 10,
      modelId: premiumEntry.model.id,
      note: 'Reserved for hard reasoning, longer context, or high-value moments.',
    },
  ]
}

export function sanitizeRoutingSlots(
  current: RoutingSlotInput[],
  entries: RoutingEntry[],
) {
  const defaults = buildDefaultRoutingSlots(entries)

  return defaults.map((fallback) => {
    const existing = current.find((slot) => slot.roleId === fallback.roleId)
    const modelExists =
      existing && entries.some((entry) => entry.model.id === existing.modelId)

    return {
      ...fallback,
      modelId: modelExists ? existing.modelId : fallback.modelId,
      share: existing?.share ?? fallback.share,
    }
  })
}

export function buildRoutingMix(
  entries: RoutingEntry[],
  slots: RoutingSlotInput[],
): RoutingMixResult {
  const totalShare = slots.reduce((total, slot) => total + slot.share, 0)
  const normalizedTotal = totalShare > 0 ? totalShare : slots.length
  const stack = slots.map((slot) => {
    const entry =
      entries.find((candidate) => candidate.model.id === slot.modelId) ?? entries[0]
    const normalizedShare =
      totalShare > 0 ? slot.share / normalizedTotal : 1 / Math.max(slots.length, 1)

    return {
      ...slot,
      entry,
      normalizedShare,
    }
  })

  const blendedRecurring = stack.reduce(
    (total, slot) => total + slot.entry.cost.totalRecurring * slot.normalizedShare,
    0,
  )
  const blendedMonthly = stack.reduce(
    (total, slot) => total + slot.entry.cost.monthlyRecurring * slot.normalizedShare,
    0,
  )

  return {
    stack,
    totalShare,
    blendedRecurring,
    blendedMonthly,
  }
}

export function routingSlotsEqual(left: RoutingSlotInput[], right: RoutingSlotInput[]) {
  if (left.length !== right.length) return false

  return left.every((slot, index) => {
    const candidate = right[index]
    return (
      candidate &&
      slot.roleId === candidate.roleId &&
      slot.modelId === candidate.modelId &&
      slot.share === candidate.share
    )
  })
}

export function buildRoutingMixFromCatalog(
  catalog: ModelRecord[],
  scenario: ScenarioInput,
  slots: RoutingSlotInput[],
) {
  const entries = catalog.map((model) => ({
    model,
    cost: calculateScenarioCost(model, scenario),
  }))

  return buildRoutingMix(entries, sanitizeRoutingSlots(slots, entries))
}
