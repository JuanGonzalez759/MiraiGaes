async function requestJson(path, { method = 'GET', body, csrfToken, signal } = {}) {
  const headers = new Headers()

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      data?.message || `No se pudo completar la solicitud (HTTP ${response.status}).`,
    )
    error.status = response.status
    throw error
  }

  return data
}

export async function getCsrfToken(options = {}) {
  const data = await requestJson('/api/auth/csrf', options)

  if (typeof data.csrf_token !== 'string') {
    throw new Error('La API no devolvió un token de seguridad válido.')
  }

  return data.csrf_token
}

export async function getCurrentUser(options = {}) {
  return requestJson('/api/auth/me', options)
}

export async function registerUser(user, csrfToken) {
  return requestJson('/api/auth/register', {
    method: 'POST',
    body: user,
    csrfToken,
  })
}

export async function loginUser(credentials, csrfToken) {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: credentials,
    csrfToken,
  })
}

export async function logoutUser(csrfToken) {
  return requestJson('/api/auth/logout', {
    method: 'POST',
    body: {},
    csrfToken,
  })
}
