// api.ts
// Maitea 开放接口封装，见 README.md
import { formatApiDate } from './util'

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
  // 头像：接口返回 icon_deka 时视为 DeKa 头像，只展示 DeKa 版本（不再展示小头像）
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
