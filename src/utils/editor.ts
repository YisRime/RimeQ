import { type Ref } from 'vue'
import { useEditor, VueRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import tippy, { type Instance } from 'tippy.js'
import { bot } from '@/api'
import MentionList from '@/components/MentionList.vue'

interface ChatEditorOptions {
  /** 当前会话 ID (Ref) */
  currentId: Ref<string>
  /** 是否为群组 (Ref) */
  isGroup: Ref<boolean>
  /** 发送消息的回调 */
  onSend: () => void
}

export function useChatEditor({ currentId, isGroup, onSend }: ChatEditorOptions) {
  return useEditor({
    content: '',
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
        inline: true,
      }),
      Placeholder.configure({
        placeholder: '请输入消息... (输入 @ 提及)',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-primary font-bold bg-primary/10 rounded px-1 py-0.5 mx-0.5 decoration-clone inline-block',
        },
        suggestion: {
          items: async ({ query }: { query: string }) => {
            if (!isGroup.value) return []
            try {
              // 获取群成员列表
              const list = await bot.getGroupMemberList(Number(currentId.value))
              const q = query.toLowerCase()
              return list
                .filter(item =>
                  String(item.user_id).includes(q) ||
                  (item.card && item.card.toLowerCase().includes(q)) ||
                  (item.nickname && item.nickname.toLowerCase().includes(q))
                )
                .slice(0, 10)
                .map(item => ({
                  id: item.user_id,
                  label: item.card || item.nickname,
                  avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.user_id}`
                }))
            } catch (e) {
              console.error('Fetch members failed', e)
              return []
            }
          },
          render: () => {
            let component: VueRenderer
            let popup: Instance[]

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
                if (!props.clientRect) return
                popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
              },
              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide()
                  return true
                }
                return component.ref?.onKeyDown(props)
              },
              onExit() {
                popup?.[0]?.destroy()
                component.destroy()
              },
            }
          },
        }
      }),
    ],
    editorProps: {
      handlePaste: (view, event) => {
        // 粘贴图片处理
        const items = event.clipboardData?.items
        if (items) {
          for (const item of items) {
            if (item.type.indexOf('image') === 0) {
              const blob = item.getAsFile()
              if (blob) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  const src = e.target?.result as string
                  if (view.state.schema.nodes.image) {
                    view.dispatch(view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src })
                    ))
                  }
                }
                reader.readAsDataURL(blob)
                return true
              }
            }
          }
        }
        return false
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey) {
          onSend()
          return true
        }
        return false
      }
    }
  })
}
