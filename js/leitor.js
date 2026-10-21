/* Qualificador CRCO — js/leitor.js: leitor de páginas com ferramentas de análise.
 * Usado na Conferência, no "Comparar" e na janela separada (visor.html). Não depende dos outros arquivos:
 * conversa com o programa pelo objeto H (a janela principal), então funciona igual nas duas janelas. */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/leitor.js'] = '1.3.0';

window.Leitor = (function(){
  const VERSAO = '1.3.0';
  const CORES = {am:['Amarelo · atenção', 'rgba(255,214,0,.40)'], vd:['Verde · conferido', 'rgba(46,170,90,.32)'], vm:['Vermelho · problema', 'rgba(230,50,50,.30)']};
  const FERR = [
    ['mao', '✋', 'Mão: arrastar a página', 'v'], ['hl', '🖍', 'Marca-texto', 'h'], ['risco', '✎', 'Riscar o que já leu', 'r'],
    ['ok', '☑', 'Bloco conferido', 'b'], ['nota', '📌', 'Nota adesiva (pode virar exigência)', 'n'],
    ['cap', '✂', 'Capturar texto da imagem para o campo ativo', 't'], ['bor', '⌫', 'Borracha', 'e']];
  const FILTROS = ['none', 'contrast(170%) brightness(96%)', 'grayscale(100%) contrast(220%)'];
  const NOME_FILTRO = ['Contraste', 'Realce', 'P&B'];
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const uidL = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  /* coordenadas: tudo é guardado no espaço da página ORIGINAL (0..1), e convertido para a página girada só para desenhar */
  function o2r(x, y, r){ switch (r) { case 90: return [1 - y, x]; case 180: return [1 - x, 1 - y]; case 270: return [y, 1 - x]; default: return [x, y]; } }
  function r2o(u, v, r){ switch (r) { case 90: return [v, 1 - u]; case 180: return [1 - u, 1 - v]; case 270: return [1 - v, u]; default: return [u, v]; } }
  function rect(conv, a, r){ const [x1, y1] = conv(a.x, a.y, r), [x2, y2] = conv(a.x + a.w, a.y + a.h, r); return {x:Math.min(x1, x2), y:Math.min(y1, y2), w:Math.abs(x2 - x1), h:Math.abs(y2 - y1)}; }
  /* agrupa as palavras de um retângulo em linhas, na ordem de leitura */
  function textoDaArea(words, R){
    const ws = (words || []).filter(w => { const cx = w.x + w.w / 2, cy = w.y + w.h / 2; return cx >= R.x && cx <= R.x + R.w && cy >= R.y && cy <= R.y + R.h; })
      .sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
    const linhas = [];
    ws.forEach(w => { const cy = w.y + w.h / 2, L = linhas.find(l => Math.abs(l.cy - cy) < Math.max(w.h, l.h) * .55); if (L) L.ws.push(w); else linhas.push({cy, h:w.h, ws:[w]}); });
    return linhas.sort((a, b) => a.cy - b.cy).map(l => l.ws.sort((a, b) => a.x - b.x).map(w => w.t).join(' ')).join('\n').trim();
  }

  function criar(raiz, H, opts = {}){
    const st = opts.st || {docId:'', i:0};
    const doc = raiz.ownerDocument, win = doc.defaultView;
    const U = {modo:'largura', z:1, ferr:'mao', cor:'am', filtro:0, regua:false, txt:false, hits:[], busca:'', destaque:null, prev:null, desfazer:{}, img:null, imgId:'', W:0, Hh:0, pop:null};
    const principal = opts.janela === 'principal', compacto = !!opts.compacto;
    raiz.classList.add('leitor'); raiz.dataset.ferr = U.ferr;
    raiz.innerHTML = `
      <div class="lt-bar" role="toolbar" aria-label="Ferramentas do documento">
        <div class="grp"><select class="lt-doc" aria-label="Documento"></select>
          <button class="lt-b" data-a="ant" type="button" title="Página anterior (←)" aria-label="Página anterior">‹</button><span class="lt-cnt">–</span><button class="lt-b" data-a="prox" type="button" title="Próxima página (→)" aria-label="Próxima página">›</button></div>
        <div class="grp">${FERR.map(f => `<button class="lt-b" data-f="${f[0]}" type="button" title="${h(f[2])} (${f[3].toUpperCase()})" aria-label="${h(f[2])}" aria-pressed="${f[0] === U.ferr}">${f[1]}</button>`).join('')}
          <span class="lt-cores" hidden>${Object.entries(CORES).map(([k, c]) => `<button class="lt-sw" data-cor="${k}" type="button" title="${h(c[0])}" aria-label="${h(c[0])}" aria-pressed="${k === U.cor}" style="background:${c[1].replace(/,\.\d+\)/, ',1)')}"></button>`).join('')}</span>
          <button class="lt-b" data-a="desf" type="button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">↶</button></div>
        <div class="grp"><button class="lt-b" data-a="zm" type="button" title="Diminuir (−)" aria-label="Diminuir zoom">−</button><span class="lt-zv">100%</span><button class="lt-b" data-a="zp" type="button" title="Aumentar (+)" aria-label="Aumentar zoom">+</button>
          <button class="lt-b" data-a="larg" type="button" title="Ajustar à largura" aria-pressed="true">↔</button><button class="lt-b" data-a="pag" type="button" title="Página inteira">⤢</button>
          <button class="lt-b" data-a="gir" type="button" title="Girar a página">↻</button><button class="lt-b lt-fil" data-a="fil" type="button" title="Contraste para escaneado">◐</button>
          <button class="lt-b" data-a="reg" type="button" title="Régua de leitura" aria-pressed="false">▭</button></div>
        <div class="grp lt-busca"><input type="search" placeholder="Buscar no documento" aria-label="Buscar no documento"><span class="lt-bres"></span></div>
        <div class="grp" style="border:0"><button class="lt-b lt-conf" data-a="conf" type="button" title="Marcar a página como conferida (C)" aria-pressed="false">✓ Conferida</button><span class="lt-prog"></span>
          ${principal ? `<button class="lt-b" data-a="comp" type="button" title="Comparar com outra página lado a lado" aria-pressed="false">⇆ Comparar</button><button class="lt-b" data-a="jan" type="button" title="Abrir o documento numa janela separada (para o monitor em pé)">⧉ Outra janela</button>` : ''}
          ${compacto ? `<button class="lt-b" data-a="fechar" type="button" title="Fechar a comparação">✕</button>` : ''}</div>
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

    function barra(){
      const opts2 = H.docOpcoes();
      const sel = q('.lt-doc'), html = opts2.map(o => `<option value="${h(o.id)}">${h(o.rotulo)}</option>`).join('') || '<option value="">Nenhum documento</option>';
      if (sel.innerHTML !== html) sel.innerHTML = html;
      if (!opts2.some(o => o.id === st.docId)) { st.docId = opts2[0] ? opts2[0].id : ''; st.i = 0; }
      sel.value = st.docId;
      const ps = paginas(), p = pagina();
      q('.lt-cnt').textContent = ps.length ? `${st.i + 1}/${ps.length}` : '–';
      q('[data-a="ant"]').disabled = st.i <= 0; q('[data-a="prox"]').disabled = st.i >= ps.length - 1;
      const conf = p ? anot(p).conferida : false, nconf = ps.filter(x => anot(x).conferida).length;
      q('.lt-conf').setAttribute('aria-pressed', String(!!conf)); q('.lt-conf').disabled = !p;
      q('.lt-prog').textContent = ps.length ? `${nconf}/${ps.length} conferidas` : '';
      q('.lt-prog').className = 'lt-prog' + (ps.length && nconf === ps.length ? ' tudo' : '');
      raiz.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === U.ferr)));
      q('.lt-cores').hidden = U.ferr !== 'hl';
      raiz.querySelectorAll('[data-cor]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cor === U.cor)));
      q('[data-a="larg"]').setAttribute('aria-pressed', String(U.modo === 'largura')); q('[data-a="pag"]').setAttribute('aria-pressed', String(U.modo === 'pagina'));
      q('.lt-fil').textContent = U.filtro ? NOME_FILTRO[U.filtro] : '◐'; q('.lt-fil').setAttribute('aria-pressed', String(!!U.filtro));
      q('[data-a="reg"]').setAttribute('aria-pressed', String(U.regua)); regua.hidden = !U.regua;
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
    function imagem(p){
      return new Promise(res => {
        if (U.img && U.imgId === p.id + '|' + p.dataUrl.length) { res(U.img); return; }
        const im = new win.Image(); im.onload = () => { U.img = im; U.imgId = p.id + '|' + p.dataUrl.length; res(im); }; im.onerror = () => res(null); im.src = p.dataUrl;
      });
    }
    let desenhando = 0, morto = false, obs = null;
    async function desenhar(){
      const n = ++desenhando, p = pagina();
      if (!p) { pg.hidden = true; vazio.hidden = false; vazio.innerHTML = 'Nenhuma página. Importe e organize os documentos na etapa <b>Documentos</b>.'; return; }
      const im = await imagem(p); if (n !== desenhando || morto) return;
      if (!im) { pg.hidden = true; vazio.hidden = false; vazio.textContent = 'Não consegui abrir esta página.'; return; }
      pg.hidden = false; vazio.hidden = true;
      const r = p.rotation || 0, rw = r % 180 ? im.naturalHeight : im.naturalWidth, rh = r % 180 ? im.naturalWidth : im.naturalHeight;
      const aw = Math.max(200, area.clientWidth - 28), ah = Math.max(200, area.clientHeight - 28);
      const base = U.modo === 'pagina' ? Math.min(aw / rw, ah / rh) : aw / rw;
      const W = Math.max(60, Math.round(rw * base * U.z)), Hh = Math.max(60, Math.round(rh * base * U.z));
      let k = Math.min(win.devicePixelRatio || 1, 2); if (W * k > 7000) k = 7000 / W; if (Hh * k > 9000) k = Math.min(k, 9000 / Hh);
      cv.width = Math.round(W * k); cv.height = Math.round(Hh * k); cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
      U.W = W; U.Hh = Hh; U.r = r;
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, Hh);
      ctx.save(); ctx.filter = FILTROS[U.filtro]; ctx.translate(W / 2, Hh / 2); ctx.rotate(r * Math.PI / 180);
      const dw = r % 180 ? Hh : W, dh = r % 180 ? W : Hh; ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh); ctx.restore(); ctx.filter = 'none';
      const A = anot(p), lw = Math.max(2, W / 420);
      const R = a => { const x = rect(o2r, a, r); return {x:x.x * W, y:x.y * Hh, w:x.w * W, h:x.h * Hh}; };
      const P = (x, y) => { const [u, v] = o2r(x, y, r); return [u * W, v * Hh]; };
      A.itens.forEach(a => {
        if (a.t === 'hl') { const b = R(a); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = (CORES[a.cor] || CORES.am)[1]; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore(); }
        else if (a.t === 'risco') { const [x1, y1] = P(a.x1, a.y1), [x2, y2] = P(a.x2, a.y2); ctx.strokeStyle = 'rgba(19,112,63,.85)'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
        else if (a.t === 'ok') { const b = R(a); ctx.fillStyle = 'rgba(46,170,90,.10)'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(19,112,63,.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);
          const rr = Math.max(9, W / 90); ctx.fillStyle = '#13703f'; ctx.beginPath(); ctx.arc(b.x + b.w, b.y, rr, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${rr * 1.3}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', b.x + b.w, b.y + 1); }
        else if (a.t === 'nota') { const [x, y] = P(a.x, a.y), rr = Math.max(11, W / 70); ctx.fillStyle = a.exigId ? '#b42318' : '#c27c00'; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = `bold ${rr}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(a.n || '!'), x, y + 1); }
      });
      U.hits.forEach(a => { const b = R(a); ctx.fillStyle = 'rgba(255,140,0,.28)'; ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); ctx.strokeStyle = '#e07000'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); });
      if (U.destaque && U.destaque.pageId === p.id) { const b = R(U.destaque); ctx.fillStyle = 'rgba(47,111,208,.14)'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = '#2f6fd0'; ctx.lineWidth = 3; ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6); }
      if (U.prev) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#1d4f91'; ctx.lineWidth = 1.5;
        if (U.prev.t === 'risco') { ctx.beginPath(); ctx.moveTo(U.prev.a[0], U.prev.a[1]); ctx.lineTo(U.prev.b[0], U.prev.b[1]); ctx.stroke(); }
        else { const x = Math.min(U.prev.a[0], U.prev.b[0]), y = Math.min(U.prev.a[1], U.prev.b[1]); ctx.strokeRect(x, y, Math.abs(U.prev.b[0] - U.prev.a[0]), Math.abs(U.prev.b[1] - U.prev.a[1])); }
        ctx.restore(); }
      if (A.conferida) { ctx.fillStyle = 'rgba(19,112,63,.92)'; const fw = Math.max(110, W / 6), fh = Math.max(24, W / 32); ctx.fillRect(W - fw - 8, 8, fw, fh); ctx.fillStyle = '#fff'; ctx.font = `600 ${fh * .55}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓ CONFERIDA', W - fw / 2 - 8, 8 + fh / 2); }
      q('.lt-zv').textContent = Math.round(U.z * 100) + '%';
    }
    function atualizar(){ barra(); fecharPop(); buscar(false); return desenhar(); }
    /* ---------- ponteiro ---------- */
    const pt = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left), (e.clientY - b.top)]; };
    const paraO = (px, py) => r2o(px / U.W, py / U.Hh, U.r || 0);
    let arr = null;
    function guardarDesfazer(p){ const k = p.id; (U.desfazer[k] = U.desfazer[k] || []).push(JSON.stringify(anot(p))); if (U.desfazer[k].length > 40) U.desfazer[k].shift(); }
    function mudou(){ H.markDirty(); desenhar(); barra(); if (opts.aoMudar) opts.aoMudar('anot'); }
    cv.addEventListener('pointerdown', e => {
      if (e.button !== 0) return; const p = pagina(); if (!p) return;
      const [px, py] = pt(e), [ox, oy] = paraO(px, py);
      const nota = acharNota(p, px, py);
      if (nota && U.ferr !== 'bor') { abrirPop(p, nota); return; }
      fecharPop();
      if (U.ferr === 'mao') { arr = {t:'mao', x:e.clientX, y:e.clientY, sl:area.scrollLeft, st:area.scrollTop}; cv.setPointerCapture(e.pointerId); cv.classList.add('arrastando'); return; }
      if (U.ferr === 'bor') { apagarEm(p, ox, oy, px, py); return; }
      if (U.ferr === 'nota') {
        const txt = win.prompt('Nota sobre este ponto da página:'); if (!txt || !txt.trim()) return;
        guardarDesfazer(p); const A = anot(p); A.itens.push({id:uidL(), t:'nota', x:ox, y:oy, txt:txt.trim(), n:A.itens.filter(a => a.t === 'nota').length + 1}); mudou(); return;
      }
      arr = {t:U.ferr, a:[px, py], b:[px, py]}; U.prev = {t:U.ferr === 'risco' ? 'risco' : 'ret', a:[px, py], b:[px, py]}; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (U.regua) { const b = pg.getBoundingClientRect(); regua.style.top = (e.clientY - b.top - 13) + 'px'; }
      if (!arr) return;
      if (arr.t === 'mao') { area.scrollLeft = arr.sl - (e.clientX - arr.x); area.scrollTop = arr.st - (e.clientY - arr.y); return; }
      let [px, py] = pt(e); if (arr.t === 'risco' && Math.abs(py - arr.a[1]) < 14) py = arr.a[1];
      arr.b = [px, py]; U.prev.b = [px, py]; desenhar();
    });
    const soltar = async e => {
      if (!arr) return; const a = arr; arr = null; U.prev = null; cv.classList.remove('arrastando');
      if (a.t === 'mao') return;
      const p = pagina(); if (!p) return;
      const [o1x, o1y] = paraO(a.a[0], a.a[1]), [o2x, o2y] = paraO(a.b[0], a.b[1]);
      if (a.t === 'risco') { if (Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]) < 8) { desenhar(); return; } guardarDesfazer(p); anot(p).itens.push({id:uidL(), t:'risco', x1:o1x, y1:o1y, x2:o2x, y2:o2y}); mudou(); return; }
      const R = {x:Math.min(o1x, o2x), y:Math.min(o1y, o2y), w:Math.abs(o2x - o1x), h:Math.abs(o2y - o1y)};
      if (Math.abs(a.b[0] - a.a[0]) < 6 || Math.abs(a.b[1] - a.a[1]) < 6) { desenhar(); return; }
      if (a.t === 'cap') { await capturar(p, R); return; }
      guardarDesfazer(p); anot(p).itens.push(Object.assign({id:uidL(), t:a.t}, R, a.t === 'hl' ? {cor:U.cor} : {})); mudou();
    };
    cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('mouseleave', () => { if (!arr && U.regua) {} });
    area.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, {passive:false});
    function acharNota(p, px, py){
      const rr = Math.max(11, U.W / 70) + 4;
      return anot(p).itens.slice().reverse().find(a => { if (a.t !== 'nota') return false; const [u, v] = o2r(a.x, a.y, U.r || 0); return Math.hypot(u * U.W - px, v * U.Hh - py) <= rr; });
    }
    function apagarEm(p, ox, oy, px, py){
      const A = anot(p), tol = 10 / U.W;
      const alvo = A.itens.slice().reverse().find(a => {
        if (a.t === 'nota') { const [u, v] = o2r(a.x, a.y, U.r || 0); return Math.hypot(u * U.W - px, v * U.Hh - py) <= Math.max(11, U.W / 70) + 4; }
        if (a.t === 'risco') { const dx = a.x2 - a.x1, dy = a.y2 - a.y1, L = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((ox - a.x1) * dx + (oy - a.y1) * dy) / L)); return Math.hypot(ox - (a.x1 + t * dx), oy - (a.y1 + t * dy)) <= tol * 1.5; }
        return ox >= a.x && ox <= a.x + a.w && oy >= a.y && oy <= a.y + a.h;
      });
      if (!alvo) return; guardarDesfazer(p); A.itens.splice(A.itens.indexOf(alvo), 1); mudou();
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
      pop.innerHTML = `<b>Nota ${h(a.n || '')}</b>${a.exigId ? ' <span class="badge err">virou exigência</span>' : ''}<textarea rows="3" aria-label="Texto da nota">${h(a.txt)}</textarea>
        <div class="lt-linha"><button class="lt-b lt-pri" data-pa="exig" type="button"${a.exigId ? ' disabled' : ''}>Virar exigência</button><button class="lt-b" data-pa="del" type="button">Excluir</button><button class="lt-b" data-pa="x" type="button">Fechar</button></div>`;
      U.pop = {p, a};
    }
    function fecharPop(){ if (U.pop) { const ta = pop.querySelector('textarea'); if (ta && ta.value.trim() && ta.value.trim() !== U.pop.a.txt) { U.pop.a.txt = ta.value.trim(); H.markDirty(); } } pop.hidden = true; U.pop = null; }
    pop.addEventListener('click', e => {
      const b = e.target.closest('[data-pa]'); if (!b || !U.pop) return; const {p, a} = U.pop;
      if (b.dataset.pa === 'x') fecharPop();
      else if (b.dataset.pa === 'del') { guardarDesfazer(p); const A = anot(p); A.itens.splice(A.itens.indexOf(a), 1); fecharPop(); mudou(); }
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
      res.innerHTML = total ? `${total} · pág. ${pags.map(i => `<button class="lt-pl${i === st.i ? ' on' : ''}" data-ir="${i}" type="button">${i + 1}</button>`).join('')}` : '<span class="mut">nada</span>';
      if (navegar && pags.length) { const prox = pags.find(i => i > st.i); const alvo = prox != null ? prox : pags[0]; if (alvo !== st.i) { st.i = alvo; atualizar(); mudouPagina(); return; } }
      if (U.hits.length && navegar) { const a = U.hits[0], [, v] = o2r(a.x, a.y, U.r || 0); area.scrollTop = Math.max(0, v * U.Hh - area.clientHeight / 3); }
    }
    q('.lt-busca input').addEventListener('input', e => { U.busca = e.target.value; clearTimeout(buscaT); buscaT = setTimeout(() => { buscar(false); desenhar(); }, 250); });
    q('.lt-busca input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscar(true); desenhar(); } if (e.key === 'Escape') { e.target.value = ''; U.busca = ''; buscar(false); desenhar(); } });
    q('.lt-bres').addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (!b) return; st.i = +b.dataset.ir; atualizar(); mudouPagina(); });
    /* ---------- ações ---------- */
    function mudouPagina(){ area.scrollTop = 0; if (opts.aoMudar) opts.aoMudar('pagina'); }
    function irPag(d){ const n = st.i + d; if (n < 0 || n >= paginas().length) return; st.i = n; U.destaque = null; atualizar(); mudouPagina(); }
    function zoom(f){ U.z = Math.max(.3, Math.min(6, U.z * f)); desenhar(); }
    function acao(a){
      const p = pagina();
      switch (a) {
        case 'ant': irPag(-1); break; case 'prox': irPag(1); break;
        case 'zm': zoom(1 / 1.2); break; case 'zp': zoom(1.2); break;
        case 'larg': U.modo = 'largura'; U.z = 1; barra(); desenhar(); break; case 'pag': U.modo = 'pagina'; U.z = 1; barra(); desenhar(); break;
        case 'gir': if (p) { p.rotation = ((p.rotation || 0) + 90) % 360; H.markDirty(); desenhar(); if (opts.aoMudar) opts.aoMudar('anot'); } break;
        case 'fil': U.filtro = (U.filtro + 1) % 3; barra(); desenhar(); break;
        case 'reg': U.regua = !U.regua; barra(); break;
        case 'conf': if (p) { guardarDesfazer(p); const A = anot(p); A.conferida = !A.conferida; mudou(); if (A.conferida && st.i < paginas().length - 1) aviso(`Página ${st.i + 1} conferida. → para a próxima.`); } break;
        case 'desf': { if (!p) break; const pilha = U.desfazer[p.id]; if (!pilha || !pilha.length) { aviso('Nada para desfazer nesta página.'); break; } const o = JSON.parse(pilha.pop()), A = anot(p); A.itens = o.itens; A.conferida = o.conferida; mudou(); break; }
        case 'txt': U.txt = !U.txt; gaveta(p); setTimeout(desenhar, 0); break;
        case 'usar': { const s = String(win.getSelection() || '').trim(); if (!s) { aviso('Selecione um trecho no texto primeiro.', 'err'); break; } H.insertActive(s, p, 'selecao'); gaveta(p); break; }
        case 'ocr': if (p) H.ocrPages([p]).then(() => atualizar()); break;
        case 'ocrd': { const ps = paginas().filter(x => !x.raw); if (!ps.length) { aviso('Todas as páginas deste documento já têm texto.'); break; } H.ocrPages(ps).then(() => atualizar()); break; }
        case 'comp': H.alternarComparar(); break; case 'jan': H.abrirJanelaDoc(); break; case 'fechar': H.alternarComparar(false); break;
      }
    }
    raiz.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'); if (f) { U.ferr = f.dataset.f; barra(); return; }
      const c = e.target.closest('[data-cor]'); if (c) { U.cor = c.dataset.cor; U.ferr = 'hl'; barra(); return; }
      const ch = e.target.closest('.lt-chips .chip'); if (ch) { H.insertActive(ch.dataset.v, pagina(), 'chip:' + ch.dataset.t); gaveta(pagina()); return; }
      const b = e.target.closest('[data-a]'); if (b && raiz.contains(b)) acao(b.dataset.a);
    });
    raiz.addEventListener('mousedown', e => { if (e.target.closest('.lt-chips .chip, [data-a="usar"]')) e.preventDefault(); });
    q('.lt-doc').addEventListener('change', e => { st.docId = e.target.value; st.i = 0; U.destaque = null; atualizar(); mudouPagina(); });
    if (win.ResizeObserver) { let t = null; obs = new win.ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (!morto) desenhar(); }, 60); }); obs.observe(area); }
    function destruir(){ morto = true; if (obs) obs.disconnect(); }
    /* atalhos (o programa chama quando o foco não está num campo) */
    function tecla(e){
      if (e.ctrlKey && e.key.toLowerCase() === 'z') { acao('desf'); return true; }
      if (e.ctrlKey || e.altKey || e.metaKey) return false;
      const k = e.key.toLowerCase(), f = FERR.find(x => x[3] === k);
      if (f) { U.ferr = f[0]; barra(); return true; }
      if (k === 'c') { acao('conf'); return true; }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { irPag(1); return true; }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { irPag(-1); return true; }
      if (e.key === '+' || e.key === '=') { zoom(1.2); return true; } if (e.key === '-') { zoom(1 / 1.2); return true; }
      if (e.key === '/') { q('.lt-busca input').focus(); return true; }
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
