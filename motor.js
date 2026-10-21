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
    const ult = R.atos[R.atos.length - 1]; R.ultimoAto = ult ? `${ult.rot}-${R.numero}` : '';
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
      const docT = dig(M.titular.doc);
      if (!ref.length) out.push(['warn', `Titular atual: ${M.titular.nomeAtual || M.titular.nome}${M.titular.doc ? ' (' + M.titular.doc + ')' : ''} — lance o transmitente/incorporador nas Partes para conferir a continuidade.`]);
      else {
        const bate = ref.some(p => (docT && dig(p.doc) === docT) || (!docT && String(p.nome || '').toUpperCase().includes(String(M.titular.nome).toUpperCase())));
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
  return {VERSAO:'1.2.0', onlyDigits:onlyDigits, todayISO:todayISO, parseBR:parseBR, fmt:fmt, fmtDate:fmtDate, brToISO:brToISO, joinE:joinE, extenso:extenso, validCPF:validCPF, validCNPJ:validCNPJ, unitShort:unitShort, fiOf:fiOf, calcInc:calcInc, auditoria:auditoria, lerMatricula:lerMatricula, cruzarMatricula:cruzarMatricula, perfilTexto:perfilTexto, criarAnonimizador:criarAnonimizador, anonimizarObjeto:anonimizarObjeto};
})();
if (typeof module !== 'undefined') module.exports = Motor;
