import { useEffect, useState } from 'react'
import GameCard from '../components/GameCard.jsx'
import SiteLayout from '../components/SiteLayout.jsx'
import { getCategories, getGames, getPlatforms } from '../services/gamesService.js'

function HomePage() {
  const [games, setGames] = useState([])
  const [categories, setCategories] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [platformId, setPlatformId] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [taxonomyError, setTaxonomyError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFilters() {
      try {
        const [categoryOptions, platformOptions] = await Promise.all([
          getCategories({ signal: controller.signal }),
          getPlatforms({ signal: controller.signal }),
        ])
        setCategories(categoryOptions)
        setPlatforms(platformOptions)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setTaxonomyError('No se pudieron cargar las opciones de categoría y plataforma.')
        }
      }
    }

    loadFilters()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')

    async function loadGames() {
      try {
        const catalog = await getGames(
          { search: debouncedSearch, categoryId, platformId, maxPrice },
          { signal: controller.signal },
        )
        setGames(catalog)
        setErrorMessage('')
        setStatus('success')
      } catch (error) {
        if (error.name === 'AbortError') return
        setErrorMessage(error.message)
        setStatus('error')
      }
    }

    loadGames()
    return () => controller.abort()
  }, [debouncedSearch, categoryId, platformId, maxPrice, retryKey])

  function clearFilters() {
    setSearch('')
    setCategoryId('')
    setPlatformId('')
    setMaxPrice('')
  }

  const filtersAreActive = Boolean(search || categoryId || platformId || maxPrice)

  return (
    <SiteLayout>
      <main>
        <section className="hero">
          <div className="hero__grid" aria-hidden="true" />
          <div className="hero__content">
            <p className="hero__eyebrow"><span /> TU PROXIMA AVENTURA COMIENZA AQUI</p>
            <h1>Juega al<br /><span>futuro.</span></h1>
            <p className="hero__description">
              Historias de otro mundo. Nuevas formas de jugar.
              <br className="desktop-break" /> Encuentra tu proximo universo.
            </p>
            <a className="hero__link" href="#catalogo">EXPLORAR CATALOGO <span>↘</span></a>
          </div>
          <div className="hero__side-note" aria-hidden="true">TOKYO / 35°40&apos;N 139°41&apos;E</div>
          <div className="hero__sun" aria-hidden="true"><span>未来</span></div>
          <div className="hero__vertical" aria-hidden="true">PLAY BEYOND</div>
        </section>

        <section className="catalog" id="catalogo">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">SELECCION MIRAI / 001</p>
              <h2>El catalogo<span>.</span></h2>
            </div>
            {status === 'success' && (
              <p className="catalog-count">
                {String(games.length).padStart(2, '0')} JUEGOS DISPONIBLES
              </p>
            )}
          </div>

          <form className="catalog-filters" onSubmit={(event) => event.preventDefault()}>
            <label className="filter-field filter-field--search">
              <span>BUSCAR JUEGO</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Escribe un título..."
              />
            </label>
            <label className="filter-field">
              <span>CATEGORÍA</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>PLATAFORMA</span>
              <select value={platformId} onChange={(event) => setPlatformId(event.target.value)}>
                <option value="">Todas</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>{platform.name}</option>
                ))}
              </select>
            </label>
            <label className="filter-field filter-field--price">
              <span>PRECIO MÁXIMO</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Sin límite"
              />
            </label>
            <button
              className="filter-clear"
              type="button"
              onClick={clearFilters}
              disabled={!filtersAreActive}
            >
              LIMPIAR
            </button>
          </form>

          {taxonomyError && <p className="filter-warning" role="status">{taxonomyError}</p>}

          {status === 'loading' && (
            <div className="catalog-message" role="status">
              <span className="loading-mark" />
              <p>Conectando con el universo Mirai...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="catalog-message catalog-message--error" role="alert">
              <p className="catalog-message__code">ERROR / CONEXIÓN PERDIDA</p>
              <h3>No se pudo cargar el catálogo.</h3>
              <p>{errorMessage}</p>
              <button type="button" onClick={() => setRetryKey((current) => current + 1)}>
                VOLVER A INTENTAR
              </button>
            </div>
          )}

          {status === 'success' && games.length === 0 && (
            <div className="catalog-message">
              <p className="catalog-message__code">
                {filtersAreActive ? 'BÚSQUEDA / SIN RESULTADOS' : 'CATÁLOGO / EN ESPERA'}
              </p>
              <h3>{filtersAreActive ? 'No encontramos juegos con esos filtros.' : 'Aún no hay juegos disponibles.'}</h3>
              <p>{filtersAreActive ? 'Prueba con otros criterios o limpia los filtros.' : 'Vuelve pronto: nuevas aventuras están en camino.'}</p>
              {filtersAreActive && (
                <button className="filter-clear filter-clear--empty" type="button" onClick={clearFilters}>
                  LIMPIAR FILTROS
                </button>
              )}
            </div>
          )}

          {status === 'success' && games.length > 0 && (
            <div className="game-grid">
              {games.map((game, index) => (
                <GameCard key={game.id} game={game} index={index} />
              ))}
            </div>
          )}
        </section>
      </main>
    </SiteLayout>
  )
}

export default HomePage
