# Segurança do dev.io

## Estado atual

Este repositório contém o protótipo frontend. Login, confirmação de e-mail e recuperação de senha são fluxos de interface; a implementação real deve ser feita por um backend antes de produção. O backend deve armazenar somente hashes de senha com Argon2id ou bcrypt, aplicar limitação de tentativas, sessões com cookies `HttpOnly`, `Secure` e `SameSite`, e invalidar tokens de recuperação após o uso.

## Controles obrigatórios de produção

- Exigir confirmação de e-mail antes de liberar a conta.
- Expirar links de confirmação e recuperação em até 30 minutos, com uso único.
- Forçar troca de senha conforme a política de risco da organização e imediatamente após suspeita de vazamento.
- Guardar segredos em um secret manager ou variáveis de ambiente; nunca no código, no histórico Git ou em imagens Docker.
- Executar o banco em rede privada. O Compose usa a porta externa `15432` como exemplo de porta alta e o usuário `devio_app`, mas firewall e VPN continuam obrigatórios.
- Ativar logs de autenticação, banco, proxy e filas; remover tokens, senhas e dados pessoais dos logs. Encaminhar logs para armazenamento central com retenção definida.
- Manter backups criptografados, testar restauração e aplicar atualizações de segurança com prioridade.

## Relato responsável

Não abra uma issue pública para vulnerabilidades. Envie um relato privado aos mantenedores com descrição, impacto, passos mínimos para reprodução, versão/commit afetado e evidência sem dados pessoais. Não inclua credenciais ou dados de terceiros. O time deve confirmar o recebimento em até 3 dias úteis, avaliar a correção e combinar divulgação coordenada.

## Atualizações e monitoramento

O workflow `security.yml` executa CodeQL, auditoria de dependências e build. O workflow `wapiti.yml` só deve apontar para staging autorizado, configurado pelo segredo `DAST_TARGET_URL`; nunca use alvos de terceiros. Em produção, integrar logs, métricas de erro, latência, disponibilidade e alertas em Datadog ou New Relic, com acesso por menor privilégio e sem enviar segredos.

Consulte regularmente os avisos do GitHub Dependabot, os releases das dependências e os CVEs/NVD. Registre responsável, prazo e evidência de correção para cada alerta.