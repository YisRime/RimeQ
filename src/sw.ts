/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

// TS 类型声明
declare let self: ServiceWorkerGlobalScope

// 强制激活
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
clientsClaim()

// 自动清理
cleanupOutdatedCaches()

// 预缓存应用外壳
precacheAndRoute(self.__WB_MANIFEST || [])

// 缓存 QQ 头像
registerRoute(
  ({ url }) => url.hostname.endsWith('qlogo.cn'),
  new CacheFirst({
    cacheName: 'avatar-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 3 * 24 * 60 * 60,
      }),
    ],
  })
)

// 缓存图片资源
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 1 * 24 * 60 * 60,
      }),
    ],
  })
)
