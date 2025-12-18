import { BaseBotApi } from './base'

/**
 * NapCat 特定实现
 * 继承 BaseBotApi 并覆盖有差异的方法
 */
export class NapCatApi extends BaseBotApi {
    /**
     * NapCat 对群公告的实现不同，优先使用 _get_group_notice
     */
    async getGroupNotice(groupId: number): Promise<Array<{
        notice_id?: string
        sender_id?: number
        publish_time?: number
        message?: { text?: string; images?: Array<{ url: string }> }
        msg?: { text?: string }
        u?: string
        t?: number
    }>> {
        return this.safeRequest('getGroupNotice', async () => {
            // NapCat 使用 _get_group_notice
            const res = await this.wsService.callApi('_get_group_notice', { group_id: groupId }) as unknown
            if (res) {
                return Array.isArray(res) ? res : [res]
            }
            return []
        }, [])
    }
}

/**
 * Lagrange 特定实现
 * 继承 BaseBotApi 并覆盖有差异的方法
 */
export class LagrangeApi extends BaseBotApi {
    /**
     * Lagrange 对群公告的实现可能使用标准接口
     */
    async getGroupNotice(groupId: number): Promise<Array<{
        notice_id?: string
        sender_id?: number
        publish_time?: number
        message?: { text?: string; images?: Array<{ url: string }> }
        msg?: { text?: string }
        u?: string
        t?: number
    }>> {
        return this.safeRequest('getGroupNotice', async () => {
            // Lagrange 使用标准 get_group_notice
            const res = await this.wsService.callApi('get_group_notice', { group_id: groupId }) as unknown
            return Array.isArray(res) ? res : []
        }, [])
    }
}
