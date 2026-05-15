<?php
declare(strict_types=1);

return [
    'username' => 'replace-with-fastcomet-username',
    'auth_token' => 'replace-with-a-long-random-token',
    'public_base_url' => 'https://sparksofsindri.com',
    'uploads_root' => dirname(__DIR__, 2) . '/uploads',
    'max_bytes' => 100 * 1024 * 1024,
    'allowed_extensions' => [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'avif',
        'pdf',
        'glb',
        'gltf',
    ],
    'allowed_mime_prefixes' => [
        'image/',
    ],
    'allowed_mime_exact' => [
        'application/pdf',
        'application/json',
        'application/octet-stream',
        'model/gltf+json',
        'model/gltf-binary',
        'text/plain',
    ],
];
