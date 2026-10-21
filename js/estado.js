/* Qualificador CRCO — js/estado.js: estado da análise, salvar/abrir (.gori), importação da Calculadora GO-RI v3 e ligação dos campos */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/estado.js'] = '1.1.0';
function freshInc(){
  return {blOn:false, blN:'2', blTipo:'Letras', denom:'APARTAMENTO', destinacao:'residenciais', precFI:'6',
    pavs:[{id:uid(),nome:'Térreo',qtd:'1',und:'3',inicio:'101'},{id:uid(),nome:'Superior',qtd:'1',und:'3',inicio:'201'}],
    q1:[], q2:[], q3:{cub:'',cubMes:'',padrao:'',v6:'',v8:'',v9:'',v11:'',v12:'',v13rt:''},
    vagaTxt:'e 01 (uma) vaga de estacionamento descoberta', carOn:true, carDias:'180', mcmv:false, mcmvData:''};
}
function freshState(){
  return {meta:{protocolo:'',tipoAto:'GERAL',dataPrenotacao:'',qualificador:''}, pages:[], docs:[],
    campos:{}, src:{}, ok:{}, partes:[], certidoes:[], checklist:[], exig:[], nota:'', inc:freshInc(), mat:null};
}
let S = freshState();
const FILES = new Map();
let sel = new Set(), lastIdx = null, drag = null, dirty = false, autosaveT = null, curStep = 'ged';

function markDirty(){ dirty = true; clearTimeout(autosaveT); autosaveT = setTimeout(autosave, 1200); }
function snapshot(){
  return {v:4, app:'qualificador-crco', salvoEm:new Date().toISOString(), meta:S.meta, campos:S.campos, src:S.src, ok:S.ok,
    partes:S.partes, certidoes:S.certidoes, checklist:S.checklist, exig:S.exig, nota:S.nota, inc:S.inc, mat:S.mat,
    ged:S.docs.map(d => ({order:d.order, category:d.category, name:d.name, validade:d.validade || '', paginas:d.pageIds.length}))};
}
function applySnapshot(o){
  const base = freshState(), keep = {pages:S.pages, docs:S.docs};
  const inc = Object.assign(freshInc(), o.inc || {});
  inc.q3 = Object.assign(freshInc().q3, (o.inc || {}).q3 || {});
  S = Object.assign(base, {meta:Object.assign(base.meta, o.meta || {}), campos:o.campos || {}, src:o.src || {}, ok:o.ok || {},
    partes:o.partes || [], certidoes:o.certidoes || [], checklist:o.checklist || [], exig:o.exig || [], nota:o.nota || '', inc, mat:o.mat || null}, keep);
}
function autosave(){ if (!$('restoreBar').hidden) return; lsSet('qcrco_autosave', {t:Date.now(), d:snapshot()}); }
function salvarAnalise(){
  const blob = new Blob([JSON.stringify(snapshot(), null, 1)], {type:'application/json'});
  const base = S.meta.protocolo ? 'Prot_' + S.meta.protocolo : (S.campos.empNome || 'analise');
  download(blob, base.replace(/[^\w\-]+/g, '_') + '.gori');
  dirty = false; toast('Análise salva (.gori). As imagens do GED vão no ZIP, não no .gori.');
}
async function abrirAnalise(file){
  try {
    const o = JSON.parse(await file.text());
    if (o.v === 4) applySnapshot(o);
    else if (o.config) importV3(o);
    else throw new Error('formato desconhecido');
    renderAll(); dirty = false;
    toast(o.config ? 'Análise da Calculadora GO-RI v3 importada. Confira os quadros.' : 'Análise aberta.');
  } catch (e) { console.error(e); toast('Arquivo inválido. Use um .gori deste programa ou da Calculadora GO-RI.', 'err'); }
}
/* Importa arquivos .gori da Calculadora GO-RI v3.1 */
function importV3(o){
  const c = o.config || {}, qd = o.quadros || {};
  applySnapshot({meta:{tipoAto:'INCORPORACAO'}});
  const map = {'f-endereco-base':'descricao','f-confrontacao':'confrontacao','f-area-lote':'areaTerreno','f-matricula':'matricula','f-nome':'incNome','f-sede':'incSede','f-cnpj':'incCnpj','f-tecnico':'rtNome','f-num-conselho':'rtRegistro','f-art':'rtArt','f-data-art':'rtArtData','f-condo-nome':'empNome','f-valor':'empValor','f-alvara':'alvaraNum','f-area-alvara':'alvaraArea','f-data-alvara':'alvaraData','f-data-aprovacao':'aprovData','m-data-req':'reqData','m-cep':'cep','m-reg-incorp':'regAnterior'};
  for (const k in map) if (c[k] != null && c[k] !== '') S.campos[map[k]] = String(c[k]);
  if (c.tipo_conselho) S.campos.rtConselho = c.tipo_conselho;
  const I = S.inc;
  I.blOn = !!c['check-blocos']; I.blN = String(c['num-blocos'] || '2'); I.blTipo = c['tipo-blocos'] || 'Letras';
  I.carOn = c['check-carencia'] !== false; I.carDias = String(c['dias-carencia'] || '');
  I.q3.cub = c['q3-cub'] || ''; I.q3.padrao = c['q3-padrao'] || ''; I.q3.v11 = c['q3-v11'] || ''; I.q3.v12 = c['q3-v12'] || '';
  const old13 = parseBR(c['q3-v10']) + parseBR(c['q3-v11']) + parseBR(c['q3-v12']);
  if (old13 > 0) I.q3.v13rt = fmt(old13);
  if (c['m-data-mcmv']) { I.mcmv = true; I.mcmvData = c['m-data-mcmv']; }
  const np = parseInt(c['num-pavimentos'], 10) || 0, nu = parseInt(c['num-unidades'], 10) || 0;
  I.pavs = [];
  for (let i = 1; i <= np; i++) I.pavs.push({id:uid(), nome:c['f-nome-pav-' + i] || `${i}º Pavimento`, qtd:'1', und:String(nu), inicio:c['f-start-pav-' + i] || `${i}01`});
  const cert = (tipo, dk, sk) => { if (c[dk]) S.certidoes.push({id:uid(), tipo, res:c[sk] || 'Negativa', emissao:c[dk], validade:'', obs:''}); };
  cert('TRAB','data-trabalhista','status-trabalhista'); cert('SEFAZ','data-sefaz','status-sefaz'); cert('PROT','data-prot-local','status-prot-local');
  cert('CIV','data-tjgo-civ','status-tjgo-civ'); cert('CRIM','data-tjgo-crim','status-tjgo-crim'); cert('PROTDF','data-prot-df','status-prot-df'); cert('TJDFT','data-tjdft-esp','status-tjdft-esp');
  /* No v3 o Quadro I já trazia totais por tipo de pavimento: quantidade = 1 */
  I.q1 = (qd.q1 || []).map((r, i) => ({id:uid(), pav:i, nome:r[0] || '', qtd:'1', v2:r[1]||'', v3:r[2]||'', v4:r[3]||'', v7:r[4]||'', v8:r[5]||'', v9:r[6]||'', v12:r[7]||'', v13:r[8]||'', v14:r[9]||''}));
  const per = (np * nu) || 1;
  I.q2 = (qd.q2 || []).map((r, idx) => {
    const v = r.inputs || [], id0 = String(v[0] || '');
    let bloco = '', nome = id0; const m = id0.match(/^Bloco\s+(\S+)\s*-\s*(.+)$/i);
    if (m) { bloco = m[1]; nome = m[2].trim(); }
    return {id:uid(), pav: nu ? Math.floor((idx % per) / nu) : 0, bloco, nome, pcd:!!r.isPcd, comp:r.comp || '', v20:v[1]||'', v21:v[2]||'', v22:v[3]||'', v25:v[4]||'', v26:v[5]||'', v27:v[6]||'', acess:'', fiRT:''};
  });
}

/* ---------- Ligação de campos (data-bind) ---------- */
function updRow(list, id, key, val){ const r = list.find(x => x.id === id); if (r) r[key] = val; }
function setBind(b, val){
  const [t, a, k] = b.split(':');
  switch (t) {
    case 'm': S.meta[a] = val; break;
    case 'c': S.campos[a] = val; break;
    case 'p': updRow(S.partes, a, k, val); break;
    case 'ct': updRow(S.certidoes, a, k, val); break;
    case 'ck': updRow(S.checklist, a, k, val); break;
    case 'ex': updRow(S.exig, a, k, val); break;
    case 'pav': updRow(S.inc.pavs, a, k, val); break;
    case 'q1': updRow(S.inc.q1, a, k, val); break;
    case 'q2': updRow(S.inc.q2, a, k, val); break;
    case 'q3': S.inc.q3[a] = val; break;
    case 'i': S.inc[a] = val; break;
  }
  markDirty();
}
function afterBind(b, el){
  const t = b.split(':')[0];
  if (b === 'm:tipoAto') { renderSteps(); if (curStep === 'conf') renderConf(); if (curStep === 'check') renderCheck(); }
  if (b === 'm:dataPrenotacao' || b === 'c:reqData' || t === 'ct') refreshCertStatus();
  if (t === 'q1' || t === 'q2' || t === 'q3' || b === 'i:precFI' || b === 'c:alvaraArea' || b === 'c:reqData' || b === 'm:dataPrenotacao') { if (curStep === 'inc') recalcInc(); }
  if (b === 'i:blOn') renderIncCfg();
  if (el && el.closest) { const h = el.closest('[data-hasdoc]'); if (h) { const s = h.querySelector('.dchk'); if (s) s.innerHTML = docStatus(el.value); } }
  if (t === 'c' || t === 'p' || t === 'ct') updateConfProgress();
}

