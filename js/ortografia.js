/* Qualificador CRCO — js/ortografia.js: corretor ortográfico pt-BR leve e offline (dicionário VERO, LGPLv3/MPL, em lib/ortografia)
 * + conferências do domínio registral (NBR 12.721, Lei 4.591/64, palavras repetidas, letras triplicadas…).
 * Confere cada palavra "de trás para frente" pelas regras de sufixo/prefixo do dicionário, sem gerar todas as formas. */
'use strict';
(typeof window !== 'undefined') && ((window.QUAL_ARQ = window.QUAL_ARQ || {})['js/ortografia.js'] = '1.4.0');

var Ortografia = (function(){
  let D = null;
  const LETRAS = 'abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúüç';
  /* palavras do dia a dia do registro que o dicionário geral pode não ter */
  const EXTRA = ('registral registrais averbação averbações averbar averbado averbada prenotação prenotado prenotada protocolizado protocolizada matrícula matrículas ' +
    'incorporadora incorporadoras incorporação incorporações condomínio condôminos qualificador qualificação registrador registradora serventia serventias emolumentos ' +
    'georreferenciamento georreferenciado sigef sig-ri onr cnib saec itbi itcd doi cnpj cpf rg cnh art rrt crea cau nbr abnt cub sinduscon pmcmv reurb cnpfe tjgo tjdft juceg sefaz pgfn cndt ' +
    'alvará alvarás habite-se convenção memorial quadros fração frações unifamiliar multifamiliar subrogação sub-rogação fiduciária fiduciante fiduciário outorgante outorgado anuente anuência ' +
    'retificação retificar desmembramento remembramento loteamento loteadora usucapião transmitente adquirente adquirentes interveniente cedente cessionário cessionária ' +
    'apartamento apartamentos térreo pavimento pavimentos responsável técnico técnica projeto arquitetônico ii iii iv vi vii viii').split(/\s+/);
  function parse(aff, dic){
    const sfx = new Map(), pfx = [], flags = new Map(), rep = [], pref = new Set(); let maxAdd = 0;
    const regra = (tipo, partes) => {
      const flag = partes[1], strip = partes[2] === '0' ? '' : partes[2], add = partes[3] === '0' ? '' : partes[3].split('/')[0], cond = partes[4] || '.';
      let rx = null; if (cond !== '.') { try { rx = tipo === 'SFX' ? new RegExp('(' + cond + ')$') : new RegExp('^(' + cond + ')'); } catch (e) { return; } }
      return {flag, strip, add, rx};
    };
    const cab = {};
    String(aff).split('\n').forEach(l => {
      const p = l.trim().split(/\s+/); if (p[0] === 'REP' && p.length === 3) { rep.push([p[1].replace(/_/g, ' '), p[2].replace(/_/g, ' ')]); return; } if (p[0] !== 'SFX' && p[0] !== 'PFX') return;
      if (p.length === 4 && /^[YN]$/.test(p[2])) { cab[p[0] + p[1]] = p[2] === 'Y'; return; }
      const r = regra(p[0], p); if (!r) return; r.cross = !!cab[p[0] + p[1]];
      if (p[0] === 'SFX') { const k = r.add; if (!sfx.has(k)) sfx.set(k, []); sfx.get(k).push(r); maxAdd = Math.max(maxAdd, k.length); } else pfx.push(r);
    });
    const lin = String(dic).split('\n');
    for (let i = 1; i < lin.length; i++) { const l = lin[i]; if (!l) continue; const j = l.indexOf('/'); const w = j < 0 ? l.trim() : l.slice(0, j); const f = j < 0 ? '' : l.slice(j + 1).trim(); flags.set(w, (flags.get(w) || '') + f); }
    EXTRA.forEach(w => { if (!flags.has(w)) flags.set(w, ''); });
    flags.forEach((f, w) => { const lw = w.toLowerCase(); pref.add(lw.slice(0, 3)); });
    [['ãoes', 'ões'], ['çãoes', 'ções'], ['aoes', 'ões'], ['çaos', 'ções'], ['cao', 'ção'], ['coes', 'ções'], ['ss', 's'], ['ç', 'ss'], ['ss', 'ç'], ['x', 'ch'], ['ch', 'x'], ['z', 's'], ['s', 'z']].forEach(r => rep.push(r));
    return {sfx, pfx, flags, maxAdd, rep, pref};
  }
  function temFlag(w, flag){ const f = D.flags.get(w); return f != null && f.includes(flag); }
  function porSufixo(w, exigeCross){
    for (let k = 0; k <= Math.min(D.maxAdd, w.length - 1); k++) {
      const add = k ? w.slice(-k) : '', rs = D.sfx.get(add); if (!rs) continue;
      const base = k ? w.slice(0, -k) : w;
      for (const r of rs) { if (exigeCross && !r.cross) continue; const stem = base + r.strip; if (r.rx && !r.rx.test(stem)) continue; if (temFlag(stem, r.flag)) return true; }
    }
    return false;
  }
  function existe(w){
    if (D.flags.has(w)) return true;
    if (porSufixo(w, false)) return true;
    for (const r of D.pfx) {
      if (r.add && !w.startsWith(r.add)) continue; const resto = r.strip + w.slice(r.add.length); if (r.rx && !r.rx.test(resto)) continue;
      if (temFlag(resto, r.flag)) return true;
      if (r.cross && porSufixoComPrefixo(resto, r.flag)) return true;
    }
    return false;
  }
  function porSufixoComPrefixo(w, flagP){
    for (let k = 0; k <= Math.min(D.maxAdd, w.length - 1); k++) {
      const add = k ? w.slice(-k) : '', rs = D.sfx.get(add); if (!rs) continue; const base = k ? w.slice(0, -k) : w;
      for (const r of rs) { if (!r.cross) continue; const stem = base + r.strip; if (r.rx && !r.rx.test(stem)) continue; if (temFlag(stem, r.flag) && temFlag(stem, flagP)) return true; }
    }
    return false;
  }
  function correta(palavra){
    if (!D) return true;
    const w = palavra.replace(/^[-']+|[-']+$/g, ''); if (!w || /\d/.test(w) || w.length < 3) return true;
    if (/^[A-ZÀ-Ü]{2,}$/.test(w) && w.length <= 6) return true; /* siglas */
    const lw = w.toLowerCase(), cap = lw[0].toUpperCase() + lw.slice(1);
    if (existe(w) || existe(lw) || existe(cap)) return true;
    if (w.includes('-')) return w.split('-').every(p => !p || correta(p));
    return false;
  }
  function edits1(w){
    const out = new Set();
    for (let i = 0; i <= w.length; i++) {
      const a = w.slice(0, i), b = w.slice(i);
      if (b) out.add(a + b.slice(1));
      if (b.length > 1) out.add(a + b[1] + b[0] + b.slice(2));
      for (const c of LETRAS) { if (b) out.add(a + c + b.slice(1)); out.add(a + c + b); }
    }
    return out;
  }
  function sugerir(palavra, max = 5){
    if (!D) return [];
    const lw = palavra.toLowerCase(), achados = new Set();
    /* 1) trocas comuns do próprio dicionário (REP: ão/õe, ç/ss, acentos…) */
    D.rep.forEach(([de, para]) => { if (!de || de === '-') return; let i = lw.indexOf(de); while (i >= 0) { const c = lw.slice(0, i) + para + lw.slice(i + de.length); if (correta(c)) achados.add(c); i = lw.indexOf(de, i + 1); } });
    /* 2) uma letra a mais, a menos, trocada ou invertida */
    edits1(lw).forEach(x => { if (x !== lw && correta(x)) achados.add(x); });
    /* 3) duas edições, só por pouco tempo e começando como palavras que existem */
    if (achados.size < 2 && lw.length <= 18) { const t0 = Date.now(), vistos = new Set();
      fora: for (const x of edits1(lw)) { for (const y of edits1(x)) { if (Date.now() - t0 > 700) break fora; if (vistos.has(y) || y.length < 3 || !D.pref.has(y.slice(0, 3))) continue; vistos.add(y); if (correta(y)) achados.add(y); if (achados.size > 30) break fora; } } }
    const sem = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const score = s => (sem(s) === sem(lw) ? -10 : 0) + Math.abs(s.length - lw.length) + (s[0] === lw[0] ? 0 : 2) + (s.slice(-2) === lw.slice(-2) ? -2 : 0) + (D.flags.has(s) ? -.5 : 0);
    const lista = [...achados].filter(s => s !== lw && (/[- ]/.test(lw) || !/[- ]/.test(s))).sort((a, b) => score(a) - score(b)).slice(0, max);
    return palavra[0] === palavra[0].toUpperCase() ? lista.map(s => s[0].toUpperCase() + s.slice(1)) : lista;
  }

  /* conferências do domínio (não dependem do dicionário) */
  function regrasDominio(texto){
    const out = [], t = String(texto || '');
    const ach = (rx, msg, troca) => { let m; const r = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g'); while ((m = r.exec(t))) out.push({i:m.index, f:m.index + m[0].length, trecho:m[0], msg, troca:typeof troca === 'function' ? troca(m) : troca}); };
    ach(/NBR\s*12\.?7(?!21)\d{2}/i, 'A norma de incorporação é a ABNT NBR 12.721.', 'NBR 12.721');
    ach(/Lei\s*(?:n[º°o.]*\s*)?4\.?5(?!91)\d{2}(?:\/64)?/i, 'A lei de incorporações é a Lei nº 4.591/64.', 'Lei nº 4.591/64');
    ach(/Lei\s*(?:n[º°o.]*\s*)?6\.?0(?!15)\d{2}(?:\/73)?/i, 'A Lei de Registros Públicos é a Lei nº 6.015/73.', 'Lei nº 6.015/73');
    ach(/\b(\p{L}{2,})\s+\1\b/iu, 'Palavra repetida.', m => m[1]);
    ach(/(?<!\p{L})(o|a|os|as|e|é)\s+\1(?!\p{L})/iu, 'Palavra repetida.', m => m[1]);
    ach(/(\p{L})\1\1/u, 'Letra repetida três vezes.', m => m[0].slice(0, 2));
    ach(/ {2,}/, 'Espaço duplo.', ' ');
    ach(/\s+([,.;:])/, 'Espaço antes da pontuação.', m => m[1]);
    ach(/\bo no\b/i, 'Provável sobra de palavra ("o no").', 'no');
    ach(/\bnova novo\b|\bnovo nova\b/i, 'Provável sobra de palavra.', m => m[0].split(' ')[1]);
    ach(/\bart\.?\s*(\d+)\s*,?\s*da\s+lei/i, 'Prefira "art. N da Lei nº …".', m => `art. ${m[1]} da Lei`);
    if (t.trim() && !/[.;:!?)]\s*$/.test(t.trim())) out.push({i:t.length, f:t.length, trecho:'', msg:'Texto sem ponto final.', troca:null});
    return out;
  }
  /* revisa um texto: devolve as ocorrências com sugestões */
  function revisar(texto){
    const res = regrasDominio(texto);
    if (D) { const rx = /[\p{L}][\p{L}'-]*/gu; let m; while ((m = rx.exec(texto))) { const w = m[0]; if (!correta(w)) res.push({i:m.index, f:m.index + w.length, trecho:w, msg:'Possível erro de ortografia.', sugestoes:sugerir(w), ortografia:true}); } }
    return res.sort((a, b) => a.i - b.i);
  }
  async function carregar(base = 'lib/ortografia/'){
    if (D) return true;
    const [aff, dic] = await Promise.all([fetch(base + 'pt_BR.aff').then(r => r.text()), fetch(base + 'pt_BR.dic').then(r => r.text())]);
    D = parse(aff, dic); return true;
  }
  function carregarTexto(aff, dic){ D = parse(aff, dic); }
  function adicionar(w){ if (D && w) D.flags.set(String(w).toLowerCase(), ''); }
  return {carregar, carregarTexto, correta, sugerir, revisar, regrasDominio, adicionar, pronto:() => !!D};
})();
if (typeof module !== 'undefined') module.exports = Ortografia;
