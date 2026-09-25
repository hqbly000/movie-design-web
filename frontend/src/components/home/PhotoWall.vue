<script setup lang="ts">
/**
 * PhotoWall —— 影像墙（联系我们上方，纯视觉装饰）。
 * 三列（移动）/ 五列（桌面）速度梯度无限循环，中列（桌面第 2、4 列）反向，
 * 形成纵深视差；每列内容渲染两份（A+A），translateY(-50%) 即为无缝循环。
 * 硬约束：墙面 pointer-events-none，不拦截页面滚动与任何手势。
 * 占位策略：金编号 + surface 底；接入真实作品图时传 images（url 列表 ≥1 即生效）。
 */
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import SectionKicker from '@/components/common/SectionKicker.vue'

const props = withDefaults(
  defineProps<{
    /** 作品图 url 列表（可选；为空则用占位 tile） */
    images?: string[]
  }>(),
  { images: () => [] }
)

const isDesktop = useMediaQuery('(min-width: 1024px)')

/** masonry 节奏：8 档高度循环（px）。 */
const HEIGHTS = [220, 264, 200, 240, 210, 252, 196, 232]

interface ColConfig {
  /** 循环时长（s），越小越快 */
  dur: number
  /** 是否反向 */
  rev: boolean
}

/** 双端布局参数：PC 5 列 × 12 张（两条反向列），移动 3 列 × 20 张。 */
const config = computed<{ per: number; cols: ColConfig[] }>(() =>
  isDesktop.value
    ? {
        per: 12,
        cols: [
          { dur: 36, rev: false },
          { dur: 28, rev: true },
          { dur: 44, rev: false },
          { dur: 32, rev: true },
          { dur: 40, rev: false }
        ]
      }
    : {
        per: 20,
        cols: [
          { dur: 60, rev: false },
          { dur: 45, rev: true },
          { dur: 75, rev: false }
        ]
      }
)

interface TileItem {
  /** 全局编号 1..60 */
  n: number
  /** 占位高度（px） */
  h: number
  /** 图片 url（无图时为空） */
  src?: string
}

const columns = computed<TileItem[][]>(() => {
  const { per, cols } = config.value
  return cols.map((_, ci) =>
    Array.from({ length: per }, (_, i): TileItem => {
      const n = ci * per + i + 1
      return {
        n,
        h: HEIGHTS[(ci * 3 + i) % HEIGHTS.length],
        src: props.images.length ? props.images[(n - 1) % props.images.length] : undefined
      }
    })
  )
})
</script>

<template>
  <section id="gallery" class="relative w-full bg-[#0A0A0A]">
    <div class="ly-container" style="padding-top: 0; padding-bottom: var(--section-y-mobile)">
      <div v-reveal class="flex flex-col items-center text-center">
        <SectionKicker text="GALLERY · 影像墙" />
        <h2 class="mt-4 font-serif text-[30px] leading-tight text-txt-primary lg:text-[40px]">
          光影之间，皆是故事
        </h2>
      </div>

      <!-- 影像墙：纯视觉，手势穿透 -->
      <div
        v-reveal="120"
        class="pointer-events-none mt-10 overflow-hidden rounded-modal border border-border-card bg-surface lg:mt-14"
        :style="{ height: isDesktop ? '560px' : '480px' }"
        aria-hidden="true"
      >
        <div class="flex h-full gap-3 p-3">
          <div v-for="(col, ci) in columns" :key="ci" class="pw-col flex-1 overflow-hidden rounded-ctrl">
            <div
              class="pw-track flex flex-col gap-3"
              :class="{ 'pw-rev': config.cols[ci].rev }"
              :style="{ '--dur': `${config.cols[ci].dur}s` }"
            >
              <!-- 内容渲染两份，位移 -50% 无缝循环 -->
              <template v-for="rep in 2" :key="rep">
                <div
                  v-for="tile in col"
                  :key="`${rep}-${tile.n}`"
                  class="pw-tile relative flex-none overflow-hidden rounded-ctrl bg-[#1B1813]"
                  :style="{ height: `${tile.h}px` }"
                >
                  <img
                    v-if="tile.src"
                    :src="tile.src"
                    :alt="`作品 ${tile.n}`"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    v-else
                    class="absolute inset-0 flex items-center justify-center font-latin text-[15px] text-accent-gold/40"
                  >
                    {{ String(tile.n).padStart(2, '0') }}
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 无缝循环：只动 transform；A+A 结构下 -50% 恰为一份内容高度 */
@keyframes pw-up {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}
@keyframes pw-down {
  from {
    transform: translateY(-50%);
  }
  to {
    transform: translateY(0);
  }
}

.pw-track {
  animation: pw-up var(--dur, 60s) linear infinite;
  will-change: transform;
}
.pw-track.pw-rev {
  animation-name: pw-down;
}

/* 降级：系统开启减少动态效果时静止展示（全局规则已兜底，此处显式声明意图） */
@media (prefers-reduced-motion: reduce) {
  .pw-track {
    animation: none;
  }
}
</style>
