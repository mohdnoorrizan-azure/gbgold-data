<?php
/**
 * GBGold Dashboard - Save Data API
 * 
 * PHP script to securely save combined sales data as a JSON file.
 * This allows the dashboard to autoload the data on page load.
 */

// Enable CORS for development/cross-domain embeds
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Ensure it is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Hanya permintaan POST dibenarkan."
    ]);
    exit;
}

// Read JSON input
$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Format JSON tidak sah: " . json_last_error_msg()
    ]);
    exit;
}

// --- SECURITY KEY ---
// Sila tukar kata laluan keselamatan ini mengikut kesukaan anda.
$security_key = "gbgold2026";

if (!isset($input['key']) || $input['key'] !== $security_key) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Kata laluan keselamatan tidak sah! Akses ditolak."
    ]);
    exit;
}

// Validate data array
if (!isset($input['data']) || !is_array($input['data'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Data jualan tidak sah atau kosong."
    ]);
    exit;
}

// Convert data back to clean JSON
$dataToSave = json_encode($input['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if ($dataToSave === false) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Gagal menukar data kepada format JSON."
    ]);
    exit;
}

// Write to data.json
$fileName = 'data.json';
if (file_put_contents($fileName, $dataToSave) !== false) {
    echo json_encode([
        "success" => true,
        "message" => "Data berjaya disimpan ke fail data.json di server!"
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Gagal menulis fail data.json. Sila pastikan kebenaran menulis fail (write permissions) telah diberikan untuk folder ini di server."
    ]);
}
?>
