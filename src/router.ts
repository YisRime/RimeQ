import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { settingsStore } from '@/utils/settings'

// 视图组件
import LoginView from '@/views/Login.vue'
import ChatView from '@/views/Chat.vue'
import SettingsView from '@/views/Settings.vue'
import NoticeView from '@/views/Notice.vue'
import SessionList from '@/views/Session.vue'
import ContactList from '@/views/Contact.vue'

// 侧边栏组件
import GroupFile from '@/views/pages/GroupFile.vue'
import GroupNotice from '@/views/pages/GroupNotice.vue'
import GroupEssence from '@/views/pages/GroupEssence.vue'
import GroupMember from '@/views/pages/GroupMember.vue'
import MultiForward from '@/views/pages/MultiForward.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    components: { default: LoginView, nav: SessionList },
    meta: { public: true, title: '登录' }
  },
  {
    path: '/settings',
    name: 'Settings',
    components: { default: SettingsView, nav: SessionList },
    meta: { title: '设置' }
  },
  {
    path: '/contact',
    name: 'Contact',
    components: { default: ChatView, nav: ContactList },
    meta: { title: '好友' }
  },
  {
    path: '/notice',
    name: 'Notice',
    components: { default: NoticeView, nav: ContactList },
    meta: { title: '通知' }
  },
  {
    path: '/:id?',
    name: 'Chat',
    components: { default: ChatView, nav: SessionList },
    meta: { title: '会话' },
    children: [
      { path: 'member', name: 'GroupMember', components: { sidebar: GroupMember } },
      { path: 'file', name: 'GroupFile', components: { sidebar: GroupFile } },
      { path: 'notice', name: 'GroupNotice', components: { sidebar: GroupNotice } },
      { path: 'essence', name: 'GroupEssence', components: { sidebar: GroupEssence } },
      { path: 'forward', name: 'MultiForward', components: { sidebar: MultiForward } }
    ]
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/**
 * 路由守卫：处理鉴权逻辑
 */
router.beforeEach((to, from, next) => {
  if (to.meta.title) document.title = `${to.meta.title} - RimeQ`

  if (settingsStore.isLogged) {
    if (to.name === 'Login') return next('/')
    next()
  } else {
    if (to.meta.public === true) next()
    else next({ name: 'Login', query: { redirect: to.fullPath } })
  }
})
