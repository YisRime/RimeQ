import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDark, useToggle, useStorage } from '@vueuse/core'

export const useOptionStore = defineStore('option', () => {
  // --- UI 状态 ---
  const isDark = useDark()
  const toggleDark = useToggle(isDark)

  const isSidebarOpen = ref(false)
  const toggleSidebar = () => (isSidebarOpen.value = !isSidebarOpen.value)
  const closeSidebar = () => (isSidebarOpen.value = false)

  const viewerState = ref({
    show: false,
    currentSrc: '',
    list: [] as string[]
  })

  function openViewer(src: string, list?: string[]) {
    viewerState.value.show = true
    viewerState.value.currentSrc = src
    viewerState.value.list = list || [src]
  }

  function closeViewer() {
    viewerState.value.show = false
  }

  // --- 配置持久化 (使用 useStorage) ---
  const defaultConfig = {
    address: '',
    save_password: '' as string | boolean,
    auto_connect: false,
    notice_group: {} as Record<string, number[]>,
    opt_dark: false,
    opt_auto_dark: true,
    theme_color: 0,
    chat_background: '',
    chat_background_blur: 0,
    opt_fast_animation: true,
    chat_more_blur: false,
    initial_scale: 0.85,
    fs_adaptation: 0,
    opt_always_top: false,
    use_favicon_notice: true,
    use_super_face: true,
    close_notice: false,
    bubble_sort_user: false,
    close_respond: false,
    msg_taill: '',
    quick_send: 'default',
    group_notice_type: 'none',
    send_face: false,
    use_breakline: true,
    send_key: 'none',
    close_browser: false,
    msg_type: 2,
    log_level: 'err',
    debug_msg: false,
    custom_css: '',
    opt_anti_recall: false
  }

  const config = useStorage('options', defaultConfig, localStorage, {
    mergeDefaults: true
  })

  watch(config, () => applyOptions(), { deep: true })

  function applyOptions() {
    if (config.value.opt_auto_dark) {
      // VueUse handles auto dark mode
    } else {
      isDark.value = config.value.opt_dark
    }

    const cssId = 'custom-css-inject'
    let style = document.getElementById(cssId)
    if (!style) {
      style = document.createElement('style')
      style.id = cssId
      document.head.appendChild(style)
    }
    style.textContent = config.value.custom_css || ''

    const val = Number(config.value.theme_color)
    let colorHex = '#7abb7e'
    if (val > 10) {
      colorHex = '#' + ('000000' + val.toString(16)).slice(-6)
    } else {
      const presets = ['#7abb7e', '#92aa8a', '#f9a633', '#8076a3', '#b573f7', '#50534f']
      colorHex = presets[val] ?? presets[0]!
    }

    const root = document.documentElement
    root.style.setProperty('--n-primary-color', colorHex)
    root.style.setProperty('--n-primary-color-hover', adjustColor(colorHex, 20))
    root.style.setProperty('--n-primary-color-pressed', adjustColor(colorHex, -20))
    root.style.setProperty('--primary-color', colorHex)
  }

  function adjustColor(color: string, amount: number) {
    return '#' + color.replace(/^#/, '').replace(/../g, (c) =>
      ('0' + Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).substr(-2)
    )
  }

  const themeColorHex = computed(() => {
    const val = Number(config.value.theme_color)
    if (val > 10) {
      return '#' + ('000000' + val.toString(16)).slice(-6)
    } else {
      const presets = ['#7abb7e', '#92aa8a', '#f9a633', '#8076a3', '#b573f7', '#50534f']
      return presets[val] ?? presets[0]!
    }
  })

  applyOptions()

  return {
    isDark,
    toggleDark,
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    viewerState,
    openViewer,
    closeViewer,
    config,
    applyOptions,
    themeColorHex
  }
})
