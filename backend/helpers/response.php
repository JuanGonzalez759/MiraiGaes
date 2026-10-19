<?php

declare(strict_types=1);

final class ApiResponse
{
    public function __construct(
        public readonly int $statusCode,
        public readonly array $payload
    ) {
    }
}

function jsonResponse(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );
    exit;
}
