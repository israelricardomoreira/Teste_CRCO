/* Qualificador CRCO — js/nota.js: etapa 5 · exigências, catálogo e nota devolutiva */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/nota.js'] = '1.0.0';
/* =====================================================================
   5. NOTA DEVOLUTIVA
   ===================================================================== */
function catalogo(){ return lsGet('qcrco_catalogo', []); }
function refreshCatalogo(){ const c = catalogo(); $('catExig').innerHTML = c.map(x => `<option value="${esc(x.texto)}">`).join(''); $('catFund').innerHTML = [...new Set(c.map(x => x.fund).filter(Boolean))].map(f => `<option value="${esc(f)}">`).join(''); }
function renderNota(){
  refreshCatalogo();
  const n = S.exig.length;
  $('exList').innerHTML = n ? S.exig.map((e, i) => `<div class="ex" data-ex="${e.id}"><span class="n">${i + 1}.</span>
    <div><textarea data-bind="ex:${e.id}:texto" rows="2" aria-label="Exigência ${i + 1}">${esc(e.texto)}</textarea>${e.ref ? `<div class="ref">Origem: ${esc(e.ref)}</div>` : ''}</div>
    <input data-bind="ex:${e.id}:fund" value="${esc(e.fund)}" list="catFund" placeholder="Fundamento" aria-label="Fundamento da exigência ${i + 1}">
    <div class="ck-act"><button class="btn sm" type="button" data-exmv="-1" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button><button class="btn sm" type="button" data-exmv="1" aria-label="Descer"${i === n - 1 ? ' disabled' : ''}>↓</button><button class="btn sm" type="button" data-excat="1" title="Salvar no meu catálogo">★</button><button class="btn sm danger" type="button" data-exrm="1" aria-label="Excluir exigência">✕</button></div></div>`).join('')
    : '<div class="empty">Nenhuma exigência. Marque itens como "Exigência" no checklist ou use "Apontar exigência" na lupa.</div>';
  $('notaTxt').value = S.nota || '';
}
function gerarNota(){
  const m = S.meta, L = [];
  L.push('NOTA DEVOLUTIVA', '');
  L.push(`Protocolo nº ${m.protocolo || '______'}${m.dataPrenotacao ? `, prenotado em ${fmtDate(m.dataPrenotacao)}` : ''}.`);
  L.push(`Natureza do título: ${TIPOS_ATO[m.tipoAto]}.`);
  if (S.campos.matricula) L.push(`Imóvel: matrícula nº ${S.campos.matricula}.`);
  L.push('');
  if (!S.exig.length) L.push('Examinado o título, não foram formuladas exigências.');
  else {
    L.push('Examinado o título, formulam-se as exigências abaixo, de uma só vez, para que o ato possa ser praticado:', '');
    S.exig.forEach((e, i) => { const t = String(e.texto || '').trim().replace(/[.;]+$/, ''); L.push(`${i + 1}. ${t}${e.fund ? ` (fundamento: ${String(e.fund).trim()})` : ''}.`); });
    L.push('', 'Não se conformando com as exigências, o apresentante poderá requerer a suscitação de dúvida (Lei 6.015/73, art. 198).');
  }
  L.push('', `Cidade Ocidental/GO, ${new Date().toLocaleDateString('pt-BR')}.`, '', '______________________________', m.qualificador || 'Qualificador(a)');
  S.nota = L.join('\n'); $('notaTxt').value = S.nota; markDirty();
  if (curStep !== 'nota') goStep('nota');
  toast('Nota gerada. Revise antes de copiar.');
}


function bindNota(){
  /* Nota */
  $('exAdd').onclick = () => { S.exig.push({id:uid(), texto:'', fund:'', ref:''}); renderNota(); markDirty(); const t = $('exList').querySelectorAll('textarea'); if (t.length) t[t.length - 1].focus(); };
  $('exCatAdd').onclick = () => { const v = $('exCat').value.trim(); if (!v) return; const c = catalogo().find(x => x.texto === v); S.exig.push({id:uid(), texto:v, fund:c ? c.fund : '', ref:'catálogo'}); $('exCat').value = ''; renderNota(); markDirty(); };
  $('exList').addEventListener('click', e => {
    const row = e.target.closest('.ex'); if (!row) return; const i = S.exig.findIndex(x => x.id === row.dataset.ex), ex = S.exig[i];
    const mv = e.target.closest('[data-exmv]'); if (mv) { const j = i + (+mv.dataset.exmv); [S.exig[i], S.exig[j]] = [S.exig[j], S.exig[i]]; renderNota(); markDirty(); return; }
    if (e.target.closest('[data-excat]')) { if (!ex.texto.trim()) return; const c = catalogo().filter(x => x.texto !== ex.texto); c.unshift({texto:ex.texto.trim(), fund:ex.fund || ''}); lsSet('qcrco_catalogo', c.slice(0, 300)); refreshCatalogo(); toast('Exigência salva no seu catálogo.'); return; }
    if (e.target.closest('[data-exrm]')) { if (ex.itemId) { const it = S.checklist.find(x => x.id === ex.itemId); if (it) it.status = 'pend'; } S.exig.splice(i, 1); renderNota(); markDirty(); }
  });
  $('notaGen').onclick = gerarNota;
  $('notaCopy').onclick = () => copyText($('notaTxt').value);
  $('notaTxt').addEventListener('input', e => { S.nota = e.target.value; markDirty(); });

}
