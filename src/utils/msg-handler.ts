import { useChatStore } from '../stores/chat'
import { useContactStore } from '../stores/contact'
import { useAuthStore } from '../stores/auth'
import type { Message } from '../types'
import { MsgType } from '../types'
import { parseMsgList, determineMsgType } from './msg-parser'

interface OneBotPayload {
    post_type?: string
    meta_event_type?: string
    sub_type?: string
    message_type?: string
    notice_type?: string
    request_type?: string
    [key: string]: unknown
}

export function dispatchMessage(payload: OneBotPayload) {
    if (payload.post_type === 'meta_event') {
        if (payload.meta_event_type === 'lifecycle' && payload.sub_type === 'connect') {
            console.log('[MsgHandler] OneBot connected')
            useContactStore().init()
        }
        return
    }

    const postType = payload.post_type
    if (postType === 'message') {
        handleMessage(payload as MessagePayload)
    } else if (postType === 'notice') {
        handleNotice(payload as NoticePayload)
    } else if (postType === 'request') {
        handleRequest(payload as RequestPayload)
    }
}

interface MessagePayload extends OneBotPayload {
    message_type: string
    group_id?: number
    user_id: number
    message_id: number
    message_seq?: number
    time: number
    message: { type: string; data: Record<string, unknown> }[]
    sender: {
        user_id: number
        nickname?: string
        card?: string
        role?: 'owner' | 'admin' | 'member'
    }
}

function handleMessage(payload: MessagePayload) {
    const chatStore = useChatStore()
    const contactStore = useContactStore()
    const authStore = useAuthStore()

    const isGroup = payload.message_type === 'group'
    const peerId = isGroup ? String(payload.group_id) : String(payload.user_id)
    const isMe = payload.user_id === authStore.loginInfo?.userId

    const content = parseMsgList(payload.message)
    const type = determineMsgType(content)  // 传递已解析的内容，避免双重遍历

    const msgObj: Message = {
        id: String(payload.message_id),
        seq: payload.message_seq || 0,
        time: payload.time * 1000,
        type: type,
        sender: {
            userId: payload.user_id,
            nickname: payload.sender?.nickname || payload.sender?.card || 'Unknown',
            card: payload.sender?.card,
            role: payload.sender?.role,
            avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${payload.user_id}`
        },
        content: content,
        raw_content: payload.message,
        isMe: isMe,
        isSending: false
    }

    chatStore.addMessage(peerId, msgObj)

    let preview = ''
    if (type === MsgType.Image) preview = '[图片]'
    else if (type === MsgType.File) preview = '[文件]'
    else if (type === MsgType.Record) preview = '[语音]'
    else if (type === MsgType.Video) preview = '[视频]'
    else preview = content.text || '[消息]'

    if (isGroup && !isMe) {
        preview = `${msgObj.sender.nickname}: ${preview}`
    }

    contactStore.update(peerId, {
        type: isGroup ? 'group' : 'user',
        name: isGroup ? `群 ${peerId}` : msgObj.sender.nickname,
        msg: preview,
        time: msgObj.time,
        increaseUnread: !isMe
    })
}

interface NoticePayload extends OneBotPayload {
    notice_type: string
    group_id?: number
    user_id?: number
    message_id?: number
    operator_id?: number
    duration?: number
    file?: unknown
    sender_id?: number
    target_id?: number
}

function handleNotice(payload: NoticePayload) {
    const chatStore = useChatStore()

    if (payload.notice_type === 'group_recall' || payload.notice_type === 'friend_recall') {
        const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
        chatStore.deleteMessage(peerId, String(payload.message_id))
        return
    }

    if (payload.notice_type === 'notify' && payload.sub_type === 'poke') {
        const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
        chatStore.handlePokeNotice({
            peerId,
            senderId: payload.sender_id as number,
            targetId: payload.target_id as number
        })
        return
    }

    if (payload.notice_type === 'group_ban') {
        const groupId = String(payload.group_id)
        const isBan = payload.sub_type === 'ban'
        const duration = payload.duration || 0
        const targetId = payload.user_id as number

        chatStore.handleGroupBan({
            groupId,
            userId: targetId,
            operatorId: payload.operator_id || 0,
            duration,
            isBan
        })
        return
    }

    if (payload.notice_type === 'group_increase') {
        const groupId = String(payload.group_id)
        const userId = payload.user_id as number
        chatStore.handleGroupIncrease({ groupId, userId })
        return
    }

    if (payload.notice_type === 'group_decrease') {
        const groupId = String(payload.group_id)
        const userId = payload.user_id as number
        chatStore.handleGroupDecrease({ groupId, userId })
        return
    }

    if (payload.notice_type === 'group_upload') {
        const groupId = String(payload.group_id)
        const file = payload.file as { name: string; size: number; url?: string; busid?: number }
        chatStore.handleGroupUpload({
            groupId,
            userId: payload.user_id as number,
            file: { name: file.name, size: file.size, url: file.url, busid: file.busid }
        })
    }
}

interface RequestPayload extends OneBotPayload {
    request_type: string
    user_id: number
    group_id?: number
    comment?: string
    flag: string
}

function handleRequest(payload: RequestPayload) {
    const contactStore = useContactStore()
    contactStore.addNotice({
        time: Date.now(),
        request_type: payload.request_type as 'friend' | 'group',
        sub_type: payload.sub_type as 'add' | 'invite',
        user_id: payload.user_id,
        group_id: payload.group_id,
        comment: payload.comment,
        flag: payload.flag
    })

    if (window.Notification && Notification.permission === 'granted') {
        new Notification('新系统通知', { body: '您收到一个新的好友或群组请求' })
    }
}

