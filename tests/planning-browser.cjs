const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const mentor='10000000-0000-4000-8000-000000000001',student='10000000-0000-4000-8000-000000000002';
const date=d=>{const x=new Date();x.setDate(x.getDate()-(x.getDay()+6)%7+d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const out=process.env.QA_OUTPUT || path.resolve('artifacts/catalog-qa');fs.mkdirSync(out,{recursive:true});
const db={profiles:[{id:mentor,full_name:'Mentor Teste',role:'mentor'},{id:student,full_name:'Aluna Teste',role:'student',mentor_id:mentor}],goals:[{id:'g1',student_id:student,title:'Revisão constitucional',category:'Constitucional',pillar:'leitura',due_date:date(0),completed:true,time_seconds:5400,questions_total:20,questions_correct:16,goal_blocks:[]},{id:'g2',student_id:student,title:'Leitura pendente',category:'Administrativo',pillar:'leitura',due_date:date(0),completed:false,time_seconds:0,goal_blocks:[]},{id:'g3',student_id:student,title:'Planejamento futuro',category:'Civil',pillar:'leitura',due_date:date(6),completed:false,time_seconds:0,goal_blocks:[]}],exam_history:[],goal_templates:[],goal_week_packs:[],goal_blocks:[]};let count=0;const imported=new Set();
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const context=await browser.newContext({viewport:{width:1600,height:1050}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let failTemplateWrite=false;
await context.route('https://*.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').pop();
 if(url.pathname.includes('/auth/'))return route.fulfill({json:{id:mentor,email:'mentor@test.local',role:'authenticated'}});
 if(url.pathname.includes('/storage/v1/'))return route.fulfill({json:{Key:'uploaded',signedURL:'/object/sign/goal-materials/test.pdf?token=test'}});
 if(!url.pathname.includes('/rest/v1/'))return route.abort();
 const payload=req.postDataJSON();const single=(req.headers().accept || '').includes('vnd.pgrst.object');
 if(table==='goal_templates' && req.method()==='POST' && failTemplateWrite){failTemplateWrite=false;return route.fulfill({status:500,json:{message:'Falha simulada no catálogo'}})}
 const respond=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?data[0]:data)});
 if(table==='set_goal_timer'){const g=db.goals.find(g=>g.id===payload.p_goal);if(payload.p_running){g.timer_started_at ||= new Date().toISOString()}else{g.time_seconds+=(g.timer_started_at?Math.floor((Date.now()-Date.parse(g.timer_started_at))/1000):0);g.timer_started_at=null}return route.fulfill({json:g})}
 if(table==='import_goal_week_pack'){
   const key=JSON.stringify(payload);if(imported.has(key))return route.fulfill({status:400,json:{message:'Este pacote já foi importado para este aluno nesta semana.'}});
   imported.add(key);const p=db.goal_week_packs.find(p=>p.id===payload.p_pack);
   for(const it of p.items){const t=db.goal_templates.find(t=>t.id===it.template_id);const d=new Date(payload.p_week+'T12:00:00');d.setDate(d.getDate()+it.weekday);db.goals.push({id:'new'+(++count),student_id:payload.p_student,title:t.title,category:t.category,pillar:t.pillar,activity_type:t.activity_type,topic:t.topic,material_url:t.material_url,teacher_notes:t.teacher_notes,due_date:d.toISOString().slice(0,10),completed:false,time_seconds:0,questions_total:null,questions_correct:null,goal_blocks:[]})}
   return route.fulfill({json:p.items.length});
 }
 if(!db[table])throw Error('Unexpected table '+table);
 let rows=db[table].filter(row=>[...url.searchParams].every(([key,val])=>val.startsWith('eq.')?String(row[key])===val.slice(3):val.startsWith('in.')?val.slice(4,-1).split(',').includes(row[key]):true));
 if(req.method()==='POST'){const list=Array.isArray(payload)?payload:[payload];rows=list.map(p=>{const existing=p.id && db[table].find(r=>r.id===p.id);if(existing && req.headers().prefer?.includes('merge-duplicates'))return Object.assign(existing,p);const row={id:'new'+(++count),completed:false,time_seconds:0,goal_blocks:[],...p};db[table].push(row);return row})}
 if(req.method()==='PATCH')rows.forEach(r=>Object.assign(r,payload));
 return respond(rows);
});
async function login(id){await page.addInitScript(({id,mentor})=>{id=localStorage.getItem('qa-user') || id;const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+btoa(JSON.stringify({sub:id,exp:2100000000}))+'.test',refresh_token:'test',expires_at:2100000000,expires_in:3600,token_type:'bearer',user:{id,email:id===mentor?'mentor@test.local':'student@test.local',aud:'authenticated',role:'authenticated'}};localStorage.setItem('sb-dgkftixzeudmvmdfcrwu-auth-token',JSON.stringify(session))},{id,mentor})}
await login(mentor);await page.goto('http://127.0.0.1:5191/mentor/metas');await page.getByLabel('Aluno',{exact:true}).selectOption(student);
await page.getByRole('button',{name:/Abrir dia/}).first().click();assert.equal(await page.locator('.calendar-day').count(),1);
await page.getByRole('button',{name:'Leitura pendente',exact:true}).click();await page.getByLabel('Prioridade',{exact:true}).selectOption('alta');await page.getByLabel('Categoria',{exact:true}).selectOption('questoes');await page.getByLabel('Quantidade prevista de questões').fill('40');
await page.locator('input[type=file]').setInputFiles({name:'apoio.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test')});await page.getByRole('button',{name:/📎 apoio.pdf/}).waitFor();
const layout=await page.locator('.goals-workspace').evaluate(el=>[el.children[0].getBoundingClientRect().left,el.children[1].getBoundingClientRect().left]);assert.ok(layout[1]>layout[0]);await page.screenshot({path:path.join(out,'focused-day.png'),fullPage:true});
await page.getByRole('button',{name:'Salvar alterações'}).click();await page.getByText('Meta salva com sucesso.').waitFor();assert.equal(db.goals[1].priority,'alta');assert.equal(db.goals[1].questions_target,40);assert.equal(db.goals[1].attachments[0].name,'apoio.pdf');
await page.getByRole('button',{name:'← Voltar à semana'}).click();assert.equal(await page.locator('.calendar-day').count(),7);
await page.evaluate(id=>localStorage.setItem('qa-user',id),student);await page.goto('http://127.0.0.1:5191/metas/g2');await page.getByRole('button',{name:'Iniciar',exact:true}).click();await page.getByRole('button',{name:'Pausar',exact:true}).waitFor();await page.locator('.status.progress').waitFor();
await page.goto('http://127.0.0.1:5191/metas/g3');await page.getByRole('button',{name:'Iniciar',exact:true}).waitFor();assert.equal(db.goals[2].time_seconds,0);assert.equal(db.goals[2].timer_started_at,undefined);
await page.goto('http://127.0.0.1:5191/metas/g2');await page.getByRole('button',{name:'Pausar',exact:true}).waitFor();await page.waitForTimeout(1100);await page.getByRole('button',{name:'Pausar',exact:true}).click();await page.getByRole('button',{name:'Iniciar',exact:true}).waitFor();assert.ok(db.goals[1].time_seconds>0);await page.locator('.status.progress').waitFor();assert.equal(db.goals[2].time_seconds,0);
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);console.log('PASS: focused day, side editor, priority/questions, attachment upload, per-goal timer persistence and statuses.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});