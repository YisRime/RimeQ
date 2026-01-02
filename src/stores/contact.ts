import { defineStore } from 'pinia'
import { reactive, shallowRef } from 'vue'
import { useStorage } from '@vueuse/core'
import { bot } from '@/api'
import { database } from './database'
import { useMessageStore } from './message'
import type { GroupInfo, Request, FriendCategory, GroupMemberInfo } from '@/types'

/**
 * 联系人与通知状态管理 Store
 * @description 负责好友、群组、系统通知的管理，并提供名称和群成员的缓存机制
 */
export const useContactStore = defineStore('contact', () => {
  /** 持久化的好友列表 */
  const friends = useStorage<FriendCategory[]>('rimeq-friends', [])
  /** 持久化的群组列表 */
  const groups = useStorage<GroupInfo[]>('rimeq-groups', [])
  /** 持久化的系统通知 */
  const notices = useStorage<Request[]>('rimeq-notices', [])
  /** 群成员内存缓存 */
  const members = reactive(new Map<number, GroupMemberInfo[]>())
  /** 已加载成员列表的群组 ID */
  const fetchedGroups = shallowRef(new Set<number>())

  /**
   * 从 API 拉取所有联系人信息，包括好友和群组列表
   * 优先尝试获取带分组的好友列表，失败则回退到普通好友列表
   */
  async function fetchContacts() {
    try {
      groups.value = await bot.getGroupList() || []
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
        if (fList && fList.length > 0) {
          friends.value = [{
            categoryId: 0,
            categoryName: '我的好友',
            categorySortId: 1,
            categoryMbCount: fList.length,
            onlineCount: 0,
            buddyList: fList
          }]
        } else {
          friends.value = []
        }
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
   */
  async function fetchGroupMembers(groupId: number, force = false): Promise<GroupMemberInfo[]> {
    if (!force && members.has(groupId)) {
      if (!fetchedGroups.value.has(groupId)) refreshGroupMembers(groupId)
      return members.get(groupId)!
    }
    const databaseMembers = await database.members.where('group_id').equals(groupId).toArray()
    if (databaseMembers.length > 0) {
      members.set(groupId, databaseMembers)
      if (!fetchedGroups.value.has(groupId)) refreshGroupMembers(groupId)
      return databaseMembers
    }
    return await refreshGroupMembers(groupId)
  }

  /**
   * 从 API 刷新群成员并更新数据库
   * @param groupId - 目标群组的 ID
   */
  async function refreshGroupMembers(groupId: number): Promise<GroupMemberInfo[]> {
    try {
      const list = await bot.getGroupMemberList(groupId)
      if (list && list.length > 0) {
        const databaseItems = list.map(m => ({ ...m, group_id: groupId }))
        await database.members.bulkPut(databaseItems)
        members.set(groupId, list)
        fetchedGroups.value.add(groupId)
        return list
      }
      return []
    } catch (e) {
      console.error(`[Contact] 获取群 ${groupId} 成员列表失败:`, e)
      return []
    }
  }

  /**
   * 添加一条新的系统通知
   * @param notice - 新的通知对象
   */
  function addNotice(notice: Request) {
    const exists = notices.value.some(n => n.flag === notice.flag && n.time === notice.time)
    if (!exists) notices.value.unshift(notice)
  }

  /**
   * 根据 flag 移除一条系统通知
   * @param notice - 要移除的通知对象
   */
  function removeNotice(notice: Request) {
    const index = notices.value.findIndex(n => n.flag === notice.flag)
    if (index !== -1) notices.value.splice(index, 1)
  }

  /**
   * 获取用户的显示名称
   * @param userId - 用户的 ID
   * @param fallbackNick - 当本地无数据时，可提供的备用昵称
   * @returns 用户的显示名称
   */
  function getFriendName(userId: string | number, fallbackNick?: string): string {
    const msgStore = useMessageStore()
    const id = String(userId)
    for (const cat of friends.value) {
      const f = cat.buddyList.find(u => String(u.user_id) === id)
      if (f) return f.remark || f.nickname
    }
    if (msgStore.activeId) {
      const list = members.get(Number(msgStore.activeId))
      if (list) {
        const m = list.find(u => String(u.user_id) === id)
        if (m) return m.card || m.nickname
      }
    }
    if (fallbackNick) return fallbackNick
    bot.getStrangerInfo(Number(id)).catch(() => {})
    return `用户 ${id}`
  }

  /**
   * 获取群组的显示名称
   * @param groupId - 群组的 ID
   * @param fallbackName - 当本地无数据时，可提供的备用群名
   * @returns 群组的显示名称
   */
  function getGroupName(groupId: string | number, fallbackName?: string): string {
    const id = String(groupId)
    const group = groups.value.find(g => String(g.group_id) === id)
    if (group) return group.group_name
    if (fallbackName) return fallbackName
    bot.getGroupInfo(Number(id))
      .then(res => {
        if (!groups.value.some(g => String(g.group_id) === id)) groups.value.push(res)
      }).catch(() => {})
    return `群 ${id}`
  }

  /**
   * 判断指定 ID 是否为群组
   * @description 基于本地群组列表进行精确匹配
   */
  function checkIsGroup(id: string | number): boolean {
    const targetId = String(id)
    return groups.value.some(g => String(g.group_id) === targetId)
  }

  return { friends, groups, notices, members,
    fetchContacts, fetchGroupMembers, addNotice, removeNotice, getFriendName, getGroupName, checkIsGroup }
})
