import HomePage from './pages/HomePage.jsx'
import GameDetailPage from './pages/GameDetailPage.jsx'

function App() {
  const match = window.location.pathname.match(/^\/games\/([^/]+)\/?$/)

  if (match) {
    return <GameDetailPage gameId={match[1]} />
  }

  return <HomePage />
}

export default App
