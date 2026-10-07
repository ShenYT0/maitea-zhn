export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

/**
 * 将接口返回的 ISO 时间（如 2023-01-01T00:00:00.000000Z）格式化为 2023-01-01 00:00:00
 * 部分 JS 引擎无法解析 6 位微秒，因此这里手动截取，避免时区/兼容问题
 */
export const formatApiDate = (date: string): string => {
  if (!date) {
    return '-'
  }
  const matched = date.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!matched) {
    return date
  }
  return `${matched[1]}-${matched[2]}-${matched[3]} ${matched[4]}:${matched[5]}:${matched[6]}`
}
