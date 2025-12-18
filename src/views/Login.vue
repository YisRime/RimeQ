<template>
  <div
    class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300"
  >
    <div v-motion class="w-full max-w-md p-6" :initial="{ opacity: 0, y: 50 }" :enter="{ opacity: 1, y: 0 }">
      <n-card class="shadow-xl rounded-2xl" size="huge" :bordered="false">
        <template #header>
          <div class="flex flex-col items-center gap-2 mb-4">
            <!-- 这里可以放 Logo -->
            <div class="i-ri-radar-line text-4xl text-primary" />
            <h1 class="text-2xl font-bold text-gray-700 dark:text-gray-200">连接到 OneBot</h1>
          </div>
        </template>

        <n-form ref="formRef" :model="loginForm" :rules="rules" size="large" @submit.prevent="handleLogin">
          <!-- 非 SSE 模式显示地址输入框 -->
          <n-form-item v-if="!isSSEMode" path="address" label="服务地址">
            <n-input v-model:value="loginForm.address" placeholder="ws://127.0.0.1:3001" @keydown.enter.prevent>
              <template #prefix>
                <div class="i-ri-link text-gray-400" />
              </template>
            </n-input>
          </n-form-item>

          <n-form-item path="token" label="访问密钥 (Token)">
            <n-input
              v-model:value="loginForm.token"
              type="password"
              show-password-on="click"
              placeholder="请输入 Access Token"
              @keydown.enter.prevent="handleLogin"
            >
              <template #prefix>
                <div class="i-ri-lock-line text-gray-400" />
              </template>
            </n-input>
          </n-form-item>

          <div class="flex justify-between items-center mb-6">
            <n-checkbox v-model:checked="loginForm.remember"> 记住密钥 </n-checkbox>
            <n-checkbox v-model:checked="loginForm.autoConnect"> 自动连接 </n-checkbox>
          </div>

          <n-button type="primary" block size="large" :loading="loading" class="font-bold" @click="handleLogin">
            连接
          </n-button>
        </n-form>

        <template #footer>
          <div class="text-center text-gray-400 text-sm mt-4">Powered by WebQQ Refactored</div>
        </template>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NCard, NForm, NFormItem, NInput, NButton, NCheckbox, useMessage, type FormInst } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

// 环境变量判断
const isSSEMode = import.meta.env.VITE_APP_SSE_MODE === 'true'

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

// 表单数据
const loginForm = reactive({
  address: '',
  token: '',
  remember: false,
  autoConnect: false
})

// 表单验证规则
const rules = {
  address: {
    required: !isSSEMode,
    message: '请输入连接地址',
    trigger: ['input', 'blur']
  }
  // Token 可以为空，视后端配置而定
}

// 初始化加载保存的配置（如果有）
const initForm = () => {
  const saved = authStore.getSavedConfig()
  if (saved) {
    loginForm.address = saved.address || ''
    loginForm.token = saved.token || ''
    loginForm.remember = !!saved.token
    loginForm.autoConnect = !!saved.autoConnect
  }

  if (loginForm.autoConnect) {
    handleLogin()
  }
}

const handleLogin = async () => {
  loading.value = true
  try {
    // 验证表单
    if (!isSSEMode) await formRef.value?.validate()

    // 调用 Store 进行连接
    const success = await authStore.connect({
      address: loginForm.address,
      token: loginForm.token,
      remember: loginForm.remember,
      autoConnect: loginForm.autoConnect
    })

    if (success) {
      message.success('连接成功')
      router.push('/')
    }
  } catch (e) {
    const error = e as { message?: string }
    message.error(error.message || '连接失败')
  } finally {
    loading.value = false
  }
}

// 启动初始化
initForm()
</script>

