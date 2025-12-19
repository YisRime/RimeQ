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
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { NCard, NForm, NFormItem, NInput, NButton, NCheckbox, useMessage } from 'naive-ui'
import { useAccountsStore } from '../stores/accounts'
import { useSettingsStore } from '../stores/settings'
import { useRouter } from 'vue-router'

const router = useRouter()
const accountsStore = useAccountsStore()
const settingsStore = useSettingsStore()
const message = useMessage()

const form = reactive({
  address: '',
  token: '',
  remember: false,
  autoConnect: false
})

onMounted(() => {
  // 仅回显数据，不再触发登录
  const cfg = settingsStore.config
  if (cfg.remember) {
    form.address = cfg.address
    form.token = cfg.token
    form.remember = true
    form.autoConnect = cfg.autoConnect
  }
})

const handleLogin = async () => {
  try {
    await accountsStore.login(form.address, form.token)

    // 保存配置
    settingsStore.config.address = form.address
    settingsStore.config.token = form.remember ? form.token : ''
    settingsStore.config.remember = form.remember
    settingsStore.config.autoConnect = form.autoConnect

    message.success('连接成功')
    router.push('/')
  } catch (e: any) {
    message.error(e.message || '连接失败')
  }
}
</script>
