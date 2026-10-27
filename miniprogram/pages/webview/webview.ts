// webview.ts
// 内嵌打开外部网页：auth-tip 里的 maitea.app 超链接跳转到本页
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
  data: {
    url: '',
  },
  methods: {
    // 读取 URL 参数并校验为 https 链接
    onLoad(query: Record<string, string | undefined>) {
      const url = readQueryText(query && query.url)
      this.setData({ url: /^https:\/\//i.test(url) ? url : '' })
    },
    // web-view 加载失败（业务域名未配置等）：提示复制链接到浏览器打开
    onWebviewError() {
      wx.showModal({
        title: '页面打开失败',
        content: '无法在小程序内打开 maitea.app，复制链接到浏览器访问',
        showCancel: false,
        confirmText: '复制链接',
        success: () => {
          wx.setClipboardData({ data: 'https://maitea.app' })
        },
      })
    },
  },
})
