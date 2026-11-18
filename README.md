# dev.io
A plataforma dev.io é um hub de desenvolvedores para desenvolvedores, com a proposta de integrar projetos, códigos, scripts, frameworks e demais ferramentas, com a cara de uma rede social comum.

## Segurança e operação

O produto inclui os fluxos de confirmação de e-mail, recuperação de senha, publicação e validação de arquivos. A arquitetura de produção, os controles obrigatórios, o processo de divulgação responsável e a rotina de atualização estão em [SECURITY.md](SECURITY.md).

Para desenvolvimento local, copie `.env.example` para `.env` e gere senhas exclusivas para o PostgreSQL e SMTP. O [docker-compose.yml](docker-compose.yml) demonstra PostgreSQL com usuário dedicado, porta externa alta e rotação de logs. Para produção, prefira uma VPS atualizada, com firewall, TLS, banco em rede privada, backups e segredos fornecidos pelo ambiente ou por um secret manager; nunca use os valores de exemplo em produção.

O CI executa CodeQL, auditoria de dependências e build. O DAST com Wapiti é manual/agendado e exige o segredo `DAST_TARGET_URL` apontando para um ambiente controlado e autorizado.

## Primeiro backend funcional

O projeto agora inclui uma API local em Node.js para o primeiro fluxo multiplataforma:

- `pnpm api` inicia a API em `http://localhost:8787`.
- `pnpm dev:full` inicia frontend e API juntos.
- Cadastro e login usam hash `scrypt` e sessão em cookie `HttpOnly`; contas precisam confirmar o e-mail antes do primeiro login.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM` para enviar confirmação e recuperação de senha. Sem SMTP, o token é disponibilizado apenas em desenvolvimento para testes locais.
- Links de confirmação e recuperação expiram em 30 minutos e são de uso único. A recuperação invalida sessões existentes. Senhas podem ser alteradas nas configurações e o login exige alteração após 365 dias.
- O perfil mostra dados da conta e contagens reais; nome, usuário, e-mail e biografia podem ser editados. Foto JPEG/PNG/WebP de até 2 MB fica em armazenamento privado e só é entregue à sessão autenticada.
- O servidor grava logs JSON de requisições e falhas no envio de e-mail em stdout; configure o ambiente para encaminhá-los ao serviço de observabilidade escolhido sem incluir segredos.
- A biblioteca é persistida em SQLite local (`data/devio.sqlite`).
- Uploads aceitam `.zip` e `.tar.gz`, ficam em armazenamento privado e passam por validação de assinatura e caminhos de extração antes de entrar na biblioteca.

Em produção, configure SMTP e `PUBLIC_APP_URL`, use um secret manager, prefira PostgreSQL gerenciado ou em rede privada na VPS e execute a análise de arquivos em worker isolado.

## Aplicação desktop

O projeto também pode ser executado como aplicação desktop Electron, sem Docker. O processo principal abre uma janela segura, inicia a API local e carrega o build React pelo Express.

Para ativar o login Google, configure o mesmo Client ID OAuth em `VITE_GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_ID`. O backend valida o ID token diretamente com o endpoint oficial do Google antes de criar a sessão local.

```bash
pnpm install
pnpm desktop
```

Para gerar o pacote Linux:

```bash
pnpm desktop:package
```

Os dados locais do desktop ficam no diretório de dados do usuário do Electron. A API de desenvolvimento continua disponível com `pnpm dev:full`; nesse modo, o frontend usa a porta `8443` e a API usa a porta `8787`.
