# Qualificador CRCO

Programa de apoio à qualificação de títulos do Registro de Imóveis de Cidade Ocidental/GO (CRCO).
Organiza o GED, confere os dados lado a lado com o documento de origem, mantém o checklist editável por tipo de ato, calcula e audita os quadros da ABNT NBR 12721 na incorporação e monta a nota devolutiva.

- **Site:** GitHub Pages (este repositório). Aqui fica **só código**.
- **Documentos dos títulos:** abertos e processados **só no navegador** de quem usa. Nenhum PDF, imagem ou texto sai do computador: não há servidor, login nem banco nesta versão.

---

## Publicar (uma vez só)

1. No GitHub, crie um repositório novo chamado `qualificador-crco`.
2. **Add file → Upload files**: arraste todo o conteúdo desta pasta (inclusive as pastas `js`, `lib` e `tests`) e clique em **Commit changes**.
3. **Settings → Pages → Build and deployment**: *Source* = **Deploy from a branch**, *Branch* = **main**, pasta **/ (root)** → **Save**.
4. Em 1 ou 2 minutos o site fica em `https://israelricardomoreira.github.io/qualificador-crco/`.

> Para testar no computador sem publicar, abra um terminal nesta pasta e rode `python -m http.server 8000`; depois acesse `http://localhost:8000`. Abrir o `index.html` com dois cliques não funciona por completo (o navegador bloqueia o leitor de PDF em arquivo local).

---

## Uso no dia a dia

| O que | Onde |
|---|---|
| Começar um título | Preencha **Protocolo**, **Tipo de ato** e **Prenotação** no topo |
| Importar documentos | Etapa **1 · Documentos**: arraste PDF, JPG, PNG, WEBP ou **TIFF** (inclusive de várias páginas, do scanner) ou cole prints (Ctrl+V). Alt+I importa, Alt+A agrupa. Foto de iPhone (HEIC): exporte como JPG |
| Validar assinatura | Botão **🔐 Validar** no documento: copia o nome do PDF e abre o ITI. Lá, **Ctrl+V** e **Enter** |
| Ler página escaneada | **Lupa → Texto → Ler com OCR** ou **Conferência → Ler esta página com OCR** |
| Ler a matrícula | **Conferência → Ler matrícula**: usa o documento MATRICULA do GED (ou o texto colado), preenche a ficha e mostra titular atual, atos, ônus em aberto e continuidade |
| Conferir dados | Etapa **2 · Conferência**: clique no campo, selecione o trecho no texto (ou clique no dado detectado). A origem fica registrada |
| Checklist | Etapa **3**: carregue o modelo do tipo de ato, edite, exclua ou inclua itens e **Salve como meu modelo** |
| Incorporação | Etapa **4** (aparece só em *Incorporação imobiliária*): quadros, auditoria NBR 12721 e minuta. Dá para colar do Excel |
| Nota devolutiva | Etapa **5**: o que virou "Exigência" no checklist já está lá. Gere, revise e copie |
| Arquivo de aprendizado | Baixa **junto com o ZIP do GED, em arquivo separado** (`aprendizado_….json`), ou pelo botão **Aprendizado**. Vai **anonimizado** (nomes viram `[PF_1]`/`[PJ_1]`; CPF, RG, CNH e números longos viram `#`). Guarde e mande para o Claude analisar: ele mostra o que o sistema sugeriu × o que você deixou, o que precisou digitar, o perfil de cada documento e suas notas (botão ⚑ ao lado do campo) |
| Guardar a análise | **Salvar análise** (Ctrl+S) baixa um `.gori`. **Abrir análise** retoma. Também abre os `.gori` da Calculadora GO-RI v3 |

O `.gori` tem dados do título (nomes, CPF/CNPJ). Guarde na pasta do processo ou no OneDrive do cartório, **nunca neste repositório** (o `.gitignore` já bloqueia).

---

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Página, estilos e ordem de carregamento |
| `motor.js` | Regras sem tela: NBR 12721 (Quadros I a III e IV-B), fração ideal, auditoria, leitura de matrícula, extenso, CPF/CNPJ. Roda também no Node |
| `js/nucleo.js` | Utilitários de tela usados por todos |
| `js/dominio.js` | Tipos de ato, categorias do GED, certidões, campos da ficha e modelos de checklist padrão |
| `js/estado.js` | Estado da análise, salvar/abrir `.gori`, importação da Calculadora GO-RI v3 |
| `js/navegacao.js` | Etapas e troca de etapa |
| `js/ged.js` | Etapa 1 · GED: importar, agrupar, ordenar, ZIP, validação de assinatura |
| `js/visualizador.js` | Lupa, régua, contraste, OCR e "Apontar exigência" |
| `js/conferencia.js` | Etapa 2 · ficha lado a lado com a origem de cada dado |
| `js/matricula.js` | Leitura da matrícula na Conferência (a regra de leitura fica no `motor.js`) |
| `js/checklist.js` | Etapa 3 · checklist editável e modelos |
| `js/incorporacao.js` | Etapa 4 · quadros, auditoria e minuta (o cálculo está no `motor.js`) |
| `js/nota.js` | Etapa 5 · exigências, catálogo e nota |
| `js/aprendizado.js` | Arquivo de aprendizado: sugerido × final, perfis dos documentos, checklist, exigências, tempos e notas (anonimizado pelo `motor.js`) |
| `js/inicio.js` | Eventos gerais, atalhos, conferência de versão e início |
| `lib/` | Bibliotecas com versão fixa (pdf.js 3.11.174, pdf-lib 1.17.1, JSZip 3.10.1, Tesseract.js 5.1.1 com português, UTIF 3.1.0 + pako 1.0.11 para TIFF) e licenças |
| `tests/motor.test.js` | Testes do motor, inclusive um caso real de incorporação conferido à mão (só números) |

---

## Atualizar sem quebrar

1. Antes de subir, rode os testes: `node --test tests/motor.test.js` (tem que dar `pass` em todos).
2. Toda entrega tem **um número de versão** (hoje `1.2.0`). Ele aparece em: `motor.js` (VERSAO), `js/inicio.js` (VERSAO), na linha de registro do topo de cada `js/*.js` e no `?v=` dos `<script>` do `index.html`. Troque em todos.
3. Suba **todos** os arquivos alterados juntos. Se faltar algum, o site mostra um aviso vermelho dizendo qual arquivo está em versão diferente, em vez de funcionar pela metade.
4. Se algo der errado: **Commits → escolha a versão anterior → Revert**.

## Segurança

1. **Nada sai do navegador.** Não há servidor, envio de arquivo nem chave de API.
2. **Content-Security-Policy restrita ao próprio site:** o navegador só executa scripts desta pasta e não conecta a nenhum endereço externo.
3. **Bibliotecas locais e com versão fixa**, inclusive o OCR. Funciona até sem internet depois de aberto.
4. **Arquivo de aprendizado anonimizado** antes de baixar; o protocolo vira um código que não dá para reverter.
5. **Nenhum dado no repositório:** `.gori`, PDFs, imagens de documentos, ZIPs e planilhas estão no `.gitignore`.
6. Rascunho automático e modelos ficam só no navegador de quem usa (localStorage).
