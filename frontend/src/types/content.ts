export interface NavItem {
  label: string;
  href: string;
}

export interface FeatureItem {
  title: string;
  subtitle: string;
}

export interface HeroChannel {
  id: string;
  label: string;
  meta: string;
  features: FeatureItem[];
}

export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  videoSrc?: string | null;
  defaultChannelId: string;
  channels: HeroChannel[];
}

export interface WorkItem {
  id: string;
  channelId: string;
  title: string;
  subtitle: string;
  cover: string;
  alt: string;
  visible: boolean;
  sort: number;
  slug?: string;
  description?: string;
  client?: string;
  year?: string;
  gallery?: WorkGalleryItem[];
}

export interface WorkGalleryItem {
  src: string;
  alt: string;
}

export interface WorkDetailContent {
  work: WorkItem;
  channelLabel: string;
  channelMeta: string;
  description: string;
  meta: Array<{ label: string; value: string }>;
  gallery: WorkGalleryItem[];
  previous?: WorkItem;
  next?: WorkItem;
}

export interface Photographer {
  id: string;
  name: string;
  role: string;
  description: string;
  portrait: string;
  alt: string;
  visible: boolean;
  sort: number;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  cover: string;
  alt: string;
  isNew?: boolean;
  visible: boolean;
  sort: number;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface HomeContent {
  site: {
    title: string;
    brandCn: string;
    brandEn: string;
    nav: NavItem[];
  };
  hero: HeroContent;
  works: WorkItem[];
  photographers: Photographer[];
  news: NewsItem[];
  about: {
    title: string;
    subtitle: string;
    description: string;
    signature: string;
  };
  cta: {
    eyebrow: string;
    title: string;
    description: string;
    buttonLabel: string;
    stats: StatItem[];
  };
  footer: {
    links: NavItem[];
    copyright: string;
  };
}
