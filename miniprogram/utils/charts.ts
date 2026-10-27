// charts.ts
// 曲目定数（Lv.）查询：数据由 scripts/build-chart-levels.js 从 data/charts-maimai.json 生成
import { CHART_LEVELS, CHART_LEVEL_DIFFICULTIES } from '../data/chart-levels'

/** 谱面定数 */
export interface ChartLevel {
  /** 等级文本，如 "12+" */
  level: string
  /** 详细定数，如 12.7 */
  levelNum: number
  /** 理论最大达成率（全 CRITICAL PERFECT），如 100.45 （DX改成全101确实方便很多） */
  maxPercent: number
}

/** 难度归一化：MASTER / Re:Master / remaster 统一成 master / remaster */
export const normalizeDifficulty = (value?: string | null): string => {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

// inGameID / inGameStrID 两套索引：首次查询时构建一次，之后复用
let levelByGameId: Record<string, string[]> | null = null
let levelByGameStrId: Record<string, string[]> | null = null

const ensureIndex = (): void => {
  if (levelByGameId && levelByGameStrId) {
    return
  }
  const byGameId: Record<string, string[]> = {}
  const byGameStrId: Record<string, string[]> = {}
  Object.keys(CHART_LEVELS).forEach((key: string) => {
    // key 形如 "657:audience1"（inGameID:inGameStrID）
    const separator = key.indexOf(':')
    const gameId = separator >= 0 ? key.slice(0, separator) : key
    const gameStrId = separator >= 0 ? key.slice(separator + 1) : ''
    const slots = CHART_LEVELS[key]
    if (!byGameId[gameId]) {
      byGameId[gameId] = slots
    }
    if (gameStrId && !byGameStrId[gameStrId]) {
      byGameStrId[gameStrId] = slots
    }
  })
  levelByGameId = byGameId
  levelByGameStrId = byGameStrId
}

/**
 * 反查谱面定数：先用 inGameID，查不到再用 inGameStrID（对应歌曲的 id / code），
 * 最后按难度取 level / levelNum / maxPercent；未收录或难度不匹配时返回 null。
 */
export const findChartLevel = (
  inGameID?: number | null,
  inGameStrID?: string | null,
  difficulty?: string | null
): ChartLevel | null => {
  ensureIndex()
  const byGameId = levelByGameId || {}
  const byGameStrId = levelByGameStrId || {}
  const gameId = typeof inGameID === 'number' && inGameID > 0 ? String(inGameID) : ''
  const gameStrId = typeof inGameStrID === 'string' ? inGameStrID : ''
  const slots = (gameId ? byGameId[gameId] : undefined) || (gameStrId ? byGameStrId[gameStrId] : undefined)
  if (!slots) {
    return null
  }
  const slot = CHART_LEVEL_DIFFICULTIES.indexOf(normalizeDifficulty(difficulty))
  const raw = slot >= 0 ? slots[slot] : ''
  if (!raw) {
    return null
  }
  // raw 形如 "12+|12.9|101.5"（level|levelNum|maxPercent）
  const parts = raw.split('|')
  const level = parts[0] || ''
  const levelNum = Number(parts[1])
  const maxPercent = Number(parts[2])
  if (!level || !isFinite(levelNum)) {
    return null
  }
  return { level, levelNum, maxPercent: isFinite(maxPercent) ? maxPercent : 0 }
}

/**
 * 定数展示文案：Lv.12+ (12.7)；
 * levelNum 与 level 完全一致时省略括号，只显示 Lv.12；
 * 未匹配到谱面时返回空串
 */
export const formatChartLevel = (chart: ChartLevel | null): string => {
  if (!chart) {
    return ''
  }
  // 定数最多一位小数（12 → "12"，12.7 → "12.7"）
  const levelNum = Math.round(chart.levelNum * 10) / 10
  const levelNumText = Number.isInteger(levelNum) ? String(levelNum) : levelNum.toFixed(1)
  // levelNum 和 level 完全一样（如 level "12" / levelNum 12）时不重复展示
  if (levelNumText === chart.level) {
    return `Lv.${chart.level}`
  }
  return `Lv.${chart.level} (${levelNumText})`
}
