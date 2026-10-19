import HomePage from './pages/HomePage.jsx'
import GameDetailPage from './pages/GameDetailPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

function App() {
  const path = window.location.pathname
  const match = path.match(/^\/games\/([^/]+)\/?$/)

  let page = <HomePage />

  if (match) page = <GameDetailPage gameId={match[1]} />
  else if (path === '/login') page = <AuthPage mode="login" />
  else if (path === '/register') page = <AuthPage mode="register" />
  else if (path === '/profile') page = <ProfilePage />

  return <AuthProvider>{page}</AuthProvider>
}

export default App
