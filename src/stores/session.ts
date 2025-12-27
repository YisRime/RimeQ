import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useContactStore } from './contact'

export interface Session {
  id: string
  type: 'private' | 'group'
  name: string
  avatar: string
  preview: string
  time: number
  unread: number
}

export const useSessionStore = defineStore('session', () => {
  const contactStore = useContactStore()

  // ============================================================================
  // 持久化状态：会话列表
  // 使用 useStorage 确保持久化到 localStorage
  // ============================================================================
  const sessions = useStorage<Session[]>('rime-sessions', [])

  // ============================================================================
  // 计算属性
  // ============================================================================
  const sortedSessions = computed(() => {
    return sessions.value.sort((a, b) => b.time - a.time)
  })

  // ============================================================================
  // 动作
  // ============================================================================

  // 获取单个会话
  function getSession(id: string) {
    return sessions.value.find(s => s.id === id)
  }

  // 更新或创建会话
  function updateSession(id: string, partial: Partial<Session>) {
    const index = sessions.value.findIndex(s => s.id === id)

    // 情况 A: 会话已存在
    if (index !== -1) {
      const current = sessions.value[index]
      if (current) {
        // 1. 合并属性
        Object.assign(current, partial)

        // 2. 累加未读数
        if (typeof partial.unread === 'number') {
           if (partial.unread === 0) {
             current.unread = 0
           } else {
             current.unread = (current.unread || 0) + partial.unread
           }
        }

        // 3. 置顶会话 (操作数组，useStorage 会自动同步)
        sessions.value.splice(index, 1)
        sessions.value.unshift(current)
      }
    }
    // 情况 B: 新建会话
    else {
      const isGroup = partial.type === 'group' || id.length > 5
      let name = `会话 ${id}`
      let avatar = ''

      if (isGroup) {
        name = contactStore.getGroupName(Number(id))
        avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      } else {
        name = contactStore.getFriendName(Number(id))
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

  // 清除未读数
  function clearUnread(id: string) {
    const s = sessions.value.find(i => i.id === id)
    if (s) s.unread = 0
  }

  // 删除会话
  function removeSession(id: string) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx > -1) sessions.value.splice(idx, 1)
  }

  return {
    sessions: sortedSessions, // 导出排序后的计算属性
    getSession,
    updateSession,
    clearUnread,
    removeSession
  }
})
