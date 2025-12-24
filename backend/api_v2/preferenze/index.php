<?php
/**
 * API Preferenze Utente
 * GET  /preferenze          - Recupera preferenze utente
 * POST /preferenze          - Salva preferenze utente
 */

$user = requireAuth();
$db = getDB();
$userId = $user['user_id'];

switch ($method) {

    case 'GET':
        try {
            // Verifica se esiste colonna preferenze_mappa
            $hasColumn = false;
            try {
                $db->query("SELECT preferenze_mappa FROM utenti LIMIT 1");
                $hasColumn = true;
            } catch (PDOException $e) {
                // Colonna non esiste, la creiamo
                $db->exec("ALTER TABLE utenti ADD COLUMN preferenze_mappa JSON NULL");
                $hasColumn = true;
            }

            $stmt = $db->prepare("SELECT preferenze_mappa FROM utenti WHERE id = ?");
            $stmt->execute([$userId]);
            $result = $stmt->fetch();

            $preferenze = null;
            if ($result && $result['preferenze_mappa']) {
                $preferenze = json_decode($result['preferenze_mappa'], true);
            }

            jsonResponse([
                'data' => $preferenze
            ]);
        } catch (PDOException $e) {
            errorResponse('Errore recupero preferenze: ' . $e->getMessage(), 500);
        }
        break;

    case 'POST':
        $data = getJsonBody();

        if (!$data) {
            errorResponse('Dati preferenze richiesti', 400);
        }

        try {
            // Verifica se esiste colonna preferenze_mappa
            try {
                $db->query("SELECT preferenze_mappa FROM utenti LIMIT 1");
            } catch (PDOException $e) {
                // Colonna non esiste, la creiamo
                $db->exec("ALTER TABLE utenti ADD COLUMN preferenze_mappa JSON NULL");
            }

            $stmt = $db->prepare("UPDATE utenti SET preferenze_mappa = ? WHERE id = ?");
            $stmt->execute([json_encode($data), $userId]);

            jsonResponse(['message' => 'Preferenze salvate']);
        } catch (PDOException $e) {
            errorResponse('Errore salvataggio preferenze: ' . $e->getMessage(), 500);
        }
        break;

    default:
        errorResponse('Metodo non supportato', 405);
}
