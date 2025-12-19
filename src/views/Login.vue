<template>
  <div class="flex h-full w-full items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center md:text-left">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">欢迎回来</h1>
        <p class="text-gray-500">请连接到您的 OneBot 实例以继续</p>
      </div>

      <n-card class="shadow-sm border-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur" size="large">
        <n-form ref="formRef" size="large">
          <n-form-item label="服务地址">
            <n-input v-model:value="form.address" placeholder="ws://127.0.0.1:3001">
              <template #prefix>
                <div class="i-ri-server-line text-gray-400" />
              </template>
            </n-input>
          </n-form-item>

          <n-form-item label="访问密钥 (Token)">
            <n-input
              v-model:value="form.token"
              type="password"
              show-password-on="click"
              placeholder="请输入 Access Token"
              @keydown.enter="handleLogin"
            >
              <template #prefix>
                <div class="i-ri-key-2-line text-gray-400" />
              </template>
            </n-input>
          </n-form-item>

          <div class="flex justify-between items-center mb-6">
            <n-checkbox v-model:checked="form.remember"> 记住配置 </n-checkbox>
            <n-checkbox v-model:checked="form.autoConnect"> 自动连接 </n-checkbox>
          </div>

          <n-button type="primary" block size="large" :loading="accountsStore.connecting" @click="handleLogin">
            连接服务器
          </n-button>
        </n-form>
      </n-card>
    </div>
  </div>

  <div
    v-if="isAutoConnecting"
    class="fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm"
  >
    <div class="i-ri-loader-2-line animate-spin text-4xl text-primary mb-4"></div>
    <div class="text-gray-500">正在自动连接服务器...</div>
    <n-button text class="mt-4 text-gray-400" @click="cancelAutoConnect">取消</n-button>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAccountsStore } from '../stores/accounts'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const route = useRoute()
const accountsStore = useAccountsStore()
const settingsStore = useSettingsStore()
const message = useMessage()

const isAutoConnecting = ref(false)
let autoConnectTimer: number | null = null

const form = reactive({
  address: '',
  token: '',
  remember: false,
  autoConnect: false
})

onMounted(() => {
  // 1. 回显配置
  const cfg = settingsStore.config
  if (cfg.remember) {
    form.address = cfg.address
    form.token = cfg.token
    form.remember = true
    form.autoConnect = cfg.autoConnect
  }

  // 2. 触发自动连接 (更好的实现位置)
  if (form.autoConnect && form.address && form.token && !accountsStore.isLogged) {
    performAutoLogin()
  }
})

const performAutoLogin = async () => {
  isAutoConnecting.value = true
  try {
    // 稍微延迟一点，避免页面渲染闪烁，也给用户取消的机会
    await new Promise((resolve) => {
      autoConnectTimer = window.setTimeout(resolve, 500)
    })

    await handleLogin(true) // 传入 true 表示静默/自动模式
  } catch (e) {
    // 自动连接失败，仅提示，停留在登录页供用户修改
    console.warn('自动连接失败', e)
  } finally {
    isAutoConnecting.value = false
  }
}

const cancelAutoConnect = () => {
  if (autoConnectTimer) clearTimeout(autoConnectTimer)
  isAutoConnecting.value = false
  message.info('已取消自动连接')
}

const handleLogin = async (isAuto = false) => {
  try {
    await accountsStore.login(form.address, form.token)

    // 保存最新配置
    settingsStore.config.address = form.address
    settingsStore.config.token = form.remember ? form.token : ''
    settingsStore.config.remember = form.remember
    settingsStore.config.autoConnect = form.autoConnect

    if (!isAuto) message.success('连接成功')

    // 3. 登录成功后，跳转回原本想去的页面，或者默认页
    const redirectPath = (route.query.redirect as string) || '/'
    router.replace(redirectPath)
  } catch (e: any) {
    message.error(e.message || '连接失败')
    throw e // 抛出异常中断后续逻辑
  }
}
</script>
