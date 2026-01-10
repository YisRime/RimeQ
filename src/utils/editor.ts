import { type Ref } from 'vue'
import { useEditor, VueRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import tippy, { type Instance } from 'tippy.js'
import { useContactStore } from '@/stores'
import MentionList from '@/components/MentionList.vue'
import type { Segment } from '@/types'

/**
 * 初始化聊天编辑器
 * @param opts 配置选项
 */
export function useChatEditor(opts: {currentId: Ref<string>; isGroup: Ref<boolean>; onSend: () => void; onFile: (file: File) => void}) {
  const contactStore = useContactStore()

  const editor = useEditor({
    content: '',
    extensions: [
      // 基础套件
      StarterKit,
      // 图片扩展
      Image.configure({ allowBase64: true, inline: true }),
      // 占位符扩展
      Placeholder.configure({ placeholder: '请输入内容...' }),
      // 提及扩展
      Mention.configure({
        suggestion: {
          // 获取列表
          items: async ({ query }: { query: string }) => {
            if (!opts.isGroup.value) return []
            try {
              const list = await contactStore.fetchGroupMembers(Number(opts.currentId.value))
              const q = query.toLowerCase()
              return list
                .filter(m => String(m.user_id).includes(q) || m.card?.toLowerCase().includes(q) || m.nickname?.toLowerCase().includes(q))
                .map(m => ({ id: m.user_id, label: m.card || m.nickname, avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}` }))
            } catch { return [] }
          },
          // 执行渲染
          render: () => {
            let component: VueRenderer, popup: Instance[]
            return {
              onStart: (props: any) => {
                component = new VueRenderer(MentionList, { props, editor: props.editor })
                if (!props.clientRect) return
                popup = tippy([document.body], {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element as HTMLElement,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'top-start',
                  zIndex: 9999,
                })
              },
              onUpdate(props: any) {
                component.updateProps(props)
                if (props.clientRect) popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
              },
              onKeyDown(props: any) {
                if (props.event.key === 'Escape') { popup?.[0]?.hide(); return true }
                return component.ref?.onKeyDown(props)
              },
              onExit() {
                popup?.[0]?.destroy()
                component.destroy()
              },
            }
          },
        }
      })
    ],
    editorProps: {
      // 处理粘贴事件
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of items) {
            const file = item.getAsFile()
            if (file) {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  const { schema } = view.state
                  const imageType = schema.nodes.image
                  if (imageType) {
                    const node = imageType.create({ src: e.target?.result })
                    const tr = view.state.tr.replaceSelectionWith(node)
                    view.dispatch(tr)
                  }
                }
                reader.readAsDataURL(file)
              } else {
                opts.onFile(file)
              }
              return true
            }
          }
        }
        return false
      },
      // 处理拖拽事件
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          Array.from(event.dataTransfer.files).forEach(file => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader()
              reader.onload = (e) => {
                const { schema } = view.state
                const imageType = schema.nodes.image
                if (imageType) {
                  const node = imageType.create({ src: e.target?.result })
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                  const tr = view.state.tr.insert(coordinates?.pos || view.state.selection.from, node)
                  view.dispatch(tr)
                }
              }
              reader.readAsDataURL(file)
            } else {
              opts.onFile(file)
            }
          })
          return true
        }
        return false
      },
      // 处理键盘事件
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey) {
          opts.onSend()
          return true
        }
        return false
      }
    }
  })

  // 解析内容
  const getSegments = (): Segment[] => {
    if (!editor.value) return []
    const segments: Segment[] = []
    const json = editor.value.getJSON()
    if (json.content && Array.isArray(json.content)) {
      json.content.forEach((node: any, index: number) => {
        if (node.type === 'paragraph') {
          if (index > 0) segments.push({ type: 'text', data: { text: '\n' } })
          if (node.content) {
            node.content.forEach((child: any) => {
              if (child.type === 'text') {
                segments.push({ type: 'text', data: { text: child.text } })
              } else if (child.type === 'image' && child.attrs.src) {
                segments.push({ type: 'image', data: { file: child.attrs.src } })
              } else if (child.type === 'mention' && child.attrs.id) {
                segments.push({ type: 'at', data: { qq: child.attrs.id } })
              } else if (child.type === 'hardBreak') {
                const last = segments[segments.length - 1]
                if (last && last.type === 'text') {
                  last.data.text += '\n'
                } else {
                  segments.push({ type: 'text', data: { text: '\n' } })
                }
              }
            })
          }
        }
      })
    }
    return segments
  }

  // 方法封装
  const focus = () => editor.value?.commands.focus()
  const insertText = (text: string) => editor.value?.commands.insertContent(text)
  const insertImage = (src: string) => editor.value?.commands.setImage({ src })
  const clear = () => editor.value?.commands.clearContent()

  return { editor, focus, insertText, insertImage, clear, getSegments }
}
