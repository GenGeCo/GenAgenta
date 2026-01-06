<?php
/**
 * POST /ai/chat
 * Endpoint principale per chat con AI (Gemini)
 *
 * L'AI ha accesso a tools per interrogare e modificare il sistema
 */

// Error handler globale - converte errori PHP in eccezioni
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

/**
 * Chiama l'AI per interpretare un errore tecnico in modo user-friendly.
 * Usa Gemini SENZA tool per una chiamata leggera e veloce.
 * Ritorna null se fallisce (per usare fallback).
 */
function interpretErrorWithAI(string $errorMessage): ?string {
    // Evita loop infiniti: se l'errore è dell'AI stessa, non richiamare l'AI
    $aiErrorKeywords = ['Gemini', 'OpenRouter', 'cURL', 'API', 'timeout', '429', '503'];
    foreach ($aiErrorKeywords as $keyword) {
        if (stripos($errorMessage, $keyword) !== false) {
            return null; // Usa fallback
        }
    }

    // Carica API key
    $config = require __DIR__ . '/../../config/config.php';
    $apiKey = $config['gemini_api_key'] ?? getenv('GEMINI_API_KEY');
    if (!$apiKey) {
        return null;
    }

    $model = 'gemini-2.5-flash';
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

    $prompt = "Sei Agea, un'assistente AI simpatica. L'utente ha incontrato questo errore tecnico:\n\n\"$errorMessage\"\n\nSpiega IN ITALIANO cosa è successo in modo semplice e amichevole (max 2 frasi). Se è un errore di database (SQL, colonna mancante), suggerisci che potrebbe servire un aggiornamento. NON dire 'contatta il supporto'.";

    $payload = [
        'contents' => [
            ['role' => 'user', 'parts' => [['text' => $prompt]]]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'maxOutputTokens' => 200
        ]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 10 // Timeout corto per non bloccare troppo
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        return null;
    }

    $data = json_decode($response, true);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

    return $text;
}

// Exception handler globale - RESTITUISCE SEMPRE UNA RISPOSTA AI VALIDA
// Mai crashare con 500, sempre dare un messaggio che l'utente può capire
set_exception_handler(function($e) {
    header('Content-Type: application/json');
    // HTTP 200 - non è un errore del server, è l'AI che comunica un problema
    http_response_code(200);

    $errorMessage = $e->getMessage();
    error_log("AI Chat Exception: $errorMessage in " . $e->getFile() . ":" . $e->getLine());

    // Prova a far interpretare l'errore dall'AI
    $userMessage = interpretErrorWithAI($errorMessage);

    // Fallback se l'AI non risponde
    if (!$userMessage) {
        $userMessage = "Ops! 😅 Ho incontrato un problema tecnico: \"$errorMessage\". Potrebbe essere un errore temporaneo - riprova tra poco!";
    }

    echo json_encode([
        'response' => $userMessage,
        'iterations' => 0,
        'context' => [
            'messages_count' => 0,
            'did_compaction' => false,
            'error_details' => $errorMessage  // Per debug
        ]
    ]);
    exit;
});

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/tools.php';
require_once __DIR__ . '/debug-helper.php';

// =====================================================
// FRONTEND EXECUTION: Costanti e funzioni per delegare
// le operazioni WRITE al frontend
// =====================================================

const WRITE_TOOLS = [
    'create_entity',
    'update_entity',
    'delete_entity',
    'create_connection',
    'delete_connection',
    'create_sale',
    'delete_sale',
    'create_note'
];

/**
 * Estrae info chiave da un tool result per salvarle nella history.
 * Solo info CRITICHE per la continuità del contesto (ID, nomi).
 * NON dump giganti.
 */
function extractKeyInfo(string $toolName, array $result): ?array {
    // Se c'è un errore, non estrarre nulla
    if (isset($result['error'])) {
        return null;
    }

    switch ($toolName) {
        case 'create_entity':
            return [
                'tool' => 'create_entity',
                'entity_id' => $result['entity_id'] ?? null,
                'nome' => $result['entity']['nome'] ?? null,
                'tipo' => $result['entity']['tipo'] ?? null
            ];

        case 'update_entity':
            return [
                'tool' => 'update_entity',
                'entity_id' => $result['entity_id'] ?? null,
                'modifiche' => 'aggiornata'
            ];

        case 'delete_entity':
            return [
                'tool' => 'delete_entity',
                'entity_id' => $result['entity_id'] ?? null,
                'eliminata' => true
            ];

        case 'search_entities':
            $entities = $result['entities'] ?? [];
            return [
                'tool' => 'search_entities',
                'count' => count($entities),
                'risultati' => array_map(function($e) {
                    return ['id' => $e['id'], 'nome' => $e['nome']];
                }, array_slice($entities, 0, 5)) // Max 5
            ];

        case 'search_entities_near':
            $entities = $result['entities'] ?? [];
            return [
                'tool' => 'search_entities_near',
                'count' => count($entities),
                'risultati' => array_map(function($e) {
                    return ['id' => $e['id'], 'nome' => $e['nome'], 'distanza_km' => $e['distance_km'] ?? null];
                }, array_slice($entities, 0, 5))
            ];

        case 'get_entity_details':
            return [
                'tool' => 'get_entity_details',
                'entity_id' => $result['entity']['id'] ?? null,
                'nome' => $result['entity']['nome'] ?? null,
                'tipo' => $result['entity']['tipo'] ?? null,
                'indirizzo' => $result['entity']['indirizzo'] ?? null,
                'lat' => $result['entity']['lat'] ?? null,
                'lng' => $result['entity']['lng'] ?? null
            ];

        case 'create_connection':
            return [
                'tool' => 'create_connection',
                'sinapsi_id' => $result['sinapsi_id'] ?? null
            ];

        case 'geocode_address':
            $firstResult = $result['results'][0] ?? null;
            return [
                'tool' => 'geocode_address',
                'indirizzo' => $result['query'] ?? null,
                'lat' => $firstResult['lat'] ?? null,
                'lng' => $firstResult['lng'] ?? null
            ];

        case 'create_sale':
            return [
                'tool' => 'create_sale',
                'vendita_id' => $result['vendita_id'] ?? null,
                'importo' => $result['vendita']['importo'] ?? null
            ];

        case 'delete_connection':
            return [
                'tool' => 'delete_connection',
                'sinapsi_id' => $result['sinapsi_id'] ?? null,
                'eliminata' => true
            ];

        case 'delete_sale':
            return [
                'tool' => 'delete_sale',
                'vendita_id' => $result['vendita_id'] ?? null,
                'eliminata' => true
            ];

        case 'create_note':
            return [
                'tool' => 'create_note',
                'nota_id' => $result['nota_id'] ?? null,
                'entity_id' => $result['entity_id'] ?? null
            ];

        case 'get_connections':
            $connections = $result['connections'] ?? [];
            return [
                'tool' => 'get_connections',
                'entity_id' => $result['entity_id'] ?? null,
                'count' => count($connections),
                'connessioni' => array_map(function($c) {
                    return [
                        'id' => $c['id'] ?? null,
                        'tipo' => $c['tipo'] ?? null,
                        'altra_entita' => $c['altra_entita']['nome'] ?? null,
                        'altra_entita_id' => $c['altra_entita']['id'] ?? null
                    ];
                }, array_slice($connections, 0, 5))
            ];

        case 'get_sales_stats':
            return [
                'tool' => 'get_sales_stats',
                'entity_id' => $result['entity_id'] ?? null,
                'totale' => $result['totale'] ?? null,
                'count' => $result['count'] ?? null,
                'periodo' => $result['periodo'] ?? null
            ];

        case 'map_fly_to':
            return [
                'tool' => 'map_fly_to',
                'lat' => $result['lat'] ?? null,
                'lng' => $result['lng'] ?? null,
                'zoom' => $result['zoom'] ?? null,
                'posizione_attuale' => true
            ];

        case 'map_select_entity':
            return [
                'tool' => 'map_select_entity',
                'entity_id' => $result['entity_id'] ?? null,
                'nome' => $result['entity_name'] ?? null,
                'selezionata' => true
            ];

        case 'query_database':
            $data = $result['data'] ?? [];
            return [
                'tool' => 'query_database',
                'count' => count($data),
                'preview' => array_slice($data, 0, 3) // Solo prime 3 righe
            ];

        default:
            // Per altri tool, non estrarre nulla
            return null;
    }
}

/**
 * Verifica se un tool è di tipo WRITE (deve essere eseguito dal frontend)
 */
function isWriteTool(string $toolName, array $args = []): bool {
    if (in_array($toolName, WRITE_TOOLS)) {
        return true;
    }
    // call_api è write solo per POST/PUT/DELETE
    if ($toolName === 'call_api') {
        $method = strtoupper($args['method'] ?? 'GET');
        return in_array($method, ['POST', 'PUT', 'DELETE']);
    }
    return false;
}

/**
 * Mappa un tool AI al formato azione frontend
 */
function mapToolToFrontendAction(string $toolName, array $args): array {
    switch ($toolName) {
        case 'create_entity':
            return [
                'action_type' => 'createNeurone',
                'method' => 'POST',
                'endpoint' => '/neuroni',
                'payload' => [
                    'nome' => $args['nome'] ?? '',
                    'tipo' => $args['tipo'] ?? '',
                    'indirizzo' => $args['indirizzo'] ?? null,
                    'lat' => $args['lat'] ?? null,
                    'lng' => $args['lng'] ?? null,
                    'email' => $args['email'] ?? null,
                    'telefono' => $args['telefono'] ?? null,
                    'categorie' => $args['categorie'] ?? [],
                    'visibilita' => ($args['personale'] ?? false) ? 'personale' : 'aziendale'
                ],
                'description' => "Creare entità: " . ($args['nome'] ?? 'senza nome')
            ];

        case 'update_entity':
            return [
                'action_type' => 'updateNeurone',
                'method' => 'PUT',
                'endpoint' => '/neuroni/' . ($args['entity_id'] ?? ''),
                'entity_id' => $args['entity_id'] ?? '',
                'payload' => array_filter([
                    'nome' => $args['nome'] ?? null,
                    'indirizzo' => $args['indirizzo'] ?? null,
                    'lat' => $args['lat'] ?? null,
                    'lng' => $args['lng'] ?? null,
                    'email' => $args['email'] ?? null,
                    'telefono' => $args['telefono'] ?? null,
                    'note' => $args['note'] ?? null,
                    'categorie' => $args['categorie'] ?? null
                ], fn($v) => $v !== null),
                'description' => "Aggiornare entità"
            ];

        case 'delete_entity':
            return [
                'action_type' => 'deleteNeurone',
                'method' => 'DELETE',
                'endpoint' => '/neuroni/' . ($args['entity_id'] ?? ''),
                'entity_id' => $args['entity_id'] ?? '',
                'description' => "Eliminare entità"
            ];

        case 'create_connection':
            return [
                'action_type' => 'createSinapsi',
                'method' => 'POST',
                'endpoint' => '/sinapsi',
                'payload' => [
                    'neurone_da' => $args['entity_from'] ?? $args['neurone_da'] ?? '',
                    'neurone_a' => $args['entity_to'] ?? $args['neurone_a'] ?? '',
                    'tipo' => $args['tipo'] ?? 'commerciale',
                    'note' => $args['note'] ?? null,
                    'personale' => $args['personale'] ?? false
                ],
                'description' => "Creare connessione"
            ];

        case 'delete_connection':
            return [
                'action_type' => 'deleteSinapsi',
                'method' => 'DELETE',
                'endpoint' => '/sinapsi/' . ($args['sinapsi_id'] ?? $args['connection_id'] ?? ''),
                'sinapsi_id' => $args['sinapsi_id'] ?? $args['connection_id'] ?? '',
                'description' => "Eliminare connessione"
            ];

        case 'create_sale':
            return [
                'action_type' => 'createVendita',
                'method' => 'POST',
                'endpoint' => '/vendite',
                'payload' => [
                    'neurone_id' => $args['entity_id'] ?? $args['neurone_id'] ?? '',
                    'importo' => $args['importo'] ?? 0,
                    'famiglia_id' => $args['famiglia_id'] ?? null,
                    'data_vendita' => $args['data'] ?? date('Y-m-d'),
                    'descrizione' => $args['descrizione'] ?? null,
                    'sinapsi_id' => $args['sinapsi_id'] ?? null,
                    'tipo_transazione' => $args['tipo_transazione'] ?? 'vendita'
                ],
                'description' => "Registrare vendita"
            ];

        case 'delete_sale':
            return [
                'action_type' => 'deleteSale',
                'method' => 'DELETE',
                'endpoint' => '/vendite/' . ($args['sale_id'] ?? ''),
                'sale_id' => $args['sale_id'] ?? '',
                'description' => "Eliminare vendita"
            ];

        case 'create_note':
            return [
                'action_type' => 'createNota',
                'method' => 'POST',
                'endpoint' => '/note',
                'payload' => [
                    'neurone_id' => $args['entity_id'] ?? $args['neurone_id'] ?? '',
                    'testo' => $args['contenuto'] ?? $args['content'] ?? ''
                ],
                'description' => "Aggiungere nota"
            ];

        case 'call_api':
            return [
                'action_type' => 'callApi',
                'method' => strtoupper($args['method'] ?? 'POST'),
                'endpoint' => $args['endpoint'] ?? '',
                'payload' => $args['body'] ?? [],
                'description' => "Chiamare API: " . ($args['endpoint'] ?? '')
            ];

        default:
            return ['error' => "Tool non mappato: $toolName"];
    }
}

// Auth richiesta
$user = requireAuth();

// Config AI - OpenRouter (supporta Claude, GPT-4, Gemini, etc.)
$OPENROUTER_API_KEY = getenv('OPENROUTER_API_KEY') ?: (defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : null);

// Fallback a Gemini se OpenRouter non configurato
$GEMINI_API_KEY = getenv('GEMINI_API_KEY') ?: (defined('GEMINI_API_KEY') ? GEMINI_API_KEY : null);

$useOpenRouter = !empty($OPENROUTER_API_KEY);

if (!$useOpenRouter && !$GEMINI_API_KEY) {
    errorResponse('Nessuna API AI configurata. Configura OPENROUTER_API_KEY o GEMINI_API_KEY nel file .env', 500);
}

$data = getJsonBody();
$userMessage = $data['message'] ?? '';
$conversationHistory = $data['history'] ?? [];
$uiContext = $data['context'] ?? null; // Contesto UI (entità selezionata, etc.)

// Estrai userActions dal context e rendile disponibili globalmente per il tool get_user_actions
$GLOBALS['ai_user_actions'] = $uiContext['userActions'] ?? [];

// DEBUG: log del context ricevuto
error_log("=== AI CHAT DEBUG ===");
error_log("uiContext ricevuto: " . json_encode($uiContext));
error_log("userActions count: " . count($GLOBALS['ai_user_actions']));
error_log("userActions: " . json_encode($GLOBALS['ai_user_actions']));
if ($uiContext && !empty($uiContext['selectedEntity'])) {
    error_log("selectedEntity: " . json_encode($uiContext['selectedEntity']));
} else {
    error_log("selectedEntity: NESSUNA");
}
error_log("=====================");

// =====================================================
// FRONTEND EXECUTION: Gestione resume dopo pending_action
// =====================================================
$isResume = isset($data['resume_context']);
$resumeContext = $data['resume_context'] ?? null;
$actionResult = $data['action_result'] ?? null;

// Validazione: se non è resume, serve il messaggio
if (!$isResume && empty($userMessage)) {
    errorResponse('Messaggio richiesto', 400);
}

// Validazione resume_context
if ($isResume) {
    if (empty($resumeContext['messages'])) {
        errorResponse('resume_context.messages mancante', 400);
    }
    if (empty($resumeContext['pending_tool_call_id'])) {
        errorResponse('resume_context.pending_tool_call_id mancante', 400);
    }
    if (count($resumeContext['messages']) > 50) {
        errorResponse('Contesto troppo grande (max 50 messaggi)', 400);
    }
    if (($resumeContext['iteration'] ?? 0) > 10) {
        errorResponse('Troppe iterazioni (max 10)', 400);
    }

    error_log("RESUME: tool_call_id=" . $resumeContext['pending_tool_call_id'] . ", action_result=" . json_encode($actionResult));
}

// Log messaggio utente
aiDebugLog('USER_MESSAGE', $userMessage, [
    'history_count' => count($conversationHistory),
    'user' => $user['nome']
]);

// Definizione tools per Gemini (formato functionDeclarations)
$functionDeclarations = [
    [
        'name' => 'query_database',
        'description' => 'Esegue una query SQL SELECT sul database. Usa questo per recuperare dati strutturati. Il database contiene: neuroni (entità), sinapsi (connessioni), vendite_prodotto, famiglie_prodotto, utenti, tipi, tipologie.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'sql' => [
                    'type' => 'string',
                    'description' => 'Query SQL SELECT da eseguire. SOLO SELECT, niente INSERT/UPDATE/DELETE.'
                ]
            ],
            'required' => ['sql']
        ]
    ],
    [
        'name' => 'get_database_schema',
        'description' => 'Ottiene lo schema del database (tabelle e colonne). Usa questo prima di scrivere query per conoscere la struttura.',
        'parameters' => [
            'type' => 'object',
            'properties' => new stdClass(), // Empty object for no params
            'required' => []
        ]
    ],
    [
        'name' => 'search_entities',
        'description' => 'Cerca entità (neuroni) per nome, tipo o categoria.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'Testo da cercare nel nome o indirizzo'
                ],
                'tipo' => [
                    'type' => 'string',
                    'description' => 'Filtra per tipo (i tipi disponibili dipendono dalla configurazione)'
                ],
                'limit' => [
                    'type' => 'integer',
                    'description' => 'Numero massimo risultati (default 10)'
                ]
            ],
            'required' => []
        ]
    ],
    [
        'name' => 'search_entities_near',
        'description' => 'Cerca entità vicine a una posizione geografica. Usa questo quando l\'utente chiede "cosa c\'è qui?", "vedi entità in zona?", "cosa c\'è vicino a X?".',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'lat' => [
                    'type' => 'number',
                    'description' => 'Latitudine del centro di ricerca'
                ],
                'lng' => [
                    'type' => 'number',
                    'description' => 'Longitudine del centro di ricerca'
                ],
                'radius_km' => [
                    'type' => 'number',
                    'description' => 'Raggio di ricerca in km (default 1)'
                ],
                'tipo' => [
                    'type' => 'string',
                    'description' => 'Filtra per tipo (opzionale)'
                ],
                'limit' => [
                    'type' => 'integer',
                    'description' => 'Numero massimo risultati (default 20)'
                ]
            ],
            'required' => ['lat', 'lng']
        ]
    ],
    [
        'name' => 'get_entity_details',
        'description' => 'Ottiene tutti i dettagli di una specifica entità incluse le sue connessioni e transazioni.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID dell\'entità'
                ]
            ],
            'required' => ['entity_id']
        ]
    ],
    [
        'name' => 'get_sales_stats',
        'description' => 'Ottiene statistiche vendite aggregate per periodo, entità o famiglia prodotto.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID entità per filtrare (opzionale)'
                ],
                'from_date' => [
                    'type' => 'string',
                    'description' => 'Data inizio formato YYYY-MM-DD'
                ],
                'to_date' => [
                    'type' => 'string',
                    'description' => 'Data fine formato YYYY-MM-DD'
                ],
                'group_by' => [
                    'type' => 'string',
                    'description' => 'Raggruppamento: month, entity, family'
                ]
            ],
            'required' => []
        ]
    ],
    [
        'name' => 'get_connections',
        'description' => 'Ottiene le connessioni (sinapsi) di un\'entità o tra due entità.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID entità di partenza'
                ],
                'target_id' => [
                    'type' => 'string',
                    'description' => 'UUID entità target (opzionale, per connessione specifica)'
                ]
            ],
            'required' => ['entity_id']
        ]
    ],

    // TOOL DI SCRITTURA
    [
        'name' => 'geocode_address',
        'description' => 'Cerca un indirizzo e restituisce le coordinate GPS (latitudine, longitudine). Usa questo prima di creare entità con indirizzo per ottenere le coordinate.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'address' => [
                    'type' => 'string',
                    'description' => 'Indirizzo da cercare (es. "Via Roma 15, Milano")'
                ],
                'limit' => [
                    'type' => 'integer',
                    'description' => 'Numero massimo risultati (default 5)'
                ]
            ],
            'required' => ['address']
        ]
    ],
    [
        'name' => 'reverse_geocode',
        'description' => 'Converte coordinate GPS in indirizzo. Usa questo quando hai coordinate (es. da un click sulla mappa) e vuoi sapere che via/posto è.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'lat' => [
                    'type' => 'number',
                    'description' => 'Latitudine'
                ],
                'lng' => [
                    'type' => 'number',
                    'description' => 'Longitudine'
                ]
            ],
            'required' => ['lat', 'lng']
        ]
    ],
    [
        'name' => 'map_place_marker',
        'description' => 'Piazza un marker/segnaposto (bandierina) temporaneo sulla mappa. Max 20 marker. Leggi docs/MARKER.md per istruzioni dettagliate.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'lat' => [
                    'type' => 'number',
                    'description' => 'Latitudine del marker'
                ],
                'lng' => [
                    'type' => 'number',
                    'description' => 'Longitudine del marker'
                ],
                'label' => [
                    'type' => 'string',
                    'description' => 'Etichetta/nome da mostrare (es. "Inizio Via Roma")'
                ],
                'color' => [
                    'type' => 'string',
                    'description' => 'Colore: red, blue, green, orange, purple (default: red)'
                ],
                'fly_to' => [
                    'type' => 'boolean',
                    'description' => 'Se true, vola alla posizione del marker (default: false - piazza senza volare)'
                ]
            ],
            'required' => ['lat', 'lng', 'label']
        ]
    ],
    [
        'name' => 'map_remove_marker',
        'description' => 'Rimuove un marker specifico dalla mappa. Usa l\'ID dal contesto marker.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'marker_id' => [
                    'type' => 'string',
                    'description' => 'ID del marker da rimuovere (visibile nel contesto)'
                ]
            ],
            'required' => ['marker_id']
        ]
    ],
    [
        'name' => 'map_clear_markers',
        'description' => 'Rimuove TUTTI i marker dalla mappa.',
        'parameters' => [
            'type' => 'object',
            'properties' => new stdClass()  // Oggetto vuoto, non array!
        ]
    ],
    [
        'name' => 'create_entity',
        'description' => 'Crea una nuova entità (neurone) nel sistema. Se il tipo non è valido, restituisce i tipi disponibili.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'nome' => [
                    'type' => 'string',
                    'description' => 'Nome dell\'entità'
                ],
                'tipo' => [
                    'type' => 'string',
                    'description' => 'Tipo di entità (se non specificato o errato, il sistema indica i tipi disponibili)'
                ],
                'indirizzo' => [
                    'type' => 'string',
                    'description' => 'Indirizzo completo'
                ],
                'lat' => [
                    'type' => 'number',
                    'description' => 'Latitudine GPS'
                ],
                'lng' => [
                    'type' => 'number',
                    'description' => 'Longitudine GPS'
                ],
                'email' => [
                    'type' => 'string',
                    'description' => 'Email di contatto'
                ],
                'telefono' => [
                    'type' => 'string',
                    'description' => 'Numero di telefono'
                ],
                'categorie' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                    'description' => 'Array di categorie/tag'
                ],
                'personale' => [
                    'type' => 'boolean',
                    'description' => 'Se true, è un dato personale visibile solo al creatore'
                ]
            ],
            'required' => ['nome', 'tipo']
        ]
    ],
    [
        'name' => 'update_entity',
        'description' => 'Aggiorna una entità esistente. Per i campi personalizzati (configurati in Setup per ogni tipo), usa dati_extra.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID dell\'entità da aggiornare'
                ],
                'nome' => [
                    'type' => 'string',
                    'description' => 'Nuovo nome'
                ],
                'indirizzo' => [
                    'type' => 'string',
                    'description' => 'Nuovo indirizzo'
                ],
                'lat' => [
                    'type' => 'number',
                    'description' => 'Nuova latitudine'
                ],
                'lng' => [
                    'type' => 'number',
                    'description' => 'Nuova longitudine'
                ],
                'email' => [
                    'type' => 'string',
                    'description' => 'Nuova email'
                ],
                'telefono' => [
                    'type' => 'string',
                    'description' => 'Nuovo telefono'
                ],
                'note' => [
                    'type' => 'string',
                    'description' => 'Nuove note'
                ],
                'categorie' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                    'description' => 'Categorie/tipologie che determinano il COLORE sulla mappa (es: villa, palazzina). SOLO valori da get_team_structure.'
                ],
                'dati_extra' => [
                    'type' => 'object',
                    'description' => 'Campi personalizzati configurati in Setup per questo tipo di entità. Es: {"comune_di": "Roma", "permesso": "n° 123"}. Usa get_team_structure per vedere i campi disponibili.'
                ],
                'is_acquirente' => [
                    'type' => 'boolean',
                    'description' => 'Flag natura commerciale: è un acquirente? Appare come SPUNTA nel pannello.'
                ],
                'is_venditore' => [
                    'type' => 'boolean',
                    'description' => 'Flag natura commerciale: è un venditore? Appare come SPUNTA nel pannello.'
                ],
                'is_intermediario' => [
                    'type' => 'boolean',
                    'description' => 'Flag natura commerciale: è un intermediario? Appare come SPUNTA nel pannello.'
                ],
                'is_influencer' => [
                    'type' => 'boolean',
                    'description' => 'Flag natura commerciale: è un influencer? Appare come SPUNTA nel pannello.'
                ]
            ],
            'required' => ['entity_id']
        ]
    ],
    [
        'name' => 'create_connection',
        'description' => 'Crea una connessione (sinapsi) tra due entità.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_from' => [
                    'type' => 'string',
                    'description' => 'UUID entità di partenza'
                ],
                'entity_to' => [
                    'type' => 'string',
                    'description' => 'UUID entità di arrivo'
                ],
                'tipo' => [
                    'type' => 'string',
                    'description' => 'Tipo connessione: commerciale, fornisce, influencer, prescrittore, tecnico, partner, collabora'
                ],
                'note' => [
                    'type' => 'string',
                    'description' => 'Note sulla connessione'
                ],
                'personale' => [
                    'type' => 'boolean',
                    'description' => 'Se true, è un dato personale'
                ]
            ],
            'required' => ['entity_from', 'entity_to']
        ]
    ],
    [
        'name' => 'create_sale',
        'description' => 'Registra una vendita/transazione per un\'entità.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID entità (cliente)'
                ],
                'importo' => [
                    'type' => 'number',
                    'description' => 'Importo della vendita in euro'
                ],
                'famiglia_id' => [
                    'type' => 'string',
                    'description' => 'UUID famiglia prodotto (opzionale)'
                ],
                'data' => [
                    'type' => 'string',
                    'description' => 'Data vendita formato YYYY-MM-DD (default oggi)'
                ],
                'descrizione' => [
                    'type' => 'string',
                    'description' => 'Descrizione della vendita'
                ],
                'sinapsi_id' => [
                    'type' => 'string',
                    'description' => 'UUID connessione associata (opzionale)'
                ],
                'tipo_transazione' => [
                    'type' => 'string',
                    'description' => 'Tipo: vendita, acquisto (default: vendita)'
                ]
            ],
            'required' => ['entity_id', 'importo']
        ]
    ],
    [
        'name' => 'create_note',
        'description' => 'Aggiunge una nota a un\'entità.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID entità a cui aggiungere la nota'
                ],
                'contenuto' => [
                    'type' => 'string',
                    'description' => 'Testo della nota'
                ],
                'tipo' => [
                    'type' => 'string',
                    'description' => 'Tipo nota: nota, promemoria, avviso'
                ],
                'personale' => [
                    'type' => 'boolean',
                    'description' => 'Se true, la nota è personale (default: true)'
                ]
            ],
            'required' => ['entity_id', 'contenuto']
        ]
    ],

    // TOOL DI ELIMINAZIONE
    [
        'name' => 'delete_entity',
        'description' => 'Elimina un\'entità (neurone) dal sistema. ATTENZIONE: elimina anche tutte le connessioni e transazioni associate.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID dell\'entità da eliminare'
                ]
            ],
            'required' => ['entity_id']
        ]
    ],
    [
        'name' => 'delete_connection',
        'description' => 'Elimina una connessione (sinapsi) tra due entità.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'sinapsi_id' => [
                    'type' => 'string',
                    'description' => 'UUID della connessione da eliminare'
                ]
            ],
            'required' => ['sinapsi_id']
        ]
    ],
    [
        'name' => 'delete_sale',
        'description' => 'Elimina una vendita/transazione.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'sale_id' => [
                    'type' => 'string',
                    'description' => 'UUID della vendita da eliminare'
                ]
            ],
            'required' => ['sale_id']
        ]
    ],

    // TOOL MAPPA - Comandi per controllare la visualizzazione
    [
        'name' => 'map_fly_to',
        'description' => 'Sposta la vista della mappa 3D verso coordinate specifiche con controllo completo della camera. Usa per: vedere luoghi, zoomare (avanti/indietro), ruotare la mappa, inclinare la vista 3D.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'lat' => [
                    'type' => 'number',
                    'description' => 'Latitudine destinazione'
                ],
                'lng' => [
                    'type' => 'number',
                    'description' => 'Longitudine destinazione'
                ],
                'zoom' => [
                    'type' => 'number',
                    'description' => 'Livello di zoom: 1=mondo, 10=città, 15=quartiere, 18=edificio, 20=max dettaglio'
                ],
                'pitch' => [
                    'type' => 'number',
                    'description' => 'Inclinazione camera: 0=vista dall\'alto 2D, 60=3D standard, 85=quasi orizzontale'
                ],
                'bearing' => [
                    'type' => 'number',
                    'description' => 'Rotazione mappa in gradi: 0=Nord su, 90=Est su, 180=Sud su, 270=Ovest su'
                ]
            ],
            'required' => ['lat', 'lng']
        ]
    ],
    [
        'name' => 'map_set_style',
        'description' => 'Cambia lo stile visivo della mappa. Usa quando l\'utente chiede: satellite, stradale, terreno, notte, chiaro, scuro.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'style' => [
                    'type' => 'string',
                    'enum' => ['streets-v12', 'satellite-v9', 'satellite-streets-v12', 'outdoors-v12', 'light-v11', 'dark-v11'],
                    'description' => 'streets-v12=strade, satellite-v9=satellite puro, satellite-streets-v12=satellite+strade, outdoors-v12=terreno, light-v11=chiaro, dark-v11=notte/scuro'
                ]
            ],
            'required' => ['style']
        ]
    ],
    [
        'name' => 'map_select_entity',
        'description' => 'Seleziona e evidenzia un\'entità sulla mappa, aprendo il suo pannello dettagli.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID dell\'entità da selezionare'
                ]
            ],
            'required' => ['entity_id']
        ]
    ],
    [
        'name' => 'map_show_connections',
        'description' => 'Mostra/evidenzia le connessioni di un\'entità sulla mappa.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID dell\'entità di cui mostrare le connessioni'
                ]
            ],
            'required' => ['entity_id']
        ]
    ],

    // TOOL UI - Comandi per controllare l'interfaccia
    [
        'name' => 'ui_open_panel',
        'description' => 'Apre un pannello dell\'interfaccia utente.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'panel' => [
                    'type' => 'string',
                    'description' => 'Nome pannello: entity_detail, connection_detail, settings, families'
                ],
                'entity_id' => [
                    'type' => 'string',
                    'description' => 'UUID entità (se pannello è entity_detail)'
                ]
            ],
            'required' => ['panel']
        ]
    ],
    [
        'name' => 'ui_show_notification',
        'description' => 'Mostra una notifica all\'utente.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'message' => [
                    'type' => 'string',
                    'description' => 'Messaggio da mostrare'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'Tipo: success, error, warning, info'
                ]
            ],
            'required' => ['message']
        ]
    ],

    // TOOL AUTONOMIA - TEMPORANEAMENTE DISABILITATI PER DEBUG
    // Verranno riattivati dopo aver risolto il problema
];

// Aggiungi tool autonomia dopo la dichiarazione (per evitare problemi con (object)[])
$functionDeclarations[] = [
    'name' => 'explore_code',
    'description' => 'Esplora il codice sorgente del progetto GenAgenta.',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'path' => ['type' => 'string', 'description' => 'Percorso file da leggere'],
            'search' => ['type' => 'string', 'description' => 'Termine da cercare nel codice']
        ],
        'required' => []
    ]
];

$functionDeclarations[] = [
    'name' => 'save_learning',
    'description' => 'Salva qualcosa che hai imparato esplorando il codice.',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'category' => ['type' => 'string', 'description' => 'Categoria: mappa, database, ui, api, general'],
            'title' => ['type' => 'string', 'description' => 'Titolo breve della scoperta'],
            'content' => ['type' => 'string', 'description' => 'Descrizione dettagliata']
        ],
        'required' => ['title', 'content']
    ]
];

// read_learnings con properties come oggetto vuoto
$readLearningsTool = [
    'name' => 'read_learnings',
    'description' => 'Legge le conoscenze memorizzate in precedenza.',
    'parameters' => [
        'type' => 'object',
        'properties' => [],
        'required' => []
    ]
];
$readLearningsTool['parameters']['properties'] = new stdClass();
$functionDeclarations[] = $readLearningsTool;

// RIMOSSO: propose_improvement - L'AI lo usava male, invece di analizzare il codice
// creava "proposte" senza senso. Se serve analisi, deve usare explore_code.

// TOOL CONTESTO UTENTE - Lazy loading delle azioni utente
$getUserActionsTool = [
    'name' => 'get_user_actions',
    'description' => 'Ottiene le ultime azioni dell\'utente nell\'interfaccia (click mappa, selezioni, filtri, etc.). Utile per capire il contesto: cosa sta guardando l\'utente? Dove ha cliccato? Cosa ha selezionato/deselezionato?',
    'parameters' => [
        'type' => 'object',
        'properties' => [],
        'required' => []
    ]
];
$getUserActionsTool['parameters']['properties'] = new stdClass();
$functionDeclarations[] = $getUserActionsTool;

// TOOL MEMORIA AGEA - Memoria strutturata persistente tra sessioni
$ageaReadMemoryTool = [
    'name' => 'agea_read_memory',
    'description' => 'Legge la mia memoria persistente. Contiene: interessi recenti dell\'utente, argomenti frequenti, entità importanti che ho annotato, insight da conversazioni passate. Usalo per ricordare cosa abbiamo discusso in passato.',
    'parameters' => [
        'type' => 'object',
        'properties' => [],
        'required' => []
    ]
];
$ageaReadMemoryTool['parameters']['properties'] = new stdClass();
$functionDeclarations[] = $ageaReadMemoryTool;

$functionDeclarations[] = [
    'name' => 'agea_update_memory',
    'description' => 'Aggiorna la mia memoria. Usa per salvare: ultimo_argomento (di cosa abbiamo parlato), interesse (un interesse dell\'utente), argomento_frequente (argomento ricorrente).',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'ultimo_argomento' => ['type' => 'string', 'description' => 'Breve sintesi dell\'ultimo argomento discusso'],
            'interesse' => ['type' => 'string', 'description' => 'Un interesse dell\'utente da ricordare'],
            'argomento_frequente' => ['type' => 'string', 'description' => 'Un argomento che l\'utente chiede spesso']
        ],
        'required' => []
    ]
];

$functionDeclarations[] = [
    'name' => 'agea_remember_entity',
    'description' => 'Annota un\'entità importante (cliente, fornitore, cantiere) che l\'utente segue spesso. Così la prossima volta saprò che è importante per lui.',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'entity_id' => ['type' => 'string', 'description' => 'ID dell\'entità'],
            'entity_nome' => ['type' => 'string', 'description' => 'Nome dell\'entità'],
            'nota' => ['type' => 'string', 'description' => 'Nota su perché è importante (es: "segue molto questo cliente", "problemi di pagamento")']
        ],
        'required' => ['entity_id', 'entity_nome']
    ]
];

$functionDeclarations[] = [
    'name' => 'agea_save_insight',
    'description' => 'Salva un insight importante da una conversazione (es: "Calo vendite cliente Rossi - possibile cambio fornitore"). Così la prossima volta posso fare follow-up.',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'sintesi' => ['type' => 'string', 'description' => 'Sintesi dell\'insight (max 200 caratteri)'],
            'tipo' => ['type' => 'string', 'description' => 'Tipo: analisi, problema, opportunita, seguito'],
            'entita_collegate' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'ID delle entità collegate']
        ],
        'required' => ['sintesi']
    ]
];

// TOOL STRUTTURA TEAM - Configurazione entità e prodotti
$getTeamStructureTool = [
    'name' => 'get_team_structure',
    'description' => 'Legge la struttura configurata dall\'utente: tipi di entità, tipologie (colori), campi personalizzati, famiglie prodotto. Chiamalo PRIMA di creare entità per sapere quali tipi e campi esistono.',
    'parameters' => [
        'type' => 'object',
        'properties' => new stdClass()  // Nessun parametro richiesto
    ]
];
$getTeamStructureTool['parameters']['properties'] = new stdClass();
$functionDeclarations[] = $getTeamStructureTool;

// TOOL FILE SYSTEM - Per lazy loading e memoria
$functionDeclarations[] = [
    'name' => 'read_file',
    'description' => 'Leggi il contenuto di un file. Usa per leggere documentazione in backend/config/ai/docs/ o i tuoi appunti in backend/config/ai/memory/',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'path' => ['type' => 'string', 'description' => 'Percorso relativo del file (es: backend/config/ai/docs/workflows.txt)']
        ],
        'required' => ['path']
    ]
];

$functionDeclarations[] = [
    'name' => 'write_file',
    'description' => 'Scrivi contenuto in un file nella tua cartella memoria (backend/config/ai/memory/). Usa per salvare appunti e scoperte.',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'filename' => ['type' => 'string', 'description' => 'Nome del file (es: appunti.txt)'],
            'content' => ['type' => 'string', 'description' => 'Contenuto da scrivere']
        ],
        'required' => ['filename', 'content']
    ]
];

$functionDeclarations[] = [
    'name' => 'list_files',
    'description' => 'Elenca i file in una cartella. Usa per vedere cosa c\'è in backend/config/ai/docs/ o backend/config/ai/memory/',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'path' => ['type' => 'string', 'description' => 'Percorso cartella (es: backend/config/ai/docs)']
        ],
        'required' => ['path']
    ]
];

// TOOL API UNIFICATA - Chiama le stesse API del frontend
$functionDeclarations[] = [
    'name' => 'call_api',
    'description' => 'Chiama un\'API REST del sistema GenAgenta. Usa le stesse API del frontend. Per vedere le API disponibili: read_file("docs/API_INDEX.md")',
    'parameters' => [
        'type' => 'object',
        'properties' => [
            'method' => ['type' => 'string', 'description' => 'HTTP method: GET, POST, PUT, DELETE'],
            'endpoint' => ['type' => 'string', 'description' => 'API endpoint (es: neuroni, sinapsi/123, tipi, tipologie)'],
            'body' => ['type' => 'object', 'description' => 'Request body per POST/PUT (oggetto JSON)']
        ],
        'required' => ['method', 'endpoint']
    ]
];

// Carica system instruction da file (versione CORTA - lazy loading)
$promptFile = __DIR__ . '/../../config/ai/prompt_base.txt';
if (!file_exists($promptFile)) {
    // Fallback al vecchio prompt se nuovo non esiste
    $promptFile = __DIR__ . '/../../config/ai_prompt.txt';
    error_log("PROMPT: usando FALLBACK (vecchio) - " . $promptFile);
} else {
    error_log("PROMPT: usando NUOVO prompt_base.txt - " . $promptFile);
}

if (file_exists($promptFile)) {
    $systemInstruction = file_get_contents($promptFile);
    error_log("PROMPT: lunghezza = " . strlen($systemInstruction) . " caratteri");
    // Sostituisci placeholder con dati utente
    $systemInstruction = str_replace([
        '{{user_nome}}',
        '{{user_email}}',
        '{{user_ruolo}}',
        '{{azienda_id}}'
    ], [
        $user['nome'],
        $user['email'],
        $user['ruolo'],
        $user['azienda_id']
    ], $systemInstruction);

    // Aggiungi contesto UI se presente (entità selezionata)
    error_log("AI CONTEXT: uiContext = " . json_encode($uiContext));
    if ($uiContext && !empty($uiContext['selectedEntity'])) {
        $sel = $uiContext['selectedEntity'];
        $selInfo = "CONTESTO: L'utente ha selezionato sulla mappa: \"{$sel['nome']}\"";
        if (!empty($sel['tipo'])) $selInfo .= " (tipo: {$sel['tipo']})";
        if (!empty($sel['id'])) $selInfo .= " [ID: {$sel['id']}]";
        $selInfo .= ". Quando dice 'questo', 'questa entità', 'connettilo', si riferisce a questa.";
        $systemInstruction .= "\n\n" . $selInfo;
        error_log("AI CONTEXT: aggiunto contesto selezione: " . $selInfo);
    } else {
        error_log("AI CONTEXT: nessuna selezione");
    }

    // Aggiungi contesto marker AI se presenti
    if ($uiContext && !empty($uiContext['aiMarkers']) && is_array($uiContext['aiMarkers'])) {
        $markers = $uiContext['aiMarkers'];
        $markerCount = count($markers);
        $markerInfo = "\n\nMARKER SULLA MAPPA ({$markerCount}):\n";
        foreach ($markers as $m) {
            $markerInfo .= "- [{$m['id']}] \"{$m['label']}\" ({$m['color']}) a ({$m['lat']}, {$m['lng']})\n";
        }
        $markerInfo .= "Usa map_remove_marker(marker_id) per rimuoverne uno, map_clear_markers() per rimuoverli tutti.";
        $systemInstruction .= $markerInfo;
        error_log("AI CONTEXT: aggiunto contesto marker: " . $markerInfo);
    }
} else {
    // Fallback minimo
    $systemInstruction = "Sei l'AI di GenAgenta. Utente: {$user['nome']}. Rispondi in italiano.";
}

// Array per raccogliere azioni frontend (mappa, UI)
$frontendActions = [];

// Array per raccogliere info chiave dai tool results (per memoria contesto)
$toolSummary = [];

// Prepara contenuti per Gemini
$contents = [];

// Aggiungi storia conversazione (ultimi 10 messaggi)
// Include tool_summary per memoria contesto (ID creati, ricerche, etc.)
$history = array_slice($conversationHistory, -10);
foreach ($history as $msg) {
    $role = $msg['role'] === 'assistant' ? 'model' : 'user';

    // Se il messaggio ha tool_summary, aggiungilo al contenuto
    // così l'AI sa quali ID ha creato/trovato
    $content = $msg['content'];
    if (!empty($msg['tool_summary'])) {
        $summaryText = "\n\n[Contesto operazioni: " . json_encode($msg['tool_summary'], JSON_UNESCAPED_UNICODE) . "]";
        $content .= $summaryText;
    }

    $contents[] = [
        'role' => $role,
        'parts' => [['text' => $content]]
    ];
}

// Aggiungi messaggio utente corrente
$contents[] = [
    'role' => 'user',
    'parts' => [['text' => $userMessage]]
];

// Funzione chiamata OpenRouter API (compatibile OpenAI)
function callOpenRouter($apiKey, $systemInstruction, $messages, $tools) {
    $url = "https://openrouter.ai/api/v1/chat/completions";

    // Modello: Claude Sonnet (ottimo bilanciamento qualità/costo)
    // Alternative: 'anthropic/claude-3-haiku' (più economico), 'openai/gpt-4o-mini'
    $model = 'anthropic/claude-sonnet-4';

    $payload = [
        'model' => $model,
        'messages' => $messages,
        'tools' => $tools,
        'temperature' => 0.7,
        'max_tokens' => 4096
    ];

    // Aggiungi system message all'inizio
    array_unshift($payload['messages'], [
        'role' => 'system',
        'content' => $systemInstruction
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
            'HTTP-Referer: https://www.gruppogea.net/genagenta',
            'X-Title: GenAgenta CRM'
        ],
        CURLOPT_TIMEOUT => 60  // 60 secondi per completare le operazioni
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        error_log("OpenRouter cURL error: $curlError");
        return ['error' => 'Errore di connessione', 'details' => $curlError];
    }

    if ($httpCode !== 200) {
        error_log("OpenRouter API error: $httpCode - $response");

        // Decodifica risposta per estrarre errore reale
        $errorData = json_decode($response, true);
        $errorMessage = $errorData['error']['message'] ?? $response;
        $errorCode = $errorData['error']['code'] ?? $httpCode;

        if ($httpCode === 429) {
            return ['error' => 'Troppe richieste - riprova tra qualche secondo', 'details' => $errorMessage, 'code' => 429];
        }
        if ($httpCode === 402) {
            // Mostra errore reale, non messaggio generico
            return ['error' => "Errore pagamento OpenRouter: $errorMessage", 'details' => $errorData, 'code' => 402];
        }
        if ($httpCode === 401) {
            return ['error' => 'API Key OpenRouter non valida o scaduta', 'details' => $errorMessage, 'code' => 401];
        }

        return ['error' => "Errore AI ($httpCode): $errorMessage", 'details' => $errorData, 'code' => $httpCode];
    }

    return json_decode($response, true);
}

// Funzione chiamata Gemini API (principale)
function callGemini($apiKey, $systemInstruction, $contents, $functionDeclarations) {
    $model = 'gemini-2.5-flash';
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

    $payload = [
        'contents' => $contents,
        'systemInstruction' => [
            'parts' => [['text' => $systemInstruction]]
        ],
        'tools' => [
            ['functionDeclarations' => $functionDeclarations]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'maxOutputTokens' => 4096
        ]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 60
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        error_log("Gemini cURL error: $curlError");
        return ['error' => 'Errore di connessione', 'details' => $curlError];
    }

    if ($httpCode !== 200) {
        error_log("Gemini API error: $httpCode - $response");

        if ($httpCode === 429) {
            return ['error' => 'Troppe richieste - riprova tra qualche secondo', 'code' => 429];
        }

        return ['error' => 'Errore comunicazione AI', 'details' => $response, 'code' => $httpCode];
    }

    return json_decode($response, true);
}

// ============================================
// GESTIONE DIVERSA PER OPENROUTER vs GEMINI
// ============================================

if ($useOpenRouter) {
    // ========== OPENROUTER (formato OpenAI) ==========

    // Converti tools al formato OpenAI
    $openaiTools = [];
    foreach ($functionDeclarations as $fd) {
        $openaiTools[] = [
            'type' => 'function',
            'function' => [
                'name' => $fd['name'],
                'description' => $fd['description'],
                'parameters' => $fd['parameters']
            ]
        ];
    }

    // =====================================================
    // FRONTEND EXECUTION: Se resume, usa messages dal context
    // =====================================================
    $frontendActions = [];  // Inizializza qui per entrambi i casi
    $toolSummary = [];  // Per memoria contesto (ID creati, etc.)

    if ($isResume && $resumeContext) {
        // RESUME: Ripristina stato dal context
        $messages = $resumeContext['messages'];
        $frontendActions = $resumeContext['pending_frontend_actions'] ?? [];

        // Aggiungi il risultato dell'azione eseguita dal frontend
        $messages[] = [
            'role' => 'tool',
            'tool_call_id' => $resumeContext['pending_tool_call_id'],
            'content' => json_encode($actionResult ?? ['error' => 'Nessun risultato'], JSON_UNESCAPED_UNICODE)
        ];

        error_log("RESUME: Ripristinato " . count($messages) . " messaggi, aggiunto tool result");
    } else {
        // NORMALE: Costruisci messages dalla history
        // Limita a ultimi 30 messaggi (allineato con frontend)
        // Include tool_summary per memoria contesto (ID creati, ricerche, etc.)
        $limitedHistory = array_slice($conversationHistory, -30);

        $messages = [];
        foreach ($limitedHistory as $msg) {
            // Tronca messaggi troppo lunghi (max 3000 caratteri)
            $content = $msg['content'];
            if (strlen($content) > 3000) {
                $content = substr($content, 0, 3000) . "\n[...messaggio troncato...]";
            }

            // Se il messaggio ha tool_summary, aggiungilo al contenuto
            // così l'AI sa quali ID ha creato/trovato
            if (!empty($msg['tool_summary'])) {
                $summaryText = "\n\n[Contesto operazioni: " . json_encode($msg['tool_summary'], JSON_UNESCAPED_UNICODE) . "]";
                $content .= $summaryText;
            }

            $messages[] = [
                'role' => $msg['role'],
                'content' => $content
            ];
        }
        // Aggiungi messaggio utente corrente
        $messages[] = [
            'role' => 'user',
            'content' => $userMessage
        ];
    }

    // DEBUG: Log dimensione history
    error_log("=== AI CHAT DEBUG ===");
    error_log("History size: " . count($conversationHistory) . " messaggi");
    error_log("Messages size: " . strlen(json_encode($messages)) . " bytes");
    error_log("User message: " . substr($userMessage, 0, 100));

    // Variabile per tracciare se abbiamo fatto compaction
    $didCompaction = false;
    $compactionSummary = null;  // Il riassunto da restituire al frontend
    $messageCountBefore = count($messages);

    // ====== SMART COMPACTION: Riassumi conversazione lunga ======
    // Threshold basato sulla history ORIGINALE ricevuta dal frontend
    // Se il frontend manda più di 30 messaggi, facciamo compaction
    // (il problema era la DIMENSIONE dei messaggi, non il numero - ora tronchiamo a 1500 char)
    if (count($conversationHistory) > 30) {
        error_log("COMPACTION: Conversazione lunga (" . count($messages) . " msg), creo riassunto");
        $didCompaction = true;

        // Chiedi all'AI di riassumere la conversazione
        $summaryRequest = [
            [
                'role' => 'system',
                'content' => 'Riassumi questa conversazione in 2-3 frasi. Includi: cosa ha chiesto l\'utente, cosa è stato fatto, eventuali dati importanti menzionati. Rispondi SOLO con il riassunto, niente altro.'
            ],
            [
                'role' => 'user',
                'content' => "Conversazione da riassumere:\n" . json_encode(array_slice($messages, 0, -1), JSON_UNESCAPED_UNICODE)
            ]
        ];

        // Chiamata veloce per il riassunto (senza tools)
        $summaryPayload = [
            'model' => 'anthropic/claude-3-haiku',  // Haiku è più veloce per riassunti
            'messages' => $summaryRequest,
            'temperature' => 0.3,
            'max_tokens' => 200
        ];

        $ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($summaryPayload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $OPENROUTER_API_KEY,
                'HTTP-Referer: https://www.gruppogea.net/genagenta',
                'X-Title: GenAgenta CRM'
            ],
            CURLOPT_TIMEOUT => 30
        ]);

        $summaryResponse = curl_exec($ch);
        curl_close($ch);

        $summaryData = json_decode($summaryResponse, true);
        $summary = $summaryData['choices'][0]['message']['content'] ?? null;

        if ($summary) {
            error_log("COMPACTION: Riassunto creato: " . substr($summary, 0, 100) . "...");

            // Salva il riassunto per restituirlo al frontend
            $compactionSummary = $summary;

            // Sostituisci la history con il riassunto + ultimo messaggio utente
            $messages = [
                [
                    'role' => 'assistant',
                    'content' => "[Riassunto conversazione precedente: $summary]"
                ],
                end($messages)  // Ultimo messaggio (quello attuale dell'utente)
            ];
        } else {
            // Fallback: taglia semplicemente
            error_log("COMPACTION: Riassunto fallito, uso fallback");
            $messages = array_slice($messages, -4);
        }
    }

    // ====== ANTI-LOOP PROTECTION ======
    // Traccia tool calls per prevenire loop
    // Se resume, ripristina i contatori dal context
    if ($isResume && $resumeContext) {
        $toolCallCounts = $resumeContext['tool_call_counts'] ?? [];
        $totalToolCalls = array_sum($toolCallCounts);
        $iteration = $resumeContext['iteration'] ?? 0;
        $lastTextContent = $resumeContext['last_text_content'] ?? null;
        error_log("RESUME: Ripristinati contatori - iteration=$iteration, toolCalls=$totalToolCalls");
    } else {
        $toolCallCounts = [];
        $totalToolCalls = 0;
        $iteration = 0;
        $lastTextContent = null;
    }
    $hasExecutedMapAction = false;  // Flag per azioni mappa
    $hasToolError = false;  // Flag per errori nei tool - se true, dai all'AI un'altra chance di rispondere
    $failedEndpoints = [];  // Traccia endpoint call_api che hanno dato 404 - anti-loop

    // Loop per gestire tool calls - 20 iterazioni per dare libertà all'AI
    // L'AI deve poter esplorare DB, leggere file, sbagliare e correggersi
    $maxIterations = 20;
    $finalResponse = null;

    while ($iteration < $maxIterations) {
        $iteration++;
        $messagesSize = strlen(json_encode($messages));
        error_log("Iteration $iteration - Messages: " . count($messages) . " (~" . round($messagesSize/1024, 1) . "KB)");

        // Debug log - cosa mandiamo all'AI
        aiDebugLog('API_REQUEST', [
            'iteration' => $iteration,
            'messages_count' => count($messages),
            'payload_size_kb' => round($messagesSize/1024, 1),
            'messages_preview' => formatMessagesForDebug($messages)
        ]);

        $response = callOpenRouter($OPENROUTER_API_KEY, $systemInstruction, $messages, $openaiTools);

        if (isset($response['error'])) {
            error_log("OpenRouter error: " . json_encode($response));
            error_log("OpenRouter error - messages sent: " . json_encode(array_map(function($m) {
                return ['role' => $m['role'] ?? '?', 'has_content' => isset($m['content']), 'has_tool_calls' => isset($m['tool_calls'])];
            }, $messages)));
            // NON restituire 500! Restituisci messaggio AI con HTTP 200
            $errorMsg = $response['error'] . ' - ' . ($response['details'] ?? '');
            aiDebugLog('OPENROUTER_ERROR', [
                'error' => $response['error'],
                'details' => $response['details'] ?? null,
                'iteration' => $iteration,
                'messages_structure' => array_map(function($m) {
                    return ['role' => $m['role'] ?? '?', 'content_length' => strlen($m['content'] ?? ''), 'has_tool_calls' => isset($m['tool_calls'])];
                }, $messages)
            ]);
            jsonResponse([
                'response' => "Mi dispiace, c'è un problema di comunicazione con il servizio AI. Riprova tra qualche secondo.",
                'iterations' => $iteration,
                'context' => ['error_details' => $errorMsg]
            ]);
        }

        // Estrai la risposta
        $choices = $response['choices'] ?? [];
        if (empty($choices)) {
            error_log("OpenRouter no choices: " . json_encode($response));
            // NON restituire 500! Restituisci messaggio AI con HTTP 200
            jsonResponse([
                'response' => "Mi dispiace, non ho ricevuto una risposta valida. Riprova.",
                'iterations' => $iteration,
                'context' => ['error_details' => 'No choices in response']
            ]);
        }

        $choice = $choices[0];
        $message = $choice['message'] ?? [];
        $finishReason = $choice['finish_reason'] ?? 'stop';

        // Controlla se ci sono tool calls
        $toolCalls = $message['tool_calls'] ?? [];
        $textContent = $message['content'] ?? null;

        // IMPORTANTE: Salva SEMPRE l'ultimo testo valido (Claude può mandare testo + tool calls insieme)
        if (!empty($textContent)) {
            $lastTextContent = $textContent;
            error_log("Salvato textContent: " . substr($textContent, 0, 50) . "...");
        }

        error_log("Iteration $iteration - finish_reason: $finishReason, Tool calls: " . count($toolCalls) . ", Has text: " . ($textContent ? 'yes' : 'no'));

        // Debug log - risposta AI
        aiDebugLog('API_RESPONSE', [
            'iteration' => $iteration,
            'finish_reason' => $finishReason,
            'has_text' => !empty($textContent),
            'text_preview' => $textContent ? (strlen($textContent) > 200 ? substr($textContent, 0, 200) . '...' : $textContent) : null,
            'tool_calls_count' => count($toolCalls),
            'tool_calls' => array_map(function($tc) {
                return [
                    'name' => $tc['function']['name'] ?? 'unknown',
                    'args' => json_decode($tc['function']['arguments'] ?? '{}', true)
                ];
            }, $toolCalls)
        ]);

        // BEST PRACTICE: Usa finish_reason per determinare quando fermarsi
        // 'stop' = risposta finale completata
        // 'tool_calls' = Claude vuole eseguire tool
        // 'length' = limite token raggiunto
        if ($finishReason === 'stop' || $finishReason === 'length') {
            $finalResponse = $textContent ?? $lastTextContent ?? "Risposta completata.";
            error_log("Final response (finish_reason=$finishReason), length: " . strlen($finalResponse));
            break;
        }

        // Se finish_reason non è 'stop', deve essere 'tool_calls' - verifica che ci siano effettivamente tool
        if (empty($toolCalls)) {
            // Situazione anomala: finish_reason non è 'stop' ma non ci sono tool calls
            error_log("WARNING: finish_reason=$finishReason ma nessun tool call!");
            $finalResponse = $textContent ?? $lastTextContent ?? "Risposta completata.";
            break;
        }

        // Log dei tool chiamati
        foreach ($toolCalls as $tc) {
            error_log("Tool call: " . ($tc['function']['name'] ?? 'unknown'));
        }

        // ====== ANTI-LOOP: Verifica se stiamo entrando in loop ======
        $totalToolCalls += count($toolCalls);

        // Se troppi tool calls totali (>20), forza una risposta
        if ($totalToolCalls > 20) {
            error_log("ANTI-LOOP: Troppi tool calls ($totalToolCalls), forzo risposta");
            $finalResponse = $lastTextContent ?? "Ho elaborato la tua richiesta. C'è altro?";
            break;
        }

        // Aggiungi il messaggio dell'assistente con le tool calls
        // IMPORTANTE: Assicurati che content sia una stringa (anche vuota) per compatibilità OpenAI
        if (!isset($message['content']) || $message['content'] === null) {
            $message['content'] = '';
        }
        $messages[] = $message;

        // Esegui le tool calls
        foreach ($toolCalls as $tc) {
            $funcName = $tc['function']['name'] ?? '';
            // Fix: json_decode("null") restituisce null, non array - gestiamo il caso
            $funcArgs = json_decode($tc['function']['arguments'] ?? '{}', true) ?? [];
            $toolCallId = $tc['id'] ?? '';

            // ====== ANTI-LOOP: Blocca tool ripetitivi ======
            // Traccia quante volte viene chiamato ogni tool
            $toolCallCounts[$funcName] = ($toolCallCounts[$funcName] ?? 0) + 1;

            // Blocca qualsiasi tool chiamato più di 10 volte (era 3, troppo basso per esplorare)
            if ($toolCallCounts[$funcName] > 10) {
                error_log("ANTI-LOOP: Blocco $funcName (chiamato {$toolCallCounts[$funcName]} volte)");
                $result = ['blocked' => true, 'message' => "Tool $funcName già usato troppe volte (max 10)"];
                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $toolCallId,
                    'content' => json_encode($result)
                ];
                continue;
            }

            // =====================================================
            // FRONTEND EXECUTION: Sospendi su WRITE tools
            // =====================================================
            if (isWriteTool($funcName, $funcArgs)) {
                error_log("FRONTEND_EXEC: Write tool $funcName - sospendo e ritorno pending_action");

                // Prepara pending_action per il frontend
                $pendingAction = mapToolToFrontendAction($funcName, $funcArgs);

                // Prepara resume_context per riprendere
                $resumeContextOut = [
                    'messages' => $messages,
                    'pending_tool_call_id' => $toolCallId,
                    'pending_tool_name' => $funcName,
                    'pending_tool_args' => $funcArgs,
                    'pending_frontend_actions' => $frontendActions,
                    'iteration' => $iteration,
                    'tool_call_counts' => $toolCallCounts,
                    'last_text_content' => $lastTextContent
                ];

                // Log debug - include TUTTO il pendingAction per debugging
                aiDebugLog('PENDING_ACTION', [
                    'tool' => $funcName,
                    'pending_action_full' => $pendingAction,
                    'iteration' => $iteration
                ]);

                // Ritorna al frontend per eseguire l'azione
                jsonResponse([
                    'status' => 'pending_action',
                    'pending_action' => $pendingAction,
                    'resume_context' => $resumeContextOut,
                    'partial_response' => $lastTextContent
                ]);
                exit; // IMPORTANTE: esce dal loop e dallo script
            }

            // ====== ANTI-LOOP 404: Blocca endpoint già falliti ======
            if ($funcName === 'call_api') {
                $endpoint = $funcArgs['endpoint'] ?? '';
                $endpointKey = strtoupper($funcArgs['method'] ?? 'GET') . ':' . $endpoint;
                if (isset($failedEndpoints[$endpointKey])) {
                    error_log("ANTI-LOOP: Blocco $endpointKey (già fallito con 404)");
                    $result = [
                        'blocked' => true,
                        'error' => "Questo endpoint ha già dato errore 404. NON riprovare lo stesso endpoint! Leggi docs/API_INDEX.md per gli endpoint corretti."
                    ];
                    $messages[] = [
                        'role' => 'tool',
                        'tool_call_id' => $toolCallId,
                        'content' => json_encode($result)
                    ];
                    continue;
                }
            }

            // Esegui il tool (solo READ tools arrivano qui)
            try {
                $result = executeAiTool($funcName, $funcArgs, $user);

                // ====== ANTI-LOOP 404: Traccia endpoint falliti ======
                if ($funcName === 'call_api' && isset($result['http_code']) && $result['http_code'] === 404) {
                    $endpoint = $funcArgs['endpoint'] ?? '';
                    $endpointKey = strtoupper($funcArgs['method'] ?? 'GET') . ':' . $endpoint;
                    $failedEndpoints[$endpointKey] = true;
                    error_log("ANTI-LOOP: Tracciato $endpointKey come fallito (404)");
                }

                // Debug log - tool eseguito
                aiDebugLog('TOOL_EXECUTED', [
                    'name' => $funcName,
                    'args' => $funcArgs,
                    'success' => !isset($result['error']),
                    'result_preview' => is_array($result) ?
                        (strlen(json_encode($result)) > 300 ? '[Risultato grande: ' . strlen(json_encode($result)) . ' bytes]' : $result)
                        : $result
                ]);

                // Se il tool ha restituito un errore, segnalo per dare all'AI la possibilità di rispondere
                if (isset($result['error'])) {
                    $hasToolError = true;
                    error_log("FLAG: Tool $funcName ha restituito errore");
                }
            } catch (Exception $e) {
                error_log("Tool execution error ($funcName): " . $e->getMessage());
                $result = ['error' => "Errore: " . $e->getMessage()];
                aiDebugLog('TOOL_ERROR', ['name' => $funcName, 'error' => $e->getMessage()]);
            } catch (Error $e) {
                error_log("Tool execution fatal error ($funcName): " . $e->getMessage());
                $result = ['error' => "Errore fatale: " . $e->getMessage()];
                aiDebugLog('TOOL_ERROR', ['name' => $funcName, 'error' => $e->getMessage()]);
            }

            // Se il tool ha generato un'azione frontend, raccoglila
            if (isset($result['_frontend_action'])) {
                $frontendActions[] = $result['_frontend_action'];
                // Segna che abbiamo fatto un'azione mappa (per fermarci prima)
                $actionType = $result['_frontend_action']['type'] ?? '';
                if (in_array($actionType, ['map_fly_to', 'map_select_entity', 'map_show_connections'])) {
                    $hasExecutedMapAction = true;
                    error_log("FLAG: Azione mappa eseguita ($actionType)");
                }
                unset($result['_frontend_action']);
            }

            // Estrai info chiave per la memoria contesto
            $keyInfo = extractKeyInfo($funcName, $result);
            if ($keyInfo !== null) {
                $toolSummary[] = $keyInfo;
            }

            // Aggiungi la risposta del tool (tronca se > 5KB)
            $resultJson = json_encode($result, JSON_UNESCAPED_UNICODE);
            if (strlen($resultJson) > 5000) {
                error_log("TRUNCATE: Tool result troppo grande (" . strlen($resultJson) . " bytes), tronco");
                // Prova a ridurre i dati mantenendo la struttura
                if (isset($result['data']) && is_array($result['data']) && count($result['data']) > 10) {
                    $result['data'] = array_slice($result['data'], 0, 10);
                    $result['_truncated'] = true;
                    $resultJson = json_encode($result, JSON_UNESCAPED_UNICODE);
                }
                // Se ancora troppo grande, tronca
                if (strlen($resultJson) > 5000) {
                    $resultJson = substr($resultJson, 0, 5000) . '...}';
                }
            }
            $messages[] = [
                'role' => 'tool',
                'tool_call_id' => $toolCallId,
                'content' => $resultJson
            ];
        }

        // Se abbiamo eseguito un'azione mappa E NON ci sono stati errori, fermiamoci
        // MA diamo all'AI almeno 3 iterazioni per completare operazioni complesse
        if ($hasExecutedMapAction && $iteration >= 3 && !$hasToolError) {
            error_log("STOP: Azione mappa eseguita senza errori, mi fermo per rispondere");
            $finalResponse = $lastTextContent ?? "Fatto!";
            break;
        }

        // Reset flag errore per la prossima iterazione
        $hasToolError = false;

        // ====== COMPATTA TOOL RESULTS VECCHI ======
        // Problema: ad ogni iterazione, i tool results si accumulano in $messages
        // e vengono TUTTI passati alla prossima chiamata API → crescita esponenziale
        // Soluzione: mantieni solo l'ultimo set di tool results che matchano l'ultimo assistant+tool_calls
        if ($iteration > 1 && count($messages) > 10) {
            $newMessages = [];
            $toolResultsToKeep = [];
            $lastAssistantWithTools = null;
            $validToolCallIds = [];  // IDs delle tool_calls da tenere

            // PRIMO PASSO: trova l'ultimo assistant con tool_calls e raccogli i suoi IDs
            for ($i = count($messages) - 1; $i >= 0; $i--) {
                $msg = $messages[$i];
                if ($msg['role'] === 'assistant' && isset($msg['tool_calls'])) {
                    $lastAssistantWithTools = $msg;
                    // Raccogli gli IDs delle tool_calls di questo assistant
                    foreach ($msg['tool_calls'] as $tc) {
                        $validToolCallIds[] = $tc['id'] ?? '';
                    }
                    break;  // Trovato, esci
                }
            }

            // SECONDO PASSO: scorri i messaggi e tieni solo quelli validi
            for ($i = count($messages) - 1; $i >= 0; $i--) {
                $msg = $messages[$i];

                if ($msg['role'] === 'tool') {
                    // Tool result - tieni SOLO se il suo tool_call_id è tra quelli validi
                    $toolCallId = $msg['tool_call_id'] ?? '';
                    if (in_array($toolCallId, $validToolCallIds)) {
                        array_unshift($toolResultsToKeep, $msg);
                    }
                    // Se non matcha, viene SCARTATO
                } elseif ($msg['role'] === 'assistant' && isset($msg['tool_calls'])) {
                    // Assistant con tool_calls - già gestito sopra, SCARTA tutti tranne lastAssistantWithTools
                    // (non fare nulla qui, verrà aggiunto dopo)
                } else {
                    // Messaggi normali (user, assistant SENZA tool_calls)
                    array_unshift($newMessages, $msg);
                }
            }

            // Ricostruisci: messaggi normali + ultimo assistant con tools + ultimi tool results
            if ($lastAssistantWithTools) {
                $newMessages[] = $lastAssistantWithTools;
            }
            $newMessages = array_merge($newMessages, $toolResultsToKeep);

            $oldCount = count($messages);
            $messages = $newMessages;
            error_log("COMPATTA: $oldCount → " . count($messages) . " messaggi (rimossi tool results vecchi)");
        }
    }

} else {
    // ========== GEMINI (formato Google) ==========

    // Loop per gestire function calls
    $maxIterations = 20;
    $iteration = 0;
    $finalResponse = null;

    while ($iteration < $maxIterations) {
        $iteration++;

        // Debug: log contents prima di chiamare Gemini
        error_log("Gemini iteration $iteration - contents count: " . count($contents));
        aiDebugLog('GEMINI_API_REQUEST', [
            'iteration' => $iteration,
            'contents_count' => count($contents),
            'contents_size_kb' => round(strlen(json_encode($contents))/1024, 1)
        ]);

        $response = callGemini($GEMINI_API_KEY, $systemInstruction, $contents, $functionDeclarations);

        if (isset($response['error'])) {
            error_log("Gemini error response: " . json_encode($response));
            aiDebugLog('GEMINI_API_ERROR', [
                'iteration' => $iteration,
                'error' => $response['error'],
                'details' => $response['details'] ?? null,
                'code' => $response['code'] ?? null,
                'contents_last_role' => end($contents)['role'] ?? 'unknown'
            ]);
            // NON restituire 500! Restituisci messaggio AI con HTTP 200
            jsonResponse([
                'response' => "Mi dispiace, c'è stato un problema con il servizio AI. " . ($response['error'] ?? ''),
                'iterations' => $iteration,
                'context' => ['error_details' => $response['details'] ?? '']
            ]);
        }

        // Estrai candidate
        $candidates = $response['candidates'] ?? [];
        if (empty($candidates)) {
            error_log("Gemini no candidates: " . json_encode($response));
            errorResponse('Nessuna risposta da Gemini', 500);
        }

        $candidate = $candidates[0];
        $finishReason = $candidate['finishReason'] ?? 'STOP';

        // DEBUG: Log dettagliato del candidate per diagnosticare risposte vuote
        aiDebugLog('GEMINI_CANDIDATE_DEBUG', [
            'iteration' => $iteration,
            'finishReason' => $finishReason,
            'has_content' => isset($candidate['content']),
            'has_parts' => isset($candidate['content']['parts']),
            'parts_count' => isset($candidate['content']['parts']) ? count($candidate['content']['parts']) : 0,
            'candidate_keys' => array_keys($candidate),
            'content_preview' => isset($candidate['content']) ? json_encode($candidate['content']) : 'NULL'
        ]);

        // Gestisci casi in cui content potrebbe essere null
        if (!isset($candidate['content']) || !isset($candidate['content']['parts'])) {
            error_log("GEMINI EMPTY RESPONSE - finishReason: $finishReason, candidate: " . json_encode($candidate));
            aiDebugLog('GEMINI_EMPTY_RESPONSE', [
                'finishReason' => $finishReason,
                'candidate' => $candidate,
                'frontendActions_count' => count($frontendActions)
            ]);
            if ($finishReason === 'SAFETY' || $finishReason === 'RECITATION') {
                errorResponse("Risposta bloccata per sicurezza ($finishReason)", 400);
            }
            if (!empty($frontendActions)) {
                $finalResponse = "Fatto!";
                break;
            }
            $finalResponse = "Non ho potuto generare una risposta. Riprova.";
            break;
        }

        $parts = $candidate['content']['parts'];

        // Controlla se ci sono function calls
        $functionCalls = [];
        $textResponse = null;

        foreach ($parts as $part) {
            if (isset($part['functionCall'])) {
                $functionCalls[] = $part['functionCall'];
            }
            if (isset($part['text'])) {
                $textResponse = $part['text'];
            }
        }

        // Se non ci sono function calls, abbiamo la risposta finale
        if (empty($functionCalls)) {
            $finalResponse = $textResponse ?? "Risposta non disponibile.";
            break;
        }

        // Esegui le function calls
        $functionResponses = [];
        foreach ($functionCalls as $fc) {
            $funcName = $fc['name'];
            $funcArgs = $fc['args'] ?? [];

            aiDebugLog('GEMINI_TOOL_CALL', [
                'name' => $funcName,
                'args' => $funcArgs,
                'iteration' => $iteration
            ]);

            try {
                $result = executeAiTool($funcName, $funcArgs, $user);

                aiDebugLog('GEMINI_TOOL_RESULT', [
                    'name' => $funcName,
                    'success' => !isset($result['error']),
                    'result_preview' => substr(json_encode($result), 0, 500)
                ]);
            } catch (Exception $e) {
                $result = ['error' => "Errore: " . $e->getMessage()];
                aiDebugLog('GEMINI_TOOL_ERROR', ['name' => $funcName, 'error' => $e->getMessage()]);
            } catch (Error $e) {
                $result = ['error' => "Errore fatale: " . $e->getMessage()];
                aiDebugLog('GEMINI_TOOL_ERROR', ['name' => $funcName, 'error' => $e->getMessage()]);
            }

            if (isset($result['_frontend_action'])) {
                $frontendActions[] = $result['_frontend_action'];
                unset($result['_frontend_action']);
            }

            // Estrai info chiave per la memoria contesto
            $keyInfo = extractKeyInfo($funcName, $result);
            if ($keyInfo !== null) {
                $toolSummary[] = $keyInfo;
            }

            $functionResponses[] = [
                'functionResponse' => [
                    'name' => $funcName,
                    'response' => $result
                ]
            ];
        }

        // Aggiungi la risposta del model con function calls
        // IMPORTANTE: Sanitizza $parts per assicurarsi che 'args' sia sempre un oggetto, non un array
        // Gemini rifiuta args: [] ma accetta args: {}
        $sanitizedParts = [];
        foreach ($parts as $part) {
            if (isset($part['functionCall'])) {
                $fc = $part['functionCall'];
                // Se args è un array vuoto, convertilo in oggetto vuoto
                if (isset($fc['args']) && is_array($fc['args']) && empty($fc['args'])) {
                    $fc['args'] = new stdClass();
                }
                $sanitizedParts[] = ['functionCall' => $fc];
            } else {
                $sanitizedParts[] = $part;
            }
        }
        $contents[] = [
            'role' => 'model',
            'parts' => $sanitizedParts
        ];

        // Aggiungi i risultati delle funzioni
        $contents[] = [
            'role' => 'user',
            'parts' => $functionResponses
        ];
    }
}

if ($finalResponse === null) {
    error_log("WARNING: maxIterations reached without final response");
    // Prova a usare l'ultimo testo ricevuto
    if (!empty($lastTextContent)) {
        $finalResponse = $lastTextContent;
        error_log("Usando lastTextContent come fallback");
    }
    // Se abbiamo eseguito azioni, conferma almeno quelle
    elseif (!empty($frontendActions)) {
        $finalResponse = "Ho eseguito " . count($frontendActions) . " azioni. C'è altro che posso fare?";
    } else {
        // Ultima chance: fai una chiamata senza tools per forzare risposta
        error_log("Forcing final response without tools");
        $forcedMessages = $messages;
        $forcedMessages[] = ['role' => 'user', 'content' => 'Riassumi brevemente cosa hai fatto e se ci sono problemi.'];

        $forcedPayload = [
            'model' => $selectedModel,
            'messages' => array_slice($forcedMessages, -5),
            'max_tokens' => 200
        ];

        $forcedResponse = @file_get_contents($openRouterUrl, false, stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\nAuthorization: Bearer $openRouterKey",
                'content' => json_encode($forcedPayload),
                'timeout' => 15
            ]
        ]));

        if ($forcedResponse) {
            $forcedData = json_decode($forcedResponse, true);
            $forcedText = $forcedData['choices'][0]['message']['content'] ?? null;
            if ($forcedText) {
                $finalResponse = $forcedText;
            }
        }

        if ($finalResponse === null) {
            $finalResponse = "Mi dispiace, ho avuto difficoltà a completare la richiesta. Riprova con istruzioni più semplici.";
        }
    }
}

// Debug log - risposta finale
aiDebugLog('FINAL_RESPONSE', [
    'response_preview' => strlen($finalResponse) > 300 ? substr($finalResponse, 0, 300) . '...' : $finalResponse,
    'iterations' => $iteration,
    'actions_count' => count($frontendActions),
    'actions' => $frontendActions
]);

// Risposta con eventuali azioni frontend
$responseData = [
    'response' => $finalResponse,
    'iterations' => $iteration,
    'context' => [
        'messages_count' => $useOpenRouter ? count($messages) : count($contents),
        'did_compaction' => $useOpenRouter ? ($didCompaction ?? false) : false,
        'compaction_threshold' => 30,  // Quando scatta la compaction (basato su history originale)
        'compaction_summary' => $useOpenRouter ? ($compactionSummary ?? null) : null  // Riassunto per frontend
    ]
];

// Aggiungi azioni frontend se presenti
if (!empty($frontendActions)) {
    $responseData['actions'] = $frontendActions;
}

// Aggiungi tool_summary per memoria contesto (ID creati, ricerche, etc.)
if (!empty($toolSummary)) {
    $responseData['tool_summary'] = $toolSummary;
}

jsonResponse($responseData);
