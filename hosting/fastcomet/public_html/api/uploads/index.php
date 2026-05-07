<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$config = storage_config();
require_bearer_auth($config);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, [
        'ok' => false,
        'error' => 'Method not allowed.',
    ]);
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    send_json(400, [
        'ok' => false,
        'error' => 'Missing uploaded file.',
    ]);
}

$publicPath = normalize_public_path((string) ($_POST['publicPath'] ?? ''));
$file = $_FILES['file'];
$mimeType = assert_upload_is_allowed($config, $file, $publicPath);
$uploadsRoot = uploads_root($config);
$target = target_path_for_public_path($uploadsRoot, $publicPath);
$tmpName = (string) ($file['tmp_name'] ?? '');

if (!is_uploaded_file($tmpName) || !move_uploaded_file($tmpName, $target)) {
    send_json(500, [
        'ok' => false,
        'error' => 'Failed to move uploaded file.',
    ]);
}

chmod($target, 0644);

$url = public_url($config, $publicPath);

send_json(200, [
    'ok' => true,
    'url' => $url,
    'publicUrl' => $url,
    'filepath' => $url,
    'path' => $publicPath,
    'publicPath' => $publicPath,
    'mimeType' => $mimeType,
    'size' => filesize($target),
]);

