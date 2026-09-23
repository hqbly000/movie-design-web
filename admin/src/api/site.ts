import { request } from '@/api/request'
import type { CompanyProfile, CompanyProfileIn, HeroSlide, HeroSlideIn } from '@/types/models'

/** GET /api/admin/hero-slides（恰好 3 条） */
export function getHeroSlides(): Promise<HeroSlide[]> {
  return request.get<HeroSlide[]>('/api/admin/hero-slides')
}

/** PUT /api/admin/hero-slides（批量保存，长度≠3 → 3002） */
export function saveHeroSlides(slides: HeroSlideIn[]): Promise<HeroSlide[]> {
  return request.put<HeroSlide[]>('/api/admin/hero-slides', { slides })
}

/** GET /api/admin/company-profile */
export function getCompanyProfile(): Promise<CompanyProfile> {
  return request.get<CompanyProfile>('/api/admin/company-profile')
}

/** PUT /api/admin/company-profile */
export function saveCompanyProfile(body: CompanyProfileIn): Promise<CompanyProfile> {
  return request.put<CompanyProfile>('/api/admin/company-profile', body)
}
