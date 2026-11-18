# Segurança do dev.io

## Controles implementados

- Cadastro armazena somente hashes de senha com `scrypt`; o login compara os hashes em tempo constante, aceita senhas de 8 a 128 caracteres e exige confirmação do e-mail.
- Confirmação de e-mail e recuperação de senha usam tokens aleatórios de uso único, armazenados como hashes e expirados em 30 minutos. Configure SMTP para entregar os links.
- A recuperação de senha invalida sessões existentes. A troca autenticada exige a senha atual; após 365 dias, o login pede a alteração da senha.
- O perfil permite editar os dados da conta; mudar e-mail invalida a confirmação anterior e requer nova verificação. Fotos aceitam apenas JPEG/PNG/WebP até 2 MB, são validadas por assinatura e ficam privadas, servidas somente à sessão autenticada.
- Sessões usam cookies `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- O servidor emite logs JSON de método, caminho, status e duração da requisição, sem registrar corpo, senha, cookie ou query string. Erros de envio de e-mail são registrados sem incluir conteúdo da mensagem.
- O workflow `security.yml` executa CodeQL, auditoria de dependências e build. O workflow `wapiti.yml` roda DAST agendado/manual somente contra o ambiente autorizado definido pelo segredo `DAST_TARGET_URL`.

## Hospedagem e configuração

Prefira uma VPS mantida e atualizada, com firewall permitindo apenas as portas necessárias, TLS por proxy reverso e banco de dados em rede privada. O `docker-compose.yml` demonstra PostgreSQL com usuário dedicado, porta publicada alta (`15432`) e rotação de logs; não exponha a porta do banco à Internet.

Copie `.env.example` para `.env` em desenvolvimento e gere segredos exclusivos. Em produção, use o secret manager do provedor, não valores do exemplo. Configure `PUBLIC_APP_URL` com a origem HTTPS pública e SMTP por `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM`. Sem SMTP, os tokens de teste são retornados somente fora de produção. Nunca versione `.env` nem envie segredos para logs.

O backend atual persiste os dados em SQLite; o PostgreSQL do Compose é uma configuração de referência e ainda não é usado pela API. Antes de operar multiusuário em uma VPS, migre o backend para PostgreSQL gerenciado ou privado e configure backups criptografados com restauração testada. A integração de Datadog/New Relic também depende da configuração de implantação: encaminhe stdout/stderr e logs do PostgreSQL/proxy, com alertas para erros, latência e indisponibilidade, retenção definida e acesso de menor privilégio. Não envie senhas, tokens, cookies ou dados pessoais ao sistema de observabilidade.

## Relato responsável de vulnerabilidades

Não publique detalhes de vulnerabilidades em issues, pull requests ou fóruns públicos. Use o recurso **Report a vulnerability** na aba **Security** deste repositório, se habilitado; caso contrário, contate os mantenedores por um canal privado antes de compartilhar os detalhes.

Inclua uma descrição, impacto, versão/commit afetado, passos mínimos de reprodução e evidência sanitizada. Não inclua credenciais, tokens ativos ou dados de terceiros. Dê aos mantenedores prazo razoável para corrigir e coordenar a divulgação; não acesse, altere ou exfiltre dados além do necessário para demonstrar o problema. Os mantenedores devem confirmar o recebimento em até 3 dias úteis e combinar os próximos passos.

## Atualizações e análise

Revise alertas do Dependabot, auditorias de dependências, releases e avisos CVE/NVD regularmente. Priorize correções de vulnerabilidades exploráveis, registre responsável e prazo e valide cada atualização com CI. Execute Wapiti apenas em staging controlado e autorizado; nunca aponte o DAST para serviços de terceiros.
