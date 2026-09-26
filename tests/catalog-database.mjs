// Run with PGLITE_MODULE pointing to @electric-sql/pglite's dist/index.js.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite }=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db=new PGlite()
const sql=async path=>readFile(new URL('../supabase/'+path,import.meta.url),'utf8')
await db.exec(`create schema auth; create role authenticated; create role anon;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
grant usage on schema auth,public to authenticated,anon;
grant execute on all functions in schema auth to authenticated,anon;`)
await db.exec((await sql('schema.sql')).replace('create extension if not exists "pgcrypto";',''))
await db.exec(await sql('migrations/0002_goal_blocks.sql'))
await db.exec(await sql('migrations/0004_mentor_sees_unclaimed_students.sql'))
await db.exec(await sql('migrations/0006_goal_catalog.sql'))
// The migration can safely be applied a second time.
await db.exec(await sql('migrations/0006_goal_catalog.sql'))
await db.exec(await sql('migrations/0007_simple_goal_fields.sql'))
await db.exec(await sql('migrations/0007_simple_goal_fields.sql'))
const mentor='10000000-0000-4000-8000-000000000001',student='10000000-0000-4000-8000-000000000002',other='10000000-0000-4000-8000-000000000003'
await db.exec(`insert into auth.users values('${mentor}'),('${student}'),('${other}');
insert into profiles(id,role) values('${mentor}','mentor'),('${other}','mentor');
insert into profiles(id,role,mentor_id) values('${student}','student','${mentor}');
grant select,insert,update,delete on profiles,goals,goal_blocks to authenticated;`)
async function login(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false),set_config('request.jwt.claim.role','authenticated',false);set role authenticated;`)}
async function scalar(q,args=[]){return Object.values((await db.query(q,args)).rows[0])[0]}
await login(mentor)
const template=await scalar(`insert into goal_templates(title,category,topic,blocks) values('Leitura','Constitucional','Direitos fundamentais','[{"title":"Constituição","topic":"Art. 5","material_url":"https://example.com"}]') returning id`)
const pack=await scalar(`insert into goal_week_packs(name,items) values('Semana 1',$1) returning id`,[JSON.stringify([{template_id:template,weekday:0},{template_id:template,weekday:6}])])
assert.equal(await scalar(`select import_goal_week_pack($1,$2,'2026-09-28')`,[pack,student]),2)
const goals=(await db.query('select * from goals order by due_date')).rows
assert.equal(goals.length,2);assert.equal(goals[0].due_date.toISOString().slice(0,10),'2026-09-28');assert.equal(goals[1].due_date.toISOString().slice(0,10),'2026-10-04')
assert.equal(goals[0].time_seconds,0);assert.equal(goals[0].completed,false)
assert.equal(await scalar('select count(*)::integer from goal_blocks'),2)
assert.equal(goals[0].topic,'Direitos fundamentais')
assert.equal(goals[0].activity_type,'teoria')
assert.equal(goals[0].material_url,'https://example.com')
await assert.rejects(()=>db.query(`select import_goal_week_pack($1,$2,'2026-09-28')`,[pack,student]),/já foi importado/)
assert.equal(await scalar('select count(*)::integer from goals'),2)
await db.query(`update goal_templates set title='Novo título' where id=$1`,[template])
assert.equal(await scalar('select title from goals limit 1'),'Direitos fundamentais')
const invalid=await scalar(`insert into goal_week_packs(name,items) values('Inválido',$1) returning id`,[JSON.stringify([{template_id:template,weekday:1},{template_id:other,weekday:2}])])
await assert.rejects(()=>db.query(`select import_goal_week_pack($1,$2,'2026-10-05')`,[invalid,student]),/não está disponível/)
assert.equal(await scalar('select count(*)::integer from goals'),2)
assert.equal(await scalar('select count(*)::integer from goal_pack_imports'),1)
for(const activity of ['teoria','revisao','questoes','legislacao','jurisprudencia','outros']) {
  await db.query(`update goal_templates set activity_type=$1, material_url='https://example.com/new',blocks='[]' where id=$2`,[activity,template])
  const one=await scalar(`insert into goal_week_packs(name,items) values($1,$2) returning id`,[activity,JSON.stringify([{template_id:template,weekday:0}])])
  await db.query(`select import_goal_week_pack($1,$2,'2026-11-02')`,[one,student])
  const result=(await db.query(`select * from goals where activity_type=$1 and due_date='2026-11-02'`,[activity])).rows[0]
  assert.ok(result);assert.equal(result.material_url,'https://example.com/new')
  assert.equal(await scalar('select count(*)::integer from goal_blocks where goal_id=$1',[result.id]),0)
}
await assert.rejects(()=>db.query(`select import_goal_week_pack($1,$2,'2026-09-29')`,[pack,student]),/segunda-feira/)
await assert.rejects(()=>db.query(`update goals set questions_total=5,questions_correct=6 where id=$1`,[goals[0].id]),/goal_question_results_valid/)
await login(other)
assert.equal(await scalar('select count(*)::integer from goal_templates'),0)
assert.equal(await scalar('select count(*)::integer from goal_week_packs'),0)
await assert.rejects(()=>db.query(`select import_goal_week_pack($1,$2,'2026-10-05')`,[pack,student]),/não vinculado/)
await login(student)
assert.equal(await scalar('select count(*)::integer from goal_templates'),0)
await assert.rejects(()=>db.query(`insert into goal_templates(title,category) values('Não permitido','Matéria')`),/row-level security/)
await assert.rejects(()=>db.query(`update profiles set role='mentor' where id=$1`,[student]),/reservada/)
await db.query(`update goals set time_seconds=5400,questions_total=10,questions_correct=8 where id=$1`,[goals[0].id])
assert.equal(await scalar('select time_seconds from goals where id=$1',[goals[0].id]),5400)
await db.exec(`reset role;set role anon;`)
await assert.rejects(()=>db.query(`select import_goal_week_pack($1,$2,'2026-10-05')`,[pack,student]),/permission denied/)
await db.close()
console.log('PASS: migration + rerun, import dates, blocks, snapshot, duplicate prevention, rollback, question validation, mentor isolation, student results and role protection.')
