import { useEffect, useState } from 'react'
import GameCover from '../components/GameCover.jsx'
import SiteLayout from '../components/SiteLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getCart, removeCartItem, updateCartItem } from '../services/cartService.js'
import { startCheckout } from '../services/ordersService.js'

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

function CartPage() {
  const { user, isLoading: isAuthLoading, authError, csrfToken } = useAuth()
  const [cart, setCart] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [busyGameId, setBusyGameId] = useState(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCart() {
      if (isAuthLoading) return

      if (!user) {
        setCart(null)
        setStatus('success')
        return
      }

      setStatus('loading')

      try {
        const result = await getCart({ signal: controller.signal })
        setCart(result.cart)
        setStatus('success')
      } catch (error) {
        if (error.name === 'AbortError') return
        setErrorMessage(error.message)
        setStatus('error')
      }
    }

    loadCart()
    return () => controller.abort()
  }, [user, isAuthLoading])

  async function applyCartChange(gameId, action) {
    setBusyGameId(gameId)
    setErrorMessage('')

    try {
      const result = await action()
      setCart(result.cart)
    } catch (error) {
      setErrorMessage(error.status === 401
        ? 'Tu sesión ha caducado. Inicia sesión de nuevo para consultar el carrito.'
        : error.message)
    } finally {
      setBusyGameId(null)
    }
  }

  async function handleCheckout() {
    if (!cart) return

    setIsCheckingOut(true)
    setErrorMessage('')

    try {
      await startCheckout(cart, csrfToken)
    } catch (error) {
      setErrorMessage(error.status === 401
        ? 'Tu sesión ha caducado. Inicia sesión de nuevo para finalizar la compra.'
        : error.message)
      setIsCheckingOut(false)
    }
  }

  const canCheckout = Boolean(
    cart?.items.length
    && cart.items.every((item) => item.is_active && item.quantity <= item.stock),
  )

  const pageContent = isAuthLoading ? (
    <div className="catalog-message" role="status">
      <span className="loading-mark" />
      <p>Comprobando tu sesión...</p>
    </div>
  ) : authError ? (
    <p className="form-message form-message--error" role="alert">{authError}</p>
  ) : !user ? (
    <section className="cart-access">
      <p className="section-heading__eyebrow">CARRITO / ACCESO</p>
      <h1>Inicia sesión para ver tu carrito.</h1>
      <p>El carrito está asociado a tu cuenta y solo tú puedes consultarlo.</p>
      <a className="account-submit account-submit--link" href="/login">INICIAR SESIÓN</a>
    </section>
  ) : status === 'loading' ? (
    <div className="catalog-message" role="status">
      <span className="loading-mark" />
      <p>Cargando tu carrito...</p>
    </div>
  ) : status === 'error' ? (
    <div className="catalog-message catalog-message--error" role="alert">
      <p className="catalog-message__code">CARRITO / ERROR</p>
      <h1>No se pudo cargar el carrito.</h1>
      <p>{errorMessage}</p>
      <button type="button" onClick={() => window.location.reload()}>VOLVER A INTENTAR</button>
    </div>
  ) : cart && cart.items.length === 0 ? (
    <section className="cart-empty">
      <p className="section-heading__eyebrow">CARRITO / SIN ARTÍCULOS</p>
      <h1>Tu próxima aventura empieza aquí.</h1>
      <p>Añade videojuegos desde el catálogo y aparecerán en este espacio.</p>
      <a className="account-submit account-submit--link" href="/#catalogo">EXPLORAR CATÁLOGO</a>
    </section>
  ) : (
    <>
      {errorMessage && <p className="form-message form-message--error" role="alert">{errorMessage}</p>}
      <div className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item, index) => (
            <article className="cart-item" key={item.game_id}>
              <a className="cart-item__cover" href={`/games/${item.game_id}`}>
                <GameCover game={{ ...item, id: item.game_id }} index={index} showIndex={false} />
              </a>
              <div className="cart-item__details">
                <p className="section-heading__eyebrow">ARTÍCULO / {String(item.game_id).padStart(3, '0')}</p>
                <h2><a href={`/games/${item.game_id}`}>{item.title}</a></h2>
                <p className="cart-item__unit-price">
                  {priceFormatter.format(Number(item.unit_price))} <span>por unidad</span>
                </p>
                {!item.is_active && <p className="cart-item__warning">Este juego ya no está disponible.</p>}
                {item.is_active && item.quantity > item.stock && (
                  <p className="cart-item__warning">La cantidad supera el stock actual; reduce unidades o elimina el artículo.</p>
                )}
              </div>
              <div className="cart-item__actions">
                <div className="cart-quantity" aria-label={`Cantidad de ${item.title}`}>
                  <button
                    type="button"
                    aria-label={`Reducir cantidad de ${item.title}`}
                    disabled={busyGameId === item.game_id || item.quantity <= 1 || !item.is_active}
                    onClick={() => applyCartChange(item.game_id, () =>
                      updateCartItem(item.game_id, item.quantity - 1, csrfToken))}
                  >−</button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Aumentar cantidad de ${item.title}`}
                    disabled={
                      busyGameId === item.game_id
                      || !item.is_active
                      || item.quantity >= item.stock
                    }
                    onClick={() => applyCartChange(item.game_id, () =>
                      updateCartItem(item.game_id, item.quantity + 1, csrfToken))}
                  >+</button>
                </div>
                <strong className="cart-item__subtotal">
                  {priceFormatter.format(Number(item.subtotal))}
                </strong>
                <button
                  className="cart-item__remove"
                  type="button"
                  disabled={busyGameId === item.game_id}
                  onClick={() => applyCartChange(item.game_id, () =>
                    removeCartItem(item.game_id, csrfToken))}
                >
                  ELIMINAR
                </button>
              </div>
            </article>
          ))}
        </div>
        <aside className="cart-summary">
          <p className="section-heading__eyebrow">RESUMEN / CARRITO</p>
          <div className="cart-summary__row">
            <span>Subtotal</span>
            <strong>{priceFormatter.format(Number(cart.total))}</strong>
          </div>
          <div className="cart-summary__total">
            <span>TOTAL</span>
            <strong>{priceFormatter.format(Number(cart.total))}</strong>
          </div>
          <button
            className="cart-checkout-button"
            type="button"
            disabled={!canCheckout || isCheckingOut}
            onClick={handleCheckout}
          >
            {isCheckingOut ? 'CONECTANDO CON STRIPE...' : 'FINALIZAR COMPRA'}
          </button>
          <p>El stock y el precio se volverán a comprobar antes de finalizar la compra.</p>
        </aside>
      </div>
    </>
  )

  return (
    <SiteLayout>
      <main className="cart-page">
        <div className="cart-heading">
          <p className="section-heading__eyebrow">MIRAIGAMES / TU SELECCIÓN</p>
          <h1>Carrito<span>.</span></h1>
        </div>
        {pageContent}
      </main>
    </SiteLayout>
  )
}

export default CartPage
