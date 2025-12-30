<?php
/**
 * Funzioni helper GenAgenTa
 */

/**
 * Genera UUID v4
 */
function generateUUID(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Risposta JSON standard
 */
function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Risposta errore
 */
function errorResponse(string $message, int $statusCode = 400): void {
    jsonResponse(['error' => $message], $statusCode);
}

/**
 * Imposta headers CORS
 */
function setCorsHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, CORS_ORIGINS)) {
        header("Access-Control-Allow-Origin: $origin");
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');

    // Preflight request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Ottieni body JSON della richiesta
 */
function getJsonBody(): array {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

/**
 * Genera hash password
 */
function hashPassword(string $password): string {
    return password_hash($password, PASSWORD_BCRYPT);
}

/**
 * Verifica password
 */
function verifyPassword(string $password, string $hash): bool {
    return password_verify($password, $hash);
}

/**
 * Genera token JWT semplice
 */
function generateJWT(array $payload): string {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload['exp'] = time() + SESSION_DURATION;
    $payload = base64_encode(json_encode($payload));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

/**
 * Verifica e decodifica token JWT
 */
function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;

    $expectedSignature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expectedSignature, $signature)) return null;

    $data = json_decode(base64_decode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;

    return $data;
}

/**
 * Ottieni utente corrente dal token
 */
function getCurrentUser(): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        return verifyJWT($matches[1]);
    }

    return null;
}

/**
 * Richiede autenticazione
 * Verifica anche che la sessione sia ancora valida (single-session)
 */
function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user) {
        errorResponse('Non autorizzato', 401);
    }

    // Verifica che il session_token corrisponda a quello nel DB
    // Se non corrisponde, significa che un altro dispositivo ha fatto login
    if (isset($user['session_token']) && isset($user['user_id'])) {
        try {
            $db = getDB();
            $stmt = $db->prepare('SELECT session_token FROM utenti WHERE id = ?');
            $stmt->execute([$user['user_id']]);
            $row = $stmt->fetch();

            if ($row && isset($row['session_token']) && $row['session_token'] !== $user['session_token']) {
                // Sessione invalidata da un nuovo login
                jsonResponse([
                    'error' => 'Sessione scaduta',
                    'code' => 'SESSION_REPLACED',
                    'message' => 'Sei stato disconnesso perché è stato effettuato un accesso da un altro dispositivo'
                ], 401);
            }
        } catch (PDOException $e) {
            // Colonna session_token non esiste ancora - skip verifica
        }
    }

    return $user;
}

/**
 * Verifica PIN per area personale
 */
function verifyPIN(string $pin, string $hash): bool {
    return password_verify($pin, $hash);
}
