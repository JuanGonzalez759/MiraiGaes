function SiteLayout({ children }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="MiraiGames, inicio">
          <span className="brand__mark">未</span>
          <span className="brand__name">MIRAI<span>GAMES</span></span>
        </a>
        <span className="site-header__tagline">EL FUTURO DEL JUEGO</span>
        <span className="site-header__status"><i /> SISTEMA EN LINEA</span>
      </header>

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
