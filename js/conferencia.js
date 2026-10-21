/* Qualificador CRCO — js/conferencia.js: etapa 2 · conferência. Documento grande com ferramentas (js/leitor.js),
 * ficha ao lado (ou embaixo, em tela em pé) e opção de abrir o documento numa janela separada. */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/conferencia.js'] = '1.3.0';

const CV = {docId:'', i:0};                 /* página aberta na Conferência (compartilhada com a janela separada) */
const CMP = {docId:'', i:0};                /* página do "Comparar" */
const JAN = {win:null, L:null};             /* janela separada do documento */
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
  visorConectado:(w, L) => visorConectado(w, L), visorFechado:() => visorFechado()};
function confMudou(origem){
  if (origem !== 'principal' && LP) LP.atualizar();
  if (origem !== 'visor' && JAN.L) JAN.L.atualizar();
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

function renderConf(){
  const ops = docOpcoes();
  if (!ops.some(o => o.id === CV.docId)) { CV.docId = ops[0] ? ops[0].id : ''; CV.i = 0; }
  if (!LP) LP = Leitor.criar($('cvA'), HOST, {st:CV, janela:'principal', aoMudar:() => confMudou('principal')});
  confLayout(); LP.atualizar(); if (LC) LC.atualizar(); if (JAN.L) JAN.L.atualizar();
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
function srcHTML(b){ const s = S.src[b]; if (s && !s.pageId) return `<span class="srcb" title="Origem do dado">📄 ${esc(s.label)}</span>`; return s ? `<button type="button" class="srcb" data-goto="${esc(b)}" title="Abrir a origem${s.reg ? ' (trecho marcado)' : ''}">📄 ${esc(s.label)}${s.reg ? ' ◎' : ''}</button>` : ''; }
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
  h += S.certidoes.length ? `<table class="lt"><thead><tr><th>Tipo</th><th>Resultado</th><th>Emissão</th><th>Válida até</th><th>Situação</th><th></th></tr></thead><tbody>${S.certidoes.map(c => `<tr>
      <td><select data-bind="ct:${c.id}:tipo" aria-label="Tipo">${Object.entries(CERT).map(([k, v]) => `<option value="${k}"${k === c.tipo ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>${c.tipo === 'OUTRA' ? `<input data-bind="ct:${c.id}:obs" value="${esc(c.obs)}" placeholder="Descreva a certidão" style="margin-top:4px">` : ''}</td>
      <td><select data-bind="ct:${c.id}:res" aria-label="Resultado">${['Negativa','Positiva','Positiva com efeito de negativa'].map(o => `<option${o === c.res ? ' selected' : ''}>${o}</option>`).join('')}</select></td>
      <td><input type="date" data-bind="ct:${c.id}:emissao" value="${esc(c.emissao)}" aria-label="Emissão"></td>
      <td><input type="date" data-bind="ct:${c.id}:validade" value="${esc(c.validade)}" aria-label="Válida até"></td>
      <td data-certst="${c.id}" style="font-size:12px"></td>
      <td><button class="btn sm danger" type="button" data-rmcert="${c.id}" aria-label="Remover certidão">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="font-size:13px">Nenhuma certidão lançada.</p>';
  $('confForm').innerHTML = h;
  refreshCertStatus(); updateConfProgress();
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
  window.addEventListener('beforeunload', () => { if (JAN.win && !JAN.win.closed) JAN.win.close(); });
  setInterval(() => { if (JAN.win && JAN.win.closed) visorFechado(); }, 1500);
}
