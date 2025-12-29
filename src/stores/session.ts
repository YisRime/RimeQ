import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useContactStore } from './contact'
import { useSettingStore } from './setting'

// 定义数据结构
export interface Session {
  id: string                   // 会话ID (用户ID或群组ID)
  type: 'private' | 'group'    // 会话类型
  name: string                 // 会话名称 (兜底)
  avatar: string               // 会话头像 (兜底)
  preview: string              // 最新消息预览
  time: number                 // 最新消息时间戳
  unread: number               // 未读消息数
}

export const useSessionStore = defineStore('session', () => {
  const contactStore = useContactStore()
  const settingStore = useSettingStore()
  // 持久化会话列表
  const sessions = useStorage<Session[]>('rimeq-sessions', [])

  // 会话列表排序
  const sortedSessions = computed(() => {
    if (!settingStore.isLogged) return []
    return [...sessions.value].sort((a, b) => b.time - a.time)
  })

  // 获取单个会话
  function getSession(id: string): Session | undefined {
    return sessions.value.find(s => s.id === id)
  }

  // 更新或创建会话
  function updateSession(id: string, partial: Partial<Session>) {
    const index = sessions.value.findIndex(s => s.id === id)

    if (index !== -1) {
      const current = sessions.value[index]
      if (current) {
        const originalUnread = current.unread || 0
        Object.assign(current, partial)
        if (typeof partial.unread === 'number') {
          current.unread = originalUnread + partial.unread
        }
        sessions.value.splice(index, 1)
        sessions.value.unshift(current)
      }
    } else {
      const isGroup = partial.type === 'group' || id.length > 5
      let name: string
      let avatar: string

      if (isGroup) {
        // 获取群组名
        name = contactStore.getGroupName(id)
        avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      } else {
        // 获取用户名
        name = contactStore.getFriendName(id)
        avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
      }
      const newSession: Session = {
        id,
        type: isGroup ? 'group' : 'private',
        name,
        avatar,
        preview: partial.preview || '',
        time: partial.time || Date.now(),
        unread: partial.unread || 1
      }
      sessions.value.unshift(newSession)
    }
  }

  // 清除未读计数
  function clearUnread(id: string) {
    const session = getSession(id)
    if (session) {
      session.unread = 0
    }
  }

  // 移除指定会话
  function removeSession(id: string) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index > -1) {
      sessions.value.splice(index, 1)
    }
  }

  return { sessions: sortedSessions, getSession, updateSession, clearUnread, removeSession }
})
