<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/environment.php';
loadEnvironmentFile(__DIR__ . '/../.env');
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/httpException.php';
require_once __DIR__ . '/../helpers/stripe.php';
require_once __DIR__ . '/../models/ordersModel.php';

try {
    $client = stripeClient();
    $connection = databaseConnection();
    $orders = findExpiredReservedOrders($connection);
    $recovered = 0;
    $unresolved = 0;

    foreach ($orders as $order) {
        $orderId = (int) $order['id'];
        $sessionId = $order['stripe_session_id'];

        if (!is_string($sessionId) || $sessionId === '') {
            try {
                createOrRetrieveStripeSession($connection, $order, true);
                $refresh = $connection->prepare(
                    'SELECT stripe_session_id FROM orders WHERE id = :order_id'
                );
                $refresh->execute(['order_id' => $orderId]);
                $sessionId = $refresh->fetchColumn();
            } catch (Throwable) {
                ++$unresolved;
                error_log('Recovery could not reconcile missing Stripe session for order ' . $orderId . '.');
                continue;
            }

            if (!is_string($sessionId) || $sessionId === '') {
                ++$unresolved;
                error_log('Recovery did not obtain a Stripe session for order ' . $orderId . '.');
                continue;
            }
        }

        try {
            $session = $client->checkout->sessions->retrieve($sessionId);

            if ($session->status === 'open') {
                $client->checkout->sessions->expire($sessionId);
                $session = $client->checkout->sessions->retrieve($sessionId);
            }

            if ($session->status === 'expired' && $session->payment_status !== 'paid') {
                if (releaseReservedOrder($connection, $orderId, $sessionId)) {
                    ++$recovered;
                }
            } elseif ($session->status === 'complete' && $session->payment_status === 'paid') {
                ++$unresolved;
                error_log('Recovery found paid Stripe session awaiting webhook: order ' . $orderId . '.');
            } else {
                ++$unresolved;
                error_log('Recovery retained uncertain Stripe session for order ' . $orderId . '.');
            }
        } catch (Throwable) {
            ++$unresolved;
            error_log('Stripe recovery failed for order ' . $orderId . '.');
        }
    }

    fwrite(STDOUT, sprintf(
        "Processed %d expired-order candidate(s); released %d reservation(s); %d require reconciliation.\n",
        count($orders),
        $recovered,
        $unresolved
    ));

    exit($unresolved > 0 ? 2 : 0);
} catch (Throwable) {
    error_log('Pending order recovery could not run.');
    fwrite(STDERR, "Recovery failed. Check the PHP error log and server configuration.\n");
    exit(1);
}
