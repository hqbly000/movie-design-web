<script setup lang="ts">
/**
 * HomeView —— 官网首页（§2 单页长滚动）。
 * 区块顺序：Header → 首屏轮播 → 公司介绍 → 荣誉展示 → 业务板块 → 联系我们 → 页脚。
 * （影像墙 PhotoWall 暂时下线：恢复时取消下方两处注释即可）
 */
import { onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import HeroCarousel from '@/components/home/HeroCarousel.vue'
import CompanyIntro from '@/components/home/CompanyIntro.vue'
import HonorHall from '@/components/home/HonorHall.vue'
import Segments from '@/components/home/Segments.vue'
// import PhotoWall from '@/components/home/PhotoWall.vue'
import ContactSection from '@/components/home/ContactSection.vue'
import VideoWorksOverlay from '@/components/home/VideoWorksOverlay.vue'
import { useSiteStore } from '@/stores/site'

const site = useSiteStore()

onMounted(() => {
  // 拉取聚合配置；失败时 store 保留兜底数据，页面不白屏
  void site.loadSite()
})
</script>

<template>
  <DefaultLayout>
    <HeroCarousel :slides="site.heroSlides" />
    <CompanyIntro :profile="site.companyProfile" />
    <HonorHall :honors="site.honors" />
    <Segments :segments="site.segments" />
    <!-- <PhotoWall /> -->
    <ContactSection :settings="site.siteSettings" />

    <!-- 全屏视频作品页（Teleport 到 body） -->
    <VideoWorksOverlay />
  </DefaultLayout>
</template>
