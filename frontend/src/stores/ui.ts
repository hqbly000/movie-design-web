/**
 * 全局 UI 状态 Store（architecture.md §5.1）。
 * 移动菜单 / 全屏二级页（板块详情 / 公司详情）开关；派生 body 滚动锁状态。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', () => {
  /** 移动端全屏菜单是否展开。 */
  const mobileMenuOpen = ref(false)
  /** 全屏视频作品页是否打开。 */
  const worksOpen = ref(false)
  /** 当前打开作品页的板块 id。 */
  const activeSegmentId = ref<number | null>(null)
  /** 作品页进入过渡用的预览图（点击板块时记录，实现放大过渡）。 */
  const transitionImage = ref<string>('')
  /** 公司详情遮罩是否打开。 */
  const companyOpen = ref(false)

  /** 任一全屏层打开时需锁定 body 滚动。 */
  const isScrollLocked = computed(
    () => mobileMenuOpen.value || worksOpen.value || companyOpen.value
  )

  function openMobileMenu(): void {
    mobileMenuOpen.value = true
  }

  function closeMobileMenu(): void {
    mobileMenuOpen.value = false
  }

  function toggleMobileMenu(): void {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }

  /**
   * 打开全屏作品页。
   * @param segmentId 板块 id
   * @param previewImage 板块预览图（用于放大过渡）
   */
  function openWorks(segmentId: number, previewImage = ''): void {
    activeSegmentId.value = segmentId
    transitionImage.value = previewImage
    worksOpen.value = true
  }

  function closeWorks(): void {
    worksOpen.value = false
  }

  /** 打开公司详情遮罩。 */
  function openCompany(): void {
    companyOpen.value = true
  }

  function closeCompany(): void {
    companyOpen.value = false
  }

  return {
    mobileMenuOpen,
    worksOpen,
    activeSegmentId,
    transitionImage,
    companyOpen,
    isScrollLocked,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu,
    openWorks,
    closeWorks,
    openCompany,
    closeCompany
  }
})

export default useUiStore
