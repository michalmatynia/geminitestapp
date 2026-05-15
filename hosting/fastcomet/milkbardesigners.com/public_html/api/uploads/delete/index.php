<?php
declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$config = storage_config();
require_bearer_auth($config);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed.',
    ]);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode(is_string($rawBody) ? $rawBody : '', true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$candidate = (string) ($payload['publicPath'] ?? $payload['filepath'] ?? '');
$publicPath = normalize_public_path($candidate);
$uploadsRoot = uploads_root($config);
$target = target_path_for_public_path($uploadsRoot, $publicPath);

$deleted = false;
if (is_file($target)) {
    $deleted = unlink($target);
}

$emptyDirectoryRemoved = false;
if ($deleted) {
    $parent = dirname($target);
    if (
        $parent !== $uploadsRoot &&
        string_starts_with($parent, $uploadsRoot . DIRECTORY_SEPARATOR) &&
        is_dir($parent)
    ) {
        $emptyDirectoryRemoved = @rmdir($parent);
    }
}

send_json(200, [
    'ok' => true,
    'deleted' => $deleted,
    'emptyDirectoryRemoved' => $emptyDirectoryRemoved,
    'publicPath' => $publicPath,
]);

