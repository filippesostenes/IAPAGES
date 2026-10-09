import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 let responses=[];page.on('response',async r=>{if(r.url().endsWith('/api/generate')){try{const data=await r.json();responses.push({status:r.status(),provider:data.provider,error:data.error,page:data.page});}catch{responses.push({status:r.status()});}}});
 await page.goto('http://127.0.0.1:3000');await page.locator('#send:not([disabled])').waitFor();
 console.log('Server configuration and frontend reachable.');
 await page.locator('#mode').selectOption('demo');await page.locator('[data-example="clinic"]').click();await page.locator('#send:not([disabled])').waitFor();
 const frame=page.frameLocator('#page-preview');const before=await frame.locator('body').innerText();assert.match(before,/Clínica Essência/);
 await page.locator('#mode').selectOption('ai');
 const prompt='Crie uma página para uma oficina mecânica, com fundo preto, detalhes laranja, serviços e botão de orçamento';
 await page.locator('#prompt').fill(prompt);await page.locator('#send').click();console.log('Sent exact workshop request via chat to /api/generate.');
 await page.locator('#send:not([disabled])').waitFor({timeout:145000});
 const response=responses.at(-1);if(response?.status!==200){console.log('LIVE GENERATION BLOCKED:',JSON.stringify({status:response?.status,error:response?.error}));await page.screenshot({path:'dist/live-error.png',fullPage:true});process.exitCode=1;}else{
 assert.equal(response.provider,'openai');assert.equal(response.page.kind,'ai');const current=await frame.locator('body').innerText();assert.notEqual(current,before);assert.match(current,/oficina|mec[aâ]nica/i);await writeFile('dist/oficina-gerada-real.html',response.page.html);await page.screenshot({path:'dist/oficina-gerada-real.png',fullPage:true});console.log('REAL GENERATION PASS: OpenAI provider; clinic replaced by workshop; h1:',await frame.locator('h1').innerText());
 await page.locator('#prompt').fill('Altere somente o título principal para “Sua oficina de confiança”. Preserve o fundo preto, os detalhes laranja, os serviços e o botão de orçamento.');await page.locator('#send').click();console.log('Sent title edit via chat.');await page.locator('#send:not([disabled])').waitFor({timeout:145000});const edit=responses.at(-1);
 if(edit?.status!==200){console.log('LIVE EDIT BLOCKED:',JSON.stringify({status:edit?.status,error:edit?.error}));process.exitCode=1;}else{assert.equal(edit.provider,'openai');assert.match(await frame.locator('h1').innerText(),/Sua oficina de confiança/);assert.notEqual(edit.page.html,response.page.html);await writeFile('dist/oficina-editada-real.html',edit.page.html);await page.screenshot({path:'dist/oficina-editada-real.png',fullPage:true});await writeFile('dist/verificacao-real.json',JSON.stringify({generation:true,edit:true,provider:'openai',generationPrompt:prompt,editTitle:await frame.locator('h1').innerText(),checkedAt:new Date().toISOString()},null,2));console.log('REAL EDIT PASS: API updated workshop title in iframe.');}
 }
}finally{await browser.close();}
