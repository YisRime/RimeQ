import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAccountsStore } from '@/stores/accounts'

// Views - 主要视图组件
import LoginView from '@/views/Login.vue'
import ChatView from '@/views/Chat.vue'
import SettingView from '@/views/Settings.vue'
import NoticeView from '@/views/Notice.vue'

// Sidebar Components - 左侧导航组件
import SessionBar from '@/views/pages/ListSession.vue'
import ContactBar from '@/views/pages/ListContact.vue'

// Sub-Sidebar Panels - 右侧面板组件
import PanelChatInfo from '@/views/pages/PanelChatInfo.vue'
import PanelGroupFile from '@/views/pages/PanelGroupFile.vue'
import PanelAnnounce from '@/views/pages/PanelAnnounce.vue'
import PanelEssence from '@/views/pages/PanelEssence.vue'

/**
 * 路由配置表
 * @remarks
 */
const routes: RouteRecordRaw[] = [
  /**
   * 登录页
   */
  {
    path: '/login',
    name: 'Login',
    components: { default: LoginView, nav: SessionBar },
    meta: { public: true }
  },

  /**
   * 联系人列表页
   */
  {
    path: '/contact',
    name: 'Contact',
    components: { default: ChatView, nav: ContactBar }
  },

  /**
   * 通知/新朋友页
   */
  {
    path: '/notice',
    name: 'Notice',
    components: { default: NoticeView, nav: ContactBar }
  },

  /**
   * 设置页
   */
  {
    path: '/settings',
    name: 'Settings',
    components: { default: SettingView, nav: SessionBar }
  },

  /**
   * 会话页
   * @description
   * 包含子路由用于显示右侧面板
   */
  {
    path: '/:id?',
    name: 'Chat',
    components: { default: ChatView, nav: SessionBar },
    children: [
      /** 聊天详情面板 */
      { path: 'detail', name: 'ChatDetail', components: { sidebar: PanelChatInfo } },
      /** 群文件面板 */
      { path: 'files', name: 'ChatFiles', components: { sidebar: PanelGroupFile } },
      /** 群公告面板 */
      { path: 'notice', name: 'ChatNotice', components: { sidebar: PanelAnnounce } },
      /** 精华消息面板 */
      { path: 'essence', name: 'ChatEssence', components: { sidebar: PanelEssence } }
    ]
  }
]

/**
 * 路由实例
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/**
 * 全局前置守卫
 */
router.beforeEach((to, from, next) => {
  const accountsStore = useAccountsStore()
  const isPublic = to.meta.public === true

  // 已登录状态
  if (accountsStore.isLogged) {
    if (to.path === '/login') return next('/')
    return next()
  }
  // 未登录状态
  else {
    if (isPublic) return next()
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
})
