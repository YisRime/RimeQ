<template>
  <div class="flex flex-col h-full w-full bg-gray-50 dark:bg-black overflow-hidden">
    <!-- Header -->
    <header
      class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur flex items-center justify-between px-4 flex-shrink-0 z-10"
    >
      <div class="flex items-center gap-3 overflow-hidden">
        <!-- 移动端返回按钮 -->
        <div
          class="md:hidden i-ri-arrow-left-s-line text-xl p-2 -ml-2 cursor-pointer hover:text-primary"
          @click="goBack"
        />

        <span class="font-bold text-lg text-gray-800 dark:text-gray-100 leading-tight">选项</span>
      </div>

      <!-- 退出登录按钮 -->
      <n-button secondary type="error" size="small" @click="handleLogout">
        <template #icon>
          <div class="i-ri-logout-box-line" />
        </template>
        退出登录
      </n-button>
    </header>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="max-w-4xl mx-auto p-4 md:p-8">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <n-tabs type="line" animated :tab-style="{ padding: '16px 24px' }">
            <!-- 通用设置 -->
            <n-tab-pane name="general" tab="通用">
              <div class="p-6">
                <div class="flex flex-col gap-6">
                  <!-- 账号信息 -->
                  <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <n-avatar :size="64" :src="authStore.loginInfo?.avatar" round />
                    <div class="flex-1">
                      <div class="text-lg font-bold">{{ authStore.loginInfo?.nickname }}</div>
                      <div class="text-gray-400 text-sm">{{ authStore.loginInfo?.userId }}</div>
                    </div>
                  </div>

                  <n-divider />

                  <!-- 基础设置 -->
                  <n-form label-placement="left" label-width="auto">
                    <n-form-item label="自动连接">
                      <n-switch v-model:value="config.auto_connect" />
                    </n-form-item>
                    <n-form-item label="记住密码">
                      <n-switch
                        :value="!!config.save_password"
                        @update:value="(val) => (config.save_password = val ? 'saved' : '')"
                      />
                    </n-form-item>
                  </n-form>
                </div>
              </div>
            </n-tab-pane>

            <!-- 外观设置 -->
            <n-tab-pane name="theme" tab="外观">
              <div class="p-6">
                <n-form label-placement="top">
                  <n-grid :cols="1" :y-gap="24">
                    <n-form-item-gi label="深色模式">
                      <div class="flex flex-col gap-2 w-full">
                        <div class="flex justify-between items-center">
                          <span>跟随系统</span>
                          <n-switch v-model:value="config.opt_auto_dark" />
                        </div>
                        <div v-if="!config.opt_auto_dark" class="flex justify-between items-center mt-2">
                          <span>强制深色</span>
                          <n-switch v-model:value="config.opt_dark" />
                        </div>
                      </div>
                    </n-form-item-gi>

                    <n-form-item-gi label="主题色">
                      <n-color-picker
                        :value="themeColorHex"
                        :show-alpha="false"
                        :actions="['confirm']"
                        @confirm="handleColorConfirm"
                      />
                    </n-form-item-gi>

                    <n-form-item-gi label="背景图片">
                      <div class="flex gap-4 items-center w-full">
                        <n-input v-model:value="config.chat_background" placeholder="图片 URL" />
                        <n-upload abstract :show-file-list="false" @change="handleBgUpload">
                          <n-button-group>
                            <n-button>上传</n-button>
                            <n-button @click="config.chat_background = ''">清除</n-button>
                          </n-button-group>
                        </n-upload>
                      </div>
                    </n-form-item-gi>

                    <n-form-item-gi label="背景模糊度">
                      <n-slider v-model:value="config.chat_background_blur" :min="0" :max="50" />
                    </n-form-item-gi>

                    <n-form-item-gi label="透明模式 (性能消耗大)">
                      <n-switch v-model:value="config.chat_more_blur" />
                    </n-form-item-gi>
                  </n-grid>
                </n-form>
              </div>
            </n-tab-pane>

            <!-- 聊天设置 -->
            <n-tab-pane name="chat" tab="聊天">
              <div class="p-6">
                <n-list>
                  <n-list-item>
                    <div class="flex justify-between items-center">
                      <div>
                        <div class="font-medium">发送键设置</div>
                        <div class="text-xs text-gray-400">
                          当前: {{ config.use_breakline ? 'Ctrl+Enter 发送' : 'Enter 发送' }}
                        </div>
                      </div>
                      <n-switch v-model:value="config.use_breakline" />
                    </div>
                  </n-list-item>

                  <n-list-item>
                    <div class="flex justify-between items-center">
                      <div>
                        <div class="font-medium">防撤回</div>
                        <div class="text-xs text-gray-400">本地保留撤回的消息</div>
                      </div>
                      <n-switch :value="true" disabled />
                    </div>
                  </n-list-item>

                  <n-list-item>
                    <div class="flex justify-between items-center">
                      <div>
                        <div class="font-medium">小尾巴</div>
                        <div class="text-xs text-gray-400">发送消息时追加的后缀</div>
                      </div>
                      <n-input v-model:value="config.msg_taill" placeholder="无" class="w-40" size="small" />
                    </div>
                  </n-list-item>
                </n-list>
              </div>
            </n-tab-pane>

            <!-- 高级设置 -->
            <n-tab-pane name="dev" tab="高级">
              <div class="p-6">
                <n-space vertical size="large">
                  <n-card title="自定义 CSS" size="small">
                    <n-input
                      v-model:value="config.custom_css"
                      type="textarea"
                      placeholder="/* 输入 CSS 代码覆盖样式 */"
                      :rows="5"
                      class="font-mono text-xs"
                    />
                  </n-card>

                  <n-card title="调试工具" size="small">
                    <n-space>
                      <n-button @click="printRuntime">打印 Runtime</n-button>
                      <n-button type="warning" @click="resetApp">重置应用</n-button>
                    </n-space>
                  </n-card>

                  <n-form-item label="日志级别">
                    <n-select v-model:value="config.log_level" :options="logOptions" />
                  </n-form-item>
                </n-space>
              </div>
            </n-tab-pane>

            <!-- 关于 -->
            <n-tab-pane name="about" tab="关于">
              <div class="p-6">
                <div class="flex flex-col items-center py-10">
                  <div class="i-ri-ghost-2-line text-6xl text-primary mb-4" />
                  <h2 class="text-2xl font-bold">WebQQ Refactored</h2>
                  <p class="text-gray-400 mt-2">基于 Vue 3 + Naive UI 重构</p>
                  <p class="text-gray-400 text-xs">v2.0.0 (Dev)</p>

                  <div class="mt-8 flex gap-4">
                    <n-button tag="a" href="https://github.com/YisRime/WebQQ" target="_blank" secondary>
                      <template #icon><div class="i-ri-github-fill" /></template>
                      GitHub
                    </n-button>
                  </div>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NTabs,
  NTabPane,
  NAvatar,
  NDivider,
  NForm,
  NFormItem,
  NFormItemGi,
  NGrid,
  NSwitch,
  NColorPicker,
  NInput,
  NUpload,
  NButtonGroup,
  NSlider,
  NList,
  NListItem,
  NSpace,
  NCard,
  NSelect,
  useDialog,
  useMessage
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useOptionStore } from '@/stores/option'

defineOptions({
  name: 'Options'
})

const router = useRouter()
const authStore = useAuthStore()
const optionStore = useOptionStore()
const config = optionStore.config
const dialog = useDialog()
const message = useMessage()

// 返回按钮逻辑（移动端使用）
const goBack = () => {
  router.push('/chats')
}

// 退出登录
const handleLogout = () => {
  dialog.warning({
    title: '确认退出',
    content: '确定要退出登录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      authStore.logout()
      router.push('/login')
    }
  })
}

// 主题色转换逻辑
const themeColorHex = computed(() => {
  const val = config.theme_color
  if (val <= 10) return '#7abb7e' // 默认色
  return '#' + ('000000' + val.toString(16)).slice(-6)
})

const handleColorConfirm = (value: string) => {
  const hex = parseInt(value.replace('#', ''), 16)
  config.theme_color = hex
}

const handleBgUpload = async (options: { file: { file: File | null } }) => {
  const file = options.file.file
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    config.chat_background = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// 调试功能
const printRuntime = () => {
  console.log('Settings:', config)
  console.log('Auth:', authStore.$state)
  message.success('已打印至控制台')
}

const resetApp = () => {
  dialog.warning({
    title: '重置应用',
    content: '确定要清除所有数据并重置吗？这将丢失所有聊天记录和设置。',
    positiveText: '确定重置',
    negativeText: '取消',
    onPositiveClick: () => {
      localStorage.clear()
      window.location.reload()
    }
  })
}

const logOptions = [
  { label: 'Debug', value: 'debug' },
  { label: 'Info', value: 'info' },
  { label: 'Error', value: 'err' }
]
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
