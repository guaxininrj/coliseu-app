<?php
/* O app e a API sao servidos pelo MESMO dominio, entao nao existe motivo
   pra liberar origem cruzada. Antes era "*", o que deixava qualquer site
   da internet chamar esta API pelo navegador de quem estivesse logado. */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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
    die(json_encode(['erro' => 'Conexão falhou']));
}

$conn->set_charset('utf8mb4');

/* ---------------- sessao ----------------
   Token assinado, sem tabela de sessao: o proprio token carrega o perfil e
   a validade, e a assinatura impede que alguem invente um. Se o segredo
   nao estiver configurado, RECUSA TUDO -- o contrario transformaria um erro
   de configuracao em API aberta, que e exatamente o problema que isto veio
   consertar. */
define('DURACAO_SESSAO', 60 * 60 * 12); // 12 horas

function segredoDoToken() {
    $s = getenv('TOKEN_SECRET');
    return ($s && strlen($s) >= 32) ? $s : null;
}

function base64url($bin) {
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function gerarToken($perfil) {
    $segredo = segredoDoToken();
    if (!$segredo) return null;
    $corpo = base64url(json_encode(['perfil' => $perfil, 'expira' => time() + DURACAO_SESSAO]));
    $assinatura = base64url(hash_hmac('sha256', $corpo, $segredo, true));
    return $corpo . '.' . $assinatura;
}

function perfilDoToken($token) {
    $segredo = segredoDoToken();
    if (!$segredo || !$token || substr_count($token, '.') !== 1) return null;

    [$corpo, $assinatura] = explode('.', $token);
    $esperada = base64url(hash_hmac('sha256', $corpo, $segredo, true));
    // hash_equals compara em tempo constante: comparar com === vazaria,
    // pelo tempo de resposta, quantos caracteres iniciais estao certos
    if (!hash_equals($esperada, $assinatura)) return null;

    $dados = json_decode(base64_decode(strtr($corpo, '-_', '+/')), true);
    if (!$dados || !isset($dados['expira']) || $dados['expira'] < time()) return null;
    return $dados['perfil'] ?? null;
}

/* Chame no topo de todo endpoint que toca dado. */
function exigirSessao() {
    if (!segredoDoToken()) {
        http_response_code(503);
        die(json_encode(['erro' => 'Servidor sem TOKEN_SECRET configurado']));
    }
    $cabecalho = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    $token = preg_match('/Bearer\s+(.+)/i', $cabecalho, $m) ? trim($m[1]) : '';
    $perfil = perfilDoToken($token);
    if (!$perfil) {
        http_response_code(401);
        die(json_encode(['erro' => 'não autorizado']));
    }
    return $perfil;
}
