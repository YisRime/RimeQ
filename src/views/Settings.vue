<template>
  <div class="flex flex-col h-full w-full bg-gray-50 dark:bg-black">
    <!-- 头部 -->
    <header
      class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur flex items-center justify-between px-4 flex-shrink-0 z-10"
    >
      <div class="flex items-center gap-3">
        <!-- 移动端返回 -->
        <div class="md:hidden i-ri-arrow-left-s-line text-xl cursor-pointer" @click="router.back()" />
        <span class="font-bold text-lg text-gray-800 dark:text-gray-100">设置</span>
      </div>

      <n-button type="error" size="small" secondary @click="handleLogout">
        <template #icon><div class="i-ri-logout-box-line" /></template>
        退出登录
      </n-button>
    </header>

    <!-- 内容滚动区 -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
      <div
        class="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
      >
        <n-tabs type="line" animated class="px-6 py-4">
          <!-- 通用设置 -->
          <n-tab-pane name="general" tab="通用">
            <n-form label-placement="left" label-width="auto" class="mt-4 max-w-lg">
              <n-form-item label="自动连接">
                <n-switch v-model:value="config.autoConnect">
                  <template #checked>开启</template>
                  <template #unchecked>关闭</template>
                </n-switch>
                <div class="text-xs text-gray-400 ml-3">启动时自动登录上次账号</div>
              </n-form-item>

              <n-form-item label="记住密码">
                <n-switch v-model:value="config.remember" />
              </n-form-item>

              <n-divider />

              <n-form-item label="日志级别">
                <n-select v-model:value="config.logLevel" :options="logOptions" size="small" class="w-32" />
              </n-form-item>
            </n-form>
          </n-tab-pane>

          <!-- 外观设置 -->
          <n-tab-pane name="theme" tab="外观">
            <n-form label-placement="top" class="mt-4">
              <n-grid :cols="1" :y-gap="24">
                <n-form-item-gi label="深色模式">
                  <div class="flex items-center gap-4">
                    <n-switch v-model:value="config.darkMode" />
                    <span class="text-xs text-gray-400">强制开启深色主题</span>
                  </div>
                </n-form-item-gi>

                <n-form-item-gi label="聊天背景图 (URL)">
                  <n-input v-model:value="config.bgImage" placeholder="https://..." clearable>
                    <template #prefix><div class="i-ri-image-line text-gray-400" /></template>
                  </n-input>
                </n-form-item-gi>

                <n-form-item-gi label="背景模糊度 (px)">
                  <div class="w-full max-w-md flex items-center gap-4">
                    <n-slider v-model:value="config.bgBlur" :min="0" :max="20" class="flex-1" />
                    <span class="w-8 text-right">{{ config.bgBlur }}</span>
                  </div>
                </n-form-item-gi>
              </n-grid>
            </n-form>
          </n-tab-pane>

          <!-- 高级设置 -->
          <n-tab-pane name="advanced" tab="高级">
            <n-form class="mt-4">
              <n-form-item label="防撤回 (本地拦截)">
                <div class="flex flex-col gap-1">
                  <n-switch v-model:value="config.antiRecall" />
                  <span class="text-xs text-gray-400">拦截撤回指令，仅在本地保留消息，重启后失效</span>
                </div>
              </n-form-item>

              <n-form-item label="自定义 CSS">
                <n-input
                  v-model:value="config.css"
                  type="textarea"
                  placeholder="/* 输入 CSS 代码覆盖样式 */"
                  :rows="6"
                  class="font-mono text-xs"
                />
              </n-form-item>

              <n-divider />

              <div class="flex gap-4">
                <n-button @click="printConfig">打印配置到控制台</n-button>
                <n-button type="warning" @click="resetApp">重置应用</n-button>
              </div>
            </n-form>
          </n-tab-pane>

          <!-- 关于 -->
          <n-tab-pane name="about" tab="关于">
            <div class="flex flex-col items-center py-8">
              <div class="i-ri-radar-line text-6xl text-primary mb-4" />
              <h2 class="text-2xl font-bold">WebQQ Refactored</h2>
              <p class="text-gray-400 mt-2">v2.0.0 (Dev)</p>
              <div class="mt-6">
                <n-button tag="a" href="https://github.com/YisRime/WebQQ" target="_blank" secondary>
                  <template #icon><div class="i-ri-github-fill" /></template>
                  GitHub
                </n-button>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  NButton,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NSwitch,
  NInput,
  NGrid,
  NFormItemGi,
  NSlider,
  NDivider,
  NSelect,
  useDialog,
  useMessage
} from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'
import { useAccountsStore } from '@/stores/accounts'

defineOptions({ name: 'SettingView' })

const router = useRouter()
const dialog = useDialog()
const message = useMessage()

// Stores
const settingsStore = useSettingsStore()
const accountsStore = useAccountsStore()
const config = settingsStore.config

const logOptions = [
  { label: 'Error', value: 'error' },
  { label: 'Info', value: 'info' },
  { label: 'Debug', value: 'debug' }
]

// Actions
const handleLogout = () => {
  dialog.warning({
    title: '确认退出',
    content: '确定要断开连接吗？将返回登录页面。',
    positiveText: '退出',
    negativeText: '取消',
    onPositiveClick: () => {
      accountsStore.logout()
      router.push('/login')
    }
  })
}

const printConfig = () => {
  console.log('Current Config:', JSON.parse(JSON.stringify(config.value)))
  message.success('已打印至控制台')
}

const resetApp = () => {
  dialog.error({
    title: '危险操作',
    content: '这将清空所有本地缓存（包括聊天记录和配置），确定继续吗？',
    positiveText: '确认重置',
    negativeText: '取消',
    onPositiveClick: () => {
      localStorage.clear()
      window.location.reload()
    }
  })
}
</script>
