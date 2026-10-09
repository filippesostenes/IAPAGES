import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {createApp} from '../server/server.mjs';
import {once} from 'node:events';
const server=createApp({key:''});server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}`);
await page.screenshot({path:'dist/home-inicio.png',fullPage:true});
await page.locator('#new-project').click();await page.screenshot({path:'dist/studio-inicio.png',fullPage:true});
await page.locator('[data-example="clinic"]').click();
await page.locator('#frame-shell:not([hidden])').waitFor();
const frame=page.frameLocator('#page-preview');
assert.equal(await frame.locator('h1').innerText(),'Sua saúde merece um cuidado especial.');
async function command(text){await page.locator('#prompt').fill(text);await page.locator('#send').click();await page.locator('#send:not([disabled])').waitFor();}
await command('Altere o título para "Cuidado que transforma vidas."');assert.equal(await frame.locator('h1').innerText(),'Cuidado que transforma vidas.');
await command('Deixe o título maior');
await command('Troque o fundo para cinza-escuro');assert.equal(await frame.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(36, 39, 43)');
await command('Mude a cor principal para azul');
await command('Altere o texto do botão para "Fale conosco"');assert.match(await frame.locator('.cta').first().innerText(),/Fale conosco/);
await command('Adicione uma seção de serviços');assert.equal(await frame.locator('.card').count(),4);
await command('Adicione uma seção de depoimentos');assert.equal(await frame.locator('.signature').count(),2);
await command('Adicione uma seção sobre a clínica');assert.match(await frame.locator('body').innerText(),/NOSSA HISTÓRIA/);
await page.locator('#undo').click();assert.doesNotMatch(await frame.locator('body').innerText(),/NOSSA HISTÓRIA/);
const before=await frame.locator('body').innerText();await command('Adicione login');assert.equal(await frame.locator('body').innerText(),before);assert.match(await page.locator('#messages').innerText(),/não está disponível/);
await page.locator('#mobile').click();await expect.poll(()=>page.locator('#frame-shell').evaluate(e=>Math.round(e.getBoundingClientRect().width))).toBe(390);
assert.equal(await frame.locator('html').evaluate(e=>e.scrollWidth>e.clientWidth),false);
await page.reload();assert.match(await frame.locator('h1').innerText(),/Cuidado que transforma/);assert.equal(await page.locator('#mobile').getAttribute('aria-pressed'),'true');
await page.locator('#desktop').click();await expect.poll(()=>page.locator('#frame-shell').evaluate(e=>Math.round(e.getBoundingClientRect().width))).toBeGreaterThan(900);await page.screenshot({path:'dist/studio-projeto.png',fullPage:true});
const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;await download.saveAs('dist/pagina-exemplo.html');
await page.locator('#new-project').click();assert.equal(await page.locator('#welcome').isVisible(),true);
for(const kind of ['consulting','local']){await page.locator(`[data-example="${kind}"]`).click();await page.locator('#send:not([disabled])').waitFor();assert.ok(await frame.locator('h1').innerText());await page.locator('#new-project').click();}
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'dist/studio-celular.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.equal(await page.locator('#page-preview').getAttribute('sandbox'),'');

assert.deepEqual(errors,[]);console.log('PASS: 3 templates, edits, preserved sections, undo, persistence, download, unsupported command, responsive UI, and sandbox');await browser.close();server.closeAllConnections();server.close();await once(server,'close');
