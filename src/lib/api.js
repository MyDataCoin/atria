// Тонкий HTTP-клиент для Atria API.
// Базовый адрес берётся из VITE_API_URL (см. .env). Все запросы идут через apiFetch,
// который сам подставляет Bearer-токен и разбирает ProblemDetails-ошибки.

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const ACCESS_KEY = 'atria.accessToken'
const REFRESH_KEY = 'atria.refreshToken'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY) || null
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY) || null
  },
  save({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
  get isAuthed() {
    return Boolean(localStorage.getItem(ACCESS_KEY))
  },
}

/** Ошибка с http-статусом и распарсенным телом ProblemDetails (если было). */
export class ApiError extends Error {
  constructor(message, status, problem) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

/**
 * Базовый запрос. path — это путь после /api/v1, например '/auth/login'.
 * options: { method, body (объект → JSON), auth (слать ли Bearer), headers }
 */
export async function apiFetch(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const finalHeaders = { ...headers }
  let payload = body

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  if (auth && tokens.access) {
    finalHeaders['Authorization'] = `Bearer ${tokens.access}`
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
  })

  // 204 / пустое тело
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    if (res.ok) return null
  }

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    const detail = data?.detail || data?.title || res.statusText
    throw new ApiError(detail || 'Request failed', res.status, data)
  }

  return data
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
