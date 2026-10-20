<?php

declare(strict_types=1);

require_once __DIR__ . '/../controllers/gamesController.php';
require_once __DIR__ . '/../controllers/authController.php';
require_once __DIR__ . '/../controllers/cartController.php';

return [
    'GET /api/auth/csrf' => static function (): array {
        return getCsrfToken();
    },
    'POST /api/auth/register' => static function (): ApiResponse {
        return registerAccount();
    },
    'POST /api/auth/login' => static function (): array {
        return loginAccount();
    },
    'GET /api/auth/me' => static function (): array {
        return getAuthenticatedProfile();
    },
    'POST /api/auth/logout' => static function (): array {
        return logoutAccount();
    },
    'GET /api/cart' => static function (): array {
        return getAuthenticatedCart();
    },
    'POST /api/cart/items' => static function (): array {
        return addCartItem();
    },
    'PATCH /api/cart/items/{game_id}' => static function (array $parameters): array {
        return updateCartItem($parameters);
    },
    'DELETE /api/cart/items/{game_id}' => static function (array $parameters): array {
        return removeCartItem($parameters);
    },
    'GET /api/health' => static function (): array {
        databaseConnection();

        return [
            'status' => 'ok',
            'api' => 'up',
            'database' => 'connected',
        ];
    },
    'GET /api/games' => static function (): array {
        return [
            'games' => getActiveGames($_GET),
        ];
    },
    'GET /api/games/{id}' => static function (array $parameters): array {
        return getActiveGame($parameters);
    },
    'GET /api/categories' => static function (): array {
        return getAvailableCategories();
    },
    'GET /api/platforms' => static function (): array {
        return getAvailablePlatforms();
    },
];
