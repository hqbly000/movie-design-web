import { homeContent } from '@/data/home';
import type { HomeContent, WorkDetailContent, WorkItem } from '@/types/content';

/**
 * 内容访问边界。
 *
 * Phase 1: 返回本地 Mock 数据。
 * Phase 3: 这里改成 Directus / Payload / 自建 API 请求。
 * 页面与 UI 组件无需知道数据来源发生了变化。
 */
export async function getHomeContent(): Promise<HomeContent> {
  return homeContent;
}

export function getWorkPath(work: Pick<WorkItem, 'id' | 'slug'>): string {
  return `/works/${work.slug ?? work.id}`;
}

export async function getWorkDetail(slugOrId: string): Promise<WorkDetailContent | null> {
  const home = await getHomeContent();
  const works = home.works
    .filter((work) => work.visible)
    .sort((a, b) => a.channelId.localeCompare(b.channelId) || a.sort - b.sort);
  const work = works.find((item) => item.id === slugOrId || item.slug === slugOrId);

  if (!work) return null;

  const channel = home.hero.channels.find((item) => item.id === work.channelId);
  const channelLabel = channel?.label ?? '作品展示';
  const channelMeta = channel?.meta ?? 'WORKS';
  const channelWorks = works.filter((item) => item.channelId === work.channelId);
  const currentIndex = channelWorks.findIndex((item) => item.id === work.id);

  return {
    work,
    channelLabel,
    channelMeta,
    description:
      work.description ??
      `以${work.title}为核心的${channelLabel}项目，记录从构思、拍摄到成片的视觉过程。`,
    meta: [
      { label: '栏目', value: channelLabel },
      { label: '项目编号', value: work.id.toUpperCase() },
      { label: '年份', value: work.year ?? '2026' },
      ...(work.client ? [{ label: '客户', value: work.client }] : [])
    ],
    gallery: work.gallery?.length ? work.gallery : [{ src: work.cover, alt: work.alt }],
    previous: currentIndex > 0 ? channelWorks[currentIndex - 1] : undefined,
    next: currentIndex < channelWorks.length - 1 ? channelWorks[currentIndex + 1] : undefined
  };
}
