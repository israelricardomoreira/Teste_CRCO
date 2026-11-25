/* Qualificador CRCO — js/checklist.js: etapa 3 · checklist editável e modelos por tipo de ato */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/checklist.js'] = '1.5.6';
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
  AP().ckModelo = S.checklist.map(i => i.texto);
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
  if (st === 'exig' && !ex) S.exig.push({id:uid(), itemId:id, texto:it.texto, sugerido:it.texto, fund:it.base, ref:'checklist'});
  if (st !== 'exig' && ex) S.exig = S.exig.filter(e => e !== ex);
  renderCheck(); markDirty();
}
function renderCheck(){
  const dx = $('docsExig'); if (dx) { const h = docsExigidosHTML(); dx.innerHTML = h; $('docsExigCard').hidden = !h; }
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
  bindDocsExigidos(); $('ckLoad').onclick = carregarModelo; $('ckSave').onclick = salvarModelo; $('ckReset').onclick = resetModelo;
  $('ckAdd').onclick = () => { S.checklist.push({id:uid(), texto:'', base:'', status:'pend', obs:''}); renderCheck(); markDirty(); const l = $('ckList').querySelectorAll('.ck-main input:first-child'); if (l.length) l[l.length - 1].focus(); };
  $('ckList').addEventListener('click', e => {
    const row = e.target.closest('.ck'); if (!row) return; const id = row.dataset.ck, i = S.checklist.findIndex(x => x.id === id);
    const st = e.target.closest('[data-st]'); if (st) { setStatus(id, st.dataset.st); return; }
    const mv = e.target.closest('[data-mv]'); if (mv) { const j = i + (+mv.dataset.mv); [S.checklist[i], S.checklist[j]] = [S.checklist[j], S.checklist[i]]; renderCheck(); markDirty(); return; }
    if (e.target.closest('[data-rm]')) { S.exig = S.exig.filter(x => x.itemId !== id); S.checklist.splice(i, 1); renderCheck(); markDirty(); }
  });

}

/* ---------- Documentos exigidos (lista do cartório) conferidos contra o GED ---------- */
function exigidosDoCaso(){
  const docs = S.docs.filter(d => d.category !== 'MATRICULA').map(d => ({id:d.id, nome:d.name, categoria:d.category, texto:d.pageIds.map(pageById).filter(Boolean).map(pageText).join(' ').slice(0, 4000)}));
  return Motor.exigidosIncorporacao(docs, {incCnpj:S.campos.incCnpj, incSede:S.campos.incSede, ref:refDate()});
}
const DX_MARCA = {ok:'✓', falta:'✕', vencida:'!'};
function docsExigidosHTML(){
  if (S.meta.tipoAto !== 'INCORPORACAO') return '';
  const R = exigidosDoCaso(), r = R.resumo, grupos = [];
  R.linhas.forEach(l => { let g = grupos.find(x => x.nome === l.grupo); if (!g) { g = {nome:l.grupo, l:[]}; grupos.push(g); } g.l.push(l); });
  const nomeDoc = id => { const d = S.docs.find(x => x.id === id); return d ? '<button type="button" class="srcb" data-dxdoc="' + d.id + '" title="Abrir na lista de documentos">' + String(d.order).padStart(2, '0') + ' ' + esc(d.name) + '</button>' : ''; };
  const linha = l => '<div class="dx ' + l.status + '"><span class="dx-m" aria-hidden="true">' + DX_MARCA[l.status] + '</span><span class="dx-t">' + esc(l.rotulo) + '</span>'
    + '<span class="dx-d">' + (l.docIds.length ? l.docIds.map(nomeDoc).join(' ') : '<span class="muted">não está na pasta</span>') + (l.obs ? ' <small class="' + (l.status === 'vencida' ? 'errt' : 'muted') + '">' + esc(l.obs) + '</small>' : '') + '</span>'
    + '<span class="dx-a">' + (l.status !== 'ok' ? '<button type="button" class="btn sm" data-dxex="' + l.id + '">Virar exigência</button>' : '') + '</span></div>';
  const resumo = r.ok + ' de ' + r.total + ' na pasta' + (r.falta ? ' · faltam ' + r.falta : '') + (r.vencida ? ' · ' + r.vencida + ' vencida(s)' : '');
  return '<h2>Documentos exigidos <span class="count">' + esc(resumo) + '</span></h2><p class="muted" style="font-size:13px;margin-bottom:8px">A lista do cartório conferida contra a pasta. O que falta ou venceu vira exigência com um clique.</p>'
    + grupos.map(g => '<h4 class="dx-g">' + esc(g.nome) + '</h4><div class="dx-l">' + g.l.map(linha).join('') + '</div>').join('')
    + (R.extras.length ? '<h4 class="dx-g">Também na pasta (não constam na lista)</h4><p class="muted" style="font-size:12.5px">' + R.extras.map(e => esc(e.rotulo || e.nome)).join(' · ') + '</p>' : '');
}
function bindDocsExigidos(){
  $('docsExig').addEventListener('click', e => {
    const b = e.target.closest('[data-dxex]');
    if (b) {
      const l = exigidosDoCaso().linhas.find(x => x.id === b.dataset.dxex); if (!l) return;
      const texto = 'Para o registro da incorporação imobiliária é indispensável a apresentação ' + l.texto + (l.status === 'vencida' ? ' (a apresentada está vencida)' : '') + '.';
      if (S.exig.some(x => x.texto === texto)) { toast('Essa exigência já está na nota.'); return; }
      S.exig.push({id:uid(), texto, fund:l.fund, ref:'documentos exigidos'}); markDirty(); toast('Exigência adicionada à nota.'); return;
    }
    const g = e.target.closest('[data-dxdoc]');
    if (g) { const d = S.docs.find(x => x.id === g.dataset.dxdoc); if (d) { d.collapsed = false; goStep('ged'); setTimeout(() => { const el = document.querySelector('[data-doc="' + d.id + '"]'); if (el) el.scrollIntoView({block:'center'}); }, 60); } }
  });
}
