<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/jsonRequest.php';
require_once __DIR__ . '/../helpers/session.php';
require_once __DIR__ . '/../models/usersModel.php';

function getCsrfToken(): array
{
    header('Cache-Control: no-store');

    return ['csrf_token' => createCsrfToken()];
}

function registerAccount(): ApiResponse
{
    $payload = readJsonRequest();
    $fullName = validateFullName($payload['full_name'] ?? null);
    $email = validateEmail($payload['email'] ?? null);
    $password = validateRegistrationPassword($payload['password'] ?? null);
    $connection = databaseConnection();

    if (findUserByEmail($connection, $email) !== null) {
        throw new HttpException(409, 'An account with this email already exists.');
    }

    try {
        $user = createCustomer(
            $connection,
            $fullName,
            $email,
            password_hash($password, PASSWORD_DEFAULT)
        );
    } catch (PDOException $exception) {
        if ($exception->getCode() === '23000') {
            throw new HttpException(409, 'An account with this email already exists.');
        }

        throw $exception;
    }

    return new ApiResponse(201, ['user' => $user]);
}

function loginAccount(): array
{
    $payload = readJsonRequest();
    $email = validateEmail($payload['email'] ?? null);
    $password = $payload['password'] ?? null;

    if (
        !is_string($password)
        || $password === ''
        || strlen($password) > 72
    ) {
        throw new HttpException(422, 'Email or password is invalid.');
    }

    $connection = databaseConnection();
    $user = findUserByEmail($connection, $email);

    if ($user === null || !password_verify($password, $user['password_hash'])) {
        throw new HttpException(401, 'Email or password is incorrect.');
    }

    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        updatePasswordHash(
            $connection,
            (int) $user['id'],
            password_hash($password, PASSWORD_DEFAULT)
        );
    }

    $csrfToken = regenerateAuthenticatedSession((int) $user['id']);
    unset($user['password_hash']);

    return [
        'user' => $user,
        'csrf_token' => $csrfToken,
    ];
}

function getAuthenticatedProfile(): array
{
    startAppSession();
    $userId = currentSessionUserId();

    if ($userId === null) {
        throw new HttpException(401, 'Authentication is required.');
    }

    $user = findPublicUserById(databaseConnection(), $userId);

    if ($user === null) {
        destroyAppSession();
        throw new HttpException(401, 'Authentication is required.');
    }

    header('Cache-Control: no-store');

    return ['user' => $user];
}

function logoutAccount(): array
{
    destroyAppSession();

    return ['message' => 'Signed out successfully.'];
}

function validateFullName(mixed $value): string
{
    if (!is_string($value)) {
        throw new HttpException(422, 'Full name is required.');
    }

    $fullName = trim($value);
    $characterCount = preg_match_all('/./us', $fullName);

    if ($characterCount === false || $characterCount < 1 || $characterCount > 100) {
        throw new HttpException(422, 'Full name must contain between 1 and 100 characters.');
    }

    return $fullName;
}

function validateEmail(mixed $value): string
{
    if (!is_string($value)) {
        throw new HttpException(422, 'A valid email address is required.');
    }

    $email = strtolower(trim($value));

    if (
        strlen($email) > 254
        || filter_var($email, FILTER_VALIDATE_EMAIL) === false
    ) {
        throw new HttpException(422, 'A valid email address is required.');
    }

    return $email;
}

function validateRegistrationPassword(mixed $value): string
{
    if (!is_string($value) || strlen($value) < 12 || strlen($value) > 72) {
        throw new HttpException(
            422,
            'Password must contain at least 12 characters and no more than 72 bytes.'
        );
    }

    return $value;
}
