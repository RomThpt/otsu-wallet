import { ref, watch, onMounted, onUnmounted } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'otsu-theme'

const currentTheme = ref<Theme>('system')

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
  const el = document.documentElement.classList
  el.toggle('dark', resolvedTheme === 'dark')
}

export function useTheme() {
  let systemThemeQuery: MediaQueryList | null = null
  const handleSystemThemeChange = () => {
    if (currentTheme.value === 'system') applyTheme('system')
  }

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored) {
      currentTheme.value = stored
    }
    applyTheme(currentTheme.value)

    systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeQuery.addEventListener('change', handleSystemThemeChange)
  })

  onUnmounted(() => systemThemeQuery?.removeEventListener('change', handleSystemThemeChange))

  watch(currentTheme, (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
  })

  function setTheme(theme: Theme): void {
    currentTheme.value = theme
  }

  function toggleTheme(): void {
    const resolved = currentTheme.value === 'system' ? getSystemTheme() : currentTheme.value
    currentTheme.value = resolved === 'dark' ? 'light' : 'dark'
  }

  return {
    currentTheme,
    setTheme,
    toggleTheme,
  }
}
