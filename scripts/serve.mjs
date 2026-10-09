import {createApp} from '../server/server.mjs';
// The cloud secret has an allowed non-reserved binding. The official SDK sees the requested server-only variable.
if(!process.env.OPENAI_API_KEY&&process.env.IAPAGES_OPENAI_KEY)process.env.OPENAI_API_KEY=process.env.IAPAGES_OPENAI_KEY;
const port=Number(process.env.PORT||3000);
createApp().listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`IAPAGES na porta ${port} · ${process.env.OPENAI_API_KEY?'chave configurada (conexão ainda não validada)':'sem chave · demonstração disponível'}`));
