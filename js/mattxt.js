/* Qualificador CRCO — js/mattxt.js: janela separada com o texto da matrícula (o que o programa leu em destaque).
 * Pega o texto da janela principal (window.opener.HOST); o que você copiar daqui e colar na ficha entra no aprendizado. */
'use strict';
(function(){
  let o = window.opener; while (o && !o.closed && !o.HOST && o.opener) o = o.opener;
  const H = () => (o && !o.closed ? o.HOST : null), box = document.getElementById('mjTxt');
  let tam = 13; try { tam = +localStorage.getItem('qcrco_mjtam') || 13; } catch (e) {}
  const aplicarTam = () => { box.style.fontSize = tam + 'px'; try { localStorage.setItem('qcrco_mjtam', String(tam)); } catch (e) {} };
  function carregar(alvo){
    const h = H(); if (!h || !h.matTexto) { box.innerHTML = '<p>A janela principal do Qualificador foi fechada. Feche esta janela e abra de novo pela Conferência.</p>'; return; }
    const r = h.matTexto(); document.getElementById('mjTit').textContent = r.titulo || 'Matrícula'; document.title = (r.titulo || 'Matrícula') + ' · Qualificador CRCO';
    box.innerHTML = r.html || '<p>Sem texto de matrícula.</p>'; aplicarTam();
    const mapa = {'c:areaTerreno':'mk-area', 'c:descricao':'mk-imovel', 'c:confrontacao':'mk-conf', 'c:cep':'mk-cep', 'c:matricula':'mk-ato', 'c:regAnterior':'mk-ato'};
    const cls = mapa[alvo]; if (cls) { const all = box.querySelectorAll('.' + cls), el = alvo === 'c:regAnterior' ? all[all.length - 1] : all[0]; if (el) { el.classList.add('mk-foco'); el.scrollIntoView({block:'center'}); } }
  }
  /* busca simples com destaque */
  let achados = [], ia = -1;
  document.getElementById('mjBusca').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; const q = e.target.value.trim(); if (!q) return;
    if (!achados.length || achados.q !== q) { box.querySelectorAll('mark.mj-b').forEach(m => m.replaceWith(document.createTextNode(m.textContent))); box.normalize(); achados = []; achados.q = q;
      const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), nos = []; while (w.nextNode()) nos.push(w.currentNode);
      const ql = q.toLowerCase(); nos.forEach(n => { let t = n.nodeValue, i = t.toLowerCase().indexOf(ql); if (i < 0) return; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length); const m = document.createElement('mark'); m.className = 'mj-b'; r.surroundContents(m); achados.push(m); });
      ia = -1; }
    if (!achados.length) { document.getElementById('mjRes').textContent = 'nada encontrado'; return; }
    achados.forEach(m => m.classList.remove('on')); ia = (ia + 1) % achados.length; achados[ia].classList.add('on'); achados[ia].scrollIntoView({block:'center'});
    document.getElementById('mjRes').textContent = `${ia + 1} de ${achados.length}`;
  });
  document.getElementById('mjMais').onclick = () => { tam = Math.min(24, tam + 1); aplicarTam(); };
  document.getElementById('mjMenos').onclick = () => { tam = Math.max(10, tam - 1); aplicarTam(); };
  document.addEventListener('copy', () => { const s = String(window.getSelection() || '').trim(); const h = H(); if (s && h && h.colouMatricula) h.colouMatricula(s); });
  window.addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.qcrco === 'mat') carregar(e.data.alvo); });
  carregar('');
})();
