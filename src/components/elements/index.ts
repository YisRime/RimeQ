import { defineAsyncComponent, type Component } from 'vue'

const map: Record<string, Component> = {
  text: defineAsyncComponent(() => import('./TextElement.vue')),
  at: defineAsyncComponent(() => import('./TextElement.vue')),
  image: defineAsyncComponent(() => import('./ImageElement.vue')),
  face: defineAsyncComponent(() => import('./ImageElement.vue')),
  mface: defineAsyncComponent(() => import('./ImageElement.vue')),
  file: defineAsyncComponent(() => import('./FileElement.vue')),
  video: defineAsyncComponent(() => import('./VideoElement.vue')),
  record: defineAsyncComponent(() => import('./RecordElement.vue')),
  markdown: defineAsyncComponent(() => import('./MarkdownElement.vue')),
  forward: defineAsyncComponent(() => import('./ForwardElement.vue')),
  card: defineAsyncComponent(() => import('./CardElement.vue')),
  json: defineAsyncComponent(() => import('./CardElement.vue')),
  xml: defineAsyncComponent(() => import('./CardElement.vue')),
  default: defineAsyncComponent(() => import('./DefaultElement.vue'))
}

/**
 * 获取消息段对应组件
 * @param type - 消息段类型
 * @returns 对应的 Vue 组件
 */
export const getElement = (type: string): Component => {
  return (map[type] ?? map['default']) as Component
}
