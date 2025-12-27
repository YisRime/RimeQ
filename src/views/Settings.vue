<template>
  <div class="ui-flex-col-full">
    <!-- 主体设置滚动区 -->
    <div class="flex-1 overflow-y-auto ui-scrollbar">
      <div class="max-w-2xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        <!-- 顶部 Tab 导航 -->
        <div class="flex p-1 bg-background-dim/30 rounded-2xl self-center">
           <div
             v-for="tab in tabs"
             :key="tab.key"
             class="px-6 py-1.5 rounded-xl text-sm font-bold cursor-pointer ui-trans ui-dur-fast select-none ui-flex-x gap-2"
             :class="activeTab === tab.key ? 'bg-background-sub text-primary shadow-sm' : 'text-foreground-sub hover:text-foreground-main'"
             @click="activeTab = tab.key"
           >
              <div :class="tab.icon" />
              <span>{{ tab.label }}</span>
           </div>
        </div>
        <!-- 用户设置面板 -->
        <section v-show="activeTab === 'user'" class="flex flex-col gap-6">
          <div>
            <h2 class="text-sm font-semibold text-foreground-sub mb-2 px-1">后端状态</h2>
            <div class="bg-background-sub rounded-2xl shadow-sm border border-background-dim overflow-hidden">
              <div class="p-4 ui-flex-x gap-4 border-b border-background-dim">
                <!-- 后端状态 -->
                <div
                  class="w-10 h-10 rounded-xl ui-flex-center shrink-0"
                  :class="robotStatus.online ? 'bg-green-500/10' : 'bg-red-500/10'"
                >
                  <div
                    class="i-ri-robot-2-line text-xl"
                    :class="robotStatus.online ? 'text-green-500' : 'text-red-500'"
                  />
                </div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-foreground-main">{{ robotStatus.appName }}</div>
                  <div class="text-xs mt-0.5" :class="robotStatus.online ? 'text-green-500' : 'text-red-500'">
                    {{ robotStatus.online ? '运行正常' : '连接异常' }}
                  </div>
                </div>
                <Button label="退出登录" severity="danger" size="small" outlined @click="handleLogout" />
              </div>
              <!-- 版本信息 -->
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-xs">
                <div class="ui-flex-between">
                  <span class="text-foreground-dim">应用版本:</span>
                  <span class="font-medium text-foreground-main">{{ robotStatus.appVersion || 'N/A' }}</span>
                </div>
                <div class="ui-flex-between">
                  <span class="text-foreground-dim">协议版本:</span>
                  <span class="font-medium text-foreground-main">{{ robotStatus.protocolVersion || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 用户配置表单 -->
          <div>
            <h2 class="text-sm font-semibold text-foreground-sub mb-2 px-1">用户配置</h2>
            <div class="bg-background-sub rounded-2xl shadow-sm border border-background-dim overflow-hidden divide-y divide-background-dim">
              <!-- 修改昵称 -->
              <div class="p-4 ui-flex-x gap-3">
                <label class="text-sm font-medium text-foreground-main whitespace-nowrap">昵称</label>
                <InputText v-model="profile.nickname" class="!h-9 flex-1 !bg-background-dim/50 focus:!bg-background-dim !border-transparent focus:!border-primary/50 !rounded-lg !text-sm" />
                <Button label="保存" size="small" :loading="isSaving" @click="saveProfile" />
              </div>
              <!-- 记住密码 -->
              <div class="ui-flex-between p-4 min-h-[72px]">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-lock-unlock-line text-xl text-foreground-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-foreground-main">记住密码</label>
                    <span class="text-xs text-foreground-dim">在应用内保存连接配置</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.rememberToken" />
              </div>
              <!-- 自动连接 -->
              <div class="ui-flex-between p-4 min-h-[72px]">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-link-m text-xl text-foreground-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-foreground-main">自动连接</label>
                    <span class="text-xs text-foreground-dim">打开应用时自动连接</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.autoConnect" />
              </div>
            </div>
          </div>
        </section>
        <!-- 外观设置面板 -->
        <section v-show="activeTab === 'appearance'" class="flex flex-col gap-6">
           <div>
            <h2 class="text-sm font-semibold text-foreground-sub mb-2 px-1">明暗</h2>
            <div class="bg-background-sub rounded-2xl shadow-sm border border-background-dim overflow-hidden divide-y divide-background-dim">
              <!-- 跟随系统 -->
              <div class="ui-flex-between p-4 min-h-[72px]">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-computer-line text-xl text-foreground-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-foreground-main">跟随系统颜色</label>
                    <span class="text-xs text-foreground-dim">自动切换深色模式</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.followSystemTheme" />
              </div>
              <!-- 强制深色 -->
              <div class="ui-flex-between p-4 min-h-[72px]">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-moon-line text-xl text-foreground-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-foreground-main" :class="{ 'opacity-50': settingStore.config.followSystemTheme }">
                      强制深色
                    </label>
                    <span class="text-xs text-foreground-dim">手动切换为深色</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.forceDarkMode" :disabled="settingStore.config.followSystemTheme" />
              </div>
            </div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-foreground-sub mb-2 px-1">主题</h2>
             <div class="bg-background-sub rounded-2xl shadow-sm border border-background-dim overflow-hidden divide-y divide-background-dim">
              <!-- 主题色选择 -->
              <div class="ui-flex-between p-4 min-h-[72px]">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-paint-brush-line text-xl text-foreground-sub" />
                  <div class="text-sm font-medium text-foreground-main">主题色</div>
                </div>
                <div class="ui-flex-x -space-x-3 items-center">
                  <!-- 预设颜色 -->
                  <div
                    v-for="color in presetColors"
                    :key="color"
                    class="relative w-8 h-8 rounded-full cursor-pointer border-2 border-background-sub ui-trans ui-dur-fast"
                    :class="settingStore.config.themeColor === color ? 'border-primary scale-110' : ''"
                    :style="{ backgroundColor: String(color) }"
                    @click="settingStore.config.themeColor = color"
                  />
                  <!-- 自定义取色器 -->
                  <div
                    class="relative w-8 h-8 rounded-full cursor-pointer border-2 border-background-sub ui-trans ui-dur-fast"
                    :class="!presetColors.includes(String(settingStore.config.themeColor)) ? 'border-primary scale-110' : ''"
                  >
                    <div class="size-full rounded-full ring-1 ring-inset ring-background-dim/50" :style="{ backgroundColor: String(settingStore.config.themeColor) }" />
                    <div class="ui-abs-full ui-flex-center text-white/80 drop-shadow">
                      <div class="i-ri-palette-line" />
                    </div>
                    <input
                      v-model="settingStore.config.themeColor"
                      type="color"
                      class="ui-abs-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <!-- 背景图设置 -->
              <div class="ui-flex-between p-4 min-h-[72px]">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-image-line text-xl text-foreground-sub" />
                  <div class="text-sm font-medium text-foreground-main">聊天背景</div>
                </div>
                <div class="w-full max-w-xs">
                  <InputGroup>
                    <Button as="label" for="bg-upload" icon="i-ri-upload-2-line" class="cursor-pointer" />
                    <InputText v-model="settingStore.config.backgroundImg" placeholder="https://" class="!text-xs !bg-background-dim/50 focus:!bg-background-dim" />
                    <Button v-if="settingStore.config.backgroundImg" icon="i-ri-delete-bin-line" severity="danger" @click="settingStore.config.backgroundImg = ''" />
                  </InputGroup>
                  <input id="bg-upload" type="file" accept="image/*" class="hidden" @change="handleImageUpload">
                </div>
              </div>
              <!-- 背景模糊度 -->
              <div class="p-4 flex flex-col gap-3">
                <div class="ui-flex-between">
                  <div class="ui-flex-x gap-4">
                    <div class="i-ri-blur-on-line text-xl text-foreground-sub" />
                    <div class="text-sm font-medium text-foreground-main">背景模糊</div>
                  </div>
                  <span class="w-8 text-right text-sm font-mono text-foreground-dim">{{ settingStore.config.backgroundBlur }}px</span>
                </div>
                <Slider v-model="settingStore.config.backgroundBlur" :min="0" :max="20" class="w-full" />
              </div>
             </div>
          </div>
        </section>
        <!-- 高级设置面板 -->
        <section v-show="activeTab === 'advanced'" class="flex flex-col gap-6">
          <div>
            <h2 class="text-sm font-semibold text-foreground-sub mb-2 px-1">功能</h2>
            <div class="bg-background-sub rounded-2xl shadow-sm border border-background-dim overflow-hidden divide-y divide-background-dim">
              <!-- 防撤回 -->
              <div class="ui-flex-between p-4 min-h-[72px]">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-shield-check-line text-xl text-foreground-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-foreground-main">防撤回</label>
                    <span class="text-xs text-foreground-dim">本地保留已经撤回的消息</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.enableAntiRecall" />
              </div>
            </div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-foreground-sub mb-2 px-1">杂项</h2>
            <div class="bg-background-sub rounded-2xl shadow-sm border border-background-dim overflow-hidden">
              <!-- 自定义 CSS -->
              <div class="p-4 flex flex-col gap-3">
                <div class="ui-flex-x gap-4">
                  <div class="i-ri-css3-line text-xl text-foreground-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-foreground-main">自定义 CSS</label>
                    <span class="text-xs text-foreground-dim">注入自定义样式覆盖</span>
                  </div>
                </div>
                <Textarea
                  v-model="settingStore.config.customCSS"
                  rows="6"
                  class="font-mono text-xs w-full p-2 !bg-background-dim/50 focus:!bg-background-dim !border-transparent focus:!border-primary/50 rounded-lg"
                />
              </div>
            </div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-red-500/80 mb-2 px-1">高危</h2>
            <!-- 重置应用 -->
            <div
              class="bg-red-500/10 rounded-2xl border border-red-500/30 p-4 hover:bg-red-500/20 cursor-pointer text-red-500 ui-flex-between group ui-trans ui-dur-fast"
              @click="resetApp"
            >
              <div class="ui-flex-x gap-4">
                <div class="i-ri-alert-line text-xl" />
                <div class="flex flex-col">
                  <div class="text-sm font-medium">重置应用</div>
                  <div class="text-xs text-red-500/80">删除所有配置并清空本地数据</div>
                </div>
              </div>
              <div class="i-ri-arrow-right-s-line text-foreground-dim opacity-0 group-hover:opacity-100 ui-trans ui-dur-fast"/>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useSettingStore } from '@/stores/setting'
import { bot } from '@/api'
import ToggleSwitch from 'primevue/toggleswitch'
import InputGroup from 'primevue/inputgroup'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Slider from 'primevue/slider'
import Button from 'primevue/button'

defineOptions({ name: 'SettingsView' })

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const settingStore = useSettingStore()

// UI 状态
const activeTab = ref('user')
const isSaving = ref(false)
const profile = reactive({ nickname: settingStore.user?.nickname || '' })
const robotStatus = reactive({
  online: false,
  appName: '未连接',
  appVersion: 'N/A',
  protocolVersion: 'N/A',
})

// Tab 菜单
const tabs = [
  { key: 'user', label: '用户', icon: 'i-ri-user-line' },
  { key: 'appearance', label: '外观', icon: 'i-ri-palette-line' },
  { key: 'advanced', label: '高级', icon: 'i-ri-flask-line' }
]

// 预设主题色
const presetColors = ['#7abb7e', '#4f80ff', '#ff6666', '#ffc107', '#9c27b0', '#607d8b']

// 处理背景图上传
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (result) {
      settingStore.config.backgroundImg = result
      toast.add({ severity: 'success', summary: '背景更新成功', life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: '图片读取失败', life: 3000 })
    }
  }
  reader.readAsDataURL(file)
}

// 保存用户昵称
const saveProfile = async () => {
  isSaving.value = true
  try {
    await bot.setQqProfile({ nickname: profile.nickname })
    if (settingStore.user) settingStore.user.nickname = profile.nickname
    toast.add({ severity: 'success', summary: '保存成功', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: '保存失败', detail: e, life: 3000 })
  } finally {
    isSaving.value = false
  }
}

// 退出登录确认
const handleLogout = () => {
  confirm.require({
    message: '确定要断开连接吗？',
    header: '确定',
    icon: 'i-ri-error-warning-line',
    accept: () => {
      settingStore.logout()
      router.replace('/login')
    }
  })
}

// 重置应用确认
const resetApp = () => {
  confirm.require({
    message: '确定要清空数据吗？',
    header: '确定',
    icon: 'i-ri-alert-line',
    acceptClass: '!bg-red-500',
    accept: () => {
      const dbRequest = window.indexedDB.deleteDatabase('RimeQDB')
      const reload = () => {
        localStorage.clear()
        sessionStorage.clear()
        window.location.reload()
      }
      dbRequest.onsuccess = reload
      dbRequest.onerror = reload
    }
  })
}

// 监测后端状态
watch(
  () => settingStore.isConnected,
  async (connected) => {
    if (connected) {
      try {
        const [statusRes, versionRes] = await Promise.all([bot.getStatus(), bot.getVersionInfo()])
        Object.assign(robotStatus, {
          online: statusRes.online && statusRes.good,
          appName: versionRes.app_name,
          appVersion: versionRes.app_version,
          protocolVersion: versionRes.protocol_version
        })
      } catch (e) {
        console.error('[Settings] 状态检查失败:', e)
        Object.assign(robotStatus, { online: false, appName: '数据异常' })
      }
    } else {
      Object.assign(robotStatus, {
        online: false,
        appName: '未连接',
        appVersion: 'N/A',
        protocolVersion: 'N/A'
      })
    }
  },
  { immediate: true }
)
</script>
