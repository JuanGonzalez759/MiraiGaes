<?php

declare(strict_types=1);

function startAppSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    $isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== ''
        && strtolower($_SERVER['HTTPS']) !== 'off';

    session_name('MIRAISESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    if (!session_start()) {
        throw new RuntimeException('Unable to start the session.');
    }
}

function createCsrfToken(): string
{
    startAppSession();

    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function requireValidCsrfToken(): void
{
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    $requestToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if (
        !is_string($sessionToken)
        || $sessionToken === ''
        || !is_string($requestToken)
        || !hash_equals($sessionToken, $requestToken)
    ) {
        throw new HttpException(403, 'CSRF token is invalid or missing.');
    }
}

function requireSameOriginRequest(): void
{
    $requestOrigin = normalizeOrigin($_SERVER['HTTP_ORIGIN'] ?? '');
    $configuredOrigin = getenv('APP_ORIGIN');

    if ($configuredOrigin === false || $configuredOrigin === '') {
        $scheme = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== ''
            && strtolower($_SERVER['HTTPS']) !== 'off'
            ? 'https'
            : 'http';
        $configuredOrigin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    }

    $expectedOrigin = normalizeOrigin($configuredOrigin);

    if ($requestOrigin === null || $expectedOrigin === null || $requestOrigin !== $expectedOrigin) {
        throw new HttpException(403, 'Request origin is not allowed.');
    }
}

function normalizeOrigin(string $origin): ?string
{
    $parts = parse_url($origin);

    if (
        $parts === false
        || !isset($parts['scheme'], $parts['host'])
        || !in_array(strtolower($parts['scheme']), ['http', 'https'], true)
        || isset($parts['user'])
        || isset($parts['pass'])
        || isset($parts['query'])
        || isset($parts['fragment'])
        || (isset($parts['path']) && $parts['path'] !== '' && $parts['path'] !== '/')
    ) {
        return null;
    }

    $scheme = strtolower($parts['scheme']);
    $host = strtolower($parts['host']);
    $port = $parts['port'] ?? null;

    if (($scheme === 'http' && $port === 80) || ($scheme === 'https' && $port === 443)) {
        $port = null;
    }

    return $scheme . '://' . $host . ($port === null ? '' : ':' . $port);
}

function currentSessionUserId(): ?int
{
    $userId = $_SESSION['user_id'] ?? null;

    return is_int($userId) && $userId > 0 ? $userId : null;
}

function regenerateAuthenticatedSession(int $userId): string
{
    if (!session_regenerate_id(true)) {
        throw new RuntimeException('Unable to rotate the session identifier.');
    }

    $_SESSION = [
        'user_id' => $userId,
        'csrf_token' => bin2hex(random_bytes(32)),
    ];

    return $_SESSION['csrf_token'];
}

function destroyAppSession(): void
{
    $_SESSION = [];

    if (session_status() === PHP_SESSION_ACTIVE && !session_destroy()) {
        throw new RuntimeException('Unable to destroy the session.');
    }

    $cookie = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $cookie['path'],
        'domain' => $cookie['domain'],
        'secure' => $cookie['secure'],
        'httponly' => $cookie['httponly'],
        'samesite' => $cookie['samesite'] ?? 'Lax',
    ]);
}
