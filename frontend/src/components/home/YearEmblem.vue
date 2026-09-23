<script setup lang="ts">
/**
 * YearEmblem —— 年份组合（R5 / §6.3）。
 * 双层叠印：描边幽灵数字（前景 ×1.45，纯装饰）+ 实心橙数字（208/130）。
 * 行高恒为 1.0（禁止压行高）；两层视觉同心；右侧 SINCE 列与数字底部对齐。
 * 展示年限 = 当前年 − 成立年（前端实时计算），进入视口 1→N 滚动计数（700ms）。
 */
import { computed, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import GhostNumber from '@/components/common/GhostNumber.vue'
import { useCountUp } from '@/composables/useCountUp'
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

/** 前景数字字号：桌面 208 / 移动 130。 */
const foregroundSize = computed(() => (isDesktop.value ? 208 : 130))
/** 幽灵数字字号 = 前景 × 1.45：桌面 301.6 / 移动 188.5。 */
const ghostSize = computed(() => Math.round(foregroundSize.value * 1.45))

/** 计数动画。 */
const { value: counted, start } = useCountUp(() => years.value, 700)

/** 进入视口触发一次计数。 */
const { target, isInView } = useInView({ threshold: 0.25 })
watch(isInView, (visible) => {
  if (visible) start()
})
watch(years, () => start())

/** 右侧列沿用成立年份。 */
const sinceLabel = computed(() => `SINCE ${props.foundedYear}`)
</script>

<template>
  <div ref="target" class="flex items-end gap-3 lg:gap-5">
    <!-- 双层叠印数字 -->
    <div class="relative inline-flex items-center justify-center" style="line-height: 1">
      <GhostNumber
        :value="counted"
        :size="ghostSize"
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />
      <span
        class="relative font-sans font-black text-accent-orange"
        :style="{ fontSize: `${foregroundSize}px`, lineHeight: 1 }"
        >{{ counted }}</span
      >
    </div>

    <!-- 右侧信息列（与数字底部对齐） -->
    <div class="flex flex-col justify-end pb-1 lg:pb-2">
      <span
        class="font-sans font-semibold text-muted-since"
        :style="{ fontSize: isDesktop ? '14px' : '12px', letterSpacing: '3px' }"
        >{{ sinceLabel }}</span
      >
      <span
        class="font-sans font-bold text-[#1F2329]"
        :style="{ fontSize: isDesktop ? '30px' : '20px', lineHeight: 1.2 }"
        >年</span
      >
    </div>
  </div>
</template>
