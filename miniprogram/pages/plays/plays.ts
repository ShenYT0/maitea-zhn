// plays.ts
// 点击首页的用户卡片，查看该账号的游玩记录（GET /api/v1/plays，分页，默认第一页）
import {
  fetchPlays,
  fetchProfiles,
  readErrorMessage,
  readPlaysMeta,
  toPlaysList,
  toPlayView,
  buildProfileHeader,
  PlayItem,
  PlayItemView,
  Profile,
  ProfileHeaderView,
  ProfilesPayload,
} from '../../utils/api'

const API_KEY_STORAGE = 'maitea_api_key'

/** 页面数据 */
interface PlaysData {
  /** 账号 id（接口参数 profile） */
  profileId: number
  /** 账号名，展示在列表头部与导航栏标题 */
  profileName: string
  /** 顶部玩家身份卡（头像 + 铭牌：LV / Rating / 玩家名），获取失败时为 null */
  profile: ProfileHeaderView | null
  pageTitle: string
  /** 当前页，从 1 开始 */
  page: number
  /** 首页返回的每页条数，用于判断是否还有下一页 */
  pageSize: number
  /** 总页数（meta.last_page，接口未返回时为 0） */
  lastPage: number
  /** 总条数（meta.total，接口未返回时为 0） */
  total: number
  plays: PlayItemView[]
  loading: boolean
  /** 是否还有下一页 */
  hasNext: boolean
  canPrev: boolean
  canNext: boolean
  pagerText: string
  /** 列表头部文案：共 N 条 */
  totalText: string
  /** 跳页输入框内容（只保留数字） */
  jumpPage: string
  /** 是否可以跳转指定页（非加载中且有多页） */
  canJump: boolean
  /** 中间区域是否处于跳页编辑态（点「第 x / n 页」进入） */
  pagerEditing: boolean
  /** 进入编辑态时自动聚焦输入框 */
  jumpFocus: boolean
  error: string
  /** 翻页后回到列表顶部用的锚点 */
  scrollAnchor: string
  /** 翻页后回到列表顶部用的滚动位置（在 0 / 1 之间切换以触发更新） */
  scrollTop: number
  /** 首次加载：游玩记录是否已就绪（成功或失败均算） */
  listReady: boolean
  /** 首次加载：顶部身份卡（/profiles）是否已就绪 */
  profileReady: boolean
  /** 首次加载整体就绪（listReady && profileReady）：就绪后才统一展示头像/铭牌 + 列表 */
  ready: boolean
}

const initialData: PlaysData = {
  profileId: 0,
  profileName: '',
  profile: null,
  pageTitle: '游玩记录',
  page: 1,
  pageSize: 0,
  lastPage: 0,
  total: 0,
  plays: [],
  loading: false,
  hasNext: false,
  canPrev: false,
  canNext: false,
  pagerText: '第 1 页',
  totalText: '',
  jumpPage: '',
  canJump: false,
  pagerEditing: false,
  jumpFocus: false,
  error: '',
  scrollAnchor: '',
  scrollTop: 0,
  listReady: false,
  profileReady: false,
  ready: false,
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
    // 进入页面：默认加载第一页，同时异步补齐顶部玩家身份卡（头像 + 铭牌）
    onLoad(query: Record<string, string | undefined>) {
      const profileId = Number((query && query.profileId) || 0) || 0
      const profileName = readQueryText(query && query.name)
      this.setData({
        profileId,
        profileName,
        pageTitle: profileName ? `${profileName} 的游玩记录` : '游玩记录',
      })
      this.loadPage(1)
      this.loadProfileHeader()
    },
    // 拉取该账号的资料，构建顶部身份卡（失败时静默，不阻塞列表）
    loadProfileHeader() {
      const apiKey = wx.getStorageSync(API_KEY_STORAGE)
      // 无论成败都标记身份卡就绪；列表就绪后统一放行展示
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
            let matchedProfile: Profile | null = null
            for (let i = 0; i < list.length; i++) {
              if (Number(list[i].id) === this.data.profileId) {
                matchedProfile = list[i]
                break
              }
            }
            if (matchedProfile) {
              this.setData({ profile: buildProfileHeader(matchedProfile) })
            }
          }
        })
        .catch(() => {})
        .then(finish)
    },
    // 上一页
    onPrevPage() {
      if (this.data.loading || this.data.page <= 1) {
        return
      }
      this.loadPage(this.data.page - 1)
    },
    // 下一页
    onNextPage() {
      if (this.data.loading || !this.data.hasNext) {
        return
      }
      this.loadPage(this.data.page + 1)
    },
    // 点中间「第 x / n 页」进入跳页编辑态（多页且非加载中），自动聚焦
    onBeginJump() {
      if (this.data.loading || this.data.lastPage <= 1) {
        return
      }
      this.setData({ pagerEditing: true, jumpFocus: true, jumpPage: '' })
    },
    // 取消跳页：恢复显示「第 x / n 页」
    onCancelJump() {
      this.setData({ pagerEditing: false, jumpFocus: false, jumpPage: '' })
    },
    // 跳页输入：只保留数字，最多 5 位（return 值会替换输入框内容，过滤数字键盘的小数点等）
    onJumpInput(e: { detail: { value: string } }): string {
      const raw = String((e && e.detail && e.detail.value) || '')
      const digits = raw.replace(/[^\d]/g, '').slice(0, 5)
      if (digits !== this.data.jumpPage) {
        this.setData({ jumpPage: digits })
      }
      return digits
    },
    // 跳页确认：校验范围后加载指定页（也响应键盘「前往」），成功后退出编辑态
    onJumpConfirm(e?: { detail?: { value?: string } }) {
      if (this.data.loading) {
        return
      }
      const lastPage = this.data.lastPage
      if (lastPage <= 1) {
        return
      }
      // 键盘 confirm 时 detail.value 才是输入框最新值，点击按钮时读 data
      const raw =
        e && e.detail && e.detail.value !== undefined
          ? String(e.detail.value)
          : this.data.jumpPage
      const digits = raw.replace(/[^\d]/g, '')
      const target = Number(digits)
      if (!digits || !isFinite(target) || target < 1) {
        wx.showToast({ title: '请输入要跳转的页码', icon: 'none' })
        return
      }
      if (target > lastPage) {
        wx.showToast({ title: `最多 ${lastPage} 页`, icon: 'none' })
        return
      }
      if (target === this.data.page) {
        wx.showToast({ title: `已经在第 ${target} 页`, icon: 'none' })
        return
      }
      this.setData({ jumpPage: '', pagerEditing: false, jumpFocus: false })
      this.loadPage(target)
    },
    // 加载指定页
    loadPage(page: number) {
      if (this.data.loading) {
        return
      }
      const apiKey = wx.getStorageSync(API_KEY_STORAGE)
      if (typeof apiKey !== 'string' || !apiKey) {
        this.setData(
          this.pagerData({ loading: false, listReady: true, error: '未找到 API Key，请返回首页重新输入' })
        )
        return
      }
      if (!this.data.profileId) {
        this.setData(
          this.pagerData({ loading: false, listReady: true, error: '缺少账号信息，请返回首页重新进入' })
        )
        return
      }
      this.setData(this.pagerData({ loading: true, error: '' }))
      fetchPlays(apiKey, this.data.profileId, page)
        .then((res) => {
          if (res.statusCode !== 200) {
            this.onRequestFailed(res.statusCode, readErrorMessage(res.data))
            return
          }
          const list = toPlaysList(res.data)
          const meta = readPlaysMeta(res.data)
          // 非第一页返回空：说明已经到底，保持当前页并提示
          if (page > 1 && list.length === 0) {
            this.setData(this.pagerData({ loading: false, listReady: true, hasNext: false }))
            wx.showToast({ title: '已经是最后一页了', icon: 'none' })
            return
          }
          // 优先使用接口的 meta 分页信息；缺失时退化为「按第一页条数判断」
          const pageSize =
            meta && meta.per_page > 0 ? meta.per_page : page === 1 ? list.length : this.data.pageSize
          const lastPage = meta ? meta.last_page : 0
          const total = meta ? meta.total : 0
          this.setData(
            this.pagerData({
              loading: false,
              page: meta && meta.current_page > 0 ? meta.current_page : page,
              pageSize,
              lastPage,
              total,
              listReady: true,
              plays: list.map((item: PlayItem) => toPlayView(item)),
              jumpPage: '',
              // 任何成功的翻页 / 跳页都退出编辑态，恢复显示「第 x / n 页」
              pagerEditing: false,
              jumpFocus: false,
              hasNext: lastPage > 0 ? page < lastPage : pageSize > 0 && list.length >= pageSize,
              scrollAnchor: '',
              // 0 / 1 交替：保证每次翻页都能触发「回到顶部」
              scrollTop: this.data.scrollTop === 0 ? 1 : 0,
            })
          )
          // 回到列表顶部
          wx.nextTick(() => {
            this.setData({ scrollAnchor: 'plays-top' })
          })
        })
        .catch(() => {
          this.setData(this.pagerData({ loading: false, listReady: true }))
          wx.showToast({ title: '网络请求失败，请稍后重试', icon: 'none' })
        })
    },
    // 封面加载失败（曲目无封面时接口返回 404）：清空该条地址，露出占位块
    onCoverError(e: { currentTarget: { dataset: { index?: number } } }) {
      const index = Number(e.currentTarget.dataset.index)
      if (!isFinite(index) || index < 0 || index >= this.data.plays.length) {
        return
      }
      this.setData({ [`plays[${index}].coverUrl`]: '' })
    },
    // 评级徽章加载失败：清空该条地址，回退为文字评级
    onRankIconError(e: { currentTarget: { dataset: { index?: number } } }) {
      const index = Number(e.currentTarget.dataset.index)
      if (!isFinite(index) || index < 0 || index >= this.data.plays.length) {
        return
      }
      this.setData({ [`plays[${index}].rankIconUrl`]: '' })
    },
    // 奖章图片加载失败：清空该条地址，只保留评级
    onMedalError(e: { currentTarget: { dataset: { index?: number } } }) {
      const index = Number(e.currentTarget.dataset.index)
      if (!isFinite(index) || index < 0 || index >= this.data.plays.length) {
        return
      }
      this.setData({ [`plays[${index}].medalUrl`]: '' })
    },
    // 展开 / 收起判定详情抽屉（score_detail 表格）
    onToggleScore(e: { currentTarget: { dataset: { index?: number } } }) {
      const index = Number(e.currentTarget.dataset.index)
      if (!isFinite(index) || index < 0 || index >= this.data.plays.length) {
        return
      }
      const item = this.data.plays[index]
      if (!item || item.scoreRows.length === 0) {
        return
      }
      this.setData({ [`plays[${index}].scoreOpen`]: !item.scoreOpen })
    },
    // 请求失败：401/403 弹窗后返回，其它错误就地提示
    onRequestFailed(statusCode: number, message: string) {
      const text = message || `请求失败（HTTP ${statusCode}）`
      this.setData(this.pagerData({ loading: false, listReady: true, error: text }))
      if (statusCode === 401 || statusCode === 403) {
        wx.showModal({
          title: '无法查看游玩记录',
          content: text,
          showCancel: false,
          confirmText: '返回首页',
          success: () => {
            wx.navigateBack()
          },
        })
        return
      }
      wx.showToast({ title: text, icon: 'none' })
    },
    // 合并补丁并同步翻页按钮可用性与页码文案
    pagerData(patch: Partial<PlaysData>): Partial<PlaysData> {
      const next: PlaysData = { ...(this.data as PlaysData), ...patch }
      return {
        ...patch,
        canPrev: !next.loading && next.page > 1,
        canNext: !next.loading && next.hasNext,
        canJump: !next.loading && next.lastPage > 1,
        ready: next.listReady && next.profileReady,
        pagerText: next.loading
          ? '加载中…'
          : next.lastPage > 0
          ? `第 ${next.page} / ${next.lastPage} 页`
          : `第 ${next.page} 页`,
        totalText: next.total > 0 ? `共 ${next.total} 条` : '',
      }
    },
  },
})
