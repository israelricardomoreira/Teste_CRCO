/* Qualificador CRCO — js/quadrospdf.js: importa os Quadros I, II e III da NBR 12721 direto do PDF do RT
 * (pela posição de cada número na linha das colunas). A regra de leitura fica no motor.js. */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/quadrospdf.js'] = '1.5.0';

function nbrPontuacao(d){
  return d.pageIds.map(pageById).filter(Boolean).reduce((n, p) => { const t = pageText(p); return n + (/QUADRO\s+II\b/i.test(t) ? 5 : 0) + (/QUADRO\s+I\b/i.test(t) ? 5 : 0) + (/NBR\s*12\.?721/i.test(t) ? 1 : 0); }, 0);
}
function renderImportNBR(){
  const box = $('nbrImp'); if (!box) return;
  const docs = [...S.docs].sort((a, b) => nbrPontuacao(b) - nbrPontuacao(a) || a.order - b.order), melhor = docs[0] && nbrPontuacao(docs[0]) > 0 ? docs[0] : null;
  const L = S.inc.importado;
  box.innerHTML = `<div class="row" style="align-items:flex-end">
      <label class="fld" style="flex:1;min-width:260px"><span style="font-size:12px;font-weight:600;color:var(--muted)">Documento com os quadros do RT</span>
        <select id="nbrDoc">${docs.length ? docs.map(d => `<option value="${d.id}"${melhor && d.id === melhor.id ? ' selected' : ''}>${String(d.order).padStart(2, '0')} · ${esc(catNome(d.category))} · ${esc(d.name)}${nbrPontuacao(d) ? ' ★' : ''}</option>`).join('') : '<option value="">Importe os documentos na etapa 1</option>'}</select></label>
      <button class="btn primary" type="button" id="nbrBtn"${docs.length ? '' : ' disabled'}>Importar Quadros I, II e III do PDF</button></div>
    <p class="muted" style="font-size:12px;margin-top:6px">★ = documento onde encontrei os quadros. O programa lê as áreas de cada pavimento e unidade, o coeficiente do RT, o CUB e o custo global, e confere as colunas que o RT calculou com o cálculo daqui.</p>
    ${L ? `<ul class="aud" style="margin-top:8px">${L.msgs.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join('')}</ul>` : ''}`;
}
function casasDe(v){ const m = String(v || '').match(/,(\d+)$/); return m ? m[1].length : 0; }
async function importarQuadrosPDF(docId){
  const d = S.docs.find(x => x.id === docId); if (!d) return;
  let pgs = d.pageIds.map(pageById).filter(Boolean);
  if (!pgs.some(p => p.words && p.words.length)) {
    if (!confirm('Este documento não tem texto com posição (é escaneado ou foi importado numa versão antiga). Rodar o OCR nas páginas para tentar ler os quadros? Em tabela, o OCR pode errar números: confira tudo.')) return;
    await ocrPages(pgs);
  }
  const L = Motor.lerQuadrosNBR(pgs.map(p => ({words:p.words || []})));
  if (!L.q1.length && !L.q2.length) { toast(L.avisos[0], 'err'); S.inc.importado = {msgs:[['err', L.avisos[0]]]}; renderImportNBR(); return; }
  const I = S.inc;
  if ((I.q1.length || I.q2.length) && !confirm('Os Quadros I e II já têm dados. Substituir pelo que foi lido do PDF?')) return;
  I.q1 = L.q1.map(r => Object.assign({id:uid()}, r));
  I.q2 = L.q2.map(r => Object.assign({id:uid()}, r));
  I.pavs = L.q1.map((r, i) => { const us = L.q2.filter(u => u.pav === i); return {id:uid(), nome:r.nome, qtd:r.qtd || '1', und:String(us.length), inicio:us[0] ? us[0].nome : ''}; });
  I.lidosTot = L.totais || null;
  const fis = L.q2.map(u => casasDe(u.fiRT)).filter(Boolean); if (fis.length) I.precFI = String(Math.max(4, Math.min(8, Math.max(...fis))));
  /* casas decimais de cada coluna como o RT escreveu */
  const casas = {}; [...L.q1, ...L.q2].forEach(r => Object.entries(r.lido || {}).forEach(([c, v]) => { if (c === '31') return; casas[c] = Math.max(casas[c] ?? 0, casasDe(v)); }));
  I.casas = Object.assign({}, I.casas || {}, casas);
  /* Quadro III */
  const p3 = pgs.find(p => /QUADRO\s+III\b/i.test(pageText(p)));
  const q3 = p3 ? Motor.lerQuadroIII(pageText(p3)) : {}, q3lidos = [];
  Object.entries(q3).forEach(([k, v]) => { if (v && !String(I.q3[k] || '').trim()) { I.q3[k] = v; q3lidos.push(k); } });
  const R = calcInc(), dif = Motor.conferirQuadrosLidos(R, I.lidosTot);
  const nome = {cub:'CUB', cubMes:'mês do CUB', padrao:'projeto-padrão', v13rt:'custo global (13)'};
  const msgs = [['ok', `Lido de "${d.name}": ${L.q1.length} tipo(s) de pavimento e ${L.q2.length} unidade(s)${q3lidos.length ? '; do Quadro III: ' + q3lidos.map(k => nome[k] + ' ' + (k === 'cubMes' ? I.q3[k].split('-').reverse().join('/') : I.q3[k])).join(', ') : ''}.`]];
  L.avisos.forEach(a => msgs.push(['warn', a]));
  if (dif.arred.length) msgs.push(['warn', `${dif.arred.length} valor(es) com diferença de arredondamento (provável truncamento): ${dif.arred.slice(0, 6).join('; ')}${dif.arred.length > 6 ? '…' : ''}. Avalie se aceita.`]);
  msgs.push(dif.length ? ['err', `${dif.length} valor(es) calculado(s) pelo RT não batem com o cálculo: ${dif.slice(0, 8).join('; ')}${dif.length > 8 ? '…' : ''}`] : ['ok', dif.arred.length ? 'Fora o arredondamento acima, as colunas que o RT calculou batem com o cálculo daqui.' : 'Todas as colunas que o RT calculou (e os totais) batem com o cálculo daqui.']);
  msgs.push(['warn', 'Confira a composição das unidades (vem do memorial) e marque os quadros como conferidos no documento.']);
  I.importado = {doc:d.id, em:new Date().toISOString(), msgs};
  AP().quadros = {linhasQ1:L.q1.length, linhasQ2:L.q2.length, avisos:L.avisos, divergencias:dif.length, quadroIII:q3lidos, paginas:pgs.length, origem:pgs.map(origemPagina)};
  const nc = buscarComposicoes(true); if (nc) msgs.splice(msgs.length - 1, 1, ['warn', `${nc} composição(ões) das unidades vieram do memorial e estão em amarelo no Quadro II: confira e clique em ✓.`]);
  markDirty(); renderInc(); toast(dif.length ? 'Quadros importados, com divergências: veja a lista.' : 'Quadros importados e conferidos com o cálculo.', dif.length ? 'err' : 'ok');
}
/* ---------- composição das unidades a partir do memorial (fica pendente até o usuário confirmar) ---------- */
function buscarComposicoes(silencioso){
  const I = S.inc; if (!I.q2.length) { if (!silencioso) toast('Gere ou importe o Quadro II antes.', 'err'); return 0; }
  const pref = d => d.category === 'MEMORIAL' ? 0 : /memorial/i.test(d.name) ? 1 : /conven/i.test(d.name) ? 2 : 3;
  const docs = [...S.docs].sort((a, b) => pref(a) - pref(b) || a.order - b.order);
  const faltam = I.q2.filter(r => !String(r.comp || '').trim()), nomes = faltam.map(r => r.nome);
  if (!faltam.length) { if (!silencioso) toast('Todas as unidades já têm composição. Para buscar de novo, apague o texto da unidade.'); return 0; }
  let n = 0;
  for (const d of docs) {
    const pgs = d.pageIds.map(pageById).filter(Boolean), txt = pgs.map(pageText).join('\n'); if (!/compost|constitu[íi]d/i.test(txt)) continue;
    const L = Motor.lerComposicoes(txt, faltam.filter(r => !r._achou).map(r => r.nome));
    faltam.forEach(r => { const a = L[r.nome]; if (!a || r._achou) return;
      const pg = pgs.find(p => Motor.chaveComposicao(pageText(p).replace(/\s+/g, ' ')).includes(Motor.chaveComposicao(a.texto).slice(0, 40))) || pgs[0];
      r._achou = true; if (!String(r.comp || '').trim()) { r.comp = a.texto; r.compPend = true; r.compPg = pg ? pg.id : ''; n++; registrarSugestao('comp:' + r.id, a.texto, {regra:'memorial.composicao', fonte:fonteDe(pg && pg.id), contexto:a.trecho}); } });
    if (faltam.every(r => r._achou)) break;
  }
  faltam.forEach(r => delete r._achou);
  if (n) { markDirty(); renderQ2(); recalcInc(); }
  if (!silencioso || n) toast(n ? `${n} composição(ões) lida(s) do memorial: em amarelo até você conferir (✓).` : `Não encontrei a composição de ${nomes.length} unidade(s) nos documentos.`, n ? 'ok' : 'err');
  return n;
}
function bindQuadrosPDF(){
  $('compBusca').onclick = () => buscarComposicoes(false);
  $('nbrImp').addEventListener('click', e => { if (e.target.closest('#nbrBtn')) importarQuadrosPDF($('nbrDoc').value); });
}
