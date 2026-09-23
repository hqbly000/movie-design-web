<script setup lang="ts">
/**
 * ShareFooter —— 分享页品牌页脚（§3.2-6）。
 * logo + 标语「以光影，铭记时光」+ 联系方式 + 版权与备案（两行）。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useSiteStore } from '@/stores/site'

const site = useSiteStore()

const slogan = computed(() => site.siteSettings.brand_slogan ?? '以光影，铭记时光')

const copyright = computed(
  () => site.siteSettings.copyright ?? 'Copyright 2026 光屿影像文化传媒有限公司 版权所有'
)

const filing = computed(() =>
  [site.siteSettings.icp_no, site.siteSettings.police_no]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
)

const contactLine = computed(() =>
  [site.siteSettings.phone, site.siteSettings.email]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
)
</script>

<template>
  <footer class="mt-14 border-t border-border-hairline bg-[#0A0A0A]">
    <div class="mx-auto w-full max-w-[520px] px-6 py-8">
      <div class="flex items-center gap-3">
        <AppIcon name="aperture" :size="22" class="text-accent-gold" />
        <span
          class="font-serif text-[16px] font-semibold text-txt-primary"
          style="letter-spacing: 5px"
          >光屿摄影</span
        >
      </div>
      <p class="mt-3 font-sans text-[13px] text-white/70">{{ slogan }}</p>
      <p v-if="contactLine" class="mt-2 font-sans text-[12px] text-white/50">{{
        contactLine
      }}</p>

      <div class="mt-5 flex flex-col gap-1 border-t border-border-hairline pt-5">
        <p class="font-sans text-[11px] leading-5 text-white/40">{{ copyright }}</p>
        <p v-if="filing" class="font-sans text-[11px] leading-5 text-white/40">{{ filing }}</p>
      </div>
    </div>
  </footer>
</template>
