/* Qualificador CRCO — js/inicio.js: eventos gerais, atalhos de teclado, conferência de versão e início */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/inicio.js'] = '1.5.0';
const VERSAO = '1.5.0';
const ARQUIVOS = ["js/nucleo.js", "js/leitor.js", "js/dominio.js", "js/estado.js", "js/navegacao.js", "js/ged.js", "js/visualizador.js", "js/conferencia.js", "js/matricula.js", "js/checklist.js", "js/incorporacao.js", "js/quadrospdf.js", "js/ortografia.js", "js/nota.js", "js/aprendizado.js", "js/inicio.js"];
/* Confere se todos os arquivos vieram da mesma entrega (evita subir só parte da atualização) */
function checarVersoes(){
  const reg = window.QUAL_ARQ || {}, ruins = ARQUIVOS.filter(a => reg[a] !== VERSAO);
  if (typeof Motor === 'undefined' || Motor.VERSAO !== VERSAO) ruins.unshift('motor.js');
  if (!ruins.length) return true;
  const b = document.getElementById('avisoVersao'); b.hidden = false;
  b.textContent = 'Arquivos faltando ou de versão diferente: ' + ruins.join(', ') + '. Envie de novo todos os arquivos da mesma versão (' + VERSAO + ').';
  return false;
}

function bindGeral(){
  /* Ligação geral de campos */
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset && el.dataset.ok !== undefined) { S.ok[el.dataset.ok] = el.checked; markDirty(); updateConfProgress(); return; }
    const b = el.dataset && el.dataset.bind; if (!b) return;
    setBind(b, el.type === 'checkbox' ? el.checked : el.value); afterBind(b, el);
  });
  document.addEventListener('focusin', e => {
    const el = e.target;
    if (el.closest && el.closest('#confForm') && el.dataset.bind) {
      if (activeEl) activeEl.classList.remove('isactive');
      activeEl = el; el.classList.add('isactive');
      const lb = el.id ? document.querySelector(`label[for="${cssEsc(el.id)}"]`) : null;
      avisarCampoAtivo();
    }
  });
  $('steps').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) goStep(b.dataset.step); });
  $('btnNext').onclick = () => { const vs = visibleSteps(), i = vs.findIndex(s => s.k === curStep); if (vs[i + 1]) goStep(vs[i + 1].k); else gerarNota(); };
  $('btnSalvar').onclick = salvarAnalise;
  $('btnAbrir').onclick = () => $('fileProj').click();
  $('fileProj').onchange = e => { if (e.target.files[0]) abrirAnalise(e.target.files[0]); e.target.value = ''; };
  $('btnRestore').onclick = () => { const a = lsGet('qcrco_autosave', null); if (a && a.d) { applySnapshot(a.d); $('restoreBar').hidden = true; renderAll(); toast('Análise restaurada. As imagens do GED precisam ser importadas de novo.'); } };
  $('btnDiscard').onclick = () => { try { localStorage.removeItem('qcrco_autosave'); } catch (e) {} $('restoreBar').hidden = true; };

  /* Teclado */
  document.addEventListener('keydown', e => {
    if (!$('viewer').hidden) {
      if (e.key === 'Escape') { if (!$('qExig').hidden) $('qExig').hidden = true; else closeViewer(); return; }
      if (e.target.closest && e.target.closest('textarea,input')) return;
      if (e.key === 'ArrowRight') navV(1); else if (e.key === 'ArrowLeft') navV(-1); else if (e.key === '+') zoomV(.2); else if (e.key === '-') zoomV(-.2);
      return;
    }
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k === 's') { e.preventDefault(); salvarAnalise(); return; }
    if (e.altKey && k === 'i') { e.preventDefault(); if (curStep !== 'ged') goStep('ged'); $('fileIn').click(); return; }
    if (e.altKey && k === 'a' && sel.size) { e.preventDefault(); openGroup([...sel]); return; }
    const inField = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if (!inField && curStep === 'conf' && LP && !(JAN.win && !JAN.win.closed) && LP.tecla(e)) { e.preventDefault(); return; }
    if (!inField && curStep === 'ged' && e.key === 'Delete' && sel.size) { if (confirm(`Remover ${sel.size} página(s) selecionada(s)?`)) { S.pages = S.pages.filter(p => !sel.has(p.id)); sel.clear(); renderGED(); } return; }
    const t = e.target;
    if (t.dataset && t.dataset.r !== undefined && t.tagName !== 'TEXTAREA' && ['Enter','ArrowDown','ArrowUp'].includes(e.key)) {
      e.preventDefault(); const tb = t.closest('table'), r = +t.dataset.r + (e.key === 'ArrowUp' ? -1 : 1);
      const n = tb.querySelector(`[data-r="${r}"][data-c="${t.dataset.c}"]`); if (n) { n.focus(); n.select(); }
    }
  });
  window.addEventListener('beforeunload', e => { if (dirty || S.pages.length) { e.preventDefault(); e.returnValue = ''; } });
}
function checkAutosave(){
  const a = lsGet('qcrco_autosave', null);
  if (a && a.d && (a.d.meta && a.d.meta.protocolo || Object.keys(a.d.campos || {}).length || (a.d.checklist || []).length || ((a.d.inc || {}).q2 || []).length)) {
    $('restoreTxt').textContent = `Há uma análise não salva de ${new Date(a.t).toLocaleString('pt-BR')}${a.d.meta && a.d.meta.protocolo ? ` (protocolo ${a.d.meta.protocolo})` : ''}.`;
    $('restoreBar').hidden = false;
  }
}
function init(){
  if (!checarVersoes()) return;
  $('mTipo').innerHTML = Object.entries(TIPOS_ATO).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('dgCat').innerHTML = CATS.map(c => `<option value="${c}">${catNome(c)}</option>`).join('');
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  else $('libWarn').hidden = false;
  refreshHist(); bindGeral(); bindGED(); bindVisualizador(); bindConferencia(); bindMatricula(); bindChecklist(); bindIncorporacao(); bindQuadrosPDF(); bindNota(); bindAprendizado(); bindMatCard(); bindRetomar(); bindTextoMatricula(); renderAll(); checkAutosave();
}
document.addEventListener('DOMContentLoaded', init);
