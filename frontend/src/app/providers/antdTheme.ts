import { theme, type ThemeConfig } from 'antd'

/** Mirrors the CSS custom properties in `index.css` so Ant Design and Tailwind utilities render the same palette. */
const LIGHT = {
  primary: '#0f8a5f',
  primaryHover: '#0c7350',
  success: '#0e9f6e',
  warning: '#b45309',
  error: '#d32f2f',
  info: '#0e7490',
  surface: '#ffffff',
  surface2: '#f7faf9',
  surface3: '#eef4f2',
  canvas: '#f3f6f5',
  line: '#e1e9e6',
  lineStrong: '#cbd8d3',
  ink: '#10201b',
  muted: '#566864',
  subtle: '#869a95',
}

const DARK = {
  primary: '#2fd694',
  primaryHover: '#55e0a8',
  success: '#31c48d',
  warning: '#f0a83a',
  error: '#f87171',
  info: '#38bdf8',
  surface: '#101c18',
  surface2: '#14221d',
  surface3: '#1a2b25',
  canvas: '#08110e',
  line: '#223a32',
  lineStrong: '#2f4d43',
  ink: '#e7f3ee',
  muted: '#93aba2',
  subtle: '#6c8a80',
}

export function buildTheme(isDark: boolean, isArabic: boolean): ThemeConfig {
  const c = isDark ? DARK : LIGHT

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: c.primary,
      colorPrimaryHover: c.primaryHover,
      colorSuccess: c.success,
      colorWarning: c.warning,
      colorError: c.error,
      colorInfo: c.info,

      colorBgBase: c.surface,
      colorBgContainer: c.surface,
      colorBgElevated: isDark ? c.surface2 : c.surface,
      colorBgLayout: c.canvas,

      colorBorder: c.line,
      colorBorderSecondary: isDark ? c.line : c.surface3,

      colorText: c.ink,
      colorTextSecondary: c.muted,
      colorTextTertiary: c.subtle,
      colorTextPlaceholder: c.subtle,

      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,

      fontFamily: isArabic
        ? "'Cairo', 'Segoe UI', system-ui, Tahoma, Arial, sans-serif"
        : "'Inter', system-ui, -apple-system, 'Segoe UI', 'Cairo', Roboto, Arial, sans-serif",
      fontSize: 14,
      controlHeight: 36,
      controlHeightLG: 40,
      wireframe: false,
    },
    components: {
      Table: {
        headerBg: c.surface2,
        headerColor: c.muted,
        headerSplitColor: 'transparent',
        rowHoverBg: c.surface3,
        borderColor: c.line,
        cellPaddingBlock: 12,
        cellPaddingInline: 14,
      },
      Layout: {
        bodyBg: c.canvas,
        headerBg: c.surface,
        siderBg: isDark ? '#060d0b' : '#0c1a16',
        headerHeight: 60,
        headerPadding: '0 16px',
      },
      Menu: {
        darkItemBg: 'transparent',
        darkSubMenuItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(47,214,148,0.2)',
        darkItemColor: '#8fa89f',
        darkItemHoverColor: '#eef7f3',
        darkItemSelectedColor: '#ffffff',
        itemBorderRadius: 8,
        itemMarginInline: 8,
      },
      Card: { paddingLG: 20 },
      Modal: { titleFontSize: 16 },
      Tabs: { itemSelectedColor: c.primary, titleFontSize: 14 },
      Statistic: { contentFontSize: 22 },
      Input: { paddingBlock: 6 },
    },
  }
}
