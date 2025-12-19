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
    ['abs-center', 'absolute inset-50% -translate-50%'],
    ['flex-center', 'flex items-center justify-center'],
    ['flex-between', 'flex items-center justify-between'],

    ['flex-x', 'flex items-center'],
    ['flex-y', 'flex flex-col items-center'],
    ['flex-truncate', 'flex-1 min-w-0'],
    ['flex-col-full', 'flex-col size-full'],
  ]
})
