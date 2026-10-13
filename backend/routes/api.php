<?php

declare(strict_types=1);

require_once __DIR__ . '/../controllers/gamesController.php';

return [
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
            'games' => getActiveGames(),
        ];
    },
];
