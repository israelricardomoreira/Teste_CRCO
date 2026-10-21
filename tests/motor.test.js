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
