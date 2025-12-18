<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
    class="h-full"
  >
    <n-global-style />

    <n-loading-bar-provider>
      <n-message-provider>
        <n-notification-provider>
          <n-dialog-provider>
            <router-view />

            <!-- 全局组件 -->
            <MediaViewer v-model="optionStore.viewerState.show" :src="optionStore.viewerState.currentSrc" />
          </n-dialog-provider>
        </n-notification-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  NConfigProvider,
  NGlobalStyle,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
  NLoadingBarProvider,
  darkTheme,
  zhCN,
  dateZhCN
} from 'naive-ui'
import { useOptionStore } from './stores/option'
import MediaViewer from './components/MediaViewer.vue'

const optionStore = useOptionStore()

const theme = computed(() => (optionStore.isDark ? darkTheme : null))

// 动态主题色覆盖
const themeOverrides = computed(() => {
  // 直接使用 optionStore 导出的 themeColorHex computed 属性
  const primaryColor = optionStore.themeColorHex

  return {
    common: {
      primaryColor: primaryColor,
      primaryColorHover: primaryColor,
      primaryColorPressed: primaryColor
    }
  }
})

onMounted(() => {
  // 初始化设置 (应用 CSS 变量、自定义 CSS 等)
  optionStore.applyOptions()
})
</script>

<style>
/* 确保 html/body 占满 */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
