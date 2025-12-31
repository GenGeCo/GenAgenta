<?php
/**
 * Debug endpoint - RIMUOVERE DOPO IL TEST
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$results = [];

try {
    require_once __DIR__ . '/../config/config.php';

    // Test Gemini API Key
    $results['gemini_key_set'] = defined('GEMINI_API_KEY') && !empty(GEMINI_API_KEY);
    $results['gemini_key_preview'] = defined('GEMINI_API_KEY') ? substr(GEMINI_API_KEY, 0, 15) . '...' : 'NOT SET';

    // Test chiamata Gemini
    if (defined('GEMINI_API_KEY') && !empty(GEMINI_API_KEY)) {
        $apiKey = GEMINI_API_KEY;
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}";

        $payload = [
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => 'Rispondi solo "OK" se funziona']]]
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        $results['gemini_http_code'] = $httpCode;
        $results['gemini_curl_error'] = $curlError ?: 'none';

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            $results['gemini_test'] = 'OK';
            $results['gemini_response'] = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'no response';
        } else {
            $results['gemini_test'] = 'FAILED';
            $results['gemini_error'] = $response;
        }
    }

    $results['success'] = true;

} catch (Throwable $e) {
    $results['success'] = false;
    $results['error'] = $e->getMessage();
    $results['error_file'] = $e->getFile();
    $results['error_line'] = $e->getLine();
}

echo json_encode($results, JSON_PRETTY_PRINT);
