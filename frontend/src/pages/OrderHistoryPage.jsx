import { useCallback, useEffect, useState } from 'react'
import SiteLayout from '../components/SiteLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getOrders, resumeCheckout } from '../services/ordersService.js'

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

const statusLabels = {
  pending: 'PENDIENTE',
  paid: 'PAGADO',
  failed: 'NO COMPLETADO',
  expired: 'EXPIRADO',
}

function OrderHistoryPage() {
  const { user, isLoading: isAuthLoading, authError, csrfToken } = useAuth()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [busyOrderId, setBusyOrderId] = useState(null)

  const loadOrders = useCallback(async (signal) => {
    try {
      const result = await getOrders({ signal })
      setOrders(result.orders)
      setStatus('success')
      setErrorMessage('')
    } catch (error) {
      if (error.name === 'AbortError') return
      setErrorMessage(error.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading || !user) return undefined

    const controller = new AbortController()
    setStatus('loading')
    loadOrders(controller.signal)
    return () => controller.abort()
  }, [isAuthLoading, user, loadOrders])

  async function continuePayment(orderId) {
    setBusyOrderId(orderId)
    setErrorMessage('')

    try {
      await resumeCheckout(orderId, csrfToken)
    } catch (error) {
      setErrorMessage(error.message)
      setBusyOrderId(null)
    }
  }

  let content

  if (isAuthLoading) {
    content = <div className="catalog-message" role="status"><span className="loading-mark" /><p>Comprobando tu sesión...</p></div>
  } else if (authError) {
    content = <p className="form-message form-message--error" role="alert">{authError}</p>
  } else if (!user) {
    content = (
      <section className="cart-access">
        <p className="section-heading__eyebrow">PEDIDOS / ACCESO</p>
        <h1>Inicia sesión para consultar tus compras.</h1>
        <a className="account-submit account-submit--link" href="/login">INICIAR SESIÓN</a>
      </section>
    )
  } else if (status === 'loading') {
    content = <div className="catalog-message" role="status"><span className="loading-mark" /><p>Cargando tus pedidos...</p></div>
  } else if (status === 'error') {
    content = <div className="catalog-message catalog-message--error" role="alert"><h2>No se pudo cargar el historial.</h2><p>{errorMessage}</p><button type="button" onClick={() => loadOrders()}>VOLVER A INTENTAR</button></div>
  } else if (orders.length === 0) {
    content = <section className="cart-empty"><p className="section-heading__eyebrow">PEDIDOS / HISTORIAL</p><h1>Aún no tienes pedidos.</h1><p>Cuando finalices una compra, podrás consultarla aquí.</p><a className="account-submit account-submit--link" href="/#catalogo">EXPLORAR CATÁLOGO</a></section>
  } else {
    content = (
      <div className="orders-list">
        {orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div>
              <p className="section-heading__eyebrow">PEDIDO / {String(order.id).padStart(5, '0')}</p>
              <p className={`order-card__status order-card__status--${order.payment_status}`}>
                {statusLabels[order.payment_status] || order.payment_status}
              </p>
              <time dateTime={order.created_at}>{new Date(`${order.created_at.replace(' ', 'T')}Z`).toLocaleString('es-ES')}</time>
            </div>
            <strong>{priceFormatter.format(Number(order.total))}</strong>
            <div className="order-card__actions">
              <a href={`/checkout/return?order_id=${order.id}`}>VER ESTADO</a>
              {order.payment_status === 'pending' && order.inventory_status === 'reserved' && (
                <button
                  type="button"
                  disabled={busyOrderId === order.id}
                  onClick={() => continuePayment(order.id)}
                >
                  {busyOrderId === order.id ? 'CONECTANDO...' : 'CONTINUAR PAGO'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <SiteLayout>
      <main className="orders-page">
        <div className="cart-heading">
          <p className="section-heading__eyebrow">MIRAIGAMES / TU CUENTA</p>
          <h1>Historial<span>.</span></h1>
        </div>
        {errorMessage && status !== 'error' && <p className="form-message form-message--error" role="alert">{errorMessage}</p>}
        {content}
      </main>
    </SiteLayout>
  )
}

export default OrderHistoryPage
