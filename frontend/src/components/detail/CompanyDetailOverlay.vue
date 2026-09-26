<script setup lang="ts">
/**
 * CompanyDetailOverlay —— 公司详情遮罩（公司介绍「探索详情」入口）。
 * 统计条全部由 /site 数据派生（年限 / video_count / 板块数 / 荣誉数，0 新字段）；
 * 长文 long_intro 按需拉取（不进 /site 聚合缓存）。
 */
import { computed, ref, watch } from 'vue'
import DetailOverlay from '@/components/detail/DetailOverlay.vue'
import ArticleBody from '@/components/detail/ArticleBody.vue'
import SectionKicker from '@/components/common/SectionKicker.vue'
import AppButton from '@/components/common/AppButton.vue'
import { displayYears } from '@/utils/format'
import { scrollToId } from '@/utils/scroll'
import { useSiteStore } from '@/stores/site'
import { useUiStore } from '@/stores/ui'

const site = useSiteStore()
const ui = useUiStore()

const longIntro = ref<string | null>(null)
const loading = ref(false)

async function load(): Promise<void> {
  loading.value = true
  try {
    const detail = await site.loadCompanyDetail()
    longIntro.value = detail.long_intro
  } finally {
    loading.value = false
  }
}

watch(
  () => ui.companyOpen,
  (open) => {
    if (open) void load()
  },
  { immediate: true }
)

const profile = computed(() => site.companyProfile)

/** 派生统计条（0 新字段）。 */
const stats = computed(() => {
  const founded = profile.value?.founded_year ?? 2017
  return [
    { value: displayYears(founded), unit: '年', label: `自 ${founded} 年深耕影像` },
    { value: site.config.video_count, unit: '部', label: '在架影像作品' },
    { value: site.segments.length, unit: '类', label: '业务板块' },
    { value: site.honors.length, unit: '项', label: '影视荣誉' }
  ]
})

/** CTA：关闭遮罩并滚到首页联系区块。 */
function goContact(): void {
  ui.closeCompany()
  scrollToId('contact')
}
</script>

<template>
  <DetailOverlay
    :open="ui.companyOpen"
    kicker="ABOUT · 关于我们"
    :title="profile?.company_name ?? '交点影视'"
    caption="JIAO DIAN FILM AND TELEVISION"
    meta="公司详情"
    dialog-label="关于我们 · 公司详情"
    @close="ui.closeCompany()"
  >
    <!-- 引言（首页摘要同源） -->
    <p class="font-sans text-[17px] leading-[1.95] text-white/85">
      {{ profile?.intro_text }}
    </p>

    <!-- 派生统计条 -->
    <dl class="mt-11 grid grid-cols-2 gap-px border-y border-border-hairline bg-border-hairline lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="bg-[#050505] px-5 py-6 lg:px-7">
        <dt>
          <b class="font-latin text-[34px] font-normal leading-none text-accent-gold lg:text-[46px]">
            {{ stat.value }}
          </b>
          <i class="ml-1 not-italic font-sans text-[14px] text-hl-gold">{{ stat.unit }}</i>
        </dt>
        <dd class="mt-2.5 font-sans text-[12px] text-white/45" style="letter-spacing: 2px">
          {{ stat.label }}
        </dd>
      </div>
    </dl>

    <!-- 长文 -->
    <section class="mt-16">
      <div class="mb-6 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h3 class="font-serif text-[24px] font-medium tracking-[2px] text-txt-primary">
          我们的故事
        </h3>
      </div>
      <p v-if="loading && !longIntro" class="font-sans text-[13px] text-white/50">加载中…</p>
      <p v-else-if="!longIntro" class="font-sans text-[13px] text-white/50">内容准备中</p>
      <ArticleBody v-else :body="longIntro" />
    </section>

    <!-- CTA -->
    <div
      class="mt-[72px] flex flex-col gap-8 border-t border-border-hairline pb-2 pt-11 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <SectionKicker text="BOOKING · 预约拍摄" />
        <h3 class="mt-3 font-serif text-[24px] font-medium tracking-[2px] text-txt-primary">
          聊聊你想留住的那一面
        </h3>
        <p class="mt-2.5 max-w-[52ch] font-sans text-[13px] leading-[1.8] text-white/55">
          留下电话，我们会在 24 小时内由主摄影本人回复，不经客服转手。
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-7">
        <div>
          <b class="block font-latin text-[24px] font-normal tracking-[1px] text-ivory">
            {{ site.siteSettings.phone || '—' }}
          </b>
          <i class="not-italic font-sans text-[11px] text-white/45">
            {{ site.siteSettings.work_hours || '' }}
          </i>
        </div>
        <AppButton variant="gold-outline" @click="goContact">预约拍摄</AppButton>
      </div>
    </div>
  </DetailOverlay>
</template>
