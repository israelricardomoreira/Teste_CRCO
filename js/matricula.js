/* Qualificador CRCO — js/matricula.js: leitura automática da matrícula (preenche a ficha e mostra titular, atos e ônus) */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/matricula.js'] = '1.1.0';

/* Texto da matrícula: documento MATRICULA do GED (ou o que está aberto na Conferência), senão o usuário cola */
function matTextoDoGED(){
  const atual = S.docs.find(d => d.id === CV.docId);
  const doc = (atual && atual.category === 'MATRICULA') ? atual : S.docs.find(d => d.category === 'MATRICULA');
  if (!doc) return null;
  const pgs = doc.pageIds.map(pageById).filter(Boolean);
  return {doc, pgs, texto:pgs.map(pageText).join('\n')};
}
function abrirLeituraMatricula(){
  const g = matTextoDoGED(), dlg = $('dlgMat');
  dlg._fonte = g && g.texto.trim() ? g : null;
  $('matTxt').value = dlg._fonte ? g.texto : '';
  $('matFonte').textContent = dlg._fonte ? `Texto do documento "${g.doc.name}" (${g.pgs.length} pág.). Confira se está completo; se a matrícula for escaneada, rode o OCR antes.`
    : (g ? `O documento "${g.doc.name}" não tem texto: rode o OCR nele na Conferência, ou cole o texto aqui.` : 'Cole aqui o texto da matrícula (copiado do sistema ou do PDF).');
  dlg.showModal(); setTimeout(() => $('matTxt').focus(), 30);
}
function confrontacoesTexto(R){
  const nome = {'frente':'Frente', 'fundo':'Fundo', 'fundos':'Fundos', 'lado direito':'Lado direito', 'lado esquerdo':'Lado esquerdo'};
  return R.confrontacoes.map(c => `${nome[c.lado] || c.lado}: ${c.com}, ${c.med} m`).join('; ');
}
function aplicarMatricula(texto){
  const R = Motor.lerMatricula(texto);
  if (!R.atos.length && !R.areaNum) { toast('Não reconheci uma matrícula nesse texto. Confira se copiou a abertura (IMÓVEL: …) e os atos (R-/Av-).', 'err'); return false; }
  const f = $('dlgMat')._fonte, pid = f && f.pgs[0] ? f.pgs[0].id : '';
  const rotulo = `Matrícula ${R.numero || ''}`.trim() + (pid ? '' : ' (texto colado)');
  const valores = {matricula:R.numero, areaTerreno:R.area, descricao:R.imovel, confrontacao:confrontacoesTexto(R), cep:R.cep, regAnterior:R.ultimoAto};
  const preenchidos = [], mantidos = [];
  Object.entries(valores).forEach(([k, v]) => {
    if (!v) return;
    const atual = String(S.campos[k] || '').trim();
    if (!atual) { S.campos[k] = v; S.src['c:' + k] = {pageId:pid, label:rotulo}; S.ok['c:' + k] = false; preenchidos.push(k); }
    else if (atual !== v) mantidos.push(k);
  });
  S.mat = {R, fonte:rotulo, lidaEm:new Date().toISOString()};
  markDirty(); renderConfForm(); refreshCertStatus();
  const nomes = k => (CAMPOS.find(c => c.k === k) || {l:k}).l;
  toast(`Matrícula lida: ${preenchidos.length} campo(s) preenchido(s)` + (mantidos.length ? `; mantive o que já estava em ${mantidos.map(nomes).join(', ')} (veja o resumo).` : '. Confira e marque "conferido".'));
  return true;
}
function matSituacao(a){
  if (a.onus && a.cancelado) return `<span class="badge ok">cancelado (${esc(a.canceladoPor)})</span>`;
  if (a.onus) return '<span class="badge err">em aberto</span>';
  if (a.adquirente) return `<span class="badge warn">transmissão → ${esc(a.adquirente)}</span>`;
  return '';
}
/* Cartão no topo da ficha de conferência */
function matResumoHTML(){
  if (!S.mat || !S.mat.R) return `<div class="row" style="margin-bottom:12px"><button class="btn" type="button" data-mat="ler">📄 Ler matrícula e preencher a ficha</button><span class="muted" style="font-size:12px">Usa o documento MATRICULA do GED ou o texto colado.</span></div>`;
  const R = S.mat.R, T = R.titular, cruz = Motor.cruzarMatricula(R, S.campos, S.partes);
  const dif = [['matricula', R.numero], ['cep', R.cep], ['regAnterior', R.ultimoAto]]
    .filter(([k, v]) => v && S.campos[k] && String(S.campos[k]).trim() !== v)
    .map(([k, v]) => ['warn', `${(CAMPOS.find(c => c.k === k) || {l:k}).l}: na ficha "${S.campos[k]}", na matrícula "${v}".`]);
  const temParte = T && S.partes.some(p => (T.doc && onlyDigits(p.doc) === onlyDigits(T.doc)) || String(p.nome || '').toUpperCase() === String(T.nome).toUpperCase());
  return `<h3 class="grp-h">Matrícula nº ${esc(R.numero || '—')} <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">· ${esc(S.mat.fonte)}</span>
      <button class="btn sm" type="button" data-mat="ler" style="margin-left:auto">Ler de novo</button></h3>
    <div class="fgrid" style="margin-bottom:8px">
      <div class="fld"><label>Titular atual</label><div><b>${esc(T ? (T.nomeAtual || T.nome) : '—')}</b>${T && T.doc ? `<br><small>${esc(T.doc)} · ${docStatus(T.doc)}</small>` : ''}${T ? `<br><small class="muted">desde ${esc(T.ato)}</small>` : ''}</div>
        ${T && !temParte ? `<button class="btn sm" type="button" data-mat="parte" style="margin-top:4px">+ Adicionar como parte</button>` : ''}</div>
      <div class="fld"><label>Na abertura</label><div>${esc(R.proprietarioInicial ? R.proprietarioInicial.nome : '—')}<br><small class="muted">aberta em ${esc(fmtDate(R.abertura) || '—')}</small></div></div>
      <div class="fld wide"><label>Registro anterior (abertura)</label><div style="font-size:13px">${esc(R.registroAnterior || '—')}</div></div>
    </div>
    <ul class="aud" style="margin-bottom:8px">${cruz.concat(dif).map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join('')}</ul>
    <details style="margin-bottom:8px"><summary style="cursor:pointer;font-weight:600;font-size:13px">${R.atos.length} ato(s) na matrícula${R.cci ? ` · CCI ${esc(R.cci)}` : ''}${R.inscricao ? ` · inscrição ${esc(R.inscricao)}` : ''}</summary>
      <table class="lt" style="margin-top:6px"><thead><tr><th>Ato</th><th>Natureza</th><th>Protocolo</th><th>Data</th><th>Situação</th></tr></thead><tbody>
      ${R.atos.map(a => `<tr><td style="white-space:nowrap"><b>${esc(a.rot)}</b></td><td>${esc(a.natureza)}</td><td>${esc(a.protocolo)}${a.dataProt ? `<br><small class="muted">${esc(a.dataProt)}</small>` : ''}</td><td>${esc(fmtDate(a.data))}</td><td>${matSituacao(a)}</td></tr>`).join('')}
      </tbody></table></details>`;
}
function bindMatricula(){
  $('cMat').onclick = abrirLeituraMatricula;
  $('fMat').addEventListener('submit', e => {
    if (!e.submitter || e.submitter.value !== 'ok') return;
    if (!aplicarMatricula($('matTxt').value)) e.preventDefault();
  });
  $('confForm').addEventListener('click', e => {
    const b = e.target.closest('[data-mat]'); if (!b) return;
    if (b.dataset.mat === 'ler') abrirLeituraMatricula();
    if (b.dataset.mat === 'parte' && S.mat && S.mat.R.titular) {
      const T = S.mat.R.titular;
      S.partes.push({id:uid(), papel:S.meta.tipoAto === 'INCORPORACAO' ? 'Incorporador' : 'Transmitente', nome:T.nomeAtual || T.nome, doc:T.doc || ''});
      markDirty(); renderConfForm(); toast('Titular adicionado às partes. Ajuste o papel se precisar.');
    }
  });
}
