<?php

declare(strict_types=1);

function findCartIdByUserId(PDO $connection, int $userId): ?int
{
    $statement = $connection->prepare(
        'SELECT id FROM carts WHERE user_id = :user_id LIMIT 1'
    );
    $statement->execute(['user_id' => $userId]);
    $cartId = $statement->fetchColumn();

    return $cartId === false ? null : (int) $cartId;
}

function lockCartIdByUserId(PDO $connection, int $userId): ?int
{
    $statement = $connection->prepare(
        'SELECT id FROM carts WHERE user_id = :user_id FOR UPDATE'
    );
    $statement->execute(['user_id' => $userId]);
    $cartId = $statement->fetchColumn();

    return $cartId === false ? null : (int) $cartId;
}

function createOrLockCartForUser(PDO $connection, int $userId): int
{
    $statement = $connection->prepare(
        'INSERT INTO carts (user_id) VALUES (:user_id)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)'
    );
    $statement->execute(['user_id' => $userId]);

    $statement = $connection->prepare(
        'SELECT id FROM carts WHERE user_id = :user_id FOR UPDATE'
    );
    $statement->execute(['user_id' => $userId]);
    $cartId = $statement->fetchColumn();

    if ($cartId === false) {
        throw new RuntimeException('Cart could not be loaded after creation.');
    }

    return (int) $cartId;
}

function findCartItemQuantity(PDO $connection, int $cartId, int $gameId): ?int
{
    $statement = $connection->prepare(
        'SELECT quantity
         FROM cart_details
         WHERE cart_id = :cart_id AND game_id = :game_id
         LIMIT 1'
    );
    $statement->execute([
        'cart_id' => $cartId,
        'game_id' => $gameId,
    ]);
    $quantity = $statement->fetchColumn();

    return $quantity === false ? null : (int) $quantity;
}

function findGameForCartUpdate(PDO $connection, int $gameId): ?array
{
    $statement = $connection->prepare(
        'SELECT id, title, price, stock, image_url, is_active
         FROM games
         WHERE id = :id
         FOR UPDATE'
    );
    $statement->execute(['id' => $gameId]);
    $game = $statement->fetch();

    return $game === false ? null : $game;
}

function saveCartItemQuantity(
    PDO $connection,
    int $cartId,
    int $gameId,
    int $quantity
): void {
    $statement = $connection->prepare(
        'INSERT INTO cart_details (cart_id, game_id, quantity)
         VALUES (:cart_id, :game_id, :quantity)
         ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)'
    );
    $statement->execute([
        'cart_id' => $cartId,
        'game_id' => $gameId,
        'quantity' => $quantity,
    ]);
}

function deleteCartItem(PDO $connection, int $cartId, int $gameId): int
{
    $statement = $connection->prepare(
        'DELETE FROM cart_details
         WHERE cart_id = :cart_id AND game_id = :game_id'
    );
    $statement->execute([
        'cart_id' => $cartId,
        'game_id' => $gameId,
    ]);

    return $statement->rowCount();
}

function findCartContents(PDO $connection, int $cartId): array
{
    $statement = $connection->prepare(
        'SELECT cd.game_id, cd.quantity, g.title, g.price AS unit_price,
                g.stock, g.image_url, g.is_active,
                CAST(g.price * cd.quantity AS DECIMAL(20, 2)) AS subtotal
         FROM cart_details cd
         INNER JOIN games g ON g.id = cd.game_id
         WHERE cd.cart_id = :cart_id
         ORDER BY g.title ASC, g.id ASC'
    );
    $statement->execute(['cart_id' => $cartId]);
    $items = $statement->fetchAll();

    $statement = $connection->prepare(
        'SELECT CAST(COALESCE(SUM(g.price * cd.quantity), 0.00) AS DECIMAL(20, 2))
         FROM cart_details cd
         INNER JOIN games g ON g.id = cd.game_id
         WHERE cd.cart_id = :cart_id'
    );
    $statement->execute(['cart_id' => $cartId]);

    foreach ($items as &$item) {
        $item['quantity'] = (int) $item['quantity'];
        $item['stock'] = (int) $item['stock'];
        $item['is_active'] = (bool) $item['is_active'];
    }
    unset($item);

    return [
        'items' => $items,
        'total' => (string) $statement->fetchColumn(),
    ];
}
