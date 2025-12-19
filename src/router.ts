import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAccountsStore } from '@/stores/accounts'
import { useSettingsStore } from '@/stores/settings'

// Views
import ChatView from '@/views/Chat.vue'
import LoginView from '@/views/Login.vue'
import SettingView from '@/views/Settings.vue'
import NoticeView from '@/views/Notice.vue'

// Sidebar Components
import SessionBar from '@/views/pages/ListSession.vue'
import ContactBar from '@/views/pages/ListContact.vue'

// Sub-Sidebar Panels
import PanelChatInfo from '@/views/pages/PanelChatInfo.vue'
import PanelGroupFile from '@/views/pages/PanelGroupFile.vue'
import PanelAnnounce from '@/views/pages/PanelAnnounce.vue'
import PanelEssence from '@/views/pages/PanelEssence.vue'

const routes: RouteRecordRaw[] = [
  // 1. 登录页
  // 左侧显示 SessionBar (未登录时为空列表)，右侧显示 LoginView
  {
    path: '/login',
    name: 'Login',
    components: {
      default: LoginView,
      nav: SessionBar
    },
    meta: { requiresAuth: false }
  },

  // 2. 聊天页 (默认首页)
  {
    path: '/',
    redirect: '/chats'
  },
  {
    path: '/chats/:id?',
    name: 'Chats',
    components: {
      default: ChatView,
      nav: SessionBar
    },
    meta: { requiresAuth: true },
    children: [
      { path: 'detail', components: { sidebar: PanelChatInfo }, props: { sidebar: true } },
      { path: 'files', components: { sidebar: PanelGroupFile }, props: { sidebar: true } },
      { path: 'notice', components: { sidebar: PanelAnnounce }, props: { sidebar: true } },
      { path: 'essence', components: { sidebar: PanelEssence }, props: { sidebar: true } }
    ]
  },

  // 3. 联系人页
  {
    path: '/contacts',
    name: 'Contacts',
    components: {
      default: ChatView, // 右侧保持当前聊天或空状态
      nav: ContactBar
    },
    meta: { requiresAuth: true }
  },

  // 4. 设置页
  {
    path: '/options',
    name: 'Options',
    components: {
      default: SettingView,
      nav: SessionBar
    },
    meta: { requiresAuth: true }
  },

  // 5. 新朋友页
  {
    path: '/contacts/new-friends',
    name: 'NewFriends',
    components: {
      default: NoticeView,
      nav: ContactBar
    },
    meta: { requiresAuth: true }
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// --- 路由守卫 ---
router.beforeEach(async (to, from, next) => {
  const accounts = useAccountsStore()
  const settings = useSettingsStore()

  // 1. 已经是登录状态，去登录页则跳转首页，去其他页放行
  if (accounts.isLogged) {
    if (to.path === '/login') {
      return next('/')
    }
    return next()
  }

  // 2. 目标是登录页，直接放行 (防止死循环)
  if (to.path === '/login') {
    return next()
  }

  // 3. 未登录状态：检查自动连接
  // 只有在配置了自动连接、且当前没有正在连接时才尝试
  if (settings.config.autoConnect && settings.config.token && !accounts.connecting) {
    try {
      console.log('[Router] 尝试自动重连...')
      await accounts.login(settings.config.address, settings.config.token)

      // 连接成功，放行
      if (accounts.isLogged) {
        return next()
      }
    } catch (e) {
      console.warn('[Router] 自动重连失败，跳转登录页', e)
    }
  }

  // 4. 需要鉴权但未登录，跳转登录页
  if (to.meta.requiresAuth !== false) {
    next('/login')
  } else {
    next() // 不需要鉴权的页面 (如果有)
  }
})
