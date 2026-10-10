import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogTemplates} from '../src/catalog.js';
import {templates,renderPage,demoProvider} from '../src/engine.js';
import {createLibrary,createProject,emptyProjectState} from '../src/projects.js';
test('ten sector examples are complete, distinct, responsive and editable local projects',async()=>{
 assert.equal(Object.keys(catalogTemplates).length,10);const layouts=new Set();
 for(const [kind,template] of Object.entries(catalogTemplates)){
  assert.equal(templates[kind],template);layouts.add(template.layout);const html=renderPage(template);assert.match(html,/^<!doctype html>/);assert.match(html,/<h1>/);assert.match(html,/id="servicos"/);assert.match(html,/id="sobre"/);assert.match(html,/id="contato"/);assert.match(html,/fictícios de exemplo/);assert.match(html,/@media/);assert.doesNotMatch(html,/<script|<iframe|https?:\/\//);assert.ok(template.serviceItems.length===3);
  const original=structuredClone(template),result=await demoProvider('Adicione uma seção de serviços',template);assert.equal((renderPage(result.page).match(/<article class="card">/g)||[]).length,4);assert.deepEqual(template,original);const testimonial=await demoProvider('Adicione depoimentos',template);assert.match(renderPage(testimonial.page),/Depoimento fictício/);
 }
 assert.equal(layouts.size,10);
});
test('bookmarks migrate safely and remain separate from created projects',()=>{
 const project=createProject(emptyProjectState());const library=createLibrary({version:2,projects:[project],savedTemplates:['bakery','bakery',null],savedProjects:[project.id,'missing',project.id],view:'saved'});assert.equal(library.view,'saved');assert.deepEqual(library.savedTemplates,['bakery']);assert.deepEqual(library.savedProjects,[project.id]);assert.equal(library.projects.length,1);const legacy=createLibrary({version:2,projects:[project],view:'projects'});assert.deepEqual(legacy.savedTemplates,[]);assert.deepEqual(legacy.savedProjects,[]);
});
