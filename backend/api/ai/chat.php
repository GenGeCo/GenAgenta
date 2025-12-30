<?php
/**
 * POST /ai/chat
 * Endpoint principale per chat con AI
 *
 * L'AI ha accesso a tools per interrogare il sistema
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/tools.php';

// Auth richiesta
$user = requireAuth();

// Config AI (da spostare in config.php)
$CLAUDE_API_KEY = getenv('CLAUDE_API_KEY') ?: (defined('CLAUDE_API_KEY') ? CLAUDE_API_KEY : null);

if (!$CLAUDE_API_KEY) {
    errorResponse('API Key Claude non configurata', 500);
}

$data = getJsonBody();
$userMessage = $data['message'] ?? '';
$conversationHistory = $data['history'] ?? [];

if (empty($userMessage)) {
    errorResponse('Messaggio richiesto', 400);
}

// Definizione tools disponibili per l'AI
$tools = [
    [
        'name' => 'query_database',
        'description' => 'Esegue una query SQL SELECT sul database. Usa questo per recuperare dati strutturati. Il database contiene: neuroni (entità), sinapsi (connessioni), vendite_prodotto, famiglie_prodotto, utenti, tipi, tipologie.',
        'input_schema' => [
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
        'input_schema' => [
            'type' => 'object',
            'properties' => [],
            'required' => []
        ]
    ],
    [
        'name' => 'search_entities',
        'description' => 'Cerca entità (neuroni) per nome, tipo o categoria.',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'Testo da cercare nel nome o indirizzo'
                ],
                'tipo' => [
                    'type' => 'string',
                    'description' => 'Filtra per tipo: persona, impresa, luogo, cantiere'
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
        'name' => 'get_entity_details',
        'description' => 'Ottiene tutti i dettagli di una specifica entità incluse le sue connessioni e transazioni.',
        'input_schema' => [
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
        'input_schema' => [
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
        'input_schema' => [
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
        'input_schema' => [
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
        'name' => 'create_entity',
        'description' => 'Crea una nuova entità (neurone) nel sistema: persona, impresa, luogo o cantiere.',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'nome' => [
                    'type' => 'string',
                    'description' => 'Nome dell\'entità'
                ],
                'tipo' => [
                    'type' => 'string',
                    'description' => 'Tipo: persona, impresa, luogo, cantiere'
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
                'note' => [
                    'type' => 'string',
                    'description' => 'Note aggiuntive'
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
        'description' => 'Aggiorna una entità esistente.',
        'input_schema' => [
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
                    'description' => 'Nuove categorie'
                ]
            ],
            'required' => ['entity_id']
        ]
    ],
    [
        'name' => 'create_connection',
        'description' => 'Crea una connessione (sinapsi) tra due entità.',
        'input_schema' => [
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
        'input_schema' => [
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
        'input_schema' => [
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
    ]
];

// System prompt con contesto
$systemPrompt = <<<PROMPT
Sei l'assistente AI di GenAgenta, un CRM per la gestione delle relazioni commerciali.

CONTESTO UTENTE:
- Nome: {$user['nome']}
- Email: {$user['email']}
- Ruolo: {$user['ruolo']}
- Azienda ID: {$user['azienda_id']}

STRUTTURA DATI:
- Neuroni = Entità (persone, aziende, luoghi, cantieri)
- Sinapsi = Connessioni tra entità (relazioni commerciali, tecniche, etc.)
- Vendite = Transazioni con importo e data

REGOLE:
1. Rispondi SEMPRE in italiano
2. Sii conciso ma completo
3. Se non hai abbastanza dati, usa i tools per recuperarli
4. Per query SQL, filtra SEMPRE per azienda_id = '{$user['azienda_id']}' per sicurezza
5. Non inventare dati - se non li trovi, dillo
6. Formatta numeri e valute in modo leggibile (€ 1.234,56)

TOOLS DI LETTURA:
- query_database: per query SQL personalizzate (solo SELECT)
- get_database_schema: per conoscere struttura tabelle
- search_entities: per cercare entità per nome
- get_entity_details: per dettagli completi di un'entità
- get_sales_stats: per statistiche vendite
- get_connections: per vedere connessioni tra entità

TOOLS DI SCRITTURA:
- geocode_address: per cercare un indirizzo e ottenere coordinate GPS
- create_entity: per creare nuove entità (persone, aziende, luoghi, cantieri)
- update_entity: per aggiornare entità esistenti
- create_connection: per creare connessioni tra entità
- create_sale: per registrare vendite/transazioni
- create_note: per aggiungere note alle entità

WORKFLOW TIPICO PER CREARE ENTITÀ CON INDIRIZZO:
1. Usa geocode_address per trovare le coordinate dell'indirizzo
2. Usa create_entity passando lat, lng e indirizzo ottenuti
PROMPT;

// Prepara messaggi per Claude
$messages = [];

// Aggiungi storia conversazione (ultimi 10 messaggi)
$history = array_slice($conversationHistory, -10);
foreach ($history as $msg) {
    $messages[] = [
        'role' => $msg['role'],
        'content' => $msg['content']
    ];
}

// Aggiungi messaggio utente corrente
$messages[] = [
    'role' => 'user',
    'content' => $userMessage
];

// Chiamata Claude API
function callClaude($apiKey, $system, $messages, $tools, $maxTokens = 4096) {
    $url = 'https://api.anthropic.com/v1/messages';

    $payload = [
        'model' => 'claude-sonnet-4-20250514',
        'max_tokens' => $maxTokens,
        'system' => $system,
        'messages' => $messages,
        'tools' => $tools
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("Claude API error: $httpCode - $response");
        return ['error' => 'Errore comunicazione AI', 'details' => $response];
    }

    return json_decode($response, true);
}

// Loop per gestire tool calls
$maxIterations = 5; // Massimo 5 tool calls per richiesta
$iteration = 0;
$finalResponse = null;

while ($iteration < $maxIterations) {
    $iteration++;

    $response = callClaude($CLAUDE_API_KEY, $systemPrompt, $messages, $tools);

    if (isset($response['error'])) {
        errorResponse($response['error'], 500);
    }

    $stopReason = $response['stop_reason'] ?? 'end_turn';
    $content = $response['content'] ?? [];

    // Se stop_reason è 'end_turn', abbiamo la risposta finale
    if ($stopReason === 'end_turn') {
        // Estrai testo dalla risposta
        foreach ($content as $block) {
            if ($block['type'] === 'text') {
                $finalResponse = $block['text'];
                break;
            }
        }
        break;
    }

    // Se stop_reason è 'tool_use', esegui i tools
    if ($stopReason === 'tool_use') {
        $toolResults = [];

        foreach ($content as $block) {
            if ($block['type'] === 'tool_use') {
                $toolName = $block['name'];
                $toolInput = $block['input'];
                $toolId = $block['id'];

                // Esegui il tool
                $result = executeAiTool($toolName, $toolInput, $user);

                $toolResults[] = [
                    'type' => 'tool_result',
                    'tool_use_id' => $toolId,
                    'content' => json_encode($result, JSON_UNESCAPED_UNICODE)
                ];
            }
        }

        // Aggiungi risposta assistant con tool_use
        $messages[] = [
            'role' => 'assistant',
            'content' => $content
        ];

        // Aggiungi risultati tools
        $messages[] = [
            'role' => 'user',
            'content' => $toolResults
        ];
    }
}

if ($finalResponse === null) {
    $finalResponse = "Mi dispiace, non sono riuscito a completare la richiesta. Riprova.";
}

// Risposta
jsonResponse([
    'response' => $finalResponse,
    'iterations' => $iteration
]);
