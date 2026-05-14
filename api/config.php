<?php
function loadEnvFile(string $path): void {
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);
        $value = trim($value, "\"'");

        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

loadEnvFile(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');
// ============================================================
// config.php  — Database configuration
// Copy this file to your server and fill in your credentials.
// DO NOT commit real credentials to version control.
// ============================================================

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'nextchapter_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// ---- Hugging Face API ----
// Keep this value in .env only. Never expose it in browser JavaScript.
define('HUGGINGFACE_API_KEY', getenv('HUGGINGFACE_API_KEY') ?: '');
define('HUGGINGFACE_CHAT_MODEL', getenv('HUGGINGFACE_CHAT_MODEL') ?: 'katanemo/Arch-Router-1.5B:hf-inference');

// ---- Allowed frontend origins (CORS) ----
// Add your domain(s) here, e.g. 'https://yourapp.com'
define('ALLOWED_ORIGINS', [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:8080',
    // 'https://yourdomain.com',
]);

// ---- Session cookie lifetime (seconds) ----
define('SESSION_LIFETIME', 60 * 60 * 24 * 30); // 30 days

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}
