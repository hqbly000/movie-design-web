/** B 站 BV 号工具（architecture.md §3.1 / §5.2） */

const BV_RE = /BV[0-9A-Za-z]{10}/

/** 从任意输入（链接或纯 BV 号）中提取 BV 号，未匹配返回空串 */
export function extractBv(input: string): string {
  const match = input.trim().match(BV_RE)
  return match ? match[0] : ''
}

/** 是否为合法 BV 号（BV + 10 位字母数字） */
export function isValidBv(input: string): boolean {
  return /^BV[0-9A-Za-z]{10}$/.test(input.trim())
}

/** 构造 B 站嵌入式播放地址（官网播放器使用，此处备用） */
export function buildEmbedUrl(bv: string, autoplay = false): string {
  const flag = autoplay ? 1 : 0
  return `//player.bilibili.com/player.html?bvid=${bv}&autoplay=${flag}&high_quality=1`
}
