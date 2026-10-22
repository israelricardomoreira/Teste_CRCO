/* Qualificador CRCO — js/conferencia.js: etapa 2 · conferência. Documento grande com ferramentas (js/leitor.js),
 * ficha ao lado (ou embaixo, em tela em pé) e opção de abrir o documento numa janela separada. */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/conferencia.js'] = '1.5.0';

const CV = {docId:'', i:0};                 /* página aberta na Conferência (compartilhada com a janela separada) */
const CMP = {docId:'', i:0};                /* página do "Comparar" */
const JAN = {win:null, L:null, extras:[]};  /* janela que acompanha a ficha + janelas independentes */
let activeEl = null, LP = null, LC = null;  /* leitor principal e de comparação */

/* ---------- funções que o leitor usa (nas duas janelas) ---------- */
function pagesDoDoc(docId){ if (docId === '__soltas') return S.pages.filter(p => !p.grouped); const d = S.docs.find(x => x.id === docId); return d ? d.pageIds.map(pageById).filter(Boolean) : []; }
function confPages(){ return pagesDoDoc(CV.docId); }
function docOpcoes(){
  const o = S.docs.map(d => ({id:d.id, rotulo:`${String(d.order).padStart(2, '0')} · ${catNome(d.category)} · ${d.name}`}));
  if (S.pages.some(p => !p.grouped)) o.push({id:'__soltas', rotulo:'Páginas não agrupadas'});
  return o;
}
function chaveDe(p){ return p.chave || (p.name + '#' + (p.pageNum || 1)); }
function anotDe(p){ if (!S.anot) S.anot = {}; const k = chaveDe(p); if (!S.anot[k]) S.anot[k] = {itens:[], conferida:false}; return S.anot[k]; }
function paginaConferida(p){ const a = S.anot && S.anot[chaveDe(p)]; return !!(a && a.conferida); }
function campoAtivoTexto(){
  if (!activeEl || !document.body.contains(activeEl)) return 'Clique num campo da ficha; depois use ✂ na página, um dado detectado ou o texto selecionado.';
  const lb = activeEl.id ? document.querySelector(`label[for="${cssEsc(activeEl.id)}"]`) : null;
  return `Campo ativo: ${lb ? lb.textContent.replace(/[✓✕!].*$/, '').trim() : (activeEl.getAttribute('aria-label') || 'campo')} — use ✂ na página, clique num dado detectado ou insira o texto selecionado.`;
}
function notaParaExigencia(p, a){
  const d = S.docs.find(x => x.pageIds.includes(p.id));
  const ref = d ? `${catNome(d.category)} "${d.name}", p. ${d.pageIds.indexOf(p.id) + 1}` : p.name;
  const e = {id:uid(), texto:a.txt, sugerido:'', fund:'', ref:'nota na página · ' + ref, notaId:a.id};
  S.exig.push(e); a.exigId = e.id; markDirty();
}
/* Ligação entre a janela principal e o leitor (inclusive o da janela separada): só funções, para valer entre janelas */
window.HOST = {janela:window, CV, VERSAO:() => VERSAO,
  pagesDoDoc:d => pagesDoDoc(d), docOpcoes:() => docOpcoes(), anotDe:p => anotDe(p), pageText:p => pageText(p), detect:t => detect(t),
  campoAtivoTexto:() => campoAtivoTexto(), toast:(m, t) => toast(m, t), markDirty:() => markDirty(), ocrRegiao:(p, R) => ocrRegiao(p, R),
  ocrPages:l => ocrPages(l), insertActive:(...a) => insertActive(...a), notaParaExigencia:(p, a) => notaParaExigencia(p, a),
  alternarComparar:x => alternarComparar(x), abrirJanelaDoc:() => abrirJanelaDoc(), confMudou:o => confMudou(o),
  visorConectado:(w, L) => visorConectado(w, L), visorFechado:() => visorFechado(),
  renderPDF:(p, w) => renderPDFAlta(p, w), matTexto:() => ({html:matTextoHTML(), titulo:S.mat && S.mat.fonte || 'Matrícula'}), colouMatricula:(txt) => registrarColagem(null, txt, 'janela-matricula'), pontosConferir:p => pontosConferir(p), registrarExtra:(w, L) => { JAN.extras.push({w, L}); }};
const MOVPAG = {k:'', d:''};
/* ---------- certidão aberta no leitor: emissão e validade ali mesmo, sem procurar na ficha ---------- */
function aplicarDias(id, n){
  const c = S.certidoes.find(x => x.id === id); if (!c || !(n > 0)) return;
  const base = c.emissao || todayISO(); if (!c.emissao) toast('Sem data de emissão: contei a partir de hoje. Lance a emissão para corrigir.', 'err');
  c.validade = Motor.somarDias(base, n); const d = c.docId && S.docs.find(x => x.id === c.docId); if (d) d.validade = c.validade;
  markDirty(); renderCertBar(); if (curStep === 'conf') renderConfForm(); refreshCertStatus(); toast(`Validade: ${fmtDate(c.validade)} (${n} dias a partir de ${fmtDate(base)}).`);
}
function renderCertBar(){
  const box = $('certBar'); if (!box) return;
  const d = S.docs.find(x => x.id === CV.docId), c = d && d.category === 'CERTIDAO' ? S.certidoes.find(x => x.docId === d.id) : null;
  if (!c) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `<b title="${esc(d.name)}">📄 ${String(d.order).padStart(2, '0')} · Certidão</b>
    <select data-bind="ct:${c.id}:tipo" aria-label="Tipo da certidão">${Object.entries(CERT).map(([k, v]) => `<option value="${k}"${k === c.tipo ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>
    <select data-bind="ct:${c.id}:res" aria-label="Resultado">${['Negativa','Positiva','Positiva com efeito de negativa'].map(o => `<option${o === c.res ? ' selected' : ''}>${o}</option>`).join('')}</select>
    <label>Emissão <input type="date" data-bind="ct:${c.id}:emissao" value="${esc(c.emissao)}"></label>
    <label>Válida até <input type="date" data-bind="ct:${c.id}:validade" value="${esc(c.validade)}"></label>
    <label>ou <input class="dias" type="number" min="1" max="999" data-diasct="${c.id}" placeholder="dias" aria-label="Validade em dias"> dias</label>
    <span data-certst="${c.id}" class="cb-st"></span>`;
  refreshCertStatus();
}
function confMudou(origem){
  renderCertBar();
  if (origem === 'principal') { const p = confPages()[CV.i], d = S.docs.find(x => x.id === CV.docId); if (p) { if (CV.docId !== MOVPAG.d) { MOVPAG.d = CV.docId; aprendMov('D', d ? String(d.order) : 'soltas'); } const k = (d ? d.order : 0) + '.' + (CV.i + 1); if (k !== MOVPAG.k) { MOVPAG.k = k; aprendMov('P', k); } } }
  if (origem !== 'principal' && LP) LP.atualizar();
  if (origem !== 'visor' && JAN.L) JAN.L.atualizar();
  JAN.extras = JAN.extras.filter(x => x.w && !x.w.closed); JAN.extras.forEach(x => { try { x.L.atualizar(); } catch (e) {} });
  if (curStep === 'ged') renderGED();
}
function avisarCampoAtivo(){ if (LP) LP.gaveta(); if (JAN.L) JAN.L.gaveta(); }

/* ---------- layout: divisória, tela em pé, comparar, janela separada ---------- */
function confLayout(){
  const st = $('step-conf'), sep = !!(JAN.win && !JAN.win.closed);
  st.classList.toggle('sem-doc', sep); st.classList.toggle('comparando', !!LC && !sep);
  $('cvJanela').hidden = !sep; $('cvB').hidden = !LC;
  const s = lsGet('qcrco_split', {h:58, v:56}); st.style.setProperty('--split', s.h + '%'); st.style.setProperty('--splitv', s.v + '%');
}
function alternarComparar(forcar){
  const ligar = forcar === undefined ? !LC : forcar;
  if (ligar && !LC) { if (!CMP.docId) { const mat = S.docs.find(d => d.category === 'MATRICULA' && d.id !== CV.docId); CMP.docId = mat ? mat.id : CV.docId; CMP.i = 0; }
    $('cvB').hidden = false; LC = Leitor.criar($('cvB'), HOST, {st:CMP, janela:'comparar', compacto:true}); }
  else if (!ligar && LC) { LC.destruir(); LC = null; $('cvB').innerHTML = ''; $('cvB').className = 'cv-l'; }
  confLayout(); if (LP) LP.atualizar(); if (LC) LC.atualizar();
}
function abrirJanelaDoc(){
  if (JAN.win && !JAN.win.closed) { JAN.win.focus(); return; }
  const w = window.open('visor.html', 'qcrco-visor', 'popup=yes,width=900,height=1200');
  if (!w) { toast('O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo.', 'err'); return; }
  JAN.win = w; confLayout();
}
function visorConectado(w, L){ JAN.win = w; JAN.L = L; confLayout(); }
function visorFechado(){ JAN.win = null; JAN.L = null; confLayout(); if (curStep === 'conf' && LP) setTimeout(() => LP.atualizar(), 50); }
function trazerDocDeVolta(){ if (JAN.win && !JAN.win.closed) JAN.win.close(); visorFechado(); }

/* ---------- pontos a conferir: dados que o programa reconhece na página (padrões + o que está na ficha) ---------- */
const PONTOS = new Map();
function valoresDaFicha(){
  const ks = ['matricula', 'areaTerreno', 'cep', 'incCnpj', 'incNome', 'empNome', 'alvaraNum', 'alvaraArea', 'rtArt', 'rtRegistro', 'rtNome', 'regAnterior'];
  const v = ks.map(k => [((CAMPOS.find(f => f.k === k) || {}).l || k), S.campos[k]]).concat(S.partes.flatMap(p => [['Parte', p.nome], ['CPF/CNPJ', p.doc]]));
  return v.filter(([, x]) => x && String(x).trim().length >= 3 && String(x).length <= 80);
}
function pontosConferir(p){
  if (!p || !p.words || !p.words.length) return [];
  const vals = valoresDaFicha(), chave = p.id + '|' + p.words.length + '|' + vals.map(v => v[1]).join('¦');
  if (PONTOS.has(chave)) return PONTOS.get(chave);
  const W = p.words, nz = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\w,./-]/g, '');
  const nw = W.map(w => nz(w.t)), out = [], add = (tipo, i, j) => {
    const ws = W.slice(i, j + 1), x = Math.min(...ws.map(w => w.x)), y = Math.min(...ws.map(w => w.y)), R = {x, y, w:Math.max(...ws.map(w => w.x + w.w)) - x, h:Math.max(...ws.map(w => w.y + w.h)) - y};
    if (out.some(o => Math.abs(o.x - R.x) < .004 && Math.abs(o.y - R.y) < .004)) return;
    out.push(Object.assign({id:tipo.split(':')[0] + ':' + Math.round(R.x * 1000) + ',' + Math.round(R.y * 1000), tipo, v:ws.map(w => w.t).join(' ')}, R));
  };
  const limpo = t => String(t).replace(/[,;:.)]+$/, '').replace(/^[(]+/, '');
  W.forEach((w, i) => {
    const t = limpo(w.t), prox = W[i + 1] ? W[i + 1].t : '';
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(t)) add('CPF', i, i);
    else if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(t)) add('CNPJ', i, i);
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) add('Data', i, i);
    else if (/^\d{2}\.?\d{3}-\d{3}$/.test(t)) add('CEP', i, i);
    else if (/^\d{1,3}(\.\d{3})*,\d{2,4}(m²|m2)$/i.test(t)) add('Área', i, i);
    else if (/^\d{1,3}(\.\d{3})*,\d{2,4}$/.test(t) && /^m(²|2)/i.test(prox)) add('Área', i, i + 1);
    else if (/^R\$$/.test(t) && /^\d/.test(prox)) add('Valor', i, i + 1);
    else if (/^matr[ií]cula$/i.test(t) && W[i + 1]) { const k = /^n[º°o.]*$/i.test(prox) ? i + 2 : i + 1; if (W[k] && /^\d[\d.]*\d/.test(W[k].t)) add('Matrícula', i, k); }
  });
  vals.forEach(([rot, v]) => {
    const tk = String(v).split(/\s+/).map(nz).filter(Boolean).slice(0, 6); if (!tk.length) return;
    for (let i = 0; i < W.length; i++) {
      let ok = true; for (let j = 0; j < tk.length; j++) { const a = nw[i + j]; if (!a || !(a === tk[j] || (tk[j].length > 3 && a.startsWith(tk[j])) || (a.length > 3 && tk[j].startsWith(a)))) { ok = false; break; } }
      if (ok) { add('Ficha: ' + rot, i, i + tk.length - 1); i += tk.length - 1; }
    }
  });
  const res = out.slice(0, 160); if (PONTOS.size > 200) PONTOS.clear(); PONTOS.set(chave, res); return res;
}
/* ---------- página de PDF em alta resolução (para zoom nítido) ---------- */
const PDFDOCS = new Map(), RENDERS = new Map();
async function renderPDFAlta(p, largura){
  if (!window.pdfjsLib || !FILES.has(p.fileKey)) return null;
  const chave = p.id + '|' + largura; if (RENDERS.has(chave)) return RENDERS.get(chave);
  if (!PDFDOCS.has(p.fileKey)) { PDFDOCS.set(p.fileKey, FILES.get(p.fileKey).arrayBuffer().then(b => pdfjsLib.getDocument({data:new Uint8Array(b), isEvalSupported:false}).promise)); if (PDFDOCS.size > 4) { const [k] = PDFDOCS.keys(); PDFDOCS.get(k).then(d => d.destroy && d.destroy()).catch(() => {}); PDFDOCS.delete(k); } }
  const d = await PDFDOCS.get(p.fileKey), pg = await d.getPage(p.pageNum), v1 = pg.getViewport({scale:1}), vp = pg.getViewport({scale:Math.min(8, largura / v1.width)});
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  await pg.render({canvasContext:c.getContext('2d'), viewport:vp}).promise;
  RENDERS.set(chave, c); if (RENDERS.size > 8) { const [k] = RENDERS.keys(); const old = RENDERS.get(k); RENDERS.delete(k); if (old && old.width) old.width = 0; }
  return c;
}
/* ---------- certidões: as do GED entram sozinhas ---------- */
function syncCertidoesDoGED(){
  const docs = S.docs.filter(d => d.category === 'CERTIDAO'), ids = new Set(docs.map(d => d.id));
  S.certidoes = S.certidoes.filter(c => !c.docId || ids.has(c.docId));
  docs.forEach(d => {
    let c = S.certidoes.find(x => x.docId === d.id);
    if (!c) { const L = Motor.lerCertidao(d.name, d.pageIds.map(pageById).filter(Boolean).map(pageText).join(' ')); c = {id:uid(), docId:d.id, tipo:L.tipo, res:L.res, emissao:L.emissao, validade:d.validade || L.validade, obs:L.tipo === 'OUTRA' ? d.name : ''}; S.certidoes.push(c); if (!d.validade && L.validade) d.validade = L.validade; }
    else if (d.validade && d.validade !== c.validade) c.validade = d.validade;
  });
}
/* ---------- validações dos campos (vermelho = erro, amarelo = conferir) ---------- */
function validarCampos(){
  const C = S.campos, V = {}, inc = S.meta.tipoAto === 'INCORPORACAO';
  if (inc && C.reqData && C.alvaraData && C.reqData < C.alvaraData) { V['c:reqData'] = ['err', `Requerimento (${fmtDate(C.reqData)}) anterior ao alvará (${fmtDate(C.alvaraData)}).`]; V['c:alvaraData'] = ['err', 'Alvará posterior ao requerimento.']; }
  if (inc && C.aprovData && C.alvaraData && C.aprovData > C.alvaraData) V['c:aprovData'] = ['warn', 'Aprovação do projeto depois da data do alvará: confira.'];
  if (C.rtArtData && C.reqData && C.rtArtData > C.reqData) V['c:rtArtData'] = ['warn', 'ART/RRT posterior ao requerimento: confira.'];
  if (C.rtArt && !/\d{6,}/.test(String(C.rtArt).replace(/[.\s-]/g, ''))) V['c:rtArt'] = ['warn', 'Número de ART/RRT fora do formato (esperado: só números, 10+ dígitos). Foi capturado do lugar certo?'];
  if (C.cep && !/^\d{2}\.?\d{3}-?\d{3}$/.test(String(C.cep).trim())) V['c:cep'] = ['warn', 'CEP fora do formato 00.000-000.'];
  if (C.matricula && !/^\d[\d.]*$/.test(String(C.matricula).trim())) V['c:matricula'] = ['warn', 'Matrícula deve ter só números.'];
  if (C.areaTerreno && !(parseBR(C.areaTerreno) > 0)) V['c:areaTerreno'] = ['warn', 'Área não reconhecida como número.'];
  return V;
}
function aplicarValidacoes(){
  const V = validarCampos();
  document.querySelectorAll('#confForm [data-valmsg]').forEach(x => x.remove());
  document.querySelectorAll('#confForm .val-err, #confForm .val-warn').forEach(x => x.classList.remove('val-err', 'val-warn'));
  Object.entries(V).forEach(([b, [niv, msg]]) => { const el = document.querySelector(`#confForm [data-bind="${cssEsc(b)}"]`); if (!el) return; el.classList.add('val-' + niv);
    const m = document.createElement('div'); m.dataset.valmsg = '1'; m.className = 'valmsg ' + niv; m.textContent = (niv === 'err' ? '✕ ' : '! ') + msg; el.insertAdjacentElement('afterend', m); });
}
/* ---------- resumo consolidado (tudo num lugar só, com o texto inteiro) ---------- */
const CONFVISTA = {resumo:false};
function renderResumo(){
  const C = S.campos, isInc = S.meta.tipoAto === 'INCORPORACAO', V = validarCampos(), lin = [];
  const it = (rot, val, b, extra) => { const ok = b && S.ok[b], vv = V[b]; lin.push(`<tr${b ? ` data-ir="${esc(b)}"` : ''}><th>${esc(rot)}</th><td>${val ? esc(val) : '<span class="ph">—</span>'}${extra || ''}${vv ? `<div class="valmsg ${vv[0]}">${esc(vv[1])}</div>` : ''}</td><td>${b ? (ok ? '<span class="okt" title="Conferido">✓</span>' : '<span class="muted" title="Ainda não marcado como conferido">·</span>') : ''}</td></tr>`); };
  const grupo = t => lin.push(`<tr class="rs-g"><td colspan="3">${esc(t)}</td></tr>`);
  if (S.mat && S.mat.R) { const R = S.mat.R; grupo('Matrícula'); it('Titular atual', R.titular ? `${R.titular.nomeAtual || R.titular.nome} (${R.titular.doc || 's/ doc'}) — ${R.titular.ato}` : ''); it('Ônus em aberto', R.onusAbertos.length ? R.onusAbertos.map(o => o.rot + ' ' + o.natureza).join('; ') : 'nenhum'); }
  [...new Set(CAMPOS.filter(f => !f.inc || isInc).map(f => f.g))].forEach(g => { grupo(g); CAMPOS.filter(f => f.g === g && (!f.inc || isInc)).forEach(f => it(f.l, f.t === 'date' ? fmtDate(C[f.k]) : (C[f.k] || ''), 'c:' + f.k)); });
  grupo('Partes'); if (!S.partes.length) it('Partes', ''); S.partes.forEach(p => it(p.papel, `${p.nome || '—'} · ${p.doc || 's/ doc'}`, 'p:' + p.id + ':nome', ' ' + docStatus(p.doc)));
  grupo('Certidões'); if (!S.certidoes.length) it('Certidões', ''); S.certidoes.forEach(c => it((CERT[c.tipo] || ['Outra'])[0], `${c.res} · emitida ${fmtDate(c.emissao) || '—'} · válida até ${fmtDate(c.validade) || '—'}`, null, ' ' + certStatus(c)));
  if (isInc && S.inc.q2.length) { const R = calcInc(); grupo('Quadros NBR'); it('Unidades', `${R.q2.length} unidade(s) em ${R.q1.length} tipo(s) de pavimento`); it('Área real global', fmt(R.T1[17]) + ' m²'); it('Área equivalente global', fmt(R.T1[18]) + ' m²'); it('Custo global (13)', 'R$ ' + fmt(parseBR(S.inc.q3.v13rt) || R.Q3.v13)); it('CUB', `${S.inc.q3.cub || '—'} (${S.inc.q3.cubMes || '—'})`);
    /* unidades com a mesma composição numa linha só, com a fração ideal (col. 31) de cada uma na frente */
    const den = (S.inc.denom || 'Apartamento').toLowerCase().replace(/^./, c => c.toUpperCase()), denPl = /s$/i.test(den) ? den : den + 's';
    const fiT = x => String(x.r.fiRT || '').trim() || fmt(x.fi, R.p), grupos = new Map();
    R.q2.forEach(x => { const k = Motor.chaveComposicao(x.r.comp) + '|' + (x.r.pcd ? 1 : 0); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(x); });
    grupos.forEach(g => { const comp = String(g[0].r.comp || '').trim(), pend = g.some(x => x.r.compPend);
      lin.push(`<tr class="rs-comp" data-irinc="1"><th>${esc(g.length > 1 ? denPl + ' ' + joinE(g.map(x => unitShort(x.r))) : den + ' ' + unitShort(g[0].r))}</th><td><span class="fis">${g.map(x => `<span class="fi" title="Fração ideal (coluna 31) da unidade ${esc(unitShort(x.r))}"><b>${esc(unitShort(x.r))}</b> ${esc(fiT(x))}</span>`).join('')}</span>${comp ? `${g.length > 1 ? 'compostos' : 'composto'} de ${esc(comp.replace(/[.;]+$/, ''))}` : '<span class="ph">composição não informada</span>'}${pend ? ' <span class="pendtag" title="Veio do memorial: confira no Quadro II">a conferir</span>' : ''}</td><td>${pend ? '<span class="muted">·</span>' : comp ? '<span class="okt">✓</span>' : ''}</td></tr>`); });
  }
  /* a linha da composição leva ao Quadro II */
  $('confResumo').innerHTML = `<table class="resumo">${lin.join('')}</table><p class="muted" style="font-size:12px;margin-top:8px">Clique numa linha para ir ao campo na ficha.</p>`;
}
function vistaConf(resumo){ CONFVISTA.resumo = resumo; $('confForm').hidden = resumo; $('confResumo').hidden = !resumo; $('vFicha').setAttribute('aria-pressed', String(!resumo)); $('vResumo').setAttribute('aria-pressed', String(resumo)); if (resumo) renderResumo(); }
function renderConf(){
  const ops = docOpcoes();
  if (!ops.some(o => o.id === CV.docId)) { CV.docId = ops[0] ? ops[0].id : ''; CV.i = 0; }
  if (!LP) LP = Leitor.criar($('cvA'), HOST, {st:CV, janela:'principal', aoMudar:() => confMudou('principal')});
  confLayout(); LP.atualizar(); renderCertBar(); if (LC) LC.atualizar(); if (JAN.L) JAN.L.atualizar();
  renderConfForm();
}
function renderConfView(){ if (LP) LP.atualizar(); if (LC) LC.atualizar(); if (JAN.L) JAN.L.atualizar(); }

function detect(text){
  const out = [], add = (tipo, v) => { v = v.trim(); if (v && !out.some(o => o.v === v)) out.push({tipo, v}); };
  const rx = [
    ['CNPJ', /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g], ['CPF', /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g], ['Data', /\b\d{2}\/\d{2}\/\d{4}\b/g],
    ['Área', /\b\d{1,3}(?:\.\d{3})*,\d{2,4}\s?(?:m²|m2)/gi], ['Valor', /R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/g],
    ['Matrícula', /matr[íi]cula\s*(?:n[º°o.]*\s*)?\d[\d.]*/gi], ['CEP', /\b\d{2}\.?\d{3}-\d{3}\b/g], ['ART/RRT', /\b(?:ART|RRT)\s*(?:n[º°o.]*\s*)?[\dA-Z][\dA-Z.\-\/]{5,}/g]
  ];
  rx.forEach(([t, r]) => (text.match(r) || []).forEach(v => add(t, v)));
  return out.slice(0, 80);
}
function srcHTML(b){ const s = S.src[b]; if (s && !s.pageId) return S.mat && S.mat.texto && /^Matr/.test(s.label) ? `<button type="button" class="srcb" data-mattxt="${esc(b)}" title="Ver no texto da matrícula, com o que foi lido em destaque">📄 ${esc(s.label)} ◎</button>` : `<span class="srcb" title="Origem do dado">📄 ${esc(s.label)}</span>`; return s ? `<button type="button" class="srcb" data-goto="${esc(b)}" title="Abrir a origem${s.reg ? ' (trecho marcado)' : ''}">📄 ${esc(s.label)}${s.reg ? ' ◎' : ''}</button>` : ''; }
function fmetaHTML(b){ return `<div class="fmeta"><span data-srcfor="${esc(b)}">${srcHTML(b)}</span><label class="okc"><input type="checkbox" data-ok="${esc(b)}"${S.ok[b] ? ' checked' : ''}> conferido</label><button type="button" class="flagb${(AP().notas || []).some(n => n.campo === b) ? ' on' : ''}" data-flag="${esc(b)}" title="Avisar que este dado foi lido errado (vai para o aprendizado)" aria-label="Avisar erro de leitura">⚑</button></div>`; }
function fieldHTML(f){
  const b = 'c:' + f.k, v = S.campos[f.k] ?? '', id = 'f_' + f.k;
  let inp;
  if (f.t === 'area') inp = `<textarea id="${id}" data-bind="${b}" rows="2">${esc(v)}</textarea>`;
  else if (f.t === 'sel') inp = `<select id="${id}" data-bind="${b}"><option value=""></option>${f.opts.map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  else inp = `<input id="${id}" data-bind="${b}"${f.t === 'date' ? ' type="date"' : ''}${f.num ? ' data-num="1" inputmode="decimal"' : ''} value="${esc(v)}" autocomplete="off">`;
  return `<div class="fld${f.wide ? ' wide' : ''}"${f.doc ? ' data-hasdoc="1"' : ''}><label for="${id}">${esc(f.l)}${f.doc ? ' <span class="dchk">' + docStatus(v) + '</span>' : ''}</label>${inp}${fmetaHTML(b)}</div>`;
}
function renderConfForm(){
  syncCertidoesDoGED();
  const isInc = S.meta.tipoAto === 'INCORPORACAO';
  const groups = [...new Set(CAMPOS.filter(f => !f.inc || isInc).map(f => f.g))];
  let h = matResumoHTML() + groups.map(g => `<h3 class="grp-h">${g}</h3><div class="fgrid">${CAMPOS.filter(f => f.g === g && (!f.inc || isInc)).map(fieldHTML).join('')}</div>`).join('');
  h += `<h3 class="grp-h">Partes <button class="btn sm" type="button" id="addParte" style="margin-left:auto">+ Parte</button></h3>`;
  h += S.partes.length ? `<table class="lt"><thead><tr><th style="width:150px">Papel</th><th>Nome / razão social</th><th style="width:200px">CPF / CNPJ</th><th style="width:40px"></th></tr></thead><tbody>${S.partes.map(p => `<tr data-hasdoc="1">
      <td><select data-bind="p:${p.id}:papel" aria-label="Papel">${PAPEIS.map(o => `<option${o === p.papel ? ' selected' : ''}>${o}</option>`).join('')}</select></td>
      <td><input data-bind="p:${p.id}:nome" value="${esc(p.nome)}" aria-label="Nome">${fmetaHTML('p:' + p.id + ':nome')}</td>
      <td><input data-bind="p:${p.id}:doc" value="${esc(p.doc)}" aria-label="CPF ou CNPJ"><div class="fmeta"><span class="dchk">${docStatus(p.doc)}</span></div></td>
      <td><button class="btn sm danger" type="button" data-rmparte="${p.id}" aria-label="Remover parte">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="font-size:13px">Nenhuma parte lançada.</p>';
  h += `<h3 class="grp-h">Certidões <button class="btn sm" type="button" id="addCert" style="margin-left:auto">+ Certidão</button></h3>`;
  h += S.certidoes.length ? `<p class="muted" style="font-size:12px;margin-bottom:6px">As certidões do GED entram aqui sozinhas (tipo, resultado e datas lidos do texto; a validade é a mesma do GED). Confira e ajuste.</p><table class="lt"><thead><tr><th>Tipo</th><th>Resultado</th><th>Emissão</th><th>Válida até</th><th>Situação</th><th></th></tr></thead><tbody>${S.certidoes.map(c => { const d = c.docId && S.docs.find(x => x.id === c.docId); return `<tr>
      <td>${d ? `<button type="button" class="srcb" data-godoc="${d.id}" title="Abrir a certidão">📄 ${String(d.order).padStart(2, '0')} ${esc(d.name)}</button><br>` : ''}<select data-bind="ct:${c.id}:tipo" aria-label="Tipo">${Object.entries(CERT).map(([k, v]) => `<option value="${k}"${k === c.tipo ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>${c.tipo === 'OUTRA' ? `<input data-bind="ct:${c.id}:obs" value="${esc(c.obs)}" placeholder="Descreva a certidão" style="margin-top:4px">` : ''}</td>
      <td><select data-bind="ct:${c.id}:res" aria-label="Resultado">${['Negativa','Positiva','Positiva com efeito de negativa'].map(o => `<option${o === c.res ? ' selected' : ''}>${o}</option>`).join('')}</select></td>
      <td><input type="date" data-bind="ct:${c.id}:emissao" value="${esc(c.emissao)}" aria-label="Emissão"></td>
      <td><input type="date" data-bind="ct:${c.id}:validade" value="${esc(c.validade)}" aria-label="Válida até"><input class="dias" type="number" min="1" max="999" data-diasct="${c.id}" placeholder="ou nº de dias" title="Certidão que diz &quot;validade de X dias&quot;: digite os dias e a data é calculada a partir da emissão" aria-label="Validade em dias"></td>
      <td data-certst="${c.id}" style="font-size:12px"></td>
      <td>${d ? '<span class="muted" title="Vem do GED: para tirar, desfaça o documento lá">GED</span>' : `<button class="btn sm danger" type="button" data-rmcert="${c.id}" aria-label="Remover certidão">✕</button>`}</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted" style="font-size:13px">Nenhuma certidão. As que você classificar como Certidão no GED entram aqui sozinhas.</p>';
  $('confForm').innerHTML = h;
  refreshCertStatus(); updateConfProgress(); aplicarValidacoes(); if (CONFVISTA.resumo) renderResumo();
  if (activeEl && !document.body.contains(activeEl)) activeEl = null;
}
function certStatus(c){
  const ref = refDate();
  if (!c.validade) return '<span class="warnt">! sem validade informada</span>';
  if (c.validade < ref) return `<span class="errt">✕ vencida em ${fmtDate(ref)}</span>`;
  return '<span class="okt">✓ válida</span>';
}
function refreshCertStatus(){ S.certidoes.forEach(c => { const el = document.querySelector(`[data-certst="${cssEsc(c.id)}"]`); if (el) el.innerHTML = certStatus(c); }); }
function updateConfProgress(){ const all = document.querySelectorAll('#confForm [data-ok]'); const ok = [...all].filter(x => x.checked).length; $('confProg').textContent = all.length ? `${ok} de ${all.length} campos conferidos` : ''; }
function insertActive(raw, p, como = 'selecao', reg = null){
  if (!activeEl || !document.body.contains(activeEl)) { if (como.indexOf('captura') !== 0) toast('Clique primeiro no campo da ficha que vai receber o dado.', 'err'); return false; }
  let v = String(raw || '').trim(); if (!v) { toast('Selecione um trecho do texto primeiro.', 'err'); return false; }
  const b = activeEl.dataset.bind;
  if (activeEl.type === 'date') { const iso = brToISO(v); if (!iso) { toast('O trecho não tem data no formato dd/mm/aaaa.', 'err'); return false; } v = iso; }
  else if (activeEl.dataset.num) v = v.replace(/R\$|m²|m2/gi, '').trim();
  else if (b === 'c:matricula') { const m = v.match(/\d[\d.]*/); if (m) v = m[0]; }
  else if (activeEl.tagName === 'SELECT') { toast('Este campo é de seleção; escolha a opção na lista.', 'err'); return false; }
  else if (activeEl.tagName === 'INPUT') v = v.replace(/\s*\n\s*/g, ' ').replace(/[\s,;:]+$/, '').replace(/(\d)\.$/, '$1');
  activeEl.value = v; setBind(b, v); afterBind(b, activeEl);
  if (p) {
    const d = S.docs.find(x => x.pageIds.includes(p.id));
    S.src[b] = {pageId:p.id, label:d ? `${String(d.order).padStart(2, '0')} ${catNome(d.category)} · p.${d.pageIds.indexOf(p.id) + 1}` : `${p.name}`, reg:reg || null};
    const s = document.querySelector(`[data-srcfor="${cssEsc(b)}"]`); if (s) s.innerHTML = srcHTML(b);
  }
  registrarManual(b, v, {como, fonte:fonteDe(p && p.id), contexto:trecho(pageText(p), String(raw || '').trim())});
  toast(reg ? 'Trecho capturado com a origem marcada na página. Confira e marque "conferido".' : 'Dado inserido com a origem registrada. Confira e marque "conferido".');
  return true;
}
function gotoPage(chaveOuPagina){
  aprendMov('O', String(chaveOuPagina).split(':')[0]);
  const s = S.src[chaveOuPagina], pageId = s ? s.pageId : chaveOuPagina, reg = s ? s.reg : null;
  const p = pageById(pageId); if (!p) { toast('A página de origem não está carregada (importe o documento de novo).', 'err'); return; }
  const d = S.docs.find(x => x.pageIds.includes(pageId));
  CV.docId = d ? d.id : '__soltas';
  if (curStep !== 'conf') goStep('conf');
  if (JAN.win && !JAN.win.closed && JAN.L) { JAN.L.destacar(pageId, reg); JAN.win.focus(); }
  else if (LP) LP.destacar(pageId, reg);
}
function bindConferencia(){
  $('confForm').addEventListener('click', e => {
    const g = e.target.closest('[data-goto]'); if (g) { gotoPage(g.dataset.goto); return; }
    if (e.target.closest('#addParte')) { S.partes.push({id:uid(), papel:'Transmitente', nome:'', doc:''}); renderConfForm(); markDirty(); return; }
    if (e.target.closest('#addCert')) { S.certidoes.push({id:uid(), tipo:'FED', res:'Negativa', emissao:'', validade:'', obs:''}); renderConfForm(); markDirty(); return; }
    const rp = e.target.closest('[data-rmparte]'); if (rp) { S.partes = S.partes.filter(x => x.id !== rp.dataset.rmparte); renderConfForm(); markDirty(); return; }
    const rc = e.target.closest('[data-rmcert]'); if (rc) { S.certidoes = S.certidoes.filter(x => x.id !== rc.dataset.rmcert); renderConfForm(); markDirty(); }
  });
  $('confForm').addEventListener('change', e => { if (e.target.dataset.bind && /^ct:.*:tipo$/.test(e.target.dataset.bind)) renderConfForm(); });
  $('cvVoltar').onclick = trazerDocDeVolta;
  $('vFicha').onclick = () => vistaConf(false); $('vResumo').onclick = () => vistaConf(true);
  $('certBar').addEventListener('change', e => { const di = e.target.closest('[data-diasct]'); if (di) { aplicarDias(di.dataset.diasct, +di.value); return; }
    const b = e.target.dataset.bind; if (b && /^ct:/.test(b)) { const c = S.certidoes.find(x => x.id === b.split(':')[1]); const d = c && c.docId && S.docs.find(x => x.id === c.docId); if (d && /:validade$/.test(b)) d.validade = c.validade; markDirty(); if (curStep === 'conf' && !CONFVISTA.resumo) renderConfForm(); } });
  $('certBar').addEventListener('keydown', e => { const di = e.target.closest('[data-diasct]'); if (di && e.key === 'Enter') { e.preventDefault(); di.blur(); } });
  $('confForm').addEventListener('change', e => { const di = e.target.closest('[data-diasct]'); if (di) aplicarDias(di.dataset.diasct, +di.value); else if (/^ct:/.test(e.target.dataset.bind || '')) renderCertBar(); });
  $('confResumo').addEventListener('click', e => { if (e.target.closest('[data-irinc]')) { goStep('inc'); setTimeout(() => $('q2Card').scrollIntoView({block:'start'}), 50); return; } const tr = e.target.closest('[data-ir]'); if (!tr) return; vistaConf(false); const el = document.querySelector(`#confForm [data-bind="${cssEsc(tr.dataset.ir)}"]`); if (el) { el.scrollIntoView({block:'center'}); el.focus(); } });
  $('confForm').addEventListener('change', e => { const b = e.target.dataset && e.target.dataset.bind; if (!b || !/^ct:.*:validade$/.test(b)) return; const c = S.certidoes.find(x => x.id === b.split(':')[1]); const d = c && c.docId && S.docs.find(x => x.id === c.docId); if (d) { d.validade = c.validade; markDirty(); } });
  $('confForm').addEventListener('click', e => { const g = e.target.closest('[data-godoc]'); if (!g) return; CV.docId = g.dataset.godoc; CV.i = 0; if (JAN.win && !JAN.win.closed && JAN.L) { JAN.L.atualizar(); JAN.win.focus(); } else if (LP) LP.atualizar(); });
  /* divisória arrastável (horizontal na tela deitada, vertical na tela em pé) */
  const gut = $('cvGutter');
  gut.addEventListener('pointerdown', e => {
    e.preventDefault(); gut.setPointerCapture(e.pointerId);
    const st = $('step-conf'), r = st.getBoundingClientRect(), emPe = matchMedia('(orientation: portrait)').matches;
    const mover = ev => { const s = lsGet('qcrco_split', {h:58, v:56});
      if (emPe) s.v = Math.max(25, Math.min(80, (ev.clientY - r.top) / r.height * 100)); else s.h = Math.max(25, Math.min(80, (ev.clientX - r.left) / r.width * 100));
      lsSet('qcrco_split', s); confLayout(); };
    const parar = () => { gut.removeEventListener('pointermove', mover); gut.removeEventListener('pointerup', parar); };
    gut.addEventListener('pointermove', mover); gut.addEventListener('pointerup', parar);
  });
  gut.addEventListener('dblclick', () => { lsSet('qcrco_split', {h:58, v:56}); confLayout(); });
  window.addEventListener('beforeunload', () => { if (JAN.win && !JAN.win.closed) JAN.win.close(); JAN.extras.forEach(x => { try { x.w.close(); } catch (e) {} }); });
  setInterval(() => { if (JAN.win && JAN.win.closed) visorFechado(); }, 1500);
}
