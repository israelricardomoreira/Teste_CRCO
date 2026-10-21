/* Qualificador CRCO — js/aprendizado.js: registra o que o sistema sugeriu × o que ficou, perfis dos documentos,
 * checklist, exigências e tempos, e baixa tudo ANONIMIZADO num .json separado (junto com o ZIP do GED).
 * Serve para melhorar a leitura dos documentos a cada versão. Nada é enviado: o arquivo só é baixado. */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/aprendizado.js'] = '1.4.0';

function freshAprend(){ return {inicio:new Date().toISOString(), sug:{}, manual:{}, notas:[], tempos:{}, ckModelo:null}; }
function AP(){ if (!S.aprend) S.aprend = freshAprend(); return S.aprend; }
function trecho(texto, valor, r = 140){
  const t = String(texto || ''); if (!t || !valor) return '';
  let i = t.indexOf(valor); if (i < 0) { const v = String(valor).slice(0, 25); i = v ? t.indexOf(v) : -1; } if (i < 0) return '';
  return t.slice(Math.max(0, i - r), Math.min(t.length, i + String(valor).length + r)).replace(/\s+/g, ' ');
}
/* chamado pelos leitores automáticos (hoje: matrícula) */
function registrarSugestao(chave, valor, info){ AP().sug[chave] = Object.assign({valor:String(valor || ''), em:new Date().toISOString()}, info || {}); }
/* chamado quando o usuário insere um dado a partir do texto (seleção ou chip) */
function registrarManual(bind, valor, info){ AP().manual[bind] = Object.assign({valor:String(valor || ''), em:new Date().toISOString()}, info || {}); }
/* tempo em cada etapa (limitado a 15 min por trecho, para não contar tela parada) */
function aprendTrocaEtapa(nova){
  const A = AP(), agora = Date.now();
  if (A._t && A._etapa) A.tempos[A._etapa] = (A.tempos[A._etapa] || 0) + Math.min(agora - A._t, 15 * 60000);
  A._t = agora; A._etapa = nova;
}
function origemPagina(p){ return p.raw ? 'pdf-texto' : p.ocr ? 'ocr' : 'sem-texto'; }
function fonteDe(pageId){
  const p = pageId ? pageById(pageId) : null; if (!p) return {tipo:'colado'};
  const d = S.docs.find(x => x.pageIds.includes(p.id));
  return {tipo:origemPagina(p), arquivo:(p.name.match(/\.(\w+)(?: · p\d+)?$/) || [, p.type])[1].toLowerCase(), categoria:d ? d.category : '(solta)', pagina:d ? d.pageIds.indexOf(p.id) + 1 : 1, ocrConf:p.ocrConf ?? null};
}
const normCmp = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
function valorFinal(chave){
  const [t, a, k] = chave.split(':');
  if (t === 'c') return S.campos[a] ?? '';
  if (t === 'p') { const p = S.partes.find(x => x.id === a); return p ? p[k] ?? '' : null; }
  return null;
}
function situacao(sug, final, chave){
  if (sug.naoAplicado) return normCmp(final) === normCmp(sug.valor) ? 'igual (já estava)' : 'mantido o valor anterior';
  if (final === null) return 'removido';
  if (!String(final).trim()) return 'apagado';
  return normCmp(final) === normCmp(sug.valor) ? 'igual' : 'corrigido';
}
function nomesParaAnonimizar(){
  const n = [S.meta.qualificador, S.campos.incNome, S.campos.rtNome, ...S.partes.map(p => p.nome)];
  if (S.mat && S.mat.R) { const R = S.mat.R; n.push(R.titular && R.titular.nome, R.titular && R.titular.nomeAtual, R.proprietarioInicial && R.proprietarioInicial.nome, ...R.atos.map(a => a.adquirente)); }
  Object.values(AP().sug).forEach(s => { if (s.ehNome) n.push(s.valor); });
  return n.filter(Boolean);
}
function montarAprendizado(){
  aprendTrocaEtapa(curStep);
  const A = AP(), an = Motor.criarAnonimizador(nomesParaAnonimizar());
  const rot = k => { const [t, a, c] = k.split(':'); if (t === 'c') return (CAMPOS.find(f => f.k === a) || {l:a}).l; if (t === 'p') return 'Parte · ' + c; return k; };
  const campos = Object.entries(A.sug).map(([k, s]) => {
    const f = valorFinal(k);
    return {campo:k, rotulo:rot(k), sugerido:s.valor, final:f, situacao:situacao(s, f, k), regra:s.regra || '', fonte:s.fonte || {}, contexto:s.contexto || '', conferido:!!S.ok[k]};
  });
  if (S.mat && S.mat.R && S.mat.R.titular && !Object.values(A.sug).some(s => s.regra === 'matricula.titular')) {
    const T = S.mat.R.titular, ref = S.partes.filter(p => /Transmitente|Incorporador|Propriet|Devedor/i.test(p.papel || ''));
    const alvo = ref.find(p => T.doc && onlyDigits(p.doc) === onlyDigits(T.doc)) || ref[0];
    [['nome', T.nomeAtual || T.nome], ['doc', T.doc || '']].forEach(([c, v]) => { if (!v) return; const f = alvo ? alvo[c] : null;
      campos.push({campo:'mat:titular.' + c, rotulo:'Titular atual lido × parte do título', sugerido:v, final:f, situacao:!alvo ? 'sem parte para comparar' : normCmp(f) === normCmp(v) ? 'igual' : 'diferente da parte', regra:'matricula.titular', fonte:{tipo:S.mat.fonteTipo || ''}, contexto:S.mat.ctxTitular || '', conferido:false}); });
  }
  const manuais = Object.entries(A.manual).filter(([k]) => !A.sug[k]).map(([k, m]) => ({campo:k, rotulo:rot(k), valor:m.valor, final:valorFinal(k), como:m.como || '', fonte:m.fonte || {}, contexto:m.contexto || ''}));
  const vazios = CAMPOS.filter(f => (!f.inc || S.meta.tipoAto === 'INCORPORACAO') && !String(S.campos[f.k] || '').trim()).map(f => f.l);
  const documentos = [...S.docs].sort((a, b) => a.order - b.order).map(d => {
    const pgs = d.pageIds.map(pageById).filter(Boolean), txt = pgs.map(pageText).join('\n'), conf = pgs.map(p => p.ocrConf).filter(x => x != null);
    return {ordem:d.order, categoria:d.category, paginas:pgs.length,
      origem:pgs.reduce((o, p) => { const k = origemPagina(p); o[k] = (o[k] || 0) + 1; return o; }, {}),
      arquivos:[...new Set(pgs.map(p => (p.name.match(/\.(\w+)(?: · p\d+)?$/) || [, p.type])[1].toLowerCase()))],
      assinado:pgs.some(p => p.hasSig), ocrConfMedia:conf.length ? Math.round(conf.reduce((a, b) => a + b, 0) / conf.length) : null,
      validade:d.validade ? (d.validade < refDate() ? 'vencido' : 'válido') : '', perfil:Motor.perfilTexto(txt)};
  });
  const soltas = S.pages.filter(p => !p.grouped), confS = soltas.map(p => p.ocrConf).filter(x => x != null);
  const paginasSoltas = {quantidade:soltas.length, origem:soltas.reduce((o, p) => { const k = origemPagina(p); o[k] = (o[k] || 0) + 1; return o; }, {}),
    ocrConfMedia:confS.length ? Math.round(confS.reduce((a, b) => a + b, 0) / confS.length) : null};
  let matricula = null;
  if (S.mat && S.mat.R) {
    const R = S.mat.R;
    matricula = {lidaDe:S.mat.fonte, numeroLido:!!R.numero, areaLida:!!R.areaNum, confrontacoesLidas:R.confrontacoes.length, cepLido:!!R.cep,
      atos:R.atos.map(a => ({rot:a.rot, natureza:a.natureza, temProtocolo:!!a.protocolo, temData:!!a.data, onus:!!a.onus, cancelado:a.cancelado, transmissao:!!a.adquirente})),
      titularAto:R.titular ? R.titular.ato : '', titularComDoc:!!(R.titular && R.titular.doc), onusAbertos:R.onusAbertos, alertas:R.alertas,
      cruzamento:Motor.cruzarMatricula(R, S.campos, S.partes)};
  }
  const modelo = A.ckModelo || [], finais = S.checklist.map(i => i.texto);
  const checklist = {tipoAto:S.meta.tipoAto, itens:S.checklist.length,
    adicionados:finais.filter(t => !modelo.includes(t)), removidos:modelo.filter(t => !finais.includes(t)),
    situacao:S.checklist.reduce((o, i) => { o[i.status] = (o[i.status] || 0) + 1; return o; }, {}),
    exigenciaEm:S.checklist.filter(i => i.status === 'exig').map(i => i.texto)};
  const exigencias = S.exig.map(e => ({origem:e.itemId ? 'checklist' : (e.ref || 'manual'), sugerido:e.sugerido || '', final:e.texto, editada:!!e.sugerido && normCmp(e.sugerido) !== normCmp(e.texto), fundamento:e.fund || ''}));
  let incorporacao = null;
  if (S.meta.tipoAto === 'INCORPORACAO' && S.inc.q2.length) {
    const R = calcInc();
    incorporacao = {unidades:R.q2.length, tiposPavimento:R.q1.length, blocos:!!S.inc.blOn, precisaoFI:R.p, coefRTLancado:R.q2.filter(x => String(x.r.fiRT || '').trim()).length,
      auditoria:auditoria(R).map(([c, t]) => ({c, t})), minutaGerada:!!($('minMae') && $('minMae').textContent.trim())};
  }
  const tipos = {}; let pgConf = 0, notasExig = 0;
  Object.values(S.anot || {}).forEach(A => { if (A.conferida) pgConf++; (A.itens || []).forEach(i => { const k = i.t === 'hl' ? 'hl-' + i.cor : i.t; tipos[k] = (tipos[k] || 0) + 1; if (i.t === 'nota' && i.exigId) notasExig++; }); });
  const ptsTipo = {}, ptsOk = {}; S.pages.forEach(p => { const A = (S.anot || {})[chaveDe(p)] || {}; pontosConferir(p).forEach(o => { const k = o.id.split(':')[0]; ptsTipo[k] = (ptsTipo[k] || 0) + 1; if (A.pontos && A.pontos[o.id]) ptsOk[k] = (ptsOk[k] || 0) + 1; }); });
  Object.values(S.anot || {}).forEach(A => (A.itens || []).forEach(i => { if (i.t === 'traco') { const k = 'traco-' + i.modo; tipos[k] = (tipos[k] || 0) + 1; } }));
  const anotacoes = {paginasConferidas:pgConf, totalPaginas:S.pages.length, marcacoes:tipos, notasQueViraramExigencia:notasExig, pontosMarcados:ptsTipo, pontosConfirmados:ptsOk,
    capturas:Object.values(A.manual).filter(m => /^captura/.test(m.como || '')).length};
  const bruto = {campos, manuais, documentos, paginasSoltas, anotacoes, quadros:A.quadros || null, matricula, checklist, exigencias, incorporacao, notas:A.notas};
  const limpo = Motor.anonimizarObjeto(bruto, an);
  let h = 5381; const sem = (S.meta.protocolo || '') + A.inicio; for (let i = 0; i < sem.length; i++) h = ((h << 5) + h + sem.charCodeAt(i)) | 0;
  return Object.assign({formato:'qualificador-crco/aprendizado', versaoFormato:1, app:VERSAO, motor:Motor.VERSAO, geradoEm:new Date().toISOString(),
    analise:'A' + (h >>> 0).toString(36), tipoAto:S.meta.tipoAto, anonimizado:true, anonimizacao:an.total(),
    tempoMin:Object.fromEntries(Object.entries(A.tempos).map(([k, v]) => [k, Math.round(v / 6000) / 10])),
    resumo:{sugeridos:campos.length, iguais:campos.filter(c => c.situacao === 'igual').length, corrigidos:campos.filter(c => c.situacao === 'corrigido').length,
      apagados:campos.filter(c => c.situacao === 'apagado').length, inseridosManualmente:manuais.length, camposVazios:vazios.length, notas:A.notas.length},
    camposVazios:vazios}, limpo);
}
function baixarAprendizado(){
  try {
    const o = montarAprendizado(), d = new Date(), hm = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
    download(new Blob([JSON.stringify(o, null, 1)], {type:'application/json'}), `aprendizado_${todayISO()}_${hm}_${o.analise}.json`);
  } catch (e) { console.error(e); toast('Não consegui gerar o arquivo de aprendizado: ' + e.message, 'err'); }
}
function bindAprendizado(){
  $('confForm').addEventListener('click', e => {
    const b = e.target.closest('[data-flag]'); if (!b) return;
    const k = b.dataset.flag, nota = window.prompt('O que está errado neste dado? (vai no arquivo de aprendizado, anonimizado)');
    if (!nota || !nota.trim()) return;
    AP().notas.push({campo:k, valorNaTela:String(valorFinal(k) ?? ''), nota:nota.trim(), em:new Date().toISOString()});
    b.classList.add('on'); markDirty(); toast('Anotado para o aprendizado.');
  });
  $('btnAprend').onclick = baixarAprendizado;
  document.addEventListener('visibilitychange', () => { if (document.hidden) aprendTrocaEtapa(null); else aprendTrocaEtapa(curStep); });
}
