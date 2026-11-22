# dev.io
A plataforma dev.io é um hub de desenvolvedores para desenvolvedores, com a proposta de integrar projetos, códigos, scripts, frameworks e demais ferramentas, com a cara de uma rede social comum.

## Supabase e configuração

Autenticação, perfis, projetos, biblioteca e arquivos da aplicação são persistidos no Supabase. Para iniciar:

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` (a chave publishable pode estar no cliente; a proteção dos dados depende das políticas RLS).
2. Execute o SQL de [20261122000000_initial.sql](supabase/migrations/20261122000000_initial.sql) no SQL Editor do projeto Supabase. Ele cria as tabelas, políticas RLS e buckets privados.
3. Na configuração de Auth do Supabase, habilite confirmação por e-mail, recuperação de senha e inclua a origem local e a origem de produção na lista de URLs de redirecionamento.
4. Se usar Google, configure o provedor Google no Supabase e o Client ID em `VITE_GOOGLE_CLIENT_ID`.

O cliente não usa nem deve receber uma chave `service_role`/secret. Nunca exponha essas chaves no navegador, no `.env.example` ou no repositório. Os valores privilegiados que tenham sido compartilhados fora do painel devem ser rotacionados no Supabase.

Uploads aceitam qualquer tipo de arquivo até 100 MB e ficam em bucket privado. O sandbox baixa apenas arquivos de até 2 MB para prévia: HTML é sanitizado e mostrado sem scripts, JavaScript roda em Web Worker dentro de iframe isolado, CSS é aplicado a uma prévia restrita e outros formatos de texto são somente leitura. Arquivos nativos/binários não são executados. O produto ainda não fornece análise antivírus; não confie no selo de segurança como substituto de uma análise.

O esquema é versionado em `supabase/migrations/`. A aplicação da migração ao projeto remoto requer acesso administrativo ao Supabase e deve ser feita pelo SQL Editor ou por um ambiente de CI com credenciais protegidas; não use a chave publishable para isso.

## Segurança e operação

A arquitetura de produção, os controles obrigatórios, o processo de divulgação responsável e a rotina de atualização estão em [SECURITY.md](SECURITY.md). O CI executa CodeQL, auditoria de dependências e build. O DAST com Wapiti é manual/agendado e exige `DAST_TARGET_URL` apontando para um ambiente controlado e autorizado.

## Aplicação desktop

O projeto também pode ser executado como aplicação desktop Electron, sem Docker. Configure as mesmas variáveis de ambiente do Supabase para o build desktop. A API local antiga ainda existe para compatibilidade, mas não é usada pela aplicação React atual e continua usando SQLite local; não a utilize como origem de dados da aplicação.

```bash
pnpm install
pnpm desktop
```

Para gerar o pacote Linux:

```bash
pnpm desktop:package
```

O shell desktop carrega o frontend compilado e usa Supabase para os dados de conta e projetos.
