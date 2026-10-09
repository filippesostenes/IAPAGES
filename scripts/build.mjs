import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const html=await readFile('src/index.html','utf8');
const css=await readFile('src/style.css','utf8');
const engine=await readFile('src/engine.js','utf8');
const projects=await readFile('src/projects.js','utf8');
const app=(await readFile('src/app.js','utf8')).replace(/^import .*?;\n/gm,'');
await writeFile('dist/index.html',html.replace('/* STYLES */',css).replace('/* APPLICATION */',engine.replaceAll('export ','')+'\n'+projects.replaceAll('export ','')+'\n'+app));
console.log('Built dist/index.html (standalone, no external dependencies)');
