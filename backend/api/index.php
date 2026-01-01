<?php
/**
 * GenAgenTa API - Router principale
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

// CORS
setCorsHeaders();

// Routing semplice
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/genagenta/backend/api';

// Prova prima PATH_INFO (per URL tipo index.php/stats)
if (!empty($_SERVER['PATH_INFO'])) {
    $path = trim($_SERVER['PATH_INFO'], '/');
} else {
    // Fallback: estrai da REQUEST_URI
    $path = parse_url($requestUri, PHP_URL_PATH);
    $path = str_replace($basePath, '', $path);
    $path = str_replace('/index.php', '', $path); // Rimuove index.php se presente
    $path = trim($path, '/');
}

// Ottieni metodo HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Route
$routes = [
    // Auth
    'GET:auth/me' => 'auth/me.php',
    'POST:auth/login' => 'auth/login.php',
    'POST:auth/register' => 'auth/register.php',
    'POST:auth/verify-pin' => 'auth/verify-pin.php',

    // Users (profilo)
    'PUT:users/profile' => 'users/profile.php',
    'PUT:users/password' => 'users/password.php',
    'POST:users/upload-foto' => 'users/upload-foto.php',

    // Azienda
    'GET:azienda/membri' => 'azienda/membri.php',
    'POST:azienda/inviti' => 'azienda/inviti.php',
    'POST:azienda/inviti/accetta' => 'azienda/accetta-invito.php',
    'POST:azienda/inviti/rifiuta' => 'azienda/rifiuta-invito.php',

    // Inviti pendenti (per utente loggato)
    'GET:auth/inviti-pendenti' => 'auth/inviti-pendenti.php',

    // Neuroni
    'GET:neuroni' => 'neuroni/list.php',
    'GET:neuroni/search' => 'neuroni/search.php',
    'POST:neuroni' => 'neuroni/create.php',

    // Sinapsi
    'GET:sinapsi' => 'sinapsi/list.php',
    'POST:sinapsi' => 'sinapsi/create.php',

    // Note personali
    'GET:note' => 'note/list.php',
    'POST:note' => 'note/create.php',

    // Stats / Dashboard
    'GET:stats' => 'stats/dashboard.php',

    // Tipi Neurone
    'GET:tipi-neurone' => 'tipi-neurone/list.php',
    'POST:tipi-neurone' => 'tipi-neurone/create.php',

    // Categorie
    'GET:categorie' => 'categorie/list.php',
    'POST:categorie' => 'categorie/create.php',

    // Tipi Sinapsi
    'GET:tipi-sinapsi' => 'tipi-sinapsi/list.php',
    'POST:tipi-sinapsi' => 'tipi-sinapsi/create.php',

    // Famiglie Prodotto
    'GET:famiglie-prodotto' => 'famiglie-prodotto/list.php',
    'POST:famiglie-prodotto' => 'famiglie-prodotto/create.php',

    // AI Assistant
    'POST:ai/chat' => 'ai/chat.php',

    // Geocoding
    'GET:geocode/search' => 'geocode/search.php',

    // Vendite (unificato da api_v2)
    'GET:vendite' => 'vendite/index.php',
    'POST:vendite' => 'vendite/index.php',

    // Preferenze utente (unificato da api_v2)
    'GET:preferenze' => 'preferenze/index.php',
    'POST:preferenze' => 'preferenze/index.php',

    // Tipi entità v2 (unificato da api_v2)
    'GET:tipi' => 'tipi/index.php',
    'POST:tipi' => 'tipi/index.php',

    // Tipologie v2 (unificato da api_v2)
    'GET:tipologie' => 'tipologie/index.php',
    'POST:tipologie' => 'tipologie/index.php',

    // Tipi connessione v2 (unificato da api_v2)
    'GET:tipi-connessione' => 'tipi-connessione/index.php',
    'POST:tipi-connessione' => 'tipi-connessione/index.php',

    // Campi personalizzati v2 (unificato da api_v2)
    'GET:campi' => 'campi/index.php',
    'POST:campi' => 'campi/index.php',
];

// Match route con parametri
$routeKey = "$method:$path";
$handler = null;
$params = [];

// Prima cerca match esatto
if (isset($routes[$routeKey])) {
    $handler = $routes[$routeKey];
} else {
    // Cerca route con parametri (es: neuroni/123)
    foreach ($routes as $route => $file) {
        $pattern = preg_replace('/\{[^}]+\}/', '([^/]+)', $route);
        $pattern = str_replace('/', '\/', $pattern);

        if (preg_match("/^$pattern$/", "$method:$path", $matches)) {
            $handler = $file;
            array_shift($matches);
            $params = $matches;
            break;
        }
    }
}

// Gestione route con ID (neuroni/{id}, sinapsi/{id}, note/{id})
if (!$handler) {
    if (preg_match('/^neuroni\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'GET': $handler = 'neuroni/get.php'; break;
            case 'PUT': $handler = 'neuroni/update.php'; break;
            case 'DELETE': $handler = 'neuroni/delete.php'; break;
        }
    } elseif (preg_match('/^sinapsi\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'GET': $handler = 'sinapsi/get.php'; break;
            case 'PUT': $handler = 'sinapsi/update.php'; break;
            case 'DELETE': $handler = 'sinapsi/delete.php'; break;
        }
    } elseif (preg_match('/^note\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'note/update.php'; break;
            case 'DELETE': $handler = 'note/delete.php'; break;
        }
    } elseif (preg_match('/^neuroni\/([a-zA-Z0-9-]+)\/sinapsi$/', $path, $matches)) {
        $params['neurone_id'] = $matches[1];
        $handler = 'neuroni/sinapsi.php';
    } elseif (preg_match('/^azienda\/membri\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        if ($method === 'DELETE') {
            $handler = 'azienda/membri.php';
        }
    } elseif (preg_match('/^tipi-neurone\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'tipi-neurone/update.php'; break;
            case 'DELETE': $handler = 'tipi-neurone/delete.php'; break;
        }
    } elseif (preg_match('/^categorie\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'categorie/update.php'; break;
            case 'DELETE': $handler = 'categorie/delete.php'; break;
        }
    } elseif (preg_match('/^tipi-sinapsi\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'tipi-sinapsi/update.php'; break;
            case 'DELETE': $handler = 'tipi-sinapsi/delete.php'; break;
        }
    } elseif (preg_match('/^famiglie-prodotto\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'GET': $handler = 'famiglie-prodotto/get.php'; break;
            case 'PUT': $handler = 'famiglie-prodotto/update.php'; break;
            case 'DELETE': $handler = 'famiglie-prodotto/delete.php'; break;
        }
    } elseif (preg_match('/^vendite\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'DELETE': $handler = 'vendite/index.php'; break;
        }
    } elseif (preg_match('/^tipi\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'tipi/index.php'; break;
            case 'DELETE': $handler = 'tipi/index.php'; break;
        }
    } elseif (preg_match('/^tipologie\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'tipologie/index.php'; break;
            case 'DELETE': $handler = 'tipologie/index.php'; break;
        }
    } elseif (preg_match('/^tipi-connessione\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'tipi-connessione/index.php'; break;
            case 'DELETE': $handler = 'tipi-connessione/index.php'; break;
        }
    } elseif (preg_match('/^campi\/([a-zA-Z0-9-]+)$/', $path, $matches)) {
        $params['id'] = $matches[1];
        switch ($method) {
            case 'PUT': $handler = 'campi/index.php'; break;
            case 'DELETE': $handler = 'campi/index.php'; break;
        }
    }
}

// 404 se route non trovata
if (!$handler) {
    errorResponse('Endpoint non trovato', 404);
}

// Include handler
$handlerPath = __DIR__ . '/' . $handler;
if (file_exists($handlerPath)) {
    // Passa parametri
    $_REQUEST = array_merge($_REQUEST, $params);
    require $handlerPath;
} else {
    errorResponse('Handler non implementato', 501);
}
