/**
 * 官网运行时公开内容客户端。
 * 从独立后台服务（经 nginx / vite 代理）拉取首页动态内容。
 * 接口不可用时返回 null，由调用方回退到代码内 Mock。
 */
export interface PublicVideo {
  id: number;
  title: string;
  bvid: string;
  cover: string;
}

export interface PublicHome {
  videos: PublicVideo[];
  heroImage: { src: string; alt: string } | null;
}

const TIMEOUT_MS = 4000;

export async function fetchPublicHome(): Promise<PublicHome | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch('/api/public/home', { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as PublicHome;
    return data;
  } catch {
    return null;
  }
}
