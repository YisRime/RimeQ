import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Root',
        redirect: '/chats'
      },
      {
        path: 'chats/:id?',
        component: () => import('@/views/Session.vue'),
        children: [
          {
            path: 'detail',
            name: 'ChatDetail',
            components: {
              sidebar: () => import('@/views/pages/InfoPanel.vue')
            },
            props: { sidebar: true }
          },
          {
            path: 'files',
            name: 'GroupFiles',
            components: {
              sidebar: () => import('@/views/pages/FilePanel.vue')
            },
            props: { sidebar: true }
          },
          {
            path: 'notice',
            name: 'GroupNotice',
            components: {
              sidebar: () => import('@/views/pages/NoticePanel.vue')
            },
            props: { sidebar: true }
          },
          {
            path: 'essence',
            name: 'GroupEssence',
            components: {
              sidebar: () => import('@/views/pages/EssencePanel.vue')
            },
            props: { sidebar: true }
          }
        ]
      },
      {
        path: 'options',
        name: 'Options',
        component: () => import('@/views/Option.vue')
      },
      {
        path: 'contacts/new-friends',
        name: 'NewFriends',
        component: () => import('@/views/Notice.vue')
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    const saved = authStore.getSavedConfig()
    if (saved && saved.autoConnect && !authStore.isConnecting) {
      next('/login')
    } else {
      next('/login')
    }
  } else {
    next()
  }
})
