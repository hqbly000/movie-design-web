<script setup lang="ts">
/**
 * ContactSection —— 联系我们（R11 / §2.7）。
 * 背景 #0A0A0A；桌面左右两栏（左信息 / 右表单卡），移动纵向堆叠。
 * 可读性硬规则：描述 85%、信息值 90%、图标金描边 60%。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import SectionKicker from '@/components/common/SectionKicker.vue'
import ContactForm from '@/components/home/ContactForm.vue'
import type { SiteSettings } from '@/types/site'

const props = defineProps<{
  /** 站点配置（地址/电话/邮箱/工作时间） */
  settings: SiteSettings
}>()

interface InfoRow {
  icon: string
  label: string
  value: string
  href?: string
}

/** 四行联系方式（仅展示有值的项）。 */
const rows = computed<InfoRow[]>(() => {
  const list: InfoRow[] = []
  if (props.settings.address) {
    list.push({ icon: 'location', label: '地址', value: props.settings.address })
  }
  if (props.settings.phone) {
    list.push({
      icon: 'phone',
      label: '电话',
      value: props.settings.phone,
      href: `tel:${props.settings.phone.replace(/\s+/g, '')}`
    })
  }
  if (props.settings.email) {
    list.push({
      icon: 'mail',
      label: '邮箱',
      value: props.settings.email,
      href: `mailto:${props.settings.email}`
    })
  }
  if (props.settings.work_hours) {
    list.push({ icon: 'clock', label: '工作时间', value: props.settings.work_hours })
  }
  return list
})
</script>

<template>
  <section id="contact" class="w-full bg-[#0A0A0A]">
    <div class="ly-container ly-section">
      <div
        class="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-20"
      >
        <!-- 左栏：信息 -->
        <div v-reveal class="flex flex-col lg:max-w-[520px]">
          <SectionKicker text="CONTACT · 联系我们" />
          <h2 class="mt-4 font-serif text-[34px] leading-tight text-txt-primary lg:text-[44px]">
            联系我们
          </h2>
          <p class="mt-5 font-sans text-[16px] leading-7 text-white/[0.85]">
            无论是个人写真、婚礼纪实，还是品牌影像，欢迎与我们聊聊你的想法。我们会尽快回复，为你安排合适的拍摄方案。
          </p>

          <ul class="mt-9 flex flex-col gap-5">
            <li v-for="row in rows" :key="row.label" class="flex items-center gap-4">
              <span
                class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-[rgba(196,154,74,0.6)] bg-surface"
                aria-hidden="true"
              >
                <AppIcon :name="row.icon" :size="18" class="text-accent-gold-light" />
              </span>
              <span class="flex flex-col">
                <span class="font-sans text-[12px] text-white/50">{{ row.label }}</span>
                <a
                  v-if="row.href"
                  :href="row.href"
                  class="font-sans text-[16px] text-white/[0.9] transition-colors hover:text-accent-gold-light"
                  >{{ row.value }}</a
                >
                <span v-else class="font-sans text-[16px] text-white/[0.9]">{{ row.value }}</span>
              </span>
            </li>
          </ul>
        </div>

        <!-- 右栏：预约表单卡 -->
        <div v-reveal="120" class="w-full lg:flex lg:justify-end">
          <ContactForm />
        </div>
      </div>
    </div>
  </section>
</template>
