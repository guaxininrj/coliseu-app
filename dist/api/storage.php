<?php
require_once 'config.php';

/* Toda acao daqui pra baixo exige sessao valida. Antes nao exigia nada:
   quem soubesse o endereco lia, alterava e apagava os dados dos alunos. */
$perfil = exigirSessao();

$action = $_GET['action'] ?? '';

/* Chave "professor:*" guarda hash de senha -- so o admin mexe nela, e so
   pelo api/professores.php, que sabe gerar hash e nunca devolve o valor
   cru. Sem esta trava, este endpoint generico (get/set sem restricao de
   chave) deixaria qualquer sessao de professor ler ou reescrever conta de
   outro professor so sabendo o id -- o mesmo tipo de furo que a sessao
   obrigatoria no topo deste arquivo ja veio fechar pros alunos. */
function ehChaveDeProfessor($chave) {
    return strpos($chave, 'professor:') === 0;
}

if ($action === 'get') {
    $chave = $_GET['key'] ?? '';
    if ($chave === '') { http_response_code(400); die(json_encode(['erro' => 'key obrigatório'])); }
    if (ehChaveDeProfessor($chave) && $perfil !== 'admin') {
        http_response_code(403); die(json_encode(['erro' => 'só a administração acessa isso']));
    }

    // consulta preparada: o real_escape_string de antes funcionava, mas
    // depender de lembrar de escapar e o que gera falha um dia
    $stmt = $conn->prepare("SELECT valor FROM armazenamento WHERE chave = ?");
    $stmt->bind_param('s', $chave);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    echo json_encode($row ? ['value' => $row['valor']] : null);

} elseif ($action === 'changes') {
    /* Diz o que mudou e quando, sem devolver conteudo nenhum.
       E o que permite o app perceber alteracao feita em outro aparelho: ele
       consulta isto de tempos em tempos (resposta de poucos bytes) e so vai
       buscar de verdade a chave cuja hora mudou.

       O app manda em ?keys= so as chaves que ele tem na tela. Devolver a
       tabela inteira seria uma linha por aluno a cada 5 segundos -- no
       celular, com dados moveis, isso pesa a toa. */
    $pedidas = array_filter(array_map('trim', explode(',', $_GET['keys'] ?? '')), 'strlen');
    $pedidas = array_slice(array_values(array_unique($pedidas)), 0, 50);

    $mapa = [];
    if ($pedidas) {
        $lacunas = implode(',', array_fill(0, count($pedidas), '?'));
        $stmt = $conn->prepare(
            "SELECT chave, UNIX_TIMESTAMP(atualizado_em) AS ts
             FROM armazenamento WHERE chave IN ($lacunas)"
        );
        $stmt->bind_param(str_repeat('s', count($pedidas)), ...$pedidas);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($r = $res->fetch_assoc()) $mapa[$r['chave']] = (int)$r['ts'];
    }
    echo json_encode(['mudancas' => $mapa, 'agora' => time()]);

} elseif ($action === 'set') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['key']) || !isset($data['value'])) {
        http_response_code(400); die(json_encode(['erro' => 'key e value obrigatórios']));
    }
    if (ehChaveDeProfessor($data['key']) && $perfil !== 'admin') {
        http_response_code(403); die(json_encode(['erro' => 'só a administração acessa isso']));
    }

    $stmt = $conn->prepare(
        "INSERT INTO armazenamento (chave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor), atualizado_em = CURRENT_TIMESTAMP"
    );
    $stmt->bind_param('ss', $data['key'], $data['value']);

    if ($stmt->execute()) {
        echo json_encode(['sucesso' => true]);
    } else {
        http_response_code(500); echo json_encode(['erro' => 'falha ao salvar']);
    }

} elseif ($action === 'delete') {
    /* Apagar e so do admin. O professor mexe no dia a dia; sumir com o
       cadastro de um aluno nao devia ser possivel com a senha que fica
       anotada no balcao. */
    if ($perfil !== 'admin') {
        http_response_code(403); die(json_encode(['erro' => 'só o admin pode excluir']));
    }
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['key'])) {
        http_response_code(400); die(json_encode(['erro' => 'key obrigatório']));
    }

    $stmt = $conn->prepare("DELETE FROM armazenamento WHERE chave = ?");
    $stmt->bind_param('s', $data['key']);

    if ($stmt->execute()) {
        echo json_encode(['sucesso' => true]);
    } else {
        http_response_code(500); echo json_encode(['erro' => 'falha ao excluir']);
    }

} else {
    http_response_code(400);
    echo json_encode(['erro' => 'action inválido (use get, set, delete ou changes)']);
}
