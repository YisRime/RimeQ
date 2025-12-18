import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bot } from '../api'
import type { GroupInfo, GroupMemberInfo, SystemNotice, FriendInfo } from '../types'

// 前端使用的统一会话类型
export interface Contact {
  peerId: string
  type: 'user' | 'group'
  name: string
  avatar: string
  lastMsg?: string
  time?: number
  unread: number
  draft?: string
}

interface ExtendedFriendInfo extends FriendInfo {
  avatar?: string
  py_initial?: string
}

interface ExtendedGroupInfo extends GroupInfo {
  avatar?: string
  py_initial?: string
}

export const useContactStore = defineStore('contact', () => {
  const contacts = ref<Contact[]>([])
  const friends = ref<ExtendedFriendInfo[]>([])
  const groups = ref<ExtendedGroupInfo[]>([])
  const groupMembersMap = ref<Record<number, GroupMemberInfo[]>>({})
  const loading = ref(false)
  const notices = ref<SystemNotice[]>([])

  const friendMap = new Map<number, ExtendedFriendInfo>()
  const groupMap = new Map<number, ExtendedGroupInfo>()

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
      const list = await bot.getFriendList()
      friends.value = list.map(f => ({
        ...f,
        avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${f.user_id}`,
        py_initial: getFirstLetter(f.remark || f.nickname)
      }))
      friends.value.sort((a, b) => (a.py_initial || '#').localeCompare(b.py_initial || '#'))
      friendMap.clear()
      friends.value.forEach(f => friendMap.set(f.user_id, f))
    } catch (e) {
      console.error('Fetch friends failed', e)
    }
  }

  async function fetchGroups() {
    try {
      const list = await bot.getGroupList()
      groups.value = list.map(g => ({
        ...g,
        avatar: `https://p.qlogo.cn/gh/${g.group_id}/${g.group_id}/0`,
        py_initial: getFirstLetter(g.group_name)
      }))
      groups.value.sort((a, b) => (a.py_initial || '#').localeCompare(b.py_initial || '#'))
      groupMap.clear()
      groups.value.forEach(g => groupMap.set(g.group_id, g))
    } catch (e) {
      console.error('Fetch groups failed', e)
    }
  }

  async function getGroupMemberList(groupId: number, force = false): Promise<GroupMemberInfo[]> {
    if (!force && groupMembersMap.value[groupId] && groupMembersMap.value[groupId].length > 0) {
      return groupMembersMap.value[groupId]
    }

    try {
      const members = await bot.getGroupMemberList(groupId)
      const roleOrder = { owner: 0, admin: 1, member: 2 }
      members.sort((a, b) => {
        const orderA = roleOrder[a.role || 'member']
        const orderB = roleOrder[b.role || 'member']
        return orderA - orderB
      })

      groupMembersMap.value[groupId] = members
      return members
    } catch (e) {
      console.error(`Fetch members for ${groupId} failed`, e)
      return []
    }
  }

  function getGroupMembers(groupId: number): GroupMemberInfo[] {
    if (!groupMembersMap.value[groupId]) {
      getGroupMemberList(groupId)
      return []
    }
    return groupMembersMap.value[groupId]
  }

  function update(peerId: string, info: {
    type?: 'user' | 'group',
    name?: string,
    msg?: string,
    time?: number,
    increaseUnread?: boolean
  }) {
    const idx = contacts.value.findIndex(c => c.peerId === peerId)
    let contact: Contact

    if (idx !== -1) {
      contact = contacts.value[idx]!
      contacts.value.splice(idx, 1)
    } else {
      const type = info.type || 'user'
      let name = info.name || peerId
      let avatar = ''

      if (type === 'group') {
        const g = groupMap.get(Number(peerId))
        if (g) { name = g.group_name; avatar = g.avatar || '' }
        else { avatar = `https://p.qlogo.cn/gh/${peerId}/${peerId}/0` }
      } else {
        const f = friendMap.get(Number(peerId))
        if (f) { name = f.remark || f.nickname; avatar = f.avatar || '' }
        else { avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${peerId}` }
      }

      contact = {
        peerId,
        type,
        name,
        avatar,
        unread: 0,
        lastMsg: '',
        time: Date.now()
      }
    }

    if (info.msg) contact.lastMsg = info.msg
    if (info.time) contact.time = info.time
    if (info.increaseUnread) contact.unread++

    contacts.value.unshift(contact)
  }

  function clearUnread(peerId: string) {
    const contact = contacts.value.find(c => c.peerId === peerId)
    if (contact) contact.unread = 0
  }

  function getContact(peerId: string) {
    return contacts.value.find(c => c.peerId === peerId)
  }

  function removeContact(peerId: string) {
    const idx = contacts.value.findIndex(c => c.peerId === peerId)
    if (idx !== -1) {
      contacts.value.splice(idx, 1)
    }
    const numericId = Number(peerId)
    if (!isNaN(numericId)) {
      friendMap.delete(numericId)
      groupMap.delete(numericId)
    }
  }

  function loadNoticesFromStorage() {
    const saved = localStorage.getItem('webqq_system_notices')
    if (saved) { try { notices.value = JSON.parse(saved) } catch { notices.value = [] } }
  }

  function saveNoticesToStorage() { localStorage.setItem('webqq_system_notices', JSON.stringify(notices.value)) }

  function addNotice(notice: SystemNotice) {
    if (notices.value.some(n => n.flag === notice.flag)) return
    notices.value.unshift(notice)
    saveNoticesToStorage()
  }

  function updateNoticeStatus(flag: string, status: 'approve' | 'reject') {
    // 这里 SystemNotice 定义中没有 status 字段，但在本地存储时添加了
    // 使用 any 绕过类型检查，或者在 types 中扩展 SystemNotice
    const target = notices.value.find(n => n.flag === flag) as any
    if (target) { target.status = status; saveNoticesToStorage() }
  }

  function unreadNoticeCount() { return notices.value.filter(n => !(n as any).status).length }

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
    addNotice,
    updateNoticeStatus,
    unreadNoticeCount
  }
})

function getFirstLetter(str: string): string {
  if (!str || str.length === 0) return '#'
  const first = str[0]!.toUpperCase()
  if (/[A-Z]/.test(first)) return first
  return '#'
}
