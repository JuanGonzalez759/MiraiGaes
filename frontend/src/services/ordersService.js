async function requestJson(path, {
  method = 'GET',
  body,
  csrfToken,
  headers: extraHeaders = {},
  signal,
} = {}) {
  const headers = new Headers(extraHeaders)

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

function redirectToStripe(checkoutUrl) {
  let url

  try {
    url = new URL(checkoutUrl)
  } catch {
    throw new Error('La API no devolvió una URL de pago válida.')
  }

  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') {
    throw new Error('La URL de pago no pertenece a Stripe Checkout.')
  }

  window.location.assign(url.href)
}

function getCheckoutIdempotencyKey(cart) {
  const fingerprint = cart.items
    .map((item) => `${item.game_id}:${item.quantity}`)
    .sort()
    .join('|')
  const storageKey = 'mirai.checkout.attempt'

  try {
    const previous = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null')

    if (
      previous?.fingerprint === fingerprint
      && typeof previous.key === 'string'
    ) {
      return previous.key
    }

    const key = window.crypto.randomUUID()
    window.sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }))
    return key
  } catch {
    throw new Error('No se pudo preparar el intento seguro de checkout en este navegador.')
  }
}

export async function startCheckout(cart, csrfToken) {
  const idempotencyKey = getCheckoutIdempotencyKey(cart)
  const result = await requestJson('/api/checkout/session', {
    method: 'POST',
    body: {},
    csrfToken,
    headers: { 'Idempotency-Key': idempotencyKey },
  })

  try {
    const stored = JSON.parse(window.sessionStorage.getItem('mirai.checkout.attempt') || 'null')
    if (stored?.key === idempotencyKey) {
      window.sessionStorage.setItem(
        'mirai.checkout.attempt',
        JSON.stringify({ ...stored, orderId: result.order_id }),
      )
    }
  } catch {
    // The stable key already reached the API; redirecting remains safe if storage is unavailable.
  }

  redirectToStripe(result.checkout_url)
}

export async function resumeCheckout(orderId, csrfToken) {
  const result = await requestJson(
    `/api/orders/${encodeURIComponent(orderId)}/checkout-session`,
    {
      method: 'POST',
      body: {},
      csrfToken,
    },
  )

  redirectToStripe(result.checkout_url)
}

export async function getOrders(options = {}) {
  return requestJson('/api/orders', options)
}

export async function getOrder(orderId, options = {}) {
  return requestJson(`/api/orders/${encodeURIComponent(orderId)}`, options)
}

export function clearCheckoutAttemptForOrder(orderId) {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem('mirai.checkout.attempt') || 'null')

    if (String(stored?.orderId) === String(orderId)) {
      window.sessionStorage.removeItem('mirai.checkout.attempt')
    }
  } catch {
    // A stale attempt is harmless; the server still enforces its unique idempotency key.
  }
}
