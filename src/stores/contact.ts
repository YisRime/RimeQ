import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { useStorage } from '@vueuse/core'
import { bot } from '@/api'
import type { GroupInfo, SystemNotice, FriendCategory } from '@/types'

export const useContactStore = defineStore('contact', () => {

  // 好友列表
  const friends = useStorage<FriendCategory[]>('rime-friends', [])
  // 群组列表
  const groups = useStorage<GroupInfo[]>('rime-groups', [])
  // 系统通知
  const notices = useStorage<SystemNotice[]>('rime-notices', [])
  // 名称缓存
  const nameCache = reactive({ user: {} as Record<string, string>, group: {} as Record<string, string> })

  // 拉取所有信息
  async function fetchContacts() {
    // 获取群组列表
    try {
      groups.value = await bot.getGroupList() || []
    } catch (e) {
      console.error('[Contact] 获取群组列表失败', e)
      groups.value = []
    }
    // 获取好友列表
    try {
      // 获取分组列表
      const cats = await bot.getFriendsWithCategory()
      if (!Array.isArray(cats) || cats.length === 0) {
        throw new Error('Friend Categories is Empty')
      }
      friends.value = cats
    } catch (e) {
      console.warn('[Contact] 获取分组列表失败:', e)
      try {
        // 获取好友列表
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

  // 添加系统通知
  function addNotice(notice: SystemNotice) {
    const exists = notices.value.some(n => n.flag === notice.flag && n.time === notice.time)
    if (!exists) {
      notices.value.unshift(notice)
    }
  }

  // 移除系统通知
  function removeNotice(notice: SystemNotice) {
    const index = notices.value.findIndex(n => n.flag === notice.flag)
    if (index !== -1) {
      notices.value.splice(index, 1)
    }
  }

  // 获取用户名称
  function getFriendName(userId: string | number, fallbackNick?: string): string {
    const id = String(userId)
    // 查找好友列表
    for (const category of friends.value) {
      const friend = category.buddyList.find(f => String(f.user_id) === id)
      if (friend) return friend.remark || friend.nickname
    }
    // 检查缓存
    if (nameCache.user[id]) return nameCache.user[id]
    // 使用回退昵称
    if (fallbackNick) {
      nameCache.user[id] = fallbackNick
      return fallbackNick
    }
    // 从 API 获取并缓存
    bot.getStrangerInfo(Number(id))
      .then(res => { nameCache.user[id] = res.nickname })
      .catch(() => { nameCache.user[id] = `用户 ${id}` })
    return `用户 ${id}`
  }

  // 获取群名称
  function getGroupName(groupId: string | number, fallbackName?: string): string {
    const id = String(groupId)
    // 查找群组列表
    const group = groups.value.find(g => String(g.group_id) === id)
    if (group) return group.group_name
    // 检查缓存
    if (nameCache.group[id]) return nameCache.group[id]
    // 使用回退群名
    if (fallbackName) {
      nameCache.group[id] = fallbackName
      return fallbackName
    }
    // 从 API 获取并缓存
    bot.getGroupInfo(Number(id))
      .then(res => { nameCache.group[id] = res.group_name })
      .catch(() => { nameCache.group[id] = `群 ${id}` })
    return `群 ${id}`
  }

  return { friends, groups, notices, fetchContacts, addNotice, removeNotice, getFriendName, getGroupName }
})
