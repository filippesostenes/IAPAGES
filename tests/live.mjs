import {createProvider} from '../server/provider.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
if(!process.env.OPENAI_API_KEY&&process.env.IAPAGES_OPENAI_KEY)process.env.OPENAI_API_KEY=process.env.IAPAGES_OPENAI_KEY;
if(!process.env.OPENAI_API_KEY){console.log('NÃO EXECUTADO: geração real aguarda configuração da chave no servidor.');process.exitCode=1;}else{
 const provider=createProvider();
 try{
 const request='Crie uma landing page para um observatório astronômico fictício. Use azul escuro, três seções e uma chamada para conhecer as atividades. Sem imagens externas.';
 const first=await provider({request,current:null,assets:[],conversation:[]});assert.equal(first.provider,'openai');await mkdir('dist',{recursive:true});await writeFile('dist/live-geracao.html',first.page.html);
 const edit='Troque somente o título principal para: Uma nova perspectiva do universo. Preserve o restante.';
 const second=await provider({request:edit,current:first.page.html,assets:[],conversation:[{role:'user',text:request},{role:'assistant',text:first.message}]});assert.match(second.page.html,/Uma nova perspectiva do universo/);assert.notEqual(second.page.html,first.page.html);await writeFile('dist/live-edicao.html',second.page.html);console.log('PASS: geração e edição reais via Responses. HTMLs validados em dist/live-*.html.');
 }catch(error){console.error(error.code||'LIVE_FAILED',error.code?error.message:'A verificação real falhou; consulte a configuração do servidor.');process.exitCode=1;}
}
