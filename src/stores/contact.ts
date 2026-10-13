import { defineStore } from 'pinia'
import { shallowReactive, shallowRef, computed } from 'vue'
import { bot } from '@/api'
import { database, useIdbStorage } from './database'
import type { GroupInfo, Request, Notice, FriendCategory, GroupMemberInfo } from '@/types'

/**
 * 联系人与通知状态管理 Store
 * @description 负责好友、群组、系统通知的管理，并提供名称和群成员的缓存机制
 */
export const useContactStore = defineStore('contact', () => {
  /** 持久化的好友列表 */
  const friends = useIdbStorage<FriendCategory[]>('rimeq-friends', [])
  /** 持久化的群组列表 */
  const groups = useIdbStorage<GroupInfo[]>('rimeq-groups', [])
  /** 持久化的系统请求 */
  const requests = useIdbStorage<Request[]>('rimeq-requests', [])
  /** 持久化的系统通知 */
  const notices = useIdbStorage<Notice[]>('rimeq-notices', [])
  /** 群成员内存缓存 */
  const members = shallowReactive(new Map<number, GroupMemberInfo[]>())
  /** 已加载成员列表的群组 ID */
  const fetchedGroups = shallowRef(new Set<number>())

  /** 好友名称与 ID 的索引 */
  const friendIndex = computed(() => {
    const map = new Map<number, string>()
    for (const cat of friends.value) {
      for (const f of cat.buddyList) map.set(f.user_id, f.remark || f.nickname)
    }
    return map
  })

  /**
   * 获取群成员
   * @param groupId - 目标群号
   * @param userId - 用户的 ID
   * @returns 群成员信息，未找到返回 undefined
   */
  function getMember(groupId: number, userId: number): GroupMemberInfo | undefined {
    return members.get(groupId)?.find(m => m.user_id === userId)
  }

  /**
   * 从 API 拉取所有联系人信息，包括好友和群组列表
   * 优先尝试获取带分组的好友列表，失败则回退到普通好友列表
   */
  async function fetchContacts() {
    try {
      groups.value = await bot.getGroupList()
    } catch (e) {
      console.error('[Contact] 获取群组列表失败', e)
      groups.value = []
    }
    try {
      const cats = await bot.getFriendsWithCategory()
      if (!Array.isArray(cats) || cats.length === 0) {
        throw new Error('Friend Categories is Empty')
      }
      friends.value = cats
    } catch (e) {
      console.warn('[Contact] 获取分组列表失败:', e)
      try {
        const fList = await bot.getFriendList()
        friends.value = fList && fList.length > 0
          ? [{ categoryId: 0, categoryName: '我的好友', categorySortId: 1, categoryMbCount: fList.length, onlineCount: 0, buddyList: fList }]
          : []
      } catch (e) {
        console.error('[Contact] 获取好友列表失败:', e)
        friends.value = []
      }
    }
  }

  /**
   * 获取指定群组的成员列表
   * @param groupId - 目标群组的 ID
   * @param force - 是否强制从 API 重新获取
   * @returns 完整成员列表
   */
  async function fetchGroupMembers(groupId: number, force = false): Promise<GroupMemberInfo[]> {
    if (!force && members.has(groupId)) {
      if (!fetchedGroups.value.has(groupId)) refreshGroupMembers(groupId)
      return members.get(groupId)!
    }
    const cached = await database.members.where('group_id').equals(groupId).toArray()
    if (cached.length > 0) {
      members.set(groupId, cached)
      if (!fetchedGroups.value.has(groupId)) refreshGroupMembers(groupId)
      return cached
    }
    return refreshGroupMembers(groupId)
  }

  /**
   * 从 API 刷新群成员并更新数据库
   * @param groupId - 目标群组的 ID
   */
  async function refreshGroupMembers(groupId: number): Promise<GroupMemberInfo[]> {
    try {
      const list = await bot.getGroupMemberList(groupId)
      if (list && list.length > 0) {
        await database.members.bulkPut(list.map(m => ({ ...m, group_id: groupId })))
        members.set(groupId, list)
        fetchedGroups.value.add(groupId)
        return list
      }
    } catch (e) {
      console.error(`[Contact] 获取群 ${groupId} 成员列表失败:`, e)
    }
    return []
  }

  /**
   * 更新群成员信息
   * @param notice - 包含更新信息的通知对象
   */
  async function updateGroupMember(notice: Notice) {
    const { group_id: groupId, user_id: userId } = notice as { group_id?: number; user_id?: number }
    if (!groupId || !userId) return
    if (!members.has(groupId)) await fetchGroupMembers(groupId)
    const list = members.get(groupId)
    if (!list) return
    const index = list.findIndex(m => m.user_id === userId)
    const member = list[index]
    const patch = (data: Partial<GroupMemberInfo>) => {
      if (index !== -1) members.set(groupId, list.map((m, i) => i === index ? { ...m, ...data } : m))
      database.members.where({ group_id: groupId, user_id: userId }).modify(data).catch(() => {})
    }
    switch (notice.notice_type) {
      case 'group_increase': {
        if (index !== -1) break
        try {
          const info = await bot.getGroupMemberInfo(groupId, userId)
          await database.members.put({ ...info, group_id: groupId })
          members.set(groupId, [...list, info])
        } catch (e) {
          console.error('[Contact] 获取新成员信息失败:', e)
        }
        break
      }
      case 'group_decrease':
        if (index === -1) break
        members.set(groupId, list.filter(m => m.user_id !== userId))
        await database.members.where({ group_id: groupId, user_id: userId }).delete()
        break
      case 'group_admin':
        if (member) patch({ role: notice.sub_type === 'set' ? 'admin' : 'member' })
        break
      case 'group_card':
        if (member) patch({ card: notice.card_new })
        break
      case 'group_ban':
        patch({ shut_up_end_time: notice.duration > 0 ? Date.now() / 1000 + notice.duration : 0 })
        break
      case 'notify':
        if (member && notice.sub_type === 'title') patch({ title: notice.title })
        break
    }
  }

  /**
   * 添加一条新的系统请求
   * @param request - 新的请求对象
   */
  function addRequest(request: Request) {
    if (requests.value.some(n => n.flag === request.flag && n.time === request.time)) return
    requests.value.unshift(request)
  }

  /**
   * 添加一条需要用户处理的通知
   * @param notice - 新的通知对象
   */
  function addNotice(notice: Notice) {
    const exists = notices.value.some(n =>
      n.time === notice.time &&
      n.notice_type === notice.notice_type &&
      (n as any).user_id === (notice as any).user_id
    )
    if (!exists) notices.value.unshift(notice)
  }

  /**
   * 移除或清空系统请求
   * @param request - 要移除的请求对象
   * @param clear - 是否清空所有请求
   */
  function removeRequest(request: Request, clear = false) {
    if (clear) {
      requests.value = []
      return
    }
    if (!request || !request.flag) return
    const index = requests.value.findIndex(n => n.flag === request.flag)
    if (index !== -1) requests.value.splice(index, 1)
  }

  /**
   * 移除或清空系统通知
   * @param notice - 要移除的通知对象
   * @param clear - 是否清空所有通知
   */
  function removeNotice(notice: Notice, clear = false) {
    if (clear) return (notices.value = [])
    if (!notice) return
    const index = notices.value.findIndex(n =>
      n.time === notice.time &&
      n.notice_type === notice.notice_type &&
      (n as any).user_id === (notice as any).user_id
    )
    if (index > -1) notices.value.splice(index, 1)
  }

  /**
   * 获取用户的显示名称
   * @param userId - 用户的 ID
   * @param groupId - (可选) 当前群号，用于获取群名片
   * @param fallbackNick - 当本地无数据时，可提供的备用昵称
   * @returns 用户的显示名称
   */
  function getUserName(userId: number, groupId?: number, fallbackNick?: string): string {
    if (groupId) {
      const member = getMember(groupId, userId)
      if (member) return member.card || member.nickname
    }
    const friendName = friendIndex.value.get(userId)
    if (friendName) return friendName
    for (const memberList of members.values()) {
      const m = memberList.find(u => u.user_id === userId)
      if (m) return m.card || m.nickname
    }
    if (groupId && !members.has(groupId)) fetchGroupMembers(groupId)
    if (fallbackNick) return fallbackNick
    return `用户(${userId})`
  }

  /**
   * 获取群组的显示名称
   * @param groupId - 群组的 ID
   * @param fallbackName - 当本地无数据时，可提供的备用群名
   * @returns 群组的显示名称
   */
  function getGroupName(groupId: number, fallbackName?: string): string {
    const group = groups.value.find(g => g.group_id === groupId)
    if (group) return group.group_name
    bot.getGroupInfo(groupId)
      .then(res => {
        if (!groups.value.some(g => g.group_id === groupId)) groups.value.push(res)
      }).catch(() => {})
    if (fallbackName) return fallbackName
    return `群(${groupId})`
  }

  /**
   * 判断指定 ID 是否为群组
   * @description 基于本地群组列表进行精确匹配
   */
  function checkIsGroup(id: number): boolean {
    return groups.value.some(g => g.group_id === id)
  }

  return { friends, groups, requests, notices, members,
    removeRequest, removeNotice, addRequest, addNotice,
    fetchGroupMembers, fetchContacts, updateGroupMember,
    getUserName, getGroupName, checkIsGroup, getMember,
  }
})
