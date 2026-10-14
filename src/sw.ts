/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

// TS 类型声明
declare let self: ServiceWorkerGlobalScope

/** 缓存句柄 */
let mediaCache: Promise<Cache> | null = null

// 允许消息激活
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// 媒体路由
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || !url.pathname.startsWith(`${import.meta.env.BASE_URL}media/`)) return
  event.respondWith((async () => {
    const cache = await (mediaCache ??= caches.open('rimeq-media'))
    return (await cache.match(event.request)) ?? new Response('Not Found', { status: 404 })
  })())
})

// 控制页面
clientsClaim()
// 清理缓存
cleanupOutdatedCaches()
// 缓存代码
precacheAndRoute(self.__WB_MANIFEST || [])
