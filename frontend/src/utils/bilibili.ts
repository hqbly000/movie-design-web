/**
 * B 站嵌入播放工具（architecture.md §6.4）。
 * 使用协议相对 `//` 自适应，避免 HTTPS 混合内容告警。
 */

/**
 * 由 BV 号构建 B 站 iframe 播放地址。
 * @param bvId BV 号（可带/不带 `BV` 前缀）
 * @param autoplay 是否自动播放，默认 true
 */
export function buildEmbedUrl(bvId: string, autoplay = true): string {
  const id = bvId.startsWith('BV') ? bvId : `BV${bvId}`
  const params = new URLSearchParams({
    bvid: id,
    autoplay: autoplay ? '1' : '0',
    high_quality: '1',
    danmaku: '0'
  })
  return `//player.bilibili.com/player.html?${params.toString()}`
}

/** 校验 BV 号格式（`BV[0-9A-Za-z]{10}`）。 */
export function isValidBv(bvId: string): boolean {
  return /^BV[0-9A-Za-z]{10}$/.test(bvId)
}

export default buildEmbedUrl
