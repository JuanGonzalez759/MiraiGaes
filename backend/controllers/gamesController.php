<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/gamesModel.php';

function getActiveGames(array $query): array
{
    $filters = [
        'search' => '',
        'category_id' => null,
        'platform_id' => null,
        'max_price' => null,
    ];

    if (isset($query['search'])) {
        if (!is_string($query['search'])) {
            throw new HttpException(400, 'Search must be a string.');
        }

        $filters['search'] = trim($query['search']);

        if (strlen($filters['search']) > 150) {
            throw new HttpException(400, 'Search must not exceed 150 characters.');
        }
    }

    foreach (['category_id', 'platform_id'] as $filterName) {
        if (!isset($query[$filterName]) || $query[$filterName] === '') {
            continue;
        }

        $filterValue = filter_var($query[$filterName], FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);

        if ($filterValue === false) {
            throw new HttpException(400, $filterName . ' must be a positive integer.');
        }

        $filters[$filterName] = $filterValue;
    }

    if (isset($query['max_price']) && $query['max_price'] !== '') {
        if (
            !is_string($query['max_price'])
            || preg_match('/^\d{1,8}(?:\.\d{1,2})?$/', $query['max_price']) !== 1
        ) {
            throw new HttpException(400, 'max_price must be a non-negative price.');
        }

        $filters['max_price'] = $query['max_price'];
    }

    return findActiveGames(databaseConnection(), $filters);
}

function getActiveGame(array $parameters): array
{
    $gameId = filter_var($parameters['id'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);

    if ($gameId === false) {
        throw new HttpException(400, 'Game id must be a positive integer.');
    }

    $game = findActiveGameById(databaseConnection(), $gameId);

    if ($game === null) {
        throw new HttpException(404, 'Game not found.');
    }

    return ['game' => $game];
}

function getAvailableCategories(): array
{
    return ['categories' => findCategories(databaseConnection())];
}

function getAvailablePlatforms(): array
{
    return ['platforms' => findPlatforms(databaseConnection())];
}
