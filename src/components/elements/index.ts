import { defineAsyncComponent, type Component } from 'vue'

export const elementMap: Record<string, Component> = {
  text: defineAsyncComponent(() => import('./TextElement.vue')),
  at: defineAsyncComponent(() => import('./AtElement.vue')),
  face: defineAsyncComponent(() => import('./FaceElement.vue')),
  image: defineAsyncComponent(() => import('./ImageElement.vue')),
  mface: defineAsyncComponent(() => import('./ImageElement.vue')), // 复用 ImageElement
  file: defineAsyncComponent(() => import('./FileElement.vue')),
  video: defineAsyncComponent(() => import('./VideoElement.vue')),
  record: defineAsyncComponent(() => import('./RecordElement.vue')),
  markdown: defineAsyncComponent(() => import('./MarkdownElement.vue')),
  card: defineAsyncComponent(() => import('./CardElement.vue')), // 对应 json/xml
  json: defineAsyncComponent(() => import('./CardElement.vue')),
  xml: defineAsyncComponent(() => import('./CardElement.vue')),
  forward: defineAsyncComponent(() => import('./ForwardElement.vue')),

  // 默认回退
  unknown: defineAsyncComponent(() => import('./UnknownElement.vue'))
}

// 辅助类型检查
export function getElementComponent(type: string): Component {
  return elementMap[type] || elementMap.unknown
}
