/** 通用 UI 组件类型（供 .vue 组件与视图共享，避免在 <script setup> 内 export） */

export interface TableColumn {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface SelectOption {
  value: string | number
  label: string
}

export interface RadioOption {
  value: string
  label: string
  hint?: string
}
