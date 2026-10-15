import GameCover from './GameCover.jsx'

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

function GameCard({ game, index }) {
  return (
    <a className="game-card" href={`/games/${game.id}`} aria-label={`Ver detalles de ${game.title}`}>
      <GameCover game={game} index={index} />

      <div className="game-card__content">
        <div className="game-card__eyebrow">
          <span>VIDEOJUEGO</span>
          {game.release_date && <span>{game.release_date.slice(0, 4)}</span>}
        </div>
        <h3>{game.title}</h3>
        <p className="game-card__description">
          {game.description || 'Descubre una nueva aventura.'}
        </p>
        <div className="game-card__footer">
          <strong>{priceFormatter.format(Number(game.price))}</strong>
          <span className={game.stock > 0 ? 'stock stock--available' : 'stock'}>
            {game.stock > 0 ? `${game.stock} en stock` : 'Agotado'}
          </span>
        </div>
        <span className="game-card__details">VER DETALLES <span aria-hidden="true">↗</span></span>
      </div>
    </a>
  )
}

export default GameCard
