/* Testes do motor do Qualificador CRCO — rode com:  node --test tests/
 * O caso "6 aptos em 2 pavimentos" usa as áreas de uma incorporação real já conferida à mão
 * (só números: nenhum nome, CPF/CNPJ ou endereço de cliente vai para o repositório). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../motor.js');

test('extenso: gênero, mil e cem', () => {
  assert.equal(M.extenso(2, true), 'duas');
  assert.equal(M.extenso(21, true), 'vinte e uma');
  assert.equal(M.extenso(200, true), 'duzentas');
  assert.equal(M.extenso(1000), 'mil');
  assert.equal(M.extenso(1100), 'mil e cem');
  assert.equal(M.extenso(1180), 'mil cento e oitenta');
  assert.equal(M.extenso(180), 'cento e oitenta');
  assert.equal(M.extenso(undefined), '[NÚMERO INVÁLIDO]');
});

test('parseBR: padrão brasileiro e ponto decimal', () => {
  assert.equal(M.parseBR('1.234,56'), 1234.56);
  assert.equal(M.parseBR('120.50'), 120.5);
  assert.equal(M.parseBR('1.000'), 1000);
  assert.equal(M.parseBR('R$ 607.576,20'), 607576.2);
  assert.equal(M.parseBR('51,89 m²'), 51.89);
  assert.equal(M.parseBR(''), 0);
});

test('CPF e CNPJ', () => {
  assert.equal(M.validCPF('529.982.247-25'), true);
  assert.equal(M.validCPF('529.982.247-24'), false);
  assert.equal(M.validCPF('111.111.111-11'), false);
  assert.equal(M.validCNPJ('11.222.333/0001-81'), true);
  assert.equal(M.validCNPJ('11.222.333/0001-80'), false);
});

function pav(nome, pav, o){ return Object.assign({pav, nome, qtd:'1', v2:'',v3:'',v4:'',v7:'',v8:'',v9:'',v12:'',v13:'',v14:''}, o); }
function un(nome, pav, v20, v21, fiRT){ return {pav, bloco:'', nome, pcd:false, comp:'', v20, v21, v22:'', v25:'', v26:'10,80', v27:'', acess:v21, fiRT}; }
const caso6 = () => ({ precFI:'4',
  q1:[pav('Térreo',0,{v2:'151,73',v3:'48,75',v8:'64,80',v12:'1,47',v13:'85,25'}), pav('Superior',1,{v2:'154,31',v12:'6,17'})],
  q2:[un('101',0,'51,89','','0,1696'), un('102',0,'50,04','17,86','0,1635'), un('103',0,'49,80','30,89','0,1627'),
      un('201',1,'53,18','','0,1738'), un('202',1,'53,68','','0,1754'), un('203',1,'47,45','','0,1550')],
  q3:{cub:'1.936,93', cubMes:'2026-09', padrao:'', v6:'',v8:'',v9:'',v11:'',v12:'', v13rt:'607.576,20'} });

test('NBR 12721: caso real de 6 aptos fecha com os quadros do RT', () => {
  const R = M.calcInc(caso6());
  const r2 = x => Math.round(x * 100) / 100;
  assert.equal(r2(R.T1[17]), 512.48); assert.equal(r2(R.T1[18]), 313.68);
  assert.equal(r2(R.T2[37]), 512.48); assert.equal(r2(R.T2[38]), 313.68);
  assert.deepEqual(R.q2.map(x => x.fi.toFixed(4)), ['0.1696','0.1635','0.1627','0.1738','0.1754','0.1550']);
  assert.deepEqual(R.q2.map(x => r2(x.ivb.E)), [26.55, 25.99, 25.92, 26.94, 27.09, 25.20]);
  assert.deepEqual(R.q2.map(x => r2(x.c[37])), [78.44, 93.89, 106.61, 80.12, 80.77, 72.65]);
  assert.equal(r2(R.Q3.v13), 607576.2);
});

test('auditoria do caso real: nada em erro (vaga no térreo de apto do superior não é falso alarme)', () => {
  const I = caso6(), R = M.calcInc(I);
  const A = M.auditoria(R, I, {alvaraArea:'313,68', reqData:'2026-10-16'}, {dataPrenotacao:''});
  assert.deepEqual(A.filter(a => a[0] === 'err'), []);
  assert.ok(A.some(a => a[0] === 'ok' && /equivalente global/.test(a[1])), 'alvará = área equivalente global');
});

test('auditoria acusa CUB fora do prazo e coeficiente do RT divergente', () => {
  const I = caso6(); I.q3.cubMes = '2026-06'; I.q2[0].fiRT = '0,1700';
  const A = M.auditoria(M.calcInc(I), I, {reqData:'2026-10-16'}, {});
  assert.ok(A.some(a => a[0] === 'err' && /CUB/.test(a[1])));
  assert.ok(A.some(a => a[0] === 'err' && /diverge do calculado/.test(a[1])));
});

test('fração ideal: maiores restos fecham exatamente 1', () => {
  const I = {precFI:'4', q1:[pav('T',0,{v2:'300'})], q2:['1','2','3'].map(n => un(n,0,'100','','')), q3:{}};
  I.q2.forEach(u => { u.v26 = ''; });
  const R = M.calcInc(I);
  assert.deepEqual(R.q2.map(x => x.fi.toFixed(4)), ['0.3334','0.3333','0.3333']);
  assert.equal(Math.round(R.q2.reduce((s, x) => s + x.fi, 0) * 1e4), 1e4);
});

/* ---------- matrícula: textos fictícios (nenhum dado de cliente) ---------- */
const MAT_A = `IMÓVEL: Lote 10, da Quadra 5, situado nesta cidade, no loteamento JARDIM TESTE, com a área de 360,00m², confrontando pela frente com a Rua 1, com 12,00 metros; pelo fundo com o lote 20, com 12,00 metros; pelo lado direito com os lotes 9 e 8, com 30,00 metros e pelo lado esquerdo com o lote 11, com 30,00 metros. PROPRIETÁRIA: LOTEADORA EXEMPLO LTDA, com sede em Goiânia-GO, CNPJ 11.222.333/0001-81. REGISTRO ANTERIOR: Matrícula nº 1.000 deste Cartório. Dou fé. Cidade Ocidental-GO, 05 de maio de 2015. O Oficial.
-----------------------------
R-1-20.000. Protocolo nº 50.000, datado de 02/02/2020. COMPRA E VENDA. Nos termos da escritura..., a proprietária vendeu o imóvel objeto desta matrícula para: JOÃO EXEMPLO, brasileiro, solteiro, CPF nº 529.982.247-25, pelo preço de R$ 50.000,00. Dou fé. Cidade Ocidental-GO, 10 de fevereiro de 2020. O Oficial.
-----------------------------
R-2-20.000. Protocolo nº 60.000, datado de 03/03/2021. ALIENAÇÃO FIDUCIÁRIA. O proprietário alienou fiduciariamente o imóvel ao BANCO EXEMPLO S/A. Dou fé. Cidade Ocidental-GO, 15 de março de 2021. O Oficial.
-----------------------------
Av-3-20.000. Protocolo nº 70.000, datado de 04/04/2022. PENHORA. Procedo a esta averbação... Dou fé. Cidade Ocidental-GO, 20 de abril de 2022. O Oficial.
-----------------------------
Av-4-20.000. Protocolo nº 80.000, datado de 05/05/2023. CANCELAMENTO DE ALIENAÇÃO FIDUCIÁRIA. Fica cancelada a alienação fiduciária objeto do R-2 desta matrícula, em virtude da quitação. Dou fé. Cidade Ocidental-GO, 12 de maio de 2023. O Oficial.`;

test('matrícula: titular, confrontações, ônus cancelado e ônus em aberto', () => {
  const R = M.lerMatricula(MAT_A);
  assert.equal(R.numero, '20.000'); assert.equal(R.areaNum, 360); assert.equal(R.abertura, '2015-05-05');
  assert.deepEqual(R.confrontacoes.map(c => c.lado + ':' + c.com + ':' + c.med), ['frente:Rua 1:12,00', 'fundo:lote 20:12,00', 'lado direito:lotes 9 e 8:30,00', 'lado esquerdo:lote 11:30,00']);
  assert.equal(R.proprietarioInicial.nome, 'LOTEADORA EXEMPLO LTDA');
  assert.equal(R.titular.nome, 'JOÃO EXEMPLO'); assert.equal(R.titular.doc, '529.982.247-25'); assert.equal(R.titular.ato, 'R-1');
  assert.equal(R.atos.find(a => a.rot === 'R-2').canceladoPor, 'Av-4');
  assert.deepEqual(R.onusAbertos.map(o => o.rot), ['Av-3']);
  assert.equal(R.ultimoAto, 'Av-4-20.000');
});

test('matrícula: texto sem quebras de linha (PDF/OCR) e cruzamento com a ficha', () => {
  const R = M.lerMatricula(MAT_A.replace(/\n-+\n/g, ' ').replace(/\n/g, ' '));
  assert.equal(R.atos.length, 4);
  const X = M.cruzarMatricula(R, {areaTerreno:'350,00', confrontacao:'frente 12,00; fundo 12,00; direito 30,00; esquerdo 30,00'}, [{papel:'Transmitente', nome:'MARIA OUTRA', doc:'111.444.777-35'}]);
  assert.ok(X.some(x => x[0] === 'err' && /Área do terreno/.test(x[1])));
  assert.ok(X.some(x => x[0] === 'err' && /Continuidade/.test(x[1])));
  assert.ok(X.some(x => x[0] === 'warn' && /Av-3 PENHORA/.test(x[1])));
});

test('anonimização: nomes viram marcadores estáveis e números pessoais viram #', () => {
  const an = M.criarAnonimizador(['JOÃO EXEMPLO']);
  const t = 'vendeu para: JOÃO EXEMPLO, CPF nº 529.982.247-25, RG nº 1234567/SSP-DF, casado com MARIA DA SILVA SOUZA, certidão matrícula nº 156976 01 55 2019 2 00032 264 0009564 82. Depois, JOÃO EXEMPLO vendeu à CONSTRUTORA TESTE LTDA, CNPJ 11.222.333/0001-81. COMPRA E VENDA. Dou fé.';
  const o = an.anon(t);
  assert.ok(!/JOÃO|MARIA|SOUZA|TESTE/.test(o), o);
  assert.ok(!/\d{3}\.\d{3}\.\d{3}-\d{2}|1234567|156976/.test(o), o);
  assert.equal(o.match(/\[PF_1\]/g).length, 2, 'o mesmo nome vira o mesmo marcador');
  assert.ok(/\[PJ_\d\]/.test(o), 'empresa vira PJ');
  assert.ok(o.includes('COMPRA E VENDA') && o.includes('Dou fé'), 'termos registrais ficam');
  const obj = M.anonimizarObjeto({a:['JOÃO EXEMPLO'], b:{c:'CPF 529.982.247-25'}, n:3}, an);
  assert.deepEqual(obj, {a:['[PF_1]'], b:{c:'CPF ###.###.###-##'}, n:3});
});

test('perfil do texto: marcadores e formato dos rótulos de ato', () => {
  const P = M.perfilTexto(MAT_A);
  assert.equal(P.marcadores.imovel, 1); assert.equal(P.marcadores.protocolo, 4);
  assert.equal(P.rotulosAto['R-1-17.118'], 4); assert.equal(P.documentos.cnpj, 1);
});

test('continuidade: parte lançada só com o nome também confere', () => {
  const R = M.lerMatricula(MAT_A);
  const X = M.cruzarMatricula(R, {}, [{papel:'Transmitente', nome:'João Exemplo', doc:''}]);
  assert.ok(X.some(x => x[0] === 'ok' && /Continuidade/.test(x[1])), JSON.stringify(X));
});
