import test from 'node:test';
import assert from 'node:assert/strict';
import {demoProvider,renderPage,briefPrompt,categories} from '../src/engine.js';
import {createLibrary,createProject} from '../src/projects.js';
test('guided formats use actual answers, preserve edits and reload in the project library',async()=>{
 for(const category of Object.keys(categories)){
  const brief={category,name:'Minha marca <teste>',business:'Oficina mecânica',description:'Revisão e manutenção',primary:'#ff7700',background:'#111111',button:'Orçamento',contact:'https://example.com/contact',image:true},asset={id:'asset-test',name:'Minha foto',dataUrl:'data:image/png;base64,test'};
  const prompt=briefPrompt(brief);assert.match(prompt,/Oficina mecânica/);assert.match(prompt,/#ff7700/);assert.match(prompt,/imagem enviada/);
  const {page,message}=await demoProvider(prompt,null,asset,brief);assert.match(message,/sem IA/);const html=renderPage(page);assert.match(html,/Minha marca &lt;teste&gt;/);assert.match(html,/data-asset-id="asset-test"/);assert.match(html,/https:\/\/example.com\/contact/);assert.match(html,/@media/);assert.doesNotMatch(html,/<script|Cafés especiais/);
  const changed=await demoProvider('Título: "Nova versão"',page);assert.equal(changed.page.title,'Nova versão');assert.deepEqual(changed.page.image,asset);assert.equal(changed.page.primary,'#ff7700');
  const project=createProject({page:changed.page,history:[page],messages:[]});assert.equal(createLibrary({version:2,projects:[project],activeId:project.id,view:'projects'}).projects.length,1);
 }
});
