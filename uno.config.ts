import { defineConfig, presetWind3, presetIcons, presetAttributify, presetTypography, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetTypography(),
    presetIcons({
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  theme: {
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    colors: {
      // 品牌色
      primary: {
        DEFAULT: 'var(--primary-color)',
        hover: 'var(--primary-hover)',
        active: 'var(--primary-active)',
        soft: 'var(--primary-soft)',
        content: 'var(--primary-content)',
      },
      // UI 背景色
      background: {
        main: 'var(--color-main)',
        sub: 'var(--color-sub)',
        dim: 'var(--color-dim)',
      },
      // UI 前景色
      foreground: {
        main: 'var(--text-main)',
        sub: 'var(--text-sub)',
        dim: 'var(--text-dim)',
      },
    },
    animation: {
      keyframes: {
        'fade-in': `{ from { opacity: 0; } to { opacity: 1; } }`,
        'fade-out': `{ from { opacity: 1; } to { opacity: 0; } }`,
        'scale-in': `{ from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`,
        'scale-out': `{ from { transform: scale(1); opacity: 1; } to { transform: scale(0.95); opacity: 0; } }`,
        'slide-in-up': `{ from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`,
        'slide-in-down': `{ from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`,
        'slide-out-up': `{ from { transform: translateY(0); opacity: 1; } to { transform: translateY(-20px); opacity: 0; } }`,
        'slide-out-down': `{ from { transform: translateY(0); opacity: 1; } to { transform: translateY(20px); opacity: 0; } }`,
        'slide-in-left': `{ from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`,
        'slide-in-right': `{ from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`,
        'slide-out-left': `{ from { transform: translateX(0); opacity: 1; } to { transform: translateX(-20px); opacity: 0; } }`,
        'slide-out-right': `{ from { transform: translateX(0); opacity: 1; } to { transform: translateX(20px); opacity: 0; } }`,
      }
    }
  },
  shortcuts: [
    // 颜色
    [/^ui-bg-(.+)$/, ([, c]) => `bg-${c.replace('.', '-')} transition-colors`],
    [/^ui-text-(.+)$/, ([, c]) => `text-${c.replace('.', '-')} transition-colors`],
    [/^ui-border-(.+)$/, ([, c]) => `border-${c.replace('.', '-')} transition-colors`],
    // 布局
    ['ui-flex-center', 'flex items-center justify-center'],
    ['ui-flex-between', 'flex items-center justify-between'],
    ['ui-flex-x', 'flex items-center'],
    ['ui-flex-y', 'flex flex-col items-center justify-center'],
    // 尺寸
    ['ui-flex-truncate', 'flex-1 min-w-0'],
    ['ui-flex-col-full', 'flex flex-col size-full'],
    // 定位
    ['ui-abs-full', 'absolute inset-0'],
    ['ui-abs-center', 'absolute inset-0 m-auto'],
    // 动画
    ['ui-trans', 'transition-all ease-[cubic-bezier(0.4,0,0.2,1)]'],
    ['ui-dur-fast', 'duration-150'],
    ['ui-dur-normal', 'duration-300'],
    ['ui-dur-slow', 'duration-500'],
    // 淡入淡出
    ['ui-anim-fade-in', 'animate-fade-in'],
    ['ui-anim-fade-out', 'animate-fade-out'],
    // 缩放显隐
    ['ui-anim-scale-in', 'animate-scale-in'],
    ['ui-anim-scale-out', 'animate-scale-out'],
    // 垂直滑动
    ['ui-anim-slide-in-up', 'animate-slide-in-up'],
    ['ui-anim-slide-in-down', 'animate-slide-in-down'],
    ['ui-anim-slide-out-up', 'animate-slide-out-up'],
    ['ui-anim-slide-out-down', 'animate-slide-out-down'],
    // 水平滑动
    ['ui-anim-slide-in-left', 'animate-slide-in-left'],
    ['ui-anim-slide-in-right', 'animate-slide-in-right'],
    ['ui-anim-slide-out-left', 'animate-slide-out-left'],
    ['ui-anim-slide-out-right', 'animate-slide-out-right'],
    // 交互
    ['ui-ia', 'cursor-pointer select-none ui-trans ui-dur-fast'],
    ['ui-ia-hover', 'ui-ia hover:ui-bg-background-dim'],
    ['ui-ia-press', 'active:scale-95'],
    // 滚动条
    ['ui-scrollbar', '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'],
  ]
})
