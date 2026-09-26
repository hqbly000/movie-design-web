<script setup lang="ts">
/**
 * CompanyIntro —— 公司介绍（R5 改版 · 暗调沉浸）。
 *
 * 原《设计方案》§2.3 的浅底 #F4F0E8 已废弃：首页亮度节奏为 黑→白→黑→黑→黑，
 * 米白平涂是全站唯一的亮色断层，且橙色数字与冷灰文字都不在暖金 token 集内。
 * 现改为 #0A0A0A 底 + 左上/右下两束金色漏光，与荣誉展厅的射灯同一套语言。
 * 桌面左文案右年份；移动端顺序：kicker → 标题 → 公司全称 → 正文 → 年份组合 → 按钮。
 * 橙色主按钮与跳转 #segments 按需求保持原样。
 */
import SectionKicker from '@/components/common/SectionKicker.vue'
import AppButton from '@/components/common/AppButton.vue'
import YearEmblem from '@/components/home/YearEmblem.vue'
import { scrollToId } from '@/utils/scroll'
import type { CompanyProfile } from '@/types/site'

defineProps<{
  /** 公司介绍数据 */
  profile: CompanyProfile | null
}>()
</script>

<template>
  <section id="about" class="about-section relative w-full overflow-hidden text-txt-primary">
    <div class="ly-container ly-section relative z-[2]">
      <div
        class="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-x-20"
      >
        <!-- 左栏文案：桌面占第 1 列，移动端为纵向堆叠的前半段 -->
        <div class="flex flex-col gap-[18px] lg:col-start-1 lg:row-start-1">
          <div v-reveal>
            <SectionKicker text="ABOUT · 关于我们" />
          </div>
          <h2
            v-reveal="80"
            class="font-serif text-[34px] leading-tight text-txt-primary lg:text-[44px]"
          >
            {{ profile?.section_title || '公司介绍' }}
          </h2>
          <span v-reveal="120" class="about-rule" aria-hidden="true" />
          <p
            v-reveal="160"
            class="font-sans text-[18px] font-medium tracking-[1px] text-ivory lg:text-[20px]"
          >
            {{ profile?.company_name || '交点影视' }}
          </p>
          <p
            v-reveal="240"
            class="max-w-[62ch] font-sans text-[17px] text-white/[0.85]"
            style="line-height: 32px"
          >
            {{ profile?.intro_text || '' }}
          </p>
        </div>

        <!-- 年份描边组合：桌面第 2 列跨两行居中，移动端落在正文与按钮之间 -->
        <div
          v-reveal="160"
          class="py-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center lg:justify-self-center lg:py-0"
        >
          <YearEmblem :founded-year="profile?.founded_year ?? 2017" />
        </div>

        <!-- 主按钮（金描边，全站唯一） -->
        <div v-reveal="320" class="pt-2 lg:col-start-1 lg:row-start-2">
          <AppButton variant="gold-outline" @click="scrollToId('segments')">
            探索详情
          </AppButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 区块底色 + 两束金色漏光：左上主光、右下回光，纯装饰不可交互 */
.about-section {
  background: var(--bg-base);
}

.about-section::before,
.about-section::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 1;
}

.about-section::before {
  top: -220px;
  left: -160px;
  width: 900px;
  height: 700px;
  background: radial-gradient(
    ellipse at center,
    rgba(196, 154, 74, 0.17),
    rgba(196, 154, 74, 0.06) 46%,
    transparent 72%
  );
  filter: blur(10px);
}

.about-section::after {
  right: -200px;
  bottom: -260px;
  width: 720px;
  height: 560px;
  background: radial-gradient(ellipse at center, rgba(232, 199, 122, 0.07), transparent 66%);
  filter: blur(14px);
}

/* 标题下的 44×1 金色短线，与首屏 kicker 的前置金线同源 */
.about-rule {
  display: block;
  width: 44px;
  height: 1px;
  background: var(--accent-gold);
  margin-top: 4px;
}

/* 区块下沿发丝线：向暗底区块收口，避免与荣誉区块硬切 */
.about-section > .ly-container::after {
  content: '';
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: calc(var(--section-y-mobile) * -0.45);
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(196, 154, 74, 0.28) 22%,
    rgba(196, 154, 74, 0.28) 78%,
    transparent
  );
}

@media (min-width: 1024px) {
  .about-rule {
    margin-top: 8px;
  }
  .about-section > .ly-container::after {
    left: var(--pad-x-desktop);
    right: var(--pad-x-desktop);
    bottom: calc(var(--section-y-desktop) * -0.45);
  }
}
</style>
