import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
  // 纯内存数组
  const sessions = ref<Session[]>([])
  const contactStore = useContactStore()

  // 计算属性：按时间倒序排列
  const sortedSessions = computed(() => {
    return sessions.value.sort((a, b) => b.time - a.time)
  })

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

      // 显式检查 current 是否存在，解决 TS 的 undefined 报错
      if (current) {
        // 1. 合并基础属性 (preview, time 等)
        Object.assign(current, partial)

        // 2. 特殊处理未读数 (累加逻辑)
        // 如果传入的是 0，表示清空；如果大于 0，表示新消息累加
        if (typeof partial.unread === 'number') {
           if (partial.unread === 0) {
             current.unread = 0
           } else {
             current.unread = (current.unread || 0) + partial.unread
           }
        }

        // 3. 置顶会话 (先删除旧位置，再插入到头部)
        sessions.value.splice(index, 1)
        sessions.value.unshift(current)
      }
    }
    // 情况 B: 会话不存在，新建
    else {
      const isGroup = partial.type === 'group' || id.length > 5
      let name = `会话 ${id}`
      let avatar = ''

      // 尝试从联系人 Store 获取更详细的信息
      if (isGroup) {
        name = contactStore.getGroupName(Number(id))
        avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      } else {
        name = contactStore.getFriendName(Number(id))
        avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
      }

      // 构建新会话对象
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
    sessions: sortedSessions,
    getSession,
    updateSession,
    clearUnread,
    removeSession
  }
}, {
  // 持久化配置
  persist: {
    paths: ['sessions'],
    storage: localStorage
  } as any
})
