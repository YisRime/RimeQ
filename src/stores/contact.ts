import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { bot } from '@/api'
import type { FriendInfo, GroupInfo, SystemNotice } from '@/types'

export const useContactStore = defineStore('contact', () => {
  // ============================================================================
  // 持久化状态
  // ============================================================================

  // 好友列表缓存
  const friends = useStorage<FriendInfo[]>('rime-friends', [])
  // 群组列表缓存
  const groups = useStorage<GroupInfo[]>('rime-groups', [])
  // 系统通知
  const notices = useStorage<SystemNotice[]>('rime-notices', [])
  // 上次拉取时间 (用于节流)
  const lastFetchTime = useStorage<number>('rime-contact-fetch-time', 0)

  // ============================================================================
  // 动作
  // ============================================================================

  /**
   * 获取所有好友和群组列表
   */
  async function fetchAll() {
    // 限制刷新频率 (1 分钟内不重复请求)
    if (Date.now() - lastFetchTime.value < 60000 && friends.value.length > 0) return

    try {
      const [fList, gList] = await Promise.all([
        bot.getFriendList(),
        bot.getGroupList()
      ])
      friends.value = fList || []
      groups.value = gList || []
      lastFetchTime.value = Date.now()
    } catch (e) {
      console.error('[Contact] Fetch failed', e)
    }
  }

  /**
   * 添加一条系统通知
   */
  function addNotice(notice: SystemNotice) {
    const exists = notices.value.some(n => n.flag === notice.flag && n.time === notice.time)
    if (!exists) {
      notices.value.unshift(notice)
    }
  }

  /**
   * 移除一条系统通知
   */
  function removeNotice(notice: SystemNotice) {
    const index = notices.value.findIndex(n => n.flag === notice.flag)
    if (index !== -1) {
      notices.value.splice(index, 1)
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  function getGroupName(id: number) {
    const g = groups.value.find(i => i.group_id === id)
    return g?.group_name || `群 ${id}`
  }

  function getFriendName(id: number) {
    const f = friends.value.find(i => i.user_id === id)
    return f?.remark || f?.nickname || `用户 ${id}`
  }

  return {
    friends,
    groups,
    notices,
    fetchAll,
    addNotice,
    removeNotice,
    getGroupName,
    getFriendName
  }
})
