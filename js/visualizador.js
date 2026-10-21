/* Qualificador CRCO — js/visualizador.js: lupa, régua, contraste, texto/OCR e exigência rápida */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/visualizador.js'] = '1.3.0';
/* ---------- OCR (Tesseract.js, carregado sob demanda) ---------- */
let ocrWorker = null;
async function ensureOCR(){
  /* Tudo local (pasta lib/ocr): funciona sem internet e nenhuma imagem sai do navegador */
  const base = u => new URL(u, location.href).href;
  if (!window.Tesseract) await loadScript('lib/ocr/tesseract.min.js');
  if (!ocrWorker) ocrWorker = await Tesseract.createWorker('por', 1, {
    workerPath: base('lib/ocr/worker.min.js'), corePath: base('lib/ocr/core/'), langPath: base('lib/ocr/por/'), workerBlobURL: false
  });
  return ocrWorker;
}
function dimensoes(url){ return new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([1, 1]); i.src = url; }); }
/* palavras do OCR com posição, convertidas para a página original (sem giro) */
async function palavrasOCR(data, src, rot){
  const [W, H] = await dimensoes(src), out = [];
  (data && data.blocks || []).forEach(b => (b.paragraphs || []).forEach(pa => (pa.lines || []).forEach(l => (l.words || []).forEach(w => {
    const t = String(w.text || '').trim(); if (!t || !w.bbox) return;
    const R = {x:w.bbox.x0 / W, y:w.bbox.y0 / H, w:(w.bbox.x1 - w.bbox.x0) / W, h:(w.bbox.y1 - w.bbox.y0) / H};
    const [x1, y1] = Leitor.r2o(R.x, R.y, rot), [x2, y2] = Leitor.r2o(R.x + R.w, R.y + R.h, rot);
    out.push({t, x:Math.min(x1, x2), y:Math.min(y1, y2), w:Math.abs(x2 - x1), h:Math.abs(y2 - y1)});
  }))));
  return out;
}
/* OCR só de um trecho (retângulo na página original): rápido, usado pela captura ✂ */
async function ocrRegiao(p, R){
  const [W, H] = await dimensoes(p.dataUrl), img = new Image();
  await new Promise(r => { img.onload = r; img.onerror = r; img.src = p.dataUrl; });
  const sx = Math.max(0, R.x * W), sy = Math.max(0, R.y * H), sw = Math.min(W - sx, R.w * W), sh = Math.min(H - sy, R.h * H);
  const k = Math.max(1, Math.min(3, 1400 / Math.max(sw, 1)));
  const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const w = await ensureOCR(), r = await w.recognize(c.toDataURL('image/png'));
  return (r.data && r.data.text || '').replace(/[ \t]+/g, ' ').trim();
}
async function ocrPages(list){
  try {
    busy(true, 'Preparando OCR (a primeira vez demora)…', 3);
    const w = await ensureOCR();
    for (let i = 0; i < list.length; i++) {
      const p = list[i]; busy(true, `OCR: página ${i + 1} de ${list.length}`, 5 + Math.round(i / list.length * 92));
      const src = p.rotation ? (await toJpeg(p.dataUrl, p.rotation)).data : p.dataUrl;
      const r = await w.recognize(src); p.ocr = (r.data && r.data.text || '').trim(); p.ocrConf = r.data && r.data.confidence != null ? Math.round(r.data.confidence) : null;
      p.words = await palavrasOCR(r.data, src, p.rotation || 0);
    }
    toast('OCR concluído. Confira o texto: leitura de máquina pode errar.');
  } catch (e) { console.error(e); toast('OCR indisponível: ' + e.message, 'err'); }
  finally { busy(false); }
}
const pageText = p => (p && (p.raw || p.ocr)) || '';

/* =====================================================================
   Visualizador (lupa)
   ===================================================================== */
const V = {ctx:[], i:0, z:1, x:0, y:0, filter:0, ruler:false, text:false, drag:false, sx:0, sy:0, pinZ:1};
function openViewer(ctx, i){ if (!ctx.length) return; V.ctx = ctx; V.i = Math.max(0, Math.min(i, ctx.length - 1)); $('viewer').hidden = false; document.body.classList.add('noscroll'); showV(); $('vClose').focus(); }
function closeViewer(){ $('viewer').hidden = true; document.body.classList.remove('noscroll'); V.filter = 0; V.ruler = false; $('vRulerEl').hidden = true; ['vFilter','vRuler'].forEach(id => $(id).setAttribute('aria-pressed', 'false')); if (curStep === 'ged') renderGED(); if (curStep === 'conf') renderConfView(); }
function showV(){
  const p = V.ctx[V.i]; if (!p) return;
  V.z = 1; V.x = 0; V.y = 0;
  $('vTitle').textContent = p.name + (p.hasSig ? ' 🔐' : ''); $('vCount').textContent = `Página ${V.i + 1} de ${V.ctx.length}`;
  $('vSig').hidden = !(p.hasSig && FILES.has(p.fileKey));
  $('vImg').src = p.dataUrl; applyV(); $('vPrev').disabled = V.i === 0; $('vNext').disabled = V.i === V.ctx.length - 1;
  $('vTxt').textContent = pageText(p) || 'Sem camada de texto. Use "Ler com OCR".';
}
function applyV(){ const p = V.ctx[V.i]; if (!p) return; $('vImg').style.transform = `translate(${V.x}px,${V.y}px) scale(${V.z}) rotate(${p.rotation}deg)`; $('vImg').style.filter = ['none','contrast(180%) brightness(95%)','grayscale(100%) contrast(220%)'][V.filter]; }
function navV(d){ const n = V.i + d; if (n >= 0 && n < V.ctx.length) { V.i = n; showV(); } }
function zoomV(d){ V.z = Math.max(.4, Math.min(6, V.z + d)); applyV(); }
function rotV(d){ const p = V.ctx[V.i]; if (!p) return; p.rotation = ((p.rotation || 0) + d + 360) % 360; applyV(); markDirty(); }

/* Exigência rápida */
function openQuickExig(p){ const q = $('qExig'); q._page = p || null; $('qExigRef').textContent = p ? `Referência: ${p.name}` : ''; $('qExigT').value = ''; $('qExigF').value = ''; q.hidden = false; $('qExigT').focus(); }
function addQuickExig(){
  const t = $('qExigT').value.trim(); if (!t) { toast('Escreva a exigência.', 'err'); return; }
  const p = $('qExig')._page; S.exig.push({id:uid(), texto:t, fund:$('qExigF').value.trim(), ref:p ? p.name : ''});
  $('qExig').hidden = true; markDirty(); toast(`Exigência adicionada (${S.exig.length} na nota).`);
}


function bindVisualizador(){
  /* Visualizador */
  $('vClose').onclick = closeViewer; $('vPrev').onclick = () => navV(-1); $('vNext').onclick = () => navV(1);
  $('vZi').onclick = () => zoomV(.25); $('vZo').onclick = () => zoomV(-.25); $('vZr').onclick = () => { V.z = 1; V.x = 0; V.y = 0; applyV(); };
  $('vRl').onclick = () => rotV(-90); $('vRr').onclick = () => rotV(90);
  $('vFilter').onclick = () => { V.filter = (V.filter + 1) % 3; $('vFilter').setAttribute('aria-pressed', String(V.filter > 0)); $('vFilter').textContent = ['Contraste','Realce','P&B'][V.filter]; applyV(); };
  $('vRuler').onclick = () => { V.ruler = !V.ruler; $('vRulerEl').hidden = !V.ruler; $('vRuler').setAttribute('aria-pressed', String(V.ruler)); };
  $('vTextBtn').onclick = () => { V.text = !V.text; $('vTextPane').hidden = !V.text; $('vTextBtn').setAttribute('aria-pressed', String(V.text)); };
  $('vOcr').onclick = async () => { const p = V.ctx[V.i]; if (!p) return; await ocrPages([p]); showV(); };
  $('vCopyTxt').onclick = () => copyText($('vTxt').textContent);
  $('vPin').onclick = () => {
    const on = $('vPinPane').hidden; const p = V.ctx[V.i];
    if (on && p) { $('vPinImg').src = p.dataUrl; $('vPinImg').style.transform = `rotate(${p.rotation}deg)`; $('vPinTag').textContent = 'Fixada: ' + p.name.slice(0, 40); V.pinZ = 1; }
    $('vPinPane').hidden = !on; $('vPin').setAttribute('aria-pressed', String(on)); $('vPin').textContent = on ? 'Desfixar' : 'Fixar lado a lado';
  };
  $('vExig').onclick = () => openQuickExig(V.ctx[V.i]);
  $('vSig').onclick = () => { const p = V.ctx[V.i]; if (p) validarAssinatura(p.fileKey); };
  const vm = $('vMain');
  vm.addEventListener('wheel', e => { e.preventDefault(); zoomV(e.deltaY < 0 ? .2 : -.2); }, {passive:false});
  vm.addEventListener('mousedown', e => { if (e.button !== 0 || e.target.closest('.vnav')) return; V.drag = true; V.sx = e.clientX - V.x; V.sy = e.clientY - V.y; $('vImg').classList.add('grabbing'); });
  vm.addEventListener('mousemove', e => { if (V.drag) { V.x = e.clientX - V.sx; V.y = e.clientY - V.sy; applyV(); } if (V.ruler) { const r = vm.getBoundingClientRect(); $('vRulerEl').style.top = (e.clientY - r.top - 14) + 'px'; } });
  $('vPinPane').addEventListener('wheel', e => { e.preventDefault(); V.pinZ = Math.max(.4, Math.min(5, V.pinZ + (e.deltaY < 0 ? .15 : -.15))); const p = V.ctx[V.i]; $('vPinImg').style.transform = $('vPinImg').style.transform.replace(/scale\([^)]*\)/, '') + ` scale(${V.pinZ})`; }, {passive:false});
  window.addEventListener('mouseup', () => { V.drag = false; CV.drag = false; $('vImg').classList.remove('grabbing'); qx.on = false; });

  /* Exigência rápida (janela arrastável) */
  const qx = {on:false, dx:0, dy:0};
  $('qExigH').addEventListener('mousedown', e => { if (e.target.closest('button')) return; const r = $('qExig').getBoundingClientRect(); qx.on = true; qx.dx = e.clientX - r.left; qx.dy = e.clientY - r.top; });
  window.addEventListener('mousemove', e => { if (!qx.on) return; $('qExig').style.left = Math.max(0, e.clientX - qx.dx) + 'px'; $('qExig').style.top = Math.max(0, e.clientY - qx.dy) + 'px'; });
  $('qExigX').onclick = () => { $('qExig').hidden = true; };
  $('qExigOk').onclick = addQuickExig;
  refreshCatalogo();

}
