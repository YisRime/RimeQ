import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bot } from '@/api'
import type { FriendInfo, GroupInfo, GroupMemberInfo, SystemNotice } from '@/types'

/** 统一会话接口 (用于列表渲染) */
export interface Session {
  id: string
  type: 'private' | 'group'
  name: string
  avatar: string
  preview: string
  time: number
  unread: number
}

/**
 * 联系人 Store
 * 管理好友、群组、群成员及会话列表
 */
export const useContactsStore = defineStore('contacts', () => {
  // --- State ---

  /** 好友列表 */
  const friends = ref<FriendInfo[]>([])

  /** 群组列表 */
  const groups = ref<GroupInfo[]>([])

  /** 群成员缓存 (Key: GroupID) */
  const members = ref<Map<number, GroupMemberInfo[]>>(new Map())

  /** 活跃会话列表 */
  const sessions = ref<Session[]>([])

  /** 系统通知列表 */
  const notices = ref<SystemNotice[]>([])

  // --- Actions ---

  /**
   * 同步基础数据
   * 拉取好友与群组列表
   */
  async function syncData() {
    try {
      const [fList, gList] = await Promise.all([
        bot.getFriendList(),
        bot.getGroupList()
      ])
      friends.value = fList
      groups.value = gList
    } catch (e) {
      console.error('通讯录同步失败', e)
    }
  }

  /**
   * 获取群成员列表
   * @param gid - 群号
   * @param force - 是否强制刷新网络请求
   */
  async function getMembers(gid: number, force = false) {
    if (!force && members.value.has(gid)) {
      return members.value.get(gid)!
    }
    try {
      const list = await bot.getGroupMemberList(gid)
      members.value.set(gid, list)
      return list
    } catch {
      return []
    }
  }

  /**
   * 更新或创建会话
   * @param id - 会话 ID (QQ号或群号)
   * @param data - 需要更新的字段
   */
  function updateSession(id: string, data: Partial<Session>) {
    const idx = sessions.value.findIndex(s => s.id === id)

    if (idx !== -1) {
      // 已存在：移动到顶部并更新
      const item = sessions.value[idx]
      sessions.value.splice(idx, 1)
      const updated = { ...item, ...data }
      // 累加未读数逻辑
      if (data.unread && data.unread > 0) {
        updated.unread = item.unread + data.unread
      }
      sessions.value.unshift(updated)
    } else {
      // 不存在：创建新会话
      const isGroup = data.type === 'group'
      let name = id
      let avatar = ''

      // 尝试从缓存中补全名称头像
      if (isGroup) {
        const g = groups.value.find(i => String(i.group_id) === id)
        name = g?.group_name || `群 ${id}`
        avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      } else {
        const f = friends.value.find(i => String(i.user_id) === id)
        name = f?.remark || f?.nickname || `用户 ${id}`
        avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
      }

      sessions.value.unshift({
        id,
        type: isGroup ? 'group' : 'private',
        name,
        avatar,
        preview: '',
        time: Date.now(),
        unread: 0,
        ...data
      })
    }
  }

  /**
   * 清除指定会话的未读数
   * @param id - 会话 ID
   */
  function clearUnread(id: string) {
    const s = sessions.value.find(i => i.id === id)
    if (s) s.unread = 0
  }

  /**
   * 获取单个会话对象
   * @param id - 会话 ID
   */
  function getSession(id: string) {
    return sessions.value.find(s => s.id === id)
  }

  /**
   * 移除会话 (通常用于删除好友/退群)
   * @param id - 会话 ID
   */
  function removeSession(id: string) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) sessions.value.splice(idx, 1)
  }

  return {
    friends,
    groups,
    members,
    sessions,
    notices,
    syncData,
    getMembers,
    updateSession,
    clearUnread,
    getSession,
    removeSession
  }
})
