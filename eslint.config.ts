import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    rules: {
      // 降低 any 报错等级
      '@typescript-eslint/no-explicit-any': 'warn',
      // 关闭非空断言警告
      '@typescript-eslint/no-non-null-assertion': 'off',
      // 允许 ts-ignore 带描述
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
      // 强制使用 import type
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],

      // 允许 v-html
      'vue/no-v-html': 'off',
      // 允许单个单词
      'vue/multi-word-component-names': 'off',

      // 强制使用严格等于
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      // 生产环境自动移除 console 和 debugger
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-console': process.env.NODE_ENV === 'production' ? ['warn', { allow: ['warn', 'error'] }] : 'off',
    }
  },

  skipFormatting,
)
