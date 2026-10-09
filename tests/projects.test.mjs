import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibrary,createProject,emptyProjectState,updateProject} from '../src/projects.js';
import {templates} from '../src/engine.js';
test('migrates the existing project with conversation, images and history intact',()=>{
 const legacy={...emptyProjectState(),page:templates.clinic,history:[templates.consulting],messages:[{role:'user',text:'Minha clínica'}],attachment:{id:'a',dataUrl:'data:image/webp;base64,test'}};
 const library=createLibrary(null,legacy);assert.equal(library.projects.length,1);assert.equal(library.view,'editor');assert.deepEqual(library.projects[0].state,legacy);assert.equal(library.activeId,library.projects[0].id);
 library.projects[0].state.messages.push({role:'assistant',text:'Separado'});assert.equal(legacy.messages.length,1);
});
test('separates project state and preserves custom names through future edits',()=>{
 const library=createLibrary(),first=createProject({...emptyProjectState(),page:templates.clinic}),second=createProject({...emptyProjectState(),page:templates.consulting});library.projects=[first,second];
 first.customName=true;first.name='Minha clínica';updateProject(library,first.id,{...first.state,page:{...templates.clinic,title:'Novo título'},history:[templates.clinic]});assert.equal(first.name,'Minha clínica');assert.equal(first.state.history.length,1);assert.equal(second.state.history.length,0);assert.equal(second.state.page.kind,'consulting');
});
test('recovers invalid active references and excludes corrupted or duplicate projects',()=>{
 const project=createProject();const library=createLibrary({version:2,projects:[project,{...project}, {id:'broken',state:{messages:[]}}],activeId:'missing',view:'editor'});assert.equal(library.projects.length,1);assert.equal(library.activeId,null);assert.equal(library.view,'home');
});
