import { defineStore } from 'pinia'
import { ref } from 'vue'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import type { IMessage } from '@/types'
import { parseMsgList } from '@/utils/handler'

// 定义 Dexie 数据库实例
class RimeQDB extends Dexie {
  public messages!: Table<IMessage, number>

  constructor() {
    super('RimeQDB')
    // 定义数据库架构
    // sessionId: 索引会话
    // [sessionId+time]: 复合索引，用于按时间倒序获取会话历史
    this.version(1).stores({
      messages: 'message_id, sessionId, [sessionId+time]'
    })
  }
}

// 初始化数据库
const db = new RimeQDB()

// Pinia Message Store
export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()

  // 状态 State
  const activeChatId = ref<string>('')
  const messages = ref<IMessage[]>([])
  const isLoading = ref(false)
  const isFinished = ref(false)
  const isMultiSelect = ref(false)
  const selectedIds = ref<number[]>([])

  // 操作 Actions

  // 打开并加载指定会话的消息
  async function openSession(id: string) {
    if (activeChatId.value === id) return

    activeChatId.value = id
    messages.value = []
    isLoading.value = true
    isFinished.value = false
    isMultiSelect.value = false
    selectedIds.value = []

    sessionStore.clearUnread(id)

    try {
      // 从数据库加载最新的 50 条消息
      const history = await db.messages
        .where({ sessionId: id })
        .reverse()
        .limit(50)
        .toArray()
      messages.value = history.reverse()

      // 如果本地消息过少，尝试从云端拉取
      if (messages.value.length < 5) {
        await fetchCloudHistory(id)
      }
    } catch (e) {
      console.error('[MsgStore] 从数据库加载消息失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // 从云端拉取更早的历史消息
  async function fetchCloudHistory(id: string) {
    if (isLoading.value || isFinished.value) return

    isLoading.value = true
    try {
      const earliestMsg = messages.value.find(m => m.message_id > 0)
      const seq = earliestMsg?.real_id || earliestMsg?.message_id
      const session = sessionStore.getSession(id)
      const isGroup = session?.type === 'group' || id.length > 5

      const res = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      if (!res.messages || res.messages.length === 0) {
        isFinished.value = true
      } else {
        const newMsgs = res.messages.map((m: any) => ({
          ...m,
          sessionId: id,
          message_type: isGroup ? 'group' : 'private',
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message
        })) as IMessage[]

        // 批量存入数据库
        await db.messages.bulkPut(newMsgs)

        // 如果当前仍在该会话，更新内存中的列表
        if (activeChatId.value === id) {
          messages.value = [...newMsgs, ...messages.value]
        }
      }
    } catch (e) {
      console.error('[MsgStore] 拉取历史消息失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // 新增消息至数据库和内存
  async function _addMessage(id: string, msg: IMessage) {
    await db.messages.put({ ...msg, sessionId: id })
    if (activeChatId.value === id) {
      // 避免重复添加
      if (!messages.value.some(m => m.message_id === msg.message_id)) {
        messages.value.push(msg)
      }
    }
  }

  // 标记消息为已撤回
  async function _markMessageAsRecalled(msgId: number) {
    // 更新内存状态
    const msg = messages.value.find(m => m.message_id === msgId)
    if (msg) {
      msg.recalled = true
    }
    // 更新数据库状态
    await db.messages.update(msgId, { recalled: true })

    // 如果未启用防撤回，则从视图中移除
    if (!settingStore.config.enableAntiRecall) {
      if (msg) {
        const idx = messages.value.indexOf(msg)
        if (idx > -1) messages.value.splice(idx, 1)
      }
    }
  }

  // 设置多选模式
  function setMultiSelect(enable: boolean) {
    isMultiSelect.value = enable
    if (!enable) selectedIds.value = []
  }

  // 切换单条消息的选中状态
  function toggleSelection(msgId: number) {
    const index = selectedIds.value.indexOf(msgId)
    if (index > -1) selectedIds.value.splice(index, 1)
    else selectedIds.value.push(msgId)
  }

  // 仅选中单条消息
  function selectSingle(msgId: number) {
    selectedIds.value = [msgId]
  }

  // 清空整个消息数据库
  async function clearDatabase() {
    await db.delete()
    await db.open()
  }

  return { activeChatId, messages, isLoading, isFinished, isMultiSelect, selectedIds,
    openSession, fetchCloudHistory, _addMessage, _markMessageAsRecalled, setMultiSelect, toggleSelection, selectSingle, clearDatabase
  }
})
