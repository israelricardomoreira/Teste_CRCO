/* Qualificador CRCO — js/matricula.js: leitura automática da matrícula (preenche a ficha e mostra titular, atos e ônus) */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/matricula.js'] = '1.5.0';

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
/* acha onde um valor aparece nas páginas (pelas posições das palavras) para o link de origem abrir no trecho certo */
function localizarNasPaginas(pgs, valor){
  const nz = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\w,./-]/g, '');
  const tk = String(valor || '').split(/\s+/).map(nz).filter(Boolean).slice(0, 5); if (!tk.length) return null;
  for (const p of pgs) {
    const W = p.words || [], nw = W.map(w => nz(w.t));
    for (let i = 0; i < W.length; i++) {
      let ok = true; for (let j = 0; j < tk.length; j++) { const a = nw[i + j]; if (!a || !(a.startsWith(tk[j]) || tk[j].startsWith(a))) { ok = false; break; } }
      if (!ok) continue;
      const ws = W.slice(i, i + tk.length), x = Math.min(...ws.map(w => w.x)), y = Math.min(...ws.map(w => w.y));
      return {pageId:p.id, reg:{x, y, w:Math.max(...ws.map(w => w.x + w.w)) - x, h:Math.max(...ws.map(w => w.y + w.h)) - y}};
    }
  }
  return null;
}
function aplicarMatricula(texto, fonteGED = $('dlgMat')._fonte){
  const R = Motor.lerMatricula(texto);
  if (!R.atos.length && !R.areaNum) { toast('Não reconheci uma matrícula nesse texto. Confira se copiou a abertura (IMÓVEL: …) e os atos (R-/Av-).', 'err'); return false; }
  const f = fonteGED, pid = f && f.pgs[0] ? f.pgs[0].id : '';
  const rotulo = `Matrícula ${R.numero || ''}`.trim() + (pid ? '' : ' (texto colado)');
  const valores = {matricula:R.numero, areaTerreno:R.area, descricao:R.imovel, confrontacao:confrontacoesTexto(R), cep:R.cep, regAnterior:R.ultimoAto};
  const preenchidos = [], mantidos = [];
  const fonte = fonteDe(pid);
  Object.entries(valores).forEach(([k, v]) => {
    if (!v) return;
    const atual = String(S.campos[k] || '').trim();
    registrarSugestao('c:' + k, v, {regra:'matricula.' + k, fonte, contexto:trecho(texto, k === 'confrontacao' ? R.confrontacoes.map(c => c.com)[0] : k === 'regAnterior' ? R.ultimoAtoCompleto : v), naoAplicado:!!atual});
    if (!atual) {
      const busca = k === 'confrontacao' ? 'confrontando' : k === 'regAnterior' ? R.ultimoAtoCompleto : k === 'descricao' ? R.imovel.split(/\s+/).slice(0, 4).join(' ') : v;
      const onde = f ? localizarNasPaginas(f.pgs, busca) : null;
      S.campos[k] = v; S.src['c:' + k] = {pageId:onde ? onde.pageId : pid, label:rotulo, reg:onde ? onde.reg : null}; S.ok['c:' + k] = false; preenchidos.push(k);
    }
    else if (atual !== v) mantidos.push(k);
  });
  S.mat = {R, texto, fonte:rotulo, lidaEm:new Date().toISOString(), ctxTitular:R.titular ? trecho(texto, R.titular.nome) : '', fonteTipo:fonte.tipo};
  markDirty(); renderConfForm(); refreshCertStatus(); renderMatCard();
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
      ${S.mat.texto ? '<button class="btn sm" type="button" data-mattxt="" style="margin-left:auto">Ver o texto lido</button>' : ''}<button class="btn sm" type="button" data-mat="ler"${S.mat.texto ? '' : ' style="margin-left:auto"'}>Ler de novo</button></h3>
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
/* ---------- 1º passo na etapa Documentos: a matrícula ---------- */
function renderMatCard(){
  const c = $('matCard'); if (!c) return;
  const doc = S.docs.find(d => d.category === 'MATRICULA');
  if (S.mat && S.mat.R) {
    const R = S.mat.R, T = R.titular;
    c.className = 'matcard ok';
    c.innerHTML = `<span class="mt">✓ Matrícula ${esc(R.numero || '')}</span><span class="ms">${T ? 'Titular: <b>' + esc(T.nomeAtual || T.nome) + '</b> (' + esc(T.ato) + ')' : ''} · ${R.atos.length} ato(s) · ${R.onusAbertos.length ? '<b class="errt">' + R.onusAbertos.length + ' ônus em aberto</b>' : 'sem ônus em aberto'} · ${esc(fmt(R.areaNum))} m²</span>
      <span style="margin-left:auto;display:flex;gap:8px">${S.mat.texto ? '<button class="btn sm" type="button" data-mc="txt">Ver o texto lido</button>' : ''}<button class="btn sm" type="button" data-mc="ver">Ver na Conferência</button><button class="btn sm" type="button" data-mc="colar">Ler de novo</button></span>`;
  } else {
    c.className = 'matcard';
    c.innerHTML = `<span class="mt">1º · Matrícula do imóvel</span><span class="ms">${doc ? `O documento "${esc(doc.name)}" ainda não foi lido.` : 'Comece por ela: o programa lê a matrícula e já preenche imóvel, titular, ônus e confrontações.'}</span>
      <span style="margin-left:auto;display:flex;gap:8px">${doc ? '<button class="btn sm primary" type="button" data-mc="ler">Ler a matrícula agora</button>' : '<button class="btn sm primary" type="button" data-mc="imp">Importar matrícula (PDF, imagem ou TIFF)</button>'}<button class="btn sm" type="button" data-mc="colar">Colar o texto</button></span>`;
  }
}
async function lerMatriculaDoDoc(doc){
  const pgs = doc.pageIds.map(pageById).filter(Boolean), sem = pgs.filter(p => !pageText(p));
  if (sem.length) await ocrPages(sem);
  const texto = pgs.map(pageText).join('\n');
  if (!texto.trim()) { toast('Não consegui texto da matrícula. Cole o texto pelo botão "Colar o texto".', 'err'); return; }
  if (aplicarMatricula(texto, {doc, pgs})) { if (S.mat.R.numero && /^matr[ií]cula$/i.test(doc.name.trim())) doc.name = 'Matrícula ' + S.mat.R.numero; renderGED(); }
}
async function importarMatricula(files){
  const antes = new Set(S.pages.map(p => p.id));
  await handleFiles(files, {});
  const novas = S.pages.filter(p => !antes.has(p.id) && !p.grouped);
  if (!novas.length) return;
  const doc = addDoc({pageIds:novas.map(p => p.id), category:'MATRICULA', name:'Matrícula', order:1});
  renderGED(); await lerMatriculaDoDoc(doc);
}
function bindMatCard(){
  $('fileMat').onchange = e => { if (e.target.files.length) importarMatricula(e.target.files); e.target.value = ''; };
  $('matCard').addEventListener('click', e => {
    const b = e.target.closest('[data-mc]'); if (!b) return;
    if (b.dataset.mc === 'imp') $('fileMat').click();
    if (b.dataset.mc === 'txt') abrirTextoMatricula('');
    if (b.dataset.mc === 'colar') abrirLeituraMatricula();
    if (b.dataset.mc === 'ler') { const d = S.docs.find(x => x.category === 'MATRICULA'); if (d) lerMatriculaDoDoc(d); }
    if (b.dataset.mc === 'ver') { const d = S.docs.find(x => x.category === 'MATRICULA'); if (d) { CV.docId = d.id; CV.i = 0; } goStep('conf'); }
  });
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
      const np = {id:uid(), papel:S.meta.tipoAto === 'INCORPORACAO' ? 'Incorporador' : 'Transmitente', nome:T.nomeAtual || T.nome, doc:T.doc || ''}; S.partes.push(np);
      registrarSugestao(`p:${np.id}:nome`, np.nome, {regra:'matricula.titular', fonte:{tipo:S.mat.fonteTipo || ''}, contexto:S.mat.ctxTitular || '', ehNome:true});
      if (np.doc) registrarSugestao(`p:${np.id}:doc`, np.doc, {regra:'matricula.titular.doc', fonte:{tipo:S.mat.fonteTipo || ''}, contexto:S.mat.ctxTitular || ''});
      markDirty(); renderConfForm(); toast('Titular adicionado às partes. Ajuste o papel se precisar.');
    }
  });
}

/* ---------- texto da matrícula com o que o programa leu em destaque ---------- */
/* texto da matrícula com o que o programa extraiu em destaque (usado no diálogo e na janela separada) */
function matTextoHTML(){
  if (!S.mat || !S.mat.texto) return '';
  const T = S.mat.texto, R = S.mat.R, faixas = [];
  const marcar = (val, cls, tit, todas) => { if (!val) return; const v = String(val); let i = T.indexOf(v); while (i >= 0) { faixas.push([i, i + v.length, cls, tit]); if (!todas) break; i = T.indexOf(v, i + v.length); } };
  marcar(R.imovel, 'mk-imovel', 'Descrição do imóvel (campo Descrição)');
  if (R.area) { const i0 = T.indexOf(R.imovel); const i = T.indexOf(R.area, Math.max(0, i0)); if (i >= 0) faixas.push([i, i + R.area.length, 'mk-area', 'Área do terreno']); }
  R.confrontacoes.forEach(c => { const i = T.indexOf(c.com); if (i >= 0) faixas.push([i, i + c.com.length, 'mk-conf', 'Confrontação: ' + c.lado]); const j = T.indexOf(c.med, Math.max(0, i)); if (j >= 0) faixas.push([j, j + c.med.length, 'mk-conf', 'Medida: ' + c.lado]); });
  if (R.proprietarioInicial) marcar(R.proprietarioInicial.nome, 'mk-prop', 'Proprietário na abertura');
  if (R.titular) { marcar(R.titular.nome, 'mk-titular', 'Titular atual (' + R.titular.ato + ')', true); marcar(R.titular.doc, 'mk-titular', 'CPF/CNPJ do titular', true); if (R.titular.nomeAtual) marcar(R.titular.nomeAtual, 'mk-titular', 'Nome atual do titular'); }
  marcar(R.cep, 'mk-cep', 'CEP'); marcar(R.cci, 'mk-cep', 'CCI'); marcar(R.inscricao, 'mk-cep', 'Inscrição');
  R.atos.forEach(a => { const lab = a.rot.replace('Av', '(?:AV|Av|av)').replace('R-', 'R-'); const m = T.match(new RegExp('(^|\\n)[\\s\\-–_=]*(' + lab.replace('-', '\\s*-\\s*') + '\\s*-\\s*' + String(R.numero).replace(/\./g, '\\.') + ')')); if (m) { const i = m.index + m[1].length + m[0].slice(m[1].length).indexOf(m[2]); faixas.push([i, i + m[2].length, a.onus ? (a.cancelado ? 'mk-onusok' : 'mk-onus') : 'mk-ato', `${a.rot} · ${a.natureza}${a.onus ? (a.cancelado ? ' · cancelado por ' + a.canceladoPor : ' · ÔNUS EM ABERTO') : ''}`]); }
    if (a.natureza) { const k = T.indexOf(a.natureza, m ? m.index : 0); if (k >= 0) faixas.push([k, k + a.natureza.length, a.onus ? (a.cancelado ? 'mk-onusok' : 'mk-onus') : 'mk-ato', a.rot + ' · natureza']); } });
  faixas.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let html = '', pos = 0;
  faixas.forEach(([i, j, cls, tit]) => { if (i < pos) return; html += esc(T.slice(pos, i)) + `<mark class="${cls}" title="${esc(tit)}">${esc(T.slice(i, j))}</mark>`; pos = j; });
  html += esc(T.slice(pos));
  return html;
}
const MATJAN = {win:null};
function abrirJanelaMatricula(){
  if (!S.mat || !S.mat.texto) { toast('Não há texto de matrícula. Importe ou cole a matrícula no início da etapa Documentos.', 'err'); return; }
  if (MATJAN.win && !MATJAN.win.closed) { MATJAN.win.focus(); MATJAN.win.postMessage({qcrco:'mat'}, location.origin); return; }
  MATJAN.win = window.open('mattxt.html', 'qcrco_matricula', 'width=760,height=980');
  if (!MATJAN.win) { toast('O navegador bloqueou a janela: permita pop-ups deste site.', 'err'); return; }
  if ($('dlgMatTxt').open) $('dlgMatTxt').close();
}
function abrirTextoMatricula(alvo){
  if (!S.mat || !S.mat.texto) { toast('Não há texto guardado desta matrícula (leia de novo para guardar).', 'err'); return; }
  if (MATJAN.win && !MATJAN.win.closed) { MATJAN.win.focus(); MATJAN.win.postMessage({qcrco:'mat', alvo}, location.origin); return; }
  $('matTxtView').innerHTML = matTextoHTML();
  /* sem bloquear a tela: dá para copiar do texto e colar na ficha com ele aberto */
  const dlg = $('dlgMatTxt'); if (!dlg.open) dlg.show();
  const mapa = {'c:areaTerreno':'mk-area', 'c:descricao':'mk-imovel', 'c:confrontacao':'mk-conf', 'c:cep':'mk-cep', 'c:matricula':'mk-ato', 'c:regAnterior':'mk-ato'};
  const cls = mapa[alvo]; let el = cls ? $('matTxtView').querySelector('.' + cls) : null;
  if (alvo === 'c:regAnterior') { const all = $('matTxtView').querySelectorAll('.mk-ato'); el = all[all.length - 1] || el; }
  if (el) { el.classList.add('mk-foco'); setTimeout(() => el.scrollIntoView({block:'center'}), 50); }
}
function bindTextoMatricula(){
  document.addEventListener('click', e => { const b = e.target.closest('[data-mattxt]'); if (b) abrirTextoMatricula(b.dataset.mattxt); });
  $('matTxtFechar').onclick = () => $('dlgMatTxt').close();
  $('matTxtJanela').onclick = abrirJanelaMatricula;
  /* arrastar a caixa do texto da matrícula pelo título (fica onde você deixou) */
  const dlg = $('dlgMatTxt'), alca = dlg.querySelector('.row');
  try { const pos = JSON.parse(localStorage.getItem('qcrco_matpos') || 'null'); if (pos) Object.assign(dlg.style, {left:pos.l + 'px', top:pos.t + 'px', right:'auto', bottom:'auto'}); } catch (e) {}
  alca.style.cursor = 'move';
  alca.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = dlg.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; alca.setPointerCapture(e.pointerId);
    const mv = ev => { const l = Math.max(0, Math.min(innerWidth - 120, ev.clientX - dx)), t = Math.max(0, Math.min(innerHeight - 60, ev.clientY - dy)); Object.assign(dlg.style, {left:l + 'px', top:t + 'px', right:'auto', bottom:'auto'}); };
    const up = () => { alca.removeEventListener('pointermove', mv); alca.removeEventListener('pointerup', up); const r2 = dlg.getBoundingClientRect(); try { localStorage.setItem('qcrco_matpos', JSON.stringify({l:Math.round(r2.left), t:Math.round(r2.top)})); } catch (e) {} };
    alca.addEventListener('pointermove', mv); alca.addEventListener('pointerup', up); });
  $('cMatTxt').onclick = () => abrirTextoMatricula('');
}
