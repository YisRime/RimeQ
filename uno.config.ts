import { defineConfig, presetWind3, presetIcons, presetAttributify, presetTypography, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetTypography(),
    presetIcons({
      scale: 1.2,
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
    colors: {
      primary: 'var(--primary-color)',
      main: 'var(--color-main)',
      sub: 'var(--color-sub)',
      dim: 'var(--color-dim)',
    }
  },

  shortcuts: [
    // 文本颜色
    ['text-main', 'text-[var(--text-main)]'],
    ['text-sub', 'text-[var(--text-sub)]'],
    ['text-dim', 'text-[var(--text-dim)]'],

    // 定位辅助
    ['abs-center', 'absolute inset-50% -translate-50%'],

    // 布局辅助
    ['flex-center', 'flex items-center justify-center'],
    ['flex-between', 'flex items-center justify-between'],
    ['flex-x', 'flex items-center'],
    ['flex-y', 'flex flex-col items-center'],
    ['flex-truncate', 'flex-1 min-w-0'],
    ['flex-col-full', 'flex-col size-full'],

    // 动画过渡
    ['my-trans', 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'],

    // 交互反馈
    ['my-hover', 'hover:bg-dim cursor-pointer my-trans'],
    ['my-press', 'active:scale-95 select-none my-trans'],

    // 滚动条样式
    ['my-scrollbar', `
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar]:h-1.5
      [&::-webkit-scrollbar-track]:bg-transparent
      [&::-webkit-scrollbar-thumb]:bg-dim/60
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb:hover]:bg-dim
    `],
  ]
})
