/**
 * 站点聚合配置 Store（architecture.md §5.1 / §6.7）。
 * - 一次拉取首页配置，60s 内复用；
 * - 接口失败时保留兜底数据，页面不白屏；
 * - 板块作品按需拉取并缓存。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCompanyDetail, getSegmentContent, getSiteConfig } from '@/api/public'
import { FALLBACK_COMPANY_DETAIL, FALLBACK_SITE, fallbackSegmentContent } from '@/api/fallback'
import type { CompanyDetail, Segment, SegmentContent, SiteConfig, SiteSettings } from '@/types/site'

/** 缓存有效时长（毫秒）。 */
const CACHE_TTL = 60_000

export const useSiteStore = defineStore('site', () => {
  /** 全站聚合配置（初始为兜底数据）。 */
  const config = ref<SiteConfig>(FALLBACK_SITE)
  /** 是否正在加载。 */
  const loading = ref(false)
  /** 最近一次错误信息。 */
  const error = ref<string | null>(null)
  /** 最近一次成功加载时间戳。 */
  const loadedAt = ref(0)
  /** 是否仍在使用兜底数据。 */
  const usingFallback = ref(true)

  /** 板块详情内容缓存（模块级共用一次会话）。 */
  const segmentContentCache = new Map<number, SegmentContent>()
  /** 公司详情长文（null = 尚未拉取）。 */
  const companyDetail = ref<CompanyDetail | null>(null)

  const heroSlides = computed(() => config.value.hero_slides)
  const companyProfile = computed(() => config.value.company_profile)
  const segments = computed<Segment[]>(() => config.value.segments)
  /** 荣誉展厅最多 6 条（R7）。 */
  const honors = computed(() => config.value.honors.slice(0, 6))
  const siteSettings = computed<SiteSettings>(() => config.value.site_settings)

  /**
   * 加载首页聚合配置。
   * @param force 强制刷新（忽略 60s 缓存）
   */
  async function loadSite(force = false): Promise<void> {
    const isFresh = loadedAt.value > 0 && Date.now() - loadedAt.value < CACHE_TTL
    if (!force && isFresh) return

    loading.value = true
    error.value = null
    try {
      const data = await getSiteConfig()
      config.value = data
      usingFallback.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '站点配置加载失败'
      // 保留兜底数据，保证页面可渲染
    } finally {
      loadedAt.value = Date.now()
      loading.value = false
    }
  }

  /**
   * 加载某板块详情内容（带缓存，失败回退占位数据）。
   * @param segment 板块对象
   */
  async function loadSegmentContent(segment: Segment): Promise<SegmentContent> {
    const cached = segmentContentCache.get(segment.id)
    if (cached) return cached

    try {
      const data = await getSegmentContent(segment.id)
      segmentContentCache.set(segment.id, data)
      return data
    } catch {
      return fallbackSegmentContent(segment.id, segment.name, segment.content_type)
    }
  }

  /**
   * 加载公司详情长文（会话内缓存，失败回退兜底文案）。
   * @param force 强制刷新
   */
  async function loadCompanyDetail(force = false): Promise<CompanyDetail> {
    if (!force && companyDetail.value) return companyDetail.value
    try {
      companyDetail.value = await getCompanyDetail()
    } catch {
      companyDetail.value = FALLBACK_COMPANY_DETAIL
    }
    return companyDetail.value
  }

  return {
    config,
    loading,
    error,
    usingFallback,
    heroSlides,
    companyProfile,
    segments,
    honors,
    siteSettings,
    loadSite,
    loadSegmentContent,
    loadCompanyDetail
  }
})

export default useSiteStore
