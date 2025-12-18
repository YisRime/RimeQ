export function sendBrowserNotify(title: string, body: string, icon?: string) {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body, icon })
      }
    })
  }
}
