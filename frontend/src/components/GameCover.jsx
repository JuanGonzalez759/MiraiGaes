import { useState } from 'react'

function GameCover({ game, index, showIndex = true }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = Boolean(game.image_url) && !imageFailed

  return (
    <div className="game-card__cover">
      {hasImage ? (
        <img
          className="game-card__image"
          src={game.image_url}
          alt={`Portada de ${game.title}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={`cover-art cover-art--${(index % 3) + 1}`} aria-hidden="true">
          <span className="cover-art__kanji">未来</span>
          <span className="cover-art__label">MIRAI / GAME {String(index + 1).padStart(2, '0')}</span>
          <span className="cover-art__orb" />
          <span className="cover-art__line" />
        </div>
      )}
      {showIndex && (
        <span className="game-card__index">{String(index + 1).padStart(2, '0')}</span>
      )}
    </div>
  )
}

export default GameCover
