<?php
/**
 * GET /geocode/reverse?lat=45.5017&lng=9.2482
 * Converte coordinate GPS in indirizzo
 * Usa Mapbox Reverse Geocoding API (o fallback Nominatim)
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';

// Auth richiesta
$user = requireAuth();

// Parametri
$lat = $_GET['lat'] ?? null;
$lng = $_GET['lng'] ?? null;

if ($lat === null || $lng === null) {
    errorResponse('Parametri lat e lng richiesti', 400);
}

$lat = (float)$lat;
$lng = (float)$lng;

// Validazione coordinate
if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
    errorResponse('Coordinate non valide', 400);
}

// Token Mapbox
$mapboxToken = env('MAPBOX_TOKEN', '');

if (empty($mapboxToken)) {
    // Fallback: usa Nominatim (OpenStreetMap)
    $result = reverseGeocodeWithNominatim($lat, $lng);
} else {
    $result = reverseGeocodeWithMapbox($lat, $lng, $mapboxToken);
}

jsonResponse([
    'success' => true,
    'lat' => $lat,
    'lng' => $lng,
    'result' => $result
]);

/**
 * Reverse Geocoding con Mapbox
 */
function reverseGeocodeWithMapbox(float $lat, float $lng, string $token): array {
    // Mapbox vuole lng,lat (non lat,lng!)
    $url = "https://api.mapbox.com/geocoding/v5/mapbox.places/{$lng},{$lat}.json";
    $url .= '?' . http_build_query([
        'access_token' => $token,
        'language' => 'it',
        'types' => 'address,poi,place,locality,neighborhood'
    ]);

    $response = @file_get_contents($url);
    if (!$response) {
        return ['error' => 'Errore chiamata Mapbox'];
    }

    $data = json_decode($response, true);
    if (empty($data['features'])) {
        return ['address' => null, 'message' => 'Nessun risultato trovato'];
    }

    $feature = $data['features'][0];

    // Estrai componenti indirizzo
    $context = [];
    foreach ($feature['context'] ?? [] as $ctx) {
        $type = explode('.', $ctx['id'])[0];
        $context[$type] = $ctx['text'];
    }

    return [
        'address' => $feature['place_name'] ?? null,
        'street' => $feature['text'] ?? null,
        'number' => $feature['address'] ?? null,
        'neighborhood' => $context['neighborhood'] ?? null,
        'locality' => $context['locality'] ?? null,
        'city' => $context['place'] ?? null,
        'region' => $context['region'] ?? null,
        'country' => $context['country'] ?? null,
        'postcode' => $context['postcode'] ?? null
    ];
}

/**
 * Reverse Geocoding con Nominatim (OpenStreetMap)
 */
function reverseGeocodeWithNominatim(float $lat, float $lng): array {
    $url = 'https://nominatim.openstreetmap.org/reverse?' . http_build_query([
        'lat' => $lat,
        'lon' => $lng,
        'format' => 'json',
        'addressdetails' => 1,
        'accept-language' => 'it'
    ]);

    $opts = [
        'http' => [
            'header' => "User-Agent: GenAgenta CRM\r\n"
        ]
    ];
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);

    if (!$response) {
        return ['error' => 'Errore chiamata Nominatim'];
    }

    $data = json_decode($response, true);
    if (isset($data['error'])) {
        return ['address' => null, 'message' => $data['error']];
    }

    $addr = $data['address'] ?? [];

    return [
        'address' => $data['display_name'] ?? null,
        'street' => $addr['road'] ?? null,
        'number' => $addr['house_number'] ?? null,
        'neighborhood' => $addr['suburb'] ?? $addr['neighbourhood'] ?? null,
        'locality' => $addr['hamlet'] ?? $addr['village'] ?? null,
        'city' => $addr['city'] ?? $addr['town'] ?? $addr['municipality'] ?? null,
        'region' => $addr['state'] ?? null,
        'country' => $addr['country'] ?? null,
        'postcode' => $addr['postcode'] ?? null
    ];
}
