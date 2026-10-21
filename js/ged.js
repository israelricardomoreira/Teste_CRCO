/* Qualificador CRCO — js/ged.js: etapa 1 · documentos (GED): importar, agrupar, ordenar, ZIP e validação de assinatura */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/ged.js'] = '1.4.0';
/* =====================================================================
   1. DOCUMENTOS (GED)
   ===================================================================== */
const pageById = id => S.pages.find(p => p.id === id);
const hasSig = buf => { try { return new TextDecoder('latin1').decode(buf).includes('/ByteRange'); } catch (e) { return false; } };
function detectCat(s){
  s = (s || '').toLowerCase();
  /* Alvará, ART/RRT e quadros da NBR vão em Projeto; requerimento e convenção em Outros (ajuste aqui se o cartório usar outra) */
  /* como o cartório usa: alvará, ART/RRT, quadros da NBR, convenção e requerimento vão em Outros */
  const r = [[/matr[ií]cula/,'MATRICULA'],[/escritura/,'ESCRITURA'],[/procura/,'PROCURACAO'],[/certid|\bcnd/,'CERTIDAO'],[/contrato/,'CONTRATO'],[/declara/,'DECLARACAO'],
    [/ato lavrado|traslado/,'ATO_LAVRADO'],[/memorial/,'MEMORIAL'],[/planta/,'PLANTA_ENGENHARIA'],[/projeto/,'PROJETO'],
    [/\brg\b|\bcnh\b|identidade|\bcpf\b/,'DOCUMENTO_PESSOAL']];
  for (const [re, c] of r) if (re.test(s)) return c;
  return 'OUTROS';
}
function addDoc({pageIds, category, name, order, validade = ''}){
  let ord = parseInt(order, 10);
  if (!ord || ord < 1) ord = Math.max(0, ...S.docs.map(d => d.order)) + 1;
  if (S.docs.some(d => d.order === ord)) S.docs.forEach(d => { if (d.order >= ord) d.order++; });
  S.docs.forEach(d => d.collapsed = true);
  const doc = {id:uid(), pageIds, category, name, validade, order:ord, collapsed:false};
  S.docs.push(doc); S.docs.sort((a, b) => a.order - b.order);
  pageIds.forEach(id => { const p = pageById(id); if (p) p.grouped = true; });
  saveHist(name); return doc;
}
/* Posição de cada palavra na página (0..1): permite capturar texto por área e destacar a busca */
function palavrasPDF(tc, vp){
  const out = [], W = vp.width, H = vp.height;
  tc.items.forEach(it => {
    const s = it.str; if (!s || !s.trim()) return;
    const tx = pdfjsLib.Util.transform(vp.transform, it.transform), fh = Math.hypot(tx[2], tx[3]);
    if (Math.abs(tx[1]) > Math.abs(tx[0])) return; /* texto vertical: fora */
    const x = tx[4], y = tx[5] - fh * .85, w = (it.width || 0) * vp.scale, L = s.length || 1, re = /\S+/g; let m;
    while ((m = re.exec(s))) { const x0 = x + w * m.index / L, x1 = x + w * (m.index + m[0].length) / L;
      out.push({t:m[0], x:x0 / W, y:y / H, w:Math.max(.002, (x1 - x0) / W), h:fh * 1.1 / H}); }
  });
  return out;
}
const TIPOS_ACEITOS = /\.(pdf|jpe?g|png|webp|tiff?|zip)$/i;
/* TIFF (padrão de muito scanner), inclusive multipágina: cada página vira uma imagem */
async function tiffParaImagens(buf){
  if (!window.UTIF) throw new Error('leitor de TIFF não carregou');
  const ifds = UTIF.decode(buf).filter(i => i.t256 && i.t257), out = [];
  for (const ifd of ifds) {
    UTIF.decodeImage(buf, ifd); const rgba = UTIF.toRGBA8(ifd);
    const cv = document.createElement('canvas'); cv.width = ifd.width; cv.height = ifd.height;
    const cx = cv.getContext('2d'), im = cx.createImageData(ifd.width, ifd.height); im.data.set(rgba); cx.putImageData(im, 0, 0);
    out.push(await reduzirImagem(cv.toDataURL('image/jpeg', .85))); cv.width = cv.height = 0;
  }
  if (!out.length) throw new Error('TIFF sem páginas');
  return out;
}
/* Foto de celular muito grande pesa na memória e no OCR: limita o lado maior a 3200 px */
function reduzirImagem(url, max = 3200){
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); if (k >= 1) { res(url); return; }
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .85)); };
    img.onerror = () => res(url); img.src = url;
  });
}
/* página do ZIP do GED: volta a usar as marcações da análise (e converte se a página foi girada antes de exportar) */
function religarMarcacoes(p, chave, rot){
  p.chave = chave; const A = S.anot && S.anot[chave]; if (!A || !rot || A.rotConv) return;
  const c = (x, y) => Leitor.o2r(x, y, rot), R = a => { const [x1, y1] = c(a.x, a.y), [x2, y2] = c(a.x + a.w, a.y + a.h); a.x = Math.min(x1, x2); a.y = Math.min(y1, y2); a.w = Math.abs(x2 - x1); a.h = Math.abs(y2 - y1); };
  (A.itens || []).forEach(a => { if (a.t === 'hl' || a.t === 'ok') R(a); else if (a.t === 'risco') { [a.x1, a.y1] = c(a.x1, a.y1); [a.x2, a.y2] = c(a.x2, a.y2); } else if (a.t === 'traco') a.pts = a.pts.map(([x, y]) => c(x, y)); else if (a.t === 'nota') [a.x, a.y] = c(a.x, a.y); });
  A.pontos = {}; A.rotConv = true;
}
/* retomada: a análise tinha GED; pede o ZIP/PDFs (ou confirma seguir sem) */
function pedirGED(ged){
  $('rtLista').innerHTML = ged.map(g => `<li>${String(g.order).padStart(2, '0')} · ${esc(catNome(g.category))} · ${esc(g.name)} <span class="muted">(${g.paginas} pág.)</span></li>`).join('');
  $('dlgRetomar').showModal();
}
async function handleFiles(list, target = {}){
  const arr = [...list];
  const fora = arr.filter(f => !TIPOS_ACEITOS.test(f.name));
  if (fora.length) toast(`Formato não lido: ${fora.map(f => f.name).slice(0, 3).join(', ')}${fora.length > 3 ? '…' : ''}. Aceita PDF, JPG, PNG, WEBP e TIFF (foto de iPhone em HEIC: exporte como JPG).`, 'err');
  /* ZIP do GED (o que este programa baixa): extrai os arquivos e importa como documentos */
  const zips = arr.filter(f => /\.zip$/i.test(f.name));
  if (zips.length) {
    if (!window.JSZip) { toast('Leitor de ZIP indisponível.', 'err'); return; }
    for (const z of zips) { try { const zip = await JSZip.loadAsync(await z.arrayBuffer()); const nomes = Object.keys(zip.files).filter(n => !zip.files[n].dir && /\.(pdf|jpe?g|png|webp|tiff?)$/i.test(n));
      for (const n of nomes) arr.push(new File([await zip.files[n].async('blob')], n.split('/').pop(), {type:/\.pdf$/i.test(n) ? 'application/pdf' : ''})); } catch (e) { toast(`Não consegui abrir o ZIP ${z.name}.`, 'err'); } }
  }
  const ok = arr.filter(f => TIPOS_ACEITOS.test(f.name) && !/\.zip$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric:true, sensitivity:'base'}));
  if (!ok.length) return;
  if (ok.some(f => /\.pdf$/i.test(f.name)) && !window.pdfjsLib) { toast('Leitor de PDF indisponível (sem internet?).', 'err'); return; }
  const novas = [], pendDocs = [];
  busy(true, 'Lendo arquivos…', 1);
  try {
    for (let i = 0; i < ok.length; i++) {
      const f = ok[i]; busy(true, `Lendo ${f.name}`, Math.round(i / ok.length * 100));
      const key = uid(); FILES.set(key, f);
      const m = f.name.match(/^(\d+) - ([A-Z_]+) - (.+)\.(pdf|jpe?g|png|webp|tiff?)$/i);
      const gm = m && S.gedMapa ? S.gedMapa.find(g => g.order === +m[1] && san(g.name) === san(m[3])) || S.gedMapa.find(g => g.order === +m[1]) : null;
      const ids = [];
      if (/\.pdf$/i.test(f.name)) {
        try {
          const buf = await f.arrayBuffer(); const sig = hasSig(buf);
          const pdf = await pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0)), isEvalSupported:false}).promise;
          for (let j = 1; j <= pdf.numPages; j++) {
            busy(true, `Lendo ${f.name} — página ${j}/${pdf.numPages}`, Math.round((i + j / pdf.numPages) / ok.length * 100));
            const pg = await pdf.getPage(j), vp = pg.getViewport({scale:1.4});
            const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
            await pg.render({canvasContext:cv.getContext('2d'), viewport:vp}).promise;
            let raw = '', words = null;
            try { const tc = await pg.getTextContent(); raw = tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('').trim(); words = palavrasPDF(tc, vp); } catch (e) {}
            const p = {id:uid(), fileKey:key, name:pdf.numPages > 1 ? `${f.name.replace(/\.pdf$/i, '')} · p${j}` : f.name, dataUrl:cv.toDataURL('image/jpeg', .82), type:'pdf', pageNum:j, rotation:0, raw, words, ocr:'', hasSig:sig, grouped:false, chave:f.name + '#' + j};
            if (gm && gm.chaves && gm.chaves[j - 1]) religarMarcacoes(p, gm.chaves[j - 1], (gm.rots || [])[j - 1] || 0);
            cv.width = cv.height = 0; novas.push(p); ids.push(p.id);
          }
          if (pdf.destroy) pdf.destroy();
        } catch (e) { console.error(e); toast(`Não foi possível ler ${f.name} (PDF protegido ou corrompido).`, 'err'); continue; }
      } else if (/\.tiff?$/i.test(f.name)) {
        try {
          const imgs = await tiffParaImagens(await f.arrayBuffer());
          imgs.forEach((url, j) => { const p = {id:uid(), fileKey:key, name:imgs.length > 1 ? `${f.name.replace(/\.tiff?$/i, '')} · p${j + 1}` : f.name, dataUrl:url, type:'img', pageNum:j + 1, rotation:0, raw:'', ocr:'', hasSig:false, grouped:false, chave:f.name + '#' + (j + 1)}; novas.push(p); ids.push(p.id); });
        } catch (e) { console.error(e); toast(`Não foi possível ler o TIFF ${f.name}.`, 'err'); continue; }
      } else {
        const p = {id:uid(), fileKey:key, name:f.name, dataUrl:await reduzirImagem(await readDataUrl(f)), type:'img', pageNum:1, rotation:0, raw:'', ocr:'', hasSig:false, grouped:false, chave:f.name + '#1'};
        novas.push(p); ids.push(p.id);
      }
      if (target.doc) { ids.forEach(id => novas.find(x => x.id === id).grouped = true); target.doc.pageIds.splice(target.at ?? target.doc.pageIds.length, 0, ...ids); if (target.at != null) target.at += ids.length; }
      else if (m) { const cat = m[2].toUpperCase(); pendDocs.push({pageIds:ids, category:CATS.includes(cat) ? cat : 'OUTROS', name:gm ? gm.name : m[3], order:m[1], validade:gm ? gm.validade || '' : ''}); }
    }
  } finally { busy(false); }
  if (target.index != null) S.pages.splice(target.index, 0, ...novas); else S.pages.push(...novas);
  pendDocs.forEach(d => addDoc(d));
  if (pendDocs.length && S.gedMapa) { S.docs.forEach(d => { const g = S.gedMapa.find(x => x.order === d.order); if (g && !d.validade && g.validade) d.validade = g.validade; }); }
  renderGED(); markDirty();
  if (novas.length) toast(`${novas.length} página(s) importada(s).`);
}
function renderGED(){ renderMatCard(); renderPages(); renderDocs(); }
function renderPages(){
  const g = $('pagesGrid'); $('pgCount').textContent = S.pages.length;
  if (!S.pages.length) { g.innerHTML = '<div class="empty">Arraste PDFs ou imagens aqui<br><small>ou cole prints com Ctrl+V · Alt+I para importar</small></div>'; updateSel(); return; }
  g.innerHTML = S.pages.map((p, i) => `<div class="pcard${sel.has(p.id) ? ' sel' : ''}${p.grouped ? ' grp' : ''}" data-id="${p.id}" data-i="${i}" draggable="${!p.grouped}" tabindex="0" role="button" aria-pressed="${sel.has(p.id)}" aria-label="Página ${i + 1}: ${esc(p.name)}${p.grouped ? ' (já agrupada)' : ''}">
    <img src="${p.dataUrl}" alt="" style="transform:rotate(${p.rotation}deg)" loading="lazy">
    <span class="pnum">${String(i + 1).padStart(2, '0')}</span>${paginaConferida(p) ? '<span class="pok" title="Página conferida">✓</span>' : ''}${p.hasSig ? '<span class="psig" title="Contém assinatura digital">🔐</span>' : ''}
    <span class="pname">${esc(p.name)}</span><button class="pzoom" type="button" data-zoom="${i}" aria-label="Ampliar">🔍</button></div>`).join('');
  updateSel();
}
function updateSel(){
  [...sel].forEach(id => { const p = pageById(id); if (!p || p.grouped) sel.delete(id); });
  $('selBar').hidden = !sel.size; $('selTxt').textContent = `${sel.size} página(s) selecionada(s)`;
}
function toggleSel(id, shift, idx){
  if (shift && lastIdx !== null) { const a = Math.min(lastIdx, idx), b = Math.max(lastIdx, idx); for (let i = a; i <= b; i++) if (!S.pages[i].grouped) sel.add(S.pages[i].id); }
  else { sel.has(id) ? sel.delete(id) : sel.add(id); lastIdx = idx; }
  renderPages();
}
function refDate(){ return S.campos.reqData || S.meta.dataPrenotacao || todayISO(); }
function renderDocs(){
  if (typeof syncCertidoesDoGED === 'function') syncCertidoesDoGED();
  const box = $('docsList'); $('docCount').textContent = S.docs.length; $('btnZip').disabled = !S.docs.length;
  if (!S.docs.length) { box.innerHTML = '<div class="empty">Selecione páginas à esquerda e clique em <b>Agrupar em documento</b> (Alt+A),<br>ou arraste as páginas para cá.</div>'; return; }
  const ref = refDate();
  box.innerHTML = S.docs.map(d => {
    const pgs = d.pageIds.map(pageById).filter(Boolean);
    const venc = d.validade && d.validade < ref;
    const sigKeys = [...new Set(pgs.filter(p => p.hasSig && FILES.has(p.fileKey)).map(p => p.fileKey))];
    const sigBtns = sigKeys.map((k, n) => `<button class="btn sm" type="button" data-act="sig" data-key="${k}" title="Copia o nome do PDF e abre o validador do ITI: cole (Ctrl+V) e tecle Enter">🔐 Validar${sigKeys.length > 1 ? ' ' + (n + 1) : ''}</button>`).join('');
    return `<article class="dcard${d.collapsed ? ' col' : ''}" data-doc="${d.id}">
      <div class="dtop" draggable="true"><button class="dtog" type="button" data-act="tog" aria-expanded="${!d.collapsed}" aria-label="Expandir ou recolher">▾</button>
        <input class="dord" type="number" min="1" value="${d.order}" data-act="ord" aria-label="Ordem no GED">
        <span class="dcat">${esc(catNome(d.category))}</span><span class="dname">${esc(d.name)}</span><span class="count">${pgs.length} pág.${pgs.some(paginaConferida) ? ` · <span class="${pgs.every(paginaConferida) ? 'okt' : 'warnt'}">${pgs.filter(paginaConferida).length}/${pgs.length} conferidas</span>` : ''}</span>
        ${sigBtns}${venc ? '<span class="badge err">vencido</span>' : ''}
        <button class="btn sm" type="button" data-act="ver">Ver</button><button class="btn sm" type="button" data-act="anexar">Anexar arquivo</button><button class="btn sm danger" type="button" data-act="rm" aria-label="Desfazer documento">✕</button></div>
      <div class="dbody"><div class="dfields">
        <label>Tipo<select data-act="cat">${CATS.map(c => `<option value="${c}"${c === d.category ? ' selected' : ''}>${catNome(c)}</option>`).join('')}</select></label>
        <label class="grow">Descrição GED<input data-act="name" value="${esc(d.name)}" list="histGED" autocomplete="off"></label>
        <label>Válido até<input type="date" data-act="val" value="${esc(d.validade || '')}"></label></div>
        <div class="strip" data-strip="${d.id}">${pgs.map((p, pi) => `<div class="sthumb" draggable="true" data-pi="${pi}" title="${esc(p.name)} — clique para tirar do documento"><img src="${p.dataUrl}" alt="" style="transform:rotate(${p.rotation}deg)"></div>`).join('')}<span class="strip-drop">solte páginas aqui</span></div></div></article>`;
  }).join('');
}
function movePages(ids, targetId, before){
  const moving = S.pages.filter(p => ids.includes(p.id));
  S.pages = S.pages.filter(p => !ids.includes(p.id));
  let idx = targetId ? S.pages.findIndex(p => p.id === targetId) : -1;
  if (idx < 0) idx = S.pages.length; else if (!before) idx++;
  S.pages.splice(idx, 0, ...moving);
}
function nearest(container, selector, e){
  let best = null, bd = 1e12, before = true;
  container.querySelectorAll(selector).forEach(el => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = Math.hypot(e.clientX - cx, e.clientY - cy); if (d < bd) { bd = d; best = el; before = e.clientX < cx; } });
  return {el:best, before};
}
function openGroup(ids){
  ids = ids.filter(id => { const p = pageById(id); return p && !p.grouped; });
  if (!ids.length) return;
  const dlg = $('dlgGroup'); dlg._ids = ids;
  const sug = (pageById(ids[0]).name || '').replace(/\.[^/.]+$/, '').replace(/ · p\d+$/, '');
  $('dgSub').textContent = `${ids.length} página(s) selecionada(s)`;
  $('dgOrd').value = Math.max(0, ...S.docs.map(d => d.order)) + 1; $('dgCat').value = detectCat(sug); $('dgName').value = sug; $('dgVal').value = '';
  dlg.showModal(); setTimeout(() => { $('dgName').focus(); $('dgName').select(); }, 30);
}
function removeDoc(id){ const d = S.docs.find(x => x.id === id); if (!d) return; d.pageIds.forEach(pid => { const p = pageById(pid); if (p) p.grouped = false; }); S.docs = S.docs.filter(x => x !== d); renderGED(); markDirty(); }
function removePageFromDoc(docId, pi){ const d = S.docs.find(x => x.id === docId); if (!d) return; const pid = d.pageIds.splice(pi, 1)[0]; const p = pageById(pid); if (p) p.grouped = false; if (!d.pageIds.length) S.docs = S.docs.filter(x => x !== d); renderGED(); markDirty(); }
function saveHist(v){ if (!v || v.length < 3) return; const h = lsGet('ged_history', []).filter(x => x !== v); h.unshift(v); lsSet('ged_history', h.slice(0, 60)); refreshHist(); }
function refreshHist(){ $('histGED').innerHTML = lsGet('ged_history', []).map(h => `<option value="${esc(h)}">`).join(''); }
function toJpeg(url, rot){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'), sw = rot % 180 !== 0; c.width = sw ? img.naturalHeight : img.naturalWidth; c.height = sw ? img.naturalWidth : img.naturalHeight; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180); x.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2); res({data:c.toDataURL('image/jpeg', .88), w:c.width, h:c.height}); };
    img.onerror = () => rej(new Error('imagem ilegível'));
    img.src = url;
  });
}
async function baixarZip(){
  if (!S.docs.length) return;
  if (!window.JSZip || !window.PDFLib) { toast('Bibliotecas de exportação indisponíveis (sem internet?).', 'err'); return; }
  busy(true, 'Gerando ZIP…', 2);
  const zip = new JSZip(), cache = new Map(), rows = [['Ordem','Categoria','Descricao','Paginas','ValidoAte']];
  try {
    const docs = [...S.docs].sort((a, b) => a.order - b.order);
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i]; busy(true, `Exportando ${d.name}`, 5 + Math.round(i / docs.length * 88));
      const out = await PDFLib.PDFDocument.create(), pgs = d.pageIds.map(pageById).filter(Boolean);
      for (const p of pgs) {
        let done = false;
        if (p.type === 'pdf' && FILES.has(p.fileKey)) {
          try {
            if (!cache.has(p.fileKey)) cache.set(p.fileKey, await PDFLib.PDFDocument.load(await FILES.get(p.fileKey).arrayBuffer(), {ignoreEncryption:true}));
            const [cp] = await out.copyPages(cache.get(p.fileKey), [p.pageNum - 1]);
            if (p.rotation) cp.setRotation(PDFLib.degrees((cp.getRotation().angle + p.rotation) % 360));
            out.addPage(cp); done = true;
          } catch (e) { console.warn('Cópia nativa falhou; usando imagem da página.', e); }
        }
        if (!done) {
          const j = await toJpeg(p.dataUrl, p.rotation), img = await out.embedJpg(j.data);
          const W = 595.28, H = 841.89, pg = out.addPage([W, H]), sc = Math.min(W / j.w, H / j.h);
          pg.drawImage(img, {x:(W - j.w * sc) / 2, y:(H - j.h * sc) / 2, width:j.w * sc, height:j.h * sc});
        }
      }
      zip.file(`${String(d.order).padStart(2, '0')} - ${d.category} - ${san(d.name)}.pdf`, await out.save());
      rows.push([d.order, d.category, d.name, pgs.length, fmtDate(d.validade)]);
    }
    zip.file('_LISTA_GED.csv', '\uFEFF' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n'));
    busy(true, 'Compactando…', 97);
    const blob = await zip.generateAsync({type:'blob'});
    download(blob, `GED_${S.meta.protocolo ? 'Prot_' + san(S.meta.protocolo) + '_' : ''}${todayISO()}.zip`);
    toast('ZIP do GED gerado. O arquivo de aprendizado baixa em seguida, separado.');
    setTimeout(baixarAprendizado, 800);
  } catch (e) { console.error(e); toast('Erro ao gerar o ZIP: ' + e.message, 'err'); }
  finally { busy(false); }
}

/* ---------- Validação de assinatura: copia o nome do PDF e abre o ITI ---------- */
function validarAssinatura(fileKey){
  const f = FILES.get(fileKey);
  if (!f) { toast('Arquivo original não está carregado.', 'err'); return; }
  const abrir = () => window.open('https://validar.iti.gov.br/', '_blank', 'noopener');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(f.name).then(() => toast(`Nome copiado: ${f.name} — no ITI, cole (Ctrl+V) e tecle Enter.`), () => toast('Não consegui copiar o nome; selecione o arquivo manualmente.', 'err'));
  }
  abrir();
}


function bindGED(){
  /* GED */
  $('btnImport').onclick = () => $('fileIn').click();
  $('fileIn').onchange = e => { handleFiles(e.target.files, {}); e.target.value = ''; };
  $('btnGroup').onclick = () => openGroup([...sel]);
  $('btnSelAll').onclick = () => { S.pages.forEach(p => { if (!p.grouped) sel.add(p.id); }); renderPages(); };
  $('btnClearSel').onclick = () => { sel.clear(); renderPages(); };
  $('btnZip').onclick = baixarZip;
  $('btnToggleAll').onclick = () => { const open = S.docs.some(d => d.collapsed); S.docs.forEach(d => d.collapsed = !open); $('btnToggleAll').textContent = open ? 'Fechar todos' : 'Abrir todos'; renderDocs(); };
  $('btnClearAll').onclick = () => { if (!confirm('Limpar todas as páginas e documentos do GED?')) return; S.pages = []; S.docs = []; sel.clear(); FILES.clear(); renderGED(); };
  $('fGroup').addEventListener('submit', e => {
    const dlg = $('dlgGroup');
    if (e.submitter && e.submitter.value === 'ok') {
      const name = $('dgName').value.trim() || $('dgCat').value;
      addDoc({pageIds:[...dlg._ids], category:$('dgCat').value, name, order:$('dgOrd').value, validade:$('dgVal').value});
      sel.clear(); renderGED(); markDirty();
    }
  });
  const grid = $('pagesGrid');
  grid.addEventListener('click', e => {
    const z = e.target.closest('[data-zoom]'); if (z) { e.stopPropagation(); openViewer(S.pages, +z.dataset.zoom); return; }
    const c = e.target.closest('.pcard'); if (!c) return; const p = pageById(c.dataset.id); if (!p || p.grouped) return;
    toggleSel(p.id, e.shiftKey, +c.dataset.i);
  });
  grid.addEventListener('dblclick', e => { const c = e.target.closest('.pcard'); if (c) openViewer(S.pages, +c.dataset.i); });
  grid.addEventListener('keydown', e => { const c = e.target.closest('.pcard'); if (!c || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); const p = pageById(c.dataset.id); if (p && !p.grouped) { toggleSel(p.id, e.shiftKey, +c.dataset.i); const n = $('pagesGrid').querySelector(`[data-id="${cssEsc(p.id)}"]`); if (n) n.focus(); } });
  grid.addEventListener('dragstart', e => { const c = e.target.closest('.pcard'); if (!c) return; const id = c.dataset.id; drag = {type:'pages', ids:sel.has(id) ? [...sel] : [id]}; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'pages'); });
  document.addEventListener('dragend', () => { drag = null; document.querySelectorAll('.drag,.over,.drop-a,.drop-b').forEach(x => x.classList.remove('drag', 'over', 'drop-a', 'drop-b')); });
  const zone = $('pagesZone');
  zone.addEventListener('dragover', e => {
    e.preventDefault(); const files = e.dataTransfer.types.includes('Files');
    if (!files && !(drag && drag.type === 'pages')) return;
    zone.classList.toggle('drag', files);
    grid.querySelectorAll('.pcard').forEach(c => c.classList.remove('drop-a', 'drop-b'));
    const n = nearest(grid, '.pcard:not(.grp)', e); if (n.el) n.el.classList.add(n.before ? 'drop-b' : 'drop-a');
  });
  zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) { zone.classList.remove('drag'); grid.querySelectorAll('.pcard').forEach(c => c.classList.remove('drop-a', 'drop-b')); } });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    const n = nearest(grid, '.pcard:not(.grp)', e);
    if (e.dataTransfer.files.length) { let idx = n.el ? S.pages.findIndex(p => p.id === n.el.dataset.id) + (n.before ? 0 : 1) : S.pages.length; handleFiles(e.dataTransfer.files, {index:idx}); return; }
    if (drag && drag.type === 'pages') { movePages(drag.ids, n.el ? n.el.dataset.id : null, n.before); renderPages(); markDirty(); }
  });
  const docs = $('docsList');
  docs.addEventListener('click', e => {
    const card = e.target.closest('.dcard'); if (!card) return; const d = S.docs.find(x => x.id === card.dataset.doc); if (!d) return;
    const th = e.target.closest('.sthumb'); if (th) { removePageFromDoc(d.id, +th.dataset.pi); return; }
    const act = e.target.closest('[data-act]'); const a = act && act.dataset.act;
    if (a === 'tog') { d.collapsed = !d.collapsed; renderDocs(); }
    else if (a === 'rm') removeDoc(d.id);
    else if (a === 'ver') { const all = [...S.docs].sort((x, y) => x.order - y.order).flatMap(x => x.pageIds.map(pageById).filter(Boolean)); openViewer(all, all.findIndex(p => p.id === d.pageIds[0])); }
    else if (a === 'sig') validarAssinatura(act.dataset.key);
    else if (a === 'anexar') { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff'; inp.onchange = ev => handleFiles(ev.target.files, {doc:d}); inp.click(); }
  });
  docs.addEventListener('dblclick', e => { const top = e.target.closest('.dtop'); if (!top || e.target.closest('button,input')) return; const d = S.docs.find(x => x.id === top.closest('.dcard').dataset.doc); d.collapsed = !d.collapsed; renderDocs(); });
  docs.addEventListener('change', e => {
    const card = e.target.closest('.dcard'); if (!card) return; const d = S.docs.find(x => x.id === card.dataset.doc); const a = e.target.dataset.act;
    if (a === 'ord') { const n = parseInt(e.target.value, 10); if (!n || n < 1) { e.target.value = d.order; return; } if (S.docs.some(x => x !== d && x.order === n)) S.docs.forEach(x => { if (x !== d && x.order >= n) x.order++; }); d.order = n; S.docs.sort((x, y) => x.order - y.order); renderDocs(); }
    if (a === 'cat') { d.category = e.target.value; renderDocs(); }
    if (a === 'val') { d.validade = e.target.value; renderDocs(); }
    if (a === 'name') saveHist(e.target.value);
    markDirty();
  });
  docs.addEventListener('input', e => { if (e.target.dataset.act !== 'name') return; const d = S.docs.find(x => x.id === e.target.closest('.dcard').dataset.doc); d.name = e.target.value; e.target.closest('.dcard').querySelector('.dname').textContent = d.name || '—'; markDirty(); });
  docs.addEventListener('dragstart', e => {
    const th = e.target.closest('.sthumb'); if (th) { e.stopPropagation(); drag = {type:'strip', doc:th.closest('.dcard').dataset.doc, pi:+th.dataset.pi}; e.dataTransfer.setData('text/plain', 'strip'); return; }
    const top = e.target.closest('.dtop'); if (top && !e.target.closest('input,select')) { drag = {type:'doc', doc:top.closest('.dcard').dataset.doc}; e.dataTransfer.setData('text/plain', 'doc'); }
  });
  docs.addEventListener('dragover', e => {
    const files = e.dataTransfer.types.includes('Files'); if (!files && !drag) return; e.preventDefault();
    docs.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    const strip = e.target.closest('.strip'); if (strip && (files || drag.type === 'pages' || drag.type === 'strip')) strip.classList.add('over');
    else if (drag && drag.type === 'doc') { const c = e.target.closest('.dcard'); if (c) c.classList.add('over'); }
    else docs.classList.toggle('drag', !!(drag && drag.type === 'pages'));
  });
  docs.addEventListener('dragleave', e => { if (!docs.contains(e.relatedTarget)) docs.classList.remove('drag'); });
  docs.addEventListener('drop', e => {
    e.preventDefault(); docs.classList.remove('drag');
    const strip = e.target.closest('.strip'), card = e.target.closest('.dcard');
    const d = card ? S.docs.find(x => x.id === card.dataset.doc) : null;
    let at = d ? d.pageIds.length : 0;
    if (strip) { const n = nearest(strip, '.sthumb', e); if (n.el) at = +n.el.dataset.pi + (n.before ? 0 : 1); }
    if (e.dataTransfer.files.length) { if (d && strip) handleFiles(e.dataTransfer.files, {doc:d, at}); else handleFiles(e.dataTransfer.files, {}); return; }
    if (!drag) return;
    if (drag.type === 'pages') {
      const ids = drag.ids.filter(id => { const p = pageById(id); return p && !p.grouped; });
      if (d && strip) { ids.forEach(id => pageById(id).grouped = true); d.pageIds.splice(at, 0, ...ids); sel.clear(); renderGED(); markDirty(); }
      else openGroup(ids);
    } else if (drag.type === 'strip' && d && d.id === drag.doc) {
      let to = at; if (drag.pi < to) to--; const [m] = d.pageIds.splice(drag.pi, 1); d.pageIds.splice(to, 0, m); renderDocs(); markDirty();
    } else if (drag.type === 'doc' && d && d.id !== drag.doc) {
      const src = S.docs.find(x => x.id === drag.doc), ord = d.order; S.docs.forEach(x => { if (x !== src && x.order >= ord) x.order++; }); src.order = ord; S.docs.sort((x, y) => x.order - y.order); renderDocs(); markDirty();
    }
    drag = null;
  });
  window.addEventListener('paste', e => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const items = [...((e.clipboardData && e.clipboardData.items) || [])].filter(i => i.type.startsWith('image'));
    if (!items.length || /INPUT|TEXTAREA/.test(tag)) return;
    const t = new Date(), ts = [t.getHours(), t.getMinutes(), t.getSeconds()].map(x => String(x).padStart(2, '0')).join('');
    handleFiles(items.map((it, i) => new File([it.getAsFile()], `Print_${ts}${i ? '_' + i : ''}.png`, {type:it.type})), {});
    if (curStep !== 'ged') goStep('ged');
  });

}

function bindRetomar(){
  $('rtImp').onclick = () => $('rtFile').click();
  $('rtFile').onchange = async e => { const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return; $('dlgRetomar').close(); if (curStep !== 'ged') goStep('ged'); await handleFiles(fs, {}); toast('GED importado: as marcações voltaram nas páginas correspondentes.'); };
  $('rtSem').onclick = () => { if (confirm('Realmente não vai adicionar o GED? Sem ele, a Conferência fica sem as páginas e as marcações não aparecem. Dá para importar depois pela etapa Documentos.')) $('dlgRetomar').close(); };
}
