<?php
declare(strict_types=1);

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function string_starts_with(string $value, string $prefix): bool
{
    return $prefix === '' || strncmp($value, $prefix, strlen($prefix)) === 0;
}

function storage_config(): array
{
    $configPath = __DIR__ . '/config.php';
    if (!is_file($configPath)) {
        send_json(500, [
            'ok' => false,
            'error' => 'Missing api/uploads/config.php.',
        ]);
    }

    $config = require $configPath;
    if (!is_array($config)) {
        send_json(500, [
            'ok' => false,
            'error' => 'api/uploads/config.php must return an array.',
        ]);
    }

    return $config;
}

function request_authorization_header(): string
{
    $headers = [
        $_SERVER['HTTP_AUTHORIZATION'] ?? '',
        $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '',
    ];

    foreach ($headers as $header) {
        if (is_string($header) && trim($header) !== '') {
            return trim($header);
        }
    }

    if (function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $name => $value) {
            if (strcasecmp((string) $name, 'Authorization') === 0) {
                return trim((string) $value);
            }
        }
    }

    return '';
}

function require_bearer_auth(array $config): void
{
    $expected = trim((string) ($config['auth_token'] ?? ''));
    if ($expected === '') {
        send_json(500, [
            'ok' => false,
            'error' => 'FastComet upload auth token is not configured.',
        ]);
    }

    $header = request_authorization_header();
    $provided = preg_match('/^Bearer\s+(.+)$/i', $header, $matches) === 1
        ? trim((string) $matches[1])
        : '';

    if ($provided === '' || !hash_equals($expected, $provided)) {
        send_json(401, [
            'ok' => false,
            'error' => 'Unauthorized.',
        ]);
    }
}

function uploads_root(array $config): string
{
    $configured = trim((string) ($config['uploads_root'] ?? ''));
    $root = $configured !== '' ? $configured : dirname(__DIR__, 2) . '/uploads';

    if (!is_dir($root) && !mkdir($root, 0755, true)) {
        send_json(500, [
            'ok' => false,
            'error' => 'Failed to create uploads directory.',
        ]);
    }

    $real = realpath($root);
    if ($real === false) {
        send_json(500, [
            'ok' => false,
            'error' => 'Uploads directory is not readable.',
        ]);
    }

    return rtrim($real, DIRECTORY_SEPARATOR);
}

function normalize_public_path(string $value): string
{
    $raw = trim($value);
    if ($raw === '') {
        send_json(400, [
            'ok' => false,
            'error' => 'publicPath is required.',
        ]);
    }

    if (preg_match('/^https?:\/\//i', $raw) === 1) {
        $path = parse_url($raw, PHP_URL_PATH);
        $raw = is_string($path) ? $path : '';
    }

    $decoded = rawurldecode(str_replace('\\', '/', $raw));
    if (string_starts_with($decoded, 'public/uploads/')) {
        $decoded = substr($decoded, strlen('public'));
    }
    if (!string_starts_with($decoded, '/')) {
        $decoded = '/' . $decoded;
    }
    if (!string_starts_with($decoded, '/uploads/')) {
        send_json(400, [
            'ok' => false,
            'error' => 'publicPath must be under /uploads/.',
        ]);
    }

    $parts = array_values(array_filter(explode('/', substr($decoded, strlen('/uploads/'))), static function ($part) {
        return $part !== '';
    }));

    if (count($parts) === 0) {
        send_json(400, [
            'ok' => false,
            'error' => 'publicPath must include a file name.',
        ]);
    }

    foreach ($parts as $part) {
        if ($part === '.' || $part === '..' || preg_match('/^[A-Za-z0-9._-]+$/', $part) !== 1) {
            send_json(400, [
                'ok' => false,
                'error' => 'publicPath contains an unsafe segment.',
            ]);
        }
    }

    return '/uploads/' . implode('/', $parts);
}

function target_path_for_public_path(string $uploadsRoot, string $publicPath): string
{
    $relative = substr($publicPath, strlen('/uploads/'));
    $target = $uploadsRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
    $parent = dirname($target);

    if (!is_dir($parent) && !mkdir($parent, 0755, true)) {
        send_json(500, [
            'ok' => false,
            'error' => 'Failed to create upload target directory.',
        ]);
    }

    $realParent = realpath($parent);
    if (
        $realParent === false ||
        ($realParent !== $uploadsRoot && !string_starts_with($realParent, $uploadsRoot . DIRECTORY_SEPARATOR))
    ) {
        send_json(400, [
            'ok' => false,
            'error' => 'Upload target escaped the uploads directory.',
        ]);
    }

    return $target;
}

function public_url(array $config, string $publicPath): string
{
    $baseUrl = rtrim(trim((string) ($config['public_base_url'] ?? '')), '/');
    if ($baseUrl === '') {
        send_json(500, [
            'ok' => false,
            'error' => 'public_base_url is not configured.',
        ]);
    }

    return $baseUrl . $publicPath;
}

function allowed_extension(array $config, string $publicPath): bool
{
    $allowed = $config['allowed_extensions'] ?? [];
    if (!is_array($allowed)) {
        return false;
    }

    $extension = strtolower(pathinfo($publicPath, PATHINFO_EXTENSION));
    return $extension !== '' && in_array($extension, array_map('strtolower', $allowed), true);
}

function detected_mime_type(string $tmpName): string
{
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmpName);
    return is_string($mime) && $mime !== '' ? $mime : 'application/octet-stream';
}

function allowed_mime_type(array $config, string $mimeType): bool
{
    $exact = $config['allowed_mime_exact'] ?? [];
    if (is_array($exact) && in_array(strtolower($mimeType), array_map('strtolower', $exact), true)) {
        return true;
    }

    $prefixes = $config['allowed_mime_prefixes'] ?? [];
    if (!is_array($prefixes)) {
        return false;
    }

    foreach ($prefixes as $prefix) {
        if (string_starts_with(strtolower($mimeType), strtolower((string) $prefix))) {
            return true;
        }
    }

    return false;
}

function assert_upload_is_allowed(array $config, array $file, string $publicPath): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        send_json(400, [
            'ok' => false,
            'error' => 'Upload failed before reaching storage.',
            'uploadError' => $file['error'] ?? null,
        ]);
    }

    $maxBytes = (int) ($config['max_bytes'] ?? 31457280);
    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0 || $size > $maxBytes) {
        send_json(400, [
            'ok' => false,
            'error' => 'File size is outside the allowed range.',
        ]);
    }

    if (!allowed_extension($config, $publicPath)) {
        send_json(400, [
            'ok' => false,
            'error' => 'File extension is not allowed.',
        ]);
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        send_json(400, [
            'ok' => false,
            'error' => 'Uploaded file is not valid.',
        ]);
    }

    $mimeType = detected_mime_type($tmpName);
    if (!allowed_mime_type($config, $mimeType)) {
        send_json(400, [
            'ok' => false,
            'error' => 'Detected MIME type is not allowed.',
            'mimeType' => $mimeType,
        ]);
    }

    return $mimeType;
}
