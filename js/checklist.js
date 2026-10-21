/* Qualificador CRCO — js/checklist.js: etapa 3 · checklist editável e modelos por tipo de ato */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/checklist.js'] = '1.1.0';
/* =====================================================================
   3. CHECKLIST (editável)
   ===================================================================== */
function modeloDe(tipo){ const m = lsGet('qcrco_modelos', {}); return m[tipo] || null; }
function carregarModelo(){
  const tipo = S.meta.tipoAto;
  if (S.checklist.length && !confirm('Substituir o checklist atual pelo modelo deste tipo de ato?')) return;
  const custom = modeloDe(tipo);
  const itens = custom || [...MODELOS_PADRAO.GERAL, ...(tipo !== 'GERAL' ? (MODELOS_PADRAO[tipo] || []) : [])];
  S.checklist = itens.map(([t, b]) => ({id:uid(), texto:t, base:b || '', status:'pend', obs:''}));
  S.exig = S.exig.filter(e => !e.itemId);
  renderCheck(); markDirty(); toast(custom ? 'Seu modelo foi carregado.' : 'Modelo padrão carregado. Edite e salve como seu modelo.');
}
function salvarModelo(){
  if (!S.checklist.length) { toast('Checklist vazio.', 'err'); return; }
  const m = lsGet('qcrco_modelos', {}); m[S.meta.tipoAto] = S.checklist.map(i => [i.texto, i.base]); lsSet('qcrco_modelos', m);
  toast(`Modelo salvo para "${TIPOS_ATO[S.meta.tipoAto]}". Fica guardado neste navegador.`);
}
function resetModelo(){ const m = lsGet('qcrco_modelos', {}); if (!m[S.meta.tipoAto]) { toast('Este tipo de ato já usa o modelo padrão.'); return; } if (!confirm('Apagar seu modelo salvo e voltar ao padrão?')) return; delete m[S.meta.tipoAto]; lsSet('qcrco_modelos', m); toast('Modelo padrão restaurado. Clique em "Carregar modelo".'); }
function setStatus(id, st){
  const it = S.checklist.find(x => x.id === id); if (!it) return;
  it.status = st;
  const ex = S.exig.find(e => e.itemId === id);
  if (st === 'exig' && !ex) S.exig.push({id:uid(), itemId:id, texto:it.texto, fund:it.base, ref:'checklist'});
  if (st !== 'exig' && ex) S.exig = S.exig.filter(e => e !== ex);
  renderCheck(); markDirty();
}
function renderCheck(){
  const st = {pend:0, ok:0, exig:0, na:0}; S.checklist.forEach(i => st[i.status]++);
  $('ckTipo').textContent = TIPOS_ATO[S.meta.tipoAto];
  $('ckResumo').textContent = S.checklist.length ? `${S.checklist.length} itens · ${st.ok} conforme · ${st.exig} exigência · ${st.na} não se aplica · ${st.pend} pendente` : 'Carregue o modelo do tipo de ato ou monte o seu. Tudo é editável.';
  const n = S.checklist.length;
  $('ckList').innerHTML = n ? S.checklist.map((it, i) => `<div class="ck" data-ck="${it.id}">
    <div class="seg" role="group" aria-label="Situação do item ${i + 1}">${[['pend','Pendente'],['ok','Conforme'],['exig','Exigência'],['na','N/A']].map(([k, l]) => `<button type="button" class="s-${k}" aria-pressed="${it.status === k}" data-st="${k}">${l}</button>`).join('')}</div>
    <div class="ck-main"><input data-bind="ck:${it.id}:texto" value="${esc(it.texto)}" aria-label="Requisito ${i + 1}"><input class="ck-o" data-bind="ck:${it.id}:obs" value="${esc(it.obs)}" placeholder="Observação (opcional)" aria-label="Observação do item ${i + 1}"></div>
    <input data-bind="ck:${it.id}:base" value="${esc(it.base)}" placeholder="Base legal" aria-label="Base legal do item ${i + 1}">
    <div class="ck-act"><button class="btn sm" type="button" data-mv="-1" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button><button class="btn sm" type="button" data-mv="1" aria-label="Descer"${i === n - 1 ? ' disabled' : ''}>↓</button><button class="btn sm danger" type="button" data-rm="1" aria-label="Excluir item">✕</button></div></div>`).join('')
    : '<div class="empty">Checklist vazio. Clique em <b>Carregar modelo do tipo de ato</b> ou em <b>+ Adicionar item</b>.</div>';
}


function bindChecklist(){
  /* Checklist */
  $('ckLoad').onclick = carregarModelo; $('ckSave').onclick = salvarModelo; $('ckReset').onclick = resetModelo;
  $('ckAdd').onclick = () => { S.checklist.push({id:uid(), texto:'', base:'', status:'pend', obs:''}); renderCheck(); markDirty(); const l = $('ckList').querySelectorAll('.ck-main input:first-child'); if (l.length) l[l.length - 1].focus(); };
  $('ckList').addEventListener('click', e => {
    const row = e.target.closest('.ck'); if (!row) return; const id = row.dataset.ck, i = S.checklist.findIndex(x => x.id === id);
    const st = e.target.closest('[data-st]'); if (st) { setStatus(id, st.dataset.st); return; }
    const mv = e.target.closest('[data-mv]'); if (mv) { const j = i + (+mv.dataset.mv); [S.checklist[i], S.checklist[j]] = [S.checklist[j], S.checklist[i]]; renderCheck(); markDirty(); return; }
    if (e.target.closest('[data-rm]')) { S.exig = S.exig.filter(x => x.itemId !== id); S.checklist.splice(i, 1); renderCheck(); markDirty(); }
  });

}
