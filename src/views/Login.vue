<template>
  <!-- 登录页容器：全屏居中，使用语义化背景色 -->
  <div class="min-h-screen w-full ui-flex-center p-4 bg-background-sub ui-trans ui-dur-normal">
    <!-- 登录卡片：添加阴影、圆角和过渡效果 -->
    <div class="w-full max-w-md bg-background-main rounded-2xl shadow-xl overflow-hidden p-8 md:p-10 border border-background-dim ui-trans ui-dur-normal">
      <!-- 顶部 Logo 区域 -->
      <div class="ui-flex-y mb-8">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 ui-flex-center shadow-lg mb-4 text-white">
          <div class="i-ri-chat-smile-2-fill text-4xl drop-shadow-md" />
        </div>
        <h1 class="text-2xl font-bold text-foreground-main tracking-wide">RimeQ</h1>
      </div>

      <!-- 表单区域 -->
      <div class="flex flex-col gap-6">
        <!-- 地址输入框 -->
        <IconField>
          <InputIcon class="i-ri-server-line z-10 text-foreground-dim" />
          <InputText
            v-model="form.connectAddress"
            placeholder="ws://"
            :disabled="isAutoConnecting"
            class="w-full !pl-10 h-10 !bg-background-sub !border-background-dim focus:!border-primary focus:!ring-1 focus:!ring-primary/20 text-foreground-main text-sm rounded-lg ui-trans ui-dur-fast focus:outline-none"
          />
        </IconField>

        <!-- 密钥输入框 -->
        <IconField>
          <InputIcon class="i-ri-key-2-line z-10 text-foreground-dim" />
          <Password
            v-model="form.accessToken"
            placeholder="Token"
            :feedback="false"
            toggle-mask
            fluid
            :disabled="isAutoConnecting"
            class="w-full"
            input-class="w-full !pl-10 h-10 !bg-background-sub !border-background-dim focus:!border-primary focus:!ring-1 focus:!ring-primary/20 text-foreground-main text-sm rounded-lg ui-trans ui-dur-fast focus:outline-none"
            @keydown.enter="!isAutoConnecting && handleLogin(false)"
          />
        </IconField>

        <!-- 选项配置行 -->
        <div class="ui-flex-between px-1">
          <div class="ui-flex-x gap-2">
            <Checkbox v-model="form.rememberToken" binary input-id="remember" size="small" :disabled="isAutoConnecting" />
            <label for="remember" class="text-xs text-foreground-sub ui-ia-hover">记住密码</label>
          </div>
          <div class="ui-flex-x gap-2">
            <Checkbox v-model="form.autoConnect" binary input-id="auto" size="small" :disabled="isAutoConnecting" />
            <label for="auto" class="text-xs text-foreground-sub ui-ia-hover">自动连接</label>
          </div>
        </div>

        <!-- 登录按钮：状态切换时显示 loading 图标 -->
        <Button
          :label="isAutoConnecting ? '登录中...' : '登录'"
          :loading="settingStore.isConnecting && !isAutoConnecting"
          :icon="isAutoConnecting ? 'i-ri-loader-4-line animate-spin' : ''"
          class="w-full font-bold h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 ui-trans ui-dur-fast !bg-primary hover:!bg-primary-hover !border-none text-white text-sm"
          @click="isAutoConnecting ? (isAutoConnecting = false, settingStore.isConnecting = false) : handleLogin(false)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useSettingStore } from '@/stores/setting'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const settingStore = useSettingStore()

// 自动登录状态
const isAutoConnecting = ref(false)
const form = reactive({
  connectAddress: '',
  accessToken: '',
  rememberToken: false,
  autoConnect: false
})

// 执行登录流程
const handleLogin = async (isAuto = false) => {
  if (!form.connectAddress) {
    return !isAuto && toast.add({ severity: 'warn', summary: '请输入地址', life: 3000 })
  }

  try {
    // 同步配置到 Store
    Object.assign(settingStore.config, {
      rememberToken: form.rememberToken,
      autoConnect: form.autoConnect
    })

    await settingStore.login(form.connectAddress, form.accessToken)

    if (!isAuto) toast.add({ severity: 'success', summary: '连接成功', life: 3000 })
    router.replace((route.query.redirect as string) || '/')
  } catch (e) {
    // 自动登录失败或手动登录失败时的处理
    if (!isAuto || isAutoConnecting.value) {
      if (!isAuto) toast.add({ severity: 'error', summary: '连接失败', detail: e, life: 3000 })
    }
  } finally {
    if (isAuto) isAutoConnecting.value = false
  }
}

// 初始化：加载保存的配置并尝试自动登录
onMounted(() => {
  if (settingStore.config.rememberToken) {
    Object.assign(form, {
      connectAddress: settingStore.config.connectAddress,
      accessToken: settingStore.config.accessToken,
      rememberToken: settingStore.config.rememberToken,
      autoConnect: settingStore.config.autoConnect
    })
  }
  // 触发自动登录
  if (form.autoConnect && form.connectAddress && form.accessToken && !settingStore.isLogged) {
    isAutoConnecting.value = true
    handleLogin(true)
  }
})
</script>
