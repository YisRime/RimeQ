<template>
  <div class="flex-col-full bg-main">
    <!-- Header -->
    <header class="h-14 border-b border-dim bg-sub/90 backdrop-blur flex-between px-4 flex-shrink-0 z-10">
      <div class="flex-x gap-3">
        <div class="md:hidden i-ri-arrow-left-s-line text-xl cursor-pointer" @click="router.back()" />
        <span class="font-bold text-lg text-main">设置</span>
      </div>
      <Button severity="danger" size="small" outlined @click="handleLogout">
        <template #icon><div class="i-ri-logout-box-line" /></template>
        <span>退出登录</span>
      </Button>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto my-scrollbar p-4 md:p-8">
      <div class="max-w-3xl mx-auto bg-sub rounded-2xl shadow-sm border border-dim">
        <Tabs value="general" class="px-6 py-4">
          <TabList>
            <Tab value="general">通用</Tab>
            <Tab value="theme">外观</Tab>
            <Tab value="advanced">高级</Tab>
            <Tab value="about">关于</Tab>
          </TabList>

          <TabPanels>
            <!-- 通用设置 -->
            <TabPanel value="general">
              <div class="mt-4 max-w-lg flex flex-col gap-6">
                <div class="flex-between py-3 border-b border-dim">
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-main">自动连接</label>
                    <span class="text-xs text-dim">启动时自动登录上次账号</span>
                  </div>
                  <ToggleSwitch v-model="config.autoConnect" />
                </div>
                <div class="flex-between py-3 border-b border-dim">
                  <label class="text-sm font-medium text-main">记住密码</label>
                  <ToggleSwitch v-model="config.remember" />
                </div>
                <div class="flex-between py-3">
                  <label class="text-sm font-medium text-main">日志级别</label>
                  <Select v-model="config.logLevel" :options="logOptions" class="w-32" />
                </div>
              </div>
            </TabPanel>

            <!-- 外观设置 -->
            <TabPanel value="theme">
              <div class="mt-4 flex flex-col gap-6">
                <div class="flex-between py-3 border-b border-dim">
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-main">深色模式</label>
                    <span class="text-xs text-dim">强制开启深色主题</span>
                  </div>
                  <ToggleSwitch v-model="config.darkMode" />
                </div>
                <div class="flex flex-col gap-2 py-3 border-b border-dim">
                  <label class="text-sm font-medium text-main">主题色</label>
                  <div class="flex-x gap-3">
                    <input type="color" v-model="config.themeColor" class="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                    <span class="text-sm font-mono opacity-70">{{ config.themeColor }}</span>
                  </div>
                </div>
                <div class="flex flex-col gap-2 py-3 border-b border-dim">
                  <label class="text-sm font-medium text-main">聊天背景图 (URL)</label>
                  <div class="relative">
                    <div class="i-ri-image-line text-dim absolute left-3 top-1/2 -translate-y-1/2" />
                    <InputText v-model="config.bgImage" placeholder="https://..." class="w-full pl-10" />
                  </div>
                </div>
                <div class="flex flex-col gap-3 py-3">
                  <label class="text-sm font-medium text-main">背景模糊度 (px)</label>
                  <div class="flex-x gap-4">
                    <Slider v-model="config.bgBlur" :min="0" :max="20" class="flex-1" />
                    <span class="w-8 text-right text-main">{{ config.bgBlur }}</span>
                  </div>
                </div>
              </div>
            </TabPanel>

            <!-- 高级设置 -->
            <TabPanel value="advanced">
              <div class="mt-4 flex flex-col gap-6">
                <div class="flex-between py-3 border-b border-dim">
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium text-main">防撤回 (本地拦截)</label>
                    <span class="text-xs text-dim">仅在本地保留消息，重启后失效</span>
                  </div>
                  <ToggleSwitch v-model="config.antiRecall" />
                </div>
                <div class="flex flex-col gap-2 py-3 border-b border-dim">
                  <label class="text-sm font-medium text-main">自定义 CSS</label>
                  <textarea v-model="config.css" placeholder="/* 输入 CSS 代码 */" rows="6" class="font-mono text-xs w-full p-2 bg-dim border-0 rounded-lg outline-none" />
                </div>
                <div class="flex gap-4 pt-3">
                  <Button outlined @click="printConfig">打印配置</Button>
                  <Button severity="warn" outlined @click="resetApp">重置应用</Button>
                </div>
              </div>
            </TabPanel>

            <!-- 关于 -->
            <TabPanel value="about">
              <div class="flex-center flex-col py-8">
                <div class="i-ri-radar-line text-6xl text-primary mb-4" />
                <h2 class="text-2xl font-bold text-main">WebQQ Refactored</h2>
                <p class="text-sub mt-2">v2.0.0 (Dev)</p>
                <div class="mt-6">
                  <Button as="a" href="https://github.com/YisRime/WebQQ" target="_blank" outlined>
                    <template #icon><div class="i-ri-github-fill" /></template>
                    <span>GitHub</span>
                  </Button>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 设置视图
 * 提供通用、外观、高级功能的配置
 */
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import Slider from 'primevue/slider'
import Select from 'primevue/select'
import { settingsStore } from '@/utils/settings'

defineOptions({ name: 'SettingsView' })

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const config = settingsStore.config

const logOptions = [
  { label: 'Error', value: 'error' },
  { label: 'Info', value: 'info' },
  { label: 'Debug', value: 'debug' }
]

const handleLogout = () => {
  confirm.require({
    message: '确定要断开连接吗？将返回登录页面。',
    header: '确认退出',
    icon: 'i-ri-error-warning-line',
    accept: () => {
      settingsStore.logout()
      router.push('/login')
    }
  })
}

const printConfig = () => {
  console.log('[Settings] Current Config:', JSON.parse(JSON.stringify(config.value)))
  toast.add({ severity: 'success', summary: '已打印至控制台', life: 3000 })
}

const resetApp = () => {
  confirm.require({
    message: '这将清空所有本地缓存（包括聊天记录和配置），确定继续吗？',
    header: '危险操作',
    icon: 'i-ri-error-warning-line',
    accept: () => {
      localStorage.clear()
      window.location.reload()
    }
  })
}
</script>
