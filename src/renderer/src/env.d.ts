/// <reference types="vite/client" />
import type { PartnerShipApi } from '../../preload/index'

declare global {
  interface Window {
    partnership: PartnerShipApi
  }
}

declare module '*.css'

export {}
