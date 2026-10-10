import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createProvider} from './provider.mjs';
import {AppError} from './html.mjs';
import {importPage} from './import.mjs';
export function createApp({key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL||'gpt-4.1',provider=createProvider({key,model}),previewToken=process.env.IAPAGES_PREVIEW_TOKEN_V2||'',requirePreviewToken=process.env.IAPAGES_REQUIRE_PRIVATE_PREVIEW==='true'||process.env.RENDER==='true'||process.env.NODE_ENV==='production'||!!process.env.IAPAGES_PREVIEW_TOKEN}={}){
 const sessions=new Map();let inFlight=false,lastStarted=0;
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost'),path=url.pathname;
 if(req.method==='GET'&&path==='/health')return send(res,200,{status:'ok'});
 const accessRequired=requirePreviewToken||!!previewToken;
 const accessHash=previewToken?createHash('sha256').update(previewToken).digest('hex'):null;
 const access=req.headers.cookie?.match(/(?:^|;\s*)iapages_access=([a-f0-9]{64})/)?.[1];
 const authorized=!accessRequired||!!accessHash&&access===accessHash;
 const matchesToken=entered=>!!previewToken&&Buffer.byteLength(entered)===Buffer.byteLength(previewToken)&&timingSafeEqual(Buffer.from(entered),Buffer.from(previewToken));
 const accessCookie=()=>`iapages_access=${accessHash}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`;
 // Existing private links remain usable; the ordinary app and local demo are public.
 if(req.method==='GET'&&path==='/open'){
  if(matchesToken((url.searchParams.get('access')||'').replace(/ /g,'+'))){res.writeHead(303,{'Location':'/','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':accessCookie()});return res.end();}
  res.writeHead(303,{'Location':'/?authorize=1','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});return res.end();
 }
 if(req.method==='GET'&&path==='/api/config'){
 let token=req.headers.cookie?.match(/(?:^|;\s*)iapages_session=([a-f0-9]{48})/)?.[1];
 if(!sessions.has(token)){if(sessions.size>=1000)sessions.delete(sessions.keys().next().value);token=randomBytes(24).toString('hex');sessions.set(token,true);res.setHeader('Set-Cookie',`iapages_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);}
 return send(res,200,{aiAvailable:authorized&&!!key,model:authorized&&key?model:null,csrf:token,accessRequired:!authorized,accessConfigured:!!previewToken});
 }
 if(req.method==='POST'&&path==='/api/access'){
 const session=req.headers.cookie?.match(/(?:^|;\s*)iapages_session=([a-f0-9]{48})/)?.[1];
 if(!session||session!==req.headers['x-iapages-token']||!sessions.has(session))throw new AppError('REQUEST_DENIED','Atualize a ferramenta antes de autorizar o acesso.',403);
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw new AppError('REQUEST_DENIED','Autorize o acesso pela própria ferramenta.',403);
 if(!previewToken)throw new AppError('PREVIEW_NOT_CONFIGURED','O acesso da API ainda não foi configurado no servidor. Você pode testar os modelos em Demonstração.',503);
 if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError('INVALID_REQUEST','Formato de solicitação inválido.',415);
 let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>4096)throw new AppError('TOO_LARGE','O valor de acesso é muito longo.',413);parts.push(chunk);}
 let body;try{body=JSON.parse(Buffer.concat(parts));}catch{throw new AppError('INVALID_REQUEST','Dados de solicitação inválidos.');}
 if(typeof body.access!=='string'||!matchesToken(body.access.trim()))throw new AppError('INVALID_PREVIEW_ACCESS','O código de acesso não confere. Copie o valor de IAPAGES_PREVIEW_TOKEN_V2 em Environment do seu serviço no Render.',403);
 res.setHeader('Set-Cookie',accessCookie());return send(res,200,{authorized:true});
 }
 if(req.method==='POST'&&['/api/generate','/api/import'].includes(path)){
 const importing=path==='/api/import';
 if(!authorized){if(!previewToken)throw new AppError('PREVIEW_NOT_CONFIGURED','O acesso da API ainda não foi configurado no servidor. Você pode testar os modelos em Demonstração.',503);throw new AppError('PRIVATE_PREVIEW','Autorize o acesso no botão Liberar acesso da ferramenta. Os modelos de demonstração funcionam sem autorização.',403);}
 const cookie=req.headers.cookie?.match(/(?:^|;\s*)iapages_session=([a-f0-9]{48})/)?.[1];const token=req.headers['x-iapages-token'];
 if(!cookie||cookie!==token||!sessions.has(cookie))throw new AppError('REQUEST_DENIED','Atualize a ferramenta antes de enviar outro pedido.',403);
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw new AppError('REQUEST_DENIED','A solicitação deve partir da própria ferramenta.',403);
 if(!importing&&!key)throw new AppError('MISSING_KEY','Nenhuma chave configurada no servidor. Cadastre o segredo e reinicie o servidor, ou selecione Demonstração.',503);
 if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError('INVALID_REQUEST','Formato de solicitação inválido.',415);
 if(!importing&&inFlight)throw new AppError('BUSY','Já existe uma geração em andamento. Aguarde a conclusão.',409);
 if(!importing&&Date.now()-lastStarted<1500)throw new AppError('RATE_LIMIT','Aguarde um instante antes de gerar novamente.',429);
 let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>12_000_000)throw new AppError('TOO_LARGE','Este projeto excede o limite de envio de 12 MB.',413);parts.push(chunk);}
 let body;try{body=JSON.parse(Buffer.concat(parts));}catch{throw new AppError('INVALID_REQUEST','Dados de solicitação inválidos.');}
 if(importing)return send(res,200,importPage(body));
 // Reserve after the full request body is read, checking again to prevent concurrent uploads racing.
 if(inFlight)throw new AppError('BUSY','Já existe uma geração em andamento. Aguarde a conclusão.',409);
 inFlight=true;lastStarted=Date.now();const controller=new AbortController();const closed=()=>{if(!res.writableEnded)controller.abort();};res.on('close',closed);
 try{return send(res,200,await provider(body,{signal:controller.signal}));}finally{inFlight=false;res.off('close',closed);}
 }
 if(req.method==='GET'&&(path==='/'||path==='/index.html')){
 const html=await readFile(new URL('../dist/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'self'; frame-src 'self' about:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});return res.end(html);
 }
 return send(res,404,{error:{code:'NOT_FOUND',message:'Recurso não encontrado.'}});
 }catch(error){const safe=error instanceof AppError?error:new AppError('SERVER_ERROR','O servidor não conseguiu concluir a solicitação. Tente novamente.',500);if(!res.writableEnded)send(res,safe.status,{error:{code:safe.code,message:safe.message}});}
 });
}
