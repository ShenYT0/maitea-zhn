// api.ts
// Maitea 开放接口封装，见 README.md
import { formatApiDate } from './util'
import { findChartLevel, formatChartLevel } from './charts'

export const API_BASE_URL = 'https://maitea.app'

/** 单次游玩记录 */
export interface PlayRecord {
  id: number
  date: string
  date_unix: number
  /** 该场游戏详情接口地址（部分接口版本返回） */
  api_route?: string
}

/** 游玩统计 */
export interface PlayStats {
  total: number
  wins: number
  vs: number
  sync: number
  first: PlayRecord | null
  latest: PlayRecord | null
}

/** 名片装扮资源（png / webp 为完整资源地址） */
export interface ProfileAsset {
  id: number
  png: string
  webp: string
  /** 是否为 DeKa 大头像（部分接口版本返回） */
  is_deka?: boolean
}

/** 称号 */
export interface ProfileTitle {
  id: number
  value: string
}

/** 玩家装扮选项 */
export interface ProfileOptions {
  icon: ProfileAsset | null
  icon_deka: ProfileAsset | null
  nameplate: ProfileAsset | null
  frame: ProfileAsset | null
  /** 称号（部分接口版本返回） */
  title?: ProfileTitle | null
}

/** GET /api/v1/profiles 返回的单条资料 */
export interface Profile {
  id: number
  name: string
  rating: number
  rating_highest: number
  level: number
  play_stats: PlayStats | null
  options: ProfileOptions | null
  is_primary: boolean
}

/** 页面展示用资料：接口字段 + 卡片渲染所需的派生字段 */
export interface ProfileView extends Profile {
  firstPlayedAt: string
  latestPlayedAt: string
  /** 头像地址：接口返回 icon_deka 时只取 DeKa 版本（232 x 284 竖版） */
  avatarSrc: string
  /** 头像是否为 DeKa 版本，用于区分展示尺寸（DeKa 为竖版，普通头像为 128 x 128 正方形） */
  avatarIsDeka: boolean
  /** 铭牌背景图地址（284 x 96），文本叠加其上 */
  nameplateSrc: string
  /** 底板（接口字段 frame，720 x 300），作为玩家卡片的背景 */
  boardSrc: string
  /** 铭牌上的 Rating 数值：rating / 100，保留两位小数（不展示 rating_highest） */
  ratingText: string
  /** 称号文本，展示在铭牌下方 */
  titleText: string
  /** 称号从右到左滚动的时长（秒） */
  titleDuration: number
  /** Rating 分段底色分类（见 buildRatingTier / README「Rating 分段底色」） */
  ratingTier: RatingTier
}

/** 200 响应体 */
export interface ProfilesPayload {
  data: Profile[]
}

/** 单局判定统计（score_detail 下每个键结构相同） */
export interface PlayHits {
  perfect: number
  great: number
  good: number
  bad: number
}

/** 单局得分明细 */
export interface PlayScoreDetail {
  hits: PlayHits
  tap: PlayHits
  hold: PlayHits
  slide: PlayHits
  break: PlayHits
}

/** 判定详情表格行列 */
export interface PlayScoreRow {
  /** 行标签，对应 score_detail 的键 */
  label: string
  /** 列标签 */
  perfect: number
  great: number
  good: number
  /** 接口字段名为 bad（即 Miss） */
  miss: number
}

/** 曲名字号档位：标题太长时逐级缩小，直到能完整显示 */
export type PlayTitleSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs'

/** 难度档位 */
export interface PlayDifficulty {
  key: number
  value: string
  label: string
}

/** 曲目 / 作者的日英双语文本 */
export interface PlayI18nText {
  en: string
  jp: string
}

/** 曲目信息 */
export interface PlaySong {
  id: number
  code: string
  name: PlayI18nText
  artist: PlayI18nText
}

/** 曲目封面目录：/storage/track_covers/[song.id]_mmt_[song.code].webp（220 x 214） */
export const TRACK_COVER_BASE = `${API_BASE_URL}/storage/track_covers`

/** 拼接曲目封面地址；缺少 id / code 时返回空串（页面显示占位块） */
export const buildTrackCoverUrl = (song: PlaySong | null): string => {
  if (!song || !song.id || !song.code) {
    return ''
  }
  return `${TRACK_COVER_BASE}/${song.id}_mmt_${song.code}.webp`
}

/** 评级徽章目录：/storage/ranks/rank_[rank].webp（88 x 72） */
export const RANK_ICON_BASE = `${API_BASE_URL}/storage/ranks`

/** 提供徽章图片的评级（BBB 及以下没有图片资源） */
const RANK_ICON_RANKS = ['A', 'AA', 'AAA', 'S', 'S+', 'SS', 'SS+', 'SSS', 'SSS+']

/** 拼接评级徽章地址；A 以下或未知评级返回空串（页面继续用文字展示） */
export const buildRankIconUrl = (rank: string): string => {
  const normalized = (rank || '').trim().toUpperCase()
  if (!normalized || RANK_ICON_RANKS.indexOf(normalized) === -1) {
    return ''
  }
  return `${RANK_ICON_BASE}/rank_${normalized}.webp`
}

/** 奖章目录：/storage/medals/{full_combo,full_combo_plus,all_perfect,all_perfect_plus}.webp（88 x 72） */
export const MEDAL_BASE = `${API_BASE_URL}/storage/medals`

/**
 * 拼接游玩记录奖章地址（展示在评级徽章右侧）：
 * - is_all_perfect 为真：达成率达到该谱面的理论最大值（maxPercent，全 CRITICAL PERFECT）时用
 *   all_perfect_plus，否则 all_perfect（maxPercent 未知时按 AP 处理）
 * - 否则 full_combo === 2 → full_combo_plus，full_combo === 1 → full_combo
 * - 其余情况返回空串（不展示奖章）
 */
export const buildPlayMedalUrl = (item: PlayItem, maxPercent: number): string => {
  if (!item) {
    return ''
  }
  if (item.is_all_perfect) {
    const achievement = Number(item.achievement_formatted)
    // 达成率保留两位小数，统一换算成整数比较，避免浮点误差
    const isPlus =
      isFinite(maxPercent) &&
      maxPercent > 0 &&
      isFinite(achievement) &&
      Math.round(achievement * 100) >= Math.round(maxPercent * 100)
    return `${MEDAL_BASE}/${isPlus ? 'all_perfect_plus' : 'all_perfect'}.webp`
  }
  if (item.full_combo === 2) {
    return `${MEDAL_BASE}/full_combo_plus.webp`
  }
  if (item.full_combo === 1) {
    return `${MEDAL_BASE}/full_combo.webp`
  }
  return ''
}

/** GET /api/v1/plays 返回的单条游玩记录 */
export interface PlayItem {
  id: number
  /** 达成率，已格式化，如 "80.00" */
  achievement_formatted: string
  /** 第几首（一局内多曲） */
  track: number
  /** 分数，已格式化，如 "100,000" */
  score_formatted: string
  score_detail?: PlayScoreDetail
  /** 评级，如 AAA / SSS+ */
  rank: string
  full_combo: number
  full_combo_label: string | null
  is_high_score: boolean
  is_all_perfect: boolean
  is_track_skip: boolean
  difficulty_level: PlayDifficulty | null
  /** 游玩时间（ISO，如 2023-01-01T00:00:00.000000Z） */
  play_date: string
  /** 游玩地点 */
  location: string
  song: PlaySong | null
}

/** GET /api/v1/plays 的分页信息（Laravel 风格） */
export interface PlaysMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number | null
  to?: number | null
}

/** GET /api/v1/plays 的 200 响应体 */
export interface PlaysPayload {
  data: PlayItem[]
  meta?: PlaysMeta
}

/** 游玩记录列表展示用数据：接口字段 + 列表所需的派生字段 */
export interface PlayItemView extends PlayItem {
  /** 曲名：优先日文，其次英文 */
  songName: string
  /** 曲名字号档位：标题太长时逐级缩小避免遮挡（xl=30rpx … xs=18rpx） */
  titleSize: PlayTitleSize
  /** 作者：优先日文，其次英文 */
  songArtist: string
  /** 曲目封面地址（220 x 214 webp）；缺少 id / code 时为空串，页面显示占位块 */
  coverUrl: string
  /** 评级徽章图片地址（88 x 72 webp）；A 以下评级没有图片，为空串（页面显示文字） */
  rankIconUrl: string
  /** 奖章图片地址（88 x 72 webp）：FC / FC+ / AP / AP+；没有奖章时为空串 */
  medalUrl: string
  /** 难度标签，如 BASIC / Re:MASTER */
  difficultyLabel: string
  /** 难度色调（用作 class 后缀：basic / advanced / expert / master / remaster / other） */
  difficultyTone: string
  /** 谱面等级文本，如 "12+"；未收录该谱面时为空串 */
  chartLevel: string
  /** 谱面定数，如 12.7；未收录该谱面时为 0 */
  chartLevelNum: number
  /** 定数展示文案，如 "Lv.12+ (12.7)"；未收录该谱面时为空串 */
  chartLevelText: string
  /** 游玩时间（YYYY-MM-DD HH:mm:ss） */
  dateText: string
  /** 角标：SKIP（跳曲）；全连/全彩改为奖章图片展示在评级右侧 */
  badges: string[]
  /** 判定详情表格行（hits / tap / hold / slide / break）；接口无 score_detail 时为空数组 */
  scoreRows: PlayScoreRow[]
  /** 判定详情抽屉是否展开（页面交互状态） */
  scoreOpen: boolean
}

/** 401/403 等错误响应体 */
export interface ApiErrorPayload {
  message?: string
}

export interface ApiResponse {
  statusCode: number
  data: unknown
}

/** GET /api/v1/profiles：使用 API Key 获取当前用户的资料列表 */
export const fetchProfiles = (apiKey: string): Promise<ApiResponse> => {
  return new Promise<ApiResponse>((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/api/v1/profiles`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      success: (res) => {
        resolve({ statusCode: res.statusCode, data: res.data })
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/** /api/v1/plays 需要返回的字段（与 README 示例保持一致） */
export const PLAY_FIELDS: string[] = [
  'id',
  'achievement_formatted',
  'track',
  'score_formatted',
  'score_detail',
  'rank',
  'full_combo',
  'full_combo_label',
  'is_high_score',
  'is_all_perfect',
  'is_track_skip',
  'difficulty_level',
  'play_date',
  'location',
  'song',
]

/**
 * GET /api/v1/plays?profile=..&page=..：分页获取指定账号的游玩记录（page 从 1 开始）
 * README 中该接口用 GET + fields 数组传参，这里显式拼成 fields[]=a&fields[]=b，
 * 服务端（PHP）会解析为数组，避免不同运行环境对 GET data 序列化不一致的问题。
 */
export const fetchPlays = (apiKey: string, profileId: number, page: number): Promise<ApiResponse> => {
  const query = [
    `profile=${encodeURIComponent(String(profileId))}`,
    `page=${encodeURIComponent(String(page))}`,
  ]
    .concat(PLAY_FIELDS.map((field: string) => `fields[]=${encodeURIComponent(field)}`))
    .join('&')
  return new Promise<ApiResponse>((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/api/v1/plays?${query}`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      success: (res) => {
        resolve({ statusCode: res.statusCode, data: res.data })
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/** 读取接口返回的错误文案（如 "Unauthenticated."） */
export const readErrorMessage = (data: unknown): string => {
  if (data && typeof data === 'object') {
    const message = (data as ApiErrorPayload).message
    if (typeof message === 'string' && message) {
      return message
    }
  }
  return ''
}

/** Rating 展示规则：rating 除以 100，保留两位小数 */
export const formatRating = (rating: number): string => {
  const value = typeof rating === 'number' && isFinite(rating) ? rating : 0
  return (value / 100).toFixed(2)
}

/** 称号滚动时长（秒）：按字数计算，避免字数多时滚得太快、字数少时太慢 */
export const buildTitleDuration = (titleLength: number): number => {
  return Math.max(6, Math.min(24, Math.round(titleLength * 1.5)))
}

/** Rating 分段底色分类：对应 index.wxss 中的 .rating-* 类 */
export type RatingTier =
  | 'white'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'copper'
  | 'silver'
  | 'gold'
  | 'rainbow'

/**
 * Rating 分段规则（按展示值 = rating / 100 划分，闭区间上界）：
 * 0.00 ~ 1.99 白 / 2.00 ~ 3.99 蓝 / 4.00 ~ 6.99 绿 / 7.00 ~ 9.99 黄 /
 * 10.00 ~ 11.99 红 / 12.00 ~ 12.99 紫 / 13.00 ~ 13.99 铜 /
 * 14.00 ~ 14.49 银 / 14.50 ~ 14.99 金 / 15.00 及以上 彩虹
 */
export const buildRatingTier = (rating: number): RatingTier => {
  const value = typeof rating === 'number' && isFinite(rating) ? rating / 100 : 0
  if (value < 2) return 'white'
  if (value < 4) return 'blue'
  if (value < 7) return 'green'
  if (value < 10) return 'yellow'
  if (value < 12) return 'red'
  if (value < 13) return 'purple'
  if (value < 14) return 'copper'
  if (value < 14.5) return 'silver'
  if (value < 15) return 'gold'
  return 'rainbow'
}

/** 转换为页面展示用数据 */
export const toProfileView = (profile: Profile): ProfileView => {
  const stats = profile.play_stats
  const options = profile.options || null
  // 头像：接口返回 icon_deka 时视为 DeKa 头像，只展示 DeKa 版本
  const dekaWebp = options && options.icon_deka ? options.icon_deka.webp : ''
  const iconWebp = options && options.icon ? options.icon.webp : ''
  const avatarIsDeka = !!dekaWebp
  const titleText = options && options.title ? options.title.value : ''
  return {
    ...profile,
    firstPlayedAt: formatApiDate(stats && stats.first ? stats.first.date : ''),
    latestPlayedAt: formatApiDate(stats && stats.latest ? stats.latest.date : ''),
    avatarSrc: avatarIsDeka ? dekaWebp : iconWebp,
    avatarIsDeka,
    nameplateSrc: options && options.nameplate ? options.nameplate.webp : '',
    boardSrc: options && options.frame ? options.frame.webp : '',
    ratingText: formatRating(profile.rating),
    ratingTier: buildRatingTier(profile.rating),
    titleText,
    titleDuration: buildTitleDuration(titleText.length),
  }
}

/** 游玩记录页顶部玩家身份卡：头像（普通正方形）+ 铭牌（LV / Rating / 玩家名） */
export interface ProfileHeaderView {
  id: number
  name: string
  level: number
  ratingText: string
  ratingTier: RatingTier
  /** 普通正方形头像（128 x 128）：即使接口有 DeKa 竖版也只展示正方形版本 */
  avatarSrc: string
  /** 铭牌背景图地址（284 x 96） */
  nameplateSrc: string
}

/** 构建页面顶部身份卡：头像固定取普通正方形版本（icon），没有 icon 时才退回 DeKa */
export const buildProfileHeader = (profile: Profile): ProfileHeaderView => {
  const options = profile.options || null
  const icon = options && options.icon ? options.icon.webp : ''
  const deka = options && options.icon_deka ? options.icon_deka.webp : ''
  return {
    id: profile.id,
    name: profile.name,
    level: Number(profile.level) || 0,
    ratingText: formatRating(profile.rating),
    ratingTier: buildRatingTier(profile.rating),
    avatarSrc: icon || deka,
    nameplateSrc: options && options.nameplate ? options.nameplate.webp : '',
  }
}

/** 兼容 { data: [...] } 与 Laravel 分页 { data: { data: [...] } } 两种响应结构 */
export const toPlaysList = (data: unknown): PlayItem[] => {
  if (!data || typeof data !== 'object') {
    return []
  }
  const root = data as { data?: unknown }
  if (Array.isArray(root.data)) {
    return root.data as PlayItem[]
  }
  if (root.data && typeof root.data === 'object') {
    const nested = (root.data as { data?: unknown }).data
    if (Array.isArray(nested)) {
      return nested as PlayItem[]
    }
  }
  return []
}

/** 读取分页信息；响应异常或旧版本接口没有 meta 时返回 null */
export const readPlaysMeta = (data: unknown): PlaysMeta | null => {
  if (!data || typeof data !== 'object') {
    return null
  }
  const meta = (data as { meta?: unknown }).meta
  if (meta && typeof meta === 'object' && typeof (meta as PlaysMeta).last_page === 'number') {
    return meta as PlaysMeta
  }
  return null
}

/** 多语言文本取值：优先日文，其次英文 */
const pickI18nText = (text: PlayI18nText | null | undefined): string => {
  if (!text) {
    return ''
  }
  return text.jp || text.en || ''
}

/** 难度色调：用作 class 后缀（basic / advanced / expert / master / remaster / other） */
const buildDifficultyTone = (difficulty: PlayDifficulty | null): string => {
  if (!difficulty) {
    return 'other'
  }
  const tone = String(difficulty.value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase()
  return tone || 'other'
}

/**
 * 角标：track skip
 * 
 */
const buildPlayBadges = (item: PlayItem): string[] => {
  return item.is_track_skip ? ['SKIP'] : []
}

/** 判定详情表格的纵轴顺序与标签（与接口 score_detail 的键一致） */
const SCORE_ROW_KEYS: { key: keyof PlayScoreDetail; label: string }[] = [
  { key: 'hits', label: 'hits' },
  { key: 'tap', label: 'tap' },
  { key: 'hold', label: 'hold' },
  { key: 'slide', label: 'slide' },
  { key: 'break', label: 'break' },
]

/** 判定次数兜底：非数字 / 负数 / 缺失统一按 0 处理 */
const buildHitCount = (value?: number | null): number => {
  const count = Number(value)
  return isFinite(count) && count > 0 ? count : 0
}

/** 判定详情表格行；接口未返回 score_detail（如跳曲）时为空数组，页面不显示按钮 */
const buildScoreRows = (detail?: PlayScoreDetail | null): PlayScoreRow[] => {
  if (!detail) {
    return []
  }
  const rows: PlayScoreRow[] = []
  SCORE_ROW_KEYS.forEach((item) => {
    const hits = detail[item.key]
    if (!hits) {
      return
    }
    rows.push({
      label: item.label,
      perfect: buildHitCount(hits.perfect),
      great: buildHitCount(hits.great),
      good: buildHitCount(hits.good),
      miss: buildHitCount(hits.bad),
    })
  })
  return rows
}

/** 小写假名（ぁぃぅぇぉゃゅょゎ / ァィゥェォャュョヮ）：显示宽度略小于全角 */
const SMALL_KANA_CODES = new Set<number>([
  0x3041, 0x3043, 0x3045, 0x3047, 0x3049, 0x3083, 0x3085, 0x3087, 0x308e,
  0x30a1, 0x30a3, 0x30a5, 0x30a7, 0x30a9, 0x30e3, 0x30e5, 0x30e7, 0x30ee,
])

/** 单人字符显示宽度（相对 1em 字号），用于精确估算曲名渲染宽度 */
const charWidthEm = (code: number): number => {
  // 小写假名宽度略小于全角
  if (SMALL_KANA_CODES.has(code)) {
    return 0.85
  }
  // 全角：CJK 汉字 / 假名 / 谚文 / 全角标点 / CJK 兼容区（宽约 1em）
  if (
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x3000 && code <= 0x303f)
  ) {
    return 1
  }
  // 半角字母 / 数字：粗体下约 0.6em，取 0.62 保守估计
  if (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a)
  ) {
    return 0.62
  }
  if (code === 0x20) {
    return 0.35 // 半角空格
  }
  if (code === 0x40) {
    return 0.62 // @
  }
  // 其余半角标点
  if (
    (code >= 0x21 && code <= 0x2f) ||
    (code >= 0x3a && code <= 0x40) ||
    (code >= 0x5b && code <= 0x60) ||
    (code >= 0x7b && code <= 0x7e)
  ) {
    return 0.35
  }
  return 0.6
}

/** 曲名预计渲染宽度（em）；含空格 / 符号 / 中英混排都能按真实宽度累加 */
const countNameWidthEm = (name: string): number => {
  let em = 0
  const src = name || ''
  for (let i = 0; i < src.length; i++) {
    em += charWidthEm(src.charCodeAt(i))
  }
  return em
}

/** 曲名单行可用宽度（rpx）：信息列约 510rpx，扣除 30rpx 安全边距（粗体 / 字距误差） */
const TITLE_MAX_WIDTH_RPX = 480
/** 字号档位（rpx，从大到小） */
const TITLE_FONT_SIZE_TIERS = [30, 27, 24, 21, 18]
/** 与字号档位对应的展示档位名 */
const TITLE_TIER_NAMES: PlayTitleSize[] = ['xl', 'lg', 'md', 'sm', 'xs']

/** 曲名字号档位：按真实宽度逐档校验，取能完整显示的最大字号；仍超长时取最小档保底省略 */
const buildTitleSize = (name: string): PlayTitleSize => {
  const widthEm = countNameWidthEm(name || '')
  for (let i = 0; i < TITLE_FONT_SIZE_TIERS.length; i++) {
    if (widthEm * TITLE_FONT_SIZE_TIERS[i] <= TITLE_MAX_WIDTH_RPX) {
      return TITLE_TIER_NAMES[i]
    }
  }
  return 'xs'
}

/** 转换为游玩记录列表展示用数据 */
export const toPlayView = (item: PlayItem): PlayItemView => {
  const difficulty = item.difficulty_level || null
  const song = item.song || null
  const songName = pickI18nText(item.song && item.song.name) || '未知曲目'
  // 谱面定数：用歌曲的 inGameID / inGameStrID（接口里的 song.id / song.code）+ 难度反查
  const chartLevel = findChartLevel(
    song ? song.id : null,
    song ? song.code : '',
    difficulty ? difficulty.value : ''
  )
  return {
    ...item,
    coverUrl: buildTrackCoverUrl(song),
    rankIconUrl: buildRankIconUrl(item.rank),
    medalUrl: buildPlayMedalUrl(item, chartLevel ? chartLevel.maxPercent : 0),
    songName,
    titleSize: buildTitleSize(songName),
    songArtist: pickI18nText(item.song && item.song.artist) || '-',
    difficultyLabel: difficulty ? difficulty.label || difficulty.value.toUpperCase() : '-',
    difficultyTone: buildDifficultyTone(difficulty),
    chartLevel: chartLevel ? chartLevel.level : '',
    chartLevelNum: chartLevel ? chartLevel.levelNum : 0,
    chartLevelText: formatChartLevel(chartLevel),
    dateText: formatApiDate(item.play_date),
    badges: buildPlayBadges(item),
    scoreRows: buildScoreRows(item.score_detail),
    scoreOpen: false,
  }
}

