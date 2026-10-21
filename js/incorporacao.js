/* Qualificador CRCO — js/incorporacao.js: etapa 4 · quadros da NBR 12721, IV-B, auditoria e minuta */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/incorporacao.js'] = '1.0.0';
/* =====================================================================
   4. INCORPORAÇÃO (NBR 12721)
   ===================================================================== */
const blockName = (b, tipo) => tipo === 'Números' || tipo === 'Numeros' ? String(b) : (b <= 26 ? String.fromCharCode(64 + b) : 'B' + b);
function renderInc(){ renderIncCfg(); renderQ1(); renderQ2(); renderQ3(); renderMinCfg(); recalcInc(); }
function renderIncCfg(){
  const I = S.inc;
  $('incCfg').innerHTML = `<div class="fgrid" style="margin-bottom:12px">
    <div class="fld"><label><input type="checkbox" data-bind="i:blOn"${I.blOn ? ' checked' : ''}> Mais de um bloco/torre</label></div>
    ${I.blOn ? `<div class="fld"><label for="iBlN">Quantidade de blocos</label><input id="iBlN" type="number" min="1" data-bind="i:blN" value="${esc(I.blN)}"></div>
    <div class="fld"><label for="iBlT">Nomenclatura</label><select id="iBlT" data-bind="i:blTipo">${['Letras','Números'].map(o => `<option${o === I.blTipo ? ' selected' : ''}>${o}</option>`).join('')}</select></div>` : ''}
    <div class="fld"><label for="iPrec">Casas decimais do coeficiente (31)</label><select id="iPrec" data-bind="i:precFI">${[4,5,6,7,8].map(o => `<option${String(o) === String(I.precFI) ? ' selected' : ''}>${o}</option>`).join('')}</select></div></div>
    <table class="lt"><thead><tr><th>Tipo de pavimento</th><th style="width:110px">Qtd. idênticos</th><th style="width:120px">Unid. por pavimento</th><th style="width:120px">1ª unidade</th><th style="width:40px"></th></tr></thead><tbody>
    ${I.pavs.map(p => `<tr><td><input data-bind="pav:${p.id}:nome" value="${esc(p.nome)}" aria-label="Nome do pavimento"></td><td><input type="number" min="1" data-bind="pav:${p.id}:qtd" value="${esc(p.qtd)}" aria-label="Quantidade de pavimentos idênticos"></td><td><input type="number" min="0" data-bind="pav:${p.id}:und" value="${esc(p.und)}" aria-label="Unidades por pavimento"></td><td><input data-bind="pav:${p.id}:inicio" value="${esc(p.inicio)}" aria-label="Numeração da primeira unidade"></td><td><button class="btn sm danger" type="button" data-rmpav="${p.id}" aria-label="Remover pavimento">✕</button></td></tr>`).join('')}
    </tbody></table>
    <div class="row" style="margin-top:12px"><button class="btn" type="button" id="addPav">+ Tipo de pavimento</button><button class="btn" type="button" id="genQ">Gerar Quadros I e II</button><span class="muted" style="font-size:12px">Pavimentos idênticos numeram de 100 em 100 (ex.: 201, 301, 401…). Os nomes das unidades podem ser editados no Quadro II.</span></div>`;
}
function genQuadros(){
  const I = S.inc;
  if ((I.q1.length || I.q2.length) && !confirm('Gerar de novo apaga os valores lançados nos Quadros I e II. Continuar?')) return;
  const nb = I.blOn ? Math.max(1, parseInt(I.blN, 10) || 1) : 1;
  I.q1 = I.pavs.map((p, pi) => ({id:uid(), pav:pi, nome:p.nome, qtd:String((parseInt(p.qtd, 10) || 1) * nb), v2:'',v3:'',v4:'',v7:'',v8:'',v9:'',v12:'',v13:'',v14:''}));
  I.q2 = [];
  for (let b = 1; b <= nb; b++) {
    const bl = I.blOn ? blockName(b, I.blTipo) : '';
    I.pavs.forEach((p, pi) => {
      const q = Math.max(1, parseInt(p.qtd, 10) || 1), u = Math.max(0, parseInt(p.und, 10) || 0);
      const ini = String(p.inicio || '').trim() || `${pi + 1}01`, base = parseInt(ini, 10) || ((pi + 1) * 100 + 1);
      for (let k = 0; k < q; k++) for (let j = 0; j < u; j++) I.q2.push({id:uid(), pav:pi, bloco:bl, nome:String(base + k * 100 + j).padStart(ini.length, '0'), pcd:false, comp:'', v20:'',v21:'',v22:'',v25:'',v26:'',v27:'', acess:'', fiRT:''});
    });
  }
  renderInc(); markDirty(); toast(`Quadros gerados: ${I.q1.length} tipo(s) de pavimento e ${I.q2.length} unidade(s).`);
  const q1c = $('q1Card'); if (q1c && q1c.scrollIntoView) q1c.scrollIntoView({behavior:'smooth'});
}
const Q1COLS = [['nome','Pavimento\n(1)','t'],['qtd','Qtd.\nidênt.','e'],['v2','CP\n(2)','e'],['v3','Real dif./desc.\n(3)','e'],['v4','Equiv.\n(4)','e'],['c5','Real\n(5)','c'],['c6','Equiv.\n(6)','c'],['v7','CP\n(7)','e'],['v8','Real dif./desc.\n(8)','e'],['v9','Equiv.\n(9)','e'],['c10','Real\n(10)','c'],['c11','Equiv.\n(11)','c'],['v12','CP\n(12)','e'],['v13','Real dif./desc.\n(13)','e'],['v14','Equiv.\n(14)','e'],['c15','Real\n(15)','c'],['c16','Equiv.\n(16)','c'],['c17','Real\n(17)','k'],['c18','Equiv.\n(18)','k']];
const Q2COLS = [['nome','Unidade\n(19)','t'],['pcd','PCD','b'],['v20','CP\n(20)','e'],['v21','Real dif./desc.\n(21)','e'],['v22','Equiv.\n(22)','e'],['c23','Real\n(23)','c'],['c24','Equiv.\n(24)','c'],['v25','CP\n(25)','e'],['v26','Real dif./desc.\n(26)','e'],['v27','Equiv.\n(27)','e'],['c28','Real\n(28)','c'],['c29','Equiv.\n(29)','c'],['c30','Equiv. total\n(30)','k'],['c31','Calculado\n(31)','k'],['fiRT','Do RT\n(31)','e'],['c32','CP\n(32)','c'],['c33','Real\n(33)','c'],['c34','Equiv.\n(34)','c'],['c35','Real\n(35)','c'],['c36','Equiv.\n(36)','c'],['c37','Real\n(37)','k'],['c38','Equiv.\n(38)','k'],['acess','Acessória\n(IV-B C)','e'],['comp','Composição da unidade','w']];
function gridHTML(cols, rows, prefix, groups){
  let h = `<thead><tr>${groups.map(([t, n]) => `<th colspan="${n}">${t}</th>`).join('')}</tr><tr>${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach((r, ri) => {
    let ei = 0;
    h += '<tr>' + cols.map(([k, , t]) => {
      if (t === 'c' || t === 'k') return `<td class="c${t === 'k' ? ' k' : ''}" id="${prefix}c_${ri}_${k}">0,00</td>`;
      if (t === 'b') return `<td style="text-align:center"><input type="checkbox" data-bind="${prefix}:${r.id}:${k}"${r[k] ? ' checked' : ''} aria-label="Unidade PCD"></td>`;
      const cls = t === 't' ? ' class="t"' : t === 'w' ? ' class="w"' : '';
      const pre = (k === 'nome' && r.bloco) ? `<span class="blk">Bl. ${esc(r.bloco)}</span>` : '';
      return `<td style="white-space:nowrap">${pre}<input${cls} data-bind="${prefix}:${r.id}:${k}" data-r="${ri}" data-c="${ei++}" id="${prefix}i_${ri}_${k}" value="${esc(r[k])}" inputmode="${t === 'e' ? 'decimal' : 'text'}" aria-label="${esc(cols.find(c => c[0] === k)[1].replace('\n', ' '))} — linha ${ri + 1}"></td>`;
    }).join('') + '</tr>';
  });
  h += `</tbody><tfoot><tr>${cols.map(([k, , t], i) => i === 0 ? '<td style="text-align:left">TOTAIS</td>' : (t === 'b' || t === 't' || t === 'w') ? '<td></td>' : `<td id="${prefix}t_${k}">0,00</td>`).join('')}</tr></tfoot>`;
  return h;
}
function renderQ1(){ $('tQ1').innerHTML = S.inc.q1.length ? gridHTML(Q1COLS, S.inc.q1, 'q1', [['',2],['Área privativa',5],['Comum — divisão não proporcional',5],['Comum — divisão proporcional',5],['Área do pavimento',2]]) : '<tbody><tr><td class="empty">Configure os pavimentos e clique em "Gerar Quadros I e II".</td></tr></tbody>'; }
function renderQ2(){
  const I = S.inc;
  $('tQ2').innerHTML = I.q2.length ? gridHTML(Q2COLS, I.q2, 'q2', [['',2],['Privativa — não proporcional',5],['Comum — não proporcional',5],['',1],['Coeficiente',2],['Comum — proporcional',5],['Área da unidade',2],['',2]]) : '<tbody><tr><td class="empty">Os quadros ainda não foram gerados.</td></tr></tbody>';
  const bls = [...new Set(I.q2.map(r => r.bloco).filter(Boolean))];
  $('bBloco').innerHTML = '<option value="">Todos</option>' + bls.map(b => `<option>${esc(b)}</option>`).join('');
}
function q3Row(lbl, bind, val, cls = ''){ return `<div class="lbl${cls ? ' ' + cls : ''}">${lbl}</div>${bind ? `<input data-bind="${bind}" value="${esc(val)}" inputmode="decimal" style="text-align:right;font-family:var(--mono)" aria-label="${esc(lbl)}">` : `<div class="val${cls ? ' ' + cls : ''}" id="${val}">0,00</div>`}`; }
function renderQ3(){
  const q = S.inc.q3;
  $('q3Box').innerHTML = `<div class="fgrid" style="margin-bottom:16px;max-width:760px">
      <div class="fld"><label for="q3cub">CUB do mês (R$/m²)</label><input id="q3cub" data-bind="q3:cub" value="${esc(q.cub)}" inputmode="decimal"></div>
      <div class="fld"><label for="q3mes">Mês de referência do CUB</label><input id="q3mes" type="month" data-bind="q3:cubMes" value="${esc(q.cubMes)}"></div>
      <div class="fld"><label for="q3pad">Projeto-padrão (ex.: R8-N, PIS)</label><input id="q3pad" data-bind="q3:padrao" value="${esc(q.padrao)}"></div></div>
    <div class="q3">
      ${q3Row('4.1 Área real privativa global (QI, Σ5)', '', 'q3_41')}${q3Row('4.2 Área real de uso comum global (QI, Σ10 + Σ15)', '', 'q3_42')}
      ${q3Row('4.3 Área real global (QI, Σ17)', '', 'q3_43', 'tot')}${q3Row('4.4 Área equivalente privativa global (QI, Σ6)', '', 'q3_44')}
      ${q3Row('4.5 Área equivalente de uso comum global (QI, Σ11 + Σ16)', '', 'q3_45')}${q3Row('4.6 Área equivalente global (QI, Σ18)', '', 'q3_46', 'tot')}
      ${q3Row('5. Custo básico global (4.6 × CUB)', '', 'q3_5')}${q3Row('6. Parcelas adicionais (total do item 6)', 'q3:v6', q.v6)}
      ${q3Row('7. 1º subtotal (5 + 6)', '', 'q3_7', 'tot')}${q3Row('8. Impostos, taxas e emolumentos', 'q3:v8', q.v8)}${q3Row('9. Projetos', 'q3:v9', q.v9)}
      ${q3Row('10. 2º subtotal (7 + 8 + 9)', '', 'q3_10', 'tot')}${q3Row('11. Remuneração do construtor', 'q3:v11', q.v11)}${q3Row('12. Remuneração do incorporador', 'q3:v12', q.v12)}
      ${q3Row('13. Custo global da construção (10 + 11 + 12)', '', 'q3_13', 'tot')}${q3Row('14. Custo unitário (13 ÷ 4.6) — R$/m²', '', 'q3_14', 'tot')}
      ${q3Row('Custo global (13) informado pelo RT — para conferência', 'q3:v13rt', q.v13rt)}
    </div>`;
}
function calcInc(){ return Motor.calcInc(S.inc); }
function setTxt(id, t){ const e = $(id); if (e) e.textContent = t; }
function recalcInc(){
  const R = calcInc(), p = R.p;
  R.q1.forEach((x, ri) => { [5,6,10,11,15,16,17,18].forEach(n => setTxt(`q1c_${ri}_c${n}`, fmt(x.c[n]))); });
  R.q2.forEach((x, ri) => {
    [23,24,28,29,30,32,33,34,35,36,37,38].forEach(n => setTxt(`q2c_${ri}_c${n}`, fmt(x.c[n])));
    setTxt(`q2c_${ri}_c31`, fmt(x.fi, p));
    const rt = $(`q2i_${ri}_fiRT`); if (rt) { const has = String(x.r.fiRT || '').trim() !== ''; rt.classList.toggle('mis', has && Math.abs(parseBR(x.r.fiRT) - x.fi) > 0.6 * 10 ** -p); rt.classList.toggle('mat', has && Math.abs(parseBR(x.r.fiRT) - x.fi) <= 0.6 * 10 ** -p); }
  });
  for (let i = 2; i <= 18; i++) setTxt('q1t_' + (i === 2 || i === 3 || i === 4 || i === 7 || i === 8 || i === 9 || i === 12 || i === 13 || i === 14 ? 'v' : 'c') + i, fmt(R.T1[i]));
  setTxt('q1t_qtd', String(R.q1.reduce((s, x) => s + x.qtd, 0)));
  for (let i = 20; i <= 38; i++) { const k = [20,21,22,25,26,27].includes(i) ? 'v' + i : 'c' + i; setTxt('q2t_' + k, i === 31 ? fmt(R.q2.reduce((s, x) => s + x.fi, 0), p) : fmt(R.T2[i])); }
  setTxt('q2t_fiRT', fmt(R.q2.reduce((s, x) => s + parseBR(x.r.fiRT), 0), p));
  setTxt('q2t_acess', fmt(R.q2.reduce((s, x) => s + parseBR(x.r.acess), 0)));
  /* Destaque das células do QI que conferem / divergem do QII */
  R.q1.forEach((x, ri) => [2,3].forEach(col => { const el = $(`q1i_${ri}_v${col}`); if (!el) return; const ck = R.pavChecks.find(c => c.row === x && c.col === col); el.classList.toggle('mat', !!ck && ck.ok && x.c[col] > 0); el.classList.toggle('mis', !!ck && !ck.ok); }));
  [[5,'c23'],[6,'c24'],[10,'c28'],[11,'c29'],[17,'c37'],[18,'c38']].forEach(([a, k]) => { const el = $('q2t_' + k); if (el) { const okk = Math.abs(R.T1[a] - R.T2[+k.slice(1)]) < 0.05; el.classList.toggle('mis', !okk); el.classList.toggle('mat', okk && R.T1[a] > 0); } });
  const Q = R.Q3;
  setTxt('q3_41', fmt(Q.a41)); setTxt('q3_42', fmt(Q.a42)); setTxt('q3_43', fmt(Q.a43)); setTxt('q3_44', fmt(Q.a44)); setTxt('q3_45', fmt(Q.a45)); setTxt('q3_46', fmt(Q.a46));
  setTxt('q3_5', 'R$ ' + fmt(Q.v5)); setTxt('q3_7', 'R$ ' + fmt(Q.v7)); setTxt('q3_10', 'R$ ' + fmt(Q.v10)); setTxt('q3_13', 'R$ ' + fmt(Q.v13)); setTxt('q3_14', 'R$ ' + fmt(Q.v14));
  renderIVB(R); renderAudit(R);
  return R;
}
function renderIVB(R){
  if (!R.q2.length) { $('tIVB').innerHTML = ''; return; }
  const p = R.p;
  $('tIVB').innerHTML = `<thead><tr><th>Unidade\n(A)</th><th>Privativa principal\n(B)</th><th>Privativas acessórias\n(C)</th><th>Privativa total\n(D = B + C)</th><th>Uso comum\n(E = 28 + 35)</th><th>Real total\n(F = D + E)</th><th>Coeficiente\n(G = 31)</th></tr></thead><tbody>${R.q2.map(x => `<tr><td style="padding:4px 6px">${esc(unitShort(x.r))}</td><td class="c">${fmt(x.ivb.B)}</td><td class="c">${fmt(x.ivb.C)}</td><td class="c">${fmt(x.ivb.D)}</td><td class="c">${fmt(x.ivb.E)}</td><td class="c k">${fmt(x.ivb.F)}</td><td class="c k">${fmt(fiOf(x), p)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td style="text-align:left">TOTAIS</td><td>${fmt(R.q2.reduce((s, x) => s + x.ivb.B, 0))}</td><td>${fmt(R.q2.reduce((s, x) => s + x.ivb.C, 0))}</td><td>${fmt(R.T2[23])}</td><td>${fmt(R.q2.reduce((s, x) => s + x.ivb.E, 0))}</td><td>${fmt(R.T2[37])}</td><td>${fmt(R.q2.reduce((s, x) => s + fiOf(x), 0), p)}</td></tr></tfoot>`;
}
function auditoria(R){ return Motor.auditoria(R, S.inc, S.campos, S.meta); }
function renderAudit(R){ $('audList').innerHTML = auditoria(R).map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join(''); }
function applyBatch(){
  const f = $('bField').value, val = $('bVal').value, ft = $('bFilter').value, cr = $('bCrit').value.trim(), bl = $('bBloco').value;
  if (ft !== 'ALL' && !cr) { toast('Informe o critério do filtro.', 'err'); return; }
  let n = 0;
  S.inc.q2.forEach(r => {
    if (bl && r.bloco !== bl) return;
    const nm = String(r.nome);
    const ok = ft === 'ALL' || (ft === 'EXACT' && nm === cr) || (ft === 'END' && nm.endsWith(cr)) || (ft === 'START' && nm.startsWith(cr)) || (ft === 'PAV' && String(r.pav + 1) === cr);
    if (ok) { r[f] = val; n++; }
  });
  renderQ2(); recalcInc(); markDirty(); toast(`Aplicado em ${n} unidade(s).`);
}
function renderMinCfg(){
  const I = S.inc;
  $('minCfg').innerHTML = `<div class="fgrid">
    <div class="fld"><label for="mDen">Denominação da unidade</label><input id="mDen" data-bind="i:denom" value="${esc(I.denom)}"></div>
    <div class="fld"><label for="mDest">Destinação</label><input id="mDest" data-bind="i:destinacao" value="${esc(I.destinacao)}" placeholder="residenciais, comerciais…"></div>
    <div class="fld wide"><label for="mVaga">Texto da vaga (vai depois da composição; deixe vazio se não houver)</label><input id="mVaga" data-bind="i:vagaTxt" value="${esc(I.vagaTxt)}"></div>
    <div class="fld"><label><input type="checkbox" data-bind="i:carOn"${I.carOn ? ' checked' : ''}> Há prazo de carência</label><input data-bind="i:carDias" value="${esc(I.carDias)}" inputmode="numeric" aria-label="Dias de carência" placeholder="dias"></div>
    <div class="fld"><label><input type="checkbox" data-bind="i:mcmv"${I.mcmv ? ' checked' : ''}> Programa Minha Casa, Minha Vida</label><input type="date" data-bind="i:mcmvData" value="${esc(I.mcmvData)}" aria-label="Data da declaração MCMV"></div></div>`;
}
function ph(k){ const v = S.campos[k]; return v ? esc(v) : `<span class="ph">[preencher: ${esc((CAMPOS.find(f => f.k === k) || {l:k}).l)}]</span>`; }
function phDate(k){ const v = fmtDate(S.campos[k]); return v || `<span class="ph">[preencher: ${esc((CAMPOS.find(f => f.k === k) || {l:k}).l)}]</span>`; }
function gerarMinuta(){
  const R = calcInc(), I = S.inc, C = S.campos, p = R.p;
  if (!R.q2.length) { toast('Gere os quadros antes da minuta.', 'err'); return; }
  const unid = (I.denom || 'UNIDADE').toUpperCase(), unidPl = /S$/.test(unid) ? unid : unid + 'S';
  const nome = esc((C.empNome || '').toUpperCase()) || '<span class="ph">[preencher: nome do empreendimento]</span>';
  const vaga = (I.vagaTxt || '').trim();
  const compOf = (x, pl) => { let t = (x.r.comp || '').trim().replace(/\.$/, ''); t = t ? esc(t.toUpperCase()) : '<span class="ph">[COMPOSIÇÃO NÃO INFORMADA]</span>'; if (vaga) t += ' ' + esc(vaga.toUpperCase()); if (x.r.pcd) t += pl ? ' (UNIDADES ADAPTADAS PARA PESSOA COM DEFICIÊNCIA - PCD)' : ' (UNIDADE ADAPTADA PARA PESSOA COM DEFICIÊNCIA - PCD)'; return t; };
  const pavName = x => esc(((R.q1.find(q => q.r.pav === x.r.pav) || {r:{}}).r.nome || (I.pavs[x.r.pav] || {}).nome || '').toUpperCase());
  const uLbl = x => x.r.bloco ? `${esc(x.r.nome)} do BLOCO ${esc(x.r.bloco)}` : esc(x.r.nome);
  const areas = x => `área coberta padrão de <b>${fmt(x.c[20])} m²</b>, área descoberta de <b>${fmt(x.c[21])} m²</b>, área privativa real de <b>${fmt(x.c[23])} m²</b>, área de uso comum de divisão não proporcional de <b>${fmt(x.c[28])} m²</b>, área de uso comum de divisão proporcional de <b>${fmt(x.c[35])} m²</b>, área real total de <b>${fmt(x.c[37])} m²</b>`;
  $('minFil').innerHTML = R.q2.map(x => `<p><b>IMÓVEL:</b> Uma fração ideal de <b>${fmt(fiOf(x), p)}</b> da área do imóvel situado na <b>${ph('descricao')}</b>, <b>CEP ${ph('cep')}</b>, com a área total de <b>${ph('areaTerreno')} m²</b>, que corresponderá ao <b>${unid} Nº ${uLbl(x)}</b>, localizado no <b>${pavName(x)}</b> do <b>"${nome}"</b>, e deverá ser composto de ${compOf(x, false)}, com ${areas(x)}. <b>PROPRIETÁRIA:</b> <b>${ph('incNome')}</b>, com sede em ${ph('incSede')}, inscrita no CNPJ sob o nº <b>${ph('incCnpj')}</b>. <b>REGISTRO ANTERIOR:</b> <b>${ph('regAnterior')}</b> da matrícula nº <b>${ph('matricula')}</b>, Livro 2 - Registro Geral deste Cartório de Registro de Imóveis.</p>`).join('<hr>');
  const nU = R.q2.length, nb = I.blOn ? Math.max(1, parseInt(I.blN, 10) || 1) : 1;
  const real = R.T1[17], custo = parseBR(I.q3.v13rt) > 0 ? parseBR(I.q3.v13rt) : R.Q3.v13;
  const lbl = r => r.bloco ? `${esc(r.nome)} do Bloco ${esc(r.bloco)}` : esc(r.nome);
  const comp = {}; R.q2.forEach(x => { const k = (x.r.comp || '').trim().toUpperCase() + '|' + (x.r.pcd ? 1 : 0); (comp[k] = comp[k] || []).push(x); });
  const compTxt = Object.values(comp).map(g => g.length === 1 ? `<br>- <b>${unid} ${lbl(g[0].r)}</b> será composto de ${compOf(g[0], false)}` : `<br>- <b>${unidPl} ${joinE(g.map(x => lbl(x.r)))}</b> serão compostos de ${compOf(g[0], true)}`).join(';');
  const ar = {}; R.q2.forEach(x => { const k = [20,21,23,28,35,37].map(i => fmt(x.c[i])).join('|') + '|' + fmt(fiOf(x), p); (ar[k] = ar[k] || []).push(x); });
  const arTxt = Object.values(ar).map(g => `<br>- <b>${g.length === 1 ? unid + ' ' + lbl(g[0].r) : unidPl + ' ' + joinE(g.map(x => lbl(x.r)))}</b>, com ${areas(g[0])} e fração ideal de <b>${fmt(fiOf(g[0]), p)}</b>`).join(';');
  const pavs = joinE(R.q1.map(x => `<b>${esc(String(x.r.nome).toUpperCase())}</b>`));
  const alv = parseBR(C.alvaraArea);
  const alvTxt = alv > 0 && Math.abs(alv - real) < 0.05 ? 'é idêntica' : `é de <b>${alv > 0 ? fmt(alv) : '<span class="ph">[preencher: área do alvará]</span>'} m²</b>`;
  const tec = C.rtConselho === 'CAU' ? ['RRT','Registro'] : ['ART','Anotação'];
  const dias = parseInt(I.carDias, 10);
  const carTxt = I.carOn ? (dias > 0 ? `haverá prazo de carência de ${dias} (${extenso(dias)}) dias para desistência da presente incorporação` : '<span class="ph">[preencher: dias de carência]</span>') : 'não haverá prazo de carência para desistência da presente incorporação';
  const certs = {}; S.certidoes.forEach(c => { if (!c.emissao) return; const desc = c.tipo === 'OUTRA' ? esc(c.obs || 'Outra') : CERT[c.tipo][1]; (certs[c.emissao] = certs[c.emissao] || []).push(`Certidão ${esc(c.res)} ${desc}`); });
  const certTxt = Object.entries(certs).sort().map(([d, ls]) => ls.length === 1 ? `${ls[0]}, emitida em ${fmtDate(d)}` : `${joinE(ls)}, emitidas em ${fmtDate(d)}`).join('; ');
  let mae = `<p>Procedo a este registro, atendendo ao requerimento da proprietária acima qualificada, datado de ${phDate('reqData')}, que, pretendendo promover a edificação e incorporação de <b>${nU} (${extenso(nU, true)}) unidades autônomas ${esc(I.destinacao || '')}</b>, depositou nesta serventia, para os fins da Lei Federal nº 4.591, de 16/12/1964, os documentos exigidos pela citada Lei, consignando que sobre o imóvel objeto desta matrícula deverá ser construído, em regime de incorporação, o empreendimento denominado "<b>${nome}</b>", com a área real global a ser construída de <b>${fmt(real)} m²</b>, ${I.blOn ? `constituído de <b>${nb} (${extenso(nb)}) blocos</b>` : 'em edificação única'}, com os seguintes pavimentos: ${pavs}. O custo global do empreendimento foi estimado, conforme o Quadro III da ABNT NBR 12721, em <b>R$ ${fmt(custo)}</b>.</p>`;
  mae += `<p>O empreendimento possuirá unidades que serão compostas de:${compTxt}.</p>`;
  mae += `<p>As unidades possuirão as seguintes áreas:${arTxt}.</p>`;
  mae += `<p><b>PARTES COMUNS DO EMPREENDIMENTO:</b> São consideradas partes comuns do empreendimento: o terreno, muros, calçadas, conjunto de instalações elétricas, telefônicas, hidráulicas, sanitárias, medidores e todas as dependências, equipamentos, tubulações e instalações destinadas ao bom funcionamento das edificações, assim como escadas e corredores. Este registro está sendo feito conforme quadros da NBR e plantas elaborados sob a responsabilidade técnica de ${ph('rtNome')} - Registro nº ${ph('rtRegistro')}, ${tec[0]} - ${tec[1]} de Responsabilidade Técnica nº ${ph('rtArt')}, registrada em ${phDate('rtArtData')}, e projetos aprovados pela Prefeitura Municipal desta cidade em ${phDate('aprovData')}. As unidades autônomas que compõem o empreendimento receberam nesta data matrículas individuais, a saber, <span class="ph">XX.XXX a XX.XXX</span>, respectivamente.</p>`;
  mae += `<p>A proprietária e incorporadora declara, em atendimento ao disposto nas alíneas "n" e "p" do art. 32 da Lei nº 4.591/1964, que ${carTxt}${vaga ? ' e que cada unidade terá vaga de garagem privativa, em lugar determinado, com capacidade para um veículo de porte médio' : ''}. A área real a ser construída, de acordo com a ABNT NBR 12721, é de <b>${fmt(real)} m²</b>, e a área apurada de acordo com o Código de Obras em vigor, transcrita no Alvará de Construção nº <b>${ph('alvaraNum')}</b>, emitido em <b>${phDate('alvaraData')}</b>, ${alvTxt}. O empreendimento deverá ser regulado pela Convenção de Condomínio que futuramente será registrada no Livro 3 desta serventia, cuja minuta fica aqui arquivada.</p>`;
  mae += `<p>Foram-me apresentados e aqui encontram-se arquivados os seguintes documentos: ${certTxt || '<span class="ph">[lançar certidões na Conferência]</span>'}. Demais detalhes, certidões, termos, cláusulas e condições gerais do empreendimento constam do processo de incorporação devidamente arquivado nesta serventia${I.mcmv ? `, juntamente com a declaração emitida pela proprietária, datada de <b>${fmtDate(I.mcmvData) || '<span class="ph">[preencher: data]</span>'}</b>, de que o empreendimento será realizado no âmbito do <b>Programa Minha Casa, Minha Vida</b>` : ''}.</p>`;
  $('minMae').innerHTML = mae;
  const pend = document.querySelectorAll('#minMae .ph, #minFil .ph').length;
  toast(pend ? `Minuta gerada com ${pend} campo(s) pendente(s) em vermelho.` : 'Minuta gerada.', pend ? 'err' : 'ok');
}


function bindIncorporacao(){
  /* Incorporação */
  $('incCfg').addEventListener('click', e => {
    if (e.target.closest('#addPav')) { const n = S.inc.pavs.length + 1; S.inc.pavs.push({id:uid(), nome:`${n}º Pavimento`, qtd:'1', und:'1', inicio:`${n}01`}); renderIncCfg(); markDirty(); }
    if (e.target.closest('#genQ')) genQuadros();
    const r = e.target.closest('[data-rmpav]'); if (r) { if (S.inc.pavs.length <= 1) { toast('Mantenha pelo menos um pavimento.', 'err'); return; } S.inc.pavs = S.inc.pavs.filter(p => p.id !== r.dataset.rmpav); renderIncCfg(); markDirty(); }
  });
  ['tQ1','tQ2'].forEach(id => $(id).addEventListener('paste', e => {
    const inp = e.target; if (inp.dataset.r === undefined) return;
    const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(txt.trim())) return;
    e.preventDefault();
    const rows = txt.replace(/\r/g, '').replace(/\n$/, '').split('\n'), t = inp.closest('table'), r0 = +inp.dataset.r, c0 = +inp.dataset.c;
    let n = 0;
    rows.forEach((line, ri) => line.split('\t').forEach((val, ci) => { const x = t.querySelector(`input[data-r="${r0 + ri}"][data-c="${c0 + ci}"]`); if (x) { x.value = val.trim(); setBind(x.dataset.bind, x.value); n++; } }));
    recalcInc(); toast(`${n} célula(s) coladas.`);
  }));
  $('bFilter').onchange = () => { $('bCrit').disabled = $('bFilter').value === 'ALL'; };
  $('bCrit').disabled = true;
  $('bApply').onclick = applyBatch;
  $('minGen').onclick = gerarMinuta;
  $('minCopyMae').onclick = () => copyText($('minMae').innerText);
  $('minCopyFil').onclick = () => copyText($('minFil').innerText);

}
