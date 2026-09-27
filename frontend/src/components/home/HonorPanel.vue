<script setup lang="ts">
/**
 * HonorPanel —— 荣誉展签卡（HonorHall 舞台 + 详情视图共用）。
 * 参考 honor-demo v2 的展签设计：
 *   - 左上斜绶带 = 奖级（honor.level）
 *   - 右上旋转印章 = 年份（从 issuer 中提取四位年份，取不到则只显示「荣誉」）
 *   - 右下幽灵字 = 题名首个有效字符
 * 暖黑玻璃 + 金边 + 扫描线纹理；large 用于点击放大后的详情视图。
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

/** 印章年份：issuer 开头的四位数字（如「2023 全国人像摄影双年展」）。 */
const year = computed(() => props.honor.issuer.match(/\d{4}/)?.[0] ?? '')

/** 幽灵字：题名首个中文字符（跳过书名号等标点）。 */
const ghostChar = computed(() => props.honor.title.match(/[\u4e00-\u9fa5A-Za-z0-9]/)?.[0] ?? '')
</script>

<template>
  <div class="holo-card" :class="rootClass">
    <!-- 地面镜面倒影：压扁 + 模糊 + 渐隐遮罩的卡体轮廓（详情视图不需要） -->
    <div class="mirror" aria-hidden="true">
      <div class="inner" />
    </div>

    <!-- 左上斜绶带：奖级（位于裁剪区之外，出框 + 折角 + 燕尾切口；与卡体同材质） -->
    <span class="ribbon" aria-hidden="true">
      <i class="fold fold--t" />
      <i class="fold fold--l" />
      <span class="band">
        <span class="band-face">{{ honor.level }}</span>
      </span>
    </span>

    <div class="card-body">
      <!-- 受光面：由 HonorHall 的 .is-active 驱动，模拟射灯自上而下打在展板上 -->
      <span class="lit" aria-hidden="true" />
      <!-- 右下幽灵字 -->
      <span v-if="ghostChar" class="ghost" aria-hidden="true">{{ ghostChar }}</span>

      <div class="card-inner">
        <!-- 右上旋转印章：年份 -->
        <span class="seal" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <defs>
              <path
                :id="`honor-seal-ring-${honor.id}`"
                d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"
                fill="none"
              />
            </defs>
            <text>
              <textPath :href="`#honor-seal-ring-${honor.id}`" textLength="238">交点影视 · JIAODIAN FILM · HONOR ·</textPath>
            </text>
          </svg>
          <span class="seal-inner"><em>荣 誉</em><b v-if="year">{{ year }}</b></span>
        </span>

        <h3 class="title">{{ honor.title }}</h3>
        <div class="divider" aria-hidden="true" />
        <p class="issuer">{{ honor.issuer }}</p>
        <p v-if="honor.description" class="desc">{{ honor.description }}</p>
      </div>
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
  height: 100%;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(196, 154, 74, 0.42);
  border-radius: 6px;
  background:
    linear-gradient(160deg, rgba(196, 154, 74, 0.16), rgba(196, 154, 74, 0.02) 45%, rgba(255, 255, 255, 0.03)),
    #0d0b08;
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

/* 文字主体：右侧让位印章 */
.card-inner {
  position: relative;
  z-index: 1;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px 88px 16px 24px;
}

.title {
  color: #fafafa;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.divider {
  margin-top: 10px;
  height: 1px;
  width: 44px;
  background: linear-gradient(90deg, rgba(196, 154, 74, 0.9), rgba(196, 154, 74, 0));
}

.issuer {
  margin-top: 9px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc {
  margin-top: 7px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  line-height: 1.65;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* --- 左上斜绶带：奖级（出框，与卡体同材质：暖黑玻璃 + 金色描边） ---
   位于卡体裁剪区之外：缎带斜穿卡角、两端燕尾切口伸出框外，
   折角为缎带背面的暗铜色，投影让整条带子浮在展签上。 */
.ribbon {
  position: absolute;
  top: -12px;
  left: -12px;
  width: 112px;
  height: 112px;
  z-index: 6;
  pointer-events: none;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.55));
}

/* 折角：缎带背面的暗铜色，压在卡边交叉点、比带身略宽 */
.ribbon .fold {
  position: absolute;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #5a4419, #2e2210);
  box-shadow: inset 0 0 0 1px rgba(232, 199, 122, 0.25);
  transform: rotate(45deg);
  z-index: 1;
}
/* 顶边交叉点（卡坐标 56,0 → 包装盒 68,12）与左边交叉点（0,56 → 12,68） */
.ribbon .fold--t {
  left: 56px;
  top: 0;
}
.ribbon .fold--l {
  left: 0;
  top: 56px;
}

/* 带身外层：1px 金色描边沿燕尾切口走线 */
.ribbon .band {
  position: absolute;
  left: 40px;
  top: 40px;
  width: 124px;
  transform: translate(-50%, -50%) rotate(-45deg);
  padding: 1px;
  background: linear-gradient(
    180deg,
    rgba(232, 199, 122, 0.85),
    rgba(196, 154, 74, 0.4) 55%,
    rgba(142, 106, 44, 0.65)
  );
  clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%, 8px 50%);
  z-index: 2;
}

/* 带面：与卡体同配方（暖黑玻璃），金字 */
.ribbon .band-face {
  display: block;
  padding: 6px 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: var(--accent-gold-light);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 42%),
    linear-gradient(160deg, rgba(196, 154, 74, 0.3), rgba(196, 154, 74, 0.06) 55%, rgba(0, 0, 0, 0.5)),
    #0d0b08;
  clip-path: polygon(0 0, 100% 0, calc(100% - 7.5px) 50%, 100% 100%, 0 100%, 7.5px 50%);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
}

/* --- 右下幽灵字：题名首字 --- */
.ghost {
  position: absolute;
  right: -6px;
  bottom: -28px;
  z-index: 0;
  font-family: var(--font-serif);
  font-weight: 700;
  line-height: 1;
  font-size: 92px;
  color: rgba(196, 154, 74, 0.055);
  -webkit-text-stroke: 1px rgba(196, 154, 74, 0.1);
  pointer-events: none;
  user-select: none;
}

/* --- 右上旋转印章：年份 --- */
.seal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 66px;
  height: 66px;
  display: grid;
  place-items: center;
  z-index: 2;
}
.seal::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(10, 10, 10, 0.55);
  border: 1px solid rgba(196, 154, 74, 0.35);
  backdrop-filter: blur(3px);
}
.seal svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: seal-spin 24s linear infinite;
}
.seal text {
  fill: var(--accent-gold);
  font-size: 8.5px;
  letter-spacing: 1.5px;
  font-family: var(--font-sans);
}
.seal-inner {
  position: relative;
  text-align: center;
  line-height: 1.2;
}
.seal-inner em {
  display: block;
  font-style: normal;
  font-size: 8px;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  color: rgba(255, 255, 255, 0.42);
}
.seal-inner b {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 15px;
  color: var(--accent-gold-light);
  letter-spacing: 0.04em;
}
@keyframes seal-spin {
  to {
    transform: rotate(1turn);
  }
}

/* 受光面：默认隐藏，当前卡由父级 .is-active 点亮 */
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

/* 地面镜面倒影：卡体轮廓压扁 0.52 倍 + 模糊 + 向下渐隐 */
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

/* ===== 平板档（卡 288×186） ===== */
@media (min-width: 768px) and (max-width: 1279px) {
  .card-inner {
    padding: 14px 76px 14px 18px;
  }
  .title {
    font-size: 16px;
  }
  .issuer {
    font-size: 10px;
  }
  .desc {
    font-size: 10px;
  }
  .seal {
    width: 58px;
    height: 58px;
    top: 10px;
    right: 10px;
  }
  .seal-inner b {
    font-size: 13px;
  }
  .ribbon {
    top: -10px;
    left: -10px;
    width: 96px;
    height: 96px;
  }
  .ribbon .band {
    left: 36px;
    top: 36px;
    width: 108px;
  }
  .ribbon .band-face {
    padding: 6px 0;
    font-size: 10.5px;
  }
  .ribbon .fold {
    width: 20px;
    height: 20px;
  }
  .ribbon .fold--t {
    left: 52px;
    top: 0;
  }
  .ribbon .fold--l {
    left: 0;
    top: 52px;
  }
  .ghost {
    font-size: 78px;
    bottom: -24px;
  }
}

/* ===== 窄卡片档（卡 192×126）：幽灵字放不下，隐藏 ===== */
@media (max-width: 767px) {
  .card-inner {
    padding: 10px 54px 10px 14px;
  }
  .title {
    font-size: 12px;
    line-height: 1.3;
    -webkit-line-clamp: 2;
  }
  .divider {
    margin-top: 6px;
    width: 28px;
  }
  .issuer {
    margin-top: 5px;
    font-size: 8px;
  }
  .desc {
    display: none;
  }
  .seal {
    width: 46px;
    height: 46px;
    top: 7px;
    right: 7px;
  }
  .seal-inner em {
    display: none;
  }
  .seal-inner b {
    font-size: 11px;
  }
  .seal text {
    font-size: 11px;
  }
  .ribbon {
    top: -8px;
    left: -8px;
    width: 84px;
    height: 84px;
  }
  .ribbon .band {
    left: 28px;
    top: 28px;
    width: 84px;
  }
  .ribbon .band-face {
    padding: 5px 0;
    font-size: 9px;
  }
  .ribbon .fold {
    width: 16px;
    height: 16px;
  }
  .ribbon .fold--t {
    left: 40px;
    top: 0;
  }
  .ribbon .fold--l {
    left: 0;
    top: 40px;
  }
  .ghost {
    display: none;
  }
}

/* ===== 详情视图（点击放大） ===== */
.large .card-body {
  border-color: rgba(232, 199, 122, 0.55);
  border-radius: 8px;
  box-shadow:
    0 0 120px rgba(240, 217, 120, 0.22),
    inset 0 0 70px rgba(196, 154, 74, 0.08);
}

.large .card-inner {
  padding: 32px 130px 32px 40px;
}

.large .title {
  font-size: 30px;
  -webkit-line-clamp: 3;
}

.large .divider {
  margin-top: 14px;
  width: 76px;
}

.large .issuer {
  margin-top: 12px;
  font-size: 14px;
  white-space: normal;
}

.large .desc {
  margin-top: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.62);
}

.large .seal {
  width: 94px;
  height: 94px;
  top: 20px;
  right: 22px;
}
.large .seal text {
  font-size: 9px;
}
.large .seal-inner em {
  font-size: 9px;
}
.large .seal-inner b {
  font-size: 18px;
}

.large .ribbon {
  top: -16px;
  left: -16px;
  width: 150px;
  height: 150px;
}
.large .ribbon .band {
  left: 50px;
  top: 50px;
  width: 160px;
}
.large .ribbon .band-face {
  padding: 8px 0;
  font-size: 14px;
}
.large .ribbon .fold {
  width: 26px;
  height: 26px;
}
.large .ribbon .fold--t {
  left: 68px;
  top: 3px;
}
.large .ribbon .fold--l {
  left: 3px;
  top: 68px;
}

.large .ghost {
  font-size: 150px;
  bottom: -34px;
}

/* 详情弹框里卡是浮层，不落地 → 去掉倒影，受光面常亮 */
.large .mirror {
  display: none;
}

.large .lit {
  opacity: 1;
}
</style>
