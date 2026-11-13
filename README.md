# dev.io
A plataforma dev.io é um hub de desenvolvedores para desenvolvedores, com a proposta de integrar projetos, códigos, scripts, frameworks e demais ferramentas, com a cara de uma rede social comum.

## Segurança e operação

O produto inclui os fluxos de confirmação de e-mail, recuperação de senha, publicação e validação de arquivos. A arquitetura de produção, os controles obrigatórios, o processo de divulgação responsável e a rotina de atualização estão em [SECURITY.md](SECURITY.md).

Para desenvolvimento local, copie `.env.example` para `.env` e gere uma senha exclusiva. O [docker-compose.yml](docker-compose.yml) demonstra PostgreSQL com usuário dedicado, porta externa alta e rotação de logs. Nunca use esses valores de exemplo em produção.

O CI executa CodeQL, auditoria de dependências e build. O DAST com Wapiti é manual/agendado e exige o segredo `DAST_TARGET_URL` apontando para um ambiente controlado e autorizado.

## Primeiro backend funcional

O projeto agora inclui uma API local em Node.js para o primeiro fluxo multiplataforma:

- `pnpm api` inicia a API em `http://localhost:8787`.
- `pnpm dev:full` inicia frontend e API juntos.
- Cadastro e login usam hash `scrypt` e sessão em cookie `HttpOnly`.
- A biblioteca é persistida em SQLite local (`data/devio.sqlite`).
- Uploads aceitam `.zip` e `.tar.gz`, ficam em armazenamento privado e passam por validação de assinatura e caminhos de extração antes de entrar na biblioteca.

Em produção, substitua o token de confirmação exposto apenas no modo local por um provedor de e-mail, configure um secret manager, use PostgreSQL gerenciado/VPS e execute a análise de arquivos em worker isolado.

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
