<?php
/**
 * GET /geocode/search?q=via+torino+25+milano
 * Cerca un indirizzo e restituisce coordinate
 * Usa Mapbox Geocoding API
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';

// Auth richiesta
$user = requireAuth();

// Parametri
$query = $_GET['q'] ?? '';
$limit = min((int)($_GET['limit'] ?? 5), 10);

if (empty($query)) {
    errorResponse('Query richiesta (parametro q)', 400);
}

// Token Mapbox (usa quello delle mappe frontend o uno dedicato)
$mapboxToken = env('MAPBOX_TOKEN', '');

if (empty($mapboxToken)) {
    // Fallback: usa Nominatim (OpenStreetMap) - gratuito ma rate limited
    $results = geocodeWithNominatim($query, $limit);
} else {
    $results = geocodeWithMapbox($query, $limit, $mapboxToken);
}

jsonResponse([
    'success' => true,
    'query' => $query,
    'results' => $results
]);

/**
 * Geocoding con Mapbox
 */
function geocodeWithMapbox(string $query, int $limit, string $token): array {
    $url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' . urlencode($query) . '.json';
    $url .= '?' . http_build_query([
        'access_token' => $token,
        'limit' => $limit,
        'language' => 'it',
        'country' => 'IT', // Priorità Italia
        'types' => 'address,poi,place,locality'
    ]);

    $response = file_get_contents($url);
    if (!$response) {
        return [];
    }

    $data = json_decode($response, true);
    if (!isset($data['features'])) {
        return [];
    }

    return array_map(function($feature) {
        return [
            'formatted' => $feature['place_name'] ?? '',
            'lat' => $feature['center'][1] ?? null,
            'lng' => $feature['center'][0] ?? null,
            'type' => $feature['place_type'][0] ?? 'unknown',
            'relevance' => $feature['relevance'] ?? 0
        ];
    }, $data['features']);
}

/**
 * Geocoding con Nominatim (OpenStreetMap) - fallback gratuito
 */
function geocodeWithNominatim(string $query, int $limit): array {
    $url = 'https://nominatim.openstreetmap.org/search';
    $url .= '?' . http_build_query([
        'q' => $query,
        'format' => 'json',
        'limit' => $limit,
        'addressdetails' => 1,
        'countrycodes' => 'it'
    ]);

    $context = stream_context_create([
        'http' => [
            'header' => 'User-Agent: GenAgenta/1.0'
        ]
    ]);

    $response = file_get_contents($url, false, $context);
    if (!$response) {
        return [];
    }

    $data = json_decode($response, true);
    if (!is_array($data)) {
        return [];
    }

    return array_map(function($item) {
        return [
            'formatted' => $item['display_name'] ?? '',
            'lat' => (float)($item['lat'] ?? 0),
            'lng' => (float)($item['lon'] ?? 0),
            'type' => $item['type'] ?? 'unknown',
            'relevance' => 1 - ((float)($item['importance'] ?? 0))
        ];
    }, $data);
}
