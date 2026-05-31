import type { PartnerShipApi } from './index'

declare global {
  interface Window {
    partnership: PartnerShipApi
  }
}

export {}
