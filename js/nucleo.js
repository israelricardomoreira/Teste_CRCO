/* Qualificador CRCO — js/nucleo.js: utilitários de tela e funções do motor usadas em todo o programa */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/nucleo.js'] = '1.5.0';
const {onlyDigits, todayISO, parseBR, fmt, fmtDate, brToISO, joinE, extenso, validCPF, validCNPJ, unitShort, fiOf} = Motor;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const cssEsc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
const san = s => String(s || '').replace(/[\/\\:*?<>|"]/g, '_').trim();
function docStatus(v){
  const d = onlyDigits(v);
  if (!d) return '';
  if (d.length === 11) return validCPF(d) ? '<span class="okt">✓ CPF válido</span>' : '<span class="errt">✕ CPF inválido</span>';
  if (d.length === 14) return validCNPJ(d) ? '<span class="okt">✓ CNPJ válido</span>' : '<span class="errt">✕ CNPJ inválido</span>';
  return '<span class="warnt">! número incompleto</span>';
}
function toast(msg, type = 'ok'){ const t = document.createElement('div'); t.className = 'toast' + (type === 'err' ? ' err' : ''); t.textContent = msg; $('toasts').appendChild(t); setTimeout(() => t.remove(), 4500); }
function busy(on, msg = '', pct = 0){ $('busy').hidden = !on; if (on) { $('busyMsg').textContent = msg; $('busyBar').style.width = pct + '%'; } }
function download(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function readDataUrl(f){ return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = e => res(e.target.result); fr.onerror = rej; fr.readAsDataURL(f); }); }
function loadScript(src){ return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Falha ao carregar ' + src)); document.head.appendChild(s); }); }
function copyText(t){ if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copiado.'), () => toast('Não foi possível copiar.', 'err')); }
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

