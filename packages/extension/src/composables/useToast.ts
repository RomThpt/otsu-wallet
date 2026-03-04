import { ref } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

const toasts = ref<Toast[]>([])
let nextId = 0

function show(type: Toast['type'], message: string, duration = 3000): void {
  const id = nextId++
  toasts.value.push({ id, type, message })
  setTimeout(() => {
    dismiss(id)
  }, duration)
}

function dismiss(id: number): void {
  const index = toasts.value.findIndex((t) => t.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

export function useToast() {
  return {
    toasts,
    show,
    dismiss,
    success: (message: string, duration?: number) => show('success', message, duration),
    error: (message: string, duration?: number) => show('error', message, duration),
    info: (message: string, duration?: number) => show('info', message, duration),
  }
}
