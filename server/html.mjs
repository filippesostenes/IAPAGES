import sanitizeHtml from 'sanitize-html';
export class AppError extends Error {constructor(code,message,status=400){super(message);this.code=code;this.status=status;}}
export const PAGE_CSP="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";
const validImage=/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export function validateAsset(asset){
 if(!asset||typeof asset.id!=='string'||!/^asset-[a-zA-Z0-9-]{1,60}$/.test(asset.id)||typeof asset.dataUrl!=='string'||asset.dataUrl.length>1_600_000||!validImage.test(asset.dataUrl))throw new AppError('INVALID_IMAGE','Envie uma imagem JPG, PNG ou WebP de até 1 MB após otimização.');
 const bytes=Buffer.from(asset.dataUrl.split(',')[1],'base64'),mime=asset.dataUrl.match(/^data:([^;]+)/)[1];
 if(bytes.length>1_000_000)throw new AppError('INVALID_IMAGE','A imagem otimizada excede o limite de 1 MB.');
 const isPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const isJpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const isWebp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!((mime==='image/png'&&isPng)||(mime==='image/jpeg'&&isJpeg)||(mime==='image/webp'&&isWebp)))throw new AppError('INVALID_IMAGE','O arquivo não contém uma imagem válida.');
 return {id:asset.id,dataUrl:asset.dataUrl,name:typeof asset.name==='string'?asset.name.slice(0,120):'Imagem enviada'};
}
export function sanitizePage(input,assets=[]){
 if(typeof input!=='string'||input.length>350_000||!/^\s*<!doctype html>/i.test(input)||!/<html\b/i.test(input)||!/<head\b/i.test(input)||!/<body\b/i.test(input)||!/<\/html>\s*$/i.test(input)||!/<style\b/i.test(input)||!/@media\b/i.test(input)||!/<meta[^>]+name=["']viewport["']/i.test(input))throw new AppError('INVALID_RESPONSE','A resposta não trouxe uma página HTML completa e responsiva. Tente novamente.',502);
 let html=sanitizeHtml(input,{allowedTags:['html','head','body','title','style','meta','header','main','footer','section','article','aside','nav','div','span','p','h1','h2','h3','h4','h5','h6','a','img','picture','figure','figcaption','ul','ol','li','strong','em','b','i','small','br','hr','blockquote','cite','address','details','summary','table','thead','tbody','tr','th','td','button'],allowedAttributes:{'*':['id','class','style','aria-label','aria-hidden','role','lang'],meta:['name','content','charset'],a:['href','title'],img:['src','alt','width','height','loading','data-asset-id'],button:['type','aria-label']},allowedSchemes:['https','mailto','tel'],allowedSchemesByTag:{img:['iapages-asset','data']},allowProtocolRelative:false,allowVulnerableTags:true,parseStyleAttributes:false,transformTags:{meta:(tag,attrs)=>{if(attrs.charset)return {tagName:'meta',attribs:{charset:'utf-8'}};return ['viewport','description'].includes(attrs.name)?{tagName:'meta',attribs:attrs}:{tagName:'span',attribs:{}};},img:(tag,attrs)=>{const match=attrs.src?.match(/^iapages-asset:\/\/(asset-[a-zA-Z0-9-]+)$/);if(match){const asset=assets.find(a=>a.id===match[1]);if(!asset)throw new AppError('INVALID_RESPONSE','A página tentou usar uma imagem que não está disponível. Tente novamente.',502);attrs.src=asset.dataUrl;attrs['data-asset-id']=asset.id;}else{delete attrs.src;delete attrs['data-asset-id'];}return {tagName:tag,attribs:attrs};}}});
 if(!/<h[12]\b/i.test(html)||!/<body[^>]*>[\s\S]*\S[\s\S]*<\/body>/i.test(html))throw new AppError('INVALID_RESPONSE','O conteúdo recebido está vazio ou inválido. Sua versão anterior foi mantida.',502);
 if(/iapages-asset:/i.test(html))throw new AppError('INVALID_RESPONSE','A referência da imagem recebida é inválida. Tente novamente.',502);
 html=html.replace(/<head([^>]*)>/i,`<head$1><meta http-equiv="Content-Security-Policy" content="${PAGE_CSP}">`);
 html=html.replace(/<\/head>/i,'<style>img{max-width:100%;height:auto}*,*::before,*::after{box-sizing:border-box}html,body{overflow-wrap:anywhere}</style></head>');
 return '<!doctype html>\n'+html;
}
export function tokenizeImages(html,assets){let result=html;for(const asset of assets)result=result.replaceAll(asset.dataUrl,`iapages-asset://${asset.id}`);if(result.length>350_000)throw new AppError('PAGE_TOO_LARGE','A página é muito grande para editar. Comece um novo projeto.');return result;}
