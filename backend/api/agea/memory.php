<?php
/**
 * API per gestire la memoria di Agea
 * GET - Legge la memoria
 * PUT - Aggiorna campi specifici
 * DELETE - Cancella la memoria
 */

require_once __DIR__ . '/../../config/config.php';

// Verifica autenticazione
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$memoryPath = __DIR__ . '/../../config/ai/agea_memory.json';

switch ($method) {
    case 'GET':
        // Leggi memoria
        if (!file_exists($memoryPath)) {
            jsonResponse([
                'success' => true,
                'memory' => [
                    'utente' => [
                        'interessi_recenti' => [],
                        'argomenti_frequenti' => [],
                        'ultimo_argomento' => null
                    ],
                    'entita_importanti' => [],
                    'conversazioni_chiave' => [],
                    'ultimo_aggiornamento' => null
                ]
            ]);
        }

        $content = file_get_contents($memoryPath);
        $memory = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            errorResponse('Errore lettura memoria', 500);
        }

        jsonResponse([
            'success' => true,
            'memory' => $memory
        ]);
        break;

    case 'PUT':
        // Aggiorna campi specifici
        $data = getJsonBody();

        // Leggi memoria esistente
        $memory = [];
        if (file_exists($memoryPath)) {
            $content = file_get_contents($memoryPath);
            $memory = json_decode($content, true) ?? [];
        }

        // Aggiorna solo i campi passati
        if (isset($data['utente'])) {
            $memory['utente'] = array_merge($memory['utente'] ?? [], $data['utente']);
        }
        if (isset($data['entita_importanti'])) {
            $memory['entita_importanti'] = $data['entita_importanti'];
        }
        if (isset($data['conversazioni_chiave'])) {
            $memory['conversazioni_chiave'] = $data['conversazioni_chiave'];
        }

        $memory['ultimo_aggiornamento'] = date('Y-m-d H:i:s');

        // Salva
        $result = file_put_contents($memoryPath, json_encode($memory, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        if ($result === false) {
            errorResponse('Errore salvataggio memoria', 500);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Memoria aggiornata'
        ]);
        break;

    case 'DELETE':
        // Cancella/reset memoria
        $emptyMemory = [
            'versione' => '1.0',
            'descrizione' => 'Memoria strutturata di Agea - NON modificare manualmente',
            'utente' => [
                'interessi_recenti' => [],
                'argomenti_frequenti' => [],
                'ultimo_argomento' => null,
                'preferenze_note' => []
            ],
            'entita_importanti' => [],
            'conversazioni_chiave' => [],
            'insights_salvati' => [],
            'ultimo_aggiornamento' => date('Y-m-d H:i:s')
        ];

        $result = file_put_contents($memoryPath, json_encode($emptyMemory, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        if ($result === false) {
            errorResponse('Errore reset memoria', 500);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Memoria di Agea azzerata'
        ]);
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
