import SiteLayout from '../components/SiteLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function ProfilePage() {
  const { user, isLoading, authError } = useAuth()

  return (
    <SiteLayout>
      <main className="account-page">
        <section className="account-panel profile-panel">
          <p className="section-heading__eyebrow">CUENTA MIRAI / PERFIL</p>
          {isLoading ? (
            <div className="catalog-message" role="status">
              <span className="loading-mark" />
              <p>Comprobando tu sesión...</p>
            </div>
          ) : authError ? (
            <p className="form-message form-message--error" role="alert">{authError}</p>
          ) : !user ? (
            <>
              <h1>Inicia sesión.</h1>
              <p className="account-panel__intro">Necesitas acceder para consultar tu perfil.</p>
              <a className="account-submit account-submit--link" href="/login">IR A INICIAR SESIÓN</a>
            </>
          ) : (
            <>
              <h1>Hola, {user.full_name}.</h1>
              <p className="account-panel__intro">Tu perfil de jugador en MiraiGames.</p>
              <dl className="profile-details">
                <div><dt>NOMBRE</dt><dd>{user.full_name}</dd></div>
                <div><dt>CORREO</dt><dd>{user.email}</dd></div>
                <div><dt>CUENTA</dt><dd>{user.role === 'admin' ? 'Administrador' : 'Jugador'}</dd></div>
                <div><dt>MIEMBRO DESDE</dt><dd>{user.created_at}</dd></div>
              </dl>
            </>
          )}
        </section>
      </main>
    </SiteLayout>
  )
}

export default ProfilePage
