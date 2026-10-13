<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/gamesModel.php';

function getActiveGames(): array
{
    return findActiveGames(databaseConnection());
}
