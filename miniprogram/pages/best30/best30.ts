// best30.ts
// Best30：GET /api/v1/scores/all 获取全部最佳成绩，结合 charts-levels 反查定数/maxPercent，
// 用 scripts/maimai-rate.ts 的算法计算 rate，按 rate 从高到低取前 30。
import {
  fetchBestScores,
  fetchProfiles,
  toBestScoresList,
  toBestScoreView,
  buildProfileHeader,
  readErrorMessage,
  BestScore,
  BestScoreView,
  Profile,
  ProfileHeaderView,
  ProfilesPayload,
} from '../../utils/api'
import { createBest30ShareFile, shareBest30Image } from '../../utils/best30-share'

const API_KEY_STORAGE = 'maitea_api_key'

/** 页面数据 */
interface Best30Data {
  profileId: number
  profileName: string
  /** 顶部简化版玩家卡（头像 + 铭牌），获取失败时为 null */
  profile: ProfileHeaderView | null
  /** 成绩列表是否就绪（成功或失败均算） */
  listReady: boolean
  /** 身份卡是否就绪 */
  profileReady: boolean
  /** 首次加载整体就绪（listReady && profileReady）：就绪后才统一展示 */
  ready: boolean
  /** 前 30 条最佳成绩（rate 从高到低） */
  best: BestScoreView[]
  /** 是否正在生成分享图（期间按钮置灰） */
  sharing: boolean
  loading: boolean
  error: string
  pageTitle: string
}

const initialData: Best30Data = {
  profileId: 0,
  profileName: '',
  profile: null,
  listReady: false,
  profileReady: false,
  ready: false,
  best: [],
  sharing: false,
  loading: false,
  error: '',
  pageTitle: 'Best30',
}

/** 读取 URL 参数文本：兼容框架已解码 / 未解码两种情况 */
const readQueryText = (raw?: string): string => {
  if (!raw) {
    return ''
  }
  if (!/%[0-9a-fA-F]{2}/.test(raw)) {
    return raw
  }
  try {
    return decodeURIComponent(raw)
  } catch (e) {
    return raw
  }
}

Component({
  data: initialData,
  methods: {
    onLoad(query: Record<string, string | undefined>) {
      const profileId = Number((query && query.profileId) || 0) || 0
      const profileName = readQueryText(query && query.name)
      this.setData({
        profileId,
        profileName,
        pageTitle: `${profileName || 'MAITEA'}的B30`,
      })
      this.loadBest30()
      this.loadProfileHeader()
    },
    // 顶部简化版玩家卡：与该账号最大 rating 相同（复用 buildProfileHeader）
    loadProfileHeader() {
      const apiKey = wx.getStorageSync(API_KEY_STORAGE)
      const finish = () => {
        if (this.data.profileReady) {
          return
        }
        this.setData({
          profileReady: true,
          ready: this.data.listReady,
        })
      }
      if (typeof apiKey !== 'string' || !apiKey || !this.data.profileId) {
        finish()
        return
      }
      fetchProfiles(apiKey)
        .then((res) => {
          if (res.statusCode === 200) {
            const payload = res.data as ProfilesPayload
            const list = payload && Array.isArray(payload.data) ? payload.data : []
            let found: Profile | null = null
            for (let i = 0; i < list.length; i++) {
              if (Number(list[i].id) === this.data.profileId) {
                found = list[i]
                break
              }
            }
            if (found) {
              this.setData({ profile: buildProfileHeader(found) })
            }
          }
        })
        .catch(() => {})
        .then(finish)
    },
    // 获取全部最佳成绩 → 计算 rate → 从高到低取前 30
    loadBest30() {
      if (this.data.loading) {
        return
      }
      const apiKey = wx.getStorageSync(API_KEY_STORAGE)
      if (typeof apiKey !== 'string' || !apiKey) {
        this.markListDone(true, '未找到 API Key，请返回首页重新输入')
        return
      }
      if (!this.data.profileId) {
        this.markListDone(true, '缺少账号信息，请返回首页重新进入')
        return
      }
      this.setData({ loading: true, error: '' })
      fetchBestScores(apiKey, this.data.profileId)
        .then((res) => {
          if (res.statusCode !== 200) {
            this.markListDone(
              true,
              readErrorMessage(res.data) || `请求失败（HTTP ${res.statusCode}）`
            )
            return
          }
          const best = toBestScoresList(res.data)
            .map((item: BestScore) => toBestScoreView(item))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 30)
          this.setData({
            loading: false,
            best,
            listReady: true,
            ready: this.data.profileReady,
          })
        })
        .catch(() => {
          this.markListDone(true, '网络请求失败，请稍后重试')
        })
    },
    // 列表结束（成功或失败）：标记 listReady 并联动 ready
    markListDone(listReady: boolean, error?: string) {
      this.setData({
        loading: false,
        listReady,
        error: error || '',
        ready: listReady && this.data.profileReady,
      })
    },
    // 封面加载失败：清空该条地址，露出占位块
    onCoverError(e: { currentTarget: { dataset: { index?: number } } }) {
      const index = Number(e.currentTarget.dataset.index)
      if (!isFinite(index) || index < 0 || index >= this.data.best.length) {
        return
      }
      this.setData({ [`best[${index}].coverUrl`]: '' })
    },
    // 评级图标加载失败：清空该条地址，回退为文字评级
    onRankIconError(e: { currentTarget: { dataset: { index?: number } } }) {
      const index = Number(e.currentTarget.dataset.index)
      if (!isFinite(index) || index < 0 || index >= this.data.best.length) {
        return
      }
      this.setData({ [`best[${index}].rankIconUrl`]: '' })
    },
    // 奖章图片加载失败：清空该条地址，露出菱形占位
    onMedalError(e: { currentTarget: { dataset: { index?: number } } }) {
      const index = Number(e.currentTarget.dataset.index)
      if (!isFinite(index) || index < 0 || index >= this.data.best.length) {
        return
      }
      this.setData({ [`best[${index}].medalUrl`]: '' })
    },
    // 导出分享图：离屏 canvas 绘制后生成临时文件并进入微信分享界面
    onShareBest30() {
      if (this.data.sharing) {
        return
      }
      if (this.data.best.length === 0) {
        wx.showToast({ title: '暂无可导出的成绩', icon: 'none' })
        return
      }
      this.setData({ sharing: true })
      wx.showLoading({ title: '生成中…', mask: true })
      wx.createSelectorQuery()
        .in(this)
        .select('#share-canvas')
        .fields({ node: true })
        .exec((res: any[]) => {
          const canvasNode = res && res[0] && res[0].node
          if (!canvasNode) {
            wx.hideLoading()
            this.setData({ sharing: false })
            wx.showToast({ title: '画布初始化失败', icon: 'none' })
            return
          }
          createBest30ShareFile(canvasNode, {
            profile: this.data.profile,
            best: this.data.best,
          })
            .then((tempFilePath: string) => {
              wx.hideLoading()
              this.setData({ sharing: false })
              // 导出完成：直接进入分享（showShareImageMenu 菜单自带「发送给朋友/收藏/下载保存」）
              shareBest30Image(tempFilePath)
            })
            .catch(() => {
              wx.hideLoading()
              this.setData({ sharing: false })
              wx.showToast({ title: '生成失败，请重试', icon: 'none' })
            })
        })
    },
  },
})
