<template>
  <div class="min-h-screen w-full flex-center p-4 bg-sub my-trans">
    <!-- 登录卡片容器 -->
    <div class="w-full max-w-md bg-main rounded-2xl shadow-xl overflow-hidden p-8 md:p-10 my-trans border border-dim">
      <!-- 顶部 Logo 区域 -->
      <div class="flex-col flex-center mb-8">
        <div
          class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex-center shadow-lg mb-4 text-white"
        >
          <div class="i-ri-chat-smile-2-fill text-4xl drop-shadow-md" />
        </div>
        <h1 class="text-2xl font-bold text-main tracking-wide">RimeQ</h1>
      </div>
      <!-- 表单区域 -->
      <div class="flex flex-col gap-6">
        <!-- 地址输入框 -->
        <div class="relative group">
          <div
            class="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-dim group-focus-within:text-primary my-trans flex-center"
          >
            <div class="i-ri-server-line text-lg" />
          </div>
          <InputText
            v-model="form.address"
            placeholder="后端地址"
            :disabled="isAutoConnecting"
            class="w-full !pl-10 h-10 !bg-sub !border-dim focus:!border-primary focus:!ring-1 focus:!ring-primary/20 text-main text-sm rounded-lg my-trans focus:outline-none border"
          />
        </div>
        <!-- 密钥输入框 -->
        <div class="relative group w-full">
          <div
            class="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-dim group-focus-within:text-primary my-trans flex-center"
          >
            <div class="i-ri-key-2-line text-lg" />
          </div>
          <Password
            v-model="form.token"
            placeholder="登录密钥"
            :feedback="false"
            toggle-mask
            fluid
            :disabled="isAutoConnecting"
            class="w-full"
            input-class="w-full !pl-10 h-10 !bg-sub !border-dim focus:!border-primary focus:!ring-1 focus:!ring-primary/20 text-main text-sm rounded-lg my-trans focus:outline-none border"
            @keydown.enter="!isAutoConnecting && handleLogin(false)"
          />
        </div>
        <!-- 选项配置行 -->
        <div class="flex-between px-1">
          <div class="flex-x gap-2">
            <Checkbox v-model="form.remember" binary input-id="remember" size="small" :disabled="isAutoConnecting" />
            <label for="remember" class="text-xs text-sub cursor-pointer hover:text-primary my-trans">记住密码</label>
          </div>
          <div class="flex-x gap-2">
            <Checkbox v-model="form.autoConnect" binary input-id="auto" size="small" :disabled="isAutoConnecting" />
            <label for="auto" class="text-xs text-sub cursor-pointer hover:text-primary my-trans">自动连接</label>
          </div>
        </div>
        <!-- 登录按钮 -->
        <Button
          :label="isAutoConnecting ? '登录中...' : '登录'"
          :loading="accountStore.isConnecting.value && !isAutoConnecting"
          :icon="isAutoConnecting ? 'i-ri-loader-4-line animate-spin' : ''"
          class="w-full font-bold h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 my-trans !bg-primary hover:!bg-primary-hover !border-none text-white text-sm"
          @click="isAutoConnecting ? cancelAuto() : handleLogin(false)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { accountStore } from '@/utils/storage'

// 路由实例
const router = useRouter()
const route = useRoute()
const toast = useToast()

// 自动登录状态
const isAutoConnecting = ref(false)
const form = reactive({
  address: '',
  token: '',
  remember: false,
  autoConnect: false
})

// 处理登录逻辑
const handleLogin = async (isAuto = false) => {
  if (!form.address) {
    return !isAuto && toast.add({ severity: 'warn', summary: '请输入地址', life: 2000 })
  }

  try {
    Object.assign(accountStore.config.value, {
      remember: form.remember,
      autoConnect: form.autoConnect
    })

    await accountStore.login(form.address, form.token)

    if (!isAuto) toast.add({ severity: 'success', summary: '连接成功', life: 2000 })
    router.replace((route.query.redirect as string) || '/')
  } catch (e: any) {
    if (!isAuto || isAutoConnecting.value) {
      if (!isAuto) toast.add({ severity: 'error', summary: '连接失败', detail: e.message, life: 2000 })
    }
  } finally {
    if (isAuto) isAutoConnecting.value = false
  }
}

// 取消自动登录
const cancelAuto = () => {
  isAutoConnecting.value = false
  accountStore.isConnecting.value = false
}

// 初始化
onMounted(() => {
  const cfg = accountStore.config.value
  if (cfg.remember) {
    Object.assign(form, {
      address: cfg.address,
      token: cfg.token,
      remember: true,
      autoConnect: cfg.autoConnect
    })
  }
  if (form.autoConnect && form.address && form.token && !accountStore.isLogged) {
    isAutoConnecting.value = true
    handleLogin(true)
  }
})
</script>
