import Dexie, { type Table } from 'dexie'
import type { Message, GroupMemberInfo } from '@/types'

/**
 * 本地数据库消息接口
 * @description 扩展原始消息类型，添加会话唯一标识和排序序号
 */
export interface DBMessage extends Message {
  /** 会话唯一标识 */
  session_id: string
  /** 会话排序序号 */
  session_seq: number
}

/**
 * 本地数据库群成员接口
 * @description 扩展群成员信息，添加所属群号字段
 */
export interface DBMember extends GroupMemberInfo {
  /** 群号 */
  group_id: number
}

/**
 * 消息持久化数据库
 */
export class Database extends Dexie {
  public messages!: Table<DBMessage, [string, number]>
  public members!: Table<DBMember, [number, number]>

  constructor() {
    super('rimeq-databases')
    this.version(1).stores({
      messages: '[session_id+session_seq], message_id',
      members: '[group_id+user_id], group_id'
    })
  }
}

export const database = new Database()
