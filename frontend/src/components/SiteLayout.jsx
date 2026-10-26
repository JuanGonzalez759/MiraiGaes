import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function SiteLayout({ children }) {
  const { user, isLoading, signOut } = useAuth()
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setLogoutError('')

    try {
      await signOut()
      window.location.assign('/')
    } catch (error) {
      setLogoutError(error.message)
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="MiraiGames, inicio">
          <span className="brand__mark">未</span>
          <span className="brand__name">MIRAI<span>GAMES</span></span>
        </a>
        <span className="site-header__tagline">EL FUTURO DEL JUEGO</span>
        <nav className="account-nav" aria-label="Cuenta">
          {isLoading ? (
            <span className="account-nav__loading">CUENTA...</span>
          ) : user ? (
            <>
              <a href="/profile">MI PERFIL</a>
              <a href="/cart">CARRITO</a>
              <a href="/orders">PEDIDOS</a>
              <button type="button" onClick={handleLogout}>CERRAR SESIÓN</button>
            </>
          ) : (
            <>
              <a href="/login">INICIAR SESIÓN</a>
              <a className="account-nav__register" href="/register">REGISTRARSE</a>
            </>
          )}
        </nav>
        <span className="site-header__status"><i /> SISTEMA EN LINEA</span>
      </header>
      {logoutError && <p className="logout-error" role="alert">{logoutError}</p>}

      {children}

      <footer className="site-footer">
        <a className="brand brand--footer" href="/" aria-label="MiraiGames, inicio">
          <span className="brand__mark">未</span>
          <span className="brand__name">MIRAI<span>GAMES</span></span>
        </a>
        <p>HECHO PARA QUIENES JUEGAN CON EL FUTURO.</p>
        <span>© MIRAI GAMES</span>
      </footer>
    </div>
  )
}

export default SiteLayout
