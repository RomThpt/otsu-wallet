import { ref, watch, onMounted } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'otsu-theme'

const currentTheme = ref<Theme>('system')

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  const resolved = theme === 'system' ? getSystemTheme() : theme

  if (resolved === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored) {
      currentTheme.value = stored
    }
    applyTheme(currentTheme.value)

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentTheme.value === 'system') {
        applyTheme('system')
      }
    })
  })

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
