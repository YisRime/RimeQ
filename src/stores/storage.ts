import { database } from './database'
import type { Message, Segment } from '@/types'

/** 媒体段字段 */
interface MediaFields {
  file?: string
  thumb?: string
}

/** base64 转 Blob */
function toBlob(mime: string, data: string): Blob {
  return new Blob([Uint8Array.from(atob(data.replace(/\s/g, '')), c => c.charCodeAt(0))], { type: mime })
}

/**
 * 解析内联媒体字段
 * @param value - 字段值
 * @param mime - 缺省 MIME
 * @param bare - 字段值是否为裸 base64
 * @returns 媒体 Blob
 */
function parseInline(value: string | undefined, mime: string, bare = false): Blob | null {
  if (!value || value.startsWith('http') || value.startsWith('media://')) return null
  if (bare) return toBlob(mime, value)
  if (value.startsWith('base64://')) return toBlob(mime, value.slice(9))
  const m = value.match(/^data:([^;,]+);base64,([\s\S]*)$/)
  return m?.[1] !== undefined && m[2] !== undefined ? toBlob(m[1], m[2]) : null
}

/**
 * 解析媒体内容标识
 * @param file - 段内 file 字段
 * @returns 可用于缓存键的标识
 */
function mediaIdOf(file?: string): string | null {
  if (!file || file.startsWith('http') || file.startsWith('data:')) return null
  if (file.startsWith('base64://') || file.startsWith('media://')) return null
  return file.replace(/\.[^./]+$/, '').replace(/[^0-9a-zA-Z_-]/g, '') || null
}

/** 写入 Cache Storage */
async function storeMedia(id: string, blob: Blob): Promise<void> {
  const cache = await caches.open('rimeq-media')
  const req = new Request(`${import.meta.env.BASE_URL}media/` + id)
  if (await cache.match(req)) return
  await cache.put(req, new Response(blob, {
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-stored-at': String(Date.now())
    }
  }))
}

/**
 * 解析媒体地址
 * @description media:// 转为同源路径
 */
export function resolveMediaUrl(src: string): string {
  return src.startsWith('media://') ? `${import.meta.env.BASE_URL}media/` + src.slice('media://'.length) : src
}

/**
 * 编码整条消息的内嵌媒体
 * @description 将 base64 / data URL 媒体转存为缓存条目
 * @param msg - 原始消息对象
 * @returns 编码后的消息
 */
export async function encodeMessageMedia<T extends Message>(msg: T): Promise<T> {
  const segments = msg.message
  if (!Array.isArray(segments) || segments.length === 0) return msg
  let changed = false

  const store = async (data: MediaFields, field: 'file' | 'thumb', id: string, mime: string, bare = false): Promise<boolean> => {
    const blob = parseInline(data[field], mime, bare)
    if (!blob) return false
    await storeMedia(id, blob)
    data[field] = 'media://' + id
    return true
  }

  const message = await Promise.all(segments.map(async (seg, i) => {
    if (seg.type !== 'image' && seg.type !== 'video') return seg
    const data = { ...seg.data } as MediaFields
    const base = `m_${msg.message_id}_${i}`
    const [file, thumb] = await Promise.all([
      store(data, 'file', mediaIdOf(data.file) ?? `${base}_f`, seg.type === 'video' ? 'video/mp4' : 'image/png'),
      store(data, 'thumb', `${base}_t`, 'image/jpeg', true)
    ])
    if (!file && !thumb) return seg
    changed = true
    return { ...seg, data } as Segment
  }))

  return changed ? ({ ...msg, message } as T) : msg
}

/**
 * 清理未被消息引用的媒体
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
        if (typeof value === 'string' && value.startsWith('media://')) referenced.add(value.slice('media://'.length))
      }
    }
  })

  const cache = await caches.open('rimeq-media')
  const now = Date.now()
  let count = 0
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname
    if (!path.startsWith(`${import.meta.env.BASE_URL}media/`)) continue
    const id = decodeURIComponent(path.slice(`${import.meta.env.BASE_URL}media/`.length))
    if (referenced.has(id)) continue
    const storedAt = Number((await cache.match(req))?.headers.get('x-stored-at') ?? 0)
    if (now - storedAt <= minAgeMs) continue
    if (await cache.delete(req)) count++
  }
  return count
}
