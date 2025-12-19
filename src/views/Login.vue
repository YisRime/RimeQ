<template>
  <div class="flex-center size-full p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center md:text-left">
        <h1 class="text-3xl font-bold text-main mb-2">欢迎回来</h1>
        <p class="text-sub">请连接到您的 OneBot 实例以继续</p>
      </div>

      <Card class="shadow-sm border-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur">
        <template #content>
          <div class="flex flex-col gap-4">
            <!-- 服务地址 -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-main">服务地址</label>
              <div class="relative">
                <div class="i-ri-server-line text-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <InputText v-model="form.address" placeholder="ws://127.0.0.1:3001" class="w-full pl-10" />
              </div>
            </div>

            <!-- 访问密钥 -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-main">访问密钥 (Token)</label>
              <div class="relative">
                <div class="i-ri-key-2-line text-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <Password
                  v-model="form.token"
                  placeholder="请输入 Access Token"
                  toggle-mask
                  :feedback="false"
                  class="w-full"
                  :pt="{ input: { class: 'pl-10' } }"
                  @keydown.enter.prevent="handleLogin()"
                />
              </div>
            </div>

            <!-- 选项 -->
            <div class="flex-between mb-2">
              <div class="flex-x gap-2">
                <Checkbox v-model="form.remember" binary input-id="remember" />
                <label for="remember" class="text-sm text-sub cursor-pointer">记住配置</label>
              </div>
              <div class="flex-x gap-2">
                <Checkbox v-model="form.autoConnect" binary input-id="autoConnect" />
                <label for="autoConnect" class="text-sm text-sub cursor-pointer">自动连接</label>
              </div>
            </div>

            <!-- 连接按钮 -->
            <Button
              label="连接服务器"
              size="large"
              :loading="accountsStore.connecting"
              class="w-full"
              @click="handleLogin()"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>

  <!-- 自动连接遮罩 -->
  <div
    v-if="isAutoConnecting"
    class="fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex-center flex-col backdrop-blur-sm"
  >
    <div class="i-ri-loader-2-line animate-spin text-4xl text-primary mb-4" />
    <div class="text-sub">正在自动连接服务器...</div>
    <Button text class="mt-4 text-dim" label="取消" @click="cancelAutoConnect" />
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'

import { useAccountsStore } from '../stores/accounts'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const route = useRoute()
const accountsStore = useAccountsStore()
const settingsStore = useSettingsStore()
const toast = useToast()

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

  // 2. 触发自动连接
  if (form.autoConnect && form.address && form.token && !accountsStore.isLogged) {
    performAutoLogin()
  }
})

const performAutoLogin = async () => {
  isAutoConnecting.value = true
  try {
    await new Promise((resolve) => {
      autoConnectTimer = window.setTimeout(resolve, 500)
    })

    await handleLogin(true)
  } catch (e) {
    console.warn('自动连接失败', e)
  } finally {
    isAutoConnecting.value = false
  }
}

const cancelAutoConnect = () => {
  if (autoConnectTimer) clearTimeout(autoConnectTimer)
  isAutoConnecting.value = false
  toast.add({ severity: 'info', summary: '已取消自动连接', life: 3000 })
}

const handleLogin = async (isAuto = false) => {
  try {
    await accountsStore.login(form.address, form.token)

    // 保存配置
    settingsStore.config.address = form.address
    settingsStore.config.token = form.remember ? form.token : ''
    settingsStore.config.remember = form.remember
    settingsStore.config.autoConnect = form.autoConnect

    if (!isAuto) {
      toast.add({ severity: 'success', summary: '连接成功', life: 3000 })
    }

    const redirectPath = (route.query.redirect as string) || '/'
    router.replace(redirectPath)
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e.message || '连接失败', life: 3000 })
    throw e
  }
}
</script>
