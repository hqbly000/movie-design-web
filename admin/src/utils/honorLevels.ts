/**
 * 奖项类型（honors.level）候选维护。
 *
 * 等级不再固定枚举：后台可下拉选预设，也可直接输入新类型——输入即视为新增一个奖项类型。
 * 候选来源三处合并去重：
 *   1. 预设 `HONOR_LEVELS`（特等奖 / 一等奖 / … / 其他）
 *   2. 本机历史新增的类型（localStorage，避免删完荣誉后选项丢失）
 *   3. 当前荣誉列表里已在用的类型（换设备/换浏览器也能看到别人建的）
 */
import { HONOR_LEVELS, HONOR_LEVEL_MAX } from './constants'

const STORAGE_KEY = 'lightisle_honor_levels'

/** 读取本机自定义新增的奖项类型（坏数据一律忽略，不抛错）。 */
export function loadCustomLevels(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

/** 记住一个新输入的奖项类型（已在预设或已存在时跳过）。 */
export function rememberLevel(level: string): void {
  const value = level.trim().slice(0, HONOR_LEVEL_MAX)
  if (!value || HONOR_LEVELS.includes(value)) return
  const list = loadCustomLevels()
  if (list.includes(value)) return
  list.push(value)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    // 隐私模式/配额满时仅失去「记住」能力，不影响保存荣誉本身
    console.warn('[奖项类型] 本地记忆失败', e)
  }
}

/** 下拉候选：预设 → 本机新增 → 已在用的类型，按首次出现去重。 */
export function levelOptions(used: string[] = []): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of [...HONOR_LEVELS, ...loadCustomLevels(), ...used]) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }
  return result
}
