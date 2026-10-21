/* Qualificador CRCO — js/dominio.js: tipos de ato, categorias do GED, certidões, campos da ficha e modelos de checklist */
'use strict';
(window.QUAL_ARQ = window.QUAL_ARQ || {})['js/dominio.js'] = '1.4.0';
/* Categorias do GED: exatamente as do sistema do cartório (o código vai no nome do arquivo do ZIP) */
const CAT_NOME = {ATO_LAVRADO:'Ato Lavrado', CERTIDAO:'Certidão', CONTRATO:'Contrato', DECLARACAO:'Declaração', DOCUMENTO_PESSOAL:'Documento Pessoal', ESCRITURA:'Escritura',
  MATRICULA:'Matrícula', MEMORIAL:'Memorial', OUTROS:'Outros', PLANTA_ENGENHARIA:'Planta Engenharia', PROCURACAO:'Procuração', PROJETO:'Projeto'};
const CATS = Object.keys(CAT_NOME);
const catNome = c => CAT_NOME[c] || c;
const TIPOS_ATO = {GERAL:'Outro / geral', COMPRA_VENDA:'Compra e venda', ALIENACAO_FIDUCIARIA:'Alienação fiduciária', INCORPORACAO:'Incorporação imobiliária', INST_CONDOMINIO:'Instituição de condomínio', AVERB_CONSTRUCAO:'Averbação de construção'};
const PAPEIS = ['Transmitente','Adquirente','Devedor','Credor','Incorporador','Proprietário','Interveniente','Procurador','Outro'];
const CERT = {
  FED:['Federal (RFB/PGFN)','de Débitos Relativos aos Tributos Federais e à Dívida Ativa da União'],
  TRAB:['Trabalhista (CNDT)','de Débitos Trabalhistas'],
  SEFAZ:['Estadual (SEFAZ/GO)','de Débito Inscrito em Dívida Ativa - SEFAZ/GO'],
  MUN:['Municipal','de Débitos Municipais'],
  PROT:['Protesto (local)','de Protesto, expedida pelo Tabelionato de Protesto desta cidade'],
  CIV:['Ações cíveis (TJGO)','de Ações Cíveis, expedida pelo Tribunal de Justiça do Estado de Goiás'],
  CRIM:['Ações criminais (TJGO)','de Ações Criminais, expedida pelo Tribunal de Justiça do Estado de Goiás'],
  TJDFT:['Distribuição (TJDFT)','de Distribuição, expedida pelo Tribunal de Justiça do Distrito Federal e Territórios'],
  PROTDF:['Protesto (DF)','Unificada de Protesto, expedida pela Central de Certidões de Protesto do DF'],
  ONUS:['Ônus reais','de Ônus Reais'],
  OUTRA:['Outra','']
};
const CAMPOS = [
  {g:'Imóvel', k:'matricula', l:'Matrícula nº'},
  {g:'Imóvel', k:'regAnterior', l:'Registro anterior (R-/AV-)'},
  {g:'Imóvel', k:'areaTerreno', l:'Área do terreno (m²)', num:true},
  {g:'Imóvel', k:'cep', l:'CEP'},
  {g:'Imóvel', k:'descricao', l:'Descrição / endereço do imóvel', t:'area', wide:true},
  {g:'Imóvel', k:'confrontacao', l:'Confrontações (matrícula)', t:'area', wide:true},
  {g:'Título', k:'reqData', l:'Data do título / requerimento', t:'date'},
  {g:'Incorporação', inc:true, k:'incNome', l:'Incorporadora / proprietária', wide:true},
  {g:'Incorporação', inc:true, k:'incCnpj', l:'CNPJ', doc:true},
  {g:'Incorporação', inc:true, k:'incSede', l:'Sede', wide:true},
  {g:'Incorporação', inc:true, k:'empNome', l:'Nome do empreendimento'},
  {g:'Incorporação', inc:true, k:'empValor', l:'Valor do empreendimento (R$)', num:true},
  {g:'Incorporação', inc:true, k:'alvaraNum', l:'Alvará de construção nº'},
  {g:'Incorporação', inc:true, k:'alvaraData', l:'Data do alvará', t:'date'},
  {g:'Incorporação', inc:true, k:'alvaraArea', l:'Área construída no alvará (m²)', num:true},
  {g:'Incorporação', inc:true, k:'aprovData', l:'Data de aprovação do projeto', t:'date'},
  {g:'Incorporação', inc:true, k:'rtNome', l:'Responsável técnico'},
  {g:'Incorporação', inc:true, k:'rtConselho', l:'Conselho', t:'sel', opts:['CREA','CAU']},
  {g:'Incorporação', inc:true, k:'rtRegistro', l:'Registro no conselho'},
  {g:'Incorporação', inc:true, k:'rtArt', l:'ART / RRT nº'},
  {g:'Incorporação', inc:true, k:'rtArtData', l:'Data da ART / RRT', t:'date'}
];
const MODELOS_PADRAO = {
  GERAL: [
    ['Título apresentado em via original, cópia autenticada ou meio eletrônico com assinatura válida', ''],
    ['Imóvel descrito no título confere com a matrícula (especialidade objetiva)', 'Lei 6.015/73, art. 225'],
    ['Partes qualificadas e conferentes com os documentos (especialidade subjetiva)', 'Lei 6.015/73, art. 176'],
    ['Transmitente/outorgante é o titular atual na matrícula (continuidade)', 'Lei 6.015/73, arts. 195 e 237'],
    ['Consulta de indisponibilidade (CNIB) realizada', ''],
    ['Ônus, restrições e averbações pendentes verificados na matrícula', ''],
    ['Tributos de transmissão comprovados, quando cabíveis (ITBI/ITCD)', ''],
    ['Assinaturas e certificados digitais validados', ''],
    ['DOI e demais comunicações obrigatórias, quando cabíveis', '']
  ],
  INCORPORACAO: [
    ['Requerimento do incorporador', 'Lei 4.591/64, art. 32'],
    ['Título de propriedade do terreno / matrícula', 'Lei 4.591/64, art. 32, a'],
    ['Certidões negativas (federal, estadual, municipal, protesto, ações cíveis e criminais, ônus reais)', 'Lei 4.591/64, art. 32, b'],
    ['Histórico dos títulos de propriedade do imóvel', 'Lei 4.591/64, art. 32, c'],
    ['Projeto de construção aprovado (conjunto completo)', 'Lei 4.591/64, art. 32, d · NBR 12721, 12.1 a'],
    ['Cálculo das áreas: Quadros I, II e IV-B (ou IV-B-1)', 'Lei 4.591/64, art. 32, e · NBR 12721, 12.1 b'],
    ['Memorial descritivo: Quadros V a VIII', 'Lei 4.591/64, art. 32, g · NBR 12721, 12.1 c'],
    ['Avaliação do custo global: Quadros III e IV-A, com CUB do mês ou dos dois meses anteriores', 'Lei 4.591/64, art. 32, h · NBR 12721, 6.4.1 e 12.1 e/f'],
    ['Discriminação das frações ideais de terreno', 'Lei 4.591/64, art. 32, i'],
    ['Minuta da futura convenção de condomínio', 'Lei 4.591/64, art. 32, j'],
    ['Declaração sobre o prazo de carência, se houver', 'Lei 4.591/64, art. 32, n'],
    ['Declaração sobre vagas de garagem, com planta elucidativa', 'Lei 4.591/64, art. 32, p · NBR 12721, 12.1 d'],
    ['Critério de designação das unidades explicitado no Quadro V', 'NBR 12721, 12.1 g'],
    ['Quadros assinados pelo responsável técnico e pelo incorporador, com ART/RRT', 'NBR 12721, Anexo A'],
    ['Alvará de construção', '']
  ]
};

