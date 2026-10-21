/* Qualificador CRCO — js/visor.js: janela separada do documento (para o monitor em pé).
 * Usa o mesmo leitor da Conferência e conversa direto com a janela principal (window.opener). */
'use strict';
(function(){
  /* acha a janela principal (esta janela pode ter sido aberta por outra janela de documento) */
  let o = window.opener; while (o && !o.closed && !o.HOST && o.opener) o = o.opener;
  const H = o && !o.closed ? o.HOST : null, raiz = document.getElementById('visor');
  const prm = new URLSearchParams(location.hash.slice(1)), indep = prm.get('ind') === '1';
  if (!H) { raiz.innerHTML = '<p class="vz-msg">Abra esta janela pelo botão <b>⧉ Outra janela</b> da Conferência, no Qualificador.</p>'; return; }
  if (H.VERSAO() !== window.Leitor.VERSAO) { raiz.innerHTML = `<p class="vz-msg">Versões diferentes: programa ${H.VERSAO()}, janela ${window.Leitor.VERSAO}. Recarregue as duas janelas (Ctrl+F5).</p>`; return; }
  const st = indep ? {docId:prm.get('doc') || '', i:+(prm.get('i') || 0)} : H.CV;
  const L = window.Leitor.criar(raiz, H, {st, janela:indep ? 'extra' : 'visor', aoMudar:() => H.confMudou(indep ? 'extra' : 'visor')});
  if (indep) H.registrarExtra(window, L); else H.visorConectado(window, L);
  const titulo = () => { const d = H.docOpcoes().find(x => x.id === st.docId); document.title = (d ? d.rotulo : 'Documento') + (indep ? ' · janela extra' : '') + ' · Qualificador CRCO'; };
  titulo(); setInterval(titulo, 2000);
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
    if (L.tecla(e)) e.preventDefault();
  });
  window.addEventListener('beforeunload', () => { try { if (!indep && o && !o.closed) H.visorFechado(); } catch (e) {} });
})();
