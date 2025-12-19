<?php
/**
 * Caricamento variabili d'ambiente da .env
 * Il file .env deve stare nella root del progetto (fuori da public)
 */

// Carica .env una sola volta
$envLoaded = false;

function loadEnv(): void {
    global $envLoaded;
    if ($envLoaded) return;

    // Cerca .env nella root del progetto (2 livelli sopra backend/config)
    $envPath = dirname(__DIR__, 2) . '/.env';

    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            // Salta commenti
            if (str_starts_with(trim($line), '#')) continue;

            // Parsa KEY=VALUE
            if (strpos($line, '=') !== false) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                // Rimuovi virgolette se presenti
                $value = trim($value, '"\'');

                // Imposta sia in $_ENV che in putenv
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }

    $envLoaded = true;
}

/**
 * Ottieni variabile d'ambiente
 */
function env(string $key, $default = null) {
    loadEnv();

    return $_ENV[$key] ?? getenv($key) ?: $default;
}
