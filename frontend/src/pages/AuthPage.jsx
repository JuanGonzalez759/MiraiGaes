import { useState } from 'react'
import SiteLayout from '../components/SiteLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { signIn, signUp, isLoading, authError } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (isRegister && password !== passwordConfirmation) {
      setErrorMessage('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)

    try {
      if (isRegister) {
        await signUp({ full_name: fullName, email, password })
        setSuccessMessage('Cuenta creada. Ya puedes iniciar sesión.')
        setPassword('')
        setPasswordConfirmation('')
      } else {
        await signIn({ email, password })
        window.location.assign('/profile')
      }
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SiteLayout>
      <main className="account-page">
        <section className="account-panel">
          <p className="section-heading__eyebrow">
            CUENTA MIRAI / {isRegister ? 'NUEVO REGISTRO' : 'ACCESO SEGURO'}
          </p>
          <h1>{isRegister ? 'Crea tu cuenta.' : 'Bienvenido de nuevo.'}</h1>
          <p className="account-panel__intro">
            {isRegister
              ? 'Abre la puerta a tu próximo universo de juego.'
              : 'Inicia sesión para acceder a tu perfil Mirai.'}
          </p>

          {authError && <p className="form-message form-message--error" role="alert">{authError}</p>}
          {errorMessage && <p className="form-message form-message--error" role="alert">{errorMessage}</p>}
          {successMessage && <p className="form-message form-message--success" role="status">{successMessage}</p>}

          <form className="account-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                <span>NOMBRE</span>
                <input
                  autoComplete="name"
                  maxLength="100"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            )}
            <label>
              <span>CORREO ELECTRÓNICO</span>
              <input
                autoComplete="email"
                maxLength="254"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              <span>CONTRASEÑA</span>
              <input
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                maxLength="72"
                minLength={isRegister ? 12 : undefined}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {isRegister && <small>Al menos 12 caracteres (máximo 72 bytes).</small>}
            </label>
            {isRegister && (
              <label>
                <span>CONFIRMAR CONTRASEÑA</span>
                <input
                  autoComplete="new-password"
                  maxLength="72"
                  minLength="12"
                  required
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                />
              </label>
            )}
            <button className="account-submit" disabled={isLoading || isSubmitting || Boolean(authError)}>
              {isSubmitting
                ? 'PROCESANDO...'
                : isRegister
                  ? 'CREAR CUENTA'
                  : 'INICIAR SESIÓN'}
            </button>
          </form>

          <p className="account-switch">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
            <a href={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </a>
          </p>
        </section>
      </main>
    </SiteLayout>
  )
}

export default AuthPage
