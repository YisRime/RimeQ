import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useSettingStore } from '@/stores/setting'

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
  // 功能页面
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
  // 群侧边栏
  {
    path: '/:id/member',
    name: 'GroupMember',
    components: { default: ChatView, nav: SessionList, sidebar: GroupMember },
    meta: { title: '群成员' }
  },
  {
    path: '/:id/file',
    name: 'GroupFile',
    components: { default: ChatView, nav: SessionList, sidebar: GroupFile },
    meta: { title: '群文件' }
  },
  {
    path: '/:id/notice',
    name: 'GroupNotice',
    components: { default: ChatView, nav: SessionList, sidebar: GroupNotice },
    meta: { title: '群公告' }
  },
  {
    path: '/:id/essence',
    name: 'GroupEssence',
    components: { default: ChatView, nav: SessionList, sidebar: GroupEssence },
    meta: { title: '群精华' }
  },
  {
    path: '/:id/forward',
    name: 'MultiForward',
    components: { default: ChatView, nav: SessionList, sidebar: MultiForward },
    meta: { title: '转发' }
  },
  // 会话主页
  {
    path: '/:id?',
    name: 'Chat',
    components: { default: ChatView, nav: SessionList },
    meta: { title: '会话' }
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/**
 * 路由守卫
 */
router.beforeEach((to, from, next) => {
  if (to.meta.title) document.title = `${to.meta.title} - RimeQ`
  const settingStore = useSettingStore()
  if (settingStore.isLogged) {
    if (to.name === 'Login') {
      return next('/')
    }
    return next()
  }

  else {
    if (to.meta.public === true) {
      return next()
    }
    else {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }
  }
})
