<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Credenciais lidas de variáveis de ambiente (configuradas no Coolify,
// nunca escritas aqui — este arquivo pode ficar num repositório público).
$DB_HOST = getenv('DB_HOST') ?: 'qmr7hb28b8c5voiotga105i7';
$DB_PORT = getenv('DB_PORT') ?: 3306;
$DB_USER = getenv('DB_USER') ?: 'mysql';
$DB_PASS = getenv('DB_PASS') ?: '';
$DB_NAME = getenv('DB_NAME') ?: 'coliseu_app';

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $DB_PORT);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['erro' => 'Conexão falhou: ' . $conn->connect_error]));
}

$conn->set_charset('utf8mb4');
