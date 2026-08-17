<?php
/* Login do Coliseu.
   Antes as senhas ficavam em duas constantes no JavaScript -- qualquer um
   que abrisse o app.js lia as duas. A conferencia agora e aqui, contra
   hashes guardados em variavel de ambiente, e o navegador so recebe um
   token assinado com validade. */
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['erro' => 'use POST']));
}
if (!segredoDoToken()) {
    http_response_code(503);
    die(json_encode(['erro' => 'Servidor sem TOKEN_SECRET configurado']));
}

$dados  = json_decode(file_get_contents('php://input'), true);
$perfil = $dados['perfil'] ?? '';
$senha  = $dados['senha']  ?? '';

/* Os hashes vem em base64 de proposito.
   Um hash bcrypt e algo como $2y$10$y/UmBn... e o docker-compose trata $
   como comeco de variavel: o $y sumiu no caminho e o hash chegou aqui
   truncado, entao a senha certa era recusada. O hash do admin passou intacto
   por acaso -- depois do $ dele vinha um digito, e nome de variavel nao
   comeca com digito. Em base64 nao existe $, entao nao ha o que interpretar. */
function hashDoAmbiente($nome) {
    $b64 = getenv($nome . '_B64');
    if ($b64) {
        $bruto = base64_decode($b64, true);
        if ($bruto) return $bruto;
    }
    return getenv($nome) ?: '';
}

/* Confere a senha contra um professor CADASTRADO (tabela armazenamento,
   chaves "professor:*"). Testa contra cada um ate achar -- nao precisa de
   campo de usuario porque a propria senha ja diz quem e. Numero de
   professores de uma academia real e pequeno (dezenas, nao milhares), e
   password_verify e proposital mente lento (bcrypt); nessa escala isso
   continua respondendo em bem menos de 1 segundo. */
function professorAutentica($conn, $senha) {
    if ($senha === '') return null;
    $res = $conn->query("SELECT valor FROM armazenamento WHERE chave LIKE 'professor:%'");
    while ($res && ($linha = $res->fetch_assoc())) {
        $registro = json_decode($linha['valor'], true);
        if ($registro && !empty($registro['senhaHash']) && password_verify($senha, $registro['senhaHash'])) {
            return $registro;
        }
    }
    return null;
}

function existeAlgumProfessorCadastrado($conn) {
    $res = $conn->query("SELECT 1 FROM armazenamento WHERE chave LIKE 'professor:%' LIMIT 1");
    return $res && $res->num_rows > 0;
}

/* Bloqueio por tentativas, por IP e em arquivo. Sem isto, uma senha de
   poucos caracteres cai em minutos num script -- e nao adianta ter tirado
   a senha do JavaScript se ela pode ser descoberta na forca bruta. */
$ip      = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?';
$ip      = trim(explode(',', $ip)[0]);
$arquivo = sys_get_temp_dir() . '/coliseu_tent_' . md5($ip);
$agora   = time();
$janela  = 15 * 60;
$limite  = 8;

$tent = @json_decode(@file_get_contents($arquivo), true) ?: ['n' => 0, 'desde' => $agora];
if ($agora - $tent['desde'] > $janela) $tent = ['n' => 0, 'desde' => $agora];

if ($tent['n'] >= $limite) {
    http_response_code(429);
    die(json_encode(['erro' => 'Muitas tentativas. Espere 15 minutos.']));
}

/* $autenticado guarda o perfil que bateu e, se for professor cadastrado,
   quem ele e. Continua nulo se nada bateu. */
$autenticado = null;

if ($perfil === 'admin') {
    $hashAdmin = hashDoAmbiente('SENHA_ADMIN_HASH');
    if ($hashAdmin && $senha && password_verify($senha, $hashAdmin)) {
        $autenticado = ['perfil' => 'admin'];
    }
} elseif ($perfil === 'professor') {
    $registro = professorAutentica($conn, $senha);
    if ($registro) {
        $autenticado = ['perfil' => 'professor', 'professorId' => $registro['id'], 'professorNome' => $registro['nome']];
    } elseif (!existeAlgumProfessorCadastrado($conn)) {
        /* Reserva: so vale enquanto NENHUM professor foi cadastrado ainda.
           Assim que o primeiro e criado pelo painel de administracao, esta
           senha unica do .env para de funcionar -- senao ela vira uma porta
           dos fundos permanente, e o ponto inteiro de ter conta por
           professor (saber quem mexeu, poder tirar o acesso de um so) some. */
        $hashReserva = hashDoAmbiente('SENHA_PROFESSOR_HASH');
        if ($hashReserva && $senha && password_verify($senha, $hashReserva)) {
            $autenticado = ['perfil' => 'professor'];
        }
    }
}

if (!$autenticado) {
    $tent['n']++;
    @file_put_contents($arquivo, json_encode($tent));
    // resposta igual pra perfil inexistente e senha errada: dizer qual dos
    // dois falhou entrega metade da informacao pra quem esta tentando
    http_response_code(401);
    die(json_encode(['erro' => 'Perfil ou senha incorretos']));
}

@unlink($arquivo); // acertou: zera o historico do IP
echo json_encode(array_merge([
    'token'  => gerarToken($autenticado['perfil']),
    'perfil' => $autenticado['perfil'],
    'expira' => time() + DURACAO_SESSAO,
], isset($autenticado['professorId']) ? [
    'professorId'   => $autenticado['professorId'],
    'professorNome' => $autenticado['professorNome'],
] : []));
