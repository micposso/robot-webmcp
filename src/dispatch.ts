import { ReachyMini } from '@pollen-robotics/reachy-mini-sdk'

;(window as unknown as { ReachyMini: typeof ReachyMini }).ReachyMini = ReachyMini
window.dispatchEvent(new Event('reachymini:ready'))

const params = new URLSearchParams(window.location.search)
const isEmbedded = params.get('embedded') === '1' || params.get('embed') === '1'

if (isEmbedded) {
  void import('./embed')
} else {
  void import('@pollen-robotics/reachy-mini-sdk/host/auto').then(({ mountHost }) => {
    mountHost({
      appName: 'Reachy WebMCP',
      appIconUrl: '/icon.svg',
      appEmoji: '🤖',
      enableMicrophone: false,
      devToken: import.meta.env.VITE_HF_TOKEN && import.meta.env.VITE_HF_USERNAME
        ? { token: import.meta.env.VITE_HF_TOKEN as string, userName: import.meta.env.VITE_HF_USERNAME as string }
        : undefined,
      clientId: import.meta.env.VITE_HF_OAUTH_CLIENT_ID as string | undefined,
    })
  })
}

