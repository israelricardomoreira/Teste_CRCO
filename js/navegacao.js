/* Qualificador CRCO — js/navegacao.js: etapas (abas) e troca de etapa */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/navegacao.js'] = '1.5.7';
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
  renderCaseStrip();
  $('btnNext').textContent = nx ? `Avançar: ${nx.t} →` : 'Gerar nota devolutiva';
}
function goStep(k){
  aprendTrocaEtapa(k);
  curStep = k; renderSteps();
  if (k === 'ged') renderGED(); if (k === 'conf') renderConf(); if (k === 'check') { if (!S.checklist.length) carregarModelo(); else renderCheck(); }
  if (k === 'inc') renderInc(); if (k === 'nota') renderNota();
  const st = $('step-' + k); if (st) st.scrollTop = 0;
}
function syncMeta(){ $('mProt').value = S.meta.protocolo || ''; $('mTipo').value = S.meta.tipoAto || 'GERAL'; $('mPren').value = S.meta.dataPrenotacao || ''; $('mQual').value = S.meta.qualificador || ''; }
function renderAll(){ syncMeta(); renderSteps(); goStep(curStep); }


/* Faixa de situação do caso (sob as etapas): o que há e o que pede atenção; cada item leva à etapa certa */
function renderCaseStrip(){
  const el = $('caseStrip'); if (!el) return;
  el.hidden = !S.docs.length && !Object.keys(S.campos).length;
  if (el.hidden) return;
  const ref = refDate(), inc = S.meta.tipoAto === 'INCORPORACAO';
  const campos = CAMPOS.filter(f => !f.inc || inc), conf = campos.filter(f => S.ok['c:' + f.k]).length, vazios = campos.filter(f => !String(S.campos[f.k] || '').trim()).length;
  const venc = S.certidoes.filter(c => c.validade && c.validade < ref).length, semData = S.certidoes.filter(c => !c.emissao || !c.validade).length;
  const repet = Object.values(certDuplicadas()).filter(x => !x.maisNova).length;
  const rx = inc && S.docs.length ? exigidosDoCaso().resumo : null;
  const vr = S.docs.length ? validacaoResumo() : null;
  const itens = [
    ['ged', 'Documentos', String(S.docs.length), S.docs.length ? '' : 'warn'],
    ['conf', 'Ficha', conf + ' de ' + campos.length + ' conferidos' + (vazios ? ' · ' + vazios + ' vazio(s)' : ''), vazios ? 'warn' : (conf === campos.length ? 'ok' : '')],
    ['conf', 'Certidões', String(S.certidoes.length) + (venc ? ' · ' + venc + ' vencida(s)' : '') + (semData ? ' · ' + semData + ' sem data' : '') + (repet ? ' · ' + repet + ' repetida(s)' : ''), (venc || semData || repet) ? 'warn' : (S.certidoes.length ? 'ok' : '')],
    ...(rx ? [['check', 'Exigidos', rx.ok + ' de ' + rx.total + (rx.falta ? ' · faltam ' + rx.falta : '') + (rx.vencida ? ' · ' + rx.vencida + ' vencida(s)' : ''), (rx.falta || rx.vencida) ? 'warn' : 'ok']] : []),
    ...(vr && vr.total ? [['check', 'Validados', vr.feitos + ' de ' + vr.total, vr.feitos === vr.total ? 'ok' : '']] : []),
    ['nota', 'Exigências', String(S.exig.length), '']
  ];
  el.innerHTML = itens.map(([k, t, v, c]) => '<button type="button" class="cs ' + c + '" data-go="' + k + '"><span class="cs-t">' + t + '</span><span class="cs-v">' + esc(v) + '</span></button>').join('');
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#caseStrip [data-go]'); if (b) goStep(b.dataset.go); });
