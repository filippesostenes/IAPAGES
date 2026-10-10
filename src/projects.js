// Local persistence adapter. A future account-backed adapter can implement load/save.
const KEY='iapages.library.v2',LEGACY_KEY='iapages.project.v1';
export const emptyProjectState=()=>({page:null,history:[],messages:[],device:'desktop',mode:'demo',modeSelected:false,attachment:null});
export function validProjectState(value){return !!value&&Array.isArray(value.history)&&Array.isArray(value.messages)&&(!value.page||['clinic','consulting','local','bio','landing','sales','ai','imported'].includes(value.page.kind));}
export function createProject(state=emptyProjectState(),name='Projeto sem título'){
 const now=new Date().toISOString();return {id:crypto.randomUUID(),name:name.slice(0,80),customName:false,createdAt:now,updatedAt:now,state:structuredClone(state)};
}
export function createLibrary(saved,legacy){
 if(saved?.version===2&&Array.isArray(saved.projects)){
  const ids=new Set(),projects=saved.projects.filter(p=>typeof p.id==='string'&&!ids.has(p.id)&&validProjectState(p.state)&&ids.add(p.id)).map(p=>({...p,name:typeof p.name==='string'?p.name.slice(0,80):'Projeto sem título'}));
  const activeId=projects.some(p=>p.id===saved.activeId)?saved.activeId:null;
  return {version:2,projects,activeId,view:activeId&&saved.view==='editor'?'editor':['projects','explore','saved'].includes(saved.view)?saved.view:'home',savedTemplates:[...new Set((Array.isArray(saved.savedTemplates)?saved.savedTemplates:[]).filter(k=>typeof k==='string'))],savedProjects:[...new Set((Array.isArray(saved.savedProjects)?saved.savedProjects:[]).filter(id=>projects.some(p=>p.id===id)))]};
 }
 if(validProjectState(legacy)&&(legacy.page||legacy.messages.length||legacy.attachment)){
  const project=createProject({...emptyProjectState(),...legacy},legacy.page?.name||'Meu primeiro projeto');
  return {version:2,projects:[project],activeId:project.id,view:'editor',savedTemplates:[],savedProjects:[]};
 }
 return {version:2,projects:[],activeId:null,view:'home',savedTemplates:[],savedProjects:[]};
}
export function updateProject(library,id,state,{touch=true}={}){
 const project=library.projects.find(p=>p.id===id);if(!project)return;
 project.state=structuredClone(state);if(!project.customName&&state.page?.name)project.name=state.page.name.slice(0,80);if(touch)project.updatedAt=new Date().toISOString();
}
export class BrowserProjectStore{
 constructor(){this.db=new Promise(resolve=>{try{const req=indexedDB.open('iapages',1);req.onupgradeneeded=()=>req.result.createObjectStore('projects');req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);req.onblocked=()=>resolve(null);}catch{resolve(null);}});}
 async load(){
  const db=await this.db;
  if(db){const records=await new Promise((resolve,reject)=>{const tx=db.transaction('projects'),store=tx.objectStore('projects'),workspace=store.get('workspace'),legacy=store.get('current');tx.oncomplete=()=>resolve({saved:workspace.result,legacy:legacy.result});tx.onerror=reject;tx.onabort=reject;});if(records.saved||records.legacy)return createLibrary(records.saved,records.legacy);}
  try{return createLibrary(JSON.parse(localStorage.getItem(KEY)),JSON.parse(localStorage.getItem(LEGACY_KEY)));}catch{return createLibrary();}
 }
 async save(library){
  const db=await this.db;
  if(db){await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects');store.put(library,'workspace');store.delete('current');tx.oncomplete=resolve;tx.onerror=reject;tx.onabort=reject;});try{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);}catch{}}
  else{localStorage.setItem(KEY,JSON.stringify(library));localStorage.removeItem(LEGACY_KEY);}
 }
}
