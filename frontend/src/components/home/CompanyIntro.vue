<script setup lang="ts">
/**
 * CompanyIntro —— 公司介绍（参考「关于我们」双端 demo 改版）。
 *
 * 版式：桌面左文案右影像两栏（lg 起，以下堆叠）。
 * - 左：kicker → 衬线大标题（年限动态、金句强调）→ 金色短线 → 简介正文（intro_text）
 *       → 派生统计条（年限 / 在架作品 / 荣誉数，进视口数字滚动）→ 探索详情（SpecularButton）
 * - 右：主图（4:5，外扩描边框 + 内阴影暗角，悬浮微缩放）+ 副图（方形叠压）
 *       + 旋转印章（SINCE {成立年} 环形文字 + 中央年限；移动端贴主图右上角）。
 * 统计全部由 /site 数据派生（0 新字段），与 CompanyDetailOverlay 同源；
 * 主图/副图取官网既有封面素材（CompanyProfile 无图片字段）。
 */
import { computed, ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import SectionKicker from '@/components/common/SectionKicker.vue'
import SpecularButton from '@/components/common/SpecularButton.vue'
import { displayYears } from '@/utils/format'
import { assetUrl } from '@/utils/asset'
import { useSiteStore } from '@/stores/site'
import { useUiStore } from '@/stores/ui'

const site = useSiteStore()
const ui = useUiStore()

const profile = computed(() => site.companyProfile)
const foundedYear = computed(() => profile.value?.founded_year ?? 2017)

/** 展示年限（当前年 − 成立年）。 */
const years = computed(() => displayYears(foundedYear.value))

/** 主图 / 副图（官网既有封面素材）。 */
const mainPhoto = assetUrl('/uploads/cover/portrait-natural-light.png')
const subPhoto = assetUrl('/uploads/cover/wedding-detail-hands.png')

/** 派生统计条（与公司详情遮罩同源，0 新字段）。 */
const stats = computed(() => [
  { value: years.value, unit: '年', label: '行业深耕' },
  { value: site.config.video_count ?? 0, unit: '部', label: '在架影像作品' },
  { value: site.honors.length, unit: '项', label: '影视荣誉' }
])

/* ---- 数字滚动：统计条 60% 进视口后播一次，1600ms 三次方缓出 ---- */
const statsEl = ref<HTMLElement | null>(null)
const counted = ref(false)
const shown = ref<number[]>(stats.value.map(() => 0))

function runCountUp(): void {
  const targets = stats.value.map((s) => Number(s.value) || 0)
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    shown.value = targets
    return
  }
  const t0 = performance.now()
  const dur = 1600
  const tick = (t: number): void => {
    const p = Math.min((t - t0) / dur, 1)
    const ease = 1 - Math.pow(1 - p, 3)
    shown.value = targets.map((v) => Math.round(v * ease))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

useIntersectionObserver(
  statsEl,
  (entries) => {
    if (counted.value || !entries[0]?.isIntersecting) return
    counted.value = true
    runCountUp()
  },
  { threshold: 0.6 }
)
</script>

<template>
  <section id="about" class="about-section relative w-full overflow-hidden text-txt-primary">
    <div class="ly-container ly-section relative z-[2]">
      <div
        class="grid grid-cols-1 gap-y-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-20"
      >
        <!-- 左：文案 -->
        <div>
          <div v-reveal>
            <SectionKicker text="ABOUT · 关于我们" />
          </div>
          <h2 v-reveal="80" class="about-title font-serif">
            {{ years }} 年光影，<br />认真记录 <em>每一次相遇</em>
          </h2>
          <span v-reveal="160" class="about-rule" aria-hidden="true" />
          <p v-reveal="240" class="about-desc font-sans">
            {{ profile?.intro_text || '' }}
          </p>

          <!-- 派生统计条（数字滚动） -->
          <ul ref="statsEl" v-reveal="320" class="about-stats">
            <li v-for="(stat, i) in stats" :key="stat.label">
              <strong class="font-latin">{{ shown[i] ?? 0 }}<i>{{ stat.unit }}</i></strong>
              <span>{{ stat.label }}</span>
            </li>
          </ul>
        </div>

        <!-- 右：影像（桌面跨两行并垂直居中，左侧文案+按钮紧凑排布） -->
        <div
          v-reveal="200"
          class="about-visual lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
        >
          <figure class="photo photo--main">
            <img
              :src="mainPhoto"
              alt="人像作品"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </figure>
          <figure class="photo photo--sub">
            <img
              :src="subPhoto"
              alt="婚礼现场"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </figure>

          <!-- 旋转印章：SINCE {成立年} 环形文字 + 中央年限 -->
          <div class="stamp" role="img" :aria-label="`成立于 ${foundedYear} 年，深耕 ${years} 年`">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <path
                  id="stamp-ring"
                  d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                  fill="none"
                />
              </defs>
              <text>
                <textPath href="#stamp-ring" textLength="282">SINCE {{ foundedYear }} · 交点影视 · JIAODIAN FILM ·</textPath>
              </text>
            </svg>
            <span class="stamp-num">{{ years }}<em>年</em></span>
          </div>
        </div>

        <!-- 探索详情：移动端位于影像下方；桌面固定在左栏第二行，紧贴文案 -->
        <div v-reveal="400" class="lg:col-start-1 lg:row-start-2">
          <SpecularButton class="about-cta" @click="ui.openCompany()">
            探索详情
          </SpecularButton>
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

/* 区块下沿发丝线：向暗底区块收口 */
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

/* --- 左：文案 --- */
.about-title {
  margin-top: 22px;
  font-size: 34px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 3px;
  color: #fafafa;
}
.about-title em {
  font-style: normal;
  color: var(--accent-gold-light);
}

.about-rule {
  display: block;
  width: 44px;
  height: 1px;
  background: var(--accent-gold);
  margin: 26px 0 22px;
}

.about-desc {
  max-width: 36em;
  font-size: 15px;
  line-height: 2.1;
  color: rgba(255, 255, 255, 0.66);
}

.about-stats {
  list-style: none;
  display: flex;
  gap: clamp(28px, 4vw, 56px);
  margin: 40px 0 0;
  padding: 26px 0 0;
  border-top: 1px solid rgba(196, 154, 74, 0.22);
}
.about-stats strong {
  display: block;
  font-weight: 400;
  font-size: clamp(28px, 2.6vw, 38px);
  line-height: 1;
  color: var(--accent-gold);
}
.about-stats strong i {
  font-style: normal;
  margin-left: 3px;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--accent-gold-light);
}
.about-stats span {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.45);
}

/* --- 右：影像 --- */
.about-visual {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 48px 0 40px;
}

.photo {
  overflow: hidden;
}
.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 1.4s ease;
  user-select: none;
}
.photo:active img {
  transform: scale(1.03);
}

.photo--main {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
}
.photo--main::before {
  content: '';
  position: absolute;
  inset: -10px;
  border: 1px solid rgba(196, 154, 74, 0.22);
  pointer-events: none;
}
.photo--main::after {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.photo--main:hover img {
  transform: scale(1.05);
}

.photo--sub {
  /* 移动/堆叠：压住主图底边、半出画外，避免「大图包裹小图」的观感 */
  position: absolute;
  left: 8%;
  bottom: -30px;
  width: 124px;
  aspect-ratio: 1;
  border: 5px solid var(--bg-base);
  outline: 1px solid rgba(196, 154, 74, 0.22);
}
.photo--sub:hover img {
  transform: scale(1.06);
}

/* 旋转印章：移动端贴主图右上角 */
.stamp {
  position: absolute;
  right: -2px;
  top: -2px;
  width: 86px;
  height: 86px;
  display: grid;
  place-items: center;
}
.stamp::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(10, 10, 10, 0.55);
  border: 1px solid rgba(196, 154, 74, 0.35);
  backdrop-filter: blur(2px);
}
@supports not (backdrop-filter: blur(2px)) {
  .stamp::before {
    background: rgba(10, 10, 10, 0.85);
  }
}
.stamp svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: stamp-spin 20s linear infinite;
}
.stamp text {
  fill: var(--accent-gold);
  font-size: 9px;
  letter-spacing: 2px;
  font-family: var(--font-sans);
}
.stamp-num {
  position: relative;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  color: var(--ivory);
}
.stamp-num em {
  font-style: normal;
  font-size: 12px;
  color: var(--accent-gold);
  margin-left: 2px;
}
@keyframes stamp-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (min-width: 1024px) {
  /* 桌面：主图右对齐 430px，印章悬浮左侧空白 */
  .about-title {
    font-size: clamp(34px, 3.2vw, 46px);
  }
  .about-visual {
    padding: 40px 0 70px;
  }
  .photo--main {
    width: min(430px, 100%);
    margin-left: auto;
  }
  .photo--main::before {
    inset: -16px;
  }
  .photo--sub {
    left: 0;
    bottom: 0;
    width: clamp(150px, 16vw, 210px);
    border-width: 7px;
  }
  .stamp {
    left: 10%;
    right: auto;
    top: 0;
    width: 118px;
    height: 118px;
  }
  .stamp-num {
    font-size: 36px;
  }
  .stamp text {
    font-size: 10px;
    letter-spacing: 2.5px;
  }
  .about-section > .ly-container::after {
    left: var(--pad-x-desktop);
    right: var(--pad-x-desktop);
    bottom: calc(var(--section-y-desktop) * -0.45);
  }
}

/* 手机：按钮通栏 */
@media (max-width: 767px) {
  .about-title {
    font-size: 26px;
    letter-spacing: 1px;
  }
  .about-cta {
    width: 100%;
  }
}
</style>
