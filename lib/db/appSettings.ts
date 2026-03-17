import { prisma } from './prisma'

export const DEFAULT_SETTINGS: Record<string, string> = {
  model: 'sarvam-30b-16k',
  token_explain: '8000',
  token_alternate: '5000',
  token_answer: '5000',
  token_practice: '4000',
  token_evaluate: '3000',
  token_hint: '3000',
  token_seed: '6000',
  token_chat: '4000',
  streaming_mode: 'sse',
  think_tag_stripping: 'enabled',
}

// 5-minute in-process cache — avoids a DB round-trip on every AI call
let _cache: Record<string, string> | null = null
let _cacheAt = 0

export async function getAppSettings(): Promise<Record<string, string>> {
  if (_cache && Date.now() - _cacheAt < 5 * 60 * 1000) return _cache
  const rows = await prisma.appSetting.findMany()
  _cache = { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }
  _cacheAt = Date.now()
  return _cache
}

export function invalidateSettingsCache() {
  _cache = null
}

export async function getTokenLimit(key: string): Promise<number> {
  const settings = await getAppSettings()
  return parseInt(settings[`token_${key}`] ?? '') || parseInt(DEFAULT_SETTINGS[`token_${key}`] ?? '4000')
}

export async function getSetting(key: string): Promise<string> {
  const settings = await getAppSettings()
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? ''
}
