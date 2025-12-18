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
        'color': 'currentColor',
      },
    }),
  ],

  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],

  shortcuts: [
    ['wh-full', 'w-full h-full'],
    ['flex-col-full', 'flex flex-col w-full h-full'],

    ['flex-center', 'flex items-center justify-center'],
    ['flex-x-center', 'flex items-center'],
    ['flex-between', 'flex items-center justify-between'],

    ['flex-truncate', 'flex-1 min-w-0'],

    ['text-main', 'text-[var(--n-text-color)]'],
    ['text-sub', 'text-[var(--n-text-color-2)]'],
    ['text-dim', 'text-[var(--n-text-color-3)]'],
  ]
})
