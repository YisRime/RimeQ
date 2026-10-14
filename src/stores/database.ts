import Dexie, { type Table } from 'dexie'
import type { Message, GroupMemberInfo, GroupMsgEmojiLikeNotice } from '@/types'
import type { Session } from './session'

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
 * 消息持久化数据库
 * @description 以 IndexedDB 为唯一数据源
 */
export class Database extends Dexie {
  public messages!: Table<DBMessage, number>
  public members!: Table<DBMember, [number, number]>
  public sessions!: Table<Session, number>

  constructor() {
    super('rimeq-databases')
    this.version(1).stores({
      messages: 'message_id, [session_id+session_index]',
      members: '[group_id+user_id], group_id',
      sessions: 'id'
    })
  }
}

export const database = new Database()
