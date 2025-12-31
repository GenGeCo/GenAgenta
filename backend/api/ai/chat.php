<?php
/**
 * POST /ai/chat
 * Endpoint principale per chat con AI (Gemini)
 *
 * L'AI ha accesso a tools per interrogare e modificare il sistema
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/tools.php';

// Auth richiesta
$user = requireAuth();

// Config AI - Gemini
$GEMINI_API_KEY = getenv('GEMINI_API_KEY') ?: (defined('GEMINI_API_KEY') ? GEMINI_API_KEY : null);

if (!$GEMINI_API_KEY) {
    errorResponse('API Key Gemini non configurata. Vai su https://aistudio.google.com/apikey per ottenere una chiave gratuita.', 500);
}

$data = getJsonBody();
$userMessage = $data['message'] ?? '';
$conversationHistory = $data['history'] ?? [];

if (empty($userMessage)) {
    errorResponse('Messaggio richiesto', 400);
}

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
        'name' => 'create_entity',
        'description' => 'Crea una nuova entità (neurone) nel sistema: persona, impresa, luogo o cantiere.',
        'parameters' => [
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
                    'description' => 'Nuove categorie'
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
        'description' => 'Sposta la vista della mappa 3D verso coordinate specifiche. Usa questo quando l\'utente chiede di "vedere", "mostrare", "inquadrare", "andare a" un luogo.',
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
                    'description' => 'Livello di zoom (1-20, default 15)'
                ],
                'pitch' => [
                    'type' => 'number',
                    'description' => 'Inclinazione camera in gradi (0-85, default 60)'
                ]
            ],
            'required' => ['lat', 'lng']
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

    // TOOL AUTONOMIA - Esplora, impara, proponi miglioramenti
    [
        'name' => 'explore_code',
        'description' => 'Esplora il codice sorgente del progetto GenAgenta. Usalo per capire come funziona qualcosa, cercare funzioni, o scoprire come implementare nuove feature. Senza parametri mostra la struttura del progetto.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'path' => [
                    'type' => 'string',
                    'description' => 'Percorso file da leggere (es. frontend/src/components/MapView.tsx)'
                ],
                'search' => [
                    'type' => 'string',
                    'description' => 'Termine da cercare nel codice (es. "flyTo", "setBearing")'
                ]
            ],
            'required' => []
        ]
    ],
    [
        'name' => 'save_learning',
        'description' => 'Salva qualcosa che hai imparato esplorando il codice. Usalo per memorizzare scoperte utili che potrai riutilizzare in futuro.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'category' => [
                    'type' => 'string',
                    'description' => 'Categoria: mappa, database, ui, api, general'
                ],
                'title' => [
                    'type' => 'string',
                    'description' => 'Titolo breve della scoperta'
                ],
                'content' => [
                    'type' => 'string',
                    'description' => 'Descrizione dettagliata di cosa hai imparato'
                ]
            ],
            'required' => ['title', 'content']
        ]
    ],
    [
        'name' => 'read_learnings',
        'description' => 'Legge le conoscenze che hai memorizzato in precedenza. Usalo all\'inizio di una conversazione per ricordare cosa sai.',
        'parameters' => [
            'type' => 'object',
            'properties' => new stdClass(),
            'required' => []
        ]
    ],
    [
        'name' => 'propose_improvement',
        'description' => 'Proponi un miglioramento al software. Quando scopri una limitazione o hai un\'idea, usa questo tool per formalizzare la proposta. L\'utente potrà poi chiedere a Claude Code di implementarla.',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'title' => [
                    'type' => 'string',
                    'description' => 'Titolo della proposta (es. "Aggiungere tool map_rotate")'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'Descrizione del problema/limitazione e della soluzione proposta'
                ],
                'files_to_modify' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                    'description' => 'Lista dei file che andrebbero modificati'
                ],
                'code_changes' => [
                    'type' => 'string',
                    'description' => 'Descrizione delle modifiche al codice necessarie'
                ],
                'priority' => [
                    'type' => 'string',
                    'description' => 'Priorità: low, normal, high'
                ]
            ],
            'required' => ['title', 'description']
        ]
    ]
];

// Carica system instruction da file esterno (facile da modificare)
$promptFile = __DIR__ . '/../../config/ai_prompt.txt';
if (file_exists($promptFile)) {
    $systemInstruction = file_get_contents($promptFile);
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
} else {
    // Fallback se file non esiste
    $systemInstruction = "Sei l'assistente AI di GenAgenta. Utente: {$user['nome']}. Rispondi in italiano. Puoi usare tutti i tool disponibili per aiutare l'utente.";
}

// Array per raccogliere azioni frontend (mappa, UI)
$frontendActions = [];

// Prepara contenuti per Gemini
$contents = [];

// Aggiungi storia conversazione (ultimi 10 messaggi)
$history = array_slice($conversationHistory, -10);
foreach ($history as $msg) {
    $role = $msg['role'] === 'assistant' ? 'model' : 'user';
    $contents[] = [
        'role' => $role,
        'parts' => [['text' => $msg['content']]]
    ];
}

// Aggiungi messaggio utente corrente
$contents[] = [
    'role' => 'user',
    'parts' => [['text' => $userMessage]]
];

// Funzione chiamata Gemini API
function callGemini($apiKey, $systemInstruction, $contents, $functionDeclarations) {
    // Usa gemini-2.5-flash (disponibile nel free tier)
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

        // Gestione specifica per rate limit
        if ($httpCode === 429) {
            return ['error' => 'Troppe richieste - riprova tra qualche secondo', 'code' => 429];
        }

        return ['error' => 'Errore comunicazione AI', 'details' => $response, 'code' => $httpCode];
    }

    return json_decode($response, true);
}

// Loop per gestire function calls
$maxIterations = 5;
$iteration = 0;
$finalResponse = null;

while ($iteration < $maxIterations) {
    $iteration++;

    $response = callGemini($GEMINI_API_KEY, $systemInstruction, $contents, $functionDeclarations);

    if (isset($response['error'])) {
        error_log("Gemini error response: " . json_encode($response));
        errorResponse($response['error'] . ' - ' . ($response['details'] ?? ''), 500);
    }

    // Controlla se c'è un errore nella risposta
    if (isset($response['error'])) {
        errorResponse($response['error']['message'] ?? 'Errore Gemini', 500);
    }

    // Estrai candidate
    $candidates = $response['candidates'] ?? [];
    if (empty($candidates)) {
        error_log("Gemini no candidates: " . json_encode($response));
        errorResponse('Nessuna risposta da Gemini', 500);
    }

    $candidate = $candidates[0];
    $finishReason = $candidate['finishReason'] ?? 'STOP';

    // Gestisci casi in cui content potrebbe essere null
    if (!isset($candidate['content']) || !isset($candidate['content']['parts'])) {
        error_log("Gemini response missing content/parts: " . json_encode($candidate));
        // Se finishReason indica un problema, riporta l'errore
        if ($finishReason === 'SAFETY' || $finishReason === 'RECITATION') {
            errorResponse("La risposta è stata bloccata per motivi di sicurezza ($finishReason)", 400);
        }
        // Altrimenti considera la risposta vuota
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

        // Esegui il tool con error handling
        try {
            $result = executeAiTool($funcName, $funcArgs, $user);
        } catch (Exception $e) {
            error_log("Tool execution error ($funcName): " . $e->getMessage());
            $result = ['error' => "Errore nell'esecuzione del tool $funcName: " . $e->getMessage()];
        } catch (Error $e) {
            error_log("Tool execution fatal error ($funcName): " . $e->getMessage());
            $result = ['error' => "Errore fatale nel tool $funcName: " . $e->getMessage()];
        }

        // Se il tool ha generato un'azione frontend, raccoglila
        if (isset($result['_frontend_action'])) {
            $frontendActions[] = $result['_frontend_action'];
            unset($result['_frontend_action']);
        }

        $functionResponses[] = [
            'functionResponse' => [
                'name' => $funcName,
                'response' => $result
            ]
        ];
    }

    // Aggiungi la risposta del model con function calls
    $contents[] = [
        'role' => 'model',
        'parts' => $parts
    ];

    // Aggiungi i risultati delle funzioni
    $contents[] = [
        'role' => 'user',
        'parts' => $functionResponses
    ];
}

if ($finalResponse === null) {
    $finalResponse = "Mi dispiace, non sono riuscito a completare la richiesta. Riprova.";
}

// Risposta con eventuali azioni frontend
$responseData = [
    'response' => $finalResponse,
    'iterations' => $iteration
];

// Aggiungi azioni frontend se presenti
if (!empty($frontendActions)) {
    $responseData['actions'] = $frontendActions;
}

jsonResponse($responseData);
