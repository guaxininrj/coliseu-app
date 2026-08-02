<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

if ($action === 'get') {
    $chave = $conn->real_escape_string($_GET['key'] ?? '');
    if ($chave === '') { http_response_code(400); die(json_encode(['erro' => 'key obrigatório'])); }

    $result = $conn->query("SELECT valor FROM armazenamento WHERE chave = '$chave'");
    $row = $result->fetch_assoc();

    if ($row) {
        echo json_encode(['value' => $row['valor']]);
    } else {
        echo json_encode(null);
    }

} elseif ($action === 'set') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['key']) || !isset($data['value'])) {
        http_response_code(400); die(json_encode(['erro' => 'key e value obrigatórios']));
    }

    $stmt = $conn->prepare(
        "INSERT INTO armazenamento (chave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)"
    );
    $stmt->bind_param('ss', $data['key'], $data['value']);

    if ($stmt->execute()) {
        echo json_encode(['sucesso' => true]);
    } else {
        http_response_code(500); echo json_encode(['erro' => $stmt->error]);
    }

} elseif ($action === 'delete') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['key'])) {
        http_response_code(400); die(json_encode(['erro' => 'key obrigatório']));
    }

    $stmt = $conn->prepare("DELETE FROM armazenamento WHERE chave = ?");
    $stmt->bind_param('s', $data['key']);

    if ($stmt->execute()) {
        echo json_encode(['sucesso' => true]);
    } else {
        http_response_code(500); echo json_encode(['erro' => $stmt->error]);
    }

} else {
    http_response_code(400);
    echo json_encode(['erro' => 'action inválido (use get, set ou delete)']);
}
