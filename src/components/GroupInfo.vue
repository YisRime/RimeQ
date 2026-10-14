<template>
  <div class="ui-flex-col-full bg-transparent relative overflow-hidden">
    <!-- 顶部导航栏 -->
    <header class="h-14 shrink-0 px-3 border-b border-white/5 flex items-center gap-3 z-30 bg-transparent">
      <Button v-tooltip.bottom="'返回'" icon="i-ri-arrow-left-s-line" text rounded class="!w-8 !h-8 !text-foreground-sub shrink-0" @click="router.back()" />
      <div class="flex-1 min-w-0 flex items-center gap-2">
        <span class="font-bold text-sm text-foreground-main truncate select-text">
          {{ currentGroup?.group_name }}
        </span>
        <div
          v-if="myLevel > 1"
          class="i-ri-edit-line text-sm text-foreground-dim hover:text-primary cursor-pointer shrink-0 ui-trans p-1 rounded-md hover:bg-background-sub/40"
          @click="openEditDialog('name')"
        />
      </div>
    </header>
    <!-- 信息面板 -->
    <section class="shrink-0 px-3 pb-0 z-20">
      <div class="bg-background-sub/30 backdrop-blur-lg rounded-2xl p-4 border border-white/10 shadow-sm flex flex-col gap-3 relative overflow-hidden">
        <div class="flex items-center gap-3 h-12">
          <!-- 群头像 -->
          <div
            class="relative group shrink-0 h-full aspect-square"
            :class="myLevel > 1 ? 'cursor-pointer' : ''"
            @click="myLevel > 1 && avatarInput?.click()"
          >
            <Avatar
              :image="`https://p.qlogo.cn/gh/${groupId}/${groupId}/0`"
              shape="circle"
              class="!w-12 !h-12 border border-white/10 shadow-sm bg-background-sub/50"
            />
            <!-- 上传遮罩 -->
            <div v-if="myLevel > 1" class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background-sub/80 border border-white/20 shadow-sm ui-flex-center opacity-0 group-hover:opacity-100 ui-trans scale-75 group-hover:scale-100">
              <div class="i-ri-camera-line text-[10px] text-foreground-main" />
            </div>
            <input v-if="myLevel > 1" ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </div>
          <!-- 中间信息栏 -->
          <div class="flex-1 min-w-0 flex flex-col justify-center h-full gap-0.5">
            <!-- 群号 -->
            <div class="flex items-center gap-2 text-sm text-foreground-sub">
              <span class="opacity-70 shrink-0">群号:</span>
              <span class="font-mono select-all">{{ groupId }}</span>
            </div>
            <!-- 备注 -->
            <div class="group/remark flex items-center gap-2 text-sm text-foreground-sub cursor-pointer" @click="openEditDialog('remark')">
              <span class="opacity-70 shrink-0">备注:</span>
              <span class="truncate ui-trans text-foreground-main">
                {{ currentGroup?.group_remark || '无' }}
              </span>
              <div class="i-ri-edit-2-line text-[10px] opacity-0 group-hover/remark:opacity-100 ui-trans" />
            </div>
          </div>
          <!-- 退群按钮 -->
          <div class="flex items-center h-full shrink-0">
             <Button
              v-tooltip.left="myLevel === 3 ? '解散该群' : '退出该群'"
              icon="i-ri-logout-box-r-line"
              text rounded
              severity="danger"
              class="!w-8 !h-8 opacity-60 hover:opacity-100 hover:!bg-red-500/10"
              @click="confirmLeave"
            />
          </div>
        </div>
        <!-- 管理操作栏 -->
        <div v-if="myLevel > 1" class="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 mt-1">
          <div
            class="ui-flex-center gap-2 py-1.5 rounded-lg hover:bg-background-sub/20 ui-trans cursor-pointer select-none"
            @click="toggleWholeBan"
          >
            <div class="w-6 h-3 rounded-full p-0.5 ui-trans relative shrink-0" :class="groupConfig.wholeBan ? 'bg-primary' : 'bg-background-dim'">
              <div class="w-2 h-2 bg-white rounded-full shadow-sm transition-transform" :class="groupConfig.wholeBan ? 'translate-x-3' : 'translate-x-0'" />
            </div>
            <span class="text-xs font-medium text-foreground-sub">全体禁言</span>
          </div>
          <div
            class="ui-flex-center gap-2 py-1.5 rounded-lg hover:bg-background-sub/20 ui-trans cursor-pointer select-none group/btn"
            @click="joinOptionDialog.visible = true"
          >
            <div class="i-ri-settings-4-line text-xs text-foreground-dim group-hover/btn:text-primary ui-trans" />
            <span class="text-xs font-medium text-foreground-sub">加群方式</span>
          </div>
        </div>
      </div>
    </section>
    <!-- 搜索栏 -->
    <div class="shrink-0 px-3 py-2 ui-flex-x gap-2 z-10">
      <IconField class="flex-1">
        <InputIcon class="i-ri-search-line text-foreground-sub text-xs" />
        <InputText
          v-model="keyword"
          placeholder="搜索成员..."
          class="w-full !h-8 !text-xs !bg-background-sub/30 focus:!bg-background-sub/50 !border-transparent focus:!border-primary/50 !rounded-lg !pl-8 !pr-16 ui-trans placeholder:text-foreground-dim text-foreground-main"
        />
        <!-- 成员计数 -->
        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-foreground-dim pointer-events-none">
          <span class="text-foreground-sub">{{ filteredMembers.length }} / {{ currentGroup?.max_member_count }}</span>
        </div>
      </IconField>
      <Button
        v-if="myLevel > 1"
        v-tooltip.bottom="'批量管理'"
        :icon="isBatchMode ? 'i-ri-check-double-line text-primary' : 'i-ri-list-check'"
        text rounded
        class="!w-8 !h-8 !text-foreground-sub shrink-0 bg-background-sub/20 border border-white/10 shadow-sm hover:!bg-background-sub/40"
        :class="{ '!bg-primary/10': isBatchMode }"
        @click="toggleBatchMode"
      />
    </div>
    <!-- 成员列表容器 -->
    <div class="flex-1 min-h-0 relative flex flex-col w-full">
      <VirtualScroller :items="sortedMembers" :item-size="56" class="size-full ui-scrollbar bg-transparent" :pt="{ content: { class: '!w-full' } }" >
        <template #item="{ item }">
          <div class="px-2 py-0.5 w-full">
            <div
              class="group ui-flex-x gap-3 px-2 rounded-lg hover:bg-background-sub/20 relative h-[52px] ui-trans border border-transparent select-none w-full"
              :class="{
                'bg-primary/5': selectedMembers.has(item.user_id) && isBatchMode,
                'opacity-50 cursor-not-allowed grayscale': isBatchMode && !canManage(item),
                'cursor-pointer': isBatchMode
              }"
              @click="isBatchMode && handleBatchSelect(item)"
              @contextmenu.prevent="openMenu($event, item)"
            >
              <!-- 成员头像 -->
              <div class="relative shrink-0 flex items-center h-full">
                <Avatar :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.user_id}`" shape="circle" class="!w-8 !h-8 border border-white/10 bg-background-sub/50" />
              </div>
              <!-- 成员信息 -->
              <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5 h-full">
                <!-- 昵称与头衔 -->
                <div class="ui-flex-x gap-1.5">
                  <span class="text-sm font-medium text-foreground-main truncate" :class="{'text-primary': item.user_id === myUserId}">
                    {{ item.card || item.nickname }}
                  </span>
                  <Chip
                    v-if="item.title || item.role === 'owner' || item.role === 'admin'"
                    :label="item.title || (item.role === 'owner' ? '群主' : '管理')"
                    class="!text-[9px] !h-4 !px-1 !border-none !rounded leading-tight shrink-0"
                    :class="[
                      item.role === 'owner' ? '!bg-yellow-500/10 !text-yellow-600' :
                      item.role === 'admin' ? '!bg-green-500/10 !text-green-600' :
                      '!bg-background-dim/50 !text-foreground-sub'
                    ]"
                  />
                </div>
                <!-- 账号与状态 -->
                <div class="text-[10px] ui-flex-x gap-2 leading-none">
                  <span class="text-foreground-dim font-mono opacity-60">{{ item.user_id }}</span>
                  <div v-if="item.shut_up_timestamp > Date.now() / 1000" class="text-red-500 ui-flex-x gap-0.5">
                    <div class="i-ri-mic-off-line text-[9px]" />
                    <span>{{ formatDuration(item.shut_up_timestamp - Date.now() / 1000) }}</span>
                  </div>
                </div>
              </div>
              <!-- 操作按钮 -->
              <div v-if="!isBatchMode" class="absolute right-0 top-0 bottom-0 flex items-center px-2 opacity-0 group-hover:opacity-100 ui-trans z-10">
                <Button
                  icon="i-ri-more-2-fill"
                  text rounded
                  class="!w-8 !h-8 !text-foreground-dim hover:!text-foreground-main hover:!bg-background-sub/40 shadow-sm border border-transparent transition-all"
                  @click.stop="openMenu($event, item)"
                />
              </div>
            </div>
          </div>
        </template>
      </VirtualScroller>
      <!-- 批量操作栏 -->
      <div
        v-if="isBatchMode"
        class="absolute bottom-4 left-4 right-4 bg-background-sub/80 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-3 flex items-center justify-between z-30 gap-3"
        v-motion
        :initial="{ y: 100, opacity: 0 }"
        :enter="{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
        :leave="{ y: 100, opacity: 0, transition: { duration: 200 } }"
      >
        <!-- 选中状态 -->
        <div class="text-xs font-bold text-foreground-main flex items-center gap-1 shrink-0">
          <span>已选 {{ selectedMembers.size }} 人</span>
        </div>
        <!-- 功能按钮组 -->
        <div class="flex items-center gap-2">
          <Button label="禁言" size="small" severity="warning" class="!px-3" outlined :disabled="selectedMembers.size === 0" @click="openBanDialog()"/>
          <Button label="踢出" size="small" severity="danger" class="!px-3" :disabled="selectedMembers.size === 0" @click="handleKick(members.filter(m => selectedMembers.has(m.user_id)))"/>
        </div>
      </div>
    </div>
    <!-- 文本输入弹窗 -->
    <Dialog v-model:visible="textDialog.visible" modal :header="textDialog.title" :style="{ width: '18rem' }">
      <div class="flex flex-col gap-3 pt-1">
        <InputText
          v-model="textDialog.value"
          :placeholder="textDialog.placeholder"
          class="w-full !text-sm !bg-background-sub/50 !border-transparent !rounded-lg"
          autofocus
          @keyup.enter="handleTextSave"
        />
        <div class="flex justify-end gap-2">
          <Button label="取消" text severity="secondary" size="small" @click="textDialog.visible = false" />
          <Button label="保存" size="small" :loading="textDialog.loading" @click="handleTextSave" />
        </div>
      </div>
    </Dialog>
    <!-- 禁言设置弹窗 -->
    <Dialog v-model:visible="banDialog.visible" modal header="禁言时长" :style="{ width: '22rem' }">
      <div class="flex flex-col gap-4 py-2">
        <!-- 时间选择器 -->
        <div class="flex items-center justify-between gap-2">
          <InputNumber v-model="banForm.d" :min="0" :max="30" show-buttons button-layout="vertical" suffix=" 天" input-class="!text-center !text-sm !p-1 w-full" class="flex-1" />
          <InputNumber v-model="banForm.h" :min="0" :max="23" show-buttons button-layout="vertical" suffix=" 时" input-class="!text-center !text-sm !p-1 w-full" class="flex-1" />
          <InputNumber v-model="banForm.m" :min="0" :max="59" show-buttons button-layout="vertical" suffix=" 分" input-class="!text-center !text-sm !p-1 w-full" class="flex-1" />
          <InputNumber v-model="banForm.s" :min="0" :max="59" show-buttons button-layout="vertical" suffix=" 秒" input-class="!text-center !text-sm !p-1 w-full" class="flex-1" />
        </div>
        <!-- 操作按钮 -->
        <div class="flex gap-2">
           <Button label="解除" severity="success" outlined class="flex-1 !text-xs" @click="executeBan(0)" />
           <Button label="禁言" class="flex-1 !text-xs" :disabled="(banForm.d * 86400 + banForm.h * 3600 + banForm.m * 60 + banForm.s) === 0" @click="executeBan()" />
        </div>
      </div>
    </Dialog>
    <!-- 加群方式弹窗 -->
    <Dialog v-model:visible="joinOptionDialog.visible" modal header="加群方式" :style="{ width: '22rem' }">
      <div class="flex flex-col gap-3 text-sm">
        <div class="flex flex-col gap-1">
          <div
            v-for="opt in [
              { label: '允许任何人加群', value: 1 },
              { label: '需要发送验证消息', value: 2 },
              { label: '正确回答问题', value: 3 },
              { label: '回答问题并由管理员审核', value: 4 },
              { label: '不允许任何人加群', value: 5 }
            ]"
            :key="opt.value"
            class="ui-flex-x gap-3 p-2.5 rounded-lg border cursor-pointer ui-trans"
            :class="joinOptionDialog.type === opt.value ? 'border-primary bg-primary/5' : 'border-background-dim hover:bg-background-dim/30'"
            @click="joinOptionDialog.type = opt.value"
          >
            <RadioButton :model-value="joinOptionDialog.type" :value="opt.value" readonly class="scale-90" />
            <span>{{ opt.label }}</span>
          </div>
        </div>
        <div v-if="[3, 4].includes(joinOptionDialog.type)" class="flex flex-col gap-2 bg-background-dim/30 p-2 rounded-lg">
          <InputText v-model="joinOptionDialog.question" placeholder="问题" class="w-full !text-xs !h-8" />
          <InputText v-model="joinOptionDialog.answer" placeholder="答案" class="w-full !text-xs !h-8" />
        </div>
        <div class="flex justify-end gap-2 mt-1">
          <Button label="取消" text severity="secondary" size="small" @click="joinOptionDialog.visible = false" />
          <Button label="保存" size="small" @click="saveJoinOption" />
        </div>
      </div>
    </Dialog>
    <!-- 成员右键菜单 -->
    <ContextMenu ref="contextMenu" :model="memberActions" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Avatar, IconField, InputIcon, InputText, Button, Chip,
  Dialog, useToast, ContextMenu, useConfirm,
  InputNumber, RadioButton, VirtualScroller
} from 'primevue'
import { useContactStore, useSettingStore } from '@/stores'
import { bot } from '@/api'
import { formatDuration } from '@/utils/format'
import type { GroupMemberInfo } from '@/types'

// 路由与钩子
const router = useRouter()
const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const contactStore = useContactStore()
const settingStore = useSettingStore()

// 基础状态
const keyword = ref('')
const members = ref<GroupMemberInfo[]>([])
const groupId = computed(() => route.params.id as string)
const myUserId = computed(() => settingStore.user?.user_id)

// 批量管理状态
const isBatchMode = ref(false)
const selectedMembers = ref<Set<number>>(new Set())
const contextMenu = ref()
const contextMember = ref<GroupMemberInfo | null>(null)

// 群组配置
const groupConfig = reactive({ wholeBan: false })
const avatarInput = ref<HTMLInputElement>()
const currentGroup = computed(() => contactStore.groups.find(g => String(g.group_id) === groupId.value))

// 权限等级
const roleLevel = { owner: 3, admin: 2, member: 1 }
const getLevel = (role: string = 'member') => roleLevel[role as keyof typeof roleLevel] || 1
const myLevel = computed(() => {
  const uid = myUserId.value
  return getLevel(uid ? contactStore.getMember(Number(groupId.value), uid)?.role : undefined)
})

// 判断是否有权管理目标
const canManage = (target: GroupMemberInfo) => {
  if (target.user_id === myUserId.value) return false
  return myLevel.value > getLevel(target.role)
}

// 成员过滤
const filteredMembers = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return members.value
  return members.value.filter(m =>
    String(m.user_id).includes(k) ||
    m.nickname.toLowerCase().includes(k) ||
    (m.card && m.card.toLowerCase().includes(k))
  )
})

// 成员列表排序
const sortedMembers = computed(() => {
  if (!members.value.length) return []
  return [...filteredMembers.value].sort((a, b) => {
    const levelA = getLevel(a.role)
    const levelB = getLevel(b.role)
    if (levelA !== levelB) return levelB - levelA
    if (levelA === 1) if (!!a.title !== !!b.title) return !!b.title ? 1 : -1
    return b.join_time - a.join_time
  })
})

// 初始化
onMounted(async () => {
  if (!groupId.value) return
  const gid = Number(groupId.value)
  members.value = await contactStore.fetchGroupMembers(gid)
  const info = await bot.getGroupInfo(gid, true)
  if (info) {
    contactStore.upsertGroup(info)
    groupConfig.wholeBan = !!info.group_all_shut
  }
})

// 切换批量模式
const toggleBatchMode = () => {
  isBatchMode.value = !isBatchMode.value
  selectedMembers.value.clear()
}

// 批量选中处理
const handleBatchSelect = (member: GroupMemberInfo) => {
  if (!canManage(member)) return
  if (selectedMembers.value.has(member.user_id)) selectedMembers.value.delete(member.user_id)
  else selectedMembers.value.add(member.user_id)
}

// 开启菜单
const openMenu = (event: MouseEvent, member: GroupMemberInfo) => {
  if (isBatchMode.value) return
  contextMember.value = member
  contextMenu.value.show(event)
}

// 菜单配置
const memberActions = computed(() => {
  const target = contextMember.value
  if (!target) return []
  const items: any[] = [
    { label: '与其私聊', icon: 'i-ri-message-3-line', command: () => router.push(`/${target.user_id}`) },
    { label: '复制 QQ', icon: 'i-ri-file-copy-line', command: () => navigator.clipboard.writeText(String(target.user_id)) }
  ]
  if (canManage(target)) {
    items.push({ separator: true })
    items.push({ label: '修改名片', icon: 'i-ri-id-card-line', command: () => openEditDialog('card', target) })
    const isBanned = (target.shut_up_timestamp ?? 0) > Date.now() / 1000
    items.push({
      label: isBanned ? '解禁成员' : '禁言成员', icon: isBanned ? 'i-ri-mic-off-fill text-red-500' : 'i-ri-mic-off-line',
      command: () => {
        if (isBanned) {
          banDialog.targets = [target]
          executeBan(0)
        } else {
          openBanDialog(target)
        }
      }
    })
    items.push({ label: '移出本群', icon: 'i-ri-delete-bin-line text-red-500', command: () => handleKick([target]) })
  }
  if (myLevel.value === 3 && target.user_id !== myUserId.value) {
    const isAdmin = target.role === 'admin'
    items.push({ separator: true })
    items.push({ label: isAdmin ? '取消管理' : '设为管理', icon: 'i-ri-shield-user-line', command: () => handleAdminToggle(target) })
    items.push({ label: '设置头衔', icon: 'i-ri-vip-crown-line', command: () => openEditDialog('title', target) })
  }
  return items
})

// 处理头像上传
const handleAvatarUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      await bot.setGroupPortrait(Number(groupId.value), e.target?.result as string)
    } catch (e) {
      toast.add({ severity: 'error', summary: '上传失败', detail: String(e), life: 3000 })
    }
  }
  reader.readAsDataURL(file)
}

// 切换全体禁言
const toggleWholeBan = async () => {
  try {
    await bot.setGroupWholeBan(Number(groupId.value), !groupConfig.wholeBan)
    groupConfig.wholeBan = !groupConfig.wholeBan
    toast.add({ severity: 'success', summary: groupConfig.wholeBan ? '已开启全体禁言' : '已关闭全体禁言', life: 3000 })
  } catch(e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 })
  }
}

// 确认退群 / 解散
const confirmLeave = () => {
  confirm.require({
    message: myLevel.value === 3 ? '确定要解散该群吗？' : '确定要退出该群吗？',
    header: '离开本群',
    icon: 'i-ri-alert-fill text-red-500',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await bot.setGroupLeave(Number(groupId.value), myLevel.value === 3)
        router.replace('/')
        toast.add({ severity: 'success', summary: myLevel.value === 3 ? '已解散该群' : '已退出该群', life: 3000 })
      } catch (e) {
        toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 })
      }
    }
  })
}

// 加群方式设置
const joinOptionDialog = reactive({ visible: false, type: 2, question: '', answer: '' })
const saveJoinOption = async () => {
  try {
    await bot.setGroupAddOption(Number(groupId.value), joinOptionDialog.type, joinOptionDialog.question, joinOptionDialog.answer)
    joinOptionDialog.visible = false
  } catch(e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 })
  }
}

// 踢出成员
const handleKick = (targets: GroupMemberInfo[]) => {
  if (!targets.length) return
  const isBatch = targets.length > 1
  const target = targets[0]
  if (!target) return
  confirm.require({
    message: isBatch ? `确定要踢出选中的 ${targets.length} 名成员吗？` : `确定要踢出 ${target.card || target.nickname} 吗？`,
    header: '踢出成员',
    icon: 'i-ri-delete-bin-2-line text-red-500',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        if (isBatch) {
          await bot.setGroupKickMembers(Number(groupId.value), targets.map(m => m.user_id))
        } else {
          await bot.setGroupKick(Number(groupId.value), target.user_id)
        }
        const ids = new Set(targets.map(m => m.user_id))
        members.value = members.value.filter(m => !ids.has(m.user_id))
        if (isBatchMode.value) {
          selectedMembers.value.clear()
          isBatchMode.value = false
        }
        toast.add({ severity: 'success', summary: `已踢出 ${targets.length} 人`, life: 3000 })
      } catch (e) {
        toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 })
      }
    }
  })
}

// 禁言相关状态
const banDialog = reactive({ visible: false, targets: [] as GroupMemberInfo[] })
const banForm = reactive({ d: 0, h: 0, m: 10, s: 0 })

// 打开禁言弹窗
const openBanDialog = (member?: GroupMemberInfo) => {
  banDialog.targets = member ? [member] : members.value.filter(m => selectedMembers.value.has(m.user_id))
  if (banDialog.targets.length === 0) return
  banForm.d = 0; banForm.h = 0; banForm.m = 10; banForm.s = 0;
  banDialog.visible = true
}

// 执行禁言
const executeBan = async (duration?: number) => {
  const finalDuration = duration ?? (banForm.d * 86400 + banForm.h * 3600 + banForm.m * 60 + banForm.s)
  banDialog.visible = false
  const targets = banDialog.targets
  let successCount = 0
  for (const target of targets) {
    try {
      await bot.setGroupBan(Number(groupId.value), target.user_id, finalDuration)
      ;target.shut_up_timestamp = finalDuration === 0 ? 0 : Date.now() / 1000 + finalDuration
      successCount++
      if (targets.length > 1) await new Promise(r => setTimeout(r, 100))
    } catch (e) { console.error(e) }
  }
  if (isBatchMode.value) {
    selectedMembers.value.clear()
    isBatchMode.value = false
  }
  const summary = finalDuration === 0 ? '已解禁' : '已禁言'
  if (successCount > 0) toast.add({ severity: 'success', summary: `${summary} ${successCount} 人`, life: 3000 })
}

// 切换管理员状态
const handleAdminToggle = async (member: GroupMemberInfo) => {
  const isSet = member.role !== 'admin'
  try {
    await bot.setGroupAdmin(Number(groupId.value), member.user_id, isSet)
    member.role = isSet ? 'admin' : 'member'
  } catch (e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 })
  }
}

// 文本编辑弹窗状态
const textDialog = reactive({ visible: false, type: '', title: '', placeholder: '', value: '', loading: false, targetUser: null as GroupMemberInfo | null })

// 打开编辑弹窗
const openEditDialog = (type: 'name' | 'remark' | 'title' | 'card', member?: GroupMemberInfo) => {
  textDialog.type = type
  textDialog.targetUser = member || null
  textDialog.visible = true
  if (type === 'name') {
    textDialog.title = '修改群名称'
    textDialog.value = currentGroup.value?.group_name || ''
  } else if (type === 'remark') {
    textDialog.title = '修改群备注'
    textDialog.value = currentGroup.value?.group_remark || ''
  } else if (type === 'title' && member) {
    textDialog.title = `设置 ${member.nickname} 的头衔`
    textDialog.value = member.title || ''
  } else if (type === 'card' && member) {
    textDialog.title = `修改 ${member.nickname} 的名片`
    textDialog.value = member.card || ''
  }
}

// 保存文本修改
const handleTextSave = async () => {
  textDialog.loading = true
  try {
    const gid = Number(groupId.value)
    const val = textDialog.value.trim()
    const target = textDialog.targetUser
    if (textDialog.type === 'name') {
      await bot.setGroupName(gid, val)
      if (currentGroup.value) currentGroup.value.group_name = val
    } else if (textDialog.type === 'remark') {
      await bot.setGroupRemark(gid, val)
      if (currentGroup.value) currentGroup.value.group_remark = val
    } else if (textDialog.type === 'title' && target) {
      await bot.setGroupSpecialTitle(gid, target.user_id, val)
      target.title = val
    } else if (textDialog.type === 'card' && target) {
      await bot.setGroupCard(gid, target.user_id, val)
      target.card = val
    }
    textDialog.visible = false
  } catch (e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000})
  }
  finally { textDialog.loading = false }
}
</script>
