import { createTheme } from '@mantine/core'

/** 全局主题：只在这里定一次，业务组件不写死色值。 */
export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
})
