import {AppError,sanitizePage,tokenizeImages,validateAsset} from './html.mjs';
export function importPage(body){
 if(!body||typeof body.html!=='string'||body.html.length>10_000_000||typeof body.name!=='string'||!body.name.trim()||body.name.length>120||!Array.isArray(body.assets)||body.assets.length>6)throw new AppError('INVALID_IMPORT','Escolha uma página HTML completa de até 10 MB, com no máximo seis imagens.');
 const assets=body.assets.map(validateAsset);if(new Set(assets.map(a=>a.id)).size!==assets.length)throw new AppError('INVALID_IMPORT','O arquivo contém imagens com identificadores repetidos.');
 let html;try{html=sanitizePage(tokenizeImages(body.html,assets),assets);}catch{throw new AppError('INVALID_IMPORT','O arquivo precisa conter uma página HTML completa, com título, CSS e layout responsivo. A versão anterior foi preservada.');}
 return {provider:'import',page:{kind:'imported',name:body.name.trim(),html},message:'Página importada e validada. Nenhuma chamada à API foi feita.'};
}
