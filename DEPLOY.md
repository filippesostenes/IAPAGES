# Colocar o IAPAGES online

O ambiente desta conversa consegue executar Node, mas não fornece URL pública ou ferramenta de implantação. Links para `/tmp/*.html` são arquivos e não conectam à API. A última verificação do segredo neste ambiente retornou `401 / invalid_api_key`; posteriormente o usuário relatou limite/saldo no Render. Esta mudança visual não faz chamadas reais nem altera credenciais.

## Atualizar o serviço existente

O serviço do usuário já existe: **iapages-studio-vbf2**. Esta atualização de interface não exige nova chave, token ou Blueprint.

1. Abra https://dashboard.render.com/web/srv-db4i1sks728c73fcihg0.
2. Clique **Manual Deploy → Deploy latest commit**.
3. Aguarde **Live**. Abra https://iapages-studio-vbf2.onrender.com no navegador que já foi autorizado e recarregue a página.
4. Confira o fundo branco e **Meu perfil**. Clique **Criar página → formato → Me ajude com perguntas**. Selecione **Demonstração** para testar sem saldo da API; para geração livre pela OpenAI, é necessário saldo válido da API.

O envio para GitHub não confirma uma implantação concluída. Esta conversa não tem acesso ao painel administrativo do Render para acionar ou verificar o deploy. Se a autorização do navegador expirar, use o link privado atual guardado por você; não compartilhe tokens no chat.

## Corrigir a chave no ambiente atual

Em **Configurações do ambiente**, abra o segredo **IAPAGES_OPENAI_KEY**, destinado a **api.openai.com**, substitua o valor por uma chave válida da API, salve/aplique as alterações e reinicie o servidor. Não publique ou cole a chave na conversa. Para criar uma chave na plataforma OpenAI, abra `https://platform.openai.com/api-keys`, selecione seu projeto e clique **Create new secret key**. A chave precisa permitir **Responses**, ter acesso ao modelo e créditos de API disponíveis. A assinatura ChatGPT não substitui créditos de API.

## Criar uma nova implantação com Render (apenas se ainda não existir)

render.yaml está preparado para o runtime nativo Node, usando os mesmos comandos de instalação, build e inicialização verificados neste ambiente. Há também um Dockerfile opcional; a imagem Docker não foi validada aqui. O código precisa estar no repositório GitHub `filippesostenes/IAPAGES` (branch main), e sua conta precisa autorizar Render a ler esse repositório. Não inclua .env, node_modules ou arquivos com segredos. O diretório do projeto contém fontes e lockfile completos; o build gera o HTML na hospedagem.

1. Abra **https://dashboard.render.com** e entre na sua conta.
2. Clique **New + → Blueprint** e conecte o repositório **filippesostenes/IAPAGES**, branch **main**. (Se a conta ainda não estiver conectada, clique para conectar o GitHub e autorize esse repositório.)
3. Na configuração pedida por `render.yaml`, preencha **OPENAI_API_KEY** secretamente com uma chave válida. Nesse host o nome OPENAI_API_KEY é permitido diretamente.
4. Clique **Apply**. Aguarde o serviço aparecer como **Live**. O endereço HTTPS real é mostrado na página do serviço; ele não existe antes da implantação.
5. No serviço, abra **Environment**. Veja o valor gerado de **IAPAGES_PREVIEW_TOKEN_V2** e abra no navegador o endereço do serviço com **/open?access=VALOR_DO_TOKEN**. Isso libera a prévia pessoal sem cadastro ou tela de login. Guarde esse link para seu uso; ele dá acesso ao aplicativo e ao uso da API. A chave OpenAI não faz parte do link.
6. Na ferramenta, selecione **OpenAI** se necessário. Envie **Crie uma página para uma oficina mecânica, com fundo preto, detalhes laranja, serviços e botão de orçamento**. Após terminar, envie **Altere o título para “Sua oficina de confiança” e preserve o restante**.

O plano gratuito pode suspender o processo após inatividade. O primeiro acesso após a suspensão pode demorar. O projeto é salvo no navegador por origem: um endereço novo não terá o histórico guardado em outro endereço. A rota `/health` serve para verificação de infraestrutura e não revela configuração nem permite gerações. Em uma implantação pública, mantenha IAPAGES_PREVIEW_TOKEN_V2 configurado.

Para atualizar os fontes de um checkout Git existente após revisar o projeto, faça commit dos arquivos do aplicativo e envie a branch main para o repositório. Nunca inclua .env ou valores de segredo. O arquivo .dockerignore também impede .env de entrar na imagem.

## Troca do token de acesso

A configuração atual pede ao Render que gere uma variável nova, IAPAGES_PREVIEW_TOKEN_V2. O servidor não aceita mais a variável antiga IAPAGES_PREVIEW_TOKEN nem cookies de acesso derivados dela. Após a sincronização do Blueprint e o redeploy, copie o valor NOVO em Environment. Se a sincronização automática não ocorrer, abra Blueprints, selecione Filippesosteness e clique Manual sync, depois aguarde a implantação no serviço iapages-studio-vbf2. Quando a nova variável estiver ausente, uma implantação pública fica bloqueada em vez de liberar o aplicativo. Apenas /health continua acessível para a infraestrutura.

A revogação de uma chave OpenAI exposta deve ser feita pelo proprietário na plataforma OpenAI. Esta alteração não revoga nem substitui OPENAI_API_KEY. Crie uma chave nova e atualize esse campo em Environment do Render, usando a opção de salvar e implantar. Não compartilhe seus valores no chat nem em capturas.
