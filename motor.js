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
/* compara um valor escrito pelo RT com o calculado, nas casas decimais que o RT usou:
 * ok = igual depois de arredondar; arred = diferença de até 1 no último dígito (truncou ou arredondou errado: atenção, o registrador avalia);
 * err = diferença maior. Devolve também o valor correto arredondado. */
function compararRT(lido, calc, casasPadrao = 2){
  const s = String(lido ?? '').trim(); if (!s) return null;
  const m = s.match(/,(\d+)$/), casas = m ? m[1].length : casasPadrao, u = 10 ** -casas, a = parseBR(s), correto = fmt(calc, casas);
  if (fmt(a, casas) === correto) return {c:'ok', correto, casas};
  return {c:Math.abs(a - calc) <= 1.5 * u + 1e-9 ? 'arred' : 'err', correto, casas};
}
/* data ISO + N dias corridos (validade "de 30 dias" conta a partir da emissão) */
function somarDias(iso, n){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m || !(n > 0)) return ''; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + +n)); return d.toISOString().slice(0, 10); }
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
  if (campos.reqData && campos.alvaraData) A.push(campos.reqData < campos.alvaraData ? ['err', `Data do requerimento (${fmtDate(campos.reqData)}) é anterior à do alvará (${fmtDate(campos.alvaraData)}).`] : ['ok', 'Requerimento posterior ao alvará de construção.']);
  const ater = parseBR(campos.areaTerreno), ter = R.q1.filter(x => /t[eé]rreo/i.test(x.r.nome));
  if (ater > 0 && ter.length) { const s17 = ter.reduce((s, x) => s + x.c[17] * x.qtd, 0);
    A.push(Math.abs(s17 - ater) < tol ? ['ok', `Área real do térreo (QI col. 17) = área do terreno (${fmt(ater)} m²).`] : ['err', `Área real do térreo (QI col. 17) soma ${fmt(s17)} m², mas o terreno tem ${fmt(ater)} m² (diferença de ${fmt(s17 - ater)} m²). O térreo deve fechar o lote inteiro (cobertas + descobertas).`]); }
  const sumCalc = R.q2.reduce((s, x) => s + x.fi, 0);
  A.push(Math.abs(sumCalc - 1) < 10 ** -(p + 2) ? ['ok', `Soma dos coeficientes calculados = ${fmt(1, p)}.`] : ['err', `Soma dos coeficientes calculados = ${fmt(sumCalc, p)} (sem área equivalente lançada?).`]);
  const comRT = R.q2.filter(x => String(x.r.fiRT || '').trim() !== '');
  if (comRT.length) {
    const sumRT = R.q2.reduce((s, x) => s + parseBR(x.r.fiRT), 0);
    A.push(Math.abs(sumRT - 1) < 0.5 * 10 ** -p ? ['ok', `Soma dos coeficientes do RT = ${fmt(sumRT, p)}.`] : Math.abs(sumRT - 1) <= comRT.length * 10 ** -p + 1e-9 ? ['warn', `Soma dos coeficientes do RT = ${fmt(sumRT, p)}: a diferença para 1 vem do arredondamento (ou truncamento) dos coeficientes. Avalie se aceita.`] : ['err', `Soma dos coeficientes do RT = ${fmt(sumRT, p)} (deveria ser 1).`]);
    if (comRT.length < n) A.push(['warn', `Coeficiente do RT lançado em ${comRT.length} de ${n} unidades.`]);
    const cmp = comRT.map(x => ({x, k:compararRT(x.r.fiRT, x.c[30] / (R.T2[30] || 1), p)}));
    const div = cmp.filter(o => o.k.c === 'err'), arr = cmp.filter(o => o.k.c === 'arred');
    if (div.length) A.push(['err', `Coeficiente do RT diverge do calculado em ${div.length} unidade(s): ${div.slice(0, 8).map(o => `${unitShort(o.x.r)} (RT ${o.x.r.fiRT} × correto ${o.k.correto})`).join(', ')}${div.length > 8 ? '…' : ''}.`]);
    if (arr.length) A.push(['warn', `Coeficiente do RT com diferença de arredondamento em ${arr.length} unidade(s): ${arr.slice(0, 8).map(o => `${unitShort(o.x.r)} RT ${o.x.r.fiRT} × correto ${o.k.correto}`).join('; ')}${arr.length > 8 ? '…' : ''}. Provável truncamento: avalie se aceita. A minuta repete o valor do quadro.`]);
    if (!div.length && !arr.length) A.push(['ok', 'Coeficientes do RT conferem com o cálculo (col. 30 ÷ Σ30).']);
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
  if (R.q1.some(x => x.r.lido) || R.q2.some(x => x.r.lido)) {
    const dif = conferirQuadrosLidos(R, I.lidosTot);
    if (dif.length) A.push(['err', `Colunas calculadas pelo RT divergem do cálculo em ${dif.length} ponto(s): ${dif.slice(0, 6).join('; ')}${dif.length > 6 ? '…' : ''}.`]);
    if (dif.arred.length) A.push(['warn', `Diferença de arredondamento em ${dif.arred.length} valor(es) do RT: ${dif.arred.slice(0, 6).join('; ')}${dif.arred.length > 6 ? '…' : ''}. Avalie se aceita; a minuta repete o quadro.`]);
    if (!dif.length && !dif.arred.length) A.push(['ok', 'Todas as colunas calculadas pelo RT nos Quadros I e II (e os totais) conferem com o cálculo.']);
  }
  const rt = parseBR(I.q3.v13rt);
  if (rt > 0) { const d = Math.abs(rt - R.Q3.v13); A.push(d < 1 ? ['ok', 'Custo global do RT confere com o cálculo do Quadro III.'] : ['err', `Custo global do RT (R$ ${fmt(rt)}) difere do calculado (R$ ${fmt(R.Q3.v13)}) em R$ ${fmt(d)}.`]); }
  return A;
}
  /* ---------- Leitura de matrícula (texto copiado do sistema, do PDF ou do OCR) ---------- */
  const MESES = {janeiro:1, fevereiro:2, 'março':3, marco:3, abril:4, maio:5, junho:6, julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12};
  const RX_DOC = /\b(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{14}|\d{11})\b/;
  const RX_ROTULO = /(^|\n)[\s\-–_=]*((R|AV|Av|av)\s*[-.]?\s*(\d+)\s*[-/]\s*(\d[\d.]*))\s*[.:–-]/g;
  const TRANSMISSAO = /COMPRA E VENDA|DOA[CÇ][AÃ]O|PERMUTA|ARREMATA[CÇ][AÃ]O|ADJUDICA[CÇ][AÃ]O|DA[CÇ][AÃ]O EM PAGAMENTO|USUCAPI[AÃ]O|INTEGRALIZA[CÇ][AÃ]O|PARTILHA|FORMAL DE PARTILHA|INVENT[AÁ]RIO|CONSOLIDA[CÇ][AÃ]O DA PROPRIEDADE|LEGITIMA[CÇ][AÃ]O FUNDI[AÁ]RIA|REURB|TRANSMISS[AÃ]O/;
  const ONUS = /HIPOTECA|ALIENA[CÇ][AÃ]O FIDUCI[AÁ]RIA|PENHORA|ARRESTO|SEQUESTRO|INDISPONIBILIDADE|CL[AÁ]USULA RESOLUTIVA|USUFRUTO|SERVID[AÃ]O|ARROLAMENTO|CAU[CÇ][AÃ]O|INALIENABILIDADE|IMPENHORABILIDADE|INCOMUNICABILIDADE|PROMESSA DE COMPRA|COMPROMISSO DE COMPRA|C[EÉ]DULA|DIREITO DE SUPERF[IÍ]CIE|AJUIZAMENTO DE A[CÇ][AÃ]O|EXISTÊNCIA DE A[CÇ][AÃ]O|LOCA[CÇ][AÃ]O/;
  const CANCELA = /CANCELAMENTO|BAIXA D|LEVANTAMENTO|EXTIN[CÇ][AÃ]O|LIBERA[CÇ][AÃ]O|QUITA[CÇ][AÃ]O|DESCONSTITUI/;
  const sp = s => String(s || '').replace(/\s+/g, ' ').trim();
  function dataExtenso(s){
    const m = String(s).match(/(\d{1,2})º?\s+de\s+([a-zçã]+)\s+de\s+(\d{4})/i); if (!m) return '';
    const mes = MESES[m[2].toLowerCase()]; return mes ? `${m[3]}-${String(mes).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : '';
  }
  function ultimaDataExtenso(s){ const all = String(s).match(/\d{1,2}º?\s+de\s+[a-zçã]+\s+de\s+\d{4}/gi) || []; return all.length ? dataExtenso(all[all.length - 1]) : ''; }
  function nomeEDoc(trecho){
    const t = sp(trecho), nome = sp(t.split(/,|\s+-\s+|\(/)[0]).replace(/^(a|o|os|as)\s+/i, '').replace(/[.;:]$/, '');
    const d = t.match(RX_DOC); return {nome, doc: d ? d[0] : ''};
  }
  function lerMatricula(texto){
    const T = String(texto || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ');
    const R = {numero:'', abertura:'', area:'', areaNum:0, imovel:'', confrontacoes:[], cep:'', cci:'', inscricao:'',
      proprietarioInicial:null, registroAnterior:'', atos:[], titular:null, onusAbertos:[], ultimoAto:'', alertas:[]};
    /* atos: rótulo no começo da linha (R-2-17.118. / Av-1-17.118.) */
    const pos = []; let m; RX_ROTULO.lastIndex = 0;
    while ((m = RX_ROTULO.exec(T))) pos.push({i:m.index + m[1].length, fim:RX_ROTULO.lastIndex, tipo:m[3].toUpperCase() === 'R' ? 'R' : 'AV', n:+m[4], mat:m[5].replace(/\.$/, '')});
    if (!pos.length) { /* texto sem quebras de linha (PDF/OCR): o rótulo precisa vir seguido de "Protocolo" ou da natureza em maiúsculas */
      const rx = /((R|AV|Av)\s*-\s*(\d+)\s*-\s*(\d[\d.]*\d))\s*[.:–-]\s*(?=Protocolo|PROTOCOLO|[A-ZÀ-Ü]{3,})/g;
      while ((m = rx.exec(T))) pos.push({i:m.index, fim:rx.lastIndex, tipo:m[2].toUpperCase() === 'R' ? 'R' : 'AV', n:+m[3], mat:m[4]});
    }
    const cabeca = pos.length ? T.slice(0, pos[0].i) : T;
    const nums = {}; pos.forEach(p => { nums[p.mat] = (nums[p.mat] || 0) + 1; });
    const mt = T.match(/MATR[IÍ]CULA\s*(?:N[º°O.]*\s*)?:?\s*(\d[\d.]*\d)/i);
    R.numero = Object.keys(nums).sort((a, b) => nums[b] - nums[a])[0] || (mt ? mt[1] : '');
    /* cabeça: imóvel, área, confrontações, proprietário, registro anterior */
    const ci = sp(cabeca);
    const im = ci.match(/IM[OÓ]VEL\s*:\s*(.+?)(?=\s*PROPRIET[AÁ]RI[OA]S?\s*:|$)/i); R.imovel = im ? sp(im[1]).replace(/[.;]$/, '') : '';
    const ar = ci.match(/[áa]rea(?:\s+total)?(?:\s+de)?\s+([\d.]+,\d{2,4})\s*(?:m²|m2|metros quadrados)/i); if (ar) { R.area = ar[1]; R.areaNum = parseBR(ar[1]); }
    const rxConf = /pel[oa]s?\s+(frente|fundos?|lado direito|lado esquerdo|lateral direita|lateral esquerda)\s*(?:,\s*)?com\s+(?:(?:os|as|o|a)\s+)?(.+?),?\s+(?:com|medindo|numa extens[aã]o de)\s+([\d.]+,\d{2})\s*(?:m\b|metros)/gi;
    let c; while ((c = rxConf.exec(R.imovel || ci))) R.confrontacoes.push({lado:c[1].toLowerCase().replace('lateral', 'lado'), com:sp(c[2]), med:c[3]});
    const pr = ci.match(/PROPRIET[AÁ]RI[OA]S?\s*:\s*(.+?)(?=\s*(?:DATA DE AQUISI|REGISTRO ANTERIOR|T[IÍ]TULO AQUISITIVO)|$)/i);
    if (pr) R.proprietarioInicial = Object.assign(nomeEDoc(pr[1]), {ato:'abertura'});
    const ra = ci.match(/REGISTRO ANTERIOR\s*:\s*(.+?)(?:\.\s*Dou f[ée]|$)/i); R.registroAnterior = ra ? sp(ra[1]) : '';
    R.abertura = ultimaDataExtenso(ci);
    if (R.proprietarioInicial) R.titular = Object.assign({}, R.proprietarioInicial);
    /* cada ato */
    pos.forEach((p, k) => {
      const corpo = sp(T.slice(p.fim, k + 1 < pos.length ? pos[k + 1].i : T.length)).replace(/^[-–_=\s]+|[-–_=\s]+$/g, '');
      const rot = (p.tipo === 'R' ? 'R' : 'Av') + '-' + p.n;
      const prot = corpo.match(/Protocolo\s*(?:n[º°o.]*\s*)?:?\s*([\d.]+\d)/i);
      const dp = corpo.match(/datad[oa] de (\d{2}\/\d{2}\/\d{4})/i);
      let nat = '';
      const nm = corpo.match(/(?:datad[oa] de \d{2}\/\d{2}\/\d{4}|Protocolo[^.]*?\d)\.\s*([A-ZÀ-Ü0-9][A-ZÀ-Ü0-9 ,\-\/ºª()]{3,}?)\s*[.:]/);
      if (nm) nat = sp(nm[1]); else { const f = corpo.match(/^([A-ZÀ-Ü][A-ZÀ-Ü ,\-\/ºª]{3,}?)\s*[.:]/); if (f) nat = sp(f[1]); }
      const ato = {rot, tipo:p.tipo, n:p.n, protocolo:prot ? prot[1] : '', dataProt:dp ? dp[1] : '', data:ultimaDataExtenso(corpo), natureza:nat, texto:corpo, cancelado:false, canceladoPor:''};
      const NAT = nat.toUpperCase();
      if (CANCELA.test(NAT)) {
        const refs = (corpo.match(/\b(?:R|AV|Av)\s*-\s*\d+\b(?!\s*-\s*\d)/g) || []).map(r => r.replace(/\s/g, '').toUpperCase());
        R.atos.forEach(a => { if (refs.includes(a.rot.toUpperCase()) && a.onus) { a.cancelado = true; a.canceladoPor = rot; } });
      } else if (ONUS.test(NAT)) ato.onus = true;
      if (p.tipo === 'R' && TRANSMISSAO.test(NAT)) {
        const ad = corpo.match(/(?:vend\w*|transmit\w*|do\w+|permut\w*|cede\w*|adjudic\w*|arremat\w*)[^:]{0,120}?(?:para|a favor de|em favor de|ao?s?)\s*:\s*(.+?)(?:,\s*pelo pre[cç]o|,\s*pelo valor|\.\s|$)/i)
          || corpo.match(/(?:ao comprador[a]?|à compradora|a compradora|ao adquirente|à adquirente)\s+(.+?)(?:,\s*pelo pre[cç]o|,\s*pelo valor|\.\s|$)/i)
          || corpo.match(/(?:adquirente|outorgad[oa] compradora?|comprador[a]?|donat[aá]ri[oa]|arrematante|adjudicat[aá]ri[oa])\s*:\s*(.+?)(?:\.\s|$)/i);
        if (ad) { R.titular = Object.assign(nomeEDoc(ad[1]), {ato:rot}); ato.adquirente = R.titular.nome; }
        else R.alertas.push(`${rot}: transmissão sem adquirente identificado — conferir o titular atual manualmente.`);
      }
      const novoNome = corpo.match(/passou a (?:assinar|se chamar|denominar-se)\s*:?\s*([A-ZÀ-Ü][A-ZÀ-Ü .'-]+[A-ZÀ-Ü])/);
      if (novoNome && R.titular) R.titular.nomeAtual = sp(novoNome[1]);
      const cep = corpo.match(/CEP\s*(?:n[º°o.]*\s*)?:?\s*(\d{2}\.?\d{3}-\d{3})/i); if (cep) R.cep = cep[1];
      const cci = corpo.match(/CCI\s*(?:n[º°o.]*\s*)?:?\s*(\d+)/i); if (cci) R.cci = cci[1];
      const ins = corpo.match(/inscri[cç][aã]o\s*(?:imobili[aá]ria\s*)?(?:n[º°o.]*\s*)?:?\s*([\d.]+[A-Z0-9.]*)/i); if (ins) R.inscricao = ins[1].replace(/\.$/, '');
      R.atos.push(ato);
    });
    if (!R.cep) { const cc = ci.match(/CEP\s*(?:n[º°o.]*\s*)?:?\s*(\d{2}\.?\d{3}-\d{3})/i); if (cc) R.cep = cc[1]; }
    R.onusAbertos = R.atos.filter(a => a.onus && !a.cancelado).map(a => ({rot:a.rot, natureza:a.natureza}));
    const ult = R.atos[R.atos.length - 1]; R.ultimoAto = ult ? ult.rot : ''; R.ultimoAtoCompleto = ult ? `${ult.rot}-${R.numero}` : '';
    if (!R.atos.length) R.alertas.push('Nenhum ato (R-/Av-) reconhecido: confira se o texto está completo.');
    if (!R.areaNum) R.alertas.push('Área do imóvel não reconhecida na abertura da matrícula.');
    if (R.titular && !R.titular.doc && R.titular.ato !== 'abertura') R.alertas.push('CPF/CNPJ do titular atual não reconhecido.');
    return R;
  }
  /* Compara a matrícula lida com a ficha: área, confrontações (por lado) e titular × partes do título */
  function cruzarMatricula(M, campos, partes){
    const out = [], dig = s => String(s || '').replace(/\D/g, '');
    const a = parseBR(campos.areaTerreno);
    if (M.areaNum && a) out.push(Math.abs(a - M.areaNum) < 0.005 ? ['ok', `Área do terreno igual à da matrícula (${fmt(M.areaNum)} m²).`] : ['err', `Área do terreno na ficha (${fmt(a)} m²) difere da matrícula (${fmt(M.areaNum)} m²).`]);
    const conf = String(campos.confrontacao || '').toLowerCase();
    if (M.confrontacoes.length && conf) {
      const faltam = M.confrontacoes.filter(c => !conf.includes(c.med) );
      out.push(faltam.length ? ['warn', `Medidas da matrícula não encontradas nas confrontações da ficha: ${faltam.map(c => c.lado + ' ' + c.med + ' m').join(', ')}.`] : ['ok', 'Medidas das confrontações da ficha conferem com a matrícula.']);
    }
    if (M.titular) {
      const ref = (partes || []).filter(p => /Transmitente|Incorporador|Propriet|Devedor/i.test(p.papel || ''));
      if (campos.incNome || campos.incCnpj) ref.push({papel:'Incorporador', nome:campos.incNome || '', doc:campos.incCnpj || ''});
      const docT = dig(M.titular.doc);
      if (!ref.length) out.push(['warn', `Titular atual: ${M.titular.nomeAtual || M.titular.nome}${M.titular.doc ? ' (' + M.titular.doc + ')' : ''} — lance o transmitente/incorporador nas Partes para conferir a continuidade.`]);
      else {
        const nz = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        const nomesT = [M.titular.nome, M.titular.nomeAtual].filter(Boolean).map(nz);
        const bate = ref.some(p => (docT && dig(p.doc) === docT) || nomesT.some(n => n && (nz(p.nome).includes(n) || n.includes(nz(p.nome)) && nz(p.nome).length > 8)));
        out.push(bate ? ['ok', `Continuidade: o titular atual (${M.titular.nomeAtual || M.titular.nome}, ${M.titular.ato}) é parte do título.`] : ['err', `Continuidade: o titular atual na matrícula é ${M.titular.nomeAtual || M.titular.nome}${M.titular.doc ? ' (' + M.titular.doc + ')' : ''}, que não aparece como transmitente/incorporador no título.`]);
      }
    }
    out.push(M.onusAbertos.length ? ['warn', `Ônus/restrições em aberto: ${M.onusAbertos.map(o => o.rot + ' ' + o.natureza).join('; ')}.`] : ['ok', 'Nenhum ônus ou restrição em aberto reconhecido (conferir também a CNIB).']);
    M.alertas.forEach(t => out.push(['warn', t]));
    return out;
  }
  /* ---------- Aprendizado: perfil do layout do documento e anonimização ---------- */
  /* "Impressão digital" do texto: que marcadores e formatos ele tem (sem guardar o conteúdo) */
  function perfilTexto(texto){
    const t = String(texto || ''), conta = rx => (t.match(rx.flags.includes('g') ? rx : new RegExp(rx.source, rx.flags + 'g')) || []).length;
    const linhas = t.split('\n').filter(l => l.trim()), letras = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length;
    return {
      caracteres:t.length, linhas:linhas.length, palavras:(t.match(/\S+/g) || []).length,
      maiusculasPct:letras ? Math.round((t.match(/[A-ZÀ-Ü]/g) || []).length / letras * 100) : 0,
      lixoOcrPct:t.length ? Math.round((t.match(/[^\wÀ-ÿ\s.,;:()\/ºª°§%$'"–\-]/g) || []).length / t.length * 1000) / 10 : 0,
      marcadores:{
        imovel:conta(/IM[OÓ]VEL\s*:/i), proprietario:conta(/PROPRIET[AÁ]RI[OA]S?\s*:/i), registroAnterior:conta(/REGISTRO ANTERIOR\s*:/i),
        dataAquisicao:conta(/DATA DE AQUISI/i), douFe:conta(/Dou f[ée]/i), selo:conta(/Selo (Eletr[oô]nico|Digital)/i), protocolo:conta(/Protocolo/i),
        transcricao:conta(/Transcri[cç][aã]o/i), emolumentos:conta(/Emolumentos/i), quadroNBR:conta(/QUADRO\s+I{1,3}V?\b|NBR\s*12\.?721/i),
        art:conta(/\bART\b|Anota[cç][aã]o de Responsabilidade/i), alvara:conta(/ALVAR[AÁ]/i), certidao:conta(/CERTID[AÃ]O|CERTIFICA/i), qrcode:conta(/QR\s?CODE|autenticidade/i)
      },
      rotulosAto:{
        'R-1-17.118':conta(/\b(?:R|AV|Av)-\d+-\d[\d.]*\d\b/g), 'R.1/17.118':conta(/\b(?:R|AV|Av)\.\d+\/\d[\d.]*\b/g),
        'R-01':conta(/\b(?:R|AV|Av)-0\d\b/g), 'R1':conta(/\b(?:R|AV)\d+\b/g), 'Registro nº':conta(/Registro\s+n[º°o]\s*\d/gi), 'Averbação nº':conta(/Averba[cç][aã]o\s+n[º°o]\s*\d/gi)
      },
      documentos:{cpf:conta(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g), cnpj:conta(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g), cgc:conta(/\bCGC\b/g), datasNum:conta(/\b\d{2}\/\d{2}\/\d{4}\b/g), datasExtenso:conta(/\d{1,2}º?\s+de\s+[a-zç]+\s+de\s+\d{4}/gi), areas:conta(/\d,\d{2}\s?m²|\d,\d{2}\s?m2/g)}
    };
  }
  /* Palavras que não são nome de pessoa: se uma sequência em maiúsculas tiver alguma delas, fica como está */
  const NAO_NOME = new Set(('IMÓVEL IMOVEL PROPRIETÁRIA PROPRIETÁRIO PROPRIETARIA PROPRIETARIO REGISTRO ANTERIOR DATA AQUISIÇÃO AQUISICAO COMPRA VENDA CLÁUSULA CLAUSULA RESOLUTIVA CANCELAMENTO ALTERAÇÃO ALTERACAO ESTADO CIVIL CÓDIGO CODIGO ' +
    'CASADA CASADO SOLTEIRA SOLTEIRO DIVORCIADA DIVORCIADO VIÚVA VIÚVO COMUNHÃO COMUNHAO PARCIAL UNIVERSAL SEPARAÇÃO BENS REGIME LEI ARTIGO ART DOU FÉ FE LIVRO FLS FOLHA MATRÍCULA MATRICULA PROTOCOLO SELO ELETRÔNICO FISCALIZAÇÃO ' +
    'ALIENAÇÃO ALIENACAO FIDUCIÁRIA FIDUCIARIA HIPOTECA PENHORA INDISPONIBILIDADE USUFRUTO DOAÇÃO DOACAO PERMUTA INCORPORAÇÃO INCORPORACAO CONSTRUÇÃO CONSTRUCAO AVERBAÇÃO AVERBACAO INSTITUIÇÃO CONDOMÍNIO CONDOMINIO ' +
    'ITBI DUAM CNH RG CPF CNPJ CGC SSP DETRAN DF GO RJ SP MG QUADRO NBR ABNT ART RRT CREA CAU ALVARÁ ALVARA CERTIDÃO CERTIDAO NEGATIVA POSITIVA PROGRAMA MINHA CASA VIDA PMCMV MCMV TOTAL ÁREA AREA UNIDADE UNIDADES APARTAMENTO ' +
    'PAVIMENTO TÉRREO TERREO SUPERIOR RESIDENCIAL LOTEAMENTO QUADRA LOTE RUA AVENIDA PARQUE JARDIM SETOR CENTRO CIDADE OCIDENTAL LUZIÂNIA GOIÁS BRASÍLIA ESTADO MUNICÍPIO PREFEITURA SECRETARIA OFICIAL REGISTRADOR TABELIÃO NOTAS ' +
    'ESCRITURA PÚBLICA PUBLICA CONTRATO PARTICULAR REQUERIMENTO DECLARAÇÃO DECLARACAO MEMORIAL DESCRITIVO CONVENÇÃO CONVENCAO MINUTA EXIGÊNCIA EXIGENCIA NOTA DEVOLUTIVA TRANSCRIÇÃO TRANSCRICAO EMOLUMENTOS FUNDOS ISSQN TAXA JUDICIÁRIA').split(' '));
  const RX_PJ = /\b(LTDA|S\.?\/?A\.?|EIRELI|EPP|ME|MEI|BANCO|CAIXA ECON[OÔ]MICA|COOPERATIVA|ASSOCIA[CÇ][AÃ]O|FUNDA[CÇ][AÃ]O|CONSTRUTORA|INCORPORADORA|EMPREENDIMENTOS|IM[OÓ]VEIS|ENGENHARIA)\b/i;
  /* Troca dados pessoais por marcadores estáveis: o mesmo nome vira sempre o mesmo [PF_n] no arquivo inteiro */
  function criarAnonimizador(nomesConhecidos){
    const mapa = new Map(), cont = {PF:0, PJ:0};
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
    const token = nome => { const k = norm(nome); if (!k) return ''; if (!mapa.has(k)) { const t = RX_PJ.test(nome) ? 'PJ' : 'PF'; mapa.set(k, `[${t}_${++cont[t]}]`); } return mapa.get(k); };
    const conhecidos = [...new Set((nomesConhecidos || []).map(s => String(s || '').trim()).filter(s => s.length >= 5))].sort((a, b) => b.length - a.length);
    conhecidos.forEach(token);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    function anon(texto){
      if (texto == null) return texto;
      let s = String(texto);
      conhecidos.forEach(n => { const rx = new RegExp(esc(n).replace(/\s+/g, '\\s+'), 'gi'); s = s.replace(rx, token(n)); });
      s = s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, m => m.replace(/\d/g, '#'))
        .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, m => m.replace(/\d/g, '#'))
        .replace(/((?:RG|R\.G\.|identidade|CNH|habilita[cç][aã]o)\s*(?:n[º°o.]*\s*)?:?\s*)([0-9][0-9.\-\/xX]{3,})/gi, (m, a, n) => a + n.replace(/\d/g, '#'))
        .replace(/\b\d{4,6}(?:\s\d{1,7}){4,}\b/g, m => m.replace(/\d/g, '#'))
        .replace(/\b\d{10,}\b/g, m => m.replace(/\d/g, '#'))
        .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
        .replace(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '[TELEFONE]');
      /* rede de segurança: sequências de 2+ palavras em MAIÚSCULAS (ou Iniciais Maiúsculas) que parecem nome */
      s = s.replace(/\b([A-ZÀ-Ü][A-ZÀ-Ü'´`-]{1,}(?:\s+(?:D[AEO]S?|E)\s+|\s+)){1,6}[A-ZÀ-Ü][A-ZÀ-Ü'´`-]{1,}\b/g, m => {
        const ws = m.split(/\s+/).filter(w => !/^(D[AEO]S?|E)$/.test(w));
        if (ws.length < 2 || ws.some(w => NAO_NOME.has(w) || NAO_NOME.has(norm(w)) || /\d/.test(w))) return m;
        return token(m);
      });
      s = s.replace(/\b([A-ZÀ-Ü][a-zà-ÿ]{2,}(?:\s+(?:d[aeo]s?|e)\s+|\s+)){1,5}[A-ZÀ-Ü][a-zà-ÿ]{2,}\b/g, m => {
        const ws = m.split(/\s+/).filter(w => !/^(d[aeo]s?|e)$/.test(w));
        if (ws.length < 2 || ws.some(w => NAO_NOME.has(norm(w)))) return m;
        return token(m);
      });
      return s;
    }
    return {anon, total:() => ({pessoas:cont.PF, empresas:cont.PJ})};
  }
  /* Anonimiza qualquer objeto (strings dentro de objetos/listas) */
  function anonimizarObjeto(obj, an){
    if (typeof obj === 'string') return an.anon(obj);
    if (Array.isArray(obj)) return obj.map(x => anonimizarObjeto(x, an));
    if (obj && typeof obj === 'object') { const o = {}; Object.keys(obj).forEach(k => { o[k] = anonimizarObjeto(obj[k], an); }); return o; }
    return obj;
  }
  /* ---------- Certidões: tipo, resultado, emissão e validade a partir do texto ---------- */
  /* Certidão: tipo, órgão, pessoa (nome e CPF/CNPJ), resultado, emissão e validade. Lê os formatos de TJGO (1º e 2º grau), TRF1, TJDFT,
   * SEFAZ-GO/DF, CNDT (TST), TRT, PGFN, protesto DF e Junta. O texto do OCR também serve. */
  const cpfFmt = d => d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  function lerCertidao(nome, texto){
    const bruto = String(texto || '').replace(/\s+/g, ' ');
    const t = (String(nome || '') + ' ' + bruto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
    let tipo = 'OUTRA', orgao = '';
    const goias = /tribunal de justica do estado de goias|tjgo|projudi/.test(t), grau = /segundo grau|\bssg\b/.test(t) ? '2º grau' : '1º grau';
    if (/tribunal regional federal|justica federal/.test(t)) { tipo = /criminal|criminais/.test(t) ? 'CRIMF' : 'CIVF'; orgao = /abrange a justica federal de 1/.test(t) ? 'Justiça Federal 1º grau (TRF1)' : /abrange o tribunal regional federal/.test(t) ? 'TRF1 (2º grau e turmas recursais)' : 'Justiça Federal (TRF1)'; }
    else if (/protesto/.test(t)) { tipo = /distrito federal|\bdf\b|brasilia/.test(t) ? 'PROTDF' : 'PROT'; orgao = tipo === 'PROTDF' ? 'Central de Protesto do DF' : 'Cartório de Protesto'; }
    else if (/tjdft|distrito federal e (?:dos )?territorios/.test(t)) { tipo = 'TJDFT'; orgao = 'TJDFT'; }
    else if (/nao gera os efeitos da certidao negativa|nao consta acao trabalhista/.test(t)) { tipo = 'TRT'; orgao = 'TRT 18ª Região' + (/na (1|2)[aªº] instancia/.test(t) ? ' · ' + t.match(/na (1|2)[aªº] instancia/)[1] + 'ª instância' : '') + ' (não é a CNDT)'; }
    else if (/trabalhist|cndt|justica do trabalho/.test(t)) { tipo = 'TRAB'; orgao = 'TST (CNDT)'; }
    else if (/receita federal|pgfn|tributos federais|divida ativa da uniao/.test(t)) { tipo = 'FED'; orgao = 'RFB/PGFN'; }
    else if (/sefaz.?df|governo do distrito federal/.test(t)) { tipo = 'SEFAZDF'; orgao = 'SEFAZ-DF'; }
    else if (/sefaz|secretaria (de estado )?da economia|fazenda estadual|estado de goias.{0,40}debito/.test(t)) { tipo = 'SEFAZ'; orgao = 'SEFAZ-GO'; }
    else if (/simplificada|junta comercial/.test(t)) { tipo = 'SIMPL'; orgao = 'Junta Comercial'; }
    else if (/municip|prefeitura/.test(t)) { tipo = 'MUN'; orgao = 'Município'; }
    else if (/criminal|criminais/.test(t)) { tipo = 'CRIM'; if (goias) orgao = 'TJGO ' + grau; }
    else if (/civel|civeis|distribuicao|distribuidor/.test(t)) { tipo = 'CIV'; if (goias) orgao = 'TJGO ' + grau; }
    else if (/onus|inteiro teor|situacao juridica/.test(t)) tipo = 'ONUS';
    const res = /positiva com efeitos? de negativa/.test(t) ? 'Positiva com efeito de negativa' : /\bpositiva\b|constam? (debitos|acoes|processos|titulos)/.test(t) && !/nao constam?|nada consta|negativa/.test(t) ? 'Positiva' : 'Negativa';
    /* pessoa: primeiro CPF/CNPJ válido do texto (tolera espaços do OCR) e o nome pelos modelos conhecidos */
    let doc = '', m; const docRe = /(\d{2}\.?\s?\d{3}\.?\s?\d{3}\s?\/\s?\d{4}\s?-\s?\d{2})|(\d{3}\.?\s?\d{3}\.?\s?\d{3}\s?-\s?\d{2})|\b(\d{14})\b|\b(\d{11})\b/g;
    while ((m = docRe.exec(bruto))) { const dg = m[0].replace(/\D/g, ''); if (dg.length === 14 && validCNPJ(dg)) { doc = cnpjFmt(dg); break; } if (dg.length === 11 && validCPF(dg)) { doc = cpfFmt(dg); break; } }
    const nm = (m = bruto.match(/Requerente\s*:\s*(.+?)\s+(?:Nome da M[aã]e|Data de Nascimento|CPF\s*:|CNPJ\s*:)/)) || (m = bruto.match(/contra:\s*(.+?)\s+(?:(?:OU|E)\s+)?(?:CPF|CNPJ)\b/)) || (m = bruto.match(/CPF\/CNPJ de:\s*(.+?)\s+\d{2,3}\./)) || (m = bruto.match(/\bNome:\s*(.+?)\s*(?:\(|CNPJ|CPF|Certid)/)) || (m = bruto.match(/em face de\s+(.+?),\s*inscrit/)) || (m = bruto.match(/rela[cç][aã]o ao nome de\s+(.+?)\s+CNP/));
    const pessoa = doc || nm ? {nome:nm ? nm[1].trim() : '', doc} : null;
    /* datas (a data de nascimento do requerente não conta) */
    const td = t.replace(/data de nascimento\s*:?\s*\d{1,2}\/\d{1,2}\/\d{4}/g, ' ');
    const iso = d => { const x = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return x ? dataISO(x[1], x[2], x[3]) : ''; };
    const ext = (d, mes, a) => { const n = MESES[String(mes).toLowerCase()]; return n ? dataISO(d, n, a) : ''; };
    let emissao = '';
    if ((m = td.match(/(?:emitid[ao]|expedid[ao]|gerad[ao])[^.]{0,70}?\b(?:em|no dia|dia)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/))) emissao = iso(m[1]);
    else if ((m = td.match(/(?:emitid[ao]|expedid[ao]|gerad[ao])[^.]{0,70}?\bem\s*(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/))) emissao = ext(m[1], m[2], m[3]);
    else if ((m = td.match(/publicad[ao] digitalmente em\s*(\d{1,2}\/\d{1,2}\/\d{4})/))) emissao = iso(m[1]);
    else if ((m = td.match(/expedicao:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/))) emissao = iso(m[1]);
    else if ((m = td.match(/local e data:[^,]*,\s*(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})/))) emissao = ext(m[1], m[2], m[3]);
    else if ((m = td.match(/,\s*(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})\s+\d{1,2}:\d{2}/))) emissao = ext(m[1], m[2], m[3]);
    else if ((m = td.match(/\bem\s*(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/))) emissao = ext(m[1], m[2], m[3]);
    else if ((m = td.match(/\d{1,2}\/\d{1,2}\/\d{4}/))) emissao = iso(m[0]);
    let validade = '';
    if ((m = td.match(/(?:valida ate|valido ate)\s*:?\s*(?:o dia\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/))) validade = iso(m[1]);
    else if ((m = td.match(/(?:valida ate|valido ate)\s*:?\s*(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/))) validade = ext(m[1], m[2], m[3]);
    else if ((m = td.match(/validade(?: ate)?\s*:?\s*(?:o dia\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/))) validade = iso(m[1]);
    const tv = td.replace(/autenticidade[^.]{0,160}/g, ' '), dm = tv.match(/(?:validade|valida|valido|prazo)[^.]{0,40}?\b(\d{1,3})\s*(?:\([a-z ]+\)\s*)?dias/);
    /* sem prazo no documento: 30 dias, como o cartório confere certidões judiciais, de protesto e a simplificada */
    const PADRAO30 = {CIV:1, CRIM:1, CIVF:1, CRIMF:1, TJDFT:1, PROT:1, PROTDF:1, SIMPL:1}, dias = dm ? +dm[1] : (PADRAO30[tipo] ? 30 : null);
    return {tipo, orgao, pessoa, res, emissao, validade:validade || (dias && emissao ? somarDias(emissao, dias) : ''), dias};
  }
  /* ---------- Quadros I e II da NBR 12721 a partir do PDF (posição das palavras) ----------
   * Os quadros trazem uma linha com os números das colunas (1..18 no QI e 19..38 no QII).
   * Cada valor é encaixado na coluna cujo número está mais perto na horizontal. */
  const RX_NUM = /^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:,\d+)?$/;
  function linhasDePalavras(words){
    const ws = (words || []).slice().sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2)), L = [];
    ws.forEach(w => { const cy = w.y + w.h / 2, l = L.find(x => Math.abs(x.cy - cy) < Math.max(w.h, x.h) * .45); if (l) { l.ws.push(w); l.cy = (l.cy * (l.ws.length - 1) + cy) / l.ws.length; } else L.push({cy, h:w.h, ws:[w]}); });
    L.forEach(l => l.ws.sort((a, b) => a.x - b.x));
    return L.sort((a, b) => a.cy - b.cy);
  }
  function cabecalhoColunas(linhas, de, ate){
    for (const l of linhas) {
      const nums = l.ws.filter(w => /^\d{1,2}$/.test(w.t)).map(w => ({n:+w.t, cx:w.x + w.w / 2}));
      const seq = nums.filter(c => c.n >= de && c.n <= ate);
      if (seq.length >= (ate - de + 1) * .8 && new Set(seq.map(c => c.n)).size === seq.length) return {cy:l.cy, cols:seq.sort((a, b) => a.cx - b.cx)};
    }
    return null;
  }
  function lerTabela(words, de, ate){
    const linhas = linhasDePalavras(words), cab = cabecalhoColunas(linhas, de, ate); if (!cab) return null;
    /* a 1ª coluna numerada (1 ou 19) é a do nome do pavimento/unidade: os valores começam na seguinte */
    const cols = cab.cols.filter(c => c.n !== de), passo = (cols[cols.length - 1].cx - cols[0].cx) / Math.max(1, cols.length - 1), limEsq = cols[0].cx - passo * .55, limDir = cols[cols.length - 1].cx + passo * .6;
    const out = [];
    for (const l of linhas) {
      if (l.cy <= cab.cy) continue;
      const rotulo = l.ws.filter(w => w.x + w.w / 2 < limEsq).map(w => w.t).join(' ').trim();
      const nums = l.ws.filter(w => w.x + w.w / 2 >= limEsq && RX_NUM.test(w.t));
      if (!rotulo && !nums.length) continue;
      const v = {}; let qtd = '';
      nums.forEach(w => { const cx = w.x + w.w / 2; if (cx > limDir) { qtd = w.t; return; } let best = cols[0]; cols.forEach(c => { if (Math.abs(c.cx - cx) < Math.abs(best.cx - cx)) best = c; }); if (Math.abs(best.cx - cx) <= passo * .6) v[best.n] = w.t; });
      out.push({rotulo, v, qtd, total:/^TOTA(L|IS)/i.test(rotulo)});
      if (/^TOTA(L|IS)/i.test(rotulo)) break;
    }
    return out;
  }
  /* paginas: [{words:[{t,x,y,w,h}], texto}] — devolve {q1, q2, avisos} prontos para o estado da incorporação */
  function lerQuadrosNBR(paginas){
    const avisos = [], Q1 = [], Q2 = [], tot = {};
    paginas.forEach((p, ip) => {
      const t1 = lerTabela(p.words, 1, 18), t2 = lerTabela(p.words, 19, 38);
      if (t1 && !t2) t1.forEach(r => { if (r.total) tot.q1 = r; else if (Object.keys(r.v).length) Q1.push(Object.assign(r, {pag:ip})); });
      if (t2) { let pav = ''; t2.forEach(r => { if (r.total) { tot.q2 = r; return; } if (!Object.keys(r.v).length) { if (r.rotulo) pav = r.rotulo; return; } Q2.push(Object.assign(r, {pav, pag:ip})); }); }
    });
    if (!Q1.length && !Q2.length) return {q1:[], q2:[], avisos:['Não encontrei os Quadros I e II neste documento (procurei a linha com os números das colunas 1–18 e 19–38).'], conferencia:[]};
    if (!Q1.length) avisos.push('Quadro I não encontrado: lance as áreas dos pavimentos à mão.');
    if (!Q2.length) avisos.push('Quadro II não encontrado: lance as áreas das unidades à mão.');
    const nz = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const q1 = Q1.map((r, i) => ({pav:i, nome:r.rotulo || `Pavimento ${i + 1}`, qtd:r.qtd || '1', v2:r.v[2] || '', v3:r.v[3] || '', v4:r.v[4] || '', v7:r.v[7] || '', v8:r.v[8] || '', v9:r.v[9] || '', v12:r.v[12] || '', v13:r.v[13] || '', v14:r.v[14] || '', lido:r.v}));
    const q2 = [];
    Q2.forEach(r => {
      let pav = q1.findIndex(x => nz(x.nome) && nz(r.pav) && (nz(x.nome).includes(nz(r.pav)) || nz(r.pav).includes(nz(x.nome))));
      if (pav < 0) pav = 0;
      const nome = r.rotulo.replace(/^(apt[oº°.]*|ap\.?|apartamento|unidade|unid\.?)\s*/i, '').trim() || r.rotulo;
      const n = Math.max(1, parseInt(r.qtd, 10) || 1);
      const base = {pav, bloco:'', pcd:false, comp:'', v20:r.v[20] || '', v21:r.v[21] || '', v22:r.v[22] || '', v25:r.v[25] || '', v26:r.v[26] || '', v27:r.v[27] || '', acess:'', fiRT:r.v[31] || '', lido:r.v};
      if (n > 1) avisos.push(`A linha "${r.rotulo}" representa ${n} unidades idênticas: criei ${n} linhas; ajuste os nomes.`);
      for (let k = 0; k < n; k++) q2.push(Object.assign({}, base, {nome:n > 1 ? `${nome} (${k + 1})` : nome}));
    });
    return {q1, q2, avisos, totais:tot};
  }
  /* compara as colunas calculadas que o RT escreveu com as calculadas aqui (depois de importar) */
  function conferirQuadrosLidos(R, totais){
    const dif = [], arred = [];
    const ver = (lido, calc, rot) => { const k = compararRT(lido, calc); if (!k || k.c === 'ok') return; (k.c === 'err' ? dif : arred).push(`${rot}: RT ${lido} × ${k.c === 'err' ? 'calculado' : 'correto'} ${k.correto}`); };
    R.q1.forEach(x => { const l = x.r.lido; if (!l) return; [5, 6, 10, 11, 15, 16, 17, 18].forEach(c => { if (l[c] != null) ver(l[c], x.c[c] || 0, `QI ${x.r.nome} col. ${c}`); }); });
    R.q2.forEach(x => { const l = x.r.lido; if (!l) return; [23, 24, 28, 29, 30, 32, 33, 34, 35, 36, 37, 38].forEach(c => { if (l[c] != null) ver(l[c], x.c[c] || 0, `QII ${unitShort(x.r)} col. ${c}`); }); });
    if (totais && totais.q1) [17, 18].forEach(c => { const t = totais.q1.v[c]; if (t != null) ver(t, R.T1[c], `Total QI col. ${c}`); });
    if (totais && totais.q2) [37, 38].forEach(c => { const t = totais.q2.v[c]; if (t != null) ver(t, R.T2[c], `Total QII col. ${c}`); });
    dif.arred = arred; return dif;
  }
  /* Quadro III: CUB, mês, padrão e custo global (texto da página) */
  /* composição das unidades no memorial / convenção: "Apartamento 101 será composto de …;" e
   * "Os apartamentos 101, 102 e 103 serão compostos de …". Devolve {nomeDaUnidade: {texto, trecho}} para as unidades pedidas. */
  function lerComposicoes(texto, nomes){
    const t = String(texto || '').replace(/-\s*\n\s*/g, '').replace(/\s+/g, ' '), out = {};
    const chave = n => { const d = String(n).replace(/^0+(?=\d)/, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return d; };
    const alvo = new Map((nomes || []).map(n => [chave(n), n]));
    const rx = /\b(?:ser[áa]o?|s[ãa]o|é|est[áa]o?|fica(?:r[áa]o?)?)?\s*(?:compost|constitu[íi]d|formad)[oa]s?\s+(?:de|por)\s*:?\s*/gi; let m;
    while ((m = rx.exec(t))) {
      const antes = t.slice(Math.max(0, m.index - 160), m.index);
      const u = antes.match(/(?:apartamentos?|aptos?\.?|aps?\.?|unidades?(?:\s+aut[ôo]nomas?)?|casas?|salas?|lojas?|sobrados?|kitnets?)\s+((?:n[º°o.]*\s*)?[\w-]{1,8}(?:\s*(?:,|\be\b|\ba\b|\bao\b|\/)\s*(?:n[º°o.]*\s*)?[\w-]{1,8})*)[^.;]{0,40}$/i);
      if (!u) continue;
      let ids = []; const L = u[1].replace(/n[º°o.]*\s*/gi, '');
      const faixa = L.match(/^(\d+)\s*(?:a|ao)\s*(\d+)$/i);
      if (faixa && +faixa[2] - +faixa[1] < 60) { for (let k = +faixa[1]; k <= +faixa[2]; k++) ids.push(String(k)); ids = ids.filter(i => alvo.has(chave(i))); }
      else ids = L.split(/\s*(?:,|\be\b|\/)\s*/i).map(x => x.trim()).filter(Boolean);
      const resto = t.slice(m.index + m[0].length), fim = resto.search(/;|\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])|\.\s*$|\s(?=(?:Pavimento|Apartamento|Unidade)\s+[\wº°]+\s*(?:ser[áa]|:))/);
      let comp = (fim < 0 ? resto.slice(0, 400) : resto.slice(0, fim)).trim().replace(/[.,:]$/, '');
      if (comp.length < 4 || comp.length > 600) continue;
      ids.forEach(id => { const k = chave(id); if (alvo.has(k) && !out[alvo.get(k)]) out[alvo.get(k)] = {texto:comp, trecho:(u[0] + m[0] + comp).slice(-700)}; });
    }
    return out;
  }
  /* composições iguais (ignorando espaços, caixa e pontuação final) para agrupar "Apartamentos 101 e 102 compostos de" */
  function chaveComposicao(c){ return String(c || '').normalize('NFC').replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '').toUpperCase(); }
  function lerQuadroIII(texto){
    const t = String(texto || '').replace(/\s+/g, ' '), o = {};
    const mes = t.match(/Custo Unit[aá]rio B[aá]sico para o M[eê]s de\s+([a-zç]+)\s+de\s+(\d{4})/i);
    if (mes) { const n = MESES[mes[1].toLowerCase()]; if (n) o.cubMes = `${mes[2]}-${String(n).padStart(2, '0')}`; }
    const cub = t.match(/M[eê]s de\s+[a-zç]+\s+de\s+\d{4}.{0,40}?(\d{1,3}(?:\.\d{3})*,\d{2})/i); if (cub) o.cub = cub[1];
    if (!o.cubMes || !o.cub) {
      const m2 = t.match(/Custo Unit[aá]rio B[aá]sico para o m[eê]s de:?\s*(?:([a-zç]+)\s+de\s+(\d{4})|([a-zç]{3})\s*\/\s*(\d{2,4})).{0,40}?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (m2) {
        const AB = {jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12};
        const n = m2[1] ? MESES[m2[1].toLowerCase()] : AB[m2[3].toLowerCase()], ano = m2[2] || (m2[4].length === 2 ? '20' + m2[4] : m2[4]);
        if (n && !o.cubMes) o.cubMes = ano + '-' + String(n).padStart(2, '0');
        if (!o.cub) o.cub = m2[5];
      }
    }
    const padH = t.match(/\bR\s?-?\s?(1|8|16)\s?-\s?(BAIXO|NORMAL|ALTO)\b/i);
    if (!o.padrao && padH) o.padrao = 'R' + padH[1] + '-' + padH[2][0].toUpperCase();
    const glob = t.match(/13\.?\s*Custo Global da Constru[cç][aã]o\s*R\$\s*([\d.]+,\d{2})/i); if (glob) o.v13rt = glob[1];
    const pad = t.match(/\b(R\s?-?\s?(?:1|8|16)\s?-?\s?[BNA]|PP\s?-?\s?4\s?-?\s?[BN]|PIS|RP1Q|CAL\s?-?\s?8\s?-?\s?[NA]|CSL\s?-?\s?(?:8|16)\s?-?\s?[NA]|GI)\b/i);
    const padTxt = t.match(/(Baixo|Normal|Alto)\s+(R-?\s?(?:1|8|16)|PP-?\s?4)/i);
    if (pad) o.padrao = pad[1].replace(/\s/g, '').toUpperCase(); else if (padTxt) o.padrao = padTxt[2].replace(/\s/g, '').toUpperCase() + '-' + padTxt[1][0].toUpperCase();
    if (o.padrao) o.padrao = o.padrao.replace(/^(R|PP|CAL|CSL)-?(\d+)-?/, '$1$2-').replace(/-$/, '');
    return o;
  }
  /* ---------- GED: texto ilegível, nome limpo e categoria sugerida (regras puras, com testes) ---------- */
  /* PDF cujo texto embutido é lixo (fonte sem mapeamento): caracteres de controle ou da área privada demais.
   * Nas 17 páginas ilegíveis reais o índice ficou entre 20% e 60%; nas legíveis (inclusive tabelas só de números) foi 0%. */
  function textoIlegivel(t){
    const s = String(t || '').replace(/\s+/g, ''), n = s.length;
    if (n < 40) return false;
    const ctrl = (s.match(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\ue000-\uf8ff\ufffd]/g) || []).length;
    return ctrl / n > 0.05;
  }
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  /* nome do arquivo para exibir: sem extensão, "_" viram espaço, escapes literais "u00C7" viram a letra */
  function nomeLimpo(nome){
    return String(nome || '').replace(/\.(pdf|jpe?g|png|webp|tiff?)$/i, '').replace(/u00([0-9a-f]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /* categoria pelo nome do arquivo; "_" e "-" contam como separador (antes \b falhava em "CNH_") */
  function categoriaPeloNome(nome){
    const s = semAcento(nomeLimpo(nome)).toLowerCase().replace(/[-.]+/g, ' ');
    /* como o cartório usa: alvará, ART/RRT, quadros da NBR, convenção e requerimento vão em Outros */
    const r = [[/matricula/, 'MATRICULA'], [/escritura/, 'ESCRITURA'], [/procura/, 'PROCURACAO'],
      [/certid|\bcnd|civel|criminal|protesto|sefaz|pgfn|trabalhista|simplificada|nada consta/, 'CERTIDAO'], [/contrato/, 'CONTRATO'],
      [/declara|pmcmv|fracoes? ideais?|fracao ideal|quota|carencia|vagas? de garagem/, 'DECLARACAO'],
      [/ato lavrado|traslado/, 'ATO_LAVRADO'], [/memorial/, 'MEMORIAL'], [/planta/, 'PLANTA_ENGENHARIA'], [/projeto/, 'PROJETO'],
      [/\brg\b|\bcnh\b|identidade|\bcpf\b/, 'DOCUMENTO_PESSOAL']];
    for (const [re, c] of r) if (re.test(s)) return c;
    return 'OUTROS';
  }
  /* categoria pelo texto do topo do documento (cada regra olha só uma janela do início: "matrícula nº 9.508" no meio de uma declaração não a torna matrícula) */
  function categoriaPeloTexto(txt){
    const t = semAcento(String(txt || '').slice(0, 700)).toUpperCase().replace(/\s+/g, ' ');
    if (!t.trim()) return null;
    /* a regra específica de declaração vem antes: ela cita "matrícula nº …" logo no começo */
    const r = [[/PMCMV|MINHA CASA MINHA VIDA|DISCRIMINACAO DAS FRACOES IDEAIS|FRACOES IDEAIS DE TERRENO/, 'DECLARACAO', 500],
      [/MATRICULA\s*(?:N[O.º°]*)?\s*\d[\d.]*|LIVRO\s*(?:N[O.º°]*\s*)?2\b.*REGISTRO GERAL|CERTIDAO DE INTEIRO TEOR/, 'MATRICULA', 160],
      [/ESCRITURA PUBLICA|ESCRITURA DE /, 'ESCRITURA'], [/PROCURACAO|SUBSTABELECIMENTO/, 'PROCURACAO'],
      [/ANOTACAO DE RESPONSABILIDADE TECNICA|REGISTRO DE RESPONSABILIDADE TECNICA|\bART\b N|ALVARA|REQUERIMENTO|CONVENCAO DE CONDOMINIO|MINUTA DA CONVENCAO|QUADRO I\b|NBR 12\.?721/, 'OUTROS'],
      [/MEMORIAL DESCRITIVO|MEMORIAL DE INCORPORACAO/, 'MEMORIAL'],
      [/CERTIDAO|CERTIFICA(?:MOS)? QUE|NADA CONSTA|CND\b|CPEN/, 'CERTIDAO'],
      [/CONTRATO|INSTRUMENTO PARTICULAR|ALTERACAO CONTRATUAL|CONSOLIDACAO/, 'CONTRATO'],
      [/DECLARACAO|DECLARA(?:MOS)? (?:PARA OS DEVIDOS FINS|QUE)/, 'DECLARACAO'],
      [/CARTEIRA NACIONAL DE HABILITACAO|CARTEIRA DE IDENTIDADE|REGISTRO GERAL\b(?!.*LIVRO)|DOCUMENTO DE IDENTIDADE/, 'DOCUMENTO_PESSOAL'],
      [/PROJETO ARQUITETONICO|PROJETO DE ARQUITETURA/, 'PROJETO'], [/PLANTA (?:BAIXA|DE SITUACAO|DE LOCACAO)/, 'PLANTA_ENGENHARIA'],
      [/TRASLADO|ATO LAVRADO/, 'ATO_LAVRADO']];
    for (const [re, c, j] of r) if (re.test(j ? t.slice(0, j) : t)) return c;
    return null;
  }
  /* ---------- Ficha da incorporação lida dos documentos (requerimento, alvará, ART): sugestões para o usuário conferir ---------- */
  const dataISO = (d, m, a) => a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  const brISO = x => { const m = String(x || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? dataISO(m[1], m[2], m[3]) : ''; };
  const cnpjFmt = d => d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  /* tira do começo do nome as palavras do cabeçalho ("... FUTURA MINUTA DE CONVENÇÃO NOME") */
  function nomeAposCabecalho(n){
    const w = String(n || '').trim().split(/\s+/); let ini = 0;
    w.forEach((x, i) => { if (/^(REGISTRO|INCORPORA[CÇ][AÃ]O|CONVEN[CÇ][AÃ]O|MINUTA|FUTURA|REQUERIMENTO|OFICIAL|CART[OÓ]RIO|REF\.?:?)$/i.test(x)) ini = i + 1; });
    return w.slice(ini).join(' ');
  }
  /* docs: [{id, nome, texto}] (texto de todas as páginas do documento). Devolve {campo: {valor, docId, busca, regra}} */
  function lerFichaDocs(docs){
    const T = x => String(x || '').replace(/\s+/g, ' ').trim(), cand = {};
    const add = (k, valor, prio, d, busca, regra) => { valor = T(valor); if (valor) (cand[k] = cand[k] || []).push({prio, valor, docId:d.id, busca:T(busca) || valor, regra}); };
    for (const d of docs) {
      const t = T(d.texto); if (!t) continue;
      const up = semAcento(t).toUpperCase(), topo = up.slice(0, 700);
      const alvara = /ALVARA DE CONSTRUCAO\s*N/.test(topo);
      const art = !alvara && /RESPONSABILIDADE TECNICA/.test(topo) && /\bART\b|\bRRT\b/.test(topo);
      const req = !alvara && !art && /REGISTRO DE INCORPORACAO/.test(topo) && /REQUER/.test(up) && !/PATRIMONIO DE AFETACAO/.test(topo);
      let m;
      if (req) {
        if ((m = t.match(/CNPJ[^\d]{0,12}(\d{2}\.?\d{3}\.?\d{3}\s?\/\s?\d{4}\s?-\s?\d{2})/i)) && validCNPJ(m[1].replace(/\D/g, ''))) add('incCnpj', cnpjFmt(m[1].replace(/\D/g, '')), 1, d, m[1], 'requerimento.cnpj');
        if ((m = t.match(/([A-ZÀ-Ú][A-ZÀ-Ú0-9 .&'\-]{3,110}?)\s*,?\s*CNPJ/))) add('incNome', nomeAposCabecalho(m[1]), 1, d, nomeAposCabecalho(m[1]), 'requerimento.nome');
        else if ((m = t.match(/([A-ZÀ-Ú][A-ZÀ-Ú0-9 .&'\-]{3,110}?)\s+com sede\b/))) add('incNome', nomeAposCabecalho(m[1]), 1, d, nomeAposCabecalho(m[1]), 'requerimento.nome');
        if ((m = t.match(/com sede\s+(?:e foro\s+)?(?:na|no|em|à|a|nesta)\s+(.{8,160}?)(?=\s*,?\s*(?:neste ato|atrav[eé]s de|inscrit[ao]|representad[ao]|por seu|CNPJ|doravante|brasileir))/i))) add('incSede', m[1].replace(/[,\s]+$/, ''), 1, d, m[1], 'requerimento.sede');
        if ((m = t.match(/(?:denomina[cç][aã]o de|denominad[oa])\s*[“"]\s*([^”"]{3,100}?)\s*[”"]/i))) add('empNome', m[1], 1, d, m[1], 'requerimento.empreendimento');
        else if ((m = t.match(/incorporador[ao]?\s+d[oa]\s+(.{4,100}?)\s*,?\s+que\s+(?:ser[aá]|est[aá]|foi)/i))) add('empNome', m[1], 2, d, m[1], 'requerimento.empreendimento');
        if ((m = t.match(/R\$\s*([\d.]+,\d{2})\s*\([^)]*\)\s*,?\s*custo global/i)) || (m = t.match(/valor de\s+R\$\s*([\d.]+,\d{2})/i))) add('empValor', m[1], 1, d, 'R$ ' + m[1], 'requerimento.valor');
        const dt = ultimaDataExtenso(t); if (dt) add('reqData', dt, 1, d, '', 'requerimento.data');
      }
      if (alvara) {
        if ((m = t.match(/ALVAR[AÁ] DE CONSTRU[CÇ][AÃ]O\s*N[º°o.]*\s*(\d+\s*\/\s*\d{4})/i))) add('alvaraNum', m[1].replace(/\s/g, ''), 1, d, m[1], 'alvara.numero');
        if ((m = t.match(/projeto\s+aprovado\s+em\s+(\d{1,2}\/\d{1,2}\/\d{4})/i))) add('aprovData', brISO(m[1]), 1, d, m[1], 'alvara.aprovacao');
        const dt = ultimaDataExtenso(t) || ((m = t.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/)) ? brISO(m[1]) : '');
        if (dt) add('alvaraData', dt, 1, d, '', 'alvara.data');
        if ((m = t.match(/[ÁA]rea total da obra:\s*([\d.]+,\d{2})\s*m/i))) add('alvaraArea', m[1], 1, d, m[1], 'alvara.area');
        if ((m = t.match(/RESPONS[AÁ]VEL T[EÉ]CNICO:\s*NOME:\s*(.+?)\s+(?:CREA|CAU)\b/i))) add('rtNome', m[1], 1, d, m[1], 'alvara.responsavel');
        if ((m = t.match(/RESPONS[AÁ]VEL T[EÉ]CNICO:\s*NOME:.+?(?:CREA|CAU)\s*\(\s*(?:CAU|CREA)\s*\)\s*n[º°o.]*:?\s*([A-Z0-9][A-Z0-9\/\-]*?)\s*\/\s*ART/i))) { add('rtRegistro', m[1], 2, d, m[1], 'alvara.registro'); if (/\d\/?D-[A-Z]{2}$/i.test(m[1])) add('rtConselho', 'CREA', 3, d, m[1], 'alvara.conselho'); }
        if ((m = t.match(/ART\s*\(RRT\)\s*OBRA:\s*([A-Z0-9][A-Z0-9.\/\-]{5,})/i))) add('rtArt', m[1], 1, d, m[1], 'alvara.art');
        if ((m = t.match(/PROPRIET[AÁ]RIO:\s*NOME:\s*(.+?)\s+CPF\/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i))) { add('incNome', m[1], 2, d, m[1], 'alvara.proprietario'); add('incCnpj', m[2], 2, d, m[2], 'alvara.proprietario'); }
      }
      if (art) {
        if ((m = t.match(/Registrad[ao]\s*em[\s\S]{0,200}?(\d{2}\/\d{2}\/\d{4})/i))) add('rtArtData', brISO(m[1]), 1, d, m[1], 'art.registro');
        if (/CONSELHO REGIONAL DE ENGENHARIA|\bCREA\b/.test(up)) add('rtConselho', 'CREA', 1, d, 'CREA', 'art.conselho');
        else if (/ARQUITETURA E URBANISMO|\bCAU\b/.test(up)) add('rtConselho', 'CAU', 1, d, 'CAU', 'art.conselho');
        if ((m = t.match(/T[ií]tulo profissional:[\s\S]{0,80}?Registro:\s*([A-Z0-9][A-Z0-9\/\-]+)/i))) add('rtRegistro', m[1], 1, d, m[1], 'art.registro');
        if ((m = t.match(/\b(10\d{11})\b/))) add('rtArt', m[1], 3, d, m[1], 'art.numero');
      }
    }
    const out = {};
    for (const k of Object.keys(cand)) { const c = cand[k].slice().sort((a, b) => a.prio - b.prio)[0]; out[k] = {valor:c.valor, docId:c.docId, busca:c.busca, regra:c.regra}; }
    return out;
  }
  /* ---------- Ordem dos documentos pela lista do cartório (incorporação) ---------- */
  /* devolve [posição, desempate]: requerimento, PMCMV, ART, alvará, declarações, certidões (CNDT, SEFAZ, cível, criminal, protesto, simplificada),
   * contrato social, documentos pessoais, memorial, quadros, minuta, projeto, requerimento de patrimônio, termo de adesão */
  function ordemDoc(nome, texto, cat){
    const n = semAcento(nomeLimpo(nome)).toLowerCase().replace(/[-.]+/g, ' '), topo = semAcento(String(texto || '').slice(0, 300)).toLowerCase();
    const a = n + ' ' + topo;
    if (cat === 'MATRICULA') return [0, 0];
    if (cat === 'CERTIDAO') {
      const L = lerCertidao(nome, texto), R = {TRAB:60, TRT:62, SEFAZ:70, SEFAZDF:71, FED:72, MUN:73, CIV:80, CIVF:81, TJDFT:85, CRIM:90, CRIMF:91, PROT:100, PROTDF:101, SIMPL:110, ONUS:115, OUTRA:119};
      const sub = ({'TJGO 1º grau':1, 'TJGO 2º grau':2})[L.orgao] || (L.orgao ? 3 : 4), pj = L.pessoa && L.pessoa.doc.length === 14 ? 1 : 0;
      return [R[L.tipo] || 119, sub * 10 + pj];
    }
    if (/patrimonio|afetacao/.test(n) && /requerimento/.test(n)) return [180, 0];
    if (/termo/.test(n) && /adesao/.test(n)) return [190, 0];
    if (/pmcmv|minha casa/.test(n)) return [20, 0];
    if (/requerimento/.test(n)) return [10, 0];
    if (/\bart\b|\brrt\b|responsabilidade tecnica/.test(n)) return [30, 0];
    if (/alvara/.test(n)) return [40, 0];
    if (/carencia/.test(n)) return [51, 0];
    if (/quota/.test(n)) return [52, 0];
    if (/fracoes? ideais?|fracao ideal|discriminacao/.test(n)) return [53, 0];
    if (/vagas? de garagem/.test(n)) return [54, 0];
    if (cat === 'DECLARACAO') return [55, 0];
    if (cat === 'CONTRATO') return [120, 0];
    if (/\bcnpj\b/.test(n)) return [125, 0];
    if (cat === 'DOCUMENTO_PESSOAL') return [130, 0];
    if (cat === 'MEMORIAL') return [140, 0];
    if (/quadro|nbr/.test(n)) return [150, 0];
    if (/convencao|minuta/.test(n)) return [160, 0];
    if (cat === 'PROJETO' || cat === 'PLANTA_ENGENHARIA') return [170, 0];
    if (/\bart\b|responsabilidade tecnica/.test(a)) return [30, 1];
    if (/alvara de construcao/.test(a)) return [40, 1];
    return [500, 0];
  }
  /* ---------- Documentos exigidos na incorporação (a lista do cartório) conferidos contra o que está no GED ---------- */
  /* docs: [{id, nome, categoria, texto}]; ctx: {incCnpj, incSede, ref}. Devolve {linhas, extras, resumo}.
   * Cada linha: {id, grupo, rotulo, status:'ok'|'falta'|'vencida', docIds, obs, texto, fund} (texto = o que vai na exigência). */
  function exigidosIncorporacao(docs, ctx){
    ctx = ctx || {};
    const ref = ctx.ref || '', cnpj = String(ctx.incCnpj || '').replace(/\D/g, '');
    const uf = ((String(ctx.incSede || '').match(/[-\/\s,]([A-Za-z]{2})\.?\s*$/) || [])[1] || '').toUpperCase();
    const lista = (docs || []).map(d => ({d, rank:ordemDoc(d.nome, d.texto, d.categoria)[0], cert:d.categoria === 'CERTIDAO' ? lerCertidao(d.nome, d.texto) : null}));
    const daInc = x => !cnpj || !x.cert.pessoa || !x.cert.pessoa.doc || x.cert.pessoa.doc.replace(/\D/g, '') === cnpj;
    const usados = new Set(), linhas = [];
    const br = iso => { const m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
    const fundB = 'art. 32, alínea "b", da Lei 4.591/64';
    const add = (id, grupo, rotulo, achados, texto, fund) => {
      let status = achados.length ? 'ok' : 'falta', obs = '';
      if (achados.length) achados.forEach(x => usados.add(x.d.id));
      const cert = achados.filter(x => x.cert).sort((a, b) => String(b.cert.emissao).localeCompare(String(a.cert.emissao)))[0];
      if (cert) {
        const v = cert.cert.validade;
        if (!v) obs = 'sem validade informada';
        else if (ref && v < ref) { status = 'vencida'; obs = 'venceu em ' + br(v); }
        else obs = 'válida até ' + br(v);
      }
      linhas.push({id, grupo, rotulo, status, docIds:achados.map(x => x.d.id), obs, texto, fund:fund || ''});
    };
    const porRank = r => lista.filter(x => !x.cert && x.rank === r);
    const porCert = (...t) => lista.filter(x => x.cert && t.includes(x.cert.tipo) && daInc(x));
    const G1 = 'Requerimento, ART, alvará e declarações', G2 = 'Certidões da incorporadora', G3 = 'Empresa e representante', G4 = 'Projeto, memorial e instituição';
    add('req', G1, 'Requerimento de registro de incorporação', porRank(10), 'do requerimento de registro de incorporação');
    add('pmcmv', G1, 'Declaração PMCMV', porRank(20), 'da declaração relativa ao Programa Minha Casa Minha Vida (PMCMV)');
    add('art', G1, 'ART ou RRT', porRank(30), 'da ART ou RRT do projeto e da obra');
    add('alvara', G1, 'Alvará de construção', porRank(40), 'do alvará de construção');
    add('carencia', G1, 'Declaração de prazo de carência', porRank(51), 'da declaração de prazo de carência', 'art. 32, alínea "n", da Lei 4.591/64');
    add('quota', G1, 'Declaração de quota-parte entregue em pagamento do terreno', porRank(52), 'da declaração de quota-parte do empreendimento a ser entregue em pagamento do terreno');
    add('fracao', G1, 'Declaração de fração ideal', porRank(53), 'da declaração de discriminação das frações ideais do terreno', 'art. 32, alínea "i", da Lei 4.591/64');
    add('vagas', G1, 'Declaração de vagas de garagem', porRank(54), 'da declaração de vagas de garagem');
    add('cndt', G2, 'CNDT (trabalhista)', porCert('TRAB'), 'da Certidão Negativa de Débitos Trabalhistas (CNDT) em nome da incorporadora', fundB);
    add('sefaz', G2, 'Certidão estadual (SEFAZ-GO)', porCert('SEFAZ'), 'da certidão negativa de débitos estaduais (SEFAZ-GO) em nome da incorporadora', fundB);
    add('civel', G2, 'Certidão cível (TJGO)', porCert('CIV'), 'da certidão de ações cíveis do Tribunal de Justiça do Estado de Goiás em nome da incorporadora', fundB);
    add('criminal', G2, 'Certidão criminal (TJGO)', porCert('CRIM'), 'da certidão de ações criminais do Tribunal de Justiça do Estado de Goiás em nome da incorporadora', fundB);
    if (uf === 'DF') {
      add('tjdft', G2, 'Certidão do TJDFT (sede no Distrito Federal)', porCert('TJDFT'), 'da certidão de distribuição do Tribunal de Justiça do Distrito Federal e Territórios em nome da incorporadora', fundB);
      add('protdf', G2, 'Certidão de protesto da sede (DF)', porCert('PROTDF'), 'da certidão de protesto da sede da incorporadora, emitida pela Central de Certidões de Protesto do Distrito Federal', fundB);
    }
    add('prot', G2, uf === 'DF' ? 'Certidão de protesto do município (desta comarca)' : 'Certidão de protesto (desta comarca)', porCert('PROT'),
      'da Certidão de protesto emitida pelo cartório de protesto desta comarca, sendo aceita a original ou eletrônica passível de validação junto ao site https://validar.iti.gov.br/', fundB);
    add('simpl', G2, 'Certidão simplificada (Junta Comercial)', porCert('SIMPL'), 'da Certidão Simplificada da Junta Comercial em nome da incorporadora, emitida nos últimos 30 dias');
    add('contrato', G3, 'Contrato social', lista.filter(x => !x.cert && x.rank === 120), 'do contrato social e suas alterações');
    add('pessoais', G3, 'Documentos pessoais do representante', porRank(130), 'dos documentos pessoais do representante da incorporadora');
    add('memorial', G4, 'Memorial descritivo', porRank(140), 'do memorial descritivo', 'art. 32, alínea "g", da Lei 4.591/64');
    add('quadros', G4, 'Quadros da NBR 12.721', porRank(150), 'dos Quadros da NBR 12.721', 'art. 32, alíneas "e" e "h", da Lei 4.591/64 e NBR 12.721');
    add('minuta', G4, 'Minuta da futura convenção de condomínio', porRank(160), 'da minuta da futura Convenção de Condomínio', 'art. 32, alínea "j", da Lei 4.591/64');
    add('projeto', G4, 'Projeto arquitetônico', porRank(170), 'do projeto arquitetônico aprovado', 'art. 32, alínea "d", da Lei 4.591/64');
    add('patrimonio', G4, 'Requerimento de patrimônio de afetação', porRank(180), 'do requerimento de constituição do patrimônio de afetação');
    add('termo', G4, 'Termo de adesão ao patrimônio de afetação', porRank(190), 'do termo de adesão ao patrimônio de afetação');
    const extras = lista.filter(x => x.d.categoria !== 'MATRICULA' && !usados.has(x.d.id))
      .map(x => ({id:x.d.id, nome:x.d.nome, rotulo:x.cert ? (x.cert.orgao || x.cert.tipo) + (x.cert.pessoa && x.cert.pessoa.nome ? ' · ' + x.cert.pessoa.nome : '') : ''}));
    const n = s => linhas.filter(l => l.status === s).length;
    return {linhas, extras, resumo:{total:linhas.length, ok:n('ok'), falta:n('falta'), vencida:n('vencida')}};
  }
  /* ---------- Painel de validação: onde validar cada documento e o código já lido dele ---------- */
  /* URLs do texto; reconstrói a que foi quebrada por espaço no fim da linha ("…/documento- eletronico/abc") */
  function urlsDoTexto(txt){
    const toks = String(txt || '').split(/\s+/), out = [];
    for (let i = 0; i < toks.length; i++) {
      if (!/^<?https?:\/\//i.test(toks[i])) continue;
      let u = toks[i].replace(/^</, '').replace(/[>.,;)]+$/, '');
      if (/[-\/]$/.test(toks[i]) && toks[i + 1] && /^[A-Za-z0-9\/._-]+$/.test(toks[i + 1])) u = toks[i] + toks[i + 1].replace(/[>.,;)]+$/, '');
      out.push(u);
    }
    return out;
  }
  /* docs: [{id, nome, categoria, texto}]; ctx: {rtArt}. Devolve [{docId, itens:[{id, site, url, codigo, aviso}]}] */
  function validacoesDocs(docs, ctx){
    ctx = ctx || {};
    const out = [];
    for (const d of docs || []) {
      const t = String(d.texto || '').replace(/\s+/g, ' '), itens = [], urls = urlsDoTexto(t);
      const add = (id, site, url, codigo, aviso) => { if (url || codigo) itens.push({id, site, url:url || '', codigo:codigo || '', aviso:aviso || ''}); };
      const g = re => { const m = t.match(re); return m ? m[1] : ''; };
      const uDe = re => urls.find(u => re.test(u)) || '';
      if (d.categoria === 'MATRICULA') {
        const onr = uDe(/onr\.org\.br/i);
        add('onr', 'ONR (assinador web)', onr, onr ? onr.replace(/\/+$/, '').split('/').pop() : '');
        add('selo-tjgo', 'TJGO (selo eletrônico)', 'https://see.tjgo.jus.br/', g(/Selo (?:Digital|Eletr[ôo]nico[^:]{0,20}):?\s*(\d{15,})/i), 'em "Verificar selo"');
      } else if (d.categoria === 'CERTIDAO') {
        const L = lerCertidao(d.nome, t);
        if (L.tipo === 'SEFAZ') add('sefaz', 'SEFAZ-GO (validar certidão)', 'https://www.sefaz.go.gov.br/Certidao/Validacao/default.asp', g(/NR\.? CERTID[ÃA]O:?\s*N?[º°o.]*\s*(\d{5,})/i));
        else if (L.tipo === 'SEFAZDF') add('sefazdf', 'Receita do DF', uDe(/receita\.fazenda\.df/i), g(/CERTID[ÃA]O N[º°o.]*:?\s*(\d{8,})/i));
        else if (L.tipo === 'TRAB') add('cndt', 'TST (CNDT)', 'https://cndt-certidao.tst.jus.br/', g(/Certid[ãa]o n[º°o.]*:?\s*([\d\/]+)/i), 'em "Validar certidão"');
        else if (L.tipo === 'FED') add('fed', 'RFB/PGFN', uDe(/pgfn/i) || uDe(/rfb/i), g(/C[óo]digo de controle da certid[ãa]o:?\s*([A-Z0-9.]+)/i));
        else if (L.tipo === 'SIMPL') add('junta', 'Junta Comercial do DF (validação visual)', 'https://portalservicos.jucis.df.gov.br/certidaoweb/validacaoPorVisualizacao.seam', g(/digite o n[º°o.]*\s*([A-Z]\d{9,})/i));
        else if (L.tipo === 'TJDFT') add('tjdft', 'TJDFT (Nada Consta)', 'https://cnc.tjdft.jus.br/', g(/Selo digital de seguran[çc]a:\s*([\w.]*\d[\w.]*)/i), 'em "Validar certidão"');
        else if (L.tipo === 'PROTDF') {
          add('protdf', 'Central de Protesto do DF', uDe(/cartoriosdeprotestodf/i) || 'https://cartoriosdeprotestodf.com.br', g(/C[óo]digo de autentica[çc][ãa]o:?\s*([A-Z0-9-]+)/i));
          add('selo-tjdft', 'Selo TJDFT (SIEX)', 'https://siex.tjdft.jus.br/siex/siexnet?visaoId=tjdf.siex.cadastro.consulta.apresentacao.VisaoConsultaPorCodigoNaInternet', g(/Selo Digital:?\s*(TJDFT\w+)/i), 'tem CAPTCHA');
        } else if ((L.tipo === 'CIV' || L.tipo === 'CRIM') && /^TJGO/.test(L.orgao)) add('tjgo', 'TJGO (Projudi)', 'https://projudi.tjgo.jus.br/CertidaoPublica', g(/(?:Localizar pelo c[óo]digo|C[ÓO]DIGO DE AUTENTICA[ÇC][ÃA]O)\s*:?\s*(\d{8,})/i));
        else if (L.tipo === 'CIVF' || L.tipo === 'CRIMF') add('trf1', 'Justiça Federal (TRF1)', uDe(/trf1/i), g(/c[óo]digo de valida[çc][ãa]o[^A-Z0-9]{0,40}([A-Z0-9]{8,})/i));
      } else if (d.categoria !== 'DOCUMENTO_PESSOAL') {
        const r = ordemDoc(d.nome, t, d.categoria)[0];
        if (r === 30) add('art', 'CREA-GO (autenticidade da ART)', 'https://www3.crea-go.org.br/art1025/site/autenticidade_art.php', ctx.rtArt || g(/\b(10\d{11})\b/));
        else if (r === 40) add('alvara', 'Prefeitura (validação do alvará)', uDe(/valid/i), '');
      }
      if (itens.length) out.push({docId:d.id, itens});
    }
    return out;
  }
  return {VERSAO:'1.5.7', validacoesDocs:validacoesDocs, urlsDoTexto:urlsDoTexto, exigidosIncorporacao:exigidosIncorporacao, ordemDoc:ordemDoc, lerFichaDocs:lerFichaDocs, textoIlegivel:textoIlegivel, nomeLimpo:nomeLimpo, categoriaPeloNome:categoriaPeloNome, categoriaPeloTexto:categoriaPeloTexto, onlyDigits:onlyDigits, todayISO:todayISO, parseBR:parseBR, fmt:fmt, fmtDate:fmtDate, brToISO:brToISO, joinE:joinE, extenso:extenso, validCPF:validCPF, validCNPJ:validCNPJ, unitShort:unitShort, fiOf:fiOf, compararRT:compararRT, somarDias:somarDias, calcInc:calcInc, auditoria:auditoria, lerMatricula:lerMatricula, cruzarMatricula:cruzarMatricula, perfilTexto:perfilTexto, lerQuadrosNBR:lerQuadrosNBR, conferirQuadrosLidos:conferirQuadrosLidos, lerQuadroIII:lerQuadroIII, lerComposicoes:lerComposicoes, chaveComposicao:chaveComposicao, lerCertidao:lerCertidao, linhasDePalavras:linhasDePalavras, criarAnonimizador:criarAnonimizador, anonimizarObjeto:anonimizarObjeto};
})();
if (typeof module !== 'undefined') module.exports = Motor;
