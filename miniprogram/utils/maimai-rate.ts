// maimai-rate.ts
// 依据 zkldi/Tachi/typescript/rg-stats/src/algorithms/maimai-rate.ts 的算法计算：
// 给出一条成绩的achievement、谱面理论maxPercent与定数（levelNum），返回该成绩的 maimai rate。

// [F, E, D, C, B, A, AA, AAA, S - 0.01, S, SS - 0.01, SS, SSS - 0.01, SSS, SSS+]
const RATE_TABLE: Record<number, number[]> = {
  0: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  10: [0, 0, 10, 20, 40, 100, 150, 250, 400, 400, 500, 550, 650, 700, 800],
  20: [0, 0, 20, 40, 80, 200, 250, 300, 450, 450, 550, 600, 700, 750, 850],
  30: [0, 0, 30, 60, 120, 300, 350, 400, 500, 500, 600, 650, 750, 800, 900],
  40: [0, 0, 40, 80, 160, 350, 400, 450, 550, 550, 650, 700, 800, 850, 950],
  50: [0, 0, 50, 100, 200, 400, 500, 550, 600, 600, 700, 750, 850, 900, 1000],
  60: [0, 0, 60, 120, 240, 450, 550, 600, 650, 650, 750, 800, 900, 950, 1050],
  70: [0, 0, 70, 140, 280, 500, 600, 700, 725, 750, 875, 900, 975, 1000, 1100],
  80: [0, 0, 80, 160, 320, 550, 650, 725, 750, 800, 925, 950, 1025, 1050, 1150],
  90: [0, 0, 90, 180, 360, 600, 700, 750, 800, 900, 1025, 1050, 1125, 1150, 1250],
  100: [0, 0, 100, 200, 400, 700, 800, 850, 900, 1000, 1125, 1150, 1225, 1250, 1350],
  110: [0, 0, 110, 220, 440, 800, 900, 950, 1000, 1100, 1175, 1200, 1275, 1300, 1400],
  120: [0, 0, 120, 240, 480, 900, 1000, 1050, 1100, 1200, 1275, 1300, 1375, 1400, 1500],
  130: [0, 0, 130, 260, 520, 1000, 1100, 1150, 1250, 1350, 1475, 1500, 1575, 1600, 1700],
  140: [0, 0, 140, 280, 560, 1100, 1200, 1250, 1400, 1500, 1675, 1700, 1775, 1800, 1900],
  150: [0, 0, 150, 300, 600, 1200, 1300, 1350, 1550, 1650, 1875, 1900, 1975, 2000, 2100],
}

const RANK_BOUNDARIES = {
  F: 0,
  E: 1000,
  D: 2000,
  C: 4000,
  B: 6000,
  A: 8000,
  AA: 9000,
  AAA: 9400,
  'S-': 9699,
  S: 9700,
  'SS-': 9899,
  SS: 9900,
  'SSS-': 9999,
  SSS: 10000,
  'SSS+': 20000,
} as const

const getRank = (score: number): keyof typeof RANK_BOUNDARIES => {
  const entries = Object.entries(RANK_BOUNDARIES).reverse()
  const match = entries.slice(0, -1).find(([_, boundary]) => score >= boundary)
  return (match ?? entries[entries.length - 1])[0] as keyof typeof RANK_BOUNDARIES
}

// ICCL15 之后的谱面按 15.0 的表格外推
const RATE_ICL_CAP = 150

const calculateRatingCurve = (iclInt: number): number[] => {
  let lowerIcl = Math.floor(iclInt / 10) * 10
  let upperIcl = Math.ceil(iclInt / 10) * 10
  if (iclInt > RATE_ICL_CAP) {
    lowerIcl = 140
    upperIcl = 150
  }
  if (lowerIcl === upperIcl) {
    return RATE_TABLE[lowerIcl]
  }
  const lowerCurve = RATE_TABLE[lowerIcl]
  const upperCurve = RATE_TABLE[upperIcl]
  return lowerCurve.map((rateValue, index) => {
    const upperRateValue = upperCurve[index]
    return rateValue + ((upperRateValue - rateValue) * (iclInt - lowerIcl)) / (upperIcl - lowerIcl)
  })
}

/**
 * 计算 maimai rate。
 * @param score 该谱面的达成率（如 98.45）
 * @param maxScore 该谱面的理论最大达成率（如 100.45，来自 charts-maimai.json 的 maxPercent）
 * @param internalChartLevel 谱面内部定数（如 12.7）
 */
export const calculateRate = (
  score: number,
  maxScore: number,
  internalChartLevel: number
): number => {
  // 输入兜底（原 scripts/maimai-rate.ts 用 ThrowIf，这里改为安全返回 0 / 截断）
  if (!isFinite(score) || score <= 0) {
    return 0
  }
  if (!isFinite(maxScore) || maxScore <= 0) {
    return 0
  }
  const safeMax = Math.min(maxScore, 104)
  const safeScore = Math.min(score, safeMax) // 达到率异常超过理论值时按满分算
  const safeLevel = isFinite(internalChartLevel) && internalChartLevel > 0 ? internalChartLevel : 0

  const scoreInt = Math.round(safeScore * 100)
  const maxScoreInt = Math.round(safeMax * 100)
  const iclInt = Math.round(safeLevel * 10)

  if (scoreInt <= 1000) {
    return 0
  }

  const curve = calculateRatingCurve(iclInt)

  if (scoreInt === maxScoreInt) {
    return curve[curve.length - 1] / 100
  }

  const rank = getRank(scoreInt)
  const rankIndex = Object.keys(RANK_BOUNDARIES).indexOf(rank)

  // SSS 与 SSS+ 之间按 100% ~ 200% 缩放（100% 是达标线，超出部分按到 maxScore 的比例折算）
  let adjustScoreInt = scoreInt
  if (rank === 'SSS') {
    adjustScoreInt =
      Math.floor(((scoreInt - 10000) / (maxScoreInt - 10000)) * 10000 + 10000)
  }

  const lowerRateValue = curve[rankIndex]
  const lowerScoreBoundary = RANK_BOUNDARIES[rank]

  if (adjustScoreInt === lowerScoreBoundary) {
    return lowerRateValue / 100
  }

  const upperRateValue = curve[rankIndex + 1]
  const upperScoreBoundary = Object.values(RANK_BOUNDARIES)[rankIndex + 1]
  const rate =
    lowerRateValue +
    (upperRateValue - lowerRateValue) *
      ((adjustScoreInt - lowerScoreBoundary) / (upperScoreBoundary - lowerScoreBoundary))

  return Math.floor(rate) / 100
}
