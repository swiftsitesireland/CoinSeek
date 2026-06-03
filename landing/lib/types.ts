export interface WaitlistEntry {
  email: string
  platform: 'ios' | 'android' | null
}

export interface WaitlistResponse {
  success: boolean
  error?: string
}
