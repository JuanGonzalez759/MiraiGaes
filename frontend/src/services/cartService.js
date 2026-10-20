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

export async function getCart(options = {}) {
  return requestJson('/api/cart', options)
}

export async function addCartItem(gameId, quantity, csrfToken) {
  return requestJson('/api/cart/items', {
    method: 'POST',
    body: { game_id: gameId, quantity },
    csrfToken,
  })
}

export async function updateCartItem(gameId, quantity, csrfToken) {
  return requestJson(`/api/cart/items/${encodeURIComponent(gameId)}`, {
    method: 'PATCH',
    body: { quantity },
    csrfToken,
  })
}

export async function removeCartItem(gameId, csrfToken) {
  return requestJson(`/api/cart/items/${encodeURIComponent(gameId)}`, {
    method: 'DELETE',
    csrfToken,
  })
}
