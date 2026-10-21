/* Qualificador CRCO — js/leitor.js: leitor de páginas com ferramentas de análise.
 * Usado na Conferência, no "Comparar" e nas janelas separadas (visor.html). Não depende dos outros arquivos:
 * conversa com o programa pelo objeto H (HOST da janela principal), então funciona igual em qualquer janela. */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/leitor.js'] = '1.4.0';

window.Leitor = (function(){
  const VERSAO = '1.4.0';
  const PALETA = ['#ffd600', '#7ed957', '#ff6b6b', '#4da3ff', '#ff9f1a', '#ff66c4', '#1d4f91', '#13703f', '#b42318', '#111111'];
  const FERR = [
    ['mao', '✋', 'Mão: arrastar a página e marcar pontos a conferir', 'v'],
    ['marca', '🖍', 'Marca-texto livre (cor e tamanho ajustáveis)', 'h'],
    ['caneta', '✒', 'Caneta livre (cor e espessura ajustáveis)', 'p'],
    ['risco', '✎', 'Riscar em linha reta o que já leu', 'r'],
    ['ok', '☑', 'Bloco conferido (confere também os pontos dentro dele)', 'b'],
    ['nota', '📌', 'Nota adesiva (pode virar exigência)', 'n'],
    ['cap', '✂', 'Capturar texto da imagem para o campo ativo', 't'],
    ['bor', '⌫', 'Borracha', 'e']];
  const ESTILO_PADRAO = {marca:{cor:'#ffd600', tam:18}, caneta:{cor:'#1d4f91', tam:3}, risco:{cor:'#13703f', tam:3}};
  const FILTROS = ['none', 'contrast(170%) brightness(96%)', 'grayscale(100%) contrast(220%)'];
  const NOME_FILTRO = ['Contraste', 'Realce', 'P&B'];
  const CORES_HL = {am:'rgba(255,214,0,.40)', vd:'rgba(46,170,90,.32)', vm:'rgba(230,50,50,.30)'};
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const uidL = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ATALHOS = [['V', 'Mão'], ['H', 'Marca-texto'], ['P', 'Caneta'], ['R', 'Riscar'], ['B', 'Bloco conferido'], ['N', 'Nota'], ['T', 'Capturar texto'], ['E', 'Borracha'],
    ['C', 'Página conferida'], ['← →  /  PgUp PgDn', 'Página anterior/próxima (passa para o próximo documento)'], ['Ctrl + roda do mouse', 'Zoom'], ['+ / −', 'Zoom'],
    ['Ctrl + Z', 'Desfazer'], ['/', 'Buscar'], ['[ / ]', 'Diminuir/aumentar o tamanho do marca-texto ou caneta']];
  /* coordenadas: tudo é guardado no espaço da página ORIGINAL (0..1) e convertido para a página girada só para desenhar */
  function o2r(x, y, r){ switch (r) { case 90: return [1 - y, x]; case 180: return [1 - x, 1 - y]; case 270: return [y, 1 - x]; default: return [x, y]; } }
  function r2o(u, v, r){ switch (r) { case 90: return [v, 1 - u]; case 180: return [1 - u, 1 - v]; case 270: return [1 - v, u]; default: return [u, v]; } }
  function rect(conv, a, r){ const [x1, y1] = conv(a.x, a.y, r), [x2, y2] = conv(a.x + a.w, a.y + a.h, r); return {x:Math.min(x1, x2), y:Math.min(y1, y2), w:Math.abs(x2 - x1), h:Math.abs(y2 - y1)}; }
  function textoDaArea(words, R){
    const ws = (words || []).filter(w => { const cx = w.x + w.w / 2, cy = w.y + w.h / 2; return cx >= R.x && cx <= R.x + R.w && cy >= R.y && cy <= R.y + R.h; })
      .sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
    const linhas = [];
    ws.forEach(w => { const cy = w.y + w.h / 2, L = linhas.find(l => Math.abs(l.cy - cy) < Math.max(w.h, l.h) * .55); if (L) L.ws.push(w); else linhas.push({cy, h:w.h, ws:[w]}); });
    return linhas.sort((a, b) => a.cy - b.cy).map(l => l.ws.sort((a, b) => a.x - b.x).map(w => w.t).join(' ')).join('\n').trim();
  }
  const distSeg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
  const dentro = (pt, R) => pt.x + pt.w / 2 >= R.x && pt.x + pt.w / 2 <= R.x + R.w && pt.y + pt.h / 2 >= R.y && pt.y + pt.h / 2 <= R.y + R.h;

  function criar(raiz, H, opts = {}){
    const st = opts.st || {docId:'', i:0};
    const doc = raiz.ownerDocument, win = doc.defaultView;
    let estilo; try { estilo = Object.assign({}, ESTILO_PADRAO, JSON.parse(win.localStorage.getItem('qcrco_estilo') || '{}')); } catch (e) { estilo = Object.assign({}, ESTILO_PADRAO); }
    const U = {modo:'largura', z:1, ferr:'mao', filtro:0, regua:false, txt:false, pontos:true, hits:[], busca:'', destaque:null, prev:null, desfazer:{}, img:null, imgId:'', hi:null, W:0, Hh:0, r:0, pop:null, pts:[]};
    const principal = opts.janela === 'principal', compacto = !!opts.compacto;
    raiz.classList.add('leitor'); raiz.dataset.ferr = U.ferr;
    raiz.innerHTML = `
      <div class="lt-bar" role="toolbar" aria-label="Ferramentas do documento">
        <div class="grp"><button class="lt-b" data-a="docant" type="button" title="Documento anterior" aria-label="Documento anterior">⏮</button><select class="lt-doc" aria-label="Documento"></select><button class="lt-b" data-a="docprox" type="button" title="Próximo documento" aria-label="Próximo documento">⏭</button>
          <button class="lt-b" data-a="ant" type="button" title="Página anterior (←) — na primeira, vai para o documento anterior" aria-label="Página anterior">‹</button><span class="lt-cnt">–</span><button class="lt-b" data-a="prox" type="button" title="Próxima página (→) — na última, vai para o próximo documento" aria-label="Próxima página">›</button></div>
        <div class="grp">${FERR.map(f => `<button class="lt-b" data-f="${f[0]}" type="button" title="${h(f[2])} (${f[3].toUpperCase()})" aria-label="${h(f[2])}" aria-pressed="${f[0] === U.ferr}">${f[1]}</button>`).join('')}
          <button class="lt-b" data-a="desf" type="button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">↶</button></div>
        <div class="grp lt-estilo" hidden>${PALETA.map(c => `<button class="lt-sw" data-cor="${c}" type="button" title="Cor ${c}" aria-label="Cor ${c}" style="background:${c}"></button>`).join('')}
          <input type="color" class="lt-corlivre" title="Outra cor" aria-label="Escolher outra cor">
          <input type="range" class="lt-tam" min="1" max="60" step="1" title="Tamanho ([ e ])" aria-label="Tamanho do traço"><span class="lt-tamv"></span></div>
        <div class="grp"><button class="lt-b" data-a="zm" type="button" title="Diminuir zoom (− ou Ctrl + roda do mouse)" aria-label="Diminuir zoom">−</button><span class="lt-zv" title="Zoom: Ctrl + roda do mouse">100%</span><button class="lt-b" data-a="zp" type="button" title="Aumentar zoom (+ ou Ctrl + roda do mouse)" aria-label="Aumentar zoom">+</button>
          <button class="lt-b" data-a="larg" type="button" title="Ajustar à largura" aria-pressed="true">↔</button><button class="lt-b" data-a="pag" type="button" title="Página inteira">⤢</button>
          <button class="lt-b" data-a="gir" type="button" title="Girar a página">↻</button><button class="lt-b lt-fil" data-a="fil" type="button" title="Contraste para escaneado">◐</button>
          <button class="lt-b" data-a="reg" type="button" title="Régua de leitura" aria-pressed="false">▭</button><button class="lt-b" data-a="pts" type="button" title="Mostrar os pontos a conferir que o programa marcou" aria-pressed="true">👁 Pontos</button></div>
        <div class="grp lt-busca"><input type="search" placeholder="Buscar no documento" aria-label="Buscar no documento"><span class="lt-bres"></span></div>
        <div class="grp" style="border:0"><button class="lt-b lt-conf" data-a="conf" type="button" title="Marcar a página como conferida (C)" aria-pressed="false">✓ Conferida</button><span class="lt-prog"></span>
          ${principal ? `<button class="lt-b" data-a="comp" type="button" title="Comparar com outra página lado a lado" aria-pressed="false">⇆ Comparar</button><button class="lt-b" data-a="jan" type="button" title="Abrir este documento numa janela que acompanha a ficha (para o monitor em pé)">⧉ Outra janela</button>` : ''}
          ${compacto ? '' : `<button class="lt-b" data-a="nova" type="button" title="Abrir mais uma janela independente (para comparar documentos)">＋⧉</button>`}
          ${compacto ? `<button class="lt-b" data-a="fechar" type="button" title="Fechar a comparação">✕</button>` : ''}
          <button class="lt-b" data-a="ajuda" type="button" title="Atalhos de teclado" aria-label="Atalhos de teclado">⌨</button></div>
      </div>
      <div class="lt-area" tabindex="0"><div class="lt-pg"><canvas></canvas><div class="lt-regua" hidden></div><div class="lt-pop" hidden></div></div><div class="lt-vazio" hidden></div></div>
      ${compacto ? '' : `<div class="lt-gav">
        <div class="lt-linha"><button class="lt-b" data-a="txt" type="button" aria-pressed="false" title="Mostrar o texto da página">Texto ▾</button><div class="lt-chips" aria-label="Dados detectados na página"></div></div>
        <div class="lt-txtbox" hidden><div class="lt-txt" tabindex="0"></div>
          <div class="lt-linha"><button class="lt-b lt-pri" data-a="usar" type="button">Inserir seleção no campo ativo →</button><button class="lt-b" data-a="ocr" type="button">OCR desta página</button><button class="lt-b" data-a="ocrd" type="button">OCR do documento</button></div></div>
        <div class="lt-hint"></div></div>`}`;
    const q = s => raiz.querySelector(s);
    const area = q('.lt-area'), pg = q('.lt-pg'), cv = q('canvas'), ctx = cv.getContext('2d'), regua = q('.lt-regua'), pop = q('.lt-pop'), vazio = q('.lt-vazio');

    function aviso(msg, tipo){ if (H.janela === win) { H.toast(msg, tipo); return; } const t = doc.createElement('div'); t.className = 'toast' + (tipo === 'err' ? ' err' : ''); t.textContent = msg; (doc.getElementById('toasts') || doc.body).appendChild(t); setTimeout(() => t.remove(), 4000); }
    const paginas = () => H.pagesDoDoc(st.docId);
    const pagina = () => { const ps = paginas(); if (st.i >= ps.length) st.i = Math.max(0, ps.length - 1); return ps[st.i] || null; };
    const anot = p => H.anotDe(p);
    const salvarEstilo = () => { try { win.localStorage.setItem('qcrco_estilo', JSON.stringify(estilo)); } catch (e) {} };
    const temEstilo = () => ['marca', 'caneta', 'risco'].includes(U.ferr);

    function barra(){
      const ops = H.docOpcoes(), sel = q('.lt-doc'), html = ops.map(o => `<option value="${h(o.id)}">${h(o.rotulo)}</option>`).join('') || '<option value="">Nenhum documento</option>';
      if (sel.innerHTML !== html) sel.innerHTML = html;
      if (!ops.some(o => o.id === st.docId)) { st.docId = ops[0] ? ops[0].id : ''; st.i = 0; }
      sel.value = st.docId;
      const di = ops.findIndex(o => o.id === st.docId), ps = paginas(), p = pagina();
      q('.lt-cnt').textContent = ps.length ? `${st.i + 1}/${ps.length}` : '–';
      q('[data-a="ant"]').disabled = st.i <= 0 && di <= 0; q('[data-a="prox"]').disabled = st.i >= ps.length - 1 && di >= ops.length - 1;
      q('[data-a="docant"]').disabled = di <= 0; q('[data-a="docprox"]').disabled = di < 0 || di >= ops.length - 1;
      const A = p ? anot(p) : null, nconf = ps.filter(x => anot(x).conferida).length;
      q('.lt-conf').setAttribute('aria-pressed', String(!!(A && A.conferida))); q('.lt-conf').disabled = !p;
      const pts = p ? pontos(p) : [], pok = pts.filter(x => A.pontos && A.pontos[x.id]).length;
      q('.lt-prog').innerHTML = ps.length ? `${nconf}/${ps.length} págs conferidas${pts.length ? ` · <span title="Pontos a conferir nesta página">${pok}/${pts.length} pontos</span>` : ''}` : '';
      q('.lt-prog').className = 'lt-prog' + (ps.length && nconf === ps.length ? ' tudo' : '');
      raiz.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === U.ferr)));
      q('.lt-estilo').hidden = !temEstilo();
      if (temEstilo()) { const e = estilo[U.ferr]; raiz.querySelectorAll('[data-cor]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cor.toLowerCase() === e.cor.toLowerCase()))); q('.lt-corlivre').value = e.cor; q('.lt-tam').value = e.tam; q('.lt-tamv').textContent = e.tam + ' px'; }
      q('[data-a="larg"]').setAttribute('aria-pressed', String(U.modo === 'largura')); q('[data-a="pag"]').setAttribute('aria-pressed', String(U.modo === 'pagina'));
      q('.lt-fil').textContent = U.filtro ? NOME_FILTRO[U.filtro] : '◐'; q('.lt-fil').setAttribute('aria-pressed', String(!!U.filtro));
      q('[data-a="reg"]').setAttribute('aria-pressed', String(U.regua)); regua.hidden = !U.regua;
      q('[data-a="pts"]').setAttribute('aria-pressed', String(U.pontos));
      raiz.dataset.ferr = U.ferr;
      gaveta(p);
    }
    function gaveta(p){
      if (compacto) return;
      const txt = p ? H.pageText(p) : '', det = p ? H.detect(txt) : [];
      q('.lt-chips').innerHTML = det.length ? det.map(d => `<button class="chip" type="button" data-v="${h(d.v)}" data-t="${h(d.tipo)}"><b>${h(d.tipo)}</b>${h(d.v)}</button>`).join('')
        : `<span class="lt-hint">${p ? (txt ? 'Nenhum dado padrão detectado nesta página.' : 'Página sem texto: use ✂ para capturar um trecho (faz OCR só dele) ou o OCR da página.') : ''}</span>`;
      q('.lt-txtbox').hidden = !U.txt; q('[data-a="txt"]').setAttribute('aria-pressed', String(U.txt)); q('[data-a="txt"]').textContent = U.txt ? 'Texto ▴' : 'Texto ▾';
      if (U.txt) q('.lt-txt').textContent = txt || 'Esta página não tem texto. Use "OCR desta página".';
      q('.lt-hint').textContent = H.campoAtivoTexto();
    }
    const pontos = p => (U.pontos && H.pontosConferir) ? H.pontosConferir(p) : [];
    function imagem(p){
      return new Promise(res => {
        const id = p.id + '|' + p.dataUrl.length;
        if (U.img && U.imgId === id) { res(U.img); return; }
        const im = new win.Image(); im.onload = () => { U.img = im; U.imgId = id; U.hi = null; res(im); }; im.onerror = () => res(null); im.src = p.dataUrl;
      });
    }
    /* página de PDF: pede uma versão em alta resolução quando o zoom passa da imagem importada (texto pequeno fica nítido) */
    function pedirAltaResolucao(p, larguraPx){
      if (p.type !== 'pdf' || !H.renderPDF) return;
      const alvo = Math.min(5000, Math.ceil(larguraPx / 300) * 300), chave = p.id + '|' + alvo;
      if (U.hi && (U.hi.chave === chave || (U.hi.id === p.id && U.hi.w >= alvo)) || U.pedindo === chave) return;
      U.pedindo = chave;
      H.renderPDF(p, alvo).then(img => { U.pedindo = null; if (!img || morto) return; const atual = pagina(); if (!atual || atual.id !== p.id) return; U.hi = {id:p.id, w:alvo, chave, img}; desenhar(); }).catch(() => { U.pedindo = null; });
    }
    let desenhando = 0, morto = false, obs = null;
    async function desenhar(){
      const n = ++desenhando, p = pagina();
      if (!p) { pg.hidden = true; vazio.hidden = false; vazio.innerHTML = 'Nenhuma página. Importe e organize os documentos na etapa <b>Documentos</b>.'; return; }
      const im = await imagem(p); if (n !== desenhando || morto) return;
      if (!im) { pg.hidden = true; vazio.hidden = false; vazio.textContent = 'Não consegui abrir esta página.'; return; }
      pg.hidden = false; vazio.hidden = true;
      const r = (p.rotation || 0) % 360, rw = r % 180 ? im.naturalHeight : im.naturalWidth, rh = r % 180 ? im.naturalWidth : im.naturalHeight;
      const aw = Math.max(200, area.clientWidth - 28), ah = Math.max(200, area.clientHeight - 28);
      const base = U.modo === 'pagina' ? Math.min(aw / rw, ah / rh) : aw / rw;
      const W = Math.max(60, Math.floor(rw * base * U.z)), Hh = Math.max(60, Math.floor(rh * base * U.z));
      let k = Math.min(win.devicePixelRatio || 1, 2); if (W * k > 7000) k = 7000 / W; if (Hh * k > 9000) k = Math.min(k, 9000 / Hh);
      if (cv.width !== Math.round(W * k) || cv.height !== Math.round(Hh * k)) { cv.width = Math.round(W * k); cv.height = Math.round(Hh * k); }
      cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
      U.W = W; U.Hh = Hh; U.r = r;
      const fonte = (U.hi && U.hi.id === p.id) ? U.hi.img : im, fw = fonte.naturalWidth || fonte.width;
      if (p.type === 'pdf' && (r % 180 ? Hh : W) * k > (im.naturalWidth) * .8) pedirAltaResolucao(p, (r % 180 ? Hh : W) * k);
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, Hh);
      ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.filter = FILTROS[U.filtro]; ctx.translate(W / 2, Hh / 2); ctx.rotate(r * Math.PI / 180);
      const dw = r % 180 ? Hh : W, dh = r % 180 ? W : Hh; ctx.drawImage(fonte, -dw / 2, -dh / 2, dw, dh); ctx.restore(); ctx.filter = 'none';
      const A = anot(p), lw = Math.max(2, W / 420);
      const R = a => { const x = rect(o2r, a, r); return {x:x.x * W, y:x.y * Hh, w:x.w * W, h:x.h * Hh}; };
      const P = (x, y) => { const [u, v] = o2r(x, y, r); return [u * W, v * Hh]; };
      const traco = (a, preview) => {
        const ps = a.pts.map(([x, y]) => P(x, y)); if (!ps.length) return;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1, a.larg * W);
        if (a.modo === 'marca') { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .45; } else ctx.globalAlpha = preview ? .8 : .95;
        ctx.strokeStyle = a.cor; ctx.beginPath(); ctx.moveTo(ps[0][0], ps[0][1]);
        if (ps.length === 1) ctx.lineTo(ps[0][0] + .1, ps[0][1] + .1);
        for (let i = 1; i < ps.length - 1; i++) { const mx = (ps[i][0] + ps[i + 1][0]) / 2, my = (ps[i][1] + ps[i + 1][1]) / 2; ctx.quadraticCurveTo(ps[i][0], ps[i][1], mx, my); }
        if (ps.length > 1) ctx.lineTo(ps[ps.length - 1][0], ps[ps.length - 1][1]);
        ctx.stroke(); ctx.restore();
      };
      A.itens.forEach(a => {
        if (a.t === 'traco') traco(a);
        else if (a.t === 'hl') { const b = R(a); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = CORES_HL[a.cor] || CORES_HL.am; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore(); }
        else if (a.t === 'risco') { const [x1, y1] = P(a.x1, a.y1), [x2, y2] = P(a.x2, a.y2); ctx.strokeStyle = a.cor || 'rgba(19,112,63,.85)'; ctx.lineWidth = a.larg ? Math.max(1, a.larg * W) : lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
        else if (a.t === 'ok') { const b = R(a); ctx.fillStyle = 'rgba(46,170,90,.10)'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(19,112,63,.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);
          const rr = Math.max(9, W / 90); ctx.fillStyle = '#13703f'; ctx.beginPath(); ctx.arc(b.x + b.w, b.y, rr, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${rr * 1.3}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', b.x + b.w, b.y + 1); }
        else if (a.t === 'nota') { const [x, y] = P(a.x, a.y), rr = Math.max(11, W / 70); ctx.fillStyle = a.exigId ? '#b42318' : '#c27c00'; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = `bold ${rr}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(a.n || '!'), x, y + 1); }
      });
      /* pontos a conferir (o programa marca; o escrevente clica para dar ok) */
      U.pts = pontos(p);
      U.pts.forEach(o => { const b = R(o), ok = A.pontos && A.pontos[o.id];
        ctx.save(); if (ok) { ctx.strokeStyle = 'rgba(19,112,63,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); ctx.fillStyle = '#13703f'; ctx.font = `bold ${Math.max(10, b.h * .9)}px system-ui`; ctx.textBaseline = 'bottom'; ctx.fillText('✓', b.x + b.w + 3, b.y + b.h); }
        else { ctx.fillStyle = 'rgba(77,163,255,.14)'; ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(29,79,145,.85)'; ctx.lineWidth = 1.3; ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); }
        ctx.restore(); });
      U.hits.forEach(a => { const b = R(a); ctx.fillStyle = 'rgba(255,140,0,.28)'; ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); ctx.strokeStyle = '#e07000'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); });
      if (U.destaque && U.destaque.pageId === p.id) { const b = R(U.destaque); ctx.fillStyle = 'rgba(47,111,208,.14)'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = '#2f6fd0'; ctx.lineWidth = 3; ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6); }
      if (U.prev) {
        if (U.prev.t === 'traco') traco(U.prev, true);
        else { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#1d4f91'; ctx.lineWidth = 1.5;
          if (U.prev.t === 'risco') { ctx.setLineDash([]); ctx.strokeStyle = estilo.risco.cor; ctx.lineWidth = estilo.risco.tam; ctx.beginPath(); ctx.moveTo(U.prev.a[0], U.prev.a[1]); ctx.lineTo(U.prev.b[0], U.prev.b[1]); ctx.stroke(); }
          else { const x = Math.min(U.prev.a[0], U.prev.b[0]), y = Math.min(U.prev.a[1], U.prev.b[1]); ctx.strokeRect(x, y, Math.abs(U.prev.b[0] - U.prev.a[0]), Math.abs(U.prev.b[1] - U.prev.a[1])); }
          ctx.restore(); }
      }
      if (A.conferida) { ctx.fillStyle = 'rgba(19,112,63,.92)'; const fw2 = Math.max(110, W / 6), fh = Math.max(24, W / 32); ctx.fillRect(W - fw2 - 8, 8, fw2, fh); ctx.fillStyle = '#fff'; ctx.font = `600 ${fh * .55}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓ CONFERIDA', W - fw2 / 2 - 8, 8 + fh / 2); }
      q('.lt-zv').textContent = Math.round(U.z * 100) + '%';
      void fw;
    }
    function atualizar(){ barra(); fecharPop(); buscar(false); return desenhar(); }

    /* ---------- ponteiro ---------- */
    const pt = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left), (e.clientY - b.top)]; };
    const paraO = (px, py) => r2o(px / U.W, py / U.Hh, U.r || 0);
    let arr = null;
    function guardarDesfazer(p){ const k = p.id; (U.desfazer[k] = U.desfazer[k] || []).push(JSON.stringify(anot(p))); if (U.desfazer[k].length > 60) U.desfazer[k].shift(); }
    function mudou(){ H.markDirty(); desenhar(); barra(); if (opts.aoMudar) opts.aoMudar('anot'); }
    function pontoEm(px, py){ const [ox, oy] = paraO(px, py), m = 3 / U.W; return U.pts.find(o => ox >= o.x - m && ox <= o.x + o.w + m && oy >= o.y - m && oy <= o.y + o.h + m); }
    function alternarPonto(p, o){ guardarDesfazer(p); const A = anot(p); A.pontos = A.pontos || {}; if (A.pontos[o.id]) delete A.pontos[o.id]; else A.pontos[o.id] = 1; mudou(); }
    cv.addEventListener('pointerdown', e => {
      if (e.button !== 0) return; const p = pagina(); if (!p) return;
      const [px, py] = pt(e), [ox, oy] = paraO(px, py);
      const nota = acharNota(p, px, py);
      if (nota && U.ferr !== 'bor') { abrirPop(p, nota); return; }
      fecharPop(); cv.setPointerCapture(e.pointerId);
      if (U.ferr === 'mao') { arr = {t:'mao', x:e.clientX, y:e.clientY, sl:area.scrollLeft, st:area.scrollTop, px, py}; cv.classList.add('arrastando'); return; }
      if (U.ferr === 'bor') { arr = {t:'bor'}; apagarEm(p, ox, oy, px, py); return; }
      if (U.ferr === 'nota') {
        const txt = win.prompt('Nota sobre este ponto da página:'); if (!txt || !txt.trim()) return;
        guardarDesfazer(p); const A = anot(p); A.itens.push({id:uidL(), t:'nota', x:ox, y:oy, txt:txt.trim(), n:A.itens.filter(a => a.t === 'nota').length + 1}); mudou(); return;
      }
      if (U.ferr === 'marca' || U.ferr === 'caneta') { const e2 = estilo[U.ferr]; arr = {t:'traco'}; U.prev = {t:'traco', modo:U.ferr, cor:e2.cor, larg:e2.tam / U.W, pts:[[ox, oy]]}; return; }
      arr = {t:U.ferr, a:[px, py], b:[px, py]}; U.prev = {t:U.ferr === 'risco' ? 'risco' : 'ret', a:[px, py], b:[px, py]};
    });
    cv.addEventListener('pointermove', e => {
      if (U.regua) { const b = pg.getBoundingClientRect(); regua.style.top = (e.clientY - b.top - 13) + 'px'; }
      if (!arr) { if (U.ferr === 'mao' && U.pts.length) cv.style.cursor = pontoEm(...pt(e)) ? 'pointer' : ''; return; }
      if (arr.t === 'mao') { area.scrollLeft = arr.sl - (e.clientX - arr.x); area.scrollTop = arr.st - (e.clientY - arr.y); return; }
      if (arr.t === 'bor') { const p = pagina(); const [px, py] = pt(e), [ox, oy] = paraO(px, py); if (p) apagarEm(p, ox, oy, px, py, true); return; }
      if (arr.t === 'traco') { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; evs.forEach(ev => { const [px, py] = pt(ev); U.prev.pts.push(paraO(px, py)); }); desenhar(); return; }
      let [px, py] = pt(e); if (arr.t === 'risco' && Math.abs(py - arr.a[1]) < 14) py = arr.a[1];
      arr.b = [px, py]; U.prev.b = [px, py]; desenhar();
    });
    const soltar = async e => {
      if (!arr) return; const a = arr; arr = null; cv.classList.remove('arrastando');
      const p = pagina(); if (!p) { U.prev = null; return; }
      if (a.t === 'mao') { const [px, py] = pt(e); if (Math.hypot(px - a.px, py - a.py) < 4) { const o = pontoEm(px, py); if (o) alternarPonto(p, o); } return; }
      if (a.t === 'bor') { if (U.apagou) { U.apagou = false; mudou(); } return; }
      if (a.t === 'traco') { const pr = U.prev; U.prev = null; if (!pr || !pr.pts.length) { desenhar(); return; }
        const sim = [pr.pts[0]]; pr.pts.forEach(q2 => { const l = sim[sim.length - 1]; if (Math.hypot((q2[0] - l[0]) * U.W, (q2[1] - l[1]) * U.Hh) >= 1.5) sim.push(q2); });
        guardarDesfazer(p); anot(p).itens.push({id:uidL(), t:'traco', modo:pr.modo, cor:pr.cor, larg:pr.larg, pts:sim.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)])}); mudou(); return; }
      U.prev = null;
      const [o1x, o1y] = paraO(a.a[0], a.a[1]), [o2x, o2y] = paraO(a.b[0], a.b[1]);
      if (a.t === 'risco') { if (Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]) < 8) { desenhar(); return; } guardarDesfazer(p); anot(p).itens.push({id:uidL(), t:'risco', x1:o1x, y1:o1y, x2:o2x, y2:o2y, cor:estilo.risco.cor, larg:estilo.risco.tam / U.W}); mudou(); return; }
      const R = {x:Math.min(o1x, o2x), y:Math.min(o1y, o2y), w:Math.abs(o2x - o1x), h:Math.abs(o2y - o1y)};
      if (Math.abs(a.b[0] - a.a[0]) < 6 || Math.abs(a.b[1] - a.a[1]) < 6) { desenhar(); return; }
      if (a.t === 'cap') { await capturar(p, R); return; }
      guardarDesfazer(p); anot(p).itens.push(Object.assign({id:uidL(), t:a.t}, R));
      if (a.t === 'ok') { const A = anot(p); A.pontos = A.pontos || {}; U.pts.filter(o => dentro(o, R)).forEach(o => { A.pontos[o.id] = 1; }); }
      mudou();
    };
    cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
    area.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoomEm(e.deltaY < 0 ? 1.12 : 1 / 1.12, e); }, {passive:false});
    function acharNota(p, px, py){
      const rr = Math.max(11, U.W / 70) + 4;
      return anot(p).itens.slice().reverse().find(a => { if (a.t !== 'nota') return false; const [u, v] = o2r(a.x, a.y, U.r || 0); return Math.hypot(u * U.W - px, v * U.Hh - py) <= rr; });
    }
    function apagarEm(p, ox, oy, px, py, arrastando){
      const A = anot(p), tol = Math.max(8, estilo.marca.tam / 2) / U.W;
      const alvo = A.itens.slice().reverse().find(a => {
        if (a.t === 'nota') { const [u, v] = o2r(a.x, a.y, U.r || 0); return Math.hypot(u * U.W - px, v * U.Hh - py) <= Math.max(11, U.W / 70) + 4; }
        if (a.t === 'risco') return distSeg(ox, oy, a.x1, a.y1, a.x2, a.y2) <= Math.max(tol, (a.larg || 0) / 2 + 4 / U.W);
        if (a.t === 'traco') { const t2 = Math.max(4 / U.W, a.larg / 2 + 3 / U.W); for (let i = 0; i < a.pts.length; i++) { const p1 = a.pts[i], p2 = a.pts[i + 1] || p1; if (distSeg(ox, oy, p1[0], p1[1], p2[0], p2[1]) <= t2) return true; } return false; }
        return ox >= a.x && ox <= a.x + a.w && oy >= a.y && oy <= a.y + a.h;
      });
      if (!alvo) return;
      if (!U.apagou) guardarDesfazer(p);
      A.itens.splice(A.itens.indexOf(alvo), 1);
      if (arrastando) { U.apagou = true; desenhar(); } else mudou();
    }
    async function capturar(p, R){
      let texto = textoDaArea(p.words, R), como = 'captura';
      if (!texto) {
        aviso('Lendo o trecho com OCR…'); como = 'captura-ocr';
        try { texto = await H.ocrRegiao(p, R); } catch (e) { aviso('OCR indisponível: ' + e.message, 'err'); desenhar(); return; }
      }
      U.destaque = Object.assign({pageId:p.id}, R); desenhar(); setTimeout(() => { if (U.destaque && U.destaque.pageId === p.id) { U.destaque = null; desenhar(); } }, 2500);
      if (!texto) { aviso('Não encontrei texto nesse trecho.', 'err'); return; }
      const ok = H.insertActive(texto, p, como, R);
      if (!ok) { try { await win.navigator.clipboard.writeText(texto); } catch (e) {} aviso('Nenhum campo ativo: o texto foi copiado. Clique num campo da ficha e capture de novo, ou cole (Ctrl+V).'); }
      gaveta(p);
    }
    /* ---------- nota: balão ---------- */
    function abrirPop(p, a){
      const [u, v] = o2r(a.x, a.y, U.r || 0);
      pop.hidden = false; pop.style.left = Math.min(U.W - 270, Math.max(0, u * U.W + 14)) + 'px'; pop.style.top = (v * U.Hh + 14) + 'px';
      pop.innerHTML = `<b>Nota ${h(a.n || '')}</b>${a.exigId ? ' <span class="badge err">virou exigência</span>' : ''}<textarea rows="3" aria-label="Texto da nota" spellcheck="true" lang="pt-BR">${h(a.txt)}</textarea>
        <div class="lt-linha"><button class="lt-b lt-pri" data-pa="exig" type="button"${a.exigId ? ' disabled' : ''}>Virar exigência</button><button class="lt-b" data-pa="del" type="button">Excluir</button><button class="lt-b" data-pa="x" type="button">Fechar</button></div>`;
      U.pop = {p, a};
    }
    function abrirAjuda(){
      pop.hidden = false; pop.style.left = '8px'; pop.style.top = (area.scrollTop + 8) + 'px';
      pop.innerHTML = `<b>Atalhos de teclado</b><table class="lt-atalhos">${ATALHOS.map(([k, t]) => `<tr><td><kbd>${h(k)}</kbd></td><td>${h(t)}</td></tr>`).join('')}</table><div class="lt-linha"><button class="lt-b" data-pa="x" type="button">Fechar</button></div>`;
      U.pop = {ajuda:true};
    }
    function fecharPop(){ if (U.pop && U.pop.a) { const ta = pop.querySelector('textarea'); if (ta && ta.value.trim() && ta.value.trim() !== U.pop.a.txt) { U.pop.a.txt = ta.value.trim(); H.markDirty(); } } pop.hidden = true; U.pop = null; }
    pop.addEventListener('click', e => {
      const b = e.target.closest('[data-pa]'); if (!b || !U.pop) return;
      if (b.dataset.pa === 'x') { fecharPop(); return; }
      const {p, a} = U.pop;
      if (b.dataset.pa === 'del') { guardarDesfazer(p); const A = anot(p); A.itens.splice(A.itens.indexOf(a), 1); fecharPop(); mudou(); }
      else if (b.dataset.pa === 'exig') { const ta = pop.querySelector('textarea'); a.txt = ta.value.trim() || a.txt; H.notaParaExigencia(p, a); fecharPop(); mudou(); aviso('Nota enviada para a nota devolutiva.'); }
    });
    /* ---------- busca ---------- */
    let buscaT = null;
    function buscar(navegar){
      const termo = norm(U.busca).trim(), res = q('.lt-bres'); U.hits = [];
      if (!termo) { res.innerHTML = ''; return; }
      const ps = paginas(), cont = ps.map(p => { const t = norm(H.pageText(p)); let n = 0, i = t.indexOf(termo); while (i >= 0) { n++; i = t.indexOf(termo, i + termo.length); } return n; });
      const p = pagina();
      if (p && p.words) {
        const tk = termo.split(/\s+/).filter(Boolean), W = p.words, nw = W.map(w => norm(w.t));
        for (let i = 0; i < W.length; i++) {
          if (tk.length === 1) { if (nw[i].includes(tk[0])) U.hits.push(W[i]); continue; }
          let ok = true; for (let j = 0; j < tk.length; j++) { if (!nw[i + j] || !nw[i + j].includes(tk[j])) { ok = false; break; } }
          if (ok) for (let j = 0; j < tk.length; j++) U.hits.push(W[i + j]);
        }
      }
      const pags = cont.map((n, i) => n ? i : -1).filter(i => i >= 0), total = cont.reduce((a, b) => a + b, 0);
      res.innerHTML = total ? `${total} · pág. ${pags.map(i => `<button class="lt-pl${i === st.i ? ' on' : ''}" data-ir="${i}" type="button">${i + 1}</button>`).join('')}` : '<span class="mut">nada neste documento</span>';
      if (navegar && pags.length) { const prox = pags.find(i => i > st.i); const alvo = prox != null ? prox : pags[0]; if (alvo !== st.i) { st.i = alvo; atualizar(); mudouPagina(); return; } }
      if (U.hits.length && navegar) { const a = U.hits[0], [, v] = o2r(a.x, a.y, U.r || 0); area.scrollTop = Math.max(0, v * U.Hh - area.clientHeight / 3); }
    }
    q('.lt-busca input').addEventListener('input', e => { U.busca = e.target.value; clearTimeout(buscaT); buscaT = setTimeout(() => { buscar(false); desenhar(); }, 250); });
    q('.lt-busca input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscar(true); desenhar(); } if (e.key === 'Escape') { e.target.value = ''; U.busca = ''; buscar(false); desenhar(); } });
    q('.lt-bres').addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (!b) return; st.i = +b.dataset.ir; atualizar(); mudouPagina(); });
    /* ---------- ações ---------- */
    function mudouPagina(){ area.scrollTop = 0; if (opts.aoMudar) opts.aoMudar('pagina'); }
    function irDoc(d, ultima){ const ops = H.docOpcoes(), di = ops.findIndex(o => o.id === st.docId), n = di + d; if (n < 0 || n >= ops.length) return false; st.docId = ops[n].id; st.i = ultima ? Math.max(0, H.pagesDoDoc(st.docId).length - 1) : 0; U.destaque = null; atualizar(); mudouPagina(); return true; }
    function irPag(d){
      const n = st.i + d, tot = paginas().length;
      if (n < 0) { if (irDoc(-1, true)) aviso('Documento anterior.'); return; }
      if (n >= tot) { if (irDoc(1, false)) aviso('Próximo documento: ' + (q('.lt-doc').selectedOptions[0] || {}).textContent); return; }
      st.i = n; U.destaque = null; atualizar(); mudouPagina();
    }
    function zoomEm(f, e){
      const antes = U.z; U.z = Math.max(.3, Math.min(8, U.z * f)); if (U.z === antes) return;
      const b = area.getBoundingClientRect(), mx = e ? e.clientX - b.left : area.clientWidth / 2, my = e ? e.clientY - b.top : area.clientHeight / 2;
      const fx = (area.scrollLeft + mx) / Math.max(1, area.scrollWidth), fy = (area.scrollTop + my) / Math.max(1, area.scrollHeight);
      Promise.resolve(desenhar()).then(() => { area.scrollLeft = fx * area.scrollWidth - mx; area.scrollTop = fy * area.scrollHeight - my; });
    }
    function tamanho(d){ if (!temEstilo()) return false; const e = estilo[U.ferr]; e.tam = Math.max(1, Math.min(60, e.tam + d)); salvarEstilo(); barra(); return true; }
    function acao(a){
      const p = pagina();
      switch (a) {
        case 'ant': irPag(-1); break; case 'prox': irPag(1); break; case 'docant': irDoc(-1); break; case 'docprox': irDoc(1); break;
        case 'zm': zoomEm(1 / 1.2); break; case 'zp': zoomEm(1.2); break;
        case 'larg': U.modo = 'largura'; U.z = 1; barra(); desenhar(); break; case 'pag': U.modo = 'pagina'; U.z = 1; barra(); desenhar(); break;
        case 'gir': if (p) { p.rotation = ((p.rotation || 0) + 90) % 360; U.hi = null; H.markDirty(); desenhar(); if (opts.aoMudar) opts.aoMudar('anot'); } break;
        case 'fil': U.filtro = (U.filtro + 1) % 3; barra(); desenhar(); break;
        case 'reg': U.regua = !U.regua; barra(); break;
        case 'pts': U.pontos = !U.pontos; barra(); desenhar(); break;
        case 'conf': if (p) { guardarDesfazer(p); const A = anot(p); A.conferida = !A.conferida; mudou(); if (A.conferida) aviso(`Página ${st.i + 1} conferida. → para a próxima.`); } break;
        case 'desf': { if (!p) break; const pilha = U.desfazer[p.id]; if (!pilha || !pilha.length) { aviso('Nada para desfazer nesta página.'); break; } const o = JSON.parse(pilha.pop()), A = anot(p); A.itens = o.itens; A.conferida = o.conferida; A.pontos = o.pontos || {}; mudou(); break; }
        case 'txt': U.txt = !U.txt; gaveta(p); setTimeout(desenhar, 0); break;
        case 'usar': { const s = String(win.getSelection() || '').trim(); if (!s) { aviso('Selecione um trecho no texto primeiro.', 'err'); break; } H.insertActive(s, p, 'selecao'); gaveta(p); break; }
        case 'ocr': if (p) H.ocrPages([p]).then(() => atualizar()); break;
        case 'ocrd': { const ps = paginas().filter(x => !x.raw); if (!ps.length) { aviso('Todas as páginas deste documento já têm texto.'); break; } H.ocrPages(ps).then(() => atualizar()); break; }
        case 'comp': H.alternarComparar(); break; case 'jan': H.abrirJanelaDoc(); break; case 'fechar': H.alternarComparar(false); break;
        case 'nova': { const w2 = win.open(`visor.html#ind=1&doc=${encodeURIComponent(st.docId)}&i=${st.i}`, 'qcrco-visor-' + Date.now().toString(36), 'popup=yes,width=900,height=1200'); if (!w2) aviso('O navegador bloqueou a janela. Permita pop-ups para este site.', 'err'); break; }
        case 'ajuda': if (U.pop && U.pop.ajuda) fecharPop(); else abrirAjuda(); break;
      }
    }
    raiz.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'); if (f) { U.ferr = f.dataset.f; barra(); return; }
      const c = e.target.closest('[data-cor]'); if (c && temEstilo()) { estilo[U.ferr].cor = c.dataset.cor; salvarEstilo(); barra(); return; }
      const ch = e.target.closest('.lt-chips .chip'); if (ch) { H.insertActive(ch.dataset.v, pagina(), 'chip:' + ch.dataset.t); gaveta(pagina()); return; }
      const b = e.target.closest('[data-a]'); if (b && raiz.contains(b)) acao(b.dataset.a);
    });
    q('.lt-corlivre').addEventListener('input', e => { if (!temEstilo()) return; estilo[U.ferr].cor = e.target.value; salvarEstilo(); barra(); });
    q('.lt-tam').addEventListener('input', e => { if (!temEstilo()) return; estilo[U.ferr].tam = +e.target.value; salvarEstilo(); q('.lt-tamv').textContent = e.target.value + ' px'; });
    raiz.addEventListener('mousedown', e => { if (e.target.closest('.lt-chips .chip, [data-a="usar"]')) e.preventDefault(); });
    q('.lt-doc').addEventListener('change', e => { st.docId = e.target.value; st.i = 0; U.destaque = null; atualizar(); mudouPagina(); });
    if (win.ResizeObserver) { let t = null, ult = ''; obs = new win.ResizeObserver(() => { const k = area.clientWidth + 'x' + area.clientHeight; if (k === ult) return; const [w0, h0] = ult.split('x').map(Number); ult = k;
      if (U.modo === 'largura' && Math.abs(w0 - area.clientWidth) < 3 && h0) return; clearTimeout(t); t = setTimeout(() => { if (!morto) desenhar(); }, 80); }); obs.observe(area); }
    function destruir(){ morto = true; if (obs) obs.disconnect(); }
    function tecla(e){
      if (e.ctrlKey && e.key.toLowerCase() === 'z') { acao('desf'); return true; }
      if (e.ctrlKey || e.altKey || e.metaKey) return false;
      const k = e.key.toLowerCase(), f = FERR.find(x => x[3] === k);
      if (f) { U.ferr = f[0]; barra(); return true; }
      if (k === 'c') { acao('conf'); return true; }
      if (e.key === '[') return tamanho(-2); if (e.key === ']') return tamanho(2);
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { irPag(1); return true; }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { irPag(-1); return true; }
      if (e.key === '+' || e.key === '=') { zoomEm(1.2); return true; } if (e.key === '-') { zoomEm(1 / 1.2); return true; }
      if (e.key === '/') { q('.lt-busca input').focus(); return true; }
      if (e.key === 'Escape' && U.pop) { fecharPop(); return true; }
      return false;
    }
    function destacar(pageId, R){
      const ps = paginas(), i = ps.findIndex(x => x.id === pageId); if (i < 0) return;
      st.i = i; U.destaque = R ? Object.assign({pageId}, R) : null;
      Promise.resolve(atualizar()).then(() => { if (R) { const [, v] = o2r(R.x, R.y, U.r || 0); area.scrollTop = Math.max(0, v * U.Hh - area.clientHeight / 3); } });
      setTimeout(() => { if (U.destaque && U.destaque.pageId === pageId) { U.destaque = null; desenhar(); } }, 4000);
    }
    atualizar();
    return {atualizar, desenhar, tecla, destacar, destruir, gaveta:() => gaveta(pagina()), st, raiz};
  }
  return {criar, VERSAO, textoDaArea, o2r, r2o};
})();
