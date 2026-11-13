from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = "docs/relatorio-projeto-devio.pdf"


def text(value):
    return escape(str(value)).replace("\n", "<br/>")


def para(value, style):
    return Paragraph(text(value), style)


def footer(canvas, document):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(18 * mm, 12 * mm, "dev.io | Documentação técnica do projeto")
    canvas.drawRightString(192 * mm, 12 * mm, f"Página {document.page}")
    canvas.restoreState()


def table(rows, widths, styles):
    data = []
    for row_index, row in enumerate(rows):
        cell_style = styles["TableHeader"] if row_index == 0 else styles["TableText"]
        data.append([Paragraph(text(cell), cell_style) for cell in row])
    result = Table(data, colWidths=widths, repeatRows=1)
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdfa")]),
    ]))
    return result


def build_report():
    document = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title="Documentação técnica do projeto dev.io",
        author="dev.io",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=25, leading=30, textColor=colors.HexColor("#115e59"),
        alignment=TA_CENTER, spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="CoverSubtitle", parent=styles["Normal"], fontSize=13,
        leading=19, textColor=colors.HexColor("#475569"), alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=16, leading=20, textColor=colors.HexColor("#115e59"),
        spaceBefore=12, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="Subsection", parent=styles["Heading3"], fontName="Helvetica-Bold",
        fontSize=11.5, leading=15, textColor=colors.HexColor("#134e4a"),
        spaceBefore=9, spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="BodySmall", parent=styles["BodyText"], fontSize=9.3,
        leading=13.5, textColor=colors.HexColor("#1f2937"), spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="TableText", parent=styles["BodyText"], fontSize=7.1,
        leading=9.3, textColor=colors.HexColor("#1f2937"),
    ))
    styles.add(ParagraphStyle(
        name="TableHeader", parent=styles["BodyText"], fontName="Helvetica-Bold",
        fontSize=7.1, leading=9.3, textColor=colors.white,
    ))
    styles.add(ParagraphStyle(
        name="CodeBlock", parent=styles["BodyText"], fontName="Courier",
        fontSize=8.1, leading=11, textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"), leftIndent=8, rightIndent=8,
        spaceBefore=3, spaceAfter=8,
    ))

    story = [
        Spacer(1, 34 * mm),
        para("Documentação técnica do projeto dev.io", styles["CoverTitle"]),
        para("Back-end, banco de dados, APIs, componentes e decisões de arquitetura", styles["CoverSubtitle"]),
        Spacer(1, 18 * mm),
        para("Projeto: dev.io", styles["CoverSubtitle"]),
        para("Data: 22/10/2026", styles["CoverSubtitle"]),
        Spacer(1, 27 * mm),
        para("Este documento descreve a implementação existente no repositório, incluindo as operações CRUD de projetos adicionadas para atender à documentação completa das operações GET, POST, PUT e DELETE.", styles["BodySmall"]),
        PageBreak(),
        para("1. Visão geral e arquitetura", styles["Section"]),
        para("O dev.io é uma plataforma web para descoberta, cadastro e organização de projetos de desenvolvimento. A solução é dividida em uma camada de apresentação React, um servidor de desenvolvimento Vite e uma API Node.js com Express. O Vite encaminha as requisições /api para a API local na porta 8787; a interface normalmente é servida na porta definida por PORT, 8443 no Codespace.", styles["BodySmall"]),
        para("Fluxo principal: o navegador executa src/main.tsx, que monta App.tsx; as funções de src/lib/api.ts usam fetch com credenciais; o proxy do Vite encaminha /api; Express valida a requisição, consulta o SQLite e retorna JSON; arquivos de projeto são armazenados em storage/projects e seus metadados ficam no banco.", styles["BodySmall"]),
        para("A inicialização cria automaticamente data/ e storage/projects. Na primeira execução, o módulo do servidor cria data/devio.sqlite e as tabelas necessárias. O banco é relacional e opera com chaves estrangeiras ativadas.", styles["BodySmall"]),
        para("2. Back-end e funcionamento", styles["Section"]),
        para("O arquivo server/index.mjs concentra a API e usa módulos nativos do Node.js para criptografia, arquivos, caminhos e SQLite. A autenticação utiliza scrypt para derivação de senha, SHA-256 para tokens de sessão e cookies HttpOnly. A função requireUser protege os endpoints privados e associa a requisição ao usuário autenticado.", styles["BodySmall"]),
        para("O upload usa multer em memória, limita o arquivo a 100 MB e aceita ZIP ou TAR.GZ. Antes da persistência, scanArchive verifica extensão, assinatura binária, integridade e caminhos de extração. O arquivo aprovado recebe um nome gerado por UUID, é gravado com permissão restrita e tem seu SHA-256 registrado.", styles["BodySmall"]),
        para("A classe ProjectController encapsula as operações de atualização e exclusão, recebe o banco no construtor e só permite alterar ou remover projetos cujo owner_id corresponda ao usuário da sessão. O cadastro e as consultas também seguem a mesma regra de autorização por middleware.", styles["BodySmall"]),
        para("2.1. Estrutura de pastas relevante", styles["Subsection"]),
    ]
    story.append(table([
        ["Caminho", "Responsabilidade"],
        ["server/index.mjs", "Servidor Express, autenticação, persistência SQLite, uploads, validações e rotas."],
        ["src/App.tsx", "Interface React e fluxos de apresentação do produto."],
        ["src/lib/api.ts", "Cliente HTTP tipado para autenticação, biblioteca e projetos."],
        ["src/main.tsx", "Ponto de entrada que monta React.StrictMode e importa o CSS global."],
        ["src/index.css", "Tailwind CSS v4, tema visual, fontes e estilos globais."],
        ["data/devio.sqlite", "Banco SQLite local criado em tempo de execução."],
        ["storage/projects/", "Armazenamento privado dos arquivos enviados."],
        ["docker-compose.yml", "Ambiente PostgreSQL demonstrativo para uma futura implantação."],
    ], [55 * mm, 112 * mm], styles))

    story.extend([
        PageBreak(),
        para("3. Banco de dados relacional", styles["Section"]),
        para("O back-end utiliza SQLite por meio da API DatabaseSync de node:sqlite. O modelo é relacional: users se relaciona com sessions e projects; library funciona como tabela associativa entre usuários e projetos. As ações de exclusão usam ON DELETE CASCADE nas sessões e na biblioteca e ON DELETE SET NULL no proprietário do projeto.", styles["BodySmall"]),
        para("O PostgreSQL presente em docker-compose.yml é uma alternativa de infraestrutura para produção ou evolução do protótipo; ele não é acessado pelo código atual. Portanto, o banco efetivamente utilizado pelo back-end é o SQLite local.", styles["BodySmall"]),
        para("3.1. Dicionário de dados: users", styles["Subsection"]),
    ])
    story.append(table([
        ["Campo", "Tipo", "Restrições", "Finalidade"],
        ["id", "TEXT", "PK", "Identificador UUID do usuário."],
        ["name", "TEXT", "NOT NULL", "Nome exibido."],
        ["username", "TEXT", "NOT NULL, UNIQUE", "Nome público normalizado."],
        ["email", "TEXT", "NOT NULL, UNIQUE", "E-mail usado no login."],
        ["password_hash", "TEXT", "NOT NULL", "Hash scrypt com salt; não armazena senha em texto puro."],
        ["email_verified", "INTEGER", "NOT NULL, default 0", "Flag de confirmação do e-mail."],
        ["confirmation_token_hash", "TEXT", "Opcional", "Hash do token de confirmação."],
        ["confirmation_expires_at", "TEXT", "Opcional", "Expiração do token ISO 8601."],
        ["created_at", "TEXT", "NOT NULL", "Data de criação ISO 8601."],
    ], [36 * mm, 25 * mm, 40 * mm, 66 * mm], styles))
    story.append(para("3.2. Dicionário de dados: sessions", styles["Subsection"]))
    story.append(table([
        ["Campo", "Tipo", "Restrições", "Finalidade"],
        ["id_hash", "TEXT", "PK", "Hash SHA-256 do token enviado no cookie."],
        ["user_id", "TEXT", "FK users.id, NOT NULL", "Usuário dono da sessão."],
        ["expires_at", "TEXT", "NOT NULL", "Data de expiração da sessão."],
    ], [36 * mm, 25 * mm, 45 * mm, 61 * mm], styles))
    story.append(para("3.3. Dicionário de dados: projects", styles["Subsection"]))
    story.append(table([
        ["Campo", "Tipo", "Restrições", "Finalidade"],
        ["id", "TEXT", "PK", "Identificador UUID do projeto."],
        ["owner_id", "TEXT", "FK users.id, SET NULL", "Usuário que enviou o projeto."],
        ["name", "TEXT", "NOT NULL", "Nome do projeto."],
        ["description", "TEXT", "NOT NULL", "Descrição funcional."],
        ["category", "TEXT", "NOT NULL", "Categoria exibida na biblioteca."],
        ["version", "TEXT", "NOT NULL", "Versão informada pelo autor."],
        ["price", "TEXT", "NOT NULL, default Grátis", "Preço apresentado ao usuário."],
        ["file_name", "TEXT", "Opcional", "Nome original do upload."],
        ["file_path", "TEXT", "Opcional", "Caminho privado no storage."],
        ["file_sha256", "TEXT", "Opcional", "Checksum para integridade."],
        ["scan_status", "TEXT", "NOT NULL, default approved", "Resultado da validação do arquivo."],
        ["created_at", "TEXT", "NOT NULL", "Data de criação ISO 8601."],
    ], [35 * mm, 23 * mm, 44 * mm, 65 * mm], styles))
    story.extend([
        PageBreak(),
        para("3.4. Dicionário de dados: library", styles["Subsection"]),
    ])
    story.append(table([
        ["Campo", "Tipo", "Restrições", "Finalidade"],
        ["user_id", "TEXT", "PK composta, FK users.id", "Usuário que adicionou o projeto."],
        ["project_id", "TEXT", "PK composta, FK projects.id", "Projeto salvo na biblioteca."],
        ["added_at", "TEXT", "NOT NULL", "Data em que a associação foi criada."],
    ], [36 * mm, 38 * mm, 45 * mm, 48 * mm], styles))
    story.extend([
        para("3.5. NoSQL", styles["Subsection"]),
        para("Não há banco NoSQL neste projeto. Consequentemente, não existe dicionário de dados NoSQL a incluir. O armazenamento de arquivos no diretório storage/projects não é um banco de dados: seus metadados e o checksum permanecem no SQLite.", styles["BodySmall"]),
        para("4. APIs, controllers e rotas", styles["Section"]),
        para("As rotas seguem o padrão HTTP e retornam JSON, exceto DELETE, que retorna 204 sem corpo. O middleware requireUser protege biblioteca, criação, atualização e exclusão. O controller de projetos aplica a orientação a objetos nas operações de alteração e remoção, mantendo a dependência do banco no objeto e isolando a regra de autorização.", styles["BodySmall"]),
    ])
    story.append(table([
        ["Método e rota", "Acesso", "Operação e resposta"],
        ["GET /api/health", "Público", "Verifica disponibilidade e retorna { status: ok }."],
        ["POST /api/auth/register", "Público", "Cria usuário, gera confirmação e inicia sessão; retorna 201."],
        ["POST /api/auth/login", "Público", "Valida e-mail, senha e confirmação; cria cookie de sessão."],
        ["POST /api/auth/confirm-email", "Sessão", "Confirma token, expira o token e retorna { ok: true }."],
        ["GET /api/auth/me", "Público", "Retorna o usuário da sessão atual ou null."],
        ["DELETE /api/auth/session", "Sessão opcional", "Remove a sessão no banco e limpa o cookie; retorna 204."],
        ["GET /api/projects", "Público", "Lista projetos aprovados, ordenados por criação."],
        ["GET /api/library", "Autenticado", "Lista os projetos da biblioteca do usuário."],
        ["POST /api/projects", "Autenticado + multipart", "Valida e grava arquivo e metadados; retorna 201."],
        ["PUT /api/projects/:id", "Autenticado + proprietário", "Atualiza nome, descrição, categoria, versão e preço."],
        ["DELETE /api/projects/:id", "Autenticado + proprietário", "Exclui metadados e arquivo privado; retorna 204."],
    ], [48 * mm, 38 * mm, 79 * mm], styles))
    story.extend([
        para("4.1. Cliente de API", styles["Subsection"]),
        para("src/lib/api.ts define ApiUser e ApiProject, centraliza fetch em request<T>, envia credentials: include para cookies e escolhe automaticamente Content-Type JSON, exceto quando o corpo é FormData. As funções registerAccount, loginAccount, confirmEmail, getLibrary, uploadProject, updateProject e deleteProject representam o contrato consumido pelo front-end.", styles["BodySmall"]),
        para("5. Ferramentas e componentes", styles["Section"]),
    ])
    story.append(table([
        ["Ferramenta/componente", "Aplicação no projeto", "Vantagens", "Desvantagens"],
        ["Node.js 24", "Runtime do servidor e módulos nativos.", "Ecossistema amplo, mesmo runtime para front/back e bom suporte a I/O.", "Código assíncrono pode exigir disciplina; versões e módulos nativos precisam ser controlados."],
        ["Express 5", "Rotas, middleware, JSON e servidor HTTP.", "API pequena, flexível e fácil de testar.", "Poucas decisões arquiteturais prontas; segurança e organização ficam sob responsabilidade do time."],
        ["React 19", "Composição da interface e estado visual.", "Componentização, ecossistema maduro e renderização eficiente.", "Pode aumentar a complexidade de estado e dependências em aplicações grandes."],
        ["Vite 8", "Dev server, build e proxy /api.", "Inicialização rápida, HMR e configuração simples.", "É ferramenta de desenvolvimento/build, não substitui um servidor de produção."],
        ["Tailwind CSS 4", "Estilos utilitários e tema global.", "Velocidade e consistência visual por tokens.", "Classes extensas podem dificultar leitura sem convenções."],
        ["SQLite / node:sqlite", "Persistência relacional local.", "Zero servidor externo, transações e arquivo portátil.", "Menor capacidade de concorrência e operação distribuída que PostgreSQL."],
        ["Multer", "Recepção multipart de arquivos.", "Integração direta com Express e limites de upload.", "Arquivo em memória consome RAM e exige validação adicional."],
        ["lucide-react", "Ícones da interface.", "Ícones consistentes e componentes React reutilizáveis.", "Adiciona dependência e pode aumentar o bundle se usado sem cuidado."],
        ["Docker Compose / PostgreSQL 16", "Alternativa documentada para produção.", "Reprodutibilidade e banco robusto para múltiplos usuários.", "Ainda não integra o código atual e exige operação, backup e credenciais."],
        ["TypeScript", "Tipos do cliente HTTP e configuração Vite.", "Detecta incompatibilidades antes da execução.", "Tipagem não impede erros de regra de negócio em runtime."],
        ["GitHub Actions, CodeQL e Wapiti", "CI, análise estática, auditoria e DAST autorizado.", "Automatiza controles e reduz regressões de segurança.", "Resultados dependem de configuração, ambiente autorizado e manutenção."],
    ], [34 * mm, 43 * mm, 45 * mm, 43 * mm], styles))
    story.extend([
        PageBreak(),
        para("6. Componentes e segurança aplicada", styles["Section"]),
        para("Autenticação: senhas são derivadas com scrypt e salt aleatório; tokens de sessão e confirmação são armazenados no banco apenas como hashes. O cookie usa HttpOnly, SameSite=lax e Secure em produção.", styles["BodySmall"]),
        para("Autorização: requireUser impede acesso anônimo e ProjectController consulta owner_id antes de PUT ou DELETE. A biblioteca também filtra pelo user_id da sessão.", styles["BodySmall"]),
        para("Integridade de arquivos: extensão, assinatura, integridade do pacote e caminhos de extração são verificadas; o nome final é sanitizado e o conteúdo recebe checksum SHA-256.", styles["BodySmall"]),
        para("Limitações: não há rate limiting, envio real de e-mail, worker isolado para análise, migrações formais, testes automatizados de integração ou conexão PostgreSQL no caminho atual. Esses pontos estão documentados como evolução necessária para produção.", styles["BodySmall"]),
        para("7. Requisitos atendidos e próximos passos", styles["Section"]),
    ])
    story.append(table([
        ["Requisito", "Evidência no projeto", "Situação"],
        ["Back-end, estrutura e funcionamento", "server/index.mjs, Express, SQLite, sessões, upload e validação.", "Atendido"],
        ["Banco relacional e dicionário de dados", "SQLite com quatro tabelas e dicionário nas seções 3.1 a 3.4.", "Atendido"],
        ["Banco NoSQL e dicionário, se usado", "O projeto não utiliza NoSQL; justificativa registrada na seção 3.5.", "Não aplicável"],
        ["Ferramentas, componentes e APIs", "Seções 4 e 5 descrevem runtime, framework, cliente e APIs HTTP.", "Atendido"],
        ["GET, POST, PUT e DELETE com orientação a objetos", "Rotas listadas; ProjectController implementa PUT e DELETE com autorização.", "Atendido"],
        ["Documentação e análise crítica", "Seção 5 compara vantagens e desvantagens; seção 6 registra limites.", "Atendido"],
        ["Produção", "PostgreSQL, e-mail real, rate limiting, observabilidade e worker ainda são evolução.", "Pendente de infraestrutura"],
    ], [53 * mm, 89 * mm, 23 * mm], styles))
    story.extend([
        para("Para uma implantação de produção, recomenda-se migrar o schema para PostgreSQL, usar migrações versionadas, configurar TLS e secret manager, aplicar rate limiting, executar a análise de arquivos em worker isolado, enviar confirmações por provedor de e-mail e adicionar testes de integração para cada rota CRUD.", styles["BodySmall"]),
        para("8. Validação realizada", styles["Section"]),
        para("Os comandos abaixo foram executados após a implementação das rotas PUT e DELETE:", styles["BodySmall"]),
        para("pnpm exec tsc --noEmit", styles["CodeBlock"]),
        para("Resultado: aprovado.", styles["BodySmall"]),
        para("pnpm build", styles["CodeBlock"]),
        para("Resultado: build Vite concluído com sucesso.", styles["BodySmall"]),
        para("Arquivos principais: server/index.mjs, src/lib/api.ts, vite.config.ts, package.json, docker-compose.yml e docs/gerar-relatorio-projeto.py.", styles["BodySmall"]),
    ])
    document.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build_report()
