import type { HomeContent } from '@/types/content';

/**
 * Phase 1 mock content.
 *
 * 页面组件只消费这份结构，不关心数据来自本地文件还是 CMS。
 * Phase 3 接入 Directus/Payload 时，只替换 content provider 即可。
 */
export const homeContent: HomeContent = {
  site: {
    title: '域境摄影工作室 · 概念 Demo',
    brandCn: '域境摄影工作室',
    brandEn: 'YU JIAN PHOTOGRAPHY',
    nav: [
      { label: '首页', href: '#home' },
      { label: '作品展示', href: '#works' },
      { label: '摄影师', href: '#photographers' },
      { label: '新闻中心', href: '#news' },
      { label: '公司简介', href: '#about' },
      { label: '联系我们', href: '#contact' }
    ]
  },
  hero: {
    eyebrow: '与你一起见证光影世界',
    title: '摄影与生活相关',
    subtitle: 'Photography is related to life',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=82',
    videoSrc: null,
    defaultChannelId: 'video',
    channels: [
      {
        id: 'video',
        label: '视频 / 短片',
        meta: 'VIDEO',
        features: [
          { title: '影像与生活记录', subtitle: 'Photography and life' },
          { title: '空间与镜头语言', subtitle: 'Space photography' },
          { title: '人物故事表达', subtitle: 'Figure photography' },
          { title: '风景与情绪塑造', subtitle: 'Landscape photography' }
        ]
      },
      {
        id: 'expert',
        label: '专家',
        meta: 'EXPERT',
        features: [
          { title: '专业创作团队', subtitle: 'Professional team' },
          { title: '商业项目经验', subtitle: 'Commercial experience' },
          { title: '人物状态引导', subtitle: 'Portrait direction' },
          { title: '现场光线控制', subtitle: 'Lighting control' }
        ]
      },
      {
        id: 'popular',
        label: '科普',
        meta: 'POPULAR',
        features: [
          { title: '构图基础方法', subtitle: 'Composition basics' },
          { title: '镜头选择逻辑', subtitle: 'Lens selection' },
          { title: '自然光线运用', subtitle: 'Natural lighting' },
          { title: '后期色彩思路', subtitle: 'Color grading' }
        ]
      },
      {
        id: '10h',
        label: '10H',
        meta: 'SHOOTING',
        features: [
          { title: '完整项目纪实', subtitle: 'Full-day project' },
          { title: '拍摄现场记录', subtitle: 'Behind the scenes' },
          { title: '流程与协作', subtitle: 'Production workflow' },
          { title: '从清晨到收工', subtitle: 'Ten-hour shooting' }
        ]
      }
    ]
  },
  works: [
    // VIDEO
    {
      id: 'video-01',
      channelId: 'video',
      title: '城市夜行',
      subtitle: 'City after dark',
      cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
      alt: '城市短片作品示意',
      visible: true,
      sort: 1
    },
    {
      id: 'video-02',
      channelId: 'video',
      title: '品牌短片',
      subtitle: 'Brand film',
      cover: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
      alt: '品牌短片作品示意',
      visible: true,
      sort: 2
    },
    {
      id: 'video-03',
      channelId: 'video',
      title: '人物纪录',
      subtitle: 'Portrait documentary',
      cover: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=900&q=80',
      alt: '人物纪录作品示意',
      visible: true,
      sort: 3
    },
    {
      id: 'video-04',
      channelId: 'video',
      title: '空间叙事',
      subtitle: 'Spatial narrative',
      cover: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      alt: '空间短片作品示意',
      visible: true,
      sort: 4
    },
    {
      id: 'video-05',
      channelId: 'video',
      title: '街头片段',
      subtitle: 'Street moments',
      cover: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=900&q=80',
      alt: '街头影像作品示意',
      visible: true,
      sort: 5
    },
    {
      id: 'video-06',
      channelId: 'video',
      title: '幕后现场',
      subtitle: 'Behind the scenes',
      cover: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80',
      alt: '幕后拍摄作品示意',
      visible: true,
      sort: 6
    },

    // EXPERT
    {
      id: 'expert-01',
      channelId: 'expert',
      title: '商业肖像',
      subtitle: 'Commercial portrait',
      cover: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80',
      alt: '商业肖像作品示意',
      visible: true,
      sort: 1
    },
    {
      id: 'expert-02',
      channelId: 'expert',
      title: '冷调人物',
      subtitle: 'Editorial portrait',
      cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80',
      alt: '冷调人物作品示意',
      visible: true,
      sort: 2
    },
    {
      id: 'expert-03',
      channelId: 'expert',
      title: '品牌人物',
      subtitle: 'Brand portrait',
      cover: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80',
      alt: '品牌人物作品示意',
      visible: true,
      sort: 3
    },
    {
      id: 'expert-04',
      channelId: 'expert',
      title: '时尚肖像',
      subtitle: 'Fashion portrait',
      cover: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
      alt: '时尚肖像作品示意',
      visible: true,
      sort: 4
    },
    {
      id: 'expert-05',
      channelId: 'expert',
      title: '职业形象',
      subtitle: 'Professional image',
      cover: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80',
      alt: '职业形象作品示意',
      visible: true,
      sort: 5
    },
    {
      id: 'expert-06',
      channelId: 'expert',
      title: '黑白肖像',
      subtitle: 'Monochrome portrait',
      cover: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
      alt: '黑白肖像作品示意',
      visible: true,
      sort: 6
    },

    // POPULAR
    {
      id: 'popular-01',
      channelId: 'popular',
      title: '镜头与焦段',
      subtitle: 'Lens & focal length',
      cover: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
      alt: '镜头科普作品示意',
      visible: true,
      sort: 1
    },
    {
      id: 'popular-02',
      channelId: 'popular',
      title: '快门瞬间',
      subtitle: 'Shutter moment',
      cover: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80',
      alt: '快门科普作品示意',
      visible: true,
      sort: 2
    },
    {
      id: 'popular-03',
      channelId: 'popular',
      title: '自然光',
      subtitle: 'Natural light',
      cover: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
      alt: '自然光摄影作品示意',
      visible: true,
      sort: 3
    },
    {
      id: 'popular-04',
      channelId: 'popular',
      title: '构图练习',
      subtitle: 'Composition study',
      cover: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80',
      alt: '构图科普作品示意',
      visible: true,
      sort: 4
    },
    {
      id: 'popular-05',
      channelId: 'popular',
      title: '色彩关系',
      subtitle: 'Color relationship',
      cover: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
      alt: '色彩科普作品示意',
      visible: true,
      sort: 5
    },
    {
      id: 'popular-06',
      channelId: 'popular',
      title: '环境人像',
      subtitle: 'Environmental portrait',
      cover: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
      alt: '环境人像科普作品示意',
      visible: true,
      sort: 6
    },

    // 10H
    {
      id: '10h-01',
      channelId: '10h',
      title: '清晨开机',
      subtitle: 'Call time',
      cover: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
      alt: '拍摄开机记录示意',
      visible: true,
      sort: 1
    },
    {
      id: '10h-02',
      channelId: '10h',
      title: '现场布光',
      subtitle: 'Lighting setup',
      cover: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      alt: '现场布光记录示意',
      visible: true,
      sort: 2
    },
    {
      id: '10h-03',
      channelId: '10h',
      title: '人物沟通',
      subtitle: 'On-set direction',
      cover: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
      alt: '人物沟通记录示意',
      visible: true,
      sort: 3
    },
    {
      id: '10h-04',
      channelId: '10h',
      title: '中场调整',
      subtitle: 'Midday reset',
      cover: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=80',
      alt: '拍摄中场记录示意',
      visible: true,
      sort: 4
    },
    {
      id: '10h-05',
      channelId: '10h',
      title: '夜景拍摄',
      subtitle: 'Night shooting',
      cover: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=900&q=80',
      alt: '夜景拍摄记录示意',
      visible: true,
      sort: 5
    },
    {
      id: '10h-06',
      channelId: '10h',
      title: '收工时刻',
      subtitle: 'Wrap',
      cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
      alt: '拍摄收工记录示意',
      visible: true,
      sort: 6
    }
  ],
  photographers: [
    {
      id: 'photographer-01',
      name: '张风',
      role: '商业影像 · 视觉导演',
      description: '专注品牌广告与人物拍摄，擅长控制灯光层次、现场节奏与画面气场，形成更克制、更专业的商业视觉输出。',
      portrait: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1100&q=82',
      alt: '高级摄影师张风形象示意',
      visible: true,
      sort: 1
    },
    {
      id: 'photographer-02',
      name: '王识宇',
      role: '人像摄影 · 创意统筹',
      description: '以冷静、简洁的构图语言处理人物形象，强调专业感、距离感与品牌调性之间的平衡。',
      portrait: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1100&q=82',
      alt: '高级摄影师王识宇形象示意',
      visible: true,
      sort: 2
    }
  ],
  news: [
    {
      id: 'news-01',
      title: '城市街拍项目第一季上线',
      date: '2026.08.12',
      cover: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
      alt: '城市街拍项目示意',
      isNew: true,
      visible: true,
      sort: 1
    },
    {
      id: 'news-02',
      title: '品牌广告片幕后拍摄花絮',
      date: '2026.07.18',
      cover: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      alt: '品牌广告片幕后示意',
      isNew: true,
      visible: true,
      sort: 2
    },
    {
      id: 'news-03',
      title: '镜头之外：摄影师的一天',
      date: '2026.06.09',
      cover: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
      alt: '摄影师工作场景示意',
      visible: true,
      sort: 3
    },
    {
      id: 'news-04',
      title: '商业人物影像的构图方法',
      date: '2026.05.24',
      cover: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80',
      alt: '商业摄影构图示意',
      visible: true,
      sort: 4
    }
  ],
  about: {
    title: '公司简介',
    subtitle: 'About studio',
    description: '域境摄影工作室，以商业影像与人物纪实为核心方向。我们尝试把摄影从单纯的视觉呈现，延伸为品牌、空间、人物与故事之间的长期表达。这个 Demo 重点验证“深色基底 + 大幅摄影 + 居中标题 + 模块化内容 + 金色点缀”的设计语言。',
    signature: 'YU JIAN · PHOTOGRAPHY'
  },
  cta: {
    eyebrow: 'WITNESS WITH YOU',
    title: '理想的形象拍摄合作伙伴',
    description: '让视觉风格、人物状态与品牌表达形成一致的影像语言。',
    buttonLabel: '了解合作',
    stats: [
      { value: '100%', label: '客户好评' },
      { value: '250+', label: '优秀案例' },
      { value: '70+', label: '合作企业' }
    ]
  },
  footer: {
    links: [
      { label: '网站首页', href: '#home' },
      { label: '作品展示', href: '#works' },
      { label: '摄影师', href: '#photographers' },
      { label: '公司简介', href: '#about' },
      { label: '联系我们', href: '#contact' }
    ],
    copyright: '© 2026 YU JIAN PHOTOGRAPHY · CONCEPT DEMO'
  }
};
