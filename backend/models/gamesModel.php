<?php

declare(strict_types=1);

function findActiveGames(PDO $connection, array $filters = []): array
{
    $conditions = ['g.is_active = 1'];
    $parameters = [];

    if ($filters['search'] !== '') {
        $conditions[] = 'g.title LIKE :search';
        $parameters['search'] = '%' . $filters['search'] . '%';
    }

    if ($filters['category_id'] !== null) {
        $conditions[] = 'EXISTS (
            SELECT 1
            FROM game_categories gc
            WHERE gc.game_id = g.id AND gc.category_id = :category_id
        )';
        $parameters['category_id'] = $filters['category_id'];
    }

    if ($filters['platform_id'] !== null) {
        $conditions[] = 'EXISTS (
            SELECT 1
            FROM game_platforms gp
            WHERE gp.game_id = g.id AND gp.platform_id = :platform_id
        )';
        $parameters['platform_id'] = $filters['platform_id'];
    }

    if ($filters['max_price'] !== null) {
        $conditions[] = 'g.price <= :max_price';
        $parameters['max_price'] = $filters['max_price'];
    }

    $sql = 'SELECT g.id, g.title, g.description, g.price, g.stock,
                   g.release_date, g.image_url
            FROM games g
            WHERE ' . implode(' AND ', $conditions) . '
            ORDER BY g.id ASC';
    $statement = $connection->prepare($sql);
    $statement->execute($parameters);

    return $statement->fetchAll();
}

function findActiveGameById(PDO $connection, int $gameId): ?array
{
    $statement = $connection->prepare(
        'SELECT id, title, description, price, stock, release_date, image_url
         FROM games
         WHERE id = :id AND is_active = 1'
    );
    $statement->execute(['id' => $gameId]);
    $game = $statement->fetch();

    if ($game === false) {
        return null;
    }

    $game['categories'] = findGameTaxonomy(
        $connection,
        'categories',
        'game_categories',
        'category_id',
        $gameId
    );
    $game['platforms'] = findGameTaxonomy(
        $connection,
        'platforms',
        'game_platforms',
        'platform_id',
        $gameId
    );

    return $game;
}

function findCategories(PDO $connection): array
{
    return $connection
        ->query('SELECT id, name FROM categories ORDER BY name ASC')
        ->fetchAll();
}

function findPlatforms(PDO $connection): array
{
    return $connection
        ->query('SELECT id, name FROM platforms ORDER BY name ASC')
        ->fetchAll();
}

function findGameTaxonomy(
    PDO $connection,
    string $taxonomyTable,
    string $linkTable,
    string $taxonomyIdColumn,
    int $gameId
): array {
    $allowedTables = [
        'categories' => ['game_categories', 'category_id'],
        'platforms' => ['game_platforms', 'platform_id'],
    ];

    if (
        !isset($allowedTables[$taxonomyTable])
        || $allowedTables[$taxonomyTable] !== [$linkTable, $taxonomyIdColumn]
    ) {
        throw new LogicException('Unsupported game taxonomy query.');
    }

    $sql = sprintf(
        'SELECT t.id, t.name
         FROM %s t
         INNER JOIN %s link ON link.%s = t.id
         WHERE link.game_id = :game_id
         ORDER BY t.name ASC',
        $taxonomyTable,
        $linkTable,
        $taxonomyIdColumn
    );
    $statement = $connection->prepare($sql);
    $statement->execute(['game_id' => $gameId]);

    return $statement->fetchAll();
}
