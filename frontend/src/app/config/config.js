const DEFAULT_BACKEND_BASE = 'http://localhost:5000'

const backendBase =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || `${backendBase}/api`
export const PUBLIC_URL =
  process.env.NEXT_PUBLIC_PUBLIC_URL || `${backendBase}/public`
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001'

export const routerBase = '/'
