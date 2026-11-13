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


OUTPUT = "docs/relatorio-seguranca.pdf"


def paragraph(text, style):
    return Paragraph(text, style)


def footer(canvas, document):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(18 * mm, 12 * mm, "dev.io | Relatório de Tópicos de Segurança")
    canvas.drawRightString(192 * mm, 12 * mm, f"Página {document.page}")
    canvas.restoreState()


def build_report():
    document = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title="Relatório de Segurança do dev.io",
        author="dev.io",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=25, leading=30, textColor=colors.HexColor("#172554"),
        alignment=TA_CENTER, spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="CoverSubtitle", parent=styles["Normal"], fontSize=13,
        leading=19, textColor=colors.HexColor("#475569"), alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=16, leading=20, textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=12, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="BodySmall", parent=styles["BodyText"], fontSize=9.3,
        leading=13.5, textColor=colors.HexColor("#1f2937"), spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="TableText", parent=styles["BodyText"], fontSize=7.5,
        leading=10, textColor=colors.HexColor("#1f2937"),
    ))
    styles.add(ParagraphStyle(
        name="TableHeader", parent=styles["BodyText"], fontName="Helvetica-Bold",
        fontSize=7.5, leading=10, textColor=colors.white,
    ))
    styles.add(ParagraphStyle(
        name="CodeBlock", parent=styles["BodyText"], fontName="Courier",
        fontSize=8.5, leading=12, textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"), leftIndent=8, rightIndent=8,
        spaceBefore=3, spaceAfter=8,
    ))

    story = [
        Spacer(1, 35 * mm),
        paragraph("Relatório de Evidências de Segurança", styles["CoverTitle"]),
        paragraph("Projeto interdisciplinar - Tópicos de Segurança", styles["CoverSubtitle"]),
        Spacer(1, 18 * mm),
        paragraph("Projeto: dev.io", styles["CoverSubtitle"]),
        paragraph("Data do relatório: 07/10/2026", styles["CoverSubtitle"]),
        Spacer(1, 30 * mm),
        paragraph(
            "Este documento registra os controles implementados no repositório, os testes executados nesta entrega e as limitações conhecidas. O projeto atual é um protótipo frontend React/Vite; controles de produção que exigem backend, VPS ou credenciais externas são identificados como pendentes.",
            styles["BodySmall"],
        ),
        PageBreak(),
        paragraph("1. Resumo executivo", styles["Section"]),
        paragraph(
            "Foram adicionados fluxos de confirmação de e-mail e recuperação de senha à interface, configuração segura de ambiente para PostgreSQL, uso de porta externa alta, usuário dedicado, logging do container, documentação de reporte responsável e automações de CodeQL, auditoria de dependências, build e DAST com Wapiti.",
            styles["BodySmall"],
        ),
        paragraph(
            "Resultado geral: os artefatos de segurança estão preparados no repositório e as validações locais de TypeScript e build passaram. Não houve implantação em VPS nem execução real de CodeQL, Wapiti, Datadog ou New Relic nesta máquina.",
            styles["BodySmall"],
        ),
        paragraph("2. Matriz de requisitos e evidências", styles["Section"]),
    ]

    matrix = [
        ["Requisito", "Evidência", "Status"],
        ["Hospedagem preferencial em VPS", "Arquitetura/documentação preparada; nenhum VPS foi provisionado ou testado.", "Pendente de infraestrutura"],
        ["Senha não armazenada em plain text", "SECURITY.md exige Argon2id/bcrypt; o repositório é apenas frontend e não possui backend de autenticação.", "Regra documentada; backend pendente"],
        ["E-mail de confirmação", "Fluxo de interface em src/App.tsx e orientação de expiração/uso único em SECURITY.md.", "Implementado no protótipo"],
        ["Esqueci a senha", "Tela de recuperação com resposta genérica para evitar enumeração de contas.", "Implementado no protótipo"],
        ["Alteração periódica de senha", "Política documentada para troca por risco e após suspeita de vazamento.", "Procedimento documentado"],
        ["Porta PostgreSQL acima de 1024", "docker-compose.yml publica ${POSTGRES_PORT:-15432}:5432.", "Configurado"],
        ["Usuário de serviço não padrão", "Variáveis usam POSTGRES_USER=devio_app no .env.example.", "Configurado"],
        ["Senha fora do código", ".env.example documenta variáveis; docker-compose usa env_file e exige .env local.", "Configurado"],
        ["Logs dos serviços", "Compose configura rotação de logs Docker; SECURITY.md exige logs sem segredos e centralização.", "Parcial; produção pendente"],
        ["Análise estática no GitHub Actions", "security.yml executa CodeQL para javascript-typescript.", "Configurado no CI"],
        ["Análise dinâmica", "wapiti.yml executa Wapiti somente contra DAST_TARGET_URL autorizado.", "Configurado; execução pendente"],
        ["Observabilidade", "SECURITY.md define integração recomendada com Datadog ou New Relic.", "Integração pendente"],
        ["Reporte de vulnerabilidades", "SECURITY.md contém canal e procedimento de divulgação responsável.", "Documentado"],
        ["Atualização sobre vulnerabilidades", "SECURITY.md orienta Dependabot, releases, CVEs/NVD e acompanhamento de correções.", "Documentado"],
    ]
    table_data = [[paragraph(cell, styles["TableHeader"] if row == 0 else styles["TableText"]) for cell in row] for row in matrix]
    matrix_table = Table(table_data, colWidths=[47 * mm, 91 * mm, 36 * mm], repeatRows=1)
    matrix_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(matrix_table)
    story.extend([
        PageBreak(),
        paragraph("3. Testes executados", styles["Section"]),
        paragraph("Os comandos abaixo foram executados no workspace durante esta entrega:", styles["BodySmall"]),
        paragraph("pnpm exec tsc --noEmit", styles["CodeBlock"]),
        paragraph("Resultado: aprovado após separar a configuração do produto dos metadados de desenvolvimento.", styles["BodySmall"]),
        paragraph("pnpm build", styles["CodeBlock"]),
        paragraph("Resultado: aprovado; bundle Vite gerado com sucesso.", styles["BodySmall"]),
        paragraph("git diff --check", styles["CodeBlock"]),
        paragraph("Resultado: aprovado; nenhum erro de whitespace no diff.", styles["BodySmall"]),
        paragraph("pnpm exec oxfmt --check", styles["CodeBlock"]),
        paragraph("Resultado: o formatador apontou ajustes em App.tsx; o arquivo foi formatado e os separadores TypeScript necessários foram restaurados. A compilação posterior passou.", styles["BodySmall"]),
        paragraph("4. Arquivos de evidência", styles["Section"]),
        paragraph("• src/App.tsx: telas de confirmação de e-mail e recuperação de senha.<br/>• docker-compose.yml: PostgreSQL, porta externa 15432, usuário por variável e rotação de logs.<br/>• .env.example: contrato de variáveis sem segredo real.<br/>• .github/workflows/security.yml: CodeQL, pnpm audit e build.<br/>• .github/workflows/wapiti.yml: DAST autorizado com Wapiti.<br/>• SECURITY.md: política operacional, reporte e atualização de vulnerabilidades.<br/>• README.md: instruções resumidas de segurança e operação.", styles["BodySmall"]),
        paragraph("5. Limitações e próximos passos", styles["Section"]),
        paragraph("1. Implementar o backend de autenticação com hash Argon2id/bcrypt, sessões seguras, rate limiting, confirmação de e-mail e tokens de recuperação de uso único.<br/>2. Provisionar a aplicação em VPS com firewall, TLS, rede privada, backup criptografado e usuário administrativo separado.<br/>3. Executar o workflow Wapiti contra staging autorizado e anexar o relatório HTML gerado.<br/>4. Configurar Datadog ou New Relic com métricas, logs centralizados, alertas e política de retenção.<br/>5. Validar os workflows no GitHub Actions e registrar os resultados de CodeQL e pnpm audit.", styles["BodySmall"]),
        paragraph("Conclusão", styles["Section"]),
        paragraph("O repositório contém uma base documentada e automatizada para os requisitos de segurança, com validação local aprovada. Os itens classificados como pendentes não podem ser comprovados apenas por um protótipo frontend e exigem serviços reais, credenciais configuradas e execução em ambiente controlado.", styles["BodySmall"]),
    ])
    document.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build_report()