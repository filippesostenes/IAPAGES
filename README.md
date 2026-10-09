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

1. Com a chave e a rede configuradas, selecione **OpenAI** na barra superior.
2. Digite: **“Crie uma página para um observatório astronômico, azul-escura, com atividades e chamada para agendar uma visita.”** Os três exemplos iniciais são sugestões; em OpenAI, os tipos de página não ficam limitados a eles.
3. Após a geração, peça: **“Deixe o título maior e adicione uma seção sobre visitas escolares. Preserve o restante.”**
4. Clique em **Imagem**, selecione JPG, PNG ou WebP e peça: **“Use esta imagem no primeiro bloco da página.”** A foto é enviada à OpenAI junto com esse pedido. A miniatura permite substituir ou remover; se a foto já estiver na página, esses controles atualizam só a imagem e criam uma versão que pode ser desfeita.
5. Alterne computador/celular, desfaça uma alteração, recarregue para continuar e clique **Baixar HTML**. As imagens ficam incorporadas ao HTML e não dependem de URLs temporárias.

A demonstração continua disponível sem chave, com os três modelos e comandos locais (título, botão, cor, fundo, seções, tamanho e foto no primeiro bloco). Não edita páginas arbitrárias geradas pela IA. O seletor nunca mistura silenciosamente os provedores.

## Implementação e limites

- `server/provider.mjs`: SDK oficial, **API Responses**, saída JSON estruturada, pedido livre, página atual, últimos 12 itens relevantes da conversa e foto selecionada como `input_image`. `store:false`, sem ferramentas, streaming ou execução de código gerado.
- `server/html.mjs`: exige HTML completo, viewport, CSS responsivo e conteúdo; remove scripts, eventos, formulários, embeds e metadados de redirecionamento. Adiciona CSP que bloqueia scripts e rede na página gerada. Fotos são referenciadas por identificadores no prompt e incorporadas pelo servidor após a validação.
- `server/server.mjs`: rotas específicas, segredo apenas no servidor, limite de corpo, uma geração por vez, intervalo mínimo entre pedidos e proteção contra solicitações de outras origens. Não serve `.env` nem arquivos arbitrários.
- `src/app.js`: troca a prévia somente após receber e validar a resposta completa; falhas deixam a página e a pilha de desfazer intactas. Mensagens diferenciadas para chave ausente/recusada, conexão, timeout, limite/saldo e resposta inválida.
- Preview em iframe `sandbox=""`, sem scripts, acesso à interface principal ou armazenamento. O HTML exportado também bloqueia scripts e recursos remotos.
- Um projeto por navegador/origem, persistido em **IndexedDB** com migração do localStorage da primeira versão. Até 30 versões anteriores; conversa e foto selecionada persistem. Bloqueios/quota de armazenamento são informados. Sem sincronização ou backup na nuvem.
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

Os testes unitários/HTTP verificam Responses, multimodalidade, contexto, sanitização, erros, ausência de chave e proteção contra duplicatas. Os testes de navegador verificam os três modelos e, usando **respostas controladas do SDK**, os fluxos da integração e imagens, recarga, versões, download, responsividade e falhas sem perda da versão anterior. Essas respostas de teste não ficam disponíveis na aplicação.

Na última verificação, o pedido real da oficina foi enviado pelo chat e retornou `401 / invalid_api_key`; o SDK e uma chamada direta à Responses confirmaram a rejeição. A prévia anterior ficou intacta; geração e edição reais ainda não foram concluídas. `test:live` informa o bloqueio e termina com status de erro nessa situação. Quando configurado, verifica geração e edição reais e salva os documentos em `dist/live-*.html`. A configuração de rede atual permite a chamada à API; o bloqueio observado é a rejeição do segredo. Para colocar o aplicativo online, consulte [DEPLOY.md](DEPLOY.md). A configuração Render usa o runtime nativo Node, com os comandos verificados aqui; o Dockerfile é opcional e a imagem não foi validada; o serviço externo só terá endereço após implantação na conta de hospedagem.
