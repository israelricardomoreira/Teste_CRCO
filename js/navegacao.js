/* Qualificador CRCO — js/navegacao.js: etapas (abas) e troca de etapa */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/navegacao.js'] = '1.3.0';
const STEPS = [
  {k:'ged', t:'Documentos', hint:'Organize as páginas em documentos do GED.'},
  {k:'conf', t:'Conferência', hint:'Confira os dados lado a lado com o documento de origem.'},
  {k:'check', t:'Checklist', hint:'Marque cada requisito; o que virar exigência vai para a nota.'},
  {k:'inc', t:'Incorporação', hint:'Quadros da NBR 12721, auditoria e minuta.'},
  {k:'nota', t:'Nota devolutiva', hint:'Revise as exigências e gere a nota de uma só vez.'}
];
const visibleSteps = () => STEPS.filter(s => s.k !== 'inc' || S.meta.tipoAto === 'INCORPORACAO');
function renderSteps(){
  const vs = visibleSteps();
  if (!vs.some(s => s.k === curStep)) curStep = 'ged';
  $('steps').innerHTML = vs.map((s, i) => `<button role="tab" type="button" aria-selected="${s.k === curStep}" data-step="${s.k}"><span class="n">${i + 1}</span>${s.t}</button>`).join('');
  document.querySelectorAll('.step').forEach(el => el.classList.toggle('on', el.id === 'step-' + curStep));
  const i = vs.findIndex(s => s.k === curStep), nx = vs[i + 1];
  $('stepHint').textContent = vs[i].hint;
  $('btnNext').textContent = nx ? `Avançar: ${nx.t} →` : 'Gerar nota devolutiva';
}
function goStep(k){
  aprendTrocaEtapa(k);
  curStep = k; renderSteps();
  if (k === 'ged') renderGED(); if (k === 'conf') renderConf(); if (k === 'check') renderCheck();
  if (k === 'inc') renderInc(); if (k === 'nota') renderNota();
  const st = $('step-' + k); if (st) st.scrollTop = 0;
}
function syncMeta(){ $('mProt').value = S.meta.protocolo || ''; $('mTipo').value = S.meta.tipoAto || 'GERAL'; $('mPren').value = S.meta.dataPrenotacao || ''; $('mQual').value = S.meta.qualificador || ''; }
function renderAll(){ syncMeta(); renderSteps(); goStep(curStep); }

