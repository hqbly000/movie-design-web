<script setup lang="ts">
/**
 * SpecularButton —— 边缘流光按钮（React Bits 同名组件的 Vue 3 移植，WebGL 由 ogl 驱动）。
 *
 * 原理：按钮上层叠一块比按钮大一圈的透明 canvas，片元着色器用圆角矩形 SDF
 * 沿边缘画一道随光源角度转动的镜面高光（specular streak）。光源默认跟随
 * 页面任意位置的指针（followMouse），靠近时渐亮（proximity），也可改为
 * autoAnimate 常驻旋转扫光。
 *
 * 站点默认值已对齐设计规范：2px 圆角、13px 34px 内边距、14px 字号、3px 字距，
 * 金色流光（--accent-gold-light）+ 象牙白文字；业务板块与公司介绍按钮统一用此样式。
 * 默认 autoAnimate 常驻扫光（强度 1.8 / 线宽 1.6 / 光带 18°），鼠标靠近时转向指针并增亮。
 * WebGL 初始化失败时退化为金描边幽灵按钮（is-nofx）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl'

/** fx canvas 每边比按钮多出的留白（像素），让边缘光晕可以溢出按钮外 */
const PAD = 20

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  // 贴边的深色基础描边，提供厚度感
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  // 对称镜面高光：朝向/背向光源的边缘同时捕捉一道流光，
  // 角度窗口（size + fade）用椭圆法线度量，使其沿直边连续变化
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`

const props = withDefaults(
  defineProps<{
    /** 尺寸档位：md 为官网标准按钮规格 */
    size?: 'sm' | 'md' | 'lg'
    /** 圆角（像素），站点规范为 2px */
    radius?: number
    /** 玻璃底色 */
    tint?: string
    /** 玻璃底色强度 0-1 */
    tintOpacity?: number
    /** 背后毛玻璃模糊（像素） */
    blur?: number
    /** 文字颜色 */
    textColor?: string
    /** 流光颜色 */
    lineColor?: string
    /** 静态描边基色 */
    baseColor?: string
    /** 流光亮度 */
    intensity?: number
    /** 单道流光的角宽（度） */
    shineSize?: number
    /** 流光两端渐隐的角宽（度） */
    shineFade?: number
    /** 流光线宽（像素） */
    thickness?: number
    /** autoAnimate 时扫光旋转速度 */
    speed?: number
    /** 流光指向指针 */
    followMouse?: boolean
    /** 指针接近多少像素内流光渐亮 */
    proximity?: number
    /** 常驻扫光（不依赖指针接近） */
    autoAnimate?: boolean
    /** 禁用 */
    disabled?: boolean
    /** 原生 type */
    nativeType?: 'button' | 'submit' | 'reset'
  }>(),
  {
    size: 'md',
    radius: 2,
    tint: '#ffffff',
    tintOpacity: 0,
    blur: 0,
    textColor: '#f4f0e8',
    lineColor: '#e8c77a',
    baseColor: '#525252',
    intensity: 1.8,
    shineSize: 18,
    shineFade: 55,
    thickness: 1.6,
    speed: 0.9,
    followMouse: true,
    proximity: 300,
    autoAnimate: true,
    disabled: false,
    nativeType: 'button'
  }
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const btnRef = ref<HTMLButtonElement | null>(null)
const fxRef = ref<HTMLElement | null>(null)
/** WebGL 初始化失败 → 退化为普通金描边按钮 */
const fxFailed = ref(false)

const cssVars = computed(() => ({
  '--sb-radius': `${props.radius}px`,
  '--sb-tint': props.tint,
  '--sb-tint-opacity': String(props.tintOpacity),
  '--sb-blur': `${props.blur}px`,
  '--sb-text-color': props.textColor
}))

function handleClick(ev: MouseEvent): void {
  if (props.disabled) return
  emit('click', ev)
}

onMounted(() => {
  const btn = btnRef.value
  const fx = fxRef.value
  if (!btn || !fx) return

  let renderer: Renderer
  let program: Program
  let gl: Renderer['gl']
  try {
    const dpr = window.devicePixelRatio || 1
    renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr })
    gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const geometry = new Triangle(gl)
    if (geometry.attributes.uv) delete (geometry.attributes as Record<string, unknown>).uv

    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCenter: { value: [0, 0] },
        uHalfSize: { value: [1, 1] },
        uRadius: { value: 0 },
        uAngle: { value: 2.4 },
        uPx: { value: dpr },
        uLineColor: { value: [1, 1, 1] },
        uBaseColor: { value: [0.32, 0.32, 0.32] },
        uIntensity: { value: 1 },
        uShineSize: { value: 0.17 },
        uShineFade: { value: 0.7 },
        uThickness: { value: 1 },
        uBaseWidth: { value: dpr }
      }
    })

    const mesh = new Mesh(gl, { geometry, program })
    fx.appendChild(gl.canvas)

    const sizeRef = { w: 1, h: 1 }
    const resize = () => {
      // 用 getBoundingClientRect 的分数尺寸 + 显式中心，让 SDF 精确贴住 CSS 边框
      const rect = btn.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      sizeRef.w = w
      sizeRef.h = h
      renderer.setSize(w + PAD * 2, h + PAD * 2)
      program.uniforms.uCenter.value = [(PAD + w / 2) * dpr, (PAD + h / 2) * dpr]
      program.uniforms.uHalfSize.value = [(w / 2) * dpr, (h / 2) * dpr]
    }
    const ro = new ResizeObserver(resize)
    ro.observe(btn)
    resize()

    // 光源角度指向指针（页面任意位置），指针未动时回退为慢速扫光
    let pointerAngle: number | null = null
    let proximityT = 0
    const onPointerMove = (e: PointerEvent) => {
      const rect = btn.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right)
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom)
      const dist = Math.hypot(dx, dy)
      // 指针在按钮上时，光源落在对角线附近并随指针在按钮内的位置轻摆
      if (dist === 0) {
        const nx = (e.clientX - cx) / (rect.width / 2)
        const ny = (cy - e.clientY) / (rect.height / 2)
        pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15
      } else {
        pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx)
      }
      const t = Math.max(0, 1 - dist / Math.max(props.proximity, 1))
      proximityT = t * t * (3 - 2 * t)
    }
    window.addEventListener('pointermove', onPointerMove)

    let angle = 2.4
    let idleAngle = 2.4
    let bright = 0
    let last = performance.now()
    let raf = 0

    const lineC = new Color()
    const baseC = new Color()

    const update = (now: number) => {
      raf = requestAnimationFrame(update)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // idleAngle 持续自转作为兜底扫光；followMouse 时角度缓动指向指针
      idleAngle += props.speed * dt
      const steer =
        props.followMouse && pointerAngle != null && (!props.autoAnimate || proximityT > 0)
      const target = pointerAngle != null && steer ? pointerAngle : idleAngle
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      angle += diff * (1 - Math.exp(-dt * 7))

      // 非常驻模式下，流光亮度随指针接近程度渐入
      const brightTarget = props.autoAnimate ? 1 : proximityT
      bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8))

      lineC.set(props.lineColor)
      baseC.set(props.baseColor)
      program.uniforms.uAngle.value = angle
      program.uniforms.uRadius.value = Math.min(props.radius, Math.min(sizeRef.w, sizeRef.h) / 2) * dpr
      program.uniforms.uLineColor.value = [lineC.r, lineC.g, lineC.b]
      program.uniforms.uBaseColor.value = [baseC.r, baseC.g, baseC.b]
      program.uniforms.uIntensity.value = props.intensity * bright
      program.uniforms.uShineSize.value = (props.shineSize * Math.PI) / 180
      program.uniforms.uShineFade.value = (props.shineFade * Math.PI) / 180
      program.uniforms.uThickness.value = props.thickness * dpr
      renderer.render({ scene: mesh })
    }
    raf = requestAnimationFrame(update)

    onBeforeUnmount(() => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    })
  } catch {
    fxFailed.value = true
  }
})
</script>

<template>
  <button
    ref="btnRef"
    :type="nativeType"
    :disabled="disabled"
    class="specular-button"
    :class="[`specular-button--${size}`, fxFailed ? 'is-nofx' : '']"
    :style="cssVars"
    @click="handleClick"
  >
    <span ref="fxRef" class="specular-button__fx" aria-hidden="true" />
    <span class="specular-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.specular-button {
  --sb-radius: 2px;
  --sb-tint: #ffffff;
  --sb-tint-opacity: 0;
  --sb-blur: 0px;
  --sb-text-color: #f4f0e8;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin: 0;
  font-family: inherit;
  font-weight: 400;
  line-height: 1;
  color: var(--sb-text-color);
  background: color-mix(in srgb, var(--sb-tint) calc(var(--sb-tint-opacity) * 100%), transparent);
  border-radius: var(--sb-radius);
  backdrop-filter: blur(var(--sb-blur));
  -webkit-backdrop-filter: blur(var(--sb-blur));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  outline: none;
  transition: transform 0.15s ease;
  user-select: none;
}

.specular-button:active {
  transform: scale(0.97);
}

.specular-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--sb-text-color) 60%, transparent);
  outline-offset: 3px;
}

.specular-button:disabled {
  opacity: 0.55;
  cursor: default;
}

.specular-button:disabled:active {
  transform: none;
}

/* 官网标准按钮规格（对齐 .ly-btn-ghost-gold 的排版） */
.specular-button--sm {
  font-size: 13px;
  padding: 10px 24px;
  letter-spacing: 2px;
}

.specular-button--md {
  font-size: 14px;
  padding: 13px 34px;
  letter-spacing: 3px;
}

.specular-button--lg {
  font-size: 15px;
  padding: 16px 44px;
  letter-spacing: 3px;
}

/* fx canvas 每边溢出 20px，让边缘光晕能画出按钮外 */
.specular-button__fx {
  position: absolute;
  inset: -20px;
  pointer-events: none;
  z-index: 1;
}

.specular-button__fx :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.specular-button__label {
  position: relative;
  z-index: 2;
}

/* WebGL 不可用时的兜底：金描边幽灵按钮 */
.specular-button.is-nofx {
  border: 1px solid rgba(196, 154, 74, 0.45);
  background: var(--bg-base);
}
</style>
