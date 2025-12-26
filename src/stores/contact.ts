import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bot } from '@/api'
import type { FriendInfo, GroupInfo, SystemNotice } from '@/types'

export const useContactStore = defineStore('contact', () => {
  // === State ===
  const friends = ref<FriendInfo[]>([])
  const groups = ref<GroupInfo[]>([])
  const notices = ref<SystemNotice[]>([])

  // 简单的缓存控制
  const lastFetchTime = ref(0)

  // === Actions ===

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
    // 简单的去重逻辑：防止同一请求被重复添加
    // 依据 flag 和 time 判断
    const exists = notices.value.some(n => n.flag === notice.flag && n.time === notice.time)
    if (!exists) {
      notices.value.unshift(notice)
    }
  }

  /**
   * 移除一条系统通知 (通常在处理完后调用)
   */
  function removeNotice(notice: SystemNotice) {
    const index = notices.value.findIndex(n => n.flag === notice.flag)
    if (index !== -1) {
      notices.value.splice(index, 1)
    }
  }

  // === Getters / Helpers ===

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
}, {
  // 持久化配置
  persist: {
    // 明确指定持久化 notices，好友列表也可以选择持久化
    paths: ['notices', 'friends', 'groups'],
    storage: localStorage
  } as any
})
