/**
 * 分享页类型定义（对应 GET /api/share/{token}）。
 * ⚠️ 结构上不包含 customer_name / customer_contact（后端同样不输出）。
 */

/** 分享页视频项（仅 5 个字段）。 */
export interface ShareVideo {
  title: string
  cover_url: string | null
  bv_id: string
  year: number | null
  category_id: string | null
}

/** 分享页合集信息。 */
export interface ShareCollection {
  collection_name: string
  note: string | null
  generated_at: string | null
  videos: ShareVideo[]
}
