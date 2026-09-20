import dayjs from 'dayjs'

/**
 * 全站统一的时间展示格式。
 *
 * <p>接口传的是带时区的 ISO 8601，展示统一走这里，不要在各页面各写各的。
 *
 * @param value ISO 8601 字符串、Date 或空值
 * @returns `2026-03-01 10:00:00`；空值返回 `-`
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}
