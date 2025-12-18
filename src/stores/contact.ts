import { defineStore } from 'pinia'
import { ref } from 'vue'
import { botApi } from '../api'
import type { Contact, UserInfo, GroupInfo, GroupMember } from '../types'  // Session -> Contact

export interface SystemNotice {
  time: number
  request_type: 'friend' | 'group'
  sub_type?: 'add' | 'invite'
  user_id: number
  group_id?: number
  nickname?: string
  comment?: string
  flag: string
  status?: 'approve' | 'reject' // 本地状态记录
}

export const useContactStore = defineStore('contact', () => {
  const contacts = ref<Contact[]>([])
  const friends = ref<UserInfo[]>([])
  const groups = ref<GroupInfo[]>([])
  const groupMembersMap = ref<Record<number, GroupMember[]>>({})
  const loading = ref(false)
  const notices = ref<SystemNotice[]>([])

  const friendMap = new Map<number, UserInfo>()
  const groupMap = new Map<number, GroupInfo>()

  async function init() {
    if (loading.value) return
    loading.value = true
    try {
      await Promise.all([fetchFriends(), fetchGroups()])
    } finally {
      loading.value = false
    }
  }

  async function fetchFriends() {
    try {
      const list = await botApi.getFriendList()
      friends.value = list.map(f => ({ ...f, py_initial: getFirstLetter(f.remark || f.nickname) }))
      friends.value.sort((a, b) => (a.py_initial || '#').localeCompare(b.py_initial || '#'))
      friendMap.clear()
      friends.value.forEach(f => friendMap.set(f.user_id, f))
    } catch (e) {
      console.error('Fetch friends failed', e)
    }
  }

  async function fetchGroups() {
    try {
      const list = await botApi.getGroupList()
      groups.value = list.map(g => ({ ...g, py_initial: getFirstLetter(g.group_name) }))
      groups.value.sort((a, b) => (a.py_initial || '#').localeCompare(b.py_initial || '#'))
      groupMap.clear()
      groups.value.forEach(g => groupMap.set(g.group_id, g))
    } catch (e) {
      console.error('Fetch groups failed', e)
    }
  }

  /**
   * 获取群成员列表 (带缓存机制) - 对应 OneBot API: get_group_member_list
   * @param groupId 群号
   * @param force 是否强制刷新
   */
  async function getGroupMemberList(groupId: number, force = false): Promise<GroupMember[]> {
    // 如果有缓存且不强制刷新，直接返回
    if (!force && groupMembersMap.value[groupId] && groupMembersMap.value[groupId].length > 0) {
      return groupMembersMap.value[groupId]
    }

    try {
      const members = await botApi.getGroupMemberList(groupId)

      // 排序规则：群主 > 管理员 > 普通成员
      const roleOrder = { owner: 0, admin: 1, member: 2 }
      members.sort((a, b) => {
        const orderA = roleOrder[a.role as keyof typeof roleOrder] || 2
        const orderB = roleOrder[b.role as keyof typeof roleOrder] || 2
        return orderA - orderB
      })

      groupMembersMap.value[groupId] = members
      return members
    } catch (e) {
      console.error(`Fetch members for ${groupId} failed`, e)
      return []
    }
  }

  /**
   * 同步获取群成员 (用于 Computed 属性)
   * 如果缓存不存在，会触发异步加载，但在数据回来前返回空数组
   */
  function getGroupMembers(groupId: number): GroupMember[] {
    if (!groupMembersMap.value[groupId]) {
      getGroupMemberList(groupId)
      return []
    }
    return groupMembersMap.value[groupId]
  }

  /**
   * 更新或创建联系人项 (核心逻辑) - 对应会话列表的动态维护
   * 当收到新消息时调用此方法
   * @param peerId 会话标识 (可能是 user_id 或 group_id)
   */
  function update(peerId: string, info: {
    type?: 'user' | 'group',
    name?: string,
    msg?: string,
    time?: number,
    increaseUnread?: boolean
  }) {
    const idx = contacts.value.findIndex(c => c.peerId === peerId)
    let contact: Contact  // session -> contact, Session -> Contact

    if (idx !== -1) {
      // 会话已存在，取出并准备移动到顶部
      contact = contacts.value[idx]!  // session -> contact, sessions -> contacts
      contacts.value.splice(idx, 1)  // sessions -> contacts
    } else {
      // 会话不存在，创建新会话
      const type = info.type || 'user'
      let name = info.name || peerId
      let avatar = ''

      // 尝试从本地缓存补充信息
      if (type === 'group') {
        const g = groupMap.get(Number(peerId))
        if (g) { name = g.group_name; avatar = g.avatar || '' } else { avatar = `https://p.qlogo.cn/gh/${peerId}/${peerId}/0` }
      } else {
        const f = friendMap.get(Number(peerId))
        if (f) { name = f.remark || f.nickname; avatar = f.avatar || '' } else { avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${peerId}` }
      }

      contact = {  // session -> contact
        peerId,  // id -> peerId
        type,
        name,
        avatar,
        unread: 0,
        lastMsg: '',
        time: Date.now()
      }
    }

    // 更新动态字段
    if (info.msg) contact.lastMsg = info.msg
    if (info.time) contact.time = info.time
    if (info.increaseUnread) contact.unread++

    // 插入到列表顶部
    contacts.value.unshift(contact)
  }

  /**
   * 清除指定会话的未读数
   * @param peerId 会话标识
   */
  function clearUnread(peerId: string) {
    const contact = contacts.value.find(c => c.peerId === peerId)
    if (contact) contact.unread = 0
  }

  /**
   * 获取单个会话信息
   * @param peerId 会话标识
   */
  function getContact(peerId: string) {
    return contacts.value.find(c => c.peerId === peerId)
  }

  /**
   * 移除指定会话
   * @param peerId 会话标识
   */
  function removeContact(peerId: string) {
    const idx = contacts.value.findIndex(c => c.peerId === peerId)
    if (idx !== -1) {
      contacts.value.splice(idx, 1)
    }

    // 同时从映射中移除（如果需要）
    const numericId = Number(peerId)
    if (!isNaN(numericId)) {
      friendMap.delete(numericId)
      groupMap.delete(numericId)
    }
  }

  // --- System Notices ---

  /**
   * 初始化加载通知 (从 localStorage)
   */
  function loadNoticesFromStorage() {
    const saved = localStorage.getItem('webqq_system_notices')
    if (saved) { try { notices.value = JSON.parse(saved) } catch { notices.value = [] } }
  }

  /**
   * 保存通知到 localStorage
   */
  function saveNoticesToStorage() { localStorage.setItem('webqq_system_notices', JSON.stringify(notices.value)) }

  /**
   * 添加通知 (来自 WebSocket handler)
   */
  function addNotice(notice: SystemNotice) {
    if (notices.value.some(n => n.flag === notice.flag)) return
    notices.value.unshift(notice)
    saveNoticesToStorage()
  }

  /**
   * 更新处理状态
   */
  function updateNoticeStatus(flag: string, status: 'approve' | 'reject') {
    const target = notices.value.find(n => n.flag === flag)
    if (target) { target.status = status; saveNoticesToStorage() }
  }

  /**
   * 获取未读通知数 (假设没有 status 的就是未读)
   */
  function unreadNoticeCount() { return notices.value.filter(n => !n.status).length }

  // 初始化加载通知
  loadNoticesFromStorage()

  return {
    contacts,
    friends,
    groups,
    groupMembersMap,
    loading,
    notices,
    init,
    fetchFriends,
    fetchGroups,
    getGroupMemberList,
    getGroupMembers,
    update,
    clearUnread,
    getContact,
    removeContact,
    removeSession: removeContact,
    addNotice,
    updateNoticeStatus,
    unreadNoticeCount
  }
})

// 辅助工具：获取首字母
function getFirstLetter(str: string): string {
  if (!str || str.length === 0) return '#'
  const first = str[0]!.toUpperCase()
  if (/[A-Z]/.test(first)) return first
  return '#'
}

