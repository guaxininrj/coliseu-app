/* ==========================================================================
   Remove os alunos de demonstracao criados por seed-demo-alunos.js.

   So mexe em quem tem id comecando com "al_demo_" -- e assim que separa
   aluno fake de aluno real, sem depender de nome (que um cliente de
   verdade poderia repetir por coincidencia).

   Uso:
     node apagar-demo-alunos.js            (so mostra quem seria apagado)
     node apagar-demo-alunos.js --gravar   (apaga de verdade, sem lixeira --
                                             sao dados falsos, nao tem por
                                             que passar pela lixeira antes)
   ========================================================================== */
const BASE = 'https://coliseu.smartlinkdigital.com.br';
const GRAVAR = process.argv.includes('--gravar');

async function login() {
  const r = await fetch(BASE + '/api/auth.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perfil: 'admin', senha: '54321' }),
  });
  const j = await r.json();
  if (!j.token) throw new Error('login falhou: ' + JSON.stringify(j));
  return j.token;
}

async function storageGet(token, key) {
  const r = await fetch(BASE + '/api/storage.php?action=get&key=' + encodeURIComponent(key), {
    headers: { Authorization: 'Bearer ' + token },
  });
  const j = await r.json();
  return j ? JSON.parse(j.value) : null;
}

async function storageSet(token, key, value) {
  const r = await fetch(BASE + '/api/storage.php?action=set', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(value) }),
  });
  const j = await r.json();
  if (!j.sucesso) throw new Error('set falhou em ' + key + ': ' + JSON.stringify(j));
}

async function storageDelete(token, key) {
  const r = await fetch(BASE + '/api/storage.php?action=delete', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  const j = await r.json();
  if (!j.sucesso) throw new Error('delete falhou em ' + key + ': ' + JSON.stringify(j));
}

(async () => {
  const token = await login();
  const index = (await storageGet(token, 'index-alunos')) || [];
  const demo = index.filter(a => a.id.startsWith('al_demo_'));
  const reais = index.filter(a => !a.id.startsWith('al_demo_'));

  console.log('  no total: ' + index.length + ' aluno(s)');
  console.log('  demo (' + demo.length + '):');
  demo.forEach(a => console.log('    ' + a.nome + '  (' + a.id + ')'));
  console.log('  ficam intocados (' + reais.length + '):');
  reais.forEach(a => console.log('    ' + a.nome + '  (' + a.id + ')'));

  if (!demo.length) { console.log('\n  nenhum aluno demo pra apagar.'); return; }

  if (!GRAVAR) {
    console.log('\n  (nada foi apagado -- rode com --gravar pra apagar de verdade)');
    return;
  }

  for (const a of demo) {
    await storageDelete(token, 'aluno:' + a.id);
    console.log('    apagado: ' + a.nome);
  }
  await storageSet(token, 'index-alunos', reais);
  console.log('  index-alunos atualizado: ' + reais.length + ' aluno(s) restante(s)');
})().catch(e => { console.error('  ERRO: ' + e.message); process.exit(1); });
