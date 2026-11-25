/* Testes do motor do Qualificador CRCO — rode com:  node --test tests/
 * O caso "6 aptos em 2 pavimentos" usa as áreas de uma incorporação real já conferida à mão
 * (só números: nenhum nome, CPF/CNPJ ou endereço de cliente vai para o repositório). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../motor.js');

test('extenso: gênero, mil e cem', () => {
  assert.equal(M.extenso(2, true), 'duas');
  assert.equal(M.extenso(21, true), 'vinte e uma');
  assert.equal(M.extenso(200, true), 'duzentas');
  assert.equal(M.extenso(1000), 'mil');
  assert.equal(M.extenso(1100), 'mil e cem');
  assert.equal(M.extenso(1180), 'mil cento e oitenta');
  assert.equal(M.extenso(180), 'cento e oitenta');
  assert.equal(M.extenso(undefined), '[NÚMERO INVÁLIDO]');
});

test('parseBR: padrão brasileiro e ponto decimal', () => {
  assert.equal(M.parseBR('1.234,56'), 1234.56);
  assert.equal(M.parseBR('120.50'), 120.5);
  assert.equal(M.parseBR('1.000'), 1000);
  assert.equal(M.parseBR('R$ 607.576,20'), 607576.2);
  assert.equal(M.parseBR('51,89 m²'), 51.89);
  assert.equal(M.parseBR(''), 0);
});

test('CPF e CNPJ', () => {
  assert.equal(M.validCPF('529.982.247-25'), true);
  assert.equal(M.validCPF('529.982.247-24'), false);
  assert.equal(M.validCPF('111.111.111-11'), false);
  assert.equal(M.validCNPJ('11.222.333/0001-81'), true);
  assert.equal(M.validCNPJ('11.222.333/0001-80'), false);
});

function pav(nome, pav, o){ return Object.assign({pav, nome, qtd:'1', v2:'',v3:'',v4:'',v7:'',v8:'',v9:'',v12:'',v13:'',v14:''}, o); }
function un(nome, pav, v20, v21, fiRT){ return {pav, bloco:'', nome, pcd:false, comp:'', v20, v21, v22:'', v25:'', v26:'10,80', v27:'', acess:v21, fiRT}; }
const caso6 = () => ({ precFI:'4',
  q1:[pav('Térreo',0,{v2:'151,73',v3:'48,75',v8:'64,80',v12:'1,47',v13:'85,25'}), pav('Superior',1,{v2:'154,31',v12:'6,17'})],
  q2:[un('101',0,'51,89','','0,1696'), un('102',0,'50,04','17,86','0,1635'), un('103',0,'49,80','30,89','0,1627'),
      un('201',1,'53,18','','0,1738'), un('202',1,'53,68','','0,1754'), un('203',1,'47,45','','0,1550')],
  q3:{cub:'1.936,93', cubMes:'2026-09', padrao:'', v6:'',v8:'',v9:'',v11:'',v12:'', v13rt:'607.576,20'} });

test('NBR 12721: caso real de 6 aptos fecha com os quadros do RT', () => {
  const R = M.calcInc(caso6());
  const r2 = x => Math.round(x * 100) / 100;
  assert.equal(r2(R.T1[17]), 512.48); assert.equal(r2(R.T1[18]), 313.68);
  assert.equal(r2(R.T2[37]), 512.48); assert.equal(r2(R.T2[38]), 313.68);
  assert.deepEqual(R.q2.map(x => x.fi.toFixed(4)), ['0.1696','0.1635','0.1627','0.1738','0.1754','0.1550']);
  assert.deepEqual(R.q2.map(x => r2(x.ivb.E)), [26.55, 25.99, 25.92, 26.94, 27.09, 25.20]);
  assert.deepEqual(R.q2.map(x => r2(x.c[37])), [78.44, 93.89, 106.61, 80.12, 80.77, 72.65]);
  assert.equal(r2(R.Q3.v13), 607576.2);
});

test('auditoria do caso real: nada em erro (vaga no térreo de apto do superior não é falso alarme)', () => {
  const I = caso6(), R = M.calcInc(I);
  const A = M.auditoria(R, I, {alvaraArea:'313,68', reqData:'2026-10-16'}, {dataPrenotacao:''});
  assert.deepEqual(A.filter(a => a[0] === 'err'), []);
  assert.ok(A.some(a => a[0] === 'ok' && /equivalente global/.test(a[1])), 'alvará = área equivalente global');
});

test('auditoria acusa CUB fora do prazo e coeficiente do RT divergente', () => {
  const I = caso6(); I.q3.cubMes = '2026-06'; I.q2[0].fiRT = '0,1700';
  const A = M.auditoria(M.calcInc(I), I, {reqData:'2026-10-16'}, {});
  assert.ok(A.some(a => a[0] === 'err' && /CUB/.test(a[1])));
  assert.ok(A.some(a => a[0] === 'err' && /diverge do calculado/.test(a[1])));
});

test('fração ideal: maiores restos fecham exatamente 1', () => {
  const I = {precFI:'4', q1:[pav('T',0,{v2:'300'})], q2:['1','2','3'].map(n => un(n,0,'100','','')), q3:{}};
  I.q2.forEach(u => { u.v26 = ''; });
  const R = M.calcInc(I);
  assert.deepEqual(R.q2.map(x => x.fi.toFixed(4)), ['0.3334','0.3333','0.3333']);
  assert.equal(Math.round(R.q2.reduce((s, x) => s + x.fi, 0) * 1e4), 1e4);
});

/* ---------- matrícula: textos fictícios (nenhum dado de cliente) ---------- */
const MAT_A = `IMÓVEL: Lote 10, da Quadra 5, situado nesta cidade, no loteamento JARDIM TESTE, com a área de 360,00m², confrontando pela frente com a Rua 1, com 12,00 metros; pelo fundo com o lote 20, com 12,00 metros; pelo lado direito com os lotes 9 e 8, com 30,00 metros e pelo lado esquerdo com o lote 11, com 30,00 metros. PROPRIETÁRIA: LOTEADORA EXEMPLO LTDA, com sede em Goiânia-GO, CNPJ 11.222.333/0001-81. REGISTRO ANTERIOR: Matrícula nº 1.000 deste Cartório. Dou fé. Cidade Ocidental-GO, 05 de maio de 2015. O Oficial.
-----------------------------
R-1-20.000. Protocolo nº 50.000, datado de 02/02/2020. COMPRA E VENDA. Nos termos da escritura..., a proprietária vendeu o imóvel objeto desta matrícula para: JOÃO EXEMPLO, brasileiro, solteiro, CPF nº 529.982.247-25, pelo preço de R$ 50.000,00. Dou fé. Cidade Ocidental-GO, 10 de fevereiro de 2020. O Oficial.
-----------------------------
R-2-20.000. Protocolo nº 60.000, datado de 03/03/2021. ALIENAÇÃO FIDUCIÁRIA. O proprietário alienou fiduciariamente o imóvel ao BANCO EXEMPLO S/A. Dou fé. Cidade Ocidental-GO, 15 de março de 2021. O Oficial.
-----------------------------
Av-3-20.000. Protocolo nº 70.000, datado de 04/04/2022. PENHORA. Procedo a esta averbação... Dou fé. Cidade Ocidental-GO, 20 de abril de 2022. O Oficial.
-----------------------------
Av-4-20.000. Protocolo nº 80.000, datado de 05/05/2023. CANCELAMENTO DE ALIENAÇÃO FIDUCIÁRIA. Fica cancelada a alienação fiduciária objeto do R-2 desta matrícula, em virtude da quitação. Dou fé. Cidade Ocidental-GO, 12 de maio de 2023. O Oficial.`;

test('matrícula: titular, confrontações, ônus cancelado e ônus em aberto', () => {
  const R = M.lerMatricula(MAT_A);
  assert.equal(R.numero, '20.000'); assert.equal(R.areaNum, 360); assert.equal(R.abertura, '2015-05-05');
  assert.deepEqual(R.confrontacoes.map(c => c.lado + ':' + c.com + ':' + c.med), ['frente:Rua 1:12,00', 'fundo:lote 20:12,00', 'lado direito:lotes 9 e 8:30,00', 'lado esquerdo:lote 11:30,00']);
  assert.equal(R.proprietarioInicial.nome, 'LOTEADORA EXEMPLO LTDA');
  assert.equal(R.titular.nome, 'JOÃO EXEMPLO'); assert.equal(R.titular.doc, '529.982.247-25'); assert.equal(R.titular.ato, 'R-1');
  assert.equal(R.atos.find(a => a.rot === 'R-2').canceladoPor, 'Av-4');
  assert.deepEqual(R.onusAbertos.map(o => o.rot), ['Av-3']);
  assert.equal(R.ultimoAto, 'Av-4'); assert.equal(R.ultimoAtoCompleto, 'Av-4-20.000');
});

test('matrícula: texto sem quebras de linha (PDF/OCR) e cruzamento com a ficha', () => {
  const R = M.lerMatricula(MAT_A.replace(/\n-+\n/g, ' ').replace(/\n/g, ' '));
  assert.equal(R.atos.length, 4);
  const X = M.cruzarMatricula(R, {areaTerreno:'350,00', confrontacao:'frente 12,00; fundo 12,00; direito 30,00; esquerdo 30,00'}, [{papel:'Transmitente', nome:'MARIA OUTRA', doc:'111.444.777-35'}]);
  assert.ok(X.some(x => x[0] === 'err' && /Área do terreno/.test(x[1])));
  assert.ok(X.some(x => x[0] === 'err' && /Continuidade/.test(x[1])));
  assert.ok(X.some(x => x[0] === 'warn' && /Av-3 PENHORA/.test(x[1])));
});

test('anonimização: nomes viram marcadores estáveis e números pessoais viram #', () => {
  const an = M.criarAnonimizador(['JOÃO EXEMPLO']);
  const t = 'vendeu para: JOÃO EXEMPLO, CPF nº 529.982.247-25, RG nº 1234567/SSP-DF, casado com MARIA DA SILVA SOUZA, certidão matrícula nº 156976 01 55 2019 2 00032 264 0009564 82. Depois, JOÃO EXEMPLO vendeu à CONSTRUTORA TESTE LTDA, CNPJ 11.222.333/0001-81. COMPRA E VENDA. Dou fé.';
  const o = an.anon(t);
  assert.ok(!/JOÃO|MARIA|SOUZA|TESTE/.test(o), o);
  assert.ok(!/\d{3}\.\d{3}\.\d{3}-\d{2}|1234567|156976/.test(o), o);
  assert.equal(o.match(/\[PF_1\]/g).length, 2, 'o mesmo nome vira o mesmo marcador');
  assert.ok(/\[PJ_\d\]/.test(o), 'empresa vira PJ');
  assert.ok(o.includes('COMPRA E VENDA') && o.includes('Dou fé'), 'termos registrais ficam');
  const obj = M.anonimizarObjeto({a:['JOÃO EXEMPLO'], b:{c:'CPF 529.982.247-25'}, n:3}, an);
  assert.deepEqual(obj, {a:['[PF_1]'], b:{c:'CPF ###.###.###-##'}, n:3});
});

test('perfil do texto: marcadores e formato dos rótulos de ato', () => {
  const P = M.perfilTexto(MAT_A);
  assert.equal(P.marcadores.imovel, 1); assert.equal(P.marcadores.protocolo, 4);
  assert.equal(P.rotulosAto['R-1-17.118'], 4); assert.equal(P.documentos.cnpj, 1);
});

test('continuidade: parte lançada só com o nome também confere', () => {
  const R = M.lerMatricula(MAT_A);
  const X = M.cruzarMatricula(R, {}, [{papel:'Transmitente', nome:'João Exemplo', doc:''}]);
  assert.ok(X.some(x => x[0] === 'ok' && /Continuidade/.test(x[1])), JSON.stringify(X));
});

test('térreo (QI col. 17) tem de fechar a área do terreno', () => {
  const I = caso6(), R = M.calcInc(I);
  assert.ok(M.auditoria(R, I, {areaTerreno:'352,00'}, {}).some(a => a[0] === 'ok' && /térreo/.test(a[1])));
  assert.ok(M.auditoria(R, I, {areaTerreno:'360,00'}, {}).some(a => a[0] === 'err' && /térreo/.test(a[1])));
});

test('Quadro III: CUB, mês, padrão e custo global', () => {
  const t = 'Custo Unitário Básico Sinduscon-GO 3. Custo Unitário Básico para o Mês de setembro de 2026 R$ por m 2 = 1.936,93 ... Residencial Baixo R-8 2 313,68 ... 13. Custo Global da Construção R$ 607.576,20 / m²';
  assert.deepEqual(M.lerQuadroIII(t), {cubMes:'2026-09', cub:'1.936,93', v13rt:'607.576,20', padrao:'R8-B'});
});

test('Quadros I e II por posição das colunas (tabela sintética)', () => {
  const W = (t, x, y) => ({t, x, y, w:.02, h:.012});
  const cab1 = [...Array(18)].map((_, i) => W(String(i + 1), .05 + i * .05, .30));
  const q1 = [cab1, [W('TERREO', .03, .34), W('100,00', .10, .34), W('20,00', .15, .34), W('120,00', .25, .34), W('100,00', .30, .34), W('120,00', .85, .34), W('100,00', .90, .34), W('1', .97, .34)],
    [W('TOTAIS', .03, .40), W('120,00', .85, .40)]].flat();
  const cab2 = [...Array(20)].map((_, i) => W(String(i + 19), .05 + i * .045, .30));
  const q2 = [cab2, [W('TERREO', .03, .33)], [W('Aptº', .01, .35), W('101', .035, .35), W('60,00', .095, .35), W('0,6000', .59, .35)], [W('Aptº', .01, .37), W('102', .035, .37), W('40,00', .095, .37), W('20,00', .14, .37), W('0,4000', .59, .37)], [W('TOTAIS', .03, .42)]].flat();
  const L = M.lerQuadrosNBR([{words:q1}, {words:q2}]);
  assert.equal(L.q1.length, 1); assert.equal(L.q1[0].nome, 'TERREO'); assert.equal(L.q1[0].v2, '100,00'); assert.equal(L.q1[0].v3, '20,00');
  assert.deepEqual(L.q2.map(u => [u.nome, u.v20, u.v21, u.fiRT]), [['101', '60,00', '', '0,6000'], ['102', '40,00', '20,00', '0,4000']]);
});

test('certidões: tipo, resultado e datas pelo texto', () => {
  const a = M.lerCertidao('CNDT', 'CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS ... Expedição: 10/10/2026 ... Validade: 07/04/2027');
  assert.equal(a.tipo, 'TRAB'); assert.equal(a.res, 'Negativa'); assert.equal(a.validade, '2027-04-07');
  assert.equal(M.lerCertidao('Protesto', 'Tabelionato de Protesto de Cidade Ocidental ... NADA CONSTA').tipo, 'PROT');
  assert.equal(M.lerCertidao('', 'CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS E À DÍVIDA ATIVA DA UNIÃO').res, 'Positiva com efeito de negativa');
});
test('continuidade conta a incorporadora dos campos da incorporação', () => {
  const R = M.lerMatricula(MAT_A);
  assert.ok(M.cruzarMatricula(R, {incNome:'JOÃO EXEMPLO'}, []).some(x => x[0] === 'ok' && /Continuidade/.test(x[1])));
});

test('composições do memorial: por unidade, em lista e em faixa', () => {
  const t = 'Pavimento Térreo: Apartamento 101 será composto de sala, cozinha e vaga n° 101;\nApartamento 102 será composto de: sala e quarto; Os apartamentos 201, 202 e 203 serão compostos de sala, cozinha e banheiro. Aptos 301 a 302 serão compostos de sala.';
  const r = M.lerComposicoes(t, ['101', '102', '201', '202', '203', '301', '302']);
  assert.equal(r['101'].texto, 'sala, cozinha e vaga n° 101');
  assert.equal(r['102'].texto, 'sala e quarto');
  assert.equal(r['203'].texto, 'sala, cozinha e banheiro');
  assert.equal(r['302'].texto, 'sala');
  assert.equal(M.chaveComposicao('Sala e  quarto.'), M.chaveComposicao('sala e quarto'));
});
test('arredondamento do RT: truncado vira atenção, não erro', () => {
  assert.equal(M.compararRT('0,1799', 0.179999999).c, 'arred');
  assert.equal(M.compararRT('0,1799', 0.179999999).correto, '0,1800');
  assert.equal(M.compararRT('0,1800', 0.179999999).c, 'ok');
  assert.equal(M.compararRT('0,1750', 0.179999999).c, 'err');
  assert.equal(M.compararRT('12,35', 12.349).c, 'ok');
  assert.equal(M.compararRT('12,34', 12.349).c, 'arred');
});

/* ---- GED: texto ilegível, nome limpo e categoria sugerida (nomes neutros, sem dados de cliente) ---- */
test('textoIlegivel: lixo de fonte sem mapeamento x texto normal e tabela de números', () => {
  const lixo = Array.from({length: 60}, (_, i) => String.fromCharCode(i % 8 + 1) + ' ').join('') + 'AB CD';
  assert.equal(M.textoIlegivel(lixo), true);
  assert.equal(M.textoIlegivel('Estado de Goiás Poder Judiciário CERTIDÃO NEGATIVA - CÍVEL certifica a requerimento da parte interessada'), false);
  assert.equal(M.textoIlegivel('101 77,03 0,00 77,03 26,47 103,51 0,25000 102 135,07 0,00 135,07 26,47 161,55 0,25000 TOTAIS 314,64 Área'), false);
  assert.equal(M.textoIlegivel('curto'), false);
  assert.equal(M.textoIlegivel(''), false);
});
test('nomeLimpo: extensão, underscores e escapes literais', () => {
  assert.equal(M.nomeLimpo('REQUERIMENTO__EXEMPLO.pdf'), 'REQUERIMENTO EXEMPLO');
  assert.equal(M.nomeLimpo('REDUu00C7u00C3O_X.pdf'), 'REDUÇÃO X');
  assert.equal(M.nomeLimpo('CNH_.pdf'), 'CNH');
});
test('categoriaPeloNome: separadores, certidões e declarações', () => {
  const c = M.categoriaPeloNome;
  assert.equal(c('CNH_'), 'DOCUMENTO_PESSOAL');
  assert.equal(c('EMPRESA__CIVEL_1G'), 'CERTIDAO');
  assert.equal(c('SOCIO__CRIMINAL_2'), 'CERTIDAO');
  for (const n of ['EMPRESA__PROTESTO_DF', 'EMPRESA__SEFAZ_GO', 'EMPRESA__PGFN', 'EMPRESA__TRABALHISTA_1', 'EMPRESA__SIMPLIFICADA', 'CNDT_EMPRESA']) assert.equal(c(n), 'CERTIDAO', n);
  assert.equal(c('Discriminacao_das_Fracoes_Ideais_do_Terreno'), 'DECLARACAO');
  assert.equal(c('Declaracao_de_Quota_parte'), 'DECLARACAO');
  assert.equal(c('Declaracao_Prazo_de_Carencia'), 'DECLARACAO');
  assert.equal(c('REQUERIMENTO_PARA_REDUu00C7u00C3O_PMCMV'), 'DECLARACAO');
  assert.equal(c('CONTRATO_SOCIAL_PROCESSO_1'), 'CONTRATO');
  assert.equal(c('MEMORIAL_DESCRITIVO'), 'MEMORIAL');
  assert.equal(c('PROJETO_APROVADO'), 'PROJETO');
  assert.equal(c('MATRICULA_QD_1_LT_1'), 'MATRICULA');
  /* como o cartório usa: vão em Outros */
  for (const n of ['ALVARA_X', 'ART___X', 'QUADRO_NBR_X', 'CONVENCAO_DE_CONDOMINIO_X', 'REQUERIMENTO_X', 'TERMO_DE_ADESAO_X']) assert.equal(c(n), 'OUTROS', n);
});
test('categoriaPeloTexto: matrícula só se for o cabeçalho; certidão e fração ideal', () => {
  const c = M.categoriaPeloTexto;
  assert.equal(c('Página 1 de 3 Certidão de Inteiro Teor da Matrícula/Registro nº 9.508 - Selo Digital'), 'MATRICULA');
  assert.equal(c('DISCRIMINAÇÃO DAS FRAÇÕES IDEAIS DE TERRENO INCORPORAÇÃO: Lote 1, Quadra 2, sob a matrícula 9.508 com área de 360 m²'), 'DECLARACAO');
  assert.equal(c('Estado de Goiás Poder Judiciário TODAS AS COMARCAS CERTIDÃO NEGATIVA - CÍVEL'), 'CERTIDAO');
  assert.equal(c('CENTRAL DE CERTIDÕES DE PROTESTO DO DF NADA CONSTA'), 'CERTIDAO');
  assert.equal(c('Ilustríssimo Senhor Oficial, DECLARO sob responsabilidade civil e criminal, conforme PMCMV'), 'DECLARACAO');
  assert.equal(c('Anotação de Responsabilidade Técnica ART Obra ou serviço'), 'OUTROS');
  assert.equal(c(''), null);
  assert.equal(c('texto sem pista nenhuma aqui'), null);
});

/* ---- Ficha da incorporação lida dos documentos (texto neutro, modelado na estrutura dos documentos reais) ---- */
const REQ = 'Ilmo (a) Senhor (a) Oficial do Cartório de Registro de Imóveis da Comarca de Cidade Ocidental – Goiás Ref.: REGISTRO DE INCORPORAÇÃO Nesta, EXEMPLO CONSTRUTORA E INCORPORADORA LTDA, CNPJ N° 11.222.333/0001-81 , sociedade empresária limitada com sede na QE 1 conjunto A lote 2 Apt 3, Bairro X, Brasília-DF, neste ato representada por seu sócio administrador FULANO DE TAL, brasileiro, nascido em 04 de janeiro de 1998, incorporadora do RESIDENCIAL EXEMPLO, que será construído no Lote 1, vem a este ofício requerer o registro de INCORPORAÇÃO neste imóvel e que recebeu a denominação de “ RESIDENCIAL EXEMPLO”, requer ainda a abertura das matrículas. Atribui-se às construções o valor de R$ 410.383,44 (quatrocentos e dez mil reais), custo global da obra. Nestes termos, Pede Deferimento. Cidade Ocidental – GO, 17 de novembro de 2026 .';
const ALV = 'MUNICIPIO DE EXEMPLO SECRETARIA ALVARÁ DE CONSTRUÇÃO Nº 132/2026 PROPRIETÁRIO: NOME: EXEMPLO CONSTRUTORA E INCORPORADORA LTDA CPF/CNPJ: 11.222.333/0001-81 AUTOR DO PROJETO: NOME: FULANO DE TAL CREA (CAU) nº: 1000000000D-GO/ ART (RRT) PROJETO: 1020260000001 RESPONSÁVEL TÉCNICO: NOME: FULANO DE TAL CREA (CAU) nº: 1000000000D-GO/ ART (RRT) OBRA: 1020260000001 CONSTRUTORA OU RESPONSÁVEL: NOME: OUTRA LTDA fica concedida a licença para execução do projeto aprovado em 04/09/2026 a obra. Área total da obra: 211,32 m² Observações: O ALVARÁ TERÁ VALIDADE DE 2 (DOIS) ANOS. CIDADE OCIDENTAL - GO, em 04 de Setembro de 2026 Documento assinado digitalmente. FULANA Data: 08/09/2026 16:03:58-0300';
const ART = 'Anotação de Responsabilidade Técnica ART - Lei 6.496/1977 CREA-GO ART Obra ou serviço 1020260000001 Conselho Regional de Engenharia e Agronomia de Goiás 1. Responsável Técnico(a) FULANO DE TAL RNP: 1000000000 Título profissional: Engenheiro Civil Registro: 1000000000D-GO Valor da ART: Registrada em 23/06/2026 Situação Registrada/OK';
test('lerFichaDocs: requerimento, alvará e ART preenchem a ficha', () => {
  const r = M.lerFichaDocs([{id: 'a', texto: REQ}, {id: 'b', texto: ALV}, {id: 'c', texto: ART}]);
  const v = k => r[k] && r[k].valor;
  assert.equal(v('incCnpj'), '11.222.333/0001-81');
  assert.equal(v('incNome'), 'EXEMPLO CONSTRUTORA E INCORPORADORA LTDA');
  assert.equal(v('incSede'), 'QE 1 conjunto A lote 2 Apt 3, Bairro X, Brasília-DF');
  assert.equal(v('empNome'), 'RESIDENCIAL EXEMPLO');
  assert.equal(v('empValor'), '410.383,44');
  assert.equal(v('reqData'), '2026-11-17');
  assert.equal(v('alvaraNum'), '132/2026');
  assert.equal(v('aprovData'), '2026-09-04');
  assert.equal(v('alvaraData'), '2026-09-04');   /* a data escrita no alvará, não a da assinatura digital */
  assert.equal(v('alvaraArea'), '211,32');
  assert.equal(v('rtNome'), 'FULANO DE TAL');
  assert.equal(v('rtRegistro'), '1000000000D-GO');
  assert.equal(v('rtConselho'), 'CREA');
  assert.equal(v('rtArt'), '1020260000001');
  assert.equal(v('rtArtData'), '2026-06-23');
  assert.equal(r.incNome.docId, 'a');            /* o requerimento vale mais que o alvará */
  assert.equal(r.alvaraNum.docId, 'b');
});
test('lerFichaDocs: não confunde o requerimento de patrimônio e ignora texto vazio ou CNPJ inválido', () => {
  const pat = 'Ilmo. Senhor Oficial do Cartório PATRIMÔNIO DE AFETAÇÃO REGISTRO DE INCORPORAÇÃO OUTRA CONSTRUTORA LTDA, CNPJ N° 11.222.333/0001-81 requer';
  assert.deepEqual(M.lerFichaDocs([{id: 'p', texto: pat}, {id: 'v', texto: ''}]), {});
  const ruim = REQ.replace('11.222.333/0001-81', '11.222.333/0001-00');
  assert.equal(M.lerFichaDocs([{id: 'a', texto: ruim}]).incCnpj, undefined);
});
test('lerFichaDocs: nome do incorporador quando o cabeçalho vem colado e o CNPJ vem depois', () => {
  const t = 'Ilmo. Senhor OFICIAL DE REGISTRO DE IMÓVEIS DE CIDADE OCIDENTAL - GO Ref: INCORPORAÇÃO E REGISTRO DA FUTURA MINUTA DE CONVENÇÃO EMPRESA EXEMPLO LTDA com sede na Quadra 5, Lote 6, Brasília/DF, inscrita no CNPJ/MF nº 11.222.333/0001 - 81 , através de seu sócio. REGISTRO DE INCORPORAÇÃO vem requerer';
  const r = M.lerFichaDocs([{id: 'a', texto: 'REGISTRO DE INCORPORAÇÃO ' + t}]);
  assert.equal(r.incNome.valor, 'EMPRESA EXEMPLO LTDA');
  assert.equal(r.incCnpj.valor, '11.222.333/0001-81');
  assert.equal(r.incSede.valor, 'Quadra 5, Lote 6, Brasília/DF');
});
test('lerQuadroIII: CUB com mês abreviado, "R$ por m 2 =" e padrão R8-BAIXO', () => {
  const o = M.lerQuadroIII('1. Projeto-padrão RESIDENCIAL R8-BAIXO 1 211,32 2. Sindicato Sinduscon-GO 3. Custo Unitário Básico para o mês de: nov/26 R$ por m 2 = 1.942,00 4. Áreas Globais');
  assert.equal(o.cub, '1.942,00');
  assert.equal(o.cubMes, '2026-11');
  assert.equal(o.padrao, 'R8-B');
});
test('lerFichaDocs: data da ART quando a tabela vem em duas linhas (cabeçalho e valores), como sai do OCR', () => {
  const ocr = 'Anotação de Responsabilidade Técnica ART CREA-GO ART Obra ou serviço 1020260000001 Valor da ART: lRegistradaem [ValorPago — |NossoNumero — SSituição — | —SNãopossui |[NãoPossu\n285,59 | 23/06/2026 |R$ 285,59 28320690126190382 — Registrada/OK [Livro de Ordem CAT';
  assert.equal(M.lerFichaDocs([{id: 'c', texto: ocr}]).rtArtData.valor, '2026-06-23');
});
test('lerMatricula: adquirente na forma "ao comprador NOME, ..." (atos antigos) não gera alerta e vira titular', () => {
  const t = 'IMÓVEL: Lote 1, da Quadra 2, situado nesta cidade, com a área de 360,00m², confrontando pela frente com a Rua 1, com 12,00 metros. PROPRIETÁRIA: ANTIGA LTDA, CGC nº 00.000.000/0001-91, com sede em Brasília-DF. Dou fé. Cidade Ocidental-GO, 27 de dezembro de 2012. O Oficial Respondente.\n----\n'
    + 'R-1-9.999 - Protocolo nº 8.168 datado de 26/02/2013. COMPRA E VENDA. Por Escritura Pública de Venda e Compra, foi o imóvel vendido por sua proprietária, acima qualificada, ao comprador FULANO DE TAL, brasileiro, viúvo, advogado, portador do RG nº 1.234.567 SSP-DF e CPF nº 111.444.777-35, residente e domiciliado em Brasília-DF, pelo preço de R$ 30.000,00. Dou fé. Cidade Ocidental-GO, 01 de março de 2013. O Oficial Respondente\n----\n'
    + 'R-2-9.999 - Protocolo nº 14.819 datado de 06/01/2014. COMPRA E VENDA. Por Escritura Pública, foi o imóvel vendido por seu proprietário acima qualificado, a compradora BELTRANA DE TAL, brasileira, divorciada, portadora da CI nº 790.256 SSP-DF e CPF nº 529.982.247-25, residente em Brasília, pelo preço de R$ 31.000,00. Dou fé. Cidade Ocidental-GO, 22 de Janeiro de 2014. O Oficial Respondente.\n----\n';
  const R = M.lerMatricula(t);
  assert.deepEqual(R.alertas, []);
  assert.equal(R.titular.nome, 'BELTRANA DE TAL');
  assert.equal(R.titular.ato, 'R-2');
});

/* ---- Certidões: órgão, pessoa, emissão e validade nos formatos reais (texto neutro, CPF/CNPJ de teste) ---- */
const CPF_T = '111.444.777-35', CNPJ_T = '11.222.333/0001-81';
test('lerCertidao: TJGO 1º e 2º grau (e a data de nascimento não vira emissão)', () => {
  const g1 = M.lerCertidao('EMPRESA CIVEL 1', 'Estado de Goiás Poder Judiciário TODAS AS COMARCAS CERTIDÃO NEGATIVA - CÍVEL CERTIFICA a requerimento da parte interessada ... Documento Publicado Digitalmente em 17/11/2026 - 15:21:35 Localizar pelo código: 102788734564, no endereço: https://projudi.tjgo.jus.br/CertidaoPublica PRAZO DE VALIDADE: 30 DIAS');
  assert.equal(g1.tipo, 'CIV'); assert.equal(g1.orgao, 'TJGO 1º grau'); assert.equal(g1.emissao, '2026-11-17'); assert.equal(g1.validade, '2026-12-17');
  const g2 = M.lerCertidao('SOCIO CRIMINAL 2', 'PODER JUDICIÁRIO TRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS CERTIDÃO NEGATIVA DE AÇÕES CRIMINAIS Nº : 1 CERTIFICO que revendo os registros eletrônicos no Sistema de Segundo Grau (SSG) do Tribunal de Justiça do Estado de Goiás, NADA CONSTA em tramitação contra: Requerente : FULANO DE TAL Nome da Mãe : BELTRANA Data de Nascimento : 04/01/1998 CPF : ' + CPF_T + ' ESTA CERTIDÃO ABRANGE');
  assert.equal(g2.tipo, 'CRIM'); assert.equal(g2.orgao, 'TJGO 2º grau');
  assert.deepEqual(g2.pessoa, {nome: 'FULANO DE TAL', doc: CPF_T});
  assert.equal(g2.emissao, '');     /* sem data de emissão no texto: vazio, nunca 1998 */
});
test('lerCertidao: Justiça Federal, TJDFT, CNDT e TRT', () => {
  const f = M.lerCertidao('SOCIO CRIMINAL 1G', 'PODER JUDICIÁRIO JUSTIÇA FEDERAL TRIBUNAL REGIONAL FEDERAL DA 1º REGIÃO CERTIDÃO JUDICIAL CRIMINAL NEGATIVA 8292/2026 CERTIFICAMOS que NÃO CONSTAM PROCESSOS de classes CRIMINAIS contra: FULANO DE TAL OU CPF n. ' + CPF_T + ' Certidão emitida em 16/11/2026, às 14:22:05 (data e hora de Brasília)');
  assert.equal(f.tipo, 'CRIMF'); assert.equal(f.orgao, 'Justiça Federal (TRF1)'); assert.equal(f.pessoa.nome, 'FULANO DE TAL'); assert.equal(f.pessoa.doc, CPF_T); assert.equal(f.emissao, '2026-11-16');
  const d = M.lerCertidao('certidao', 'TRIBUNAL DE JUSTIÇA DO DISTRITO FEDERAL E DOS TERRITÓRIOS CERTIDÃO NEGATIVA DE DISTRIBUIÇÃO (ESPECIAL) NADA CONSTA contra o nome por extenso e CPF/CNPJ de: EXEMPLO CONSTRUTORA LTDA ' + CNPJ_T + ' OBSERVAÇÕES: a) Os dados ... Emitida gratuitamente pela internet em: 25/11/2026 Selo digital *** VÁLIDA POR 30 (TRINTA) DIAS ***');
  assert.equal(d.tipo, 'TJDFT'); assert.equal(d.pessoa.nome, 'EXEMPLO CONSTRUTORA LTDA'); assert.equal(d.pessoa.doc, CNPJ_T); assert.equal(d.emissao, '2026-11-25'); assert.equal(d.validade, '2026-12-25');
  const c = M.lerCertidao('EMPRESA TRABALHISTA', 'CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS Nome: EXEMPLO CONSTRUTORA LTDA (MATRIZ E FILIAIS) CNPJ: ' + CNPJ_T + ' Certidão nº: 9477 Expedição: 09/11/2026, às 16:46:16 Validade: 08/05/2027 - 180 (cento e oitenta) dias, contados da data de sua expedição.');
  assert.equal(c.tipo, 'TRAB'); assert.equal(c.pessoa.nome, 'EXEMPLO CONSTRUTORA LTDA'); assert.equal(c.emissao, '2026-11-09'); assert.equal(c.validade, '2027-05-08');
  const t = M.lerCertidao('EMPRESA TRABALHISTA 1', 'Certifica-se, com parâmetro no sistema informatizado da 18ª Região da Justiça do Trabalho, que, até a presente data, NÃO CONSTA AÇÃO TRABALHISTA, em nome de ... Esta certidão NÃO GERA os efeitos da certidão Negativa de Débitos Trabalhistas');
  assert.equal(t.tipo, 'TRT');
});
test('lerCertidao: SEFAZ-GO com data por extenso sem "de", SEFAZ-DF, PGFN, protesto DF e Junta', () => {
  const g = M.lerCertidao('EMPRESA SEFAZ GO', 'ESTADO DE GOIAS SECRETARIA DE ESTADO DA ECONOMIA CERTIDAO DE DEBITO INSCRITO EM DIVIDA ATIVA - NEGATIVA IDENTIFICAÇÃO: NOME: CNPJ ' + CNPJ_T + ' DESPACHO: NAO CONSTA DEBITO Certidao VALIDA POR 120 DIAS SGTI-SEFAZ: LOCAL E DATA: GOIANIA, 9 NOVEMBRO DE 2026 HORA: 16:50:12');
  assert.equal(g.tipo, 'SEFAZ'); assert.equal(g.emissao, '2026-11-09'); assert.equal(g.validade, '2027-03-09'); assert.equal(g.pessoa.doc, CNPJ_T);
  const d = M.lerCertidao('EMPRESA SEFAZ DF', 'GOVERNO DO DISTRITO FEDERAL SECRETARIA DE ESTADO DE ECONOMIA CERTIDÃO NEGATIVA DE DÉBITOS Válida até 07 de fevereiro de 2027. * Certidão emitida via internet em 09/11/2026 às 16:47:55');
  assert.equal(d.tipo, 'SEFAZDF'); assert.equal(d.emissao, '2026-11-09'); assert.equal(d.validade, '2027-02-07');
  const p = M.lerCertidao('EMPRESA PGFN', 'MINISTÉRIO DA FAZENDA Procuradoria-Geral da Fazenda Nacional CERTIDÃO NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS Emitida às 16:03:09 do dia 09/11/2026 <hora e data de Brasília>. Válida até 08/05/2027.');
  assert.equal(p.tipo, 'FED'); assert.equal(p.emissao, '2026-11-09'); assert.equal(p.validade, '2027-05-08');
  const pr = M.lerCertidao('EMPRESA PROTESTO DF', 'CENTRAL DE CERTIDÕES DE PROTESTO DO DF CERTIDÃO UNIFICADA DE PROTESTO a requerimento de EXEMPLO LTDA CNPJ: ' + CNPJ_T + ' NADA CONSTA Emitida às 09:09:49 em 18/11/2026 (hora e data de Brasília).');
  assert.equal(pr.tipo, 'PROTDF'); assert.equal(pr.emissao, '2026-11-18');
  assert.equal(M.lerCertidao('EMPRESA SIMPLIFICADA', 'Certidão Simplificada Digital emitida pela JUNTA COMERCIAL, INDUSTRIAL E SERVIÇOS DO DISTRITO FEDERAL').tipo, 'SIMPL');
});
test('ordemDoc: a lista do cartório (requerimento, PMCMV, ART, alvará, declarações, certidões, contrato, quadros, minuta, projeto, patrimônio, termo)', () => {
  const itens = [
    ['TERMO DE ADESAO AFETACAO', 'OUTROS'], ['REQUERIMENTO PATRIMONIO DE AFETACAO', 'OUTROS'], ['PROJETO APROVADO', 'PROJETO'], ['CONVENCAO DE CONDOMINIO', 'OUTROS'],
    ['QUADRO NBR', 'OUTROS'], ['MEMORIAL DESCRITIVO', 'MEMORIAL'], ['CNH', 'DOCUMENTO_PESSOAL'], ['CONTRATO SOCIAL', 'CONTRATO'], ['EMPRESA SIMPLIFICADA', 'CERTIDAO'],
    ['EMPRESA PROTESTO DF', 'CERTIDAO'], ['EMPRESA CRIMINAL 1', 'CERTIDAO'], ['EMPRESA CIVEL 1', 'CERTIDAO'], ['EMPRESA SEFAZ GO', 'CERTIDAO'],
    ['Declaracao de Vagas de Garagem', 'DECLARACAO'], ['Discriminacao das Fracoes Ideais', 'DECLARACAO'], ['Declaracao de Quota parte', 'DECLARACAO'], ['Declaracao Prazo de Carencia', 'DECLARACAO'],
    ['ALVARA', 'OUTROS'], ['ART', 'OUTROS'], ['REQUERIMENTO PARA REDUCAO PMCMV', 'DECLARACAO'], ['REQUERIMENTO', 'OUTROS'], ['Matrícula 1.234', 'MATRICULA']
  ];
  const ord = itens.map(([n, c]) => ({n, k: M.ordemDoc(n, '', c)})).sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1]).map(x => x.n);
  assert.deepEqual(ord, ['Matrícula 1.234', 'REQUERIMENTO', 'REQUERIMENTO PARA REDUCAO PMCMV', 'ART', 'ALVARA', 'Declaracao Prazo de Carencia', 'Declaracao de Quota parte', 'Discriminacao das Fracoes Ideais',
    'Declaracao de Vagas de Garagem', 'EMPRESA SEFAZ GO', 'EMPRESA CIVEL 1', 'EMPRESA CRIMINAL 1', 'EMPRESA PROTESTO DF', 'EMPRESA SIMPLIFICADA', 'CONTRATO SOCIAL', 'CNH',
    'MEMORIAL DESCRITIVO', 'QUADRO NBR', 'CONVENCAO DE CONDOMINIO', 'PROJETO APROVADO', 'REQUERIMENTO PATRIMONIO DE AFETACAO', 'TERMO DE ADESAO AFETACAO']);
});
test('ordemDoc: na mesma certidão a empresa (CNPJ) vem antes do sócio (CPF)', () => {
  const pj = M.ordemDoc('A', 'Estado de Goiás Poder Judiciário TODAS AS COMARCAS CERTIDÃO NEGATIVA - CRIMINAL contra: Requerente : EXEMPLO LTDA CNPJ : 11.222.333/0001-81 Nome da Mãe', 'CERTIDAO');
  const pf = M.ordemDoc('B', 'Estado de Goiás Poder Judiciário TODAS AS COMARCAS CERTIDÃO NEGATIVA - CRIMINAL contra: Requerente : FULANO DE TAL Nome da Mãe : X Data de Nascimento : 04/01/1998 CPF : 111.444.777-35', 'CERTIDAO');
  assert.equal(pj[0], pf[0]);
  assert.ok(pj[1] < pf[1]);
});
test('lerCertidao: TRF 1º grau x TRF/turmas, TRT por instância e CNPJ sem pontuação, simplificada e protesto', () => {
  const base = 'PODER JUDICIÁRIO JUSTIÇA FEDERAL TRIBUNAL REGIONAL FEDERAL DA 1º REGIÃO CERTIDÃO JUDICIAL CÍVEL 1/2026 CERTIFICAMOS que NÃO CONSTAM PROCESSOS de classes CÍVEIS em tramitação contra: EXEMPLO LTDA OU CNPJ n. ' + CNPJ_T + ' Certidão emitida em 16/11/2026, às 14:17:07 (data e hora de Brasília), ';
  const g1 = M.lerCertidao('A', base + 'abrange a Justiça Federal de 1º Grau na(s) seguinte(s) unidade(s): Goiás. Observações: a) A autenticidade desta certidão poderá ser verificada, no prazo de 90 dias');
  const g2 = M.lerCertidao('B', base + 'abrange o Tribunal Regional Federal da 1º Região e os processos sob a jurisdição do TRF6');
  assert.equal(g1.orgao, 'Justiça Federal 1º grau (TRF1)'); assert.equal(g2.orgao, 'TRF1 (2º grau e turmas recursais)');
  assert.equal(g1.validade, '2026-12-16');     /* os 90 dias são da autenticidade; vale o padrão de 30 */
  const t2 = M.lerCertidao('C', 'Certifica-se, com parâmetro no sistema informatizado da 18ª Região da Justiça do Trabalho, que, até a presente data, NÃO CONSTA AÇÃO TRABALHISTA, em andamento na 2ª Instância, em face de EXEMPLO CONSTRUTORA LTDA, inscrito(a) no CNPJ sob o nº 11222333000181 . NÃO GERA os efeitos da certidão Negativa de Débitos Trabalhistas');
  assert.equal(t2.tipo, 'TRT'); assert.equal(t2.orgao, 'TRT 18ª Região · 2ª instância (não é a CNDT)');
  assert.deepEqual(t2.pessoa, {nome: 'EXEMPLO CONSTRUTORA LTDA', doc: CNPJ_T});
  const s = M.lerCertidao('D', 'Certidão Simplificada Digital emitida pela JUNTA COMERCIAL Último Arquivamento: 05/08/2025 NADA MAIS# Brasília, 18 de Novembro de 2026 09:19');
  assert.equal(s.tipo, 'SIMPL'); assert.equal(s.emissao, '2026-11-18'); assert.equal(s.validade, '2026-12-18');
  const p = M.lerCertidao('E', 'CERTIDÃO UNIFICADA DE PROTESTO DO DF a requerimento de EXEMPLO LTDA, nos 5 anos anteriores a 17/11/2026, em relação ao nome de EXEMPLO LTDA CNP: ' + CNPJ_T + ' NADA CONSTA Emitida às 09:09:49 em 18/11/2026 (hora e data de Brasília).');
  assert.equal(p.tipo, 'PROTDF'); assert.equal(p.emissao, '2026-11-18'); assert.equal(p.pessoa.doc, CNPJ_T);
});
test('lerCertidao: protesto do DF com selo do TJDFT impresso continua sendo protesto', () => {
  const r = M.lerCertidao('EMPRESA PROTESTO DF', 'CERTIDÃO UNIFICADA DE PROTESTO Distrito Federal NADA CONSTA Selo Digital: TJDFT20260410006596LTLX. Para consultar o selo, acesse www.tjdft.jus.br Emitida às 09:09:49 em 18/11/2026');
  assert.equal(r.tipo, 'PROTDF'); assert.equal(r.emissao, '2026-11-18');
});
