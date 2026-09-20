/**
 * B 站链接 → BV 号解析。
 * 支持：BV 号本身、b23.tv 短链外的完整链接（含 ?p=2 等参数）。
 */
const BV_RE = /(BV[0-9A-Za-z]{10})/;

export function parseBvid(input) {
  const m = BV_RE.exec(String(input || '').trim());
  return m ? m[1] : null;
}

/** B 站官方嵌入播放器地址 */
export function embedUrl(bvid) {
  return `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&danmaku=0&high_quality=1`;
}
