import { defineAsyncComponent, type Component } from 'vue'

// 注册渲染组件
const components: Record<string, Component> = {
  // 文本类
  text: defineAsyncComponent(() => import('./TextElement.vue')),
  at: defineAsyncComponent(() => import('./AtElement.vue')),
  // 表情类
  face: defineAsyncComponent(() => import('./FaceElement.vue')),
  dice: defineAsyncComponent(() => import('./SuperFaceElement.vue')),
  rps: defineAsyncComponent(() => import('./SuperFaceElement.vue')),
  // 媒体类
  image: defineAsyncComponent(() => import('./ImageElement.vue')),
  mface: defineAsyncComponent(() => import('./ImageElement.vue')),
  video: defineAsyncComponent(() => import('./VideoElement.vue')),
  record: defineAsyncComponent(() => import('./RecordElement.vue')),
  file: defineAsyncComponent(() => import('./FileElement.vue')),
  flash_file: defineAsyncComponent(() => import('./FileElement.vue')),
  // 结构类
  forward: defineAsyncComponent(() => import('./ForwardElement.vue')),
  node: defineAsyncComponent(() => import('./ForwardElement.vue')),
  markdown: defineAsyncComponent(() => import('./MarkdownElement.vue')),
  // 卡片类
  json: defineAsyncComponent(() => import('./JsonElement.vue')),
  card: defineAsyncComponent(() => import('./JsonElement.vue')),
  xml: defineAsyncComponent(() => import('./XmlElement.vue')),
  // 杂项
  default: defineAsyncComponent(() => import('./DefaultElement.vue'))
}

/**
 * 获取消息段对应的渲染组件
 * @param type 消息段类型
 */
export const getElement = (type: string): Component => {
  return components[type] || components['default']!
}
