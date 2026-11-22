/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_API_URL?: string
  readonly VITE_API_URL?: string
  readonly VITE_PUBLIC_APP_URL?: string
}

declare global {
	interface Window {
		google?: {
			accounts: {
				id: {
					initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void
					renderButton(element: HTMLElement, options: Record<string, string | number>): void
				}
			}
		}
	}
}

export {}
