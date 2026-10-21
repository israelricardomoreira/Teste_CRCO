/* Qualificador CRCO — js/visor.js: janela separada do documento (para o monitor em pé).
 * Usa o mesmo leitor da Conferência e conversa direto com a janela principal (window.opener). */
'use strict';
(function(){
  const H = window.opener && !window.opener.closed ? window.opener.HOST : null, raiz = document.getElementById('visor');
  if (!H) { raiz.innerHTML = '<p class="vz-msg">Abra esta janela pelo botão <b>⧉ Outra janela</b> da Conferência, no Qualificador.</p>'; return; }
  if (H.VERSAO() !== window.Leitor.VERSAO) { raiz.innerHTML = `<p class="vz-msg">Versões diferentes: programa ${H.VERSAO()}, janela ${window.Leitor.VERSAO}. Recarregue as duas janelas (Ctrl+F5).</p>`; return; }
  const L = window.Leitor.criar(raiz, H, {st:H.CV, janela:'visor', aoMudar:() => H.confMudou('visor')});
  H.visorConectado(window, L);
  const titulo = () => { const o = H.docOpcoes().find(x => x.id === H.CV.docId); document.title = (o ? o.rotulo : 'Documento') + ' · Qualificador CRCO'; };
  titulo(); setInterval(titulo, 2000);
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
    if (L.tecla(e)) e.preventDefault();
  });
  window.addEventListener('beforeunload', () => { try { if (window.opener && !window.opener.closed) H.visorFechado(); } catch (e) {} });
})();
