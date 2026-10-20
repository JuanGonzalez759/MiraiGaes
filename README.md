# MiraiGames

Proyecto de tienda online de videojuegos para el proyecto final de DAW.

## Tecnologías

- Frontend: React y Vite (JavaScript).
- Backend: PHP 8.x, PDO y API REST.
- Base de datos: MySQL.

## Estructura

- `frontend/`: aplicación React.
- `backend/`: API REST PHP y configuración de conexión a MySQL.
- `database/`: script de creación del esquema MySQL.
- `docs/`: documentación adicional.
- `tests/`: pruebas del proyecto.

## Requisitos

- Node.js LTS compatible con Vite.
- PHP 8.x con las extensiones `PDO` y `pdo_mysql`.
- MySQL 8.x y la base de datos `mirai_games` creada con `database/mirai_games.sql`.

Comprueba la instalación de PHP con `php --version` y que `php -m` muestre
`PDO` y `pdo_mysql`.

## Desarrollo del frontend

Desde `frontend/`:

```bash
npm install
npm run dev
```

Para generar la compilación:

```bash
npm run build
```

Vite está configurado para reenviar las peticiones `/api` a `http://127.0.0.1:8000`.
El backend incluye `GET /api/health`, el catálogo y sus filtros, autenticación
con sesión y los endpoints autenticados del carrito:
`GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/{game_id}` y
`DELETE /api/cart/items/{game_id}`.

## Desarrollo del backend

Para desarrollo local, crea `backend/.env` (no se sube a Git) con la
configuración de MySQL y el origen permitido:

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=mirai_games
MYSQL_USER=tu_usuario_mysql
MYSQL_PASSWORD=tu_contrasena_mysql
APP_ORIGIN=http://127.0.0.1:5173
```

Sustituye los valores de usuario y contraseña por los de tu entorno local; no
uses credenciales reales en archivos versionados. También puedes configurar
estas variables en el entorno del sistema, que tiene prioridad sobre `.env`.
Desde la raíz del repositorio, inicia PHP:

```powershell
php -S 127.0.0.1:8000 -t backend backend/index.php
```

No guardes las credenciales en archivos versionados. En otra terminal, comprueba
la API con `Invoke-RestMethod http://127.0.0.1:8000/api/health` o abre esa URL
en el navegador. Debe devolver `status: ok`, `api: up` y `database: connected`.

La autenticación usa sesiones PHP y cookies `HttpOnly`. Para probar el frontend,
inicia Vite en otra terminal dentro de `frontend/` y abre
`http://127.0.0.1:5173` (el origen debe coincidir con `APP_ORIGIN`). Las rutas de autenticación son `/api/auth/csrf`, `/api/auth/register`,
`/api/auth/login`, `/api/auth/me` y `/api/auth/logout`. Las solicitudes que
modifican datos requieren el token CSRF obtenido en la primera ruta y un usuario
autenticado cuando se trata del carrito. El backend aún no implementa pedidos,
administración del catálogo ni pagos.
