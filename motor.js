/* Qualificador CRCO — motor.js: regras e cálculos sem tela (NBR 12721, extenso, CPF/CNPJ, auditoria).
 * Roda no navegador e no Node (tests/motor.test.js). Não usa document nem o estado da tela. */
var Motor = (function(){
  'use strict';
const onlyDigits = s => String(s || '').replace(/\D/g, '');
function todayISO(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function parseBR(v){
  if (v == null) return 0;
  let s = String(v).trim().replace(/\s|m²|m2|R\$/gi, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
function fmt(n, d = 2){ if (!isFinite(n)) n = 0; return Number(n).toLocaleString('pt-BR', {minimumFractionDigits:d, maximumFractionDigits:d}); }
function fmtDate(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; }
function brToISO(s){ const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; }
function joinE(a){ a = a.filter(Boolean); if (a.length <= 1) return a[0] || ''; return a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]; }
function extenso(num, fem = false){
  const n = parseInt(num, 10);
  if (!isFinite(n) || n < 0) return '[NÚMERO INVÁLIDO]';
  if (n === 0) return 'zero';
  if (n >= 1000000) return n.toLocaleString('pt-BR');
  const U = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
  const UF = ['','uma','duas','três','quatro','cinco','seis','sete','oito','nove'];
  const D10 = ['dez','onze','doze','treze','catorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const D = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const C = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  const CF = ['','cento','duzentas','trezentas','quatrocentas','quinhentas','seiscentas','setecentas','oitocentas','novecentas'];
  const ate999 = (x, f) => {
    if (x === 0) return '';
    if (x === 100) return 'cem';
    const c = Math.floor(x / 100), r = x % 100, parts = [];
    if (c) parts.push((f ? CF : C)[c]);
    if (r) {
      if (r < 10) parts.push((f ? UF : U)[r]);
      else if (r < 20) parts.push(D10[r - 10]);
      else { const dz = Math.floor(r / 10), u = r % 10; parts.push(u ? D[dz] + ' e ' + (f ? UF : U)[u] : D[dz]); }
    }
    return parts.join(' e ');
  };
  const mil = Math.floor(n / 1000), resto = n % 1000;
  let s = mil ? (mil === 1 ? 'mil' : ate999(mil, fem) + ' mil') : '';
  if (resto) { const r = ate999(resto, fem); s = s ? s + ((resto < 100 || resto % 100 === 0) ? ' e ' : ' ') + r : r; }
  return s;
}
function validCPF(v){
  const c = onlyDigits(v); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let d = (s * 10) % 11; if (d === 10) d = 0; if (d !== +c[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  d = (s * 10) % 11; if (d === 10) d = 0; return d === +c[10];
}
function validCNPJ(v){
  const c = onlyDigits(v); if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const dv = len => { let s = 0, pos = len - 7; for (let i = len; i >= 1; i--) { s += +c[len - i] * pos--; if (pos < 2) pos = 9; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return dv(12) === +c[12] && dv(13) === +c[13];
}
function calcInc(I){
  const p = Math.max(4, Math.min(8, parseInt(I.precFI, 10) || 6)), scale = 10 ** p;
  const q1 = I.q1.map(r => {
    const v = k => parseBR(r[k]);
    const c = {2:v('v2'),3:v('v3'),4:v('v4'),7:v('v7'),8:v('v8'),9:v('v9'),12:v('v12'),13:v('v13'),14:v('v14')};
    c[5] = c[2] + c[3]; c[6] = c[2] + c[4]; c[10] = c[7] + c[8]; c[11] = c[7] + c[9]; c[15] = c[12] + c[13]; c[16] = c[12] + c[14];
    c[17] = c[5] + c[10] + c[15]; c[18] = c[6] + c[11] + c[16];
    return {r, qtd:Math.max(0, parseInt(r.qtd, 10) || 0), c};
  });
  const T1 = {}; for (let i = 2; i <= 18; i++) T1[i] = q1.reduce((s, x) => s + (x.c[i] || 0) * x.qtd, 0);
  const q2 = I.q2.map(r => {
    const v = k => parseBR(r[k]);
    const c = {20:v('v20'),21:v('v21'),22:v('v22'),25:v('v25'),26:v('v26'),27:v('v27')};
    c[23] = c[20] + c[21]; c[24] = c[20] + c[22]; c[28] = c[25] + c[26]; c[29] = c[25] + c[27]; c[30] = c[24] + c[29];
    return {r, c, fi:0};
  });
  const S30 = q2.reduce((s, x) => s + x.c[30], 0);
  /* Coeficiente (31) com o método dos maiores restos: soma exatamente 1 na precisão escolhida */
  if (S30 > 0) {
    const exact = q2.map(x => x.c[30] / S30 * scale), fl = exact.map(Math.floor);
    const rem = scale - fl.reduce((a, b) => a + b, 0);
    exact.map((e, i) => ({i, f:e - fl[i]})).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, Math.max(0, rem)).forEach(o => fl[o.i]++);
    q2.forEach((x, i) => { x.fi = fl[i] / scale; });
  }
  q2.forEach(x => {
    const c = x.c, rz = S30 > 0 ? c[30] / S30 : 0; c[31] = x.fi; c[32] = rz * T1[12]; c[33] = rz * T1[13]; c[34] = rz * T1[14];
    c[35] = c[32] + c[33]; c[36] = c[32] + c[34]; c[37] = c[23] + c[28] + c[35]; c[38] = c[30] + c[36];
    const ac = parseBR(x.r.acess); x.ivb = {B:c[23] - ac, C:ac, D:c[23], E:c[28] + c[35], F:c[37]};
  });
  const T2 = {}; for (let i = 20; i <= 38; i++) T2[i] = q2.reduce((s, x) => s + (x.c[i] || 0), 0);
  /* Unidades com áreas iguais e coeficientes diferentes (efeito do arredondamento) */
  const grp = {}; q2.forEach(x => { const k = x.c[30].toFixed(6); (grp[k] = grp[k] || []).push(x); });
  const ties = Object.values(grp).filter(g => new Set(g.map(x => x.fi.toFixed(p))).size > 1).map(g => g.map(x => unitShort(x.r)).slice(0, 4).join(', '));
  /* Soma por pavimento: QII × QI */
  const pavChecks = [];
  q1.forEach(x => {
    const us = q2.filter(u => u.r.pav === x.r.pav); if (!us.length) return;
    [[2,20],[3,21]].forEach(([a, b]) => {
      const qi = x.c[a] * x.qtd, qii = us.reduce((s, u) => s + u.c[b], 0);
      if (qi > 0 || qii > 0) pavChecks.push({row:x, col:a, ok:Math.abs(qi - qii) < 0.05, t:`${x.r.nome} col. ${a} (QI ${fmt(qi)} × QII ${fmt(qii)})`});
    });
  });
  const q3 = I.q3, cub = parseBR(q3.cub), a46 = T1[18];
  const Q3 = {a41:T1[5], a42:T1[10] + T1[15], a43:T1[17], a44:T1[6], a45:T1[11] + T1[16], a46, v5:a46 * cub};
  Q3.v7 = Q3.v5 + parseBR(q3.v6); Q3.v10 = Q3.v7 + parseBR(q3.v8) + parseBR(q3.v9); Q3.v13 = Q3.v10 + parseBR(q3.v11) + parseBR(q3.v12); Q3.v14 = a46 > 0 ? Q3.v13 / a46 : 0;
  return {p, q1, q2, T1, T2, S30, ties, pavChecks, Q3};
}
const unitShort = r => (r.bloco ? `Bl. ${r.bloco} ` : '') + r.nome;
const fiOf = x => String(x.r.fiRT || '').trim() !== '' ? parseBR(x.r.fiRT) : x.fi;
function auditoria(R, I, campos, meta){
  const A = [], tol = 0.05, p = R.p, n = R.q2.length;
  if (!n) return [['warn','Gere os quadros e lance as áreas para iniciar a auditoria.']];
  [[5,23,'Área privativa real (QI col. 5 × QII col. 23)'],[6,24,'Área privativa equivalente (QI col. 6 × QII col. 24)'],[10,28,'Comum não proporcional real (QI col. 10 × QII col. 28)'],[11,29,'Comum não proporcional equivalente (QI col. 11 × QII col. 29)'],[17,37,'Área real global (QI col. 17 × QII col. 37)'],[18,38,'Área equivalente global (QI col. 18 × QII col. 38)']].forEach(([a, b, t]) => {
    const d = Math.abs(R.T1[a] - R.T2[b]);
    A.push(d < tol ? ['ok', `${t}: confere — ${fmt(R.T1[a])} m².`] : ['err', `${t}: diverge em ${fmt(d)} m² (QI ${fmt(R.T1[a])} × QII ${fmt(R.T2[b])}).`]);
  });
  const bad = R.pavChecks.filter(c => !c.ok);
  if (bad.length) A.push(['err', `Áreas privativas das unidades, somadas por pavimento, divergem do Quadro I: ${bad.slice(0, 6).map(c => c.t).join('; ')}${bad.length > 6 ? '…' : ''}.`]);
  else if (R.pavChecks.length) A.push(['ok', 'Áreas privativas das unidades somadas por pavimento conferem com o Quadro I.']);
  const sumCalc = R.q2.reduce((s, x) => s + x.fi, 0);
  A.push(Math.abs(sumCalc - 1) < 10 ** -(p + 2) ? ['ok', `Soma dos coeficientes calculados = ${fmt(1, p)}.`] : ['err', `Soma dos coeficientes calculados = ${fmt(sumCalc, p)} (sem área equivalente lançada?).`]);
  const comRT = R.q2.filter(x => String(x.r.fiRT || '').trim() !== '');
  if (comRT.length) {
    const sumRT = R.q2.reduce((s, x) => s + parseBR(x.r.fiRT), 0);
    A.push(Math.abs(sumRT - 1) < 0.5 * 10 ** -p ? ['ok', `Soma dos coeficientes do RT = ${fmt(sumRT, p)}.`] : ['err', `Soma dos coeficientes do RT = ${fmt(sumRT, p)} (deveria ser 1).`]);
    if (comRT.length < n) A.push(['warn', `Coeficiente do RT lançado em ${comRT.length} de ${n} unidades.`]);
    const div = comRT.filter(x => Math.abs(parseBR(x.r.fiRT) - x.fi) > 0.6 * 10 ** -p);
    A.push(div.length ? ['err', `Coeficiente do RT diverge do calculado em ${div.length} unidade(s): ${div.slice(0, 8).map(x => unitShort(x.r)).join(', ')}${div.length > 8 ? '…' : ''}.`] : ['ok', 'Coeficientes do RT conferem com o cálculo (col. 30 ÷ Σ30).']);
  }
  if (R.ties.length) A.push(['warn', `Unidades com áreas iguais ficaram com coeficientes diferentes por arredondamento (${R.ties.slice(0, 4).join(' | ')}). Aumente as casas decimais ou siga o quadro do RT.`]);
  const alv = parseBR(campos.alvaraArea);
  if (alv > 0) { const d = Math.abs(alv - R.T1[17]), de = Math.abs(alv - R.T1[18]); A.push(d < tol ? ['ok', 'Área do alvará igual à área real global da NBR.'] : de < tol ? ['ok', `Área do alvará (${fmt(alv)} m²) igual à área equivalente global (QI col. 18); a área real global NBR é ${fmt(R.T1[17])} m² (inclui descobertas).`] : ['warn', `Área do alvará (${fmt(alv)} m²) difere da área real global (${fmt(R.T1[17])} m²) e da equivalente global (${fmt(R.T1[18])} m²) — avaliar.`]); }
  else A.push(['warn', 'Informe a área do alvará na Conferência para comparar com a NBR.']);
  const ref = campos.reqData || meta.dataPrenotacao, cm = I.q3.cubMes;
  if (cm && ref) {
    const [ry, rm] = ref.split('-').map(Number), [cy, cmo] = cm.split('-').map(Number), diff = (ry * 12 + rm) - (cy * 12 + cmo);
    A.push(diff >= 0 && diff <= 2 ? ['ok', `CUB de ${String(cmo).padStart(2, '0')}/${cy}: no mês de referência ou nos dois anteriores (NBR 12721, 6.4.1).`] : ['err', `CUB de ${String(cmo).padStart(2, '0')}/${cy} fora do mês de referência (${fmtDate(ref)}) e dos dois anteriores (NBR 12721, 6.4.1).`]);
  } else A.push(['warn', 'Informe o mês do CUB e a data do requerimento para checar a atualização do custo (NBR 12721, 6.4.1).']);
  if (parseBR(I.q3.cub) <= 0) A.push(['warn', 'CUB não informado: o item 5 do Quadro III fica zerado.']);
  const rt = parseBR(I.q3.v13rt);
  if (rt > 0) { const d = Math.abs(rt - R.Q3.v13); A.push(d < 1 ? ['ok', 'Custo global do RT confere com o cálculo do Quadro III.'] : ['err', `Custo global do RT (R$ ${fmt(rt)}) difere do calculado (R$ ${fmt(R.Q3.v13)}) em R$ ${fmt(d)}.`]); }
  return A;
}
  return {VERSAO:'1.0.0', onlyDigits:onlyDigits, todayISO:todayISO, parseBR:parseBR, fmt:fmt, fmtDate:fmtDate, brToISO:brToISO, joinE:joinE, extenso:extenso, validCPF:validCPF, validCNPJ:validCNPJ, unitShort:unitShort, fiOf:fiOf, calcInc:calcInc, auditoria:auditoria};
})();
if (typeof module !== 'undefined') module.exports = Motor;
