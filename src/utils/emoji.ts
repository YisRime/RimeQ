// 硬编码列表
export const superList = [
  5, 311, 312, 314, 317, 318, 319, 320, 324, 325, 337,
  338, 339, 341, 342, 343, 344, 345, 346, 181, 74, 75,
  351, 349, 350, 395, 114, 326, 53, 137, 333, 424, 415,
  392, 425, 427, 426, 419, 429
]

export const normalList = [
  14, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 0, 15, 16,
  96, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 97, 98, 99, 100,
  101, 102, 103, 104, 105, 106, 107, 108, 305, 109, 110,
  111, 172, 182, 179, 173, 174, 212, 175, 178, 177, 176,
  183, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271,
  272, 277, 307, 306, 281, 282, 283, 284, 285, 293, 286,
  287, 289, 294, 297, 298, 299, 300, 323, 332, 336, 353,
  355, 356, 354, 352, 357, 428, 334, 347, 303, 302, 295,
  49, 66, 63, 64, 187, 146, 116, 67, 60, 185, 76, 124,
  118, 78, 119, 79, 120, 121, 77, 123, 201, 273, 46, 112,
  56, 169, 171, 59, 144, 147, 89, 41, 125, 42, 43, 86, 129,
  85
]

export const emojiList = [
  128522, 128524, 128538, 128531, 128560, 128541, 128513,
  128540, 9786, 128525, 128532, 128516, 128527, 128530,
  128563, 128536, 128557, 128561, 128514, 128170, 128074,
  128077, 128079, 128078, 128591, 128076, 128070, 128064,
  127836, 127847, 127838, 127866, 127867, 9749, 127822,
  127827, 127817, 128684, 127801, 127881, 128157, 128163,
  10024, 128168, 128166, 128293, 128164, 128169, 128137,
  128235, 128014, 128103, 128102, 128053, 128055, 128046,
  128020, 128056, 128123, 128027, 128054, 128051, 128098,
  9728, 10068, 128299, 128147, 127978
]

export interface EmojiDef {
  id: number
  type: 'apng' | 'emoji'
  value: string // URL 或 Emoji 字符
  isSuper: boolean
}

const LOCAL_FACE_MODE = import.meta.env.VITE_LOCAL_FACE === 'true'
const BASE_URL = import.meta.env.BASE_URL

/**
 * 表情相关工具类
 * 负责解析 QQ 表情 (APNG/Lottie) 与标准 Emoji
 */
export class EmojiUtils {
  /** 获取普通 QQ 表情的图片 URL */
  static getNormalUrl(id: number): string {
    if (LOCAL_FACE_MODE) {
      return `${BASE_URL}img/qface/${id}.png`
    } else {
      return `https://koishi.js.org/QFace/assets/qq_emoji/${id}/apng/${id}.png`
    }
  }

  /** 获取超级 QQ 表情 (Lottie) 的配置 JSON URL */
  static getSuperUrl(id: number): string {
    if (LOCAL_FACE_MODE) {
      return `${BASE_URL}img/qface/${id}.json`
    } else {
      return `https://koishi.js.org/QFace/assets/qq_emoji/${id}/lottie/${id}.json`
    }
  }

  /** 根据 ID 获取完整的表情定义 */
  static get(id: number): EmojiDef {
    if (id < 5000) {
      // QQ 表情
      return {
        id,
        type: 'apng',
        value: this.getNormalUrl(id),
        isSuper: superList.includes(id)
      }
    } else {
      // Emoji 字符
      return {
        id,
        type: 'emoji',
        value: String.fromCodePoint(id),
        isSuper: false
      }
    }
  }
}
