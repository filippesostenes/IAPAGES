# IAPAGES Studio

Criação e edição de páginas estáticas por conversa, com prévia visual isolada, imagens, histórico e exportação. A interface não exige abrir ou editar HTML.

## Abrir e testar

A prévia independente está em `dist/index.html`. Abra o arquivo no navegador para experimentar **Demonstração e envio de imagens** sem instalação. O arquivo independente não chama a OpenAI: a IA precisa do servidor abaixo, na mesma origem da interface.

Com Node.js **24.5 ou superior** (validado em 24.19):

```sh
npm ci
npm run build
npm run dev
```

Abra a porta **3000** no encaminhamento privado de portas do seu ambiente. Se estiver executando na sua máquina, abra a aplicação na porta 3000 pelo navegador local. O servidor também aceita `PORT` e `HOST`. Não há URL pública provisionada por este repositório. O servidor é para teste pessoal em ambiente privado; não o exponha publicamente sem acrescentar controle de acesso.

## Chave segura neste ambiente na nuvem

O segredo **está cadastrado, mas a API o recusou com `401 / invalid_api_key` na última verificação** e não deve ser colocada na conversa nem em qualquer arquivo do frontend.

1. Abra **Configurações do ambiente** e substitua o valor no requisito de segredo **`IAPAGES_OPENAI_KEY`**, com destino HTTPS **`api.openai.com`**. O requisito e a liberação de rede já existem. Não é necessário duplicar o segredo.
2. Revise e salve a configuração e publique o ambiente para aplicá-la. Reinicie o servidor para receber o segredo atualizado.
3. `scripts/serve.mjs` associa a variável injetada a **`OPENAI_API_KEY` somente dentro do processo Node**. O SDK recebe essa variável; ela nunca é enviada ao navegador.

O nome alternativo no cadastro é necessário porque a plataforma reserva variáveis com prefixo `OPENAI_`. O servidor aceita diretamente `OPENAI_API_KEY` em um host que permita esse nome. O comando `npm run dev` ativa o suporte ao proxy do ambiente; não desabilite TLS nem extraia credenciais do proxy.

No servidor, `/api/config` informa apenas disponibilidade da configuração e modelo; **chave configurada não significa conexão validada**. A interface só mostra “IA conectada” após uma geração real bem-sucedida. Sem chave, selecionar OpenAI mostra um erro de configuração, sem substituir o resultado por uma resposta simulada.

## Executar fora deste ambiente

Configuração mínima: Node 24.5+, processo Node em execução, HTTPS de saída para `api.openai.com`, `OPENAI_API_KEY` como segredo de runtime e acesso privado à porta do aplicativo. Um host que sirva apenas arquivos estáticos não consegue executar esta integração.

Para desenvolvimento local, se ainda não houver `.env`, copie `.env.example` para `.env`, restrinja a leitura com `chmod 600 .env` e preencha **`OPENAI_API_KEY` usando seu editor local no servidor**. O arquivo é ignorado pelo Git, carregado só pelo processo Node e nunca servido por HTTP. Em hospedagem, prefira o gerenciador de segredos do provedor. `OPENAI_MODEL` é opcional; o padrão é `gpt-4.1`, que deve estar disponível para a sua conta. Não coloque a chave em `dist/`, `src/`, URLs ou localStorage.

## Teste de uso

1. Na página inicial, descreva sua ideia e clique **Criar minha página**. Isso abre um projeto no editor, sem chamar a API. Com a chave e a rede configuradas, selecione **OpenAI** no editor e clique **Gerar página** para enviar seu pedido.
2. Digite: **“Crie uma página para um observatório astronômico, azul-escura, com atividades e chamada para agendar uma visita.”** Os três exemplos iniciais são sugestões; em OpenAI, os tipos de página não ficam limitados a eles.
3. Após a geração, peça: **“Deixe o título maior e adicione uma seção sobre visitas escolares. Preserve o restante.”**
4. Clique em **Imagem**, selecione JPG, PNG ou WebP e peça: **“Use esta imagem no primeiro bloco da página.”** A foto é enviada à OpenAI junto com esse pedido. A miniatura permite substituir ou remover; se a foto já estiver na página, esses controles atualizam só a imagem e criam uma versão que pode ser desfeita.
5. Alterne computador/celular, desfaça uma alteração, recarregue para continuar e clique **Baixar HTML**. As imagens ficam incorporadas ao HTML e não dependem de URLs temporárias.

A demonstração continua disponível sem chave, com os três modelos e comandos locais (título, botão, cor, fundo, seções, tamanho e foto no primeiro bloco). Não edita páginas arbitrárias geradas pela IA. O seletor nunca mistura silenciosamente os provedores.

## Criar aqui no Codex, sem usar a API

A assinatura ChatGPT/Codex não é um saldo de API e não pode ser usada pelo botão de geração deste aplicativo. Para trabalhar nesta conversa e guardar o resultado no IAPAGES:

1. Peça a página ou a alteração na conversa com o Codex. O resultado é um HTML pronto, sem precisar editar código.
2. No aplicativo, clique **Importar página**, selecione o HTML e escolha **Abrir como novo projeto**. A validação ocorre no servidor, sem chamar a OpenAI; funciona mesmo sem chave ou saldo da API.
3. Para uma alteração feita nesta conversa, importe o HTML novo e escolha **Atualizar projeto atual**. Isso preserva o histórico para desfazer. Para retomar um arquivo que esta conversa não conhece, use **Baixar HTML** e anexe-o ao pedido aqui.
4. Fotos incorporadas em JPG/PNG/WebP continuam na prévia e no download. HTML completo de até 10 MB, no máximo seis fotos dentro dos limites já descritos; scripts e recursos ativos são removidos, e a prévia permanece isolada.

As páginas importadas são identificadas como **Arquivo importado**, nunca como resultado da API. O modo **Sem API** explica que pedidos livres precisam ser feitos nesta conversa; o chat interno não está conectado ao Codex. Selecionar **OpenAI** permite editar o arquivo pela API quando houver chave e saldo válidos. A importação preserva a última versão se a validação falhar.

`examples/oficina-codex.html` é a primeira página criada aqui para esse fluxo: oficina fictícia, preto e laranja, serviços, orçamento e layout responsivo, sem imagens externas ou JavaScript. Ela não foi gerada pela API da OpenAI.

## Implementação e limites

- `server/provider.mjs`: SDK oficial, **API Responses**, saída JSON estruturada, pedido livre, página atual, últimos 12 itens relevantes da conversa e foto selecionada como `input_image`. `store:false`, sem ferramentas, streaming ou execução de código gerado.
- `server/html.mjs`: exige HTML completo, viewport, CSS responsivo e conteúdo; remove scripts, eventos, formulários, embeds e metadados de redirecionamento. Adiciona CSP que bloqueia scripts e rede na página gerada. Fotos são referenciadas por identificadores no prompt e incorporadas pelo servidor após a validação.
- `server/server.mjs`: rotas específicas, segredo apenas no servidor, limite de corpo, uma geração por vez, intervalo mínimo entre pedidos e proteção contra solicitações de outras origens. Não serve `.env` nem arquivos arbitrários.
- `server/import.mjs`: valida e sanitiza páginas recebidas por `/api/import`, com a mesma sessão/origem e acesso privado da ferramenta. Importar não depende da chave OpenAI e nunca chama o provedor de IA.
- `src/app.js`: troca a prévia somente após receber e validar a resposta completa; falhas deixam a página e a pilha de desfazer intactas. Mensagens diferenciadas para chave ausente/recusada, conexão, timeout, limite/saldo e resposta inválida.
- Preview em iframe `sandbox=""`, sem scripts, acesso à interface principal ou armazenamento. O HTML exportado também bloqueia scripts e recursos remotos.
- Página inicial e **Meus projetos** com miniaturas isoladas, busca, ordenação, renomeação e exclusão com confirmação. **Novo projeto** guarda o anterior e abre outro, sem substituí-lo. Cada projeto preserva sua página, conversa, foto, modo, visualização e até 30 versões anteriores.
- Biblioteca persistida em **IndexedDB**, com migração do projeto único anterior e fallback para localStorage. `src/projects.js` separa o adaptador local (`load`/`save`) da interface, permitindo adicionar armazenamento por conta no futuro. Projetos ficam restritos ao mesmo navegador e endereço; limpar os dados do navegador os remove. Bloqueios/quota de armazenamento são informados e uma renomeação/exclusão que não for salva é revertida na interface. Não há sincronização ou backup na nuvem.
- JPG/PNG/WebP de até 10 MB na entrada, otimizados para até 1600 pixels e aproximadamente 1 MB. Até seis fotos na página; a imagem original não é guardada em um servidor de arquivos. O corpo de requisição tem limite de 12 MB.
- HTML/CSS estático. CTAs, imagens e âncoras funcionam; funções que exigem JavaScript, backend, pagamentos ou login não são geradas. Informações inventadas devem ser identificadas como exemplos. A verificação de integridade não garante fidelidade perfeita ao pedido ou preservação visual pelo modelo; é possível desfazer e refinar.

## Verificação

```sh
npm test
# Chromium em /usr/bin/chromium; os testes iniciam servidores isolados sem chave real:
npm run test:browser
# depois de configurar uma chave válida (faz duas chamadas reais, sujeitas ao uso da conta):
npm run test:live
```

Os testes unitários/HTTP verificam Responses, multimodalidade, contexto, sanitização, erros, ausência de chave, proteção contra duplicatas e migração da biblioteca. Os testes de navegador verificam os três modelos e, usando **respostas controladas do SDK**, os fluxos da integração e imagens, recarga, versões, download, responsividade e falhas sem perda da versão anterior. Também verificam dois projetos independentes, fotos e conversas separadas, retomada, renomeação, busca/ordenação, exclusão confirmada, falha de armazenamento e miniaturas em sandbox. Essas respostas de teste não ficam disponíveis na aplicação.

Na verificação real anterior neste ambiente, o pedido da oficina retornou `401 / invalid_api_key`. Após atualizar a configuração no Render, o usuário conseguiu abrir o aplicativo online e relatou uma resposta de limite de uso/saldo da OpenAI. Isso não confirma uma geração concluída. Esta etapa da página inicial não realiza chamadas reais à API: os testes usam demonstração e respostas controladas. `test:live` verifica geração e edição reais quando houver uma chave e saldo válidos e salva os documentos em `dist/live-*.html`; erros terminam com status de falha. Para implantar ou atualizar o aplicativo, consulte [DEPLOY.md](DEPLOY.md). A configuração Render usa o runtime nativo Node, com os comandos verificados aqui; o Dockerfile é opcional e a imagem não foi validada.

## Contas e planos em uma próxima etapa

Não há login, contas, pagamentos ou créditos por usuário nesta versão. A identificação local de um projeto não representa autorização de acesso. Para oferecer planos a clientes, a próxima etapa exige autenticação no servidor, banco de dados com projetos e versões associados ao usuário, verificação de propriedade em cada operação, medição e limites de uso no servidor e pagamentos com webhooks verificados. O adaptador local é um ponto de extensão; não substitui essas proteções. A página inicial indica o salvamento local e não apresenta um login simulado.

## Atualização do acesso privado

O Blueprint agora gera `IAPAGES_PREVIEW_TOKEN_V2`; a variável antiga `IAPAGES_PREVIEW_TOKEN` foi descontinuada e não permite entrar. Sincronize o Blueprint e aguarde o redeploy para obter o novo valor em Environment do Render. Em produção, ausência do token novo bloqueia interface e API. A chave OpenAI continua exigindo revogação/substituição pela conta proprietária; nenhuma chave é criada ou revogada por essa migração.
