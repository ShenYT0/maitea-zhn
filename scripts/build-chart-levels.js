/* scripts/build-chart-levels.js
 * 从 miniprogram/data/charts-maimai.json 生成 miniprogram/data/chart-levels.ts
 *
 * 小程序运行时不支持 require JSON，谱面定数需要以 JS/TS 模块的形式打进包内，
 * 而原始 charts-maimai.json 有 1MB+（且大部分字段用不到）。
 * 这里只保留查询需要的 inGameID / inGameStrID / difficulty / level / levelNum / maxPercent，
 * 压缩成几十 KB 的 TS 模块。
 *
 * 用法：npm run build:chart-levels
 */
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const sourceFile = path.join(rootDir, 'miniprogram/data/charts-maimai.json')
const targetFile = path.join(rootDir, 'miniprogram/data/chart-levels.ts')

// 难度槽位顺序：生成文件的 value 按这个顺序存放，运行时（utils/charts.ts）按同样顺序取值
const DIFFICULTIES = ['easy', 'basic', 'advanced', 'expert', 'master', 'remaster']

// 难度归一化： Re:Master 等统一成 remaster 格式
const normalizeDifficulty = (value) => String(value || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

const charts = JSON.parse(fs.readFileSync(sourceFile, 'utf8'))
if (!Array.isArray(charts)) {
  throw new Error(`${sourceFile} 结构异常：期望顶层是数组`)
}

// inGameID -> { inGameStrID, slots }
const songs = new Map()

charts.forEach((chart) => {
  const data = (chart && chart.data) || null
  if (!data || typeof data.inGameID !== 'number' || !data.inGameStrID) {
    return
  }
  const slot = DIFFICULTIES.indexOf(normalizeDifficulty(chart.difficulty))
  const level = String(chart.level || '')
  const levelNum = Number(chart.levelNum)
  // 理论最大达成率（全 CRITICAL PERFECT 时的达成率），用于区分 AP / AP+
  const maxPercent = Number(data.maxPercent)
  if (slot < 0 || !level || !isFinite(levelNum)) {
    return
  }
  let song = songs.get(data.inGameID)
  if (!song) {
    song = { inGameStrID: String(data.inGameStrID), slots: ['', '', '', '', '', ''] }
    songs.set(data.inGameID, song)
  }
  // 防止数据重复
  if (!song.slots[slot]) {
    song.slots[slot] = `${level}|${levelNum}|${isFinite(maxPercent) ? maxPercent : ''}`
  }
})

const ids = [...songs.keys()].sort((a, b) => a - b)
const lines = ids.map((id) => {
  const song = songs.get(id)
  const key = `${id}:${song.inGameStrID}`
  if (/['\\]/.test(key)) {
    throw new Error(`曲目标识包含需要转义的字符：${key}`)
  }
  const values = song.slots.map((item) => `'${item}'`).join(', ')
  return `  '${key}': [${values}],`
})

const content = `/* 本文件由 scripts/build-chart-levels.js 自动生成，请勿手动修改。
* 数据来源：GitHub zkldi/Tachi/db/seeds/charts-maimai.json
* （每首歌的 inGameID / inGameStrID + 各难度level / levelNum / maxPercent，maxPercent 为全 CRITICAL PERFECT 时的理论最大达成率）
* 重新生成：npm run build:chart-levels
*/
// 难度槽位顺序：与生成脚本保持一致
export const CHART_LEVEL_DIFFICULTIES: string[] = [${DIFFICULTIES.map((item) => `'${item}'`).join(', ')}]
/* 曲目定数：
* key 为 \`inGameID:inGameStrID\`，
* value 按 CHART_LEVEL_DIFFICULTIES 顺序存放 \`level|levelNum|maxPercent\`，
* 缺失为 '' 
*/
export const CHART_LEVELS: Record<string, string[]> = {
${lines.join('\n')}
}
`

fs.writeFileSync(targetFile, content, 'utf8')

const entries = ids.reduce((total, id) => total + songs.get(id).slots.filter(Boolean).length, 0)
console.log(`已生成 ${path.relative(rootDir, targetFile)}`)
console.log(`曲目 ${ids.length} 首，谱面 ${entries} 条，文件大小 ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`)
