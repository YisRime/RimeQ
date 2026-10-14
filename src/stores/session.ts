import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useContactStore } from './contact'
import { useSettingStore } from './setting'
import { database } from './database'

/**
 * 定义会话对象的数据结构
 */
export interface Session {
  /** 唯一标识 */
  id: number
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

  /** 本地会话列表 */
  const stored = ref<Session[]>([])
  /** id → 会话 索引 */
  const index = new Map<number, Session>()

  /**
   * 按时间降序插入并登记索引
   * @param session - 待插入的会话
   * @returns 数组中的响应式引用
   */
  function insertSorted(session: Session): Session {
    const list = stored.value
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((list[mid]?.time ?? 0) > session.time) lo = mid + 1
      else hi = mid
    }
    list.splice(lo, 0, session)
    const view = list[lo] ?? session
    index.set(session.id, view)
    return view
  }

  /**
   * 写入单条会话
   * @param session - 待持久化的会话
   */
  function persist(session: Session) {
    database.sessions.put({ ...session }).catch(e => console.warn('[Session] 写入会话失败:', e))
  }

  /** 载入本地会话 */
  async function loadSessions() {
    const list = await database.sessions.toArray()
    for (const s of list) {
      if (!index.has(s.id)) stored.value.push(s)
    }
    stored.value.sort((a, b) => b.time - a.time)
    index.clear()
    for (const s of stored.value) index.set(s.id, s)
  }
  loadSessions().catch(e => console.warn('[Session] 读取本地会话失败:', e))

  /** (计算属性) 按最新消息时间排序的会话列表 */
  const sortedSessions = computed(() => (settingStore.isLogged ? stored.value : []))

  /**
   * 根据 ID 获取单个会话对象
   * @param id - 目标会话的 ID
   * @returns 匹配的会话对象，如果不存在则返回 `undefined`
   */
  function getSession(id: number): Session | undefined {
    return index.get(id)
  }

  /**
   * 获取会话类型
   * @param id - 目标会话的 ID
   * @returns 会话类型 ('group' | 'private')
   */
  function getSessionType(id: number): 'group' | 'private' {
    const session = index.get(id)
    if (session) return session.type
    return contactStore.checkIsGroup(id) ? 'group' : 'private'
  }

  /**
   * 更新或创建一个会话
   * @description 已存在时原位更新并重新定位到正确的时间位置；不存在时创建
   * @param id - 目标会话的 ID
   * @param partial - 要更新或创建的会话的部分数据
   */
  function updateSession(id: number, partial: Partial<Session>) {
    const current = index.get(id)
    if (current) {
      const originalUnread = current.unread || 0
      Object.assign(current, partial)
      if (typeof partial.unread === 'number') current.unread = originalUnread + partial.unread
      const from = stored.value.indexOf(current)
      if (from !== -1) stored.value.splice(from, 1)
      persist(insertSorted(current))
      return
    }

    let name: string
    let avatar: string
    if (partial.type === 'group') {
      name = contactStore.getGroupName(id)
      avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      void contactStore.ensureGroupInfo(id)
    } else {
      name = contactStore.getUserName(id)
      avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
    }
    persist(insertSorted({
      id,
      type: partial.type || 'private',
      name,
      avatar,
      preview: partial.preview || '',
      time: partial.time || Date.now(),
      unread: partial.unread || 1
    }))
  }

  /**
   * 清除指定会话的未读消息计数
   * @param id - 目标会话的 ID
   */
  function clearUnread(id: number) {
    const session = index.get(id)
    if (session && session.unread !== 0) {
      session.unread = 0
      persist(session)
    }
  }

  /**
   * 从列表中移除一个会话
   * @param id - 要移除的会话的 ID
   */
  function removeSession(id: number) {
    const session = index.get(id)
    if (!session) return
    const at = stored.value.indexOf(session)
    if (at > -1) stored.value.splice(at, 1)
    index.delete(id)
    database.sessions.delete(id).catch(e => console.warn('[Session] 删除会话失败:', e))
  }

  return { sessions: sortedSessions, getSession, getSessionType, updateSession, clearUnread, removeSession }
})
