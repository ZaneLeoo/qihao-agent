import { createTheme } from '@mantine/core'
import type { MantineColorsTuple } from '@mantine/core'

/**
 * 品牌色阶（10 级，索引 6 为基准色）。
 *
 * <p>偏深的商务蓝，比 Mantine 出厂蓝更沉稳，接近企业后台的常见观感。
 */
const brand: MantineColorsTuple = [
  '#eef4ff',
  '#dbe6fe',
  '#b9cdfe',
  '#94b1fb',
  '#7398f9',
  '#5d87f7',
  '#4f7cf7',
  '#3f6ade',
  '#345dc6',
  '#254eae',
]

/**
 * 全局主题。
 *
 * <p>出厂默认过于松散：留白大、边框浅、表头无底色，整体缺乏层次。
 * 这里主要在三个方向上收紧——密度、边框与阴影的层次、表头与导航的视觉锚点。
 */
export const theme = createTheme({
  primaryColor: 'brand',
  colors: { brand },
  defaultRadius: 'sm',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif',
  headings: {
    fontWeight: '600',
    sizes: {
      h3: { fontSize: '1.25rem', lineHeight: '1.4' },
      h5: { fontSize: '1rem', lineHeight: '1.4' },
      h6: { fontSize: '0.9375rem', lineHeight: '1.4' },
    },
  },
  components: {
    Card: {
      defaultProps: { withBorder: true, shadow: 'xs', padding: 'md' },
    },
    Table: {
      defaultProps: {
        highlightOnHover: true,
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
      styles: {
        th: {
          backgroundColor: 'var(--mantine-color-gray-0)',
          color: 'var(--mantine-color-gray-7)',
          fontWeight: '600',
          fontSize: 'var(--mantine-font-size-xs)',
          whiteSpace: 'nowrap',
        },
      },
    },
    NavLink: {
      defaultProps: { variant: 'light' },
      styles: {
        root: { borderRadius: 'var(--mantine-radius-sm)' },
        label: { fontSize: 'var(--mantine-font-size-sm)' },
      },
    },
    Button: {
      defaultProps: { radius: 'sm' },
    },
    Badge: {
      defaultProps: { radius: 'sm' },
    },
    TextInput: {
      defaultProps: { radius: 'sm' },
    },
  },
})
