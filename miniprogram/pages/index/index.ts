// index.ts
// 第一个功能：输入 API Key -> 获取个人资料（GET /api/v1/profiles）
import {
  fetchProfiles,
  readErrorMessage,
  toProfileView,
  Profile,
  ProfileView,
  ProfilesPayload,
} from '../../utils/api'

const API_KEY_STORAGE = 'maitea_api_key'

Component({
  data: {
    inputKey: '',
    loading: false,
    // 是否已通过校验并展示资料
    hasAuth: false,
    profiles: [] as ProfileView[],
  },
  lifetimes: {
    attached() {
      // 记住上次使用的 API Key，方便再次进入时快速获取（仍需要用户点击确认）
      const apiKey = wx.getStorageSync(API_KEY_STORAGE)
      if (typeof apiKey === 'string' && apiKey) {
        this.setData({ inputKey: apiKey })
      }
    },
  },
  methods: {
    // 输入框内容变化
    onApiKeyInput(e: WechatMiniprogram.Input) {
      this.setData({ inputKey: e.detail.value })
    },
    // 提交 API Key
    onSubmit() {
      const apiKey = this.data.inputKey.trim()
      if (!apiKey) {
        wx.showToast({ title: '请输入 API Key', icon: 'none' })
        return
      }
      wx.setStorageSync(API_KEY_STORAGE, apiKey)
      this.setData({ inputKey: apiKey })
      this.loadProfiles(apiKey)
    },
    // 重新输入 API Key
    onChangeApiKey() {
      wx.removeStorageSync(API_KEY_STORAGE)
      this.setData({
        hasAuth: false,
        profiles: [],
        inputKey: '',
      })
    },
    // 请求资料
    loadProfiles(apiKey: string) {
      if (this.data.loading) {
        return
      }
      this.setData({ loading: true })
      fetchProfiles(apiKey)
        .then((res) => {
          if (res.statusCode === 200) {
            const payload = res.data as ProfilesPayload
            const list = payload && Array.isArray(payload.data) ? payload.data : []
            this.setData({
              loading: false,
              hasAuth: true,
              profiles: list.map((profile: Profile) => toProfileView(profile)),
            })
            return
          }
          // 401 / 403 等：优先使用接口返回的 message
          this.onRequestFailed(
            readErrorMessage(res.data) || `请求失败（HTTP ${res.statusCode}）`
          )
        })
        .catch(() => {
          this.onRequestFailed('网络请求失败，请检查网络连接后重试')
        })
    },
    // 请求失败：弹窗提示并回到 API Key 输入状态
    onRequestFailed(message: string) {
      wx.removeStorageSync(API_KEY_STORAGE)
      this.setData({
        loading: false,
        hasAuth: false,
        profiles: [],
      })
      wx.showModal({
        title: '获取失败',
        content: `${message}\n请重新输入 API Key。`,
        showCancel: false,
        confirmText: '重新输入',
      })
    },
  },
})
