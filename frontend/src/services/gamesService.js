async function getJson(url, signal) {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(
      data?.message || `No se pudo completar la solicitud (HTTP ${response.status}).`,
    )
  }

  return response.json()
}

export async function getGames(filters = {}, { signal } = {}) {
  const query = new URLSearchParams()

  if (filters.search?.trim()) query.set('search', filters.search.trim())
  if (filters.categoryId) query.set('category_id', filters.categoryId)
  if (filters.platformId) query.set('platform_id', filters.platformId)
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') {
    query.set('max_price', filters.maxPrice)
  }

  const queryString = query.toString()
  const suffix = queryString ? `?${queryString}` : ''
  const data = await getJson(`/api/games${suffix}`, signal)
  if (!Array.isArray(data.games)) {
    throw new Error('La respuesta de la API no contiene una lista de videojuegos.')
  }

  return data.games
}

export async function getCategories({ signal } = {}) {
  const data = await getJson('/api/categories', signal)

  if (!Array.isArray(data.categories)) {
    throw new Error('La respuesta de la API no contiene una lista de categorías.')
  }

  return data.categories
}

export async function getPlatforms({ signal } = {}) {
  const data = await getJson('/api/platforms', signal)

  if (!Array.isArray(data.platforms)) {
    throw new Error('La respuesta de la API no contiene una lista de plataformas.')
  }

  return data.platforms
}

export async function getGame(id, { signal } = {}) {
  const data = await getJson(`/api/games/${encodeURIComponent(id)}`, signal)

  if (!data.game || typeof data.game !== 'object') {
    throw new Error('La respuesta de la API no contiene el videojuego.')
  }

  return data.game
}
