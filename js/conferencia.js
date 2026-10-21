/* Qualificador CRCO — js/conferencia.js: etapa 2 · conferência lado a lado com origem de cada dado */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/conferencia.js'] = '1.2.0';
/* =====================================================================
   2. CONFERÊNCIA
   ===================================================================== */
const CV = {docId:'', i:0, z:1, x:0, y:0, drag:false, sx:0, sy:0};
let activeEl = null;
function confPages(){ if (CV.docId === '__soltas') return S.pages.filter(p => !p.grouped); const d = S.docs.find(x => x.id === CV.docId); return d ? d.pageIds.map(pageById).filter(Boolean) : []; }
function renderConf(){
  const opts = S.docs.map(d => `<option value="${d.id}">${String(d.order).padStart(2, '0')} · ${esc(catNome(d.category))} · ${esc(d.name)}</option>`);
  if (S.pages.some(p => !p.grouped)) opts.push('<option value="__soltas">Páginas não agrupadas</option>');
  $('cDoc').innerHTML = opts.join('') || '<option value="">Nenhum documento importado</option>';
  if (!S.docs.some(d => d.id === CV.docId) && CV.docId !== '__soltas') { CV.docId = S.docs[0] ? S.docs[0].id : (S.pages.length ? '__soltas' : ''); CV.i = 0; }
  $('cDoc').value = CV.docId;
  renderConfView(); renderConfForm();
}
function renderConfView(){
  const pgs = confPages(); if (CV.i >= pgs.length) CV.i = Math.max(0, pgs.length - 1);
  const p = pgs[CV.i];
  $('cCount').textContent = pgs.length ? `${CV.i + 1}/${pgs.length}` : '–';
  $('cPrev').disabled = CV.i <= 0; $('cNext').disabled = CV.i >= pgs.length - 1;
  CV.z = 1; CV.x = 0; CV.y = 0;
  if (!p) { $('cImg').removeAttribute('src'); $('cText').textContent = 'Importe e organize os documentos na etapa 1.'; $('cChips').innerHTML = ''; return; }
  $('cImg').src = p.dataUrl; applyCV();
  const txt = pageText(p);
  $('cText').textContent = txt || 'Esta página não tem camada de texto (é imagem ou digitalização). Use "Ler esta página com OCR".';
  const det = detect(txt);
  $('cChips').innerHTML = det.length ? det.map(d => `<button class="chip" type="button" data-v="${esc(d.v)}"><b>${d.tipo}</b>${esc(d.v)}</button>`).join('') : '';
}
function applyCV(){ const p = confPages()[CV.i]; if (p) $('cImg').style.transform = `translate(${CV.x}px,${CV.y}px) scale(${CV.z}) rotate(${p.rotation}deg)`; }
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
function srcHTML(b){ const s = S.src[b]; if (s && !s.pageId) return `<span class="srcb" title="Origem do dado">📄 ${esc(s.label)}</span>`; return s ? `<button type="button" class="srcb" data-goto="${esc(s.pageId)}" title="Abrir a página de origem">📄 ${esc(s.label)}</button>` : ''; }
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
function insertActive(raw, p, como = 'selecao'){
  if (!activeEl || !document.body.contains(activeEl)) { toast('Clique primeiro no campo da ficha que vai receber o dado.', 'err'); return; }
  let v = String(raw || '').trim(); if (!v) { toast('Selecione um trecho do texto primeiro.', 'err'); return; }
  const b = activeEl.dataset.bind;
  if (activeEl.type === 'date') { const iso = brToISO(v); if (!iso) { toast('O trecho não tem data no formato dd/mm/aaaa.', 'err'); return; } v = iso; }
  else if (activeEl.dataset.num) v = v.replace(/R\$|m²|m2/gi, '').trim();
  else if (b === 'c:matricula') { const m = v.match(/\d[\d.]*/); if (m) v = m[0]; }
  else if (activeEl.tagName === 'SELECT') { toast('Este campo é de seleção; escolha a opção na lista.', 'err'); return; }
  activeEl.value = v; setBind(b, v); afterBind(b, activeEl);
  if (p) {
    const d = S.docs.find(x => x.pageIds.includes(p.id));
    S.src[b] = {pageId:p.id, label:d ? `${String(d.order).padStart(2, '0')} ${d.category} · p.${d.pageIds.indexOf(p.id) + 1}` : `${p.name}`};
    const s = document.querySelector(`[data-srcfor="${cssEsc(b)}"]`); if (s) s.innerHTML = srcHTML(b);
  }
  registrarManual(b, v, {como, fonte:fonteDe(p && p.id), contexto:trecho(pageText(p), String(raw || '').trim())});
  activeEl.focus(); toast('Dado inserido com a origem registrada. Confira e marque "conferido".');
}
function gotoPage(pageId){
  const p = pageById(pageId); if (!p) { toast('A página de origem não está carregada (importe o documento de novo).', 'err'); return; }
  const d = S.docs.find(x => x.pageIds.includes(pageId));
  CV.docId = d ? d.id : '__soltas'; CV.i = d ? d.pageIds.indexOf(pageId) : S.pages.filter(x => !x.grouped).indexOf(p);
  if (curStep !== 'conf') goStep('conf'); else { $('cDoc').value = CV.docId; renderConfView(); }
}


function bindConferencia(){
  /* Conferência */
  $('cDoc').onchange = e => { CV.docId = e.target.value; CV.i = 0; renderConfView(); };
  $('cPrev').onclick = () => { if (CV.i > 0) { CV.i--; renderConfView(); } };
  $('cNext').onclick = () => { if (CV.i < confPages().length - 1) { CV.i++; renderConfView(); } };
  $('cZoom').onclick = () => openViewer(confPages(), CV.i);
  $('cOcr').onclick = async () => { const p = confPages()[CV.i]; if (!p) return; await ocrPages([p]); renderConfView(); };
  $('cOcrAll').onclick = async () => { const ps = confPages().filter(p => !p.raw); if (!ps.length) { toast('Todas as páginas deste documento já têm texto.'); return; } await ocrPages(ps); renderConfView(); };
  $('cUse').addEventListener('mousedown', e => e.preventDefault());
  $('cUse').onclick = () => { const s = String(window.getSelection() || ''); insertActive(s, confPages()[CV.i]); };
  $('cChips').addEventListener('mousedown', e => e.preventDefault());
  $('cChips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) insertActive(c.dataset.v, confPages()[CV.i], 'chip:' + c.querySelector('b').textContent); });
  const cb = $('cImgBox');
  cb.addEventListener('wheel', e => { e.preventDefault(); CV.z = Math.max(.5, Math.min(6, CV.z + (e.deltaY < 0 ? .2 : -.2))); applyCV(); }, {passive:false});
  cb.addEventListener('mousedown', e => { if (e.button !== 0) return; e.preventDefault(); CV.drag = true; CV.sx = e.clientX - CV.x; CV.sy = e.clientY - CV.y; });
  cb.addEventListener('mousemove', e => { if (CV.drag) { CV.x = e.clientX - CV.sx; CV.y = e.clientY - CV.sy; applyCV(); } });
  cb.addEventListener('dblclick', () => { CV.z = 1; CV.x = 0; CV.y = 0; applyCV(); });
  $('confForm').addEventListener('click', e => {
    const g = e.target.closest('[data-goto]'); if (g) { gotoPage(g.dataset.goto); return; }
    if (e.target.closest('#addParte')) { S.partes.push({id:uid(), papel:'Transmitente', nome:'', doc:''}); renderConfForm(); markDirty(); return; }
    if (e.target.closest('#addCert')) { S.certidoes.push({id:uid(), tipo:'FED', res:'Negativa', emissao:'', validade:'', obs:''}); renderConfForm(); markDirty(); return; }
    const rp = e.target.closest('[data-rmparte]'); if (rp) { S.partes = S.partes.filter(x => x.id !== rp.dataset.rmparte); renderConfForm(); markDirty(); return; }
    const rc = e.target.closest('[data-rmcert]'); if (rc) { S.certidoes = S.certidoes.filter(x => x.id !== rc.dataset.rmcert); renderConfForm(); markDirty(); }
  });
  $('confForm').addEventListener('change', e => { if (e.target.dataset.bind && /^ct:.*:tipo$/.test(e.target.dataset.bind)) renderConfForm(); });

}
