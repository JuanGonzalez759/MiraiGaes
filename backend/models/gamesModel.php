<?php

declare(strict_types=1);

function findActiveGames(PDO $connection): array
{
    $statement = $connection->prepare(
        'SELECT id, title, description, price, stock, release_date, image_url
         FROM games
         WHERE is_active = 1
         ORDER BY id ASC'
    );
    $statement->execute();

    return $statement->fetchAll();
}
