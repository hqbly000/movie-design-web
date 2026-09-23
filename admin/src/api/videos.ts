import { request } from '@/api/request'
import type { PageResult } from '@/types/api'
import type { Asset, BvMeta, UploadResult, Video, VideoCreateIn } from '@/types/models'

export interface VideoQuery {
  category_id?: string
  status?: string
  keyword?: string
  page?: number
  size?: number
}

/** GET /api/admin/videos */
export function listVideos(query: VideoQuery = {}): Promise<PageResult<Video>> {
  return request.get<PageResult<Video>>('/api/admin/videos', { params: query })
}

/** POST /api/admin/videos */
export function createVideo(body: VideoCreateIn): Promise<Video> {
  return request.post<Video>('/api/admin/videos', body)
}

/** PUT /api/admin/videos/{id} */
export function updateVideo(id: number, body: Partial<VideoCreateIn>): Promise<Video> {
  return request.put<Video>(`/api/admin/videos/${id}`, body)
}

/** DELETE /api/admin/videos/{id} */
export function deleteVideo(id: number): Promise<null> {
  return request.delete<null>(`/api/admin/videos/${id}`)
}

/** POST /api/admin/videos/parse-bv（格式非法 2001；无法取到信息 2002 仍返回 bv_id） */
export function parseBv(input: string): Promise<BvMeta> {
  return request.post<BvMeta>('/api/admin/videos/parse-bv', { input })
}

/** POST /api/admin/uploads（multipart） */
export function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  return request.post<UploadResult>('/api/admin/uploads', form)
}

/** GET /api/admin/assets（图集素材，供「从图集选择」） */
export function listAssets(params: { group_id?: number; type?: string } = {}): Promise<Asset[]> {
  return request.get<Asset[]>('/api/admin/assets', { params })
}
