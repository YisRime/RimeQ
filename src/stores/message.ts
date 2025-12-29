import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import { useContactStore } from './contact'
import type { IMessage, Message } from '@/types'

/** 数据库定义 */
class Database extends Dexie {
  public messages!: Table<IMessage, number>
  constructor() {
    super('rimeq-message')
    this.version(1).stores({ messages: 'message_id, sessionId, [sessionId+time]' })
  }
}
const db = new Database()

export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()
  const contactStore = useContactStore()

  // 当前会话 ID
  const activeId = ref('')
  // 消息列表
  const messages = shallowRef<IMessage[]>([])
  // 加载状态
  const isLoading = ref(false)
  // 是否加载完成
  const isFinished = ref(false)
  // 多选模式状态
  const isMultiSelect = ref(false)
  // 选中的消息 ID 列表
  const selectedIds = ref<number[]>([])

  // 获取选中消息列表
  const selectedMessages = computed(() => {
    if (!selectedIds.value.length) return []
    const set = new Set(selectedIds.value)
    return messages.value.filter(m => set.has(m.message_id))
  })

  // 消息标准化映射
  const normalize = (raw: any, sessionId: string): IMessage => ({ ...raw, sessionId })

  /** 切换会话 */
  async function openSession(id: string) {
    if (activeId.value === id) return

    activeId.value = id
    isLoading.value = true
    isFinished.value = false
    setMultiSelect(false)
    sessionStore.clearUnread(id)

    const history = await db.messages.where({ sessionId: id }).reverse().limit(99).toArray()
    messages.value = history.reverse()
    isLoading.value = false

    if (messages.value.length < 10) await fetchHistory(id)
  }

  /** 拉取历史消息 */
  async function fetchHistory(id: string = activeId.value) {
    if (isLoading.value || isFinished.value) return

    isLoading.value = true
    try {
      const startMsg = messages.value[0]
      const seq = startMsg?.real_id || startMsg?.message_id
      const isGroup = sessionStore.getSession(id)?.type === 'group' || contactStore.groups.some(g => String(g.group_id) === id)

      const res = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      if (!res.messages?.length) {
        isFinished.value = true
      } else {
        const newMsgs = res.messages.map(m => normalize(m, id))
        db.messages.bulkPut(newMsgs).catch(() => {})
        if (activeId.value === id) {
          messages.value = [...newMsgs, ...messages.value]
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  /** 接收并处理消息 */
  function pushMessage(rawEvent: Message, sessionId: string): IMessage {
    const msg = normalize(rawEvent, sessionId)
    db.messages.put(msg).catch(() => {})

    if (activeId.value === sessionId) {
      if (!messages.value.some(m => m.message_id === msg.message_id)) {
        messages.value = [...messages.value, msg]
      }
    }
    return msg
  }

  /** 撤回消息 */
  async function recallMessage(msgId: number) {
    await db.messages.update(msgId, { recalled: true })

    const list = messages.value
    const idx = list.findIndex(m => m.message_id === msgId)

    if (idx !== -1) {
      if (settingStore.config.enableAntiRecall) {
        if (list[idx]) {
          list[idx].recalled = true
          messages.value = [...list]
        }
      } else {
        const copy = [...list]
        copy.splice(idx, 1)
        messages.value = copy
      }
    }
  }

  /** 切换消息选中状态 */
  function handleSelection(msgId: number, mode: 'toggle' | 'only') {
    if (mode === 'only') {
      isMultiSelect.value = true
      selectedIds.value = [msgId]
    } else {
      const idx = selectedIds.value.indexOf(msgId)
      if (idx > -1) selectedIds.value.splice(idx, 1)
      else selectedIds.value.push(msgId)
    }
  }

  /** 设置多选模式 */
  function setMultiSelect(enable: boolean) {
    isMultiSelect.value = enable
    if (!enable) selectedIds.value = []
  }

  return { activeId, messages, isLoading, isFinished, isMultiSelect, selectedIds, selectedMessages,
    openSession, fetchHistory, pushMessage, recallMessage, handleSelection, setMultiSelect }
})
