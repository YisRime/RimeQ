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
      // 基础色
      main: 'var(--color-main)',
      sub: 'var(--color-sub)',
      dim: 'var(--color-dim)',
      // 品牌色
      primary: {
        DEFAULT: 'var(--primary-color)',
        hover: 'var(--primary-hover)',
        active: 'var(--primary-active)',
        soft: 'var(--primary-soft)',
        content: 'var(--primary-content)',
      }
    }
  },
  shortcuts: [
    // 文本颜色
    ['text-main', 'text-[var(--text-main)]'],
    ['text-sub', 'text-[var(--text-sub)]'],
    ['text-dim', 'text-[var(--text-dim)]'],
    // 定位辅助
    ['abs-center', 'absolute inset-0 m-auto'],
    // 布局辅助
    ['flex-center', 'flex items-center justify-center'],
    ['flex-between', 'flex items-center justify-between'],
    ['flex-x', 'flex items-center'],
    ['flex-y', 'flex flex-col items-center'],
    ['flex-truncate', 'flex-1 min-w-0'],
    ['flex-col-full', 'flex flex-col size-full'],
    // 通用动画
    ['my-trans', 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'],
    // 淡入淡出
    ['my-fade-enter-active', 'my-trans'],
    ['my-fade-leave-active', 'my-trans'],
    ['my-fade-enter-from', 'opacity-0 scale-98'],
    ['my-fade-leave-to', 'opacity-0 scale-102'],
    // 挤压
    ['my-squeeze', 'transition-all duration-300 ease-in-out overflow-hidden'],
    // 滑动
    ['my-slide-active', 'transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.5,1)]'],
    ['my-slide-hidden', 'translate-x-full'],
    // 交互反馈
    ['my-hover', 'hover:bg-dim cursor-pointer my-trans'],
    ['my-active', 'bg-primary-soft text-primary my-trans'],
    ['my-press', 'active:scale-95 select-none my-trans'],
    // 滚动条
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
