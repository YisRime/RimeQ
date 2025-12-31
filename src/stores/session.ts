import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useContactStore } from './contact'
import { useSettingStore } from './setting'

/**
 * 定义会话对象的数据结构
 */
export interface Session {
  /** 唯一标识 */
  id: string
  /** 会话类型 */
  type: 'private' | 'group'
  /** 会话名称 (备用) */
  name: string
  /** 会话头像 URL (备用) */
  avatar: string
  /** 最新消息的文本预览 */
  preview: string
  /** 最新消息的时间戳 */
  time: number
  /** 未读消息数量 */
  unread: number
}

/**
 * 最近会话列表状态管理 Store
 * @description 负责维护、更新和排序用户的聊天会话列表
 */
export const useSessionStore = defineStore('session', () => {
  const contactStore = useContactStore()
  const settingStore = useSettingStore()
  /** 持久化存储的会话列表 */
  const sessions = useStorage<Session[]>('rimeq-sessions', [])
  /** (计算属性) 按最新消息时间排序的会话列表 */
  const sortedSessions = computed(() => {
    if (!settingStore.isLogged) return []
    return [...sessions.value].sort((a, b) => b.time - a.time)
  })

  /**
   * 根据 ID 获取单个会话对象
   * @param id - 目标会话的 ID
   * @returns 匹配的会话对象，如果不存在则返回 `undefined`
   */
  function getSession(id: string): Session | undefined {
    return sessions.value.find(s => s.id === id)
  }

  /**
   * 更新或创建一个会话
   * 如果会话已存在，则更新其信息；否则，创建一个新的会话
   * @param id - 目标会话的 ID
   * @param partial - 要更新或创建的会话的部分数据
   */
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
      let name: string
      let avatar: string
      if (partial.type === 'group') {
        name = contactStore.getGroupName(id)
        avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      } else {
        name = contactStore.getFriendName(id)
        avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
      }
      const newSession: Session = {
        id,
        type: partial.type || 'private',
        name,
        avatar,
        preview: partial.preview || '',
        time: partial.time || Date.now(),
        unread: partial.unread || 1
      }
      sessions.value.unshift(newSession)
    }
  }

  /**
   * 清除指定会话的未读消息计数
   * @param id - 目标会话的 ID
   */
  function clearUnread(id: string) {
    const session = getSession(id)
    if (session) session.unread = 0
  }

  /**
   * 从列表中移除一个会话
   * @param id - 要移除的会话的 ID
   */
  function removeSession(id: string) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index > -1) sessions.value.splice(index, 1)
  }

  return { sessions: sortedSessions, getSession, updateSession, clearUnread, removeSession }
})
