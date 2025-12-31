import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { useStorage } from '@vueuse/core'
import { bot } from '@/api'
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
  /** 用户和群组名称的内存缓存 */
  const nameCache = reactive({ user: {} as Record<string, string>, group: {} as Record<string, string> })
  /** 群成员列表的内存缓存 */
  const memberCache = reactive(new Map<number, GroupMemberInfo[]>())

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
   * @returns 群成员信息数组的 Promise
   */
  async function fetchGroupMembers(groupId: number, force = false): Promise<GroupMemberInfo[]> {
    if (!force && memberCache.has(groupId)) return memberCache.get(groupId)!
    try {
      const list = await bot.getGroupMemberList(groupId)
      memberCache.set(groupId, list)
      return list
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
    const id = String(userId)
    for (const category of friends.value) {
      const friend = category.buddyList.find(f => String(f.user_id) === id)
      if (friend) return friend.remark || friend.nickname
    }
    if (nameCache.user[id]) return nameCache.user[id]
    if (fallbackNick) {
      nameCache.user[id] = fallbackNick
      return fallbackNick
    }
    bot.getStrangerInfo(Number(id))
      .then(res => { nameCache.user[id] = res.nickname })
      .catch(() => { nameCache.user[id] = `用户 ${id}` })
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
    if (nameCache.group[id]) return nameCache.group[id]
    if (fallbackName) {
      nameCache.group[id] = fallbackName
      return fallbackName
    }
    bot.getGroupInfo(Number(id))
      .then(res => { nameCache.group[id] = res.group_name })
      .catch(() => { nameCache.group[id] = `群 ${id}` })
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

  return { friends, groups, notices, fetchContacts, fetchGroupMembers, addNotice, removeNotice, getFriendName, getGroupName, checkIsGroup }
})
