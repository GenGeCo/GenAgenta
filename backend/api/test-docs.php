<?php
// Test accesso ai file docs
header('Content-Type: application/json');

$docsPath = __DIR__ . '/../config/ai/docs/';

$result = [
    'docs_path' => $docsPath,
    'docs_exists' => is_dir($docsPath),
    'docs_readable' => is_readable($docsPath),
    'files' => []
];

if (is_dir($docsPath)) {
    $files = scandir($docsPath);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $fullPath = $docsPath . $file;
            $result['files'][$file] = [
                'exists' => file_exists($fullPath),
                'readable' => is_readable($fullPath),
                'size' => file_exists($fullPath) ? filesize($fullPath) : 0
            ];
        }
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);
