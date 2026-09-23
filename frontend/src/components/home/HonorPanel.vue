<script setup lang="ts">
/**
 * HonorPanel —— 全息荣誉卡（圆柱陈列用，等大统一形态）。
 * 玻璃质感 + 金色描边 + 扫描线纹理；large 用于点击放大后的详情视图。
 * （原"main/side/narrow 三档景深展板"已按新方案废弃：新方案为等大圆柱，不再按远近缩放。）
 */
import { computed } from 'vue'
import type { Honor } from '@/types/site'

const props = withDefaults(
  defineProps<{
    /** 荣誉数据 */
    honor: Honor
    /** 详情视图（点击放大后） */
    large?: boolean
  }>(),
  { large: false }
)

const rootClass = computed(() => ({ large: props.large }))
</script>

<template>
  <div class="holo-card" :class="rootClass">
    <div class="card-body">
      <span class="badge">{{ honor.level }}</span>
      <h3 class="title">{{ honor.title }}</h3>
      <div class="divider" aria-hidden="true" />
      <p class="issuer">{{ honor.issuer }}</p>
      <p v-if="honor.description" class="desc">{{ honor.description }}</p>
    </div>
    <!-- 卡片自身的地面反射（叠加在舞台底部光晕之上） -->
    <div class="reflection" aria-hidden="true" />
  </div>
</template>

<style scoped>
.holo-card {
  position: relative;
  height: 100%;
  width: 100%;
}

/* 全息卡体：暖黑玻璃 + 金边 + 内透光 */
.card-body {
  position: relative;
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(196, 154, 74, 0.42);
  border-radius: 6px;
  background:
    linear-gradient(160deg, rgba(196, 154, 74, 0.16), rgba(196, 154, 74, 0.02) 45%, rgba(255, 255, 255, 0.03)),
    #0d0b08;
  padding: 20px 22px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow:
    0 0 60px rgba(240, 217, 120, 0.14),
    inset 0 0 46px rgba(196, 154, 74, 0.07);
}

/* 扫描线：全息质感 */
.card-body::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.035) 0 1px,
    transparent 1px 4px
  );
  mix-blend-mode: screen;
}

.badge {
  align-self: flex-start;
  border: 1px solid rgba(196, 154, 74, 0.5);
  border-radius: 2px;
  background: rgba(196, 154, 74, 0.16);
  color: #e8c77a;
  font-size: 12px;
  letter-spacing: 2px;
  padding: 3px 10px;
  white-space: nowrap;
}

.title {
  margin-top: 14px;
  color: #fafafa;
  font-family: var(--font-serif);
  font-size: 22px;
  line-height: 1.35;
}

.divider {
  margin-top: 12px;
  height: 1px;
  width: 56px;
  background: linear-gradient(90deg, rgba(196, 154, 74, 0.9), rgba(196, 154, 74, 0));
}

.issuer {
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.desc {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  line-height: 1.7;
}

/* 地面反射：卡片下缘的金色渐变倒影 */
.reflection {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 100%;
  height: 46%;
  background: linear-gradient(180deg, rgba(196, 154, 74, 0.2), rgba(196, 154, 74, 0));
  filter: blur(3px);
  pointer-events: none;
}

/* ===== 详情视图（点击放大） ===== */
.large .card-body {
  border-color: rgba(232, 199, 122, 0.55);
  border-radius: 8px;
  padding: 34px 38px;
  box-shadow:
    0 0 120px rgba(240, 217, 120, 0.22),
    inset 0 0 70px rgba(196, 154, 74, 0.08);
}

.large .badge {
  font-size: 13px;
  padding: 4px 12px;
}

.large .title {
  margin-top: 18px;
  font-size: 32px;
}

.large .divider {
  margin-top: 16px;
  width: 76px;
}

.large .issuer {
  margin-top: 14px;
  font-size: 14px;
}

.large .desc {
  margin-top: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.62);
}
</style>
