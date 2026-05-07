<?php
declare(strict_types=1);

return [
    'auth_token' => 'replace-with-a-long-random-token',
    'public_base_url' => 'https://sparksofsindri.com',
    'uploads_root' => dirname(__DIR__, 2) . '/uploads',
    'max_bytes' => 30 * 1024 * 1024,
    'allowed_extensions' => [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'avif',
        'pdf',
    ],
    'allowed_mime_prefixes' => [
        'image/',
    ],
    'allowed_mime_exact' => [
        'application/pdf',
    ],
];
