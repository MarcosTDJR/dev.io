# Segurança do dev.io

## Controles implementados

- Cadastro, login, confirmação de e-mail e recuperação de senha usam Supabase Auth; senhas e sessões não são armazenadas pela aplicação.
- Perfis, projetos e biblioteca usam políticas RLS; arquivos e avatares ficam em buckets privados, com políticas por usuário.
- Uploads aceitam qualquer tipo até 100 MB. O sandbox limita prévias a 2 MB, remove scripts e atributos de evento de HTML, executa JavaScript em Web Worker dentro de iframe sem mesma origem e sem acesso de rede declarado na CSP, e exibe outros arquivos de texto sem executá-los.
- Não há análise antivírus. Arquivos enviados não devem ser considerados verificados nem seguros para execução fora do sandbox.
- A aplicação usa somente a chave publishable no frontend. Chaves `service_role`/secret nunca podem ser incluídas no cliente ou no repositório.
- A API Express antiga ainda tem fluxos locais baseados em SQLite e não é usada pela aplicação React atual. Não a exponha como backend ativo sem revisar/migrar seus fluxos.
- O workflow `security.yml` executa CodeQL, auditoria de dependências e build. O workflow `wapiti.yml` roda DAST agendado/manual somente contra o ambiente autorizado definido pelo segredo `DAST_TARGET_URL`.

## Hospedagem e configuração

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, aplique `supabase/migrations/20261122000000_initial.sql` ao projeto e configure as URLs de redirecionamento e provedores de Auth no painel Supabase. A chave publishable é pública por definição; a segurança depende das políticas RLS e de Storage da migração. Não use credenciais de banco nem chaves `service_role` no frontend.

Nunca versione `.env` nem envie segredos para logs. Chaves privilegiadas que tenham sido compartilhadas em canais não confiáveis devem ser rotacionadas no painel Supabase. O backend antigo persiste em SQLite e o PostgreSQL do Compose é apenas uma referência; esses recursos não participam da persistência atual do frontend. Configure backups criptografados e restauração testada no projeto Supabase. Não envie senhas, tokens, cookies ou dados pessoais ao sistema de observabilidade.

## Relato responsável de vulnerabilidades

Não publique detalhes de vulnerabilidades em issues, pull requests ou fóruns públicos. Use o recurso **Report a vulnerability** na aba **Security** deste repositório, se habilitado; caso contrário, contate os mantenedores por um canal privado antes de compartilhar os detalhes.

Inclua uma descrição, impacto, versão/commit afetado, passos mínimos de reprodução e evidência sanitizada. Não inclua credenciais, tokens ativos ou dados de terceiros. Dê aos mantenedores prazo razoável para corrigir e coordenar a divulgação; não acesse, altere ou exfiltre dados além do necessário para demonstrar o problema. Os mantenedores devem confirmar o recebimento em até 3 dias úteis e combinar os próximos passos.

## Atualizações e análise

Revise alertas do Dependabot, auditorias de dependências, releases e avisos CVE/NVD regularmente. Priorize correções de vulnerabilidades exploráveis, registre responsável e prazo e valide cada atualização com CI. Execute Wapiti apenas em staging controlado e autorizado; nunca aponte o DAST para serviços de terceiros.
