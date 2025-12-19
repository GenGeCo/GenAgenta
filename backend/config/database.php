<?php
/**
 * Configurazione Database GenAgenTa
 * Le credenziali sono caricate da .env (fuori dal git)
 */

require_once __DIR__ . '/env.php';

/**
 * Connessione PDO al database
 */
function getDB(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $host = env('DB_HOST', 'localhost');
        $name = env('DB_NAME', 'genagenta');
        $user = env('DB_USER', '');
        $pass = env('DB_PASS', '');

        $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        try {
            $pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            if (env('ENVIRONMENT') === 'development') {
                echo json_encode(['error' => 'DB Error: ' . $e->getMessage()]);
            } else {
                echo json_encode(['error' => 'Errore connessione database']);
            }
            exit;
        }
    }

    return $pdo;
}
