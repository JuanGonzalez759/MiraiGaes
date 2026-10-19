<?php

declare(strict_types=1);

function findUserByEmail(PDO $connection, string $email): ?array
{
    $statement = $connection->prepare(
        'SELECT id, full_name, email, password_hash, role, created_at
         FROM users
         WHERE email = :email
         LIMIT 1'
    );
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();

    return $user === false ? null : $user;
}

function findPublicUserById(PDO $connection, int $userId): ?array
{
    $statement = $connection->prepare(
        'SELECT id, full_name, email, role, created_at
         FROM users
         WHERE id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();

    return $user === false ? null : $user;
}

function createCustomer(PDO $connection, string $fullName, string $email, string $passwordHash): array
{
    $statement = $connection->prepare(
        'INSERT INTO users (full_name, email, password_hash, role)
         VALUES (:full_name, :email, :password_hash, :role)'
    );
    $statement->execute([
        'full_name' => $fullName,
        'email' => $email,
        'password_hash' => $passwordHash,
        'role' => 'customer',
    ]);

    return findPublicUserById($connection, (int) $connection->lastInsertId())
        ?? throw new RuntimeException('Created user could not be loaded.');
}

function updatePasswordHash(PDO $connection, int $userId, string $passwordHash): void
{
    $statement = $connection->prepare(
        'UPDATE users SET password_hash = :password_hash WHERE id = :id'
    );
    $statement->execute([
        'password_hash' => $passwordHash,
        'id' => $userId,
    ]);
}
