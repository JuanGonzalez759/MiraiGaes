<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/jsonRequest.php';
require_once __DIR__ . '/../helpers/session.php';
require_once __DIR__ . '/../models/cartModel.php';

function getAuthenticatedCart(): array
{
    $userId = requireCartUserId();
    $connection = databaseConnection();

    return withCartTransaction($connection, function () use ($connection, $userId): array {
        $cartId = findCartIdByUserId($connection, $userId);

        return [
            'cart' => $cartId === null
                ? ['items' => [], 'total' => '0.00']
                : findCartContents($connection, $cartId),
        ];
    });
}

function addCartItem(): array
{
    $userId = requireCartUserId();
    $payload = readJsonRequest();
    $gameId = validateCartInteger($payload['game_id'] ?? null, 'game_id');
    $quantity = validateCartInteger(
        $payload['quantity'] ?? null,
        'quantity',
        min(4294967295, PHP_INT_MAX)
    );
    $connection = databaseConnection();

    return withCartTransaction($connection, function () use (
        $connection,
        $userId,
        $gameId,
        $quantity
    ): array {
        $cartId = createOrLockCartForUser($connection, $userId);
        $game = findGameForCartUpdate($connection, $gameId);
        requireAvailableGame($game);

        $currentQuantity = findCartItemQuantity($connection, $cartId, $gameId) ?? 0;
        $newQuantity = $currentQuantity + $quantity;

        if ($newQuantity > (int) $game['stock']) {
            throw new HttpException(409, 'Requested quantity exceeds available stock.');
        }

        saveCartItemQuantity($connection, $cartId, $gameId, $newQuantity);

        return ['cart' => findCartContents($connection, $cartId)];
    });
}

function updateCartItem(array $parameters): array
{
    $userId = requireCartUserId();
    $gameId = validateRouteGameId($parameters['game_id'] ?? null);
    $payload = readJsonRequest();
    $quantity = validateCartInteger(
        $payload['quantity'] ?? null,
        'quantity',
        min(4294967295, PHP_INT_MAX)
    );
    $connection = databaseConnection();

    return withCartTransaction($connection, function () use (
        $connection,
        $userId,
        $gameId,
        $quantity
    ): array {
        $cartId = lockCartIdByUserId($connection, $userId);

        if ($cartId === null) {
            throw new HttpException(404, 'Cart item not found.');
        }

        $currentQuantity = findCartItemQuantity($connection, $cartId, $gameId);

        if ($currentQuantity === null) {
            throw new HttpException(404, 'Cart item not found.');
        }

        $game = findGameForCartUpdate($connection, $gameId);

        if ($game === null) {
            throw new HttpException(404, 'Game not found.');
        }

        requireAvailableGame($game);

        if ($quantity > (int) $game['stock']) {
            throw new HttpException(409, 'Requested quantity exceeds available stock.');
        }

        saveCartItemQuantity($connection, $cartId, $gameId, $quantity);

        return ['cart' => findCartContents($connection, $cartId)];
    });
}

function removeCartItem(array $parameters): array
{
    $userId = requireCartUserId();
    $gameId = validateRouteGameId($parameters['game_id'] ?? null);
    $connection = databaseConnection();

    return withCartTransaction($connection, function () use (
        $connection,
        $userId,
        $gameId
    ): array {
        $cartId = lockCartIdByUserId($connection, $userId);

        if ($cartId === null || deleteCartItem($connection, $cartId, $gameId) === 0) {
            throw new HttpException(404, 'Cart item not found.');
        }

        return ['cart' => findCartContents($connection, $cartId)];
    });
}

function requireCartUserId(): int
{
    startAppSession();
    $userId = currentSessionUserId();

    if ($userId === null) {
        throw new HttpException(401, 'Authentication is required.');
    }

    return $userId;
}

function validateRouteGameId(mixed $value): int
{
    $gameId = filter_var($value, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);

    if ($gameId === false) {
        throw new HttpException(422, 'game_id must be a positive integer.');
    }

    return $gameId;
}

function validateCartInteger(mixed $value, string $field, int $maximum = PHP_INT_MAX): int
{
    if (!is_int($value) || $value < 1 || $value > $maximum) {
        throw new HttpException(422, $field . ' must be a positive integer.');
    }

    return $value;
}

function requireAvailableGame(?array $game): void
{
    if ($game === null) {
        throw new HttpException(404, 'Game not found.');
    }

    if (!(bool) $game['is_active']) {
        throw new HttpException(409, 'Game is not available.');
    }
}

function withCartTransaction(PDO $connection, callable $operation): array
{
    if (!$connection->beginTransaction()) {
        throw new RuntimeException('Cart transaction could not be started.');
    }

    try {
        $result = $operation();
        $connection->commit();

        return $result;
    } catch (Throwable $exception) {
        if ($connection->inTransaction()) {
            $connection->rollBack();
        }

        throw $exception;
    }
}
