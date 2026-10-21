/* Qualificador CRCO — js/nota.js: etapa 5 · exigências, catálogo e nota devolutiva */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/nota.js'] = '1.4.0';
/* =====================================================================
   5. NOTA DEVOLUTIVA
   ===================================================================== */
function catalogo(){ return lsGet('qcrco_catalogo', []); }
function refreshCatalogo(){ const c = catalogo(); $('catExig').innerHTML = c.map(x => `<option value="${esc(x.texto)}">`).join(''); $('catFund').innerHTML = [...new Set(c.map(x => x.fund).filter(Boolean))].map(f => `<option value="${esc(f)}">`).join(''); }
/* ---------- revisão de texto das exigências e da nota ---------- */
const REV = {lista:[]};
function ignoradas(){ return lsGet('qcrco_ignorar', []); }
async function revisarExigencias(){
  try { if (!Ortografia.pronto()) { busy(true, 'Carregando o dicionário de português (só na primeira vez)…', 30); await Ortografia.carregar('lib/ortografia/'); ignoradas().forEach(w => Ortografia.adicionar(w)); } }
  catch (e) { toast('Dicionário indisponível; conferi só as regras do registro (normas, repetições, pontuação).', 'err'); }
  finally { busy(false); }
  REV.lista = [];
  S.exig.forEach((e, i) => Ortografia.revisar(e.texto || '').forEach(r => REV.lista.push(Object.assign({onde:'ex', id:e.id, n:i + 1}, r))));
  Ortografia.revisar(S.nota || '').filter(r => !r.msg.startsWith('Texto sem ponto')).forEach(r => REV.lista.push(Object.assign({onde:'nota', n:'Nota'}, r)));
  renderRevisao();
}
function renderRevisao(){
  const L = REV.lista, box = $('revisao');
  if (!L) { box.innerHTML = ''; return; }
  box.innerHTML = !L.length ? '<div class="notaprog ok">✓ Revisão: nada encontrado nas exigências e na nota.</div>'
    : `<div class="rev"><div class="rev-h"><b>Revisão do texto</b> · ${L.length} ponto(s) <button class="btn sm" type="button" data-rev="fechar" style="margin-left:auto">Fechar</button></div>${L.map((r, k) => `<div class="rev-i"><span class="rev-n">${r.onde === 'ex' ? 'Exig. ' + r.n : 'Nota'}</span><span><mark class="${r.ortografia ? 'mk-onus' : 'mk-area'}">${esc(r.trecho || '(fim do texto)')}</mark> ${esc(r.msg)}</span>
      <span class="rev-s">${(r.sugestoes || (r.troca != null ? [r.troca] : [])).map(s => `<button class="btn sm" type="button" data-rev="ap" data-k="${k}" data-s="${esc(s)}">${esc(s) || '(apagar)'}</button>`).join('')}${r.ortografia ? `<button class="btn sm link" type="button" data-rev="ign" data-k="${k}" title="Não marcar mais esta palavra">ignorar</button>` : ''}${!r.trecho ? `<button class="btn sm" type="button" data-rev="ponto" data-k="${k}">colocar ponto</button>` : ''}</span></div>`).join('')}</div>`;
}
function aplicarRevisao(k, s){
  const r = REV.lista[k]; if (!r) return;
  const trocar = t => t.slice(0, r.i) + s + t.slice(r.f);
  if (r.onde === 'ex') { const e = S.exig.find(x => x.id === r.id); if (!e) return; e.texto = s === '.' && !r.trecho ? e.texto.trimEnd() + '.' : trocar(e.texto); }
  else S.nota = trocar(S.nota);
  markDirty(); renderNota(); revisarExigencias();
}
function concluirAnalise(){
  if (!S.docs.length && !confirm('Não há documentos no GED. Concluir só com o arquivo da análise (.gori)?')) return;
  if (S.docs.length) baixarZip();
  setTimeout(() => { salvarAnalise(); toast('Concluído: ZIP do GED, análise (.gori) e aprendizado baixados. Para retomar, abra o .gori e importe o ZIP.'); }, S.docs.length ? 2500 : 0);
}
function renderNota(){
  refreshCatalogo();
  const tot = S.docs.reduce((n, d) => n + d.pageIds.length, 0), faltam = S.docs.filter(d => d.pageIds.map(pageById).filter(Boolean).some(p => !paginaConferida(p)));
  $('notaProg').innerHTML = !tot ? '' : !faltam.length ? '<div class="notaprog ok">✓ Todas as páginas dos documentos foram marcadas como conferidas.</div>'
    : `<div class="notaprog warn">Páginas ainda sem "✓ Conferida": ${faltam.map(d => { const ps = d.pageIds.map(pageById).filter(Boolean); return `${esc(catNome(d.category))} "${esc(d.name)}" (${ps.filter(paginaConferida).length}/${ps.length})`; }).join('; ')}.</div>`;
  const n = S.exig.length;
  $('exList').innerHTML = n ? S.exig.map((e, i) => `<div class="ex" data-ex="${e.id}"><span class="n">${i + 1}.</span>
    <div><textarea data-bind="ex:${e.id}:texto" rows="2" spellcheck="true" lang="pt-BR" aria-label="Exigência ${i + 1}">${esc(e.texto)}</textarea>${e.ref ? `<div class="ref">Origem: ${esc(e.ref)}</div>` : ''}</div>
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
  $('revBtn').onclick = revisarExigencias;
  $('concluir').onclick = concluirAnalise;
  $('revisao').addEventListener('click', e => { const b = e.target.closest('[data-rev]'); if (!b) return; const k = +b.dataset.k, r = REV.lista[k];
    if (b.dataset.rev === 'fechar') { REV.lista = null; renderRevisao(); }
    if (b.dataset.rev === 'ap') aplicarRevisao(k, b.dataset.s);
    if (b.dataset.rev === 'ponto') aplicarRevisao(k, '.');
    if (b.dataset.rev === 'ign' && r) { const L = ignoradas(); L.push(r.trecho.toLowerCase()); lsSet('qcrco_ignorar', [...new Set(L)].slice(-500)); Ortografia.adicionar(r.trecho.toLowerCase()); revisarExigencias(); } });
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
