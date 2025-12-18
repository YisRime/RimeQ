import { BaseBotApi } from './base'
import { NapCatApi, LagrangeApi } from './variants'

/**
 * Bot 后端类型
 */
export type BotBackend = 'standard' | 'napcat' | 'lagrange'

/**
 * 全局 API 实例
 */
let apiInstance: BaseBotApi | null = null

/**
 * 当前后端类型
 */
let currentBackend: BotBackend = 'standard'

/**
 * 初始化 Bot API
 * @param backend 后端类型，默认为 'standard'
 */
export function initBotApi(backend: BotBackend = 'standard'): BaseBotApi {
    currentBackend = backend

    switch (backend) {
        case 'napcat':
            apiInstance = new NapCatApi()
            console.log('[BotApi] Initialized with NapCat backend')
            break
        case 'lagrange':
            apiInstance = new LagrangeApi()
            console.log('[BotApi] Initialized with Lagrange backend')
            break
        case 'standard':
        default:
            apiInstance = new BaseBotApi()
            console.log('[BotApi] Initialized with Standard backend')
            break
    }

    return apiInstance
}

/**
 * 获取当前 Bot API 实例
 * 如果未初始化，则使用默认的标准后端
 */
export function getBotApi(): BaseBotApi {
    if (!apiInstance) {
        apiInstance = new BaseBotApi()
    }
    return apiInstance
}

/**
 * 获取当前后端类型
 */
export function getCurrentBackend(): BotBackend {
    return currentBackend
}

/**
 * 导出默认实例（供直接引入使用）
 */
export const botApi = new Proxy({} as BaseBotApi, {
    get(_, prop: string | symbol) {
        const instance = getBotApi()
        const value = instance[prop as keyof BaseBotApi]
        if (typeof value === 'function') {
            return value.bind(instance)
        }
        return value
    },
})
