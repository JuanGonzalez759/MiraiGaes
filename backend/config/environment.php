<?php

declare(strict_types=1);

function loadEnvironmentFile(string $filePath): void
{
    if (!is_file($filePath)) {
        return;
    }

    $lines = @file($filePath, FILE_IGNORE_NEW_LINES);

    if ($lines === false) {
        error_log('Local environment configuration could not be read.');
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $separatorPosition = strpos($line, '=');

        if ($separatorPosition === false) {
            continue;
        }

        $name = trim(substr($line, 0, $separatorPosition));
        $value = trim(substr($line, $separatorPosition + 1));

        if (
            preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name) !== 1
            || getenv($name) !== false
            || array_key_exists($name, $_ENV)
            || array_key_exists($name, $_SERVER)
        ) {
            continue;
        }

        if (
            strlen($value) >= 2
            && (($value[0] === '"' && $value[strlen($value) - 1] === '"')
                || ($value[0] === "'" && $value[strlen($value) - 1] === "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

function readEnvironmentFileValue(string $filePath, string $name): ?string
{
    if (!is_file($filePath) || !is_readable($filePath)) {
        return null;
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES);

    if ($lines === false) {
        return null;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $separatorPosition = strpos($line, '=');

        if ($separatorPosition === false || trim(substr($line, 0, $separatorPosition)) !== $name) {
            continue;
        }

        $value = trim(substr($line, $separatorPosition + 1));

        if (
            strlen($value) >= 2
            && (($value[0] === '"' && $value[strlen($value) - 1] === '"')
                || ($value[0] === "'" && $value[strlen($value) - 1] === "'"))
        ) {
            return substr($value, 1, -1);
        }

        return $value;
    }

    return null;
}
