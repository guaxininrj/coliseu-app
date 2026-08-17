/* ==========================================================================
   Cria 8 alunos ficticios pra demonstracao do Coliseu, com anamnese, treino
   e DUAS avaliacoes cada (evolucao visivel entre elas), incluindo fotos.

   Sobre as fotos: em vez de foto de pessoa real tirada da internet, geram-se
   silhuetas (SVG). Colar foto de gente real numa ficha com peso e % de
   gordura inventados juntaria direito de imagem com dado de saude falso
   atribuido a alguem que existe -- risco desnecessario pra uma demonstracao.
   A silhueta muda de forma entre a 1a e a 2a avaliacao (mais larga -> mais
   magra, ou o inverso pra quem ganhou massa), entao a comparacao continua
   visualmente clara.

   Todo aluno criado aqui tem id comecando com "al_demo_" -- e assim que o
   script de limpeza (apagar-demo-alunos.js) sabe o que e demo e o que e
   aluno real, sem depender de nome.

   Uso:
     node seed-demo-alunos.js            (so mostra o que faria)
     node seed-demo-alunos.js --gravar   (cria de verdade)
   ========================================================================== */
const BASE = 'https://coliseu.smartlinkdigital.com.br';
const GRAVAR = process.argv.includes('--gravar');

function svgToDataUrl(svg) {
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

/* Silhueta parametrica: 'escala' > 1 = corpo mais largo, < 1 = mais magro.
   'barriga' controla o quanto a curva do abdomen aparece na vista lateral. */
function silhueta({ view, escala, barriga, legenda }) {
  const larguraOmbro = 92 * escala;
  const larguraCintura = 62 * escala;
  const larguraQuadril = 78 * escala;
  const corCorpo = '#94a3b8';
  const corFundo = '#f1f5f9';

  let corpo = '';
  if (view === 'frente' || view === 'costas') {
    corpo = `
      <ellipse cx="150" cy="72" rx="30" ry="36" fill="${corCorpo}"/>
      <rect x="135" y="102" width="30" height="22" rx="8" fill="${corCorpo}"/>
      <rect x="${150 - larguraOmbro / 2 - 20}" y="158" width="22" height="172" rx="11" fill="${corCorpo}"/>
      <rect x="${150 + larguraOmbro / 2 - 2}" y="158" width="22" height="172" rx="11" fill="${corCorpo}"/>
      <path d="M ${150 - larguraOmbro / 2} 150
               Q 150 118 ${150 + larguraOmbro / 2} 150
               L ${150 + larguraCintura / 2} 300
               L ${150 + larguraQuadril / 2} 340
               L ${150 + larguraQuadril / 2} 460
               Q ${150 + larguraQuadril / 2} 470 ${150 + larguraQuadril / 2 - 10} 470
               L ${150 + 7} 470
               L ${150 + 7} 400
               L ${150 - 7} 400
               L ${150 - 7} 470
               L ${150 - larguraQuadril / 2 + 10} 470
               Q ${150 - larguraQuadril / 2} 470 ${150 - larguraQuadril / 2} 460
               L ${150 - larguraQuadril / 2} 340
               L ${150 - larguraCintura / 2} 300
               Z"
            fill="${corCorpo}"/>
      <rect x="${150 - larguraQuadril / 2 + 4}" y="465" width="${larguraQuadril / 2 - 12}" height="115" rx="12" fill="${corCorpo}"/>
      <rect x="${150 - larguraQuadril / 2 + 4 + larguraQuadril / 2 + 4}" y="465" width="${larguraQuadril / 2 - 12}" height="115" rx="12" fill="${corCorpo}"/>
    `;
  } else {
    // perfil (lado): silhueta mais estreita, uma perna so (a de tras fica
    // escondida atras dela mesma vista de lado -- e assim que perfil funciona)
    const bulge = 20 * barriga;
    corpo = `
      <ellipse cx="150" cy="72" rx="26" ry="36" fill="${corCorpo}"/>
      <rect x="138" y="102" width="24" height="20" rx="8" fill="${corCorpo}"/>
      <rect x="96" y="158" width="22" height="165" rx="11" fill="${corCorpo}"/>
      <path d="M 120 150
               Q 150 120 178 152
               Q ${188 + bulge} 190 ${182 + bulge} 240
               Q ${178 + bulge * 0.6} 290 168 325
               L 168 460
               Q 168 470 158 470
               L 142 470
               Q 132 470 132 460
               L 132 325
               Q 122 280 120 230
               Z"
            fill="${corCorpo}"/>
      <rect x="134" y="465" width="32" height="115" rx="14" fill="${corCorpo}"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 600" width="300" height="600">
    <rect width="300" height="600" fill="${corFundo}"/>
    <rect x="0" y="0" width="300" height="600" fill="none" stroke="#e2e8f0" stroke-width="2"/>
    ${corpo}
    <rect x="0" y="556" width="300" height="44" fill="#0f172a" fill-opacity="0.55"/>
    <text x="150" y="583" text-anchor="middle" font-family="Arial, sans-serif" font-size="15"
          fill="#f8fafc">${legenda}</text>
  </svg>`;
  return svgToDataUrl(svg);
}

function fotosDaAvaliacao({ escala, barriga, data, peso }) {
  const legenda = `${data} · ${peso} kg`;
  return {
    frente: silhueta({ view: 'frente', escala, barriga, legenda: 'Frente · ' + legenda }),
    lado: silhueta({ view: 'lado', escala, barriga, legenda: 'Lado · ' + legenda }),
    costas: silhueta({ view: 'costas', escala, barriga, legenda: 'Costas · ' + legenda }),
  };
}

function generateId() {
  return 'al_demo_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function anamnese(a) {
  return {
    objetivoPrincipal: a.objetivo,
    nivelAtividadeAtual: a.nivel,
    historicoAtividade: a.historico,
    doencasDiagnosticadas: a.doencas || 'Nenhuma relatada',
    cirurgiasPrevias: a.cirurgias || 'Nenhuma',
    lesoesDoresAtuais: a.lesoes || 'Nenhuma no momento',
    medicamentosContinuos: a.medicamentos || 'Nenhum',
    historicoFamiliar: a.familiar || 'Sem histórico relevante',
    fumante: a.fumante || 'Não',
    consumoAlcool: a.alcool || 'Socialmente',
    qualidadeSono: a.sono,
    nivelEstresse: a.estresse,
    rotinaAlimentar: a.alimentar,
    restricoesAlimentares: a.restricoes || 'Nenhuma',
    consumoAgua: a.agua,
    observacoesGerais: a.observacoesAnamnese || '',
  };
}

function exMusc(grupo, nome, series, reps, carga, intervalo, obs = '') {
  return { id: Date.now() + Math.random(), grupo, nome, series, reps, carga, intervalo, obs };
}

const TREINOS = {
  // ABC pra quem tem objetivo de emagrecimento/condicionamento: mais volume, cargas moderadas
  emagrecimento: {
    modelo: 'musculacao',
    dias: [
      { dia: 'Segunda', exercicios: [
        exMusc('Full Body', 'Agachamento livre', '3', '15', '20', '60s'),
        exMusc('Costas', 'Remada baixa', '3', '15', '25', '60s'),
        exMusc('Core / Abdômen', 'Prancha', '3', '40s', '-', '45s'),
      ]},
      { dia: 'Quarta', exercicios: [
        exMusc('Quadríceps', 'Leg press 45°', '3', '15', '60', '60s'),
        exMusc('Peito', 'Supino máquina', '3', '15', '18', '60s'),
        exMusc('Core / Abdômen', 'Abdominal remador', '3', '20', '-', '45s'),
      ]},
      { dia: 'Sexta', exercicios: [
        exMusc('Full Body', 'Circuito funcional', '4', '12', '-', '30s', 'Esteira + step + elástico'),
        exMusc('Glúteos', 'Elevação pélvica', '3', '15', '30', '45s'),
      ]},
    ],
  },
  // ABCD pra hipertrofia: cargas maiores, menos volume por serie
  hipertrofia: {
    modelo: 'musculacao',
    dias: [
      { dia: 'Segunda', exercicios: [
        exMusc('Peito', 'Supino reto barra', '4', '8', '70', '90s'),
        exMusc('Tríceps', 'Tríceps corda', '3', '10', '25', '60s'),
        exMusc('Ombros', 'Desenvolvimento halteres', '3', '10', '18', '60s'),
      ]},
      { dia: 'Terça', exercicios: [
        exMusc('Costas', 'Puxada frente', '4', '8', '55', '90s'),
        exMusc('Bíceps', 'Rosca direta', '3', '10', '20', '60s'),
        exMusc('Costas', 'Remada curvada', '3', '10', '45', '90s'),
      ]},
      { dia: 'Quinta', exercicios: [
        exMusc('Quadríceps', 'Agachamento livre', '4', '8', '80', '120s'),
        exMusc('Posterior', 'Stiff', '3', '10', '50', '90s'),
        exMusc('Panturrilha', 'Panturrilha em pé', '4', '15', '40', '45s'),
      ]},
      { dia: 'Sexta', exercicios: [
        exMusc('Ombros', 'Elevação lateral', '3', '12', '10', '45s'),
        exMusc('Costas', 'Remada baixa', '4', '10', '40', '60s'),
        exMusc('Core / Abdômen', 'Abdominal supra', '3', '20', '-', '45s'),
      ]},
    ],
  },
  // reabilitacao/postura: cargas leves, foco em controle
  postura: {
    modelo: 'musculacao',
    dias: [
      { dia: 'Segunda', exercicios: [
        exMusc('Costas', 'Remada cavalinho', '3', '12', '15', '60s', 'Foco em escápula'),
        exMusc('Core / Abdômen', 'Prancha lateral', '3', '30s', '-', '45s'),
      ]},
      { dia: 'Quarta', exercicios: [
        exMusc('Ombros', 'Rotação externa cabo', '3', '15', '5', '45s', 'Manguito rotador'),
        exMusc('Quadríceps', 'Leg press 45°', '3', '12', '40', '60s'),
      ]},
      { dia: 'Sexta', exercicios: [
        exMusc('Full Body', 'Mobilidade + core', '3', '12', '-', '45s'),
        exMusc('Glúteos', 'Elevação pélvica', '3', '15', '20', '45s'),
      ]},
    ],
  },
};

/* ------------------------------------------------------------------------
   8 alunos. As duas avaliacoes de cada um contam uma evolucao coerente com
   o objetivo -- nao sao numeros aleatorios.
   ------------------------------------------------------------------------ */
const PROFESSORES = ['Marcos Vinícius', 'Patrícia Gomes', 'Thiago Ramos'];

const ALUNOS = [
  {
    nome: 'Ana Carolina Ferreira', telefone: '(21) 98123-4567', email: 'ana.ferreira@exemplo.com',
    professorResponsavel: PROFESSORES[0], treino: 'emagrecimento',
    anamnese: {
      objetivo: 'Emagrecimento e condicionamento geral', nivel: 'Sedentária há 2 anos',
      historico: 'Praticou natação na adolescência', sono: 'Regular, 6h por noite',
      estresse: 'Moderado (rotina de trabalho)', alimentar: '3 refeições principais + 1 lanche',
      agua: 'Cerca de 1,5L por dia', restricoes: 'Intolerância a lactose',
      observacoesAnamnese: 'Iniciante em academia, priorizar adaptação nas primeiras semanas.',
    },
    avaliacoes: [
      { data: '2026-04-06', peso: '78.4', altura: '165', percentualGordura: '34.2',
        medidas: { bracoDireito: '29', bracoEsquerdo: '29', torax: '94', cintura: '88', abdomen: '92', quadril: '104', coxaDireita: '58', coxaEsquerda: '58', panturrilhaDireita: '36', panturrilhaEsquerda: '36' },
        obs: 'Início do acompanhamento. Foco em criar o hábito de treino.', escala: 1.12, barriga: 1.2 },
      { data: '2026-07-13', peso: '72.1', altura: '165', percentualGordura: '29.5',
        medidas: { bracoDireito: '28', bracoEsquerdo: '28', torax: '92', cintura: '79', abdomen: '82', quadril: '99', coxaDireita: '56', coxaEsquerda: '56', panturrilhaDireita: '35', panturrilhaEsquerda: '35' },
        obs: 'Redução consistente de medidas. Aderência excelente aos treinos.', escala: 0.98, barriga: 0.7 },
    ],
  },
  {
    nome: 'Bruno Henrique Souza', telefone: '(21) 99234-5678', email: 'bruno.souza@exemplo.com',
    professorResponsavel: PROFESSORES[1], treino: 'hipertrofia',
    anamnese: {
      objetivo: 'Hipertrofia muscular', nivel: 'Treina há 1 ano de forma irregular',
      historico: 'Jogou futebol amador por 5 anos', sono: 'Boa, 7-8h por noite',
      estresse: 'Baixo', alimentar: '5 refeições, dieta estruturada com nutricionista',
      agua: 'Cerca de 3L por dia', observacoesAnamnese: 'Quer ganhar massa magra mantendo o percentual de gordura.',
    },
    avaliacoes: [
      { data: '2026-03-02', peso: '74.0', altura: '178', percentualGordura: '15.8',
        medidas: { bracoDireito: '33', bracoEsquerdo: '32.5', torax: '98', cintura: '80', abdomen: '82', quadril: '96', coxaDireita: '54', coxaEsquerda: '53.5', panturrilhaDireita: '37', panturrilhaEsquerda: '37' },
        obs: 'Boa base muscular, treino estruturado em ABCD.', escala: 0.94, barriga: 0.8 },
      { data: '2026-06-29', peso: '78.6', altura: '178', percentualGordura: '14.9',
        medidas: { bracoDireito: '35', bracoEsquerdo: '34.5', torax: '102', cintura: '81', abdomen: '83', quadril: '98', coxaDireita: '57', coxaEsquerda: '56.5', panturrilhaDireita: '38', panturrilhaEsquerda: '38' },
        obs: 'Ganho de massa muscular visível, principalmente em braços e costas.', escala: 1.05, barriga: 0.85 },
    ],
  },
  {
    nome: 'Camila Rodrigues Alves', telefone: '(21) 98345-6789', email: 'camila.alves@exemplo.com',
    professorResponsavel: PROFESSORES[0], treino: 'emagrecimento',
    anamnese: {
      objetivo: 'Condicionamento físico geral e disposição', nivel: 'Caminha esporadicamente',
      historico: 'Sem prática regular de exercícios há 10 anos', sono: 'Ruim, insônia ocasional',
      estresse: 'Alto', alimentar: 'Irregular, muitas refeições fora de casa',
      agua: 'Menos de 1L por dia', restricoes: 'Nenhuma',
      doencas: 'Hipertensão controlada', medicamentos: 'Losartana 50mg',
      observacoesAnamnese: 'Liberada pelo cardiologista para atividade física moderada.',
    },
    avaliacoes: [
      { data: '2026-04-20', peso: '83.2', altura: '160', percentualGordura: '38.1',
        medidas: { bracoDireito: '31', bracoEsquerdo: '31', torax: '98', cintura: '94', abdomen: '98', quadril: '110', coxaDireita: '62', coxaEsquerda: '62', panturrilhaDireita: '38', panturrilhaEsquerda: '38' },
        obs: 'Pressão arterial monitorada antes e depois do treino.', escala: 1.2, barriga: 1.3 },
      { data: '2026-07-27', peso: '78.9', altura: '160', percentualGordura: '34.8',
        medidas: { bracoDireito: '30', bracoEsquerdo: '30', torax: '96', cintura: '87', abdomen: '90', quadril: '105', coxaDireita: '60', coxaEsquerda: '60', panturrilhaDireita: '37', panturrilhaEsquerda: '37' },
        obs: 'Melhora na disposição relatada pela aluna. Pressão estável durante os treinos.', escala: 1.08, barriga: 1.0 },
    ],
  },
  {
    nome: 'Diego Martins Costa', telefone: '(21) 99456-7890', email: 'diego.costa@exemplo.com',
    professorResponsavel: PROFESSORES[1], treino: 'hipertrofia',
    anamnese: {
      objetivo: 'Ganho de massa muscular e performance', nivel: 'Treina 4x por semana há 8 meses',
      historico: 'Pratica musculação desde os 19 anos', sono: 'Boa, 7h por noite',
      estresse: 'Baixo', alimentar: '6 refeições, superávit calórico controlado',
      agua: 'Cerca de 3,5L por dia', observacoesAnamnese: 'Atleta amador, sem histórico de lesões.',
    },
    avaliacoes: [
      { data: '2026-02-16', peso: '68.5', altura: '172', percentualGordura: '12.4',
        medidas: { bracoDireito: '31', bracoEsquerdo: '30.5', torax: '92', cintura: '74', abdomen: '75', quadril: '90', coxaDireita: '52', coxaEsquerda: '51.5', panturrilhaDireita: '35', panturrilhaEsquerda: '35' },
        obs: 'Baixo percentual de gordura, boa definição muscular.', escala: 0.88, barriga: 0.6 },
      { data: '2026-06-08', peso: '72.9', altura: '172', percentualGordura: '12.1',
        medidas: { bracoDireito: '33.5', bracoEsquerdo: '33', torax: '97', cintura: '75', abdomen: '76', quadril: '93', coxaDireita: '55.5', coxaEsquerda: '55', panturrilhaDireita: '36.5', panturrilhaEsquerda: '36.5' },
        obs: 'Ganho de massa muscular magra consistente, sem aumento de gordura.', escala: 0.98, barriga: 0.6 },
    ],
  },
  {
    nome: 'Elaine Cristina Pereira', telefone: '(21) 98567-8901', email: 'elaine.pereira@exemplo.com',
    professorResponsavel: PROFESSORES[2], treino: 'emagrecimento',
    anamnese: {
      objetivo: 'Emagrecimento pós-gestação', nivel: 'Retomando atividade física',
      historico: 'Praticava pilates antes da gestação', sono: 'Fragmentado (bebê de 6 meses)',
      estresse: 'Moderado', alimentar: 'Amamentando, acompanhamento nutricional',
      agua: 'Cerca de 2L por dia', restricoes: 'Nenhuma',
      observacoesAnamnese: 'Liberada pelo obstetra. Evitar exercícios de alto impacto por enquanto.',
    },
    avaliacoes: [
      { data: '2026-05-04', peso: '71.0', altura: '162', percentualGordura: '31.6',
        medidas: { bracoDireito: '28', bracoEsquerdo: '28', torax: '92', cintura: '82', abdomen: '88', quadril: '102', coxaDireita: '56', coxaEsquerda: '56', panturrilhaDireita: '35', panturrilhaEsquerda: '35' },
        obs: 'Retorno gradual, priorizando fortalecimento de core e assoalho pélvico.', escala: 1.1, barriga: 1.15 },
      { data: '2026-07-20', peso: '67.3', altura: '162', percentualGordura: '28.4',
        medidas: { bracoDireito: '27.5', bracoEsquerdo: '27.5', torax: '90', cintura: '75', abdomen: '79', quadril: '97', coxaDireita: '54.5', coxaEsquerda: '54.5', panturrilhaDireita: '34.5', panturrilhaEsquerda: '34.5' },
        obs: 'Boa evolução, já pode incluir exercícios de impacto leve.', escala: 0.96, barriga: 0.85 },
    ],
  },
  {
    nome: 'Fábio Augusto Lima', telefone: '(21) 99678-9012', email: 'fabio.lima@exemplo.com',
    professorResponsavel: PROFESSORES[2], treino: 'postura',
    anamnese: {
      objetivo: 'Correção postural e alívio de dor lombar', nivel: 'Trabalho sedentário (home office)',
      historico: 'Sem prática de exercícios há 6 anos', sono: 'Regular, 6h30 por noite',
      estresse: 'Alto (trabalho)', alimentar: 'Regular, 3 refeições',
      agua: 'Cerca de 2L por dia', lesoes: 'Dor lombar crônica leve',
      observacoesAnamnese: 'Avaliado por fisioterapeuta, sem contraindicação para treino orientado.',
    },
    avaliacoes: [
      { data: '2026-04-13', peso: '86.7', altura: '175', percentualGordura: '27.9',
        medidas: { bracoDireito: '33', bracoEsquerdo: '32.5', torax: '104', cintura: '96', abdomen: '100', quadril: '106', coxaDireita: '58', coxaEsquerda: '58', panturrilhaDireita: '38', panturrilhaEsquerda: '38' },
        obs: 'Postura cifótica leve, dor lombar relatada em esforços prolongados.', escala: 1.15, barriga: 1.1 },
      { data: '2026-07-06', peso: '83.9', altura: '175', percentualGordura: '25.6',
        medidas: { bracoDireito: '33.5', bracoEsquerdo: '33', torax: '103', cintura: '90', abdomen: '93', quadril: '104', coxaDireita: '59', coxaEsquerda: '59', panturrilhaDireita: '38.5', panturrilhaEsquerda: '38.5' },
        obs: 'Dor lombar reduzida significativamente. Postura visivelmente melhor.', escala: 1.05, barriga: 0.95 },
    ],
  },
  {
    nome: 'Gabriela Nunes Barbosa', telefone: '(21) 98789-0123', email: 'gabriela.barbosa@exemplo.com',
    professorResponsavel: PROFESSORES[0], treino: 'emagrecimento',
    anamnese: {
      objetivo: 'Tonificação muscular e definição', nivel: 'Ativa, faz yoga 2x por semana',
      historico: 'Pratica dança desde criança', sono: 'Boa, 7h por noite',
      estresse: 'Baixo', alimentar: 'Vegetariana, refeições balanceadas',
      agua: 'Cerca de 2,5L por dia', restricoes: 'Vegetariana',
      observacoesAnamnese: 'Já tem boa base de condicionamento, busca definição.',
    },
    avaliacoes: [
      { data: '2026-05-11', peso: '61.5', altura: '167', percentualGordura: '26.3',
        medidas: { bracoDireito: '26', bracoEsquerdo: '26', torax: '86', cintura: '70', abdomen: '73', quadril: '95', coxaDireita: '54', coxaEsquerda: '54', panturrilhaDireita: '34', panturrilhaEsquerda: '34' },
        obs: 'Boa base de condicionamento, foco em treino de força agora.', escala: 1.0, barriga: 0.9 },
      { data: '2026-08-03', peso: '60.8', altura: '167', percentualGordura: '23.7',
        medidas: { bracoDireito: '26.5', bracoEsquerdo: '26.5', torax: '87', cintura: '67', abdomen: '70', quadril: '94', coxaDireita: '55', coxaEsquerda: '55', panturrilhaDireita: '34.5', panturrilhaEsquerda: '34.5' },
        obs: 'Ganho de definição muscular visível, peso praticamente estável.', escala: 0.92, barriga: 0.65 },
    ],
  },
  {
    nome: 'Rafael Oliveira Santos', telefone: '(21) 99890-1234', email: 'rafael.santos@exemplo.com',
    professorResponsavel: PROFESSORES[1], treino: 'hipertrofia',
    anamnese: {
      objetivo: 'Ganho de força e massa muscular', nivel: 'Treina há 3 anos, nível intermediário',
      historico: 'Pratica musculação e corrida', sono: 'Boa, 7-8h por noite',
      estresse: 'Baixo', alimentar: '5 refeições, dieta com acompanhamento nutricional',
      agua: 'Cerca de 4L por dia', observacoesAnamnese: 'Objetivo de competir em prova amadora de powerlifting.',
    },
    avaliacoes: [
      { data: '2026-03-23', peso: '82.0', altura: '180', percentualGordura: '17.5',
        medidas: { bracoDireito: '36', bracoEsquerdo: '35.5', torax: '106', cintura: '84', abdomen: '86', quadril: '99', coxaDireita: '60', coxaEsquerda: '59.5', panturrilhaDireita: '39', panturrilhaEsquerda: '39' },
        obs: 'Boa força de base, iniciando periodização para powerlifting.', escala: 1.02, barriga: 0.8 },
      { data: '2026-07-14', peso: '85.7', altura: '180', percentualGordura: '16.8',
        medidas: { bracoDireito: '38', bracoEsquerdo: '37.5', torax: '110', cintura: '85', abdomen: '87', quadril: '101', coxaDireita: '63', coxaEsquerda: '62.5', panturrilhaDireita: '40', panturrilhaEsquerda: '40' },
        obs: 'Recordes pessoais batidos em agachamento e supino. Ganho de massa consistente.', escala: 1.1, barriga: 0.85 },
    ],
  },
];

function montarAluno(a) {
  const id = generateId();
  const avaliacoes = a.avaliacoes.map((av, i) => ({
    id: 'av' + (i + 1) + '_' + Math.random().toString(36).slice(2, 7),
    data: av.data,
    peso: av.peso,
    altura: av.altura,
    percentualGordura: av.percentualGordura,
    medidas: av.medidas,
    fotos: fotosDaAvaliacao({ escala: av.escala, barriga: av.barriga, data: av.data, peso: av.peso }),
    observacoesProfessor: av.obs,
  }));
  return {
    id,
    nome: a.nome,
    telefone: a.telefone,
    email: a.email,
    professorResponsavel: a.professorResponsavel,
    dataCadastro: a.avaliacoes[0].data,
    anamnese: anamnese(a.anamnese),
    avaliacoes,
    treino: TREINOS[a.treino],
    _rev: 0,
  };
}

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

(async () => {
  const montados = ALUNOS.map(montarAluno);

  let tamanhoTotal = 0;
  montados.forEach(a => { tamanhoTotal += JSON.stringify(a).length; });

  console.log('  8 alunos montados:');
  montados.forEach(a => {
    console.log('    ' + a.nome.padEnd(26) + ' prof: ' + a.professorResponsavel.padEnd(18) +
      ' avaliacoes: ' + a.avaliacoes.length + '  (' + a.id + ')');
  });
  console.log('');
  console.log('  tamanho total a gravar: ' + Math.round(tamanhoTotal / 1024) + ' KB');

  if (!GRAVAR) {
    console.log('');
    console.log('  (nada foi gravado -- rode com --gravar pra criar de verdade)');
    return;
  }

  const token = await login();
  console.log('  login ok, gravando...');

  const indexAtual = (await storageGet(token, 'index-alunos')) || [];
  const novosResumos = montados.map(a => ({
    id: a.id, nome: a.nome, professorResponsavel: a.professorResponsavel,
    telefone: a.telefone, email: a.email,
    ultimaAvaliacaoData: a.avaliacoes[a.avaliacoes.length - 1].data,
  }));

  for (const a of montados) {
    await storageSet(token, 'aluno:' + a.id, a);
    console.log('    gravado: ' + a.nome);
  }

  const novoIndex = [...indexAtual, ...novosResumos];
  await storageSet(token, 'index-alunos', novoIndex);
  console.log('  index-alunos atualizado: ' + novoIndex.length + ' aluno(s) no total');
  console.log('');
  console.log('  pronto.');
})().catch(e => { console.error('  ERRO: ' + e.message); process.exit(1); });
