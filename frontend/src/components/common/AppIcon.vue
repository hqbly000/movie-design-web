<script setup lang="ts">
/**
 * AppIcon —— 线性 SVG 图标集（architecture.md §5.1）。
 * 业务板块图标 / 联系图标 / 播放器控件 / UI 图标统一由此渲染。
 * 纯内联路径，无外部依赖、无 CDN。
 */
import { computed } from 'vue'

interface IconPath {
  /** SVG path d。 */
  d: string
  /** 是否填充（默认描边）。 */
  fill?: boolean
}

const props = withDefaults(
  defineProps<{
    /** 图标名 */
    name: string
    /** 尺寸（px） */
    size?: number
    /** 描边宽度 */
    strokeWidth?: number
  }>(),
  { size: 24, strokeWidth: 1.6 }
)

/** 图标路径表。圆圈以两段弧的 path 表达，避免混用图元。 */
const ICONS: Record<string, IconPath[]> = {
  // 光圈 logo（同心圆）
  aperture: [
    { d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' },
    { d: 'M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0' },
    { d: 'M10.4 12a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0', fill: true }
  ],
  // 人像写真
  portrait: [
    { d: 'M8.6 8a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0' },
    { d: 'M5.5 19.5c1.2-3.6 3.7-5.4 6.5-5.4s5.3 1.8 6.5 5.4' }
  ],
  // 婚礼纪实（对戒）
  wedding: [
    { d: 'M4.8 14a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0 -8.4 0' },
    { d: 'M10.8 14a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0 -8.4 0' },
    { d: 'M12 3.2l2 2.6h-4z', fill: true }
  ],
  // 商业摄影（相机）
  commercial: [
    { d: 'M3 8h18v11a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2-2z' },
    { d: 'M8 8l1.4-2.6h5.2l1.4 2.6' },
    { d: 'M8.4 13.6a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0' }
  ],
  // 活动跟拍（舞台灯光）
  event: [
    { d: 'M8.4 8a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0' },
    { d: 'M12 11.6l-4.5 8.4M12 11.6l4.5 8.4M7.6 20.5h8.8' }
  ],
  // 视频短片（场记板）
  video: [
    { d: 'M3 8.5h18v10.5a1.5 1.5 0 0 1 -1.5 1.5h-15a1.5 1.5 0 0 1 -1.5-1.5z' },
    { d: 'M3 8.5h18M6 4.8l1.8 3.7M11 4.8l1.8 3.7M16 4.8l1.8 3.7' },
    { d: 'M10.5 13l4.5 2.6-4.5 2.6z', fill: true }
  ],
  // 地址
  location: [
    { d: 'M12 21.5c0 0 6.5-5.7 6.5-10.5a6.5 6.5 0 1 0 -13 0c0 4.8 6.5 10.5 6.5 10.5z' },
    { d: 'M9.6 10.6a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0' }
  ],
  // 电话
  phone: [
    {
      d: 'M6.4 3.4h3.4l1.5 4.1-2.1 1.5a12.5 12.5 0 0 0 5.8 5.8l1.5-2.1 4.1 1.5v3.4a2 2 0 0 1 -2.1 2A16.6 16.6 0 0 1 4.4 5.5a2 2 0 0 1 2-2.1z'
    }
  ],
  // 邮箱
  mail: [
    { d: 'M3 6h18v12a1.6 1.6 0 0 1 -1.6 1.6h-14.8a1.6 1.6 0 0 1 -1.6-1.6z' },
    { d: 'M3.4 7l8.6 6 8.6-6' }
  ],
  // 工作时间
  clock: [
    { d: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0' },
    { d: 'M12 7.4V12l3.2 2' }
  ],
  // 汉堡
  menu: [{ d: 'M3.5 6.5h17M3.5 12h17M3.5 17.5h17' }],
  // 关闭
  close: [{ d: 'M6 6l12 12M18 6l-12 12' }],
  // 播放（实心三角）
  play: [{ d: 'M7.5 4.8l11 7.2-11 7.2z', fill: true }],
  // 暂停
  pause: [{ d: 'M8.5 5v14M15.5 5v14' }],
  // 音量
  volume: [
    { d: 'M4 9h3l4-4v14l-4-4H4z' },
    { d: 'M15.5 9a4 4 0 0 1 0 6M18.2 6.8a7.5 7.5 0 0 1 0 10.4' }
  ],
  // 全屏
  fullscreen: [{ d: 'M4.5 9.5V4.5h5M19.5 9.5V4.5h-5M4.5 14.5v5h5M19.5 14.5v5h-5' }],
  // 左箭头
  'arrow-left': [{ d: 'M14.5 5.5l-6.5 6.5 6.5 6.5' }],
  // 右箭头
  'arrow-right': [{ d: 'M9.5 5.5l6.5 6.5-6.5 6.5' }],
  // 右向折角
  'chevron-right': [{ d: 'M9.5 6l6 6-6 6' }],
  // 旋转
  rotate: [
    { d: 'M19.5 11.2a7.7 7.7 0 1 0 -2.2 5.5' },
    { d: 'M19.5 5.5v5.7h-5.7' }
  ]
}

const paths = computed<IconPath[]>(() => ICONS[props.name] ?? ICONS.aperture)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <path
      v-for="(p, index) in paths"
      :key="index"
      :d="p.d"
      :fill="p.fill ? 'currentColor' : 'none'"
      :stroke="p.fill ? 'none' : 'currentColor'"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
