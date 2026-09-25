<script setup lang="ts">
/**
 * HonorPanel —— 荣誉卡（舞台圆柱用）。
 * 暖黑玻璃 + 金边 + 扫描线纹理；large 用于点击放大后的详情视图。
 *
 * 远近缩放由父级 HonorHall 逐帧写在 .slot 的 transform 上（scale + opacity + blur 三通道），
 * 卡体本身不感知远近。历史上曾一度改成「等大圆柱不缩放」，现已随舞台化方案恢复景深。
 * .mirror 是地面倒影（压扁 + 模糊 + 渐隐的卡体轮廓），.lit 是射灯受光面，
 * 两者都由父级 / 媒体查询驱动。
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
    <!-- 地面镜面倒影：压扁 + 模糊 + 渐隐遮罩的卡体轮廓（详情视图不需要） -->
    <div class="mirror" aria-hidden="true">
      <div class="inner" />
    </div>
    <div class="card-body">
      <!-- 受光面：由 HonorHall 的 .is-active 驱动，模拟射灯自上而下打在展板上 -->
      <span class="lit" aria-hidden="true" />
      <span class="badge">{{ honor.level }}</span>
      <h3 class="title">{{ honor.title }}</h3>
      <div class="divider" aria-hidden="true" />
      <p class="issuer">{{ honor.issuer }}</p>
      <p v-if="honor.description" class="desc">{{ honor.description }}</p>
    </div>
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

/* 受光面：默认隐藏，正对镜头的卡由父级 .is-active 点亮 */
.lit {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 500ms ease;
  background: linear-gradient(
    to bottom,
    rgba(255, 246, 218, 0.42) 0%,
    rgba(240, 217, 160, 0.2) 20%,
    rgba(196, 154, 74, 0.05) 48%,
    transparent 74%
  );
  mix-blend-mode: screen;
}

/* 地面镜面倒影：卡体轮廓压扁 0.52 倍 + 模糊 + 向下渐隐，
   比原来那条纯色渐变更像"反光地板上的像" */
.mirror {
  position: absolute;
  left: 0;
  top: 100%;
  width: 100%;
  height: 100%;
  opacity: 0.3;
  pointer-events: none;
}

.mirror .inner {
  height: 100%;
  width: 100%;
  transform: scaleY(-0.52);
  transform-origin: 50% 0%;
  filter: blur(3px);
  border: 1px solid rgba(196, 154, 74, 0.3);
  border-radius: 6px;
  background: linear-gradient(160deg, rgba(196, 154, 74, 0.14), #0d0b08);
  -webkit-mask-image: linear-gradient(180deg, #000, transparent 62%);
  mask-image: linear-gradient(180deg, #000, transparent 62%);
}

/* ===== 窄卡片档适配（舞台半径收窄时卡片同步变小，字号必须跟着收，否则内容被裁） ===== */
@media (max-width: 767px) {
  .card-body {
    padding: 12px 14px;
  }
  .badge {
    font-size: 9px;
    letter-spacing: 1px;
    padding: 2px 6px;
  }
  .title {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.3;
  }
  .divider {
    margin-top: 8px;
    width: 32px;
  }
  .issuer {
    margin-top: 6px;
    font-size: 9px;
    line-height: 1.4;
  }
  /* 窄卡片放不下描述行；详情视图（.large）不受影响 */
  :not(.large) .desc {
    display: none;
  }
}

@media (min-width: 768px) and (max-width: 1279px) {
  .card-body {
    padding: 16px 18px;
  }
  .badge {
    font-size: 11px;
  }
  .title {
    font-size: 18px;
  }
  .issuer {
    font-size: 10px;
  }
  .desc {
    font-size: 10px;
  }
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

/* 详情弹框里卡是浮层，不落地 → 去掉倒影，受光面常亮 */
.large .mirror {
  display: none;
}

.large .lit {
  opacity: 1;
}
</style>
