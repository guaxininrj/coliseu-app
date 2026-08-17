<?php
/* Cadastro de professores, pelo painel de administracao.
   Antes existia uma unica senha, escrita numa variavel de ambiente e
   compartilhada por todos os professores da academia: ninguem sabia quem
   tinha mexido em qual ficha, e tirar o acesso de um professor demitido
   exigia trocar a senha de TODOS os outros junto. Agora cada professor tem
   conta propria (nome + senha escolhida pelo admin no cadastro).

   A senha nunca chega ao navegador em texto puro depois de criada: e
   hash bcrypt (password_hash) gravado junto do registro, igual ja se fazia
   pra admin/professor no auth.php. "listar" nunca devolve o hash. */
require_once 'config.php';

$perfil = exigirSessao();

$action = $_GET['action'] ?? '';

/* Ler a lista e permitido pra qualquer sessao valida (admin ou professor):
   sao so nomes, sem senha, usados pra preencher o campo "Professor
   responsavel" do cadastro de aluno -- inclusive quando quem esta
   cadastrando e o proprio professor. Criar, editar e excluir continuam
   exclusivos do admin. */
if ($action !== 'listar' && $perfil !== 'admin') {
    http_response_code(403);
    die(json_encode(['erro' => 'Só a administração pode alterar professores.']));
}

function gerarIdProfessor() {
    return 'prof_' . base_convert((string) time(), 10, 36) . '_' . bin2hex(random_bytes(3));
}

if ($action === 'listar') {
    $res = $conn->query("SELECT valor FROM armazenamento WHERE chave LIKE 'professor:%'");
    $lista = [];
    while ($linha = $res->fetch_assoc()) {
        $r = json_decode($linha['valor'], true);
        if (!$r) continue;
        // nunca devolve senhaHash
        $lista[] = ['id' => $r['id'], 'nome' => $r['nome'], 'criadoEm' => $r['criadoEm'] ?? null];
    }
    usort($lista, fn($a, $b) => strcasecmp($a['nome'], $b['nome']));
    echo json_encode(['professores' => $lista]);

} elseif ($action === 'criar') {
    $dados = json_decode(file_get_contents('php://input'), true);
    $nome  = trim($dados['nome'] ?? '');
    $senha = (string) ($dados['senha'] ?? '');

    if ($nome === '') { http_response_code(400); die(json_encode(['erro' => 'Informe o nome do professor.'])); }
    if (strlen($senha) < 4) { http_response_code(400); die(json_encode(['erro' => 'A senha precisa de pelo menos 4 caracteres.'])); }

    $id = gerarIdProfessor();
    $registro = [
        'id'        => $id,
        'nome'      => $nome,
        'senhaHash' => password_hash($senha, PASSWORD_BCRYPT),
        'criadoEm'  => date('c'),
    ];
    $chave = 'professor:' . $id;
    $valor = json_encode($registro);
    $stmt = $conn->prepare("INSERT INTO armazenamento (chave, valor) VALUES (?, ?)");
    $stmt->bind_param('ss', $chave, $valor);
    if (!$stmt->execute()) { http_response_code(500); die(json_encode(['erro' => 'Falha ao salvar o professor.'])); }

    echo json_encode(['sucesso' => true, 'id' => $id, 'nome' => $nome]);

} elseif ($action === 'editar') {
    /* So a senha muda por aqui -- o nome fica travado depois de criado.
       Alunos guardam o professor responsavel como TEXTO (o nome), pra nao
       depender de um numero de id em toda tela que exibe isso; se o nome
       pudesse mudar, todo aluno que aponta pro nome antigo ficaria "orfao"
       do filtro sem aviso nenhum. Editar a senha nao tem esse problema. */
    $dados = json_decode(file_get_contents('php://input'), true);
    $id    = $dados['id'] ?? '';
    $senha = (string) ($dados['senha'] ?? '');

    if ($id === '') { http_response_code(400); die(json_encode(['erro' => 'id obrigatório.'])); }
    if (strlen($senha) < 4) { http_response_code(400); die(json_encode(['erro' => 'A senha precisa de pelo menos 4 caracteres.'])); }

    $chave = 'professor:' . $id;
    $stmt = $conn->prepare("SELECT valor FROM armazenamento WHERE chave = ?");
    $stmt->bind_param('s', $chave);
    $stmt->execute();
    $linha = $stmt->get_result()->fetch_assoc();
    if (!$linha) { http_response_code(404); die(json_encode(['erro' => 'Professor não encontrado.'])); }

    $registro = json_decode($linha['valor'], true);
    $registro['senhaHash'] = password_hash($senha, PASSWORD_BCRYPT);

    $novoValor = json_encode($registro);
    $stmt2 = $conn->prepare("UPDATE armazenamento SET valor = ? WHERE chave = ?");
    $stmt2->bind_param('ss', $novoValor, $chave);
    if (!$stmt2->execute()) { http_response_code(500); die(json_encode(['erro' => 'Falha ao salvar.'])); }

    echo json_encode(['sucesso' => true, 'id' => $registro['id'], 'nome' => $registro['nome']]);

} elseif ($action === 'excluir') {
    /* Exclusao definitiva, sem lixeira -- diferente do aluno. E so uma
       conta de acesso (nome + senha), nao um historico de dados; nao ha
       nada de valor pra recuperar depois. Os alunos que apontavam pro nome
       dele continuam com o texto do nome na ficha, so perdem o login. */
    $dados = json_decode(file_get_contents('php://input'), true);
    $id = $dados['id'] ?? '';
    if ($id === '') { http_response_code(400); die(json_encode(['erro' => 'id obrigatório.'])); }

    $chave = 'professor:' . $id;
    $stmt = $conn->prepare("DELETE FROM armazenamento WHERE chave = ?");
    $stmt->bind_param('s', $chave);
    if (!$stmt->execute()) { http_response_code(500); die(json_encode(['erro' => 'Falha ao excluir.'])); }

    echo json_encode(['sucesso' => true]);

} else {
    http_response_code(400);
    echo json_encode(['erro' => 'action inválido (use listar, criar, editar ou excluir)']);
}
