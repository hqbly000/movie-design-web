<script setup lang="ts">
/**
 * YearEmblem —— 年份组合（R5 改版 · 暗调描边方案）。
 *
 * 形态：单个 SVG `<text>`，金色渐变描边 + `stroke-dashoffset` 逐笔勾出动画；
 *       勾完淡入一层极淡金填充并起辉光。原「幽灵叠印」外圈已移除 ——
 *       前景本身就是金线，再套一层线只剩脏。
 * 尺寸：viewBox 按 300px 字号下字形**墨迹**（非字体行盒）裁切，见下方常量注释；
 *       桌面 176×240 / 移动 100×136，按数字位数等比加宽。
 * 文案：`SINCE {成立年}` 竖排（writing-mode: vertical-rl + text-orientation: mixed，
 *       拉丁侧倒自上而下，Han 在 mixed 下本就正立）。
 * 交互：展示年限 = 当前年 − 成立年（前端实时计算，不落库）；进入视口触发一次描边。
 */
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useInView } from '@/composables/useInView'
import { displayYears } from '@/utils/format'

const props = defineProps<{
  /** 成立年份 */
  foundedYear: number
}>()

/** 桌面断点（≥1024）。 */
const isDesktop = useMediaQuery('(min-width: 1024px)')

/** 展示年限（当前年 − 成立年）。 */
const years = computed(() => displayYears(props.foundedYear))

/** 右侧竖排沿用成立年份。 */
const sinceLabel = computed(() => `SINCE ${props.foundedYear}`)

/** 数字位数（1 位或 2 位）。 */
const digits = computed(() => String(years.value).length)

/**
 * 描边总长：300px 字号下单个数字轮廓周长约 1440（实测墨迹 159×234 反推），
 * 按位数线性放大。宁大勿小 —— 偏大只是结尾空转一小段，偏小则永远缺一截。
 * 带 px 单位：SVG 几何属性在 CSS 里接受无单位数字，但补上单位对 Safari 更稳。
 */
const dashLen = computed(() => `${digits.value * 1500}px`)

/**
 * viewBox 半宽：单个数字墨迹 159 + 左右各 8.5 描边余量 ≈ 176 全宽，即半宽 88。
 * 注意 SVG `getBBox()` 对 `<text>` 返回的是字体行盒（Noto Sans SC 约 1.45em = 434）
 * 而不是墨迹，直接按行盒裁会把数字切成两半，所以这里用实测墨迹值写死。
 */
const halfWidth = computed(() => digits.value * 88)
const viewBox = computed(() => `${-halfWidth.value} -234 ${halfWidth.value * 2} 240`)

/** SVG 盒子尺寸：与 viewBox 1:1，避免缩放把描边一起缩细。 */
const svgStyle = computed(() => ({
  width: `${digits.value * (isDesktop.value ? 176 : 100)}px`,
  height: `${isDesktop.value ? 240 : 136}px`
}))

/** 进入视口后才开始勾描，只触发一次。 */
const { target, isInView } = useInView({ threshold: 0.25 })
const drawn = ref(false)
watch(isInView, (visible) => {
  if (visible) drawn.value = true
})
</script>

<template>
  <div ref="target" class="year-emblem" :class="{ 'is-drawn': drawn }">
    <svg
      class="year-svg"
      :style="svgStyle"
      :viewBox="viewBox"
      role="img"
      :aria-label="`成立 ${years} 年`"
    >
      <defs>
        <linearGradient id="year-gold-stroke" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stop-color="#f7e6bd" />
          <stop offset="38%" stop-color="#e8c77a" />
          <stop offset="72%" stop-color="#c49a4a" />
          <stop offset="100%" stop-color="#8f6a2c" />
        </linearGradient>
      </defs>
      <!-- class 名 year-number 供 QA 脚本定位，勿随意改 -->
      <text
        class="year-number"
        x="0"
        y="0"
        text-anchor="middle"
        :style="{ '--dash-len': dashLen }"
        >{{ years }}</text
      >
    </svg>

    <div class="year-side">
      <span class="year-since">{{ sinceLabel }}</span>
      <span class="year-unit">年</span>
    </div>
  </div>
</template>

<style scoped>
.year-emblem {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.year-svg {
  display: block;
  overflow: visible;
}

.year-number {
  font-family: var(--font-sans);
  font-weight: 900;
  font-size: 300px;
  line-height: 1;
  fill: rgba(196, 154, 74, 0);
  stroke: url(#year-gold-stroke);
  stroke-width: 4; /* 移动端：viewBox 缩到 100/176，补粗抵消缩放 */
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: var(--dash-len);
  stroke-dashoffset: var(--dash-len);
  transition:
    stroke-dashoffset 4400ms cubic-bezier(0.33, 0.02, 0.2, 1) 900ms,
    fill 2000ms ease-out 5000ms,
    filter 2000ms ease-out 5000ms;
}

.is-drawn .year-number {
  stroke-dashoffset: 0;
  fill: rgba(196, 154, 74, 0.2);
  filter: drop-shadow(0 0 18px rgba(232, 199, 122, 0.28));
}

/* 竖排信息列：vertical-rl 下 flex-direction: row 才是自上而下 */
.year-side {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  display: inline-flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
}

.year-since {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 5px;
  color: var(--accent-gold-light);
  white-space: nowrap;
}

.year-unit {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 20px;
  line-height: 1;
  color: var(--ivory);
}

@media (min-width: 1024px) {
  .year-number {
    stroke-width: 2.2;
  }
  .is-drawn .year-number {
    fill: rgba(196, 154, 74, 0.13);
    filter: drop-shadow(0 0 26px rgba(232, 199, 122, 0.28));
  }
  .year-side {
    gap: 14px;
  }
  .year-since {
    font-size: 13px;
    letter-spacing: 6px;
  }
  .year-unit {
    font-size: 26px;
  }
}
</style>
