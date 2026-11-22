# dev.io
A plataforma dev.io é um hub de desenvolvedores para desenvolvedores, com a proposta de integrar projetos, códigos, scripts, frameworks e demais ferramentas, com a cara de uma rede social comum.

## Supabase e configuração

Autenticação, perfis, projetos, biblioteca e arquivos da aplicação são persistidos no Supabase. Para iniciar:

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` (a chave publishable pode estar no cliente; a proteção dos dados depende das políticas RLS).
2. Execute, em ordem, as migrations [20261122000000_initial.sql](supabase/migrations/20261122000000_initial.sql), [20261122195000_profile_follows.sql](supabase/migrations/20261122195000_profile_follows.sql), [20261122213000_settings_notifications_and_review.sql](supabase/migrations/20261122213000_settings_notifications_and_review.sql) e [20261122214000_payment_checkout.sql](supabase/migrations/20261122214000_payment_checkout.sql) no SQL Editor do projeto Supabase. Elas criam as tabelas, políticas RLS, buckets privados, seguimento, preferências, privacidade, notificações, revisão e pedidos de pagamento.
3. Na configuração de Auth do Supabase, habilite confirmação por e-mail, recuperação de senha e inclua a origem local e a origem de produção na lista de URLs de redirecionamento.
4. Se usar Google, configure o provedor Google no Supabase e o Client ID em `VITE_GOOGLE_CLIENT_ID`.

O cliente não usa nem deve receber uma chave `service_role`/secret. Nunca exponha essas chaves no navegador, no `.env.example` ou no repositório. Os valores privilegiados que tenham sido compartilhados fora do painel devem ser rotacionados no Supabase.

### Deploy na Vercel

O `.env` local não é enviado automaticamente para a Vercel. Em **Project Settings → Environment Variables**, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para Production (e Preview, se necessário) e faça um novo deployment, pois o Vite incorpora esses valores durante o build. Ajuste também **Supabase → Authentication → URL Configuration**: use o domínio de produção como Site URL e inclua os domínios de produção/preview nas Redirect URLs.

`VITE_PUBLIC_APP_URL` deve apontar para o domínio público para gerar links de compartilhamento corretos no APK. `VITE_API_URL` aponta para a API Node pública; a hospedagem estática da Vercel não inicia automaticamente `server/index.mjs`, que precisa estar hospedado como serviço de API e receber `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `WEB_ORIGIN` somente no servidor. Use `pnpm build` com saída em `dist`.

Uploads aceitam qualquer tipo de arquivo até 100 MB e ficam em bucket privado. O sandbox baixa apenas arquivos de até 2 MB para prévia: HTML é sanitizado e mostrado sem scripts, JavaScript roda em Web Worker dentro de iframe isolado, CSS é aplicado a uma prévia restrita e outros formatos de texto são somente leitura. Arquivos nativos/binários não são executados. O produto ainda não fornece análise antivírus; não confie no selo de segurança como substituto de uma análise.

O esquema é versionado em `supabase/migrations/`. A aplicação da migração ao projeto remoto requer acesso administrativo ao Supabase e deve ser feita pelo SQL Editor ou por um ambiente de CI com credenciais protegidas; não use a chave publishable para isso.

## Sandbox público, categorias e pagamentos

O botão de sandbox aparece no detalhe de projetos com arquivo, inclusive para visitantes. A API Node precisa de `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no servidor para emitir links temporários de leitura; a chave secreta nunca é usada no app. Arquivos individuais têm limite de prévia de 2 MB; ZIPs têm limite de 25 MB e 300 arquivos/25 MB descompactados. ZIPs com `index.html`/`app.html` abrem em iframe isolado; `main.py`/`app.py` rodam em Pyodide local. `requirements.txt`, `package.json` e scripts de build não são instalados/executados. Ruby e outros códigos sem runtime embutido ficam em modo de leitura.

Se a tela mostrar que a API não reconhece a rota do sandbox, reinicie o processo Node (`pnpm dev:full` no desenvolvimento); o servidor API não aplica alterações de rota por hot reload. Se a rota responder que a prévia precisa ser configurada, defina as credenciais Supabase no servidor antes de usar a prévia pública.

Categorias e filtros de preço podem ser combinados em **Explorar**. Compras e doações usam o checkout hospedado do Mercado Pago, que apresenta os meios habilitados para cada recebedor (PIX, cartões, boleto e outros). O pagador autoriza no provedor, e o pagamento é criado usando o token OAuth do publicador conectado: o saldo é recebido diretamente na conta Mercado Pago dele, sem passar pela conta da plataforma e sem split do dev.io. Dados de cartão não passam pelo dev.io.

Para configurar: crie uma aplicação Mercado Pago com OAuth e cadastre a URL de retorno exata `https://SUA-API/api/payments/mercadopago/oauth/callback`. Configure no servidor `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET`, `MERCADOPAGO_REDIRECT_URI` (a mesma URL de callback), `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` (chave base64 de 32 bytes), `MERCADOPAGO_WEBHOOK_SECRET`, `PUBLIC_API_URL` (URL HTTPS pública da API) e `PUBLIC_APP_URL` (URL HTTPS do frontend); no frontend, `VITE_API_URL` deve apontar para essa API. Gere a chave de criptografia com `openssl rand -base64 32`; mantenha todos esses segredos apenas no servidor. Configure no painel de integrações o webhook `https://SUA-API/api/payments/webhook`, habilite notificações de pagamentos e use o segredo de assinatura em `MERCADOPAGO_WEBHOOK_SECRET`.

Cada publicador conecta a própria conta em **Configurações → Recebimentos**. Só então o projeto pode iniciar pagamentos para aquela conta. Teste primeiro com contas e credenciais de teste do Mercado Pago. O webhook assinado é validado consultando a API usando a conta recebedora antes da aprovação; compras aprovadas entram na biblioteca. Execute a migration de pagamentos antes de habilitar o checkout.

Perfis públicos são acessíveis pelo link compartilhado e mostram os projetos publicados, estatísticas de seguidores, botão de seguir e opções de apoio nos projetos que aceitam doações. O compartilhamento usa a folha nativa do dispositivo quando disponível e copia o link como alternativa. Configure `VITE_PUBLIC_APP_URL` com a URL pública do site para gerar links compartilháveis corretos no APK; sem ela, o app usa a origem atual.

## Administração

O painel fica em **Configurações → Painel administrativo** e usa a conta normal do Supabase. Submissões novas ficam pendentes até um administrador aprovar ou recusar; a decisão é registrada nas notificações do publicador. Para habilitar um administrador:

1. Configure `SUPABASE_SERVICE_ROLE_KEY` apenas no ambiente do servidor Node. Não use prefixo `VITE_` e nunca publique essa chave.
2. No SQL Editor do Supabase, marque a conta autorizada substituindo o e-mail:

   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where lower(email) = lower('seu-email@exemplo.com');
   ```

3. Saia e entre novamente no app com essa conta para atualizar a sessão. Use o e-mail e a senha já cadastrados no Supabase; o projeto não cria credenciais administrativas padrão.
4. Hospede a API Node e defina `VITE_API_URL` no frontend para habilitar o painel administrativo.

O servidor valida o papel administrativo em cada rota. Bloquear um usuário impede novos logins e operações protegidas por RLS; bloquear uma submissão a oculta da listagem pública. Excluir uma submissão remove seu arquivo e registros da biblioteca; excluir um usuário remove a conta, perfil, submissões, itens da biblioteca e arquivos conhecidos do perfil. Administradores não podem excluir ou bloquear a própria conta nem outros administradores.

## Configurações e notificações

Em **Configurações**, o tema claro/escuro e a redução de movimento são sincronizados com a conta. A privacidade permite tornar o perfil e seus projetos aprovados invisíveis ao público. A tela de notificações lista decisões de análise, novos seguidores e o primeiro download de cada pessoa por projeto; cada categoria pode ser desativada e as notificações podem ser marcadas como lidas. Esses eventos são internos ao app, não notificações push do sistema operacional.

Os textos de Termos de Uso e Política de Privacidade aparecem nas respectivas telas de Configurações. Revise-os com os dados legais e canais de contato da organização responsável antes de tratar o conteúdo como documento jurídico definitivo.

## Aplicativo Android

O app Android usa Capacitor para empacotar a interface web. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` antes do build. Para links compartilháveis no APK, configure `VITE_PUBLIC_APP_URL` com a URL HTTPS pública do site. Para sandbox público e painel administrativo, defina `VITE_API_URL` com a URL HTTPS pública da API Node (ou use o alias `VITE_ADMIN_API_URL`). No servidor, configure `WEB_ORIGIN=https://localhost` para permitir o WebView Android e mantenha `SUPABASE_SERVICE_ROLE_KEY` somente no servidor. Se também houver um frontend web, inclua ambas as origens em `WEB_ORIGIN`, separadas por vírgula.

Adicione `https://localhost` à lista de URLs de redirecionamento do Supabase Auth. Gere um APK de depuração instalável com:

```bash
pnpm install
pnpm android:apk
```

O arquivo será criado em `android/app/build/outputs/apk/debug/app-debug.apk`. Esse APK usa assinatura de debug; para distribuição pública, gere e proteja uma chave de assinatura de release e configure a assinatura no Android.

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
