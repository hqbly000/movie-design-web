<script setup lang="ts">
/**
 * CompanyIntro —— 公司介绍（R5 / §2.3）。
 * 浅底 #F4F0E8；左栏文案 + 主按钮（全站唯一橙色按钮），右栏年份双层叠印。
 * 移动端顺序：kicker → 标题 → 公司全称 → 正文 → 年份组合 → 按钮。
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
  <section id="about" class="w-full bg-light-section text-[#1A1A1A]">
    <div class="ly-container ly-section">
      <div
        class="flex flex-col gap-[18px] lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-20 lg:gap-y-4"
      >
        <!-- 左栏 -->
        <div v-reveal class="lg:col-start-1">
          <SectionKicker text="ABOUT · 关于我们" />
        </div>
        <h2
          v-reveal="80"
          class="font-serif text-[34px] leading-tight text-[#1A1A1A] lg:col-start-1 lg:text-[44px]"
        >
          {{ profile?.section_title || '公司介绍' }}
        </h2>
        <p
          v-reveal="160"
          class="font-sans text-[18px] font-medium text-[#1F2329] lg:col-start-1 lg:text-[20px]"
        >
          {{ profile?.company_name || '光屿影像文化传媒有限公司' }}
        </p>
        <p
          v-reveal="240"
          class="font-sans text-[17px] text-[rgba(26,26,26,0.6)] lg:col-start-1"
          style="line-height: 32px"
        >
          {{ profile?.intro_text || '' }}
        </p>

        <!-- 年份组合：移动端位于正文与按钮之间，桌面右栏居中 -->
        <div
          v-reveal="160"
          class="py-6 lg:col-start-2 lg:row-span-6 lg:row-start-1 lg:self-center lg:py-0"
        >
          <YearEmblem :founded-year="profile?.founded_year ?? 2017" />
        </div>

        <!-- 主按钮（扁平橙，全站唯一） -->
        <div v-reveal="320" class="pt-2 lg:col-start-1">
          <AppButton variant="orange" @click="scrollToId('segments')">
            探索详情
          </AppButton>
        </div>
      </div>
    </div>
  </section>
</template>
