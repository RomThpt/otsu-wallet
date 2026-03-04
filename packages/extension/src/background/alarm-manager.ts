import { AUTO_LOCK_DEFAULT_MINUTES } from '@otsu/constants'

const ALARM_NAME = 'otsu-auto-lock'

let onLockCallback: (() => void) | null = null

export function setupAutoLock(onLock: () => void): void {
  onLockCallback = onLock

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME && onLockCallback) {
      onLockCallback()
    }
  })
}

export function resetAutoLock(minutes: number = AUTO_LOCK_DEFAULT_MINUTES): void {
  chrome.alarms.clear(ALARM_NAME)
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: minutes })
}

export function clearAutoLock(): void {
  chrome.alarms.clear(ALARM_NAME)
}
