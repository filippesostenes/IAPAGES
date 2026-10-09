import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createProvider} from './provider.mjs';
import {AppError} from './html.mjs';
export function createApp({key=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL||'gpt-4.1',provider=createProvider({key,model}),previewToken=process.env.IAPAGES_PREVIEW_TOKEN_V2||'',requirePreviewToken=process.env.IAPAGES_REQUIRE_PRIVATE_PREVIEW==='true'||process.env.RENDER==='true'||process.env.NODE_ENV==='production'||!!process.env.IAPAGES_PREVIEW_TOKEN}={}){
 const sessions=new Map();let inFlight=false,lastStarted=0;
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost'),path=url.pathname;
 if(req.method==='GET'&&path==='/health')return send(res,200,{status:'ok'});
 if(requirePreviewToken&&!previewToken)throw new AppError('PREVIEW_NOT_CONFIGURED','Acesso temporariamente bloqueado. Aplique o Blueprint para gerar IAPAGES_PREVIEW_TOKEN_V2 e reinicie o serviço.',503);
 if(previewToken){
 const accessHash=createHash('sha256').update(previewToken).digest('hex');
 // Render-generated values can contain '+': query parsing turns it into a space.
 const entered=(url.searchParams.get('access')||'').replace(/ /g,'+');
 const matches=Buffer.byteLength(entered)===Buffer.byteLength(previewToken)&&timingSafeEqual(Buffer.from(entered),Buffer.from(previewToken));
 if(req.method==='GET'&&path==='/open'&&matches){res.writeHead(303,{'Location':'/','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':`iapages_access=${accessHash}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`});return res.end();}
 const access=req.headers.cookie?.match(/(?:^|;\s*)iapages_access=([a-f0-9]{64})/)?.[1];
 if(access!==accessHash)throw new AppError('PRIVATE_PREVIEW','Prévia privada. Abra o link de acesso fornecido para você.',403);
 }
 if(req.method==='GET'&&path==='/api/config'){
 let token=req.headers.cookie?.match(/(?:^|;\s*)iapages_session=([a-f0-9]{48})/)?.[1];
 if(!sessions.has(token)){if(sessions.size>=1000)sessions.delete(sessions.keys().next().value);token=randomBytes(24).toString('hex');sessions.set(token,true);res.setHeader('Set-Cookie',`iapages_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);}
 return send(res,200,{aiAvailable:!!key,model:key?model:null,csrf:token});
 }
 if(req.method==='POST'&&path==='/api/generate'){
 const cookie=req.headers.cookie?.match(/(?:^|;\s*)iapages_session=([a-f0-9]{48})/)?.[1];const token=req.headers['x-iapages-token'];
 if(!cookie||cookie!==token||!sessions.has(cookie))throw new AppError('REQUEST_DENIED','Atualize a ferramenta antes de enviar outro pedido.',403);
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw new AppError('REQUEST_DENIED','A solicitação deve partir da própria ferramenta.',403);
 if(!key)throw new AppError('MISSING_KEY','Nenhuma chave configurada no servidor. Cadastre o segredo e reinicie o servidor, ou selecione Demonstração.',503);
 if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError('INVALID_REQUEST','Formato de solicitação inválido.',415);
 if(inFlight)throw new AppError('BUSY','Já existe uma geração em andamento. Aguarde a conclusão.',409);
 if(Date.now()-lastStarted<1500)throw new AppError('RATE_LIMIT','Aguarde um instante antes de gerar novamente.',429);
 let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>12_000_000)throw new AppError('TOO_LARGE','Este projeto excede o limite de envio de 12 MB.',413);parts.push(chunk);}
 let body;try{body=JSON.parse(Buffer.concat(parts));}catch{throw new AppError('INVALID_REQUEST','Dados de solicitação inválidos.');}
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
