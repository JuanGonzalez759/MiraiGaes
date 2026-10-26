import { useCallback, useEffect, useState } from 'react'
import SiteLayout from '../components/SiteLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { clearCheckoutAttemptForOrder, getOrder } from '../services/ordersService.js'

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

const statusMessages = {
  pending: 'El pago aún no está confirmado. El historial se actualizará cuando la API reciba la confirmación de Stripe.',
  paid: 'Pago confirmado. Gracias por tu compra.',
  failed: 'El pago no se completó.',
  expired: 'La sesión de pago expiró y la reserva de stock fue liberada.',
}

function CheckoutReturnPage() {
  const { user, isLoading: isAuthLoading, authError } = useAuth()
  const orderId = new URLSearchParams(window.location.search).get('order_id')
  const validOrderId = /^[1-9]\d*$/.test(orderId || '')
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const loadOrder = useCallback(async (signal) => {
    if (!validOrderId) {
      setStatus('error')
      setErrorMessage('La referencia del pedido no es válida.')
      return
    }

    try {
      const result = await getOrder(orderId, { signal })
      setOrder(result.order)
      setStatus('success')
      setErrorMessage('')
      clearCheckoutAttemptForOrder(result.order.id)
    } catch (error) {
      if (error.name === 'AbortError') return
      setErrorMessage(error.status === 401
        ? 'Inicia sesión con la cuenta que realizó el pedido para consultar su estado.'
        : error.message)
      setStatus('error')
    }
  }, [orderId, validOrderId])

  useEffect(() => {
    if (isAuthLoading || !user) return undefined

    const controller = new AbortController()
    setStatus('loading')
    loadOrder(controller.signal)
    return () => controller.abort()
  }, [isAuthLoading, user, loadOrder])

  let content

  if (isAuthLoading) {
    content = <div className="catalog-message" role="status"><span className="loading-mark" /><p>Comprobando tu sesión...</p></div>
  } else if (authError) {
    content = <p className="form-message form-message--error" role="alert">{authError}</p>
  } else if (!user) {
    content = (
      <section className="cart-access">
        <p className="section-heading__eyebrow">CHECKOUT / CUENTA</p>
        <h1>Inicia sesión para consultar el pedido.</h1>
        <a className="account-submit account-submit--link" href="/login">INICIAR SESIÓN</a>
      </section>
    )
  } else if (status === 'loading') {
    content = <div className="catalog-message" role="status"><span className="loading-mark" /><p>Consultando el estado del pedido...</p></div>
  } else if (status === 'error') {
    content = <div className="catalog-message catalog-message--error" role="alert"><h2>No se pudo consultar el pedido.</h2><p>{errorMessage}</p><button type="button" onClick={() => loadOrder()}>VOLVER A INTENTAR</button></div>
  } else {
    content = (
      <section className="checkout-result">
        <p className="section-heading__eyebrow">PEDIDO / {String(order.id).padStart(5, '0')}</p>
        <h2 className={`order-card__status order-card__status--${order.payment_status}`}>
          {order.payment_status === 'paid' ? 'PAGO CONFIRMADO' : (order.payment_status || '').toUpperCase()}
        </h2>
        <p>{statusMessages[order.payment_status] || 'Consulta el historial para ver las actualizaciones de este pedido.'}</p>
        <div className="checkout-result__total">
          <span>Total del pedido</span>
          <strong>{priceFormatter.format(Number(order.total))}</strong>
        </div>
        <ul className="checkout-result__items">
          {order.items.map((item) => (
            <li key={item.game_id}>
              <span>{item.game_title} × {item.quantity}</span>
              <strong>{priceFormatter.format(Number(item.subtotal))}</strong>
            </li>
          ))}
        </ul>
        <div className="checkout-result__links">
          <a href="/orders">VER HISTORIAL</a>
          <a href="/">VOLVER AL CATÁLOGO</a>
        </div>
      </section>
    )
  }

  return (
    <SiteLayout>
      <main className="orders-page">
        <div className="cart-heading">
          <p className="section-heading__eyebrow">MIRAIGAMES / CHECKOUT</p>
          <h1>Estado del pago<span>.</span></h1>
        </div>
        {content}
      </main>
    </SiteLayout>
  )
}

export default CheckoutReturnPage
