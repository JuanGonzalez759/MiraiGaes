<?php

declare(strict_types=1);

function createOrFindReservedOrder(PDO $connection, int $userId, string $idempotencyKey): array
{
    $connection->beginTransaction();

    try {
        $cartStatement = $connection->prepare(
            'SELECT id FROM carts WHERE user_id = :user_id FOR UPDATE'
        );
        $cartStatement->execute(['user_id' => $userId]);
        $cartId = $cartStatement->fetchColumn();

        if ($cartId === false) {
            throw new HttpException(422, 'The cart is empty.');
        }

        $existing = findOrderByIdempotencyKey($connection, $idempotencyKey, true);

        if ($existing !== null) {
            if ((int) $existing['user_id'] !== $userId) {
                throw new HttpException(409, 'This checkout key is already in use.');
            }

            $connection->commit();
            return $existing;
        }

        $cartItemsStatement = $connection->prepare(
            'SELECT game_id, quantity
             FROM cart_details
             WHERE cart_id = :cart_id
             ORDER BY game_id ASC
             FOR UPDATE'
        );
        $cartItemsStatement->execute(['cart_id' => (int) $cartId]);
        $cartRows = $cartItemsStatement->fetchAll();

        if ($cartRows === []) {
            throw new HttpException(422, 'The cart is empty.');
        }

        $items = [];
        $totalCents = 0;

        foreach ($cartRows as $cartRow) {
            $gameId = (int) $cartRow['game_id'];
            $quantity = (int) $cartRow['quantity'];
            $gameStatement = $connection->prepare(
                'SELECT id, title, price, stock, is_active
                 FROM games
                 WHERE id = :game_id
                 FOR UPDATE'
            );
            $gameStatement->execute(['game_id' => $gameId]);
            $game = $gameStatement->fetch();

            if ($game === false || !(bool) $game['is_active']) {
                throw new HttpException(409, 'A game in the cart is no longer available.');
            }

            if ($quantity < 1 || $quantity > (int) $game['stock']) {
                throw new HttpException(409, 'A requested quantity exceeds available stock.');
            }

            $unitPrice = (string) $game['price'];
            $unitPriceCents = decimalToCents($unitPrice);
            $totalCents += $unitPriceCents * $quantity;

            if ($totalCents > 99999999) {
                throw new HttpException(422, 'The order total exceeds Stripe Checkout limits.');
            }

            $items[] = [
                'game_id' => $gameId,
                'game_title' => (string) $game['title'],
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
            ];
        }

        $insertOrder = $connection->prepare(
            "INSERT INTO orders
                (user_id, checkout_idempotency_key, reservation_expires_at, inventory_status)
             VALUES
                (:user_id, :idempotency_key, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 20 HOUR), 'reserved')"
        );
        $insertOrder->execute([
            'user_id' => $userId,
            'idempotency_key' => $idempotencyKey,
        ]);
        $orderId = (int) $connection->lastInsertId();

        $insertDetail = $connection->prepare(
            'INSERT INTO order_details (order_id, game_id, game_title, quantity, unit_price)
             VALUES (:order_id, :game_id, :game_title, :quantity, :unit_price)'
        );
        $decrementStock = $connection->prepare(
            'UPDATE games
             SET stock = stock - :quantity
             WHERE id = :game_id AND stock >= :minimum_stock'
        );

        foreach ($items as $item) {
            $decrementStock->execute([
                'quantity' => $item['quantity'],
                'game_id' => $item['game_id'],
                'minimum_stock' => $item['quantity'],
            ]);

            if ($decrementStock->rowCount() !== 1) {
                throw new HttpException(409, 'A requested quantity exceeds available stock.');
            }

            $insertDetail->execute([
                'order_id' => $orderId,
                'game_id' => $item['game_id'],
                'game_title' => $item['game_title'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
            ]);
        }

        $clearCart = $connection->prepare('DELETE FROM cart_details WHERE cart_id = :cart_id');
        $clearCart->execute(['cart_id' => (int) $cartId]);

        $connection->commit();

        return findOrderById($connection, $orderId, $userId)
            ?? throw new RuntimeException('Created order could not be reloaded.');
    } catch (Throwable $exception) {
        if ($connection->inTransaction()) {
            $connection->rollBack();
        }

        if (
            $exception instanceof PDOException
            && ($exception->errorInfo[1] ?? null) === 1062
        ) {
            $existing = findOrderByIdempotencyKey($connection, $idempotencyKey);

            if ($existing !== null) {
                if ((int) $existing['user_id'] !== $userId) {
                    throw new HttpException(409, 'This checkout key is already in use.');
                }

                return $existing;
            }
        }

        throw $exception;
    }
}

function findOrderByIdempotencyKey(
    PDO $connection,
    string $idempotencyKey,
    bool $forUpdate = false
): ?array {
    $statement = $connection->prepare(
        'SELECT id, user_id, stripe_session_id, payment_status, reservation_expires_at,
                inventory_status, created_at
         FROM orders
         WHERE checkout_idempotency_key = :idempotency_key'
         . ($forUpdate ? ' FOR UPDATE' : '')
    );
    $statement->execute(['idempotency_key' => $idempotencyKey]);
    $order = $statement->fetch();

    return $order === false ? null : $order;
}

function findOrderById(PDO $connection, int $orderId, int $userId): ?array
{
    $statement = $connection->prepare(
        'SELECT o.id, o.user_id, o.stripe_session_id, o.payment_status, o.inventory_status,
                o.created_at, o.paid_at, o.reservation_expires_at,
                CAST((
                    SELECT COALESCE(SUM(od.quantity * od.unit_price), 0.00)
                    FROM order_details od
                    WHERE od.order_id = o.id
                ) AS DECIMAL(12, 2)) AS total
         FROM orders o
         WHERE o.id = :order_id AND o.user_id = :user_id
         LIMIT 1'
    );
    $statement->execute([
        'order_id' => $orderId,
        'user_id' => $userId,
    ]);
    $order = $statement->fetch();

    if ($order === false) {
        return null;
    }

    $order['id'] = (int) $order['id'];
    $order['items'] = findOrderItems($connection, $orderId);

    return $order;
}

function findOrderItems(PDO $connection, int $orderId): array
{
    $statement = $connection->prepare(
        'SELECT game_id, game_title, quantity, unit_price
         FROM order_details
         WHERE order_id = :order_id
         ORDER BY game_id ASC'
    );
    $statement->execute(['order_id' => $orderId]);
    $items = $statement->fetchAll();

    foreach ($items as &$item) {
        $item['game_id'] = (int) $item['game_id'];
        $item['quantity'] = (int) $item['quantity'];
        $item['subtotal'] = centsToDecimal(
            decimalToCents((string) $item['unit_price']) * $item['quantity']
        );
    }
    unset($item);

    return $items;
}

function findOrdersForUser(PDO $connection, int $userId): array
{
    $statement = $connection->prepare(
        'SELECT o.id, o.payment_status, o.inventory_status, o.created_at, o.paid_at,
                CAST((
                    SELECT COALESCE(SUM(od.quantity * od.unit_price), 0.00)
                    FROM order_details od
                    WHERE od.order_id = o.id
                ) AS DECIMAL(12, 2)) AS total
         FROM orders o
         WHERE o.user_id = :user_id
         ORDER BY o.created_at DESC, o.id DESC'
    );
    $statement->execute(['user_id' => $userId]);
    $orders = $statement->fetchAll();

    foreach ($orders as &$order) {
        $order['id'] = (int) $order['id'];
    }
    unset($order);

    return $orders;
}

function saveStripeSessionId(PDO $connection, int $orderId, string $sessionId): void
{
    $statement = $connection->prepare(
        "UPDATE orders
         SET stripe_session_id = :session_id
         WHERE id = :order_id
           AND payment_status = 'pending'
           AND inventory_status = 'reserved'
           AND (stripe_session_id IS NULL OR stripe_session_id = :same_session_id)"
    );
    $statement->execute([
        'session_id' => $sessionId,
        'order_id' => $orderId,
        'same_session_id' => $sessionId,
    ]);

    if ($statement->rowCount() === 0) {
        $verify = $connection->prepare(
            'SELECT stripe_session_id FROM orders WHERE id = :order_id'
        );
        $verify->execute(['order_id' => $orderId]);

        if ($verify->fetchColumn() === $sessionId) {
            return;
        }

        throw new RuntimeException('Stripe session could not be associated with its order.');
    }

    if ($statement->rowCount() !== 1) {
        throw new RuntimeException('Stripe session could not be associated with its order.');
    }
}

function lockOrderById(PDO $connection, int $orderId): ?array
{
    $statement = $connection->prepare(
        'SELECT id, user_id, stripe_session_id, payment_status, inventory_status
         FROM orders
         WHERE id = :order_id
         FOR UPDATE'
    );
    $statement->execute(['order_id' => $orderId]);
    $order = $statement->fetch();

    return $order === false ? null : $order;
}

function orderTotalCents(PDO $connection, int $orderId): int
{
    $items = findOrderItems($connection, $orderId);
    $total = 0;

    foreach ($items as $item) {
        $total += decimalToCents((string) $item['unit_price']) * (int) $item['quantity'];
    }

    return $total;
}

function releaseReservedOrder(PDO $connection, int $orderId, string $sessionId): bool
{
    $connection->beginTransaction();

    try {
        $order = lockOrderById($connection, $orderId);

        if (
            $order === null
            || $order['stripe_session_id'] !== $sessionId
            || $order['payment_status'] !== 'pending'
            || $order['inventory_status'] !== 'reserved'
        ) {
            $connection->commit();
            return false;
        }

        $items = findOrderItems($connection, $orderId);
        $restoreStock = $connection->prepare(
            'UPDATE games SET stock = stock + :quantity WHERE id = :game_id'
        );

        foreach ($items as $item) {
            $restoreStock->execute([
                'quantity' => (int) $item['quantity'],
                'game_id' => (int) $item['game_id'],
            ]);

            if ($restoreStock->rowCount() !== 1) {
                throw new RuntimeException('Reserved game stock could not be restored.');
            }
        }

        $updateOrder = $connection->prepare(
            "UPDATE orders
             SET inventory_status = 'released', payment_status = 'expired'
             WHERE id = :order_id
               AND payment_status = 'pending'
               AND inventory_status = 'reserved'"
        );
        $updateOrder->execute(['order_id' => $orderId]);

        if ($updateOrder->rowCount() !== 1) {
            throw new RuntimeException('Expired order state could not be updated.');
        }

        $connection->commit();

        return true;
    } catch (Throwable $exception) {
        if ($connection->inTransaction()) {
            $connection->rollBack();
        }

        throw $exception;
    }
}

function findExpiredReservedOrders(PDO $connection, int $limit = 50): array
{
    $limit = max(1, min(200, $limit));
    $statement = $connection->query(
        "SELECT id, user_id, checkout_idempotency_key, stripe_session_id, payment_status,
                reservation_expires_at, inventory_status
         FROM orders
         WHERE payment_status = 'pending'
           AND inventory_status = 'reserved'
           AND reservation_expires_at <= UTC_TIMESTAMP()
         ORDER BY reservation_expires_at ASC, id ASC
         LIMIT " . $limit
    );

    return $statement->fetchAll();
}

function decimalToCents(string $amount): int
{
    if (preg_match('/^([0-9]+)\\.([0-9]{2})$/', $amount, $matches) !== 1) {
        throw new RuntimeException('Database returned an invalid monetary amount.');
    }

    return ((int) $matches[1] * 100) + (int) $matches[2];
}

function centsToDecimal(int $cents): string
{
    return intdiv($cents, 100) . '.' . str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
}
