<?php

declare(strict_types=1);

function readJsonRequest(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (strtolower(trim(explode(';', $contentType, 2)[0])) !== 'application/json') {
        throw new HttpException(415, 'Content-Type must be application/json.');
    }

    try {
        $payload = json_decode(
            file_get_contents('php://input'),
            false,
            512,
            JSON_THROW_ON_ERROR
        );
    } catch (JsonException) {
        throw new HttpException(400, 'Request body must contain valid JSON.');
    }

    if (!$payload instanceof stdClass) {
        throw new HttpException(400, 'Request body must be a JSON object.');
    }

    return get_object_vars($payload);
}
