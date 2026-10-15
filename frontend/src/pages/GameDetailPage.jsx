import { useEffect, useState } from 'react'
import GameCover from '../components/GameCover.jsx'
import SiteLayout from '../components/SiteLayout.jsx'
import { getGame } from '../services/gamesService.js'

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

function GameDetailPage({ gameId }) {
  const [game, setGame] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadGame() {
      try {
        const result = await getGame(gameId, { signal: controller.signal })
        setGame(result)
        setStatus('success')
      } catch (error) {
        if (error.name === 'AbortError') return
        setErrorMessage(error.message)
        setStatus('error')
      }
    }

    loadGame()
    return () => controller.abort()
  }, [gameId, retryKey])

  return (
    <SiteLayout>
      <main className="detail-page">
        <a className="detail-back" href="/#catalogo">← VOLVER AL CATÁLOGO</a>

        {status === 'loading' && (
          <div className="catalog-message" role="status">
            <span className="loading-mark" />
            <p>Cargando ficha del videojuego...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="catalog-message catalog-message--error" role="alert">
            <p className="catalog-message__code">FICHA / NO DISPONIBLE</p>
            <h1>No se pudo cargar el videojuego.</h1>
            <p>{errorMessage}</p>
            <button
              className="detail-retry"
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              VOLVER A INTENTAR
            </button>
          </div>
        )}

        {status === 'success' && game && (
          <article className="game-detail">
            <div className="game-detail__cover">
              <GameCover game={game} index={Number(game.id) - 1} showIndex={false} />
            </div>
            <div className="game-detail__content">
              <p className="section-heading__eyebrow">FICHA DE JUEGO / {String(game.id).padStart(3, '0')}</p>
              <h1>{game.title}</h1>
              <p className="game-detail__description">
                {game.description || 'No hay una descripción disponible para este videojuego.'}
              </p>
              <div className="game-detail__price">{priceFormatter.format(Number(game.price))}</div>
              <p className={game.stock > 0 ? 'game-detail__stock game-detail__stock--available' : 'game-detail__stock'}>
                {game.stock > 0 ? `${game.stock} unidades disponibles` : 'Actualmente agotado'}
              </p>
              <dl className="game-detail__facts">
                <div>
                  <dt>LANZAMIENTO</dt>
                  <dd>{game.release_date || 'Fecha no disponible'}</dd>
                </div>
                <div>
                  <dt>CATEGORÍAS</dt>
                  <dd className="detail-tags">
                    {game.categories.length
                      ? game.categories.map((category) => <span key={category.id}>{category.name}</span>)
                      : 'Sin categorías'}
                  </dd>
                </div>
                <div>
                  <dt>PLATAFORMAS</dt>
                  <dd className="detail-tags">
                    {game.platforms.length
                      ? game.platforms.map((platform) => <span key={platform.id}>{platform.name}</span>)
                      : 'Sin plataformas'}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
        )}
      </main>
    </SiteLayout>
  )
}

export default GameDetailPage
