/**
 * 兜底静态数据（architecture.md §7.1 通用状态 · 错误）。
 * 当 `GET /api/public/site` 失败时用于渲染，保证页面不白屏、视觉完整。
 * 图片路径与种子素材一致（backend/uploads/cover/*）。
 */

import type {
  CompanyDetail,
  Honor,
  SegmentContent,
  SegmentContentType,
  SiteConfig,
  SiteSettings,
  VideoItem
} from '@/types/site'

const SETTINGS: SiteSettings = {
  icp_no: '苏ICP备2026000000号-1',
  police_no: '苏公网安备32040002000000号',
  copyright: 'Copyright 2026 交点影视 版权所有',
  phone: '0539-8888888',
  address: '江苏省常州市钟楼区运河路 188 号 3 幢',
  email: 'hello@jiaodianfilm.com',
  work_hours: '周一至周日 9:00 - 18:00',
  brand_slogan: '以光影，铭记时光'
}

const HONORS: Honor[] = [
  {
    id: 1,
    title: '城市影像《流动的夜》',
    description: '以长曝光捕捉城市脉搏',
    issuer: '2025 江苏省新闻摄影年赛',
    level: '二等奖',
    sort: 0
  },
  {
    id: 2,
    title: '婚礼纪实《誓言》',
    description: '记录仪式中最真实的一刻',
    issuer: '2024 华东婚礼影像大赛',
    level: '一等奖',
    sort: 1
  },
  {
    id: 3,
    title: '人像《窗边的光》',
    description: '自然光下的情绪肖像',
    issuer: '2023 全国人像摄影双年展',
    level: '入选作品',
    sort: 2
  },
  {
    id: 4,
    title: '商业短片《器物之美》',
    description: '为手作品牌拍摄的形象短片',
    issuer: '2022 中国商业摄影年鉴',
    level: '提名',
    sort: 3
  },
  {
    id: 5,
    title: '公益纪实《山里的课堂》',
    description: '乡村教育题材纪实组照',
    issuer: '2021 平遥国际摄影大展',
    level: '三等奖',
    sort: 4
  }
]

/** 兜底站点配置。 */
export const FALLBACK_SITE: SiteConfig = {
  hero_slides: [
    {
      id: 1,
      image_url: '/uploads/cover/cinematic-wide.png',
      slogan: '以光影，铭记时光',
      sub_slogan: '人像写真 · 婚礼纪实 · 商业摄影',
      sort: 0
    },
    {
      id: 2,
      image_url: '/uploads/cover/portrait-natural-light.png',
      slogan: '每一次相遇都值得记录',
      sub_slogan: '自然光人像 · 捕捉真实情绪',
      sort: 1
    },
    {
      id: 3,
      image_url: '/uploads/cover/night-cityscape.png',
      slogan: '城市之上，光在流动',
      sub_slogan: '城市影像 · 夜景纪实',
      sort: 2
    }
  ],
  company_profile: {
    section_title: '公司介绍',
    company_name: '交点影视',
    founded_year: 2017,
    intro_text:
      '交点影视成立于 2017 年，是一家专注于人像、婚礼与商业影像的文化传媒机构。我们相信每一次相遇都值得被认真记录。九年来，团队以自然光与电影感为语言，为个人与品牌留下经得起时间回望的画面。'
  },  segments: [
    {
      id: 1,
      name: '人像写真',
      preview_image_url: '/uploads/cover/portrait-natural-light.png',
      content_type: 'video',
      sort: 0,
      item_count: 3
    },
    {
      id: 2,
      name: '婚礼纪实',
      preview_image_url: '/uploads/cover/wedding-documentary.png',
      content_type: 'video',
      sort: 1,
      item_count: 2
    },
    {
      id: 3,
      name: '商业摄影',
      preview_image_url: '/uploads/cover/commercial-product.png',
      content_type: 'video',
      sort: 2,
      item_count: 2
    },
    {
      id: 4,
      name: '活动跟拍',
      preview_image_url: '/uploads/cover/event-concert-stage.png',
      content_type: 'video',
      sort: 3,
      item_count: 1
    },
    {
      id: 5,
      name: '视频短片',
      preview_image_url: '/uploads/cover/behind-the-scenes-film-set.png',
      content_type: 'video',
      sort: 4,
      item_count: 2
    }
  ],
  honors: HONORS,
  site_settings: SETTINGS,
  video_count: 10
}

/** 板块简介兜底文案（与种子一致）。 */
const SEGMENT_BODIES: Record<number, string> = {
  1: '人像是我们最日常的题材，也是最难的一次。镜头前的人多半不习惯被注视，所以开拍的前二十分钟我们通常不谈构图——先让手有地方放，让呼吸慢下来，等你忘了相机在的时候，第一张能看的照片就出现了。',
  2: '仪式的转折总在下午四点后，所以我们只接全天跟拍。从晨间的准备到最后的送客，我们以纪实的位置待在故事旁边，不打断、不摆布，把这一天完整交还给你们。',
  3: '品牌影像是器物之光。我们先理解产品被制造的理由，再决定光从哪里来——棚拍控光呈现材质细节，场景实拍交代使用情境，让画面替产品说出第一句话。',
  4: '现场纪实没有彩排。我们提前与主办方对流程与机位，双机位覆盖舞台与观众席，捕捉那些注定只发生一次的瞬间，并在 48 小时内交付精选快剪。',
  5: '短片是交点的母语。从脚本、拍摄到调色与声音设计，我们以电影感的画面叙事承接品牌片、活动快剪与个人短片，让十五秒也能有起承转合。'
}

/** 兜底板块视频（按板块 id 索引）。 */
export const FALLBACK_SEGMENT_VIDEOS: Record<number, VideoItem[]> = {
  1: [
    makeVideo(1, '自然光人像 · 窗边', 'BV6F7g8H9i0J', 'portrait', 2025),
    makeVideo(2, '逆光人像 · 黄金时刻', 'BV6T7u8V9w0X', 'portrait', 2025),
    makeVideo(3, '旅拍 · 雾中山峦', 'BV1O2p3Q4r5S', 'portrait', 2022)
  ],
  2: [
    makeVideo(4, '婚礼纪实 · 誓言', 'BV1K2l3M4n5O', 'wedding', 2024),
    makeVideo(5, '婚礼细节 · 交换戒指', 'BV6P7q8R9s0T', 'wedding', 2024)
  ],
  3: [
    makeVideo(6, '商业产品 · 器物之光', 'BV1U2v3W4x5Y', 'commercial', 2024),
    makeVideo(7, '静物摄影 · 陶与光', 'BV6Z7a8B9c0D', 'commercial', 2023)
  ],
  4: [makeVideo(8, '活动跟拍 · 舞台现场', 'BV1E2f3G4h5I', 'event', 2023)],
  5: [
    makeVideo(9, '城市夜景 · 流动的光', 'BV1A2b3C4d5E', 'video', 2025),
    makeVideo(10, '城市影像 · 电影感横移', 'BV6J7k8L9m0N', 'video', 2025)
  ]
}

/** 构造兜底视频项（封面按分类复用种子素材）。 */
function makeVideo(
  id: number,
  title: string,
  bvId: string,
  category: string,
  year: number
): VideoItem {
  const coverByCategory: Record<string, string> = {
    portrait: '/uploads/cover/portrait-natural-light.png',
    wedding: '/uploads/cover/wedding-documentary.png',
    commercial: '/uploads/cover/commercial-product.png',
    event: '/uploads/cover/event-concert-stage.png',
    video: '/uploads/cover/night-cityscape.png',
    other: '/uploads/cover/behind-the-scenes-film-set.png'
  }
  return {
    id,
    title,
    bv_id: bvId,
    category_id: category,
    year,
    cover_url: coverByCategory[category] ?? '/uploads/cover/cinematic-wide.png',
    sort: id
  }
}

/** 公司详情长文兜底（与种子一致）。 */
export const FALLBACK_COMPANY_DETAIL: CompanyDetail = {
  long_intro:
    '交点影视成立于 2017 年，从两个人、一台机身、一间借来的工作室开始，到今天拥有自己的影棚，和一支覆盖摄影、剪辑、调色的完整团队。\n\n我们拍人像、婚礼、商业与活动影像，也拍短片。题材不同，方法是一样的：先花时间听懂对方想留住什么，再决定光从哪里来。这份「听懂」通常发生在开拍前的那通电话里，而不是拍摄现场。\n\n我们不追热门滤镜，也不做一眼能认出是同一套预设的片子。每一次拍摄结束后，原始文件都会归档一份——因为你可能会在三年后，想要一张当年没修过的原图。'
}

/** 图集兜底图片（按板块复用种子素材）。 */
function makeImages(segmentId: number, count: number): SegmentContent['images'] {
  const coverPool = [
    '/uploads/cover/wedding-documentary.png',
    '/uploads/cover/wedding-detail-hands.png',
    '/uploads/cover/backlit-portrait-golden-hour.png',
    '/uploads/cover/portrait-natural-light.png',
    '/uploads/cover/cinematic-wide.png',
    '/uploads/cover/still-life-ceramic.png',
    '/uploads/cover/travel-foggy-mountain.png',
    '/uploads/cover/night-cityscape.png'
  ]
  return Array.from({ length: count }, (_, index) => ({
    id: segmentId * 100 + index,
    url: coverPool[(segmentId + index) % coverPool.length],
    width: null,
    height: null
  }))
}

/** 按板块取兜底详情内容；未知板块返回空列表。 */
export function fallbackSegmentContent(
  segmentId: number,
  name = '',
  contentType: SegmentContentType = 'video'
): SegmentContent {
  const videos = FALLBACK_SEGMENT_VIDEOS[segmentId] ?? []
  return {
    segment_id: segmentId,
    name,
    content_type: contentType,
    body: SEGMENT_BODIES[segmentId] ?? null,
    videos: contentType === 'video' ? videos : [],
    images: contentType === 'gallery' ? makeImages(segmentId, 6) : []
  }
}
