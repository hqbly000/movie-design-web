<script setup lang="ts">
/**
 * SiteFooter —— 页脚（R12 / §2.8）。
 * 上行：logo + 品牌名 / 五个导航链接；
 * 下行：版权（左）+ 备案信息（右，取自 site_settings）；
 * 移动端版权与备案分两行。
 */
import { computed } from 'vue'
import { useSiteStore } from '@/stores/site'
import { FOOTER_NAV_ITEMS, scrollToId } from '@/utils/scroll'

const site = useSiteStore()

/** 版权文案（优先取后端配置）。 */
const copyright = computed(
  () =>
    site.siteSettings.copyright ??
    'Copyright 2026 交点影视 版权所有'
)

/** 备案信息拼接（ICP + 公安备案）。 */
const filing = computed(() => {
  const parts = [site.siteSettings.icp_no, site.siteSettings.police_no].filter(
    (part): part is string => Boolean(part)
  )
  return parts.join(' · ')
})
</script>

<template>
  <footer class="border-t border-border-hairline bg-[#0A0A0A]">
    <div class="ly-container py-10 lg:py-12">
      <!-- 上行 -->
      <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          class="flex items-center"
          aria-label="回到顶部"
          @click="scrollToId('hero')"
        >
          <img
            src="/images/logo-on-dark.png"
            alt="交点影视"
            class="h-7 w-auto"
            width="1200"
            height="259"
          />
        </button>

        <nav class="flex flex-wrap gap-x-7 gap-y-3" aria-label="页脚导航">
          <button
            v-for="item in FOOTER_NAV_ITEMS"
            :key="item.target"
            type="button"
            class="text-[14px] text-white/60 transition-colors hover:text-white"
            @click="scrollToId(item.target)"
          >
            {{ item.label }}
          </button>
        </nav>
      </div>

      <div class="my-7 h-px w-full bg-border-hairline" />

      <!-- 下行：桌面左右 / 移动分两行 -->
      <div
        class="flex flex-col gap-2 text-[13px] leading-6 text-white/40 lg:flex-row lg:items-center lg:justify-between"
      >
        <p>{{ copyright }}</p>
        <p v-if="filing" class="lg:text-right">{{ filing }}</p>
      </div>
    </div>
  </footer>
</template>
