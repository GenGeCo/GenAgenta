<?php
/**
 * Configurazione generale GenAgenTa
 * Tutte le credenziali sono in .env (non committato)
 */

require_once __DIR__ . '/env.php';

// Ambiente
define('ENVIRONMENT', env('ENVIRONMENT', 'development'));

// URL base
define('BASE_URL', ENVIRONMENT === 'production'
    ? 'https://www.gruppogea.net/genagenta'
    : 'http://localhost:8000');

// JWT Secret (DEVE essere in .env)
define('JWT_SECRET', env('JWT_SECRET', 'CAMBIARE_IN_PRODUZIONE'));

// Durata sessione (24 ore)
define('SESSION_DURATION', 86400);

// CORS
define('CORS_ORIGINS', ENVIRONMENT === 'production'
    ? ['https://www.gruppogea.net']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']);

// Timezone
date_default_timezone_set('Europe/Rome');

// Gemini API per AI Assistant (gratuita da Google AI Studio)
define('GEMINI_API_KEY', env('GEMINI_API_KEY', ''));

// OpenRouter API per AI avanzata (Claude, GPT-4, etc.)
define('OPENROUTER_API_KEY', env('OPENROUTER_API_KEY', ''));

// Claude API (legacy, non più usata)
// define('CLAUDE_API_KEY', env('CLAUDE_API_KEY', ''));

// Error reporting
if (ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
