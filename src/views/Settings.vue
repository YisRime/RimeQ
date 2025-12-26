<template>
  <div class="flex-col-full">
    <!-- 主体滚动区域 -->
    <div class="flex-1 overflow-y-auto my-scrollbar">
      <div class="max-w-2xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        <!-- 导航 Tab -->
        <div class="flex p-1 bg-dim/30 rounded-xl self-center">
           <div
             v-for="tab in tabs"
             :key="tab.key"
             class="px-6 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-all select-none flex-x gap-2"
             :class="activeTab === tab.key ? 'bg-sub text-primary shadow-sm' : 'text-sub hover:text-main'"
             @click="activeTab = tab.key"
           >
              <div :class="tab.icon" />
              <span>{{ tab.label }}</span>
           </div>
        </div>
        <!-- 用户设置 -->
        <section v-show="activeTab === 'user'" class="flex flex-col gap-6 my-fade-enter-active">
          <div>
            <h2 class="text-sm font-semibold text-sub mb-2 px-1">后端状态</h2>
            <div class="bg-sub rounded-xl shadow-sm border border-dim overflow-hidden">
              <div class="p-4 flex-x gap-4 border-b border-dim">
                <div
                  class="w-10 h-10 rounded-lg flex-center shrink-0"
                  :class="robotStatus.online ? 'bg-green-500/10' : 'bg-red-500/10'"
                >
                  <div
                    class="i-ri-robot-2-line text-xl"
                    :class="robotStatus.online ? 'text-green-500' : 'text-red-500'"
                  />
                </div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-main">{{ robotStatus.appName }}</div>
                  <div class="text-xs mt-0.5" :class="robotStatus.online ? 'text-green-500' : 'text-red-500'">
                    {{ robotStatus.online ? '运行正常' : '连接异常' }}
                  </div>
                </div>
                <Button label="退出登录" severity="danger" size="small" outlined @click="handleLogout" />
              </div>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-xs">
                <div class="flex-between">
                  <span class="text-dim">应用版本:</span>
                  <span class="font-medium text-main">{{ robotStatus.appVersion || 'N/A' }}</span>
                </div>
                <div class="flex-between">
                  <span class="text-dim">协议版本:</span>
                  <span class="font-medium text-main">{{ robotStatus.protocolVersion || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-sub mb-2 px-1">用户配置</h2>
            <div class="bg-sub rounded-xl shadow-sm border border-dim overflow-hidden divide-y divide-dim">
              <div class="p-4 flex-x gap-3">
                <label class="text-sm font-medium text-main whitespace-nowrap">昵称</label>
                <InputText v-model="profile.nickname" class="!h-9 flex-1 !bg-dim/50 focus:!bg-dim !border-transparent focus:!border-primary/50 !rounded-lg !text-sm" />
                <Button label="保存" size="small" :loading="isSaving" @click="saveProfile" />
              </div>
              <div class="flex-between p-4 min-h-[72px]">
                <div class="flex-x gap-4">
                  <div class="i-ri-lock-unlock-line text-xl text-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-main">记住密码</label>
                    <span class="text-xs text-dim">在应用内保存连接配置</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.rememberToken" />
              </div>
              <div class="flex-between p-4 min-h-[72px]">
                <div class="flex-x gap-4">
                  <div class="i-ri-link-m text-xl text-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-main">自动连接</label>
                    <span class="text-xs text-dim">打开应用时自动连接</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.autoConnect" />
              </div>
            </div>
          </div>
        </section>
        <!-- 外观设置 -->
        <section v-show="activeTab === 'appearance'" class="flex flex-col gap-6 my-fade-enter-active">
           <div>
            <h2 class="text-sm font-semibold text-sub mb-2 px-1">明暗</h2>
            <div class="bg-sub rounded-xl shadow-sm border border-dim overflow-hidden divide-y divide-dim">
              <div class="flex-between p-4 min-h-[72px]">
                <div class="flex-x gap-4">
                  <div class="i-ri-computer-line text-xl text-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-main">跟随系统颜色</label>
                    <span class="text-xs text-dim">跟随系统切换</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.followSystemTheme" />
              </div>
              <div class="flex-between p-4 min-h-[72px]">
                <div class="flex-x gap-4">
                  <div class="i-ri-moon-line text-xl text-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-main" :class="{ 'opacity-50': settingStore.config.followSystemTheme }">
                      强制深色
                    </label>
                    <span class="text-xs text-dim">手动切换为深色</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.forceDarkMode" :disabled="settingStore.config.followSystemTheme" />
              </div>
            </div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-sub mb-2 px-1">配色</h2>
             <div class="bg-sub rounded-xl shadow-sm border border-dim overflow-hidden divide-y divide-dim">
              <div class="flex-between p-4 min-h-[72px]">
                <div class="flex-x gap-4">
                  <div class="i-ri-paint-brush-line text-xl text-sub" />
                  <div class="text-sm font-medium text-main">主题色</div>
                </div>
                <div class="flex-x -space-x-3 items-center">
                  <div
                    v-for="color in presetColors"
                    :key="color"
                    class="relative w-8 h-8 rounded-full cursor-pointer border-2 border-sub my-trans"
                    :class="settingStore.config.themeColor === color ? 'border-primary scale-110' : ''"
                    :style="{ backgroundColor: String(color) }"
                    @click="settingStore.config.themeColor = color"
                  />
                  <!-- 自定义颜色选择器 -->
                  <div
                    class="relative w-8 h-8 rounded-full cursor-pointer border-2 border-sub my-trans"
                    :class="!presetColors.includes(String(settingStore.config.themeColor)) ? 'border-primary scale-110' : ''"
                  >
                    <div class="size-full rounded-full ring-1 ring-inset ring-dim/50" :style="{ backgroundColor: String(settingStore.config.themeColor) }" />
                    <div class="absolute inset-0 flex-center text-white/80 drop-shadow">
                      <div class="i-ri-palette-line" />
                    </div>
                    <input
                      v-model="settingStore.config.themeColor"
                      type="color"
                      class="absolute inset-0 size-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div class="flex-between p-4 min-h-[72px]">
                <div class="flex-x gap-4">
                  <div class="i-ri-image-line text-xl text-sub" />
                  <div class="text-sm font-medium text-main">聊天背景</div>
                </div>
                <div class="w-full max-w-xs">
                  <InputGroup>
                    <Button as="label" for="bg-upload" icon="i-ri-upload-2-line" class="cursor-pointer" />
                    <InputText v-model="settingStore.config.backgroundImg" placeholder="https://" class="!text-xs !bg-dim/50 focus:!bg-dim" />
                    <Button v-if="settingStore.config.backgroundImg" icon="i-ri-delete-bin-line" severity="danger" @click="settingStore.config.backgroundImg = ''" />
                  </InputGroup>
                  <input id="bg-upload" type="file" accept="image/*" class="hidden" @change="handleImageUpload">
                </div>
              </div>
              <div class="p-4 flex flex-col gap-3">
                <div class="flex-between">
                  <div class="flex-x gap-4">
                    <div class="i-ri-blur-on-line text-xl text-sub" />
                    <div class="text-sm font-medium text-main">背景模糊</div>
                  </div>
                  <span class="w-8 text-right text-sm font-mono text-dim">{{ settingStore.config.backgroundBlur }}px</span>
                </div>
                <Slider v-model="settingStore.config.backgroundBlur" :min="0" :max="20" class="w-full" />
              </div>
             </div>
          </div>
        </section>
        <!-- 高级设置 -->
        <section v-show="activeTab === 'advanced'" class="flex flex-col gap-6 my-fade-enter-active">
          <div>
            <h2 class="text-sm font-semibold text-sub mb-2 px-1">功能</h2>
            <div class="bg-sub rounded-xl shadow-sm border border-dim overflow-hidden divide-y divide-dim">
              <div class="flex-between p-4 min-h-[72px]">
                <div class="flex-x gap-4">
                  <div class="i-ri-shield-check-line text-xl text-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-main">防撤回</label>
                    <span class="text-xs text-dim">本地保留已经撤回的消息</span>
                  </div>
                </div>
                <ToggleSwitch v-model="settingStore.config.enableAntiRecall" />
              </div>
            </div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-sub mb-2 px-1">杂项</h2>
            <div class="bg-sub rounded-xl shadow-sm border border-dim overflow-hidden">
              <div class="p-4 flex flex-col gap-3">
                <div class="flex-x gap-4">
                  <div class="i-ri-css3-line text-xl text-sub" />
                  <div class="flex flex-col gap-0.5">
                    <label class="text-sm font-medium text-main">自定义 CSS</label>
                    <span class="text-xs text-dim">CSS 样式注入</span>
                  </div>
                </div>
                <Textarea
                  v-model="settingStore.config.customCSS"
                  rows="6"
                  class="font-mono text-xs w-full p-2 !bg-dim/50 focus:!bg-dim !border-transparent focus:!border-primary/50 rounded-lg"
                />
              </div>
            </div>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-red-500/80 mb-2 px-1">高危</h2>
            <div
              class="bg-red-500/10 rounded-xl border border-red-500/30 p-4 hover:bg-red-500/20 cursor-pointer text-red-500 flex-between group my-trans"
              @click="resetApp"
            >
              <div class="flex-x gap-4">
                <div class="i-ri-alert-line text-xl" />
                <div class="flex flex-col">
                  <div class="text-sm font-medium">重置应用</div>
                  <div class="text-xs text-red-500/80">删除所有配置并清空本地数据</div>
                </div>
              </div>
              <div class="i-ri-arrow-right-s-line text-dim opacity-0 group-hover:opacity-100 my-trans"/>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
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

const activeTab = ref('user')
const isSaving = ref(false)
const profile = reactive({ nickname: settingStore.user?.nickname || '' })
const robotStatus = reactive({
  online: false,
  appName: '未连接',
  appVersion: 'N/A',
  protocolVersion: 'N/A',
})

const tabs = [
  { key: 'user', label: '用户', icon: 'i-ri-user-line' },
  { key: 'appearance', label: '外观', icon: 'i-ri-palette-line' },
  { key: 'advanced', label: '高级', icon: 'i-ri-flask-line' }
]
const presetColors = ['#7abb7e', '#4f80ff', '#ff6666', '#ffc107', '#9c27b0', '#607d8b']

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
  reader.onerror = () => {
    toast.add({ severity: 'error', summary: '图片读取失败', life: 3000 })
  }
  reader.readAsDataURL(file)
}

// 保存用户昵称
const saveProfile = async () => {
  isSaving.value = true
  try {
    await bot.setQqProfile({ nickname: profile.nickname })
    if (settingStore.user) {
      settingStore.user.nickname = profile.nickname
    }
    toast.add({ severity: 'success', summary: '保存成功', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: '保存失败', detail: e, life: 3000 })
  } finally {
    isSaving.value = false
  }
}

// 退出登录
const handleLogout = () => {
  confirm.require({
    message: '确定要断开连接吗？',
    header: '确定',
    icon: 'i-ri-error-warning-line',
    accept: () => {
      settingStore.logout()
      router.push('/login')
    }
  })
}

// 重置应用
const resetApp = () => {
  confirm.require({
    message: '确定要清空数据吗？',
    header: '确定',
    icon: 'i-ri-alert-line',
    acceptClass: '!bg-red-500',
    accept: () => {
      const dbRequest = window.indexedDB.deleteDatabase('RimeQDB')
      dbRequest.onsuccess = () => {
        localStorage.clear()
        sessionStorage.clear()
        window.location.reload()
      }
      dbRequest.onerror = dbRequest.onsuccess
    }
  })
}

// 加载初始数据
onMounted(async () => {
  if (!settingStore.isConnected) {
    Object.assign(robotStatus, { online: false, appName: '未连接', appVersion: 'N/A', protocolVersion: 'N/A' });
    return;
  }
  try {
    const [statusRes, versionRes] = await Promise.all([bot.getStatus(), bot.getVersionInfo()])
    robotStatus.online = statusRes.online && statusRes.good
    robotStatus.appName = versionRes.app_name
    robotStatus.appVersion = versionRes.app_version
    robotStatus.protocolVersion = versionRes.protocol_version
  } catch (e) {
    console.error('[Settings] 状态加载失败:', e)
    Object.assign(robotStatus, { online: false, appName: '获取失败' })
  }
})
</script>
