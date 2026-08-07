/* Build do Sistema Coliseu.
 *
 * O app compilava o proprio JSX no navegador a cada abertura, com o Babel
 * baixado da unpkg. Isso significava: (1) se a unpkg cair ou for bloqueada, a
 * gestao de alunos simplesmente nao abre; (2) toda abertura paga o custo de
 * compilar ~3600 linhas; (3) rodava as versoes de DESENVOLVIMENTO do React,
 * que sao maiores e mais lentas que as de producao.
 *
 * Este script resolve isso na maquina, antes do deploy: compila o JSX uma vez,
 * gera app.js, e troca os 6 scripts de CDN por copias servidas pelo proprio
 * servidor.
 *
 * Editar SEMPRE index.html (o fonte, com JSX). O dist/ e descartavel.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const DIST = path.join(RAIZ, 'dist');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const ok = (m) => console.log('  ' + verde('OK') + '  ' + m);
const err = (m) => { console.error('  ERRO: ' + m); process.exit(1); };

console.log('Build Sistema Coliseu');

let html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
ok(`index.html lido (${Math.round(html.length / 1024)} KB)`);

/* --- extrai o bloco de JSX --- */
const ABRE = /<script type="text\/babel"[^>]*>/;
const m = html.match(ABRE);
if (!m) err('nao achei o <script type="text/babel">');
const ini = m.index;
const inicioCodigo = ini + m[0].length;
const fim = html.indexOf('</script>', inicioCodigo);
if (fim === -1) err('nao achei o </script> do bloco JSX');

const jsx = html.slice(inicioCodigo, fim);
ok(`JSX extraido (${Math.round(jsx.length / 1024)} KB, ${jsx.split('\n').length} linhas)`);

/* --- compila --- */
const babelPath = path.join(RAIZ, 'build', 'babel.standalone.js');
if (!fs.existsSync(babelPath)) err('build/babel.standalone.js nao encontrado');
const Babel = require(babelPath);

let compilado;
try {
  compilado = Babel.transform(jsx, { presets: ['react'], sourceType: 'script' }).code;
} catch (e) {
  err('falha ao compilar o JSX: ' + e.message);
}
ok(`compilado (${Math.round(compilado.length / 1024)} KB)`);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'vendor'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'app.js'), compilado);
ok('dist/app.js');

/* A troca do bloco JSX vem PRIMEIRO: ini/fim foram medidos no texto original,
   e qualquer substituicao feita antes muda o tamanho da string e faz esses
   indices apontarem pro lugar errado, corrompendo o arquivo. */
html = html.slice(0, ini) + '<script src="./app.js" defer></script>' + html.slice(fim + '</script>'.length);
ok('JSX cru -> <script src="./app.js">');

/* --- CDNs viram arquivos locais --- */
const TROCAS = [
  [/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/, '<script src="./vendor/tailwind.js"></script>'],
  [/<script src="https:\/\/unpkg\.com\/react@18\/umd\/react\.development\.js"[^>]*><\/script>/, '<script src="./vendor/react.js"></script>'],
  [/<script src="https:\/\/unpkg\.com\/react-dom@18\/umd\/react-dom\.development\.js"[^>]*><\/script>/, '<script src="./vendor/react-dom.js"></script>'],
  [/<script src="https:\/\/unpkg\.com\/react-is@18\/umd\/react-is\.production\.min\.js"[^>]*><\/script>/, '<script src="./vendor/react-is.js"></script>'],
  [/<script src="https:\/\/unpkg\.com\/recharts\/umd\/Recharts\.js"[^>]*><\/script>/, '<script src="./vendor/recharts.js"></script>'],
  // o Babel some: nada mais e compilado no navegador
  [/<script src="https:\/\/unpkg\.com\/@babel\/standalone@7\/babel\.min\.js"[^>]*><\/script>\s*/, ''],
];

TROCAS.forEach(([de, para], i) => {
  if (!de.test(html)) err(`troca ${i + 1} nao encontrou o script no HTML — o index.html mudou?`);
  html = html.replace(de, para);
});
ok('6 scripts de CDN -> arquivos locais (Babel removido)');

/* Se sobrou alguma referencia a CDN, o objetivo do build nao foi cumprido:
   melhor quebrar aqui do que descobrir com o site fora do ar. */
const sobrou = html.match(/https:\/\/(unpkg\.com|cdn\.tailwindcss\.com|cdn\.jsdelivr)[^"']*/g);
if (sobrou) err('ainda restam CDNs no HTML: ' + sobrou.join(', '));
ok('nenhuma dependencia de CDN restante');

fs.writeFileSync(path.join(DIST, 'index.html'), html);
ok(`dist/index.html (${Math.round(html.length / 1024)} KB)`);

['react.js', 'react-dom.js', 'tailwind.js', 'react-is.js', 'recharts.js'].forEach((f) => {
  fs.copyFileSync(path.join(RAIZ, 'vendor', f), path.join(DIST, 'vendor', f));
});
ok('dist/vendor/ (5 bibliotecas)');

['manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png'].forEach((f) => {
  const de = path.join(RAIZ, f);
  if (fs.existsSync(de)) fs.copyFileSync(de, path.join(DIST, f));
});
fs.cpSync(path.join(RAIZ, 'api'), path.join(DIST, 'api'), { recursive: true });
ok('dist/: manifest, service worker, icones e api/');

console.log('\n' + verde('Build concluido.') + ' Suba a pasta dist/');
