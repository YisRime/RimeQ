import { ref, watch, type Ref } from 'vue'
import Dexie, { type Table } from 'dexie'
import type { Message, Segment, GroupMemberInfo, GroupMsgEmojiLikeNotice } from '@/types'

/**
 * 本地数据库消息接口
 * @description 扩展消息信息
 */
export interface DBMessage extends Message {
  /** 会话唯一标识 */
  session_id: string
  /** 会话排序序号 */
  session_index: number
  /** 是否被撤回 */
  recalled?: boolean
  /** 是否为精华 */
  essence?: boolean
  /** 表情回应列表 */
  reactions?: GroupMsgEmojiLikeNotice['likes']
}

/**
 * 本地数据库群成员接口
 * @description 扩展群成员信息
 */
export interface DBMember extends GroupMemberInfo {
  /** 群号 */
  group_id: number
}

/**
 * 本地数据库媒体接口
 * @description 消息内嵌的 base64 媒体以 Blob 形式存储
 */
export interface DBMedia {
  /** 媒体 ID */
  id: string
  /** 媒体二进制数据 */
  blob: Blob
  /** 写入时间戳 */
  ts: number
}

/**
 * 本地数据库键值接口
 * @description 用于持久化配置、列表等轻量数据
 */
export interface KVRecord {
  /** 键 */
  key: string
  /** 值 */
  value: unknown
}

/**
 * 消息持久化数据库
 * @description 以 IndexedDB 为唯一数据源
 */
export class Database extends Dexie {
  public messages!: Table<DBMessage, number>
  public members!: Table<DBMember, [number, number]>
  public media!: Table<DBMedia, string>
  public kv!: Table<KVRecord, string>

  constructor() {
    super('rimeq-databases')
    this.version(1).stores({
      messages: 'message_id, [session_id+session_index]',
      members: '[group_id+user_id], group_id',
      media: 'id',
      kv: 'key'
    })
  }
}

export const database = new Database()

// 本地媒体引用前缀 media://<id>
const MEDIA_SCHEME = 'media://'

/**
 * base64 转 Blob
 * @param mime - MIME 类型
 * @param data - base64 数据
 */
function base64ToBlob(mime: string, data: string): Blob {
  const binary = atob(data.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * 编码整条消息的内嵌媒体
 * @param msg - 原始消息对象
 * @returns 编码后的消息与待落库媒体
 */
export function encodeMessageMedia<T extends Message>(msg: T): { message: T; media: DBMedia[] } {
  const segments = msg.message
  if (!Array.isArray(segments) || segments.length === 0) return { message: msg, media: [] }
  const media: DBMedia[] = []
  const ts = Date.now()
  let changed = false

  /**
   * 转存字段内嵌媒体
   * @param data - 消息段数据
   * @param field - 目标字段
   * @param id - 媒体 ID
   * @param fallbackMime - 缺省 MIME 类型
   * @param bare - 字段值是否为裸 base64
   * @returns 是否发生转换
   */
  const embed = (data: { file?: string; thumb?: string }, field: 'file' | 'thumb', id: string, fallbackMime: string, bare = false): boolean => {
    const value = data[field]
    if (!value || value.startsWith('http') || value.startsWith(MEDIA_SCHEME)) return false
    let mime = fallbackMime
    let raw = value
    if (!bare) {
      if (value.startsWith('base64://')) {
        raw = value.slice(9)
      } else {
        const m = value.match(/^data:([^;,]+);base64,([\s\S]*)$/)
        if (!m || !m[1] || m[2] === undefined) return false
        mime = m[1]
        raw = m[2]
      }
    }
    try {
      media.push({ id, blob: base64ToBlob(mime, raw), ts })
      data[field] = `${MEDIA_SCHEME}${id}`
      return true
    } catch {
      return false
    }
  }

  const message = segments.map((seg, i) => {
    if (seg.type !== 'image' && seg.type !== 'video') return seg
    const data = { ...seg.data } as { file?: string; thumb?: string }
    const key = `m_${msg.message_id}_${i}_`
    const encoded = embed(data, 'file', `${key}f`, seg.type === 'video' ? 'video/mp4' : 'image/png')
    const cover = embed(data, 'thumb', `${key}t`, 'image/jpeg', true)
    if (!encoded && !cover) return seg
    changed = true
    return { ...seg, data } as Segment
  })

  return { message: changed ? ({ ...msg, message } as T) : msg, media }
}

/**
 * 解析本地媒体引用
 * @param src - 原始地址
 * @returns 可用的 Blob URL
 */
export async function resolveMediaUrl(src: string): Promise<string> {
  if (!src.startsWith(MEDIA_SCHEME)) return src
  const rec = await database.media.get(src.slice(MEDIA_SCHEME.length))
  return rec?.blob ? URL.createObjectURL(rec.blob) : ''
}

/**
 * 清理未引用的本地媒体
 * @param minAgeMs - 最小保留时长
 * @returns 清理数量
 */
export async function purgeOrphanMedia(minAgeMs = 300000): Promise<number> {
  const referenced = new Set<string>()
  await database.messages.each((m) => {
    for (const seg of m.message ?? []) {
      const data = seg.data as Record<string, unknown> | undefined
      for (const field of ['file', 'thumb']) {
        const value = data?.[field]
        if (typeof value === 'string' && value.startsWith(MEDIA_SCHEME)) referenced.add(value.slice(MEDIA_SCHEME.length))
      }
    }
  })
  const now = Date.now()
  const orphans: string[] = []
  await database.media.each((r) => {
    if (!referenced.has(r.id) && now - r.ts > minAgeMs) orphans.push(r.id)
  })
  if (orphans.length) await database.media.bulkDelete(orphans)
  return orphans.length
}

// 键值内存缓存
const kvCache = new Map<string, unknown>()

/**
 * 预载键值表到内存
 */
export async function initKv(): Promise<void> {
  try {
    for (const row of await database.kv.toArray()) kvCache.set(row.key, row.value)
  } catch { /* 回退 */ }
}

/**
 * 基于 IndexedDB 的持久化 ref
 * @param key - 存储键
 * @param initial - 初始值
 * @returns 与 IndexedDB 同步的响应式引用
 */
export function useIdbStorage<T>(key: string, initial: T): Ref<T> {
  const state = ref(kvCache.get(key) ?? initial) as Ref<T>
  let timer: number | undefined

  watch(state, (val) => {
    let data: unknown
    try {
      data = JSON.parse(JSON.stringify(val))
    } catch { /* 忽略 */ return }
    kvCache.set(key, data)
    clearTimeout(timer)
    timer = window.setTimeout(() => {
      database.kv.put({ key, value: data }).catch(() => {})
    }, 300)
  }, { deep: true })

  return state
}
