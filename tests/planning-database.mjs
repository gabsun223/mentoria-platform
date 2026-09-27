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
await db.exec(await sql('migrations/0008_teacher_notes.sql'))
await db.exec(await sql('migrations/0008_teacher_notes.sql'))
const mentor='10000000-0000-4000-8000-000000000001',student='10000000-0000-4000-8000-000000000002',other='10000000-0000-4000-8000-000000000003'
await db.exec(`insert into auth.users values('${mentor}'),('${student}'),('${other}');
insert into profiles(id,role) values('${mentor}','mentor'),('${other}','mentor');
insert into profiles(id,role,mentor_id) values('${student}','student','${mentor}');
grant select,insert,update,delete on profiles,goals,goal_blocks to authenticated;`)
async function login(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false),set_config('request.jwt.claim.role','authenticated',false);set role authenticated;`)}
async function scalar(q,args=[]){return Object.values((await db.query(q,args)).rows[0])[0]}
await login(mentor)
await db.exec(`reset role; create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`)
await db.exec(await sql('migrations/0009_goal_planning.sql'))
await login(mentor)
const path=mentor+'/file/support.pdf'
await db.query(`insert into storage.objects(bucket_id,name) values('goal-materials',$1)`,[path])
const template=await scalar(`insert into goal_templates(title,category,priority,activity_type,questions_target,attachments) values('Questões','Direito','alta','questoes',40,$1) returning id`,[JSON.stringify([{path,name:'support.pdf'}])])
const pack=await scalar(`insert into goal_week_packs(name,items) values('Pacote',$1) returning id`,[JSON.stringify([{template_id:template,weekday:0},{template_id:template,weekday:1}])])
await db.query(`select import_goal_week_pack($1,$2,'2026-09-28')`,[pack,student])
const goals=(await db.query('select * from goals order by due_date')).rows
assert.equal(goals[0].priority,'alta');assert.equal(goals[0].questions_target,40);assert.equal(goals[0].attachments[0].path,path)
await login(student)
assert.equal(await scalar('select count(*)::integer from storage.objects'),1)
await assert.rejects(()=>db.query(`update goals set attachments='[]' where id=$1`,[goals[0].id]),/professor/)
await db.query('select set_goal_timer($1,true)',[goals[0].id])
await db.exec('reset role')
await db.query(`update goals set timer_started_at=clock_timestamp()-interval '65 seconds' where id=$1`,[goals[0].id])
await login(student)
await db.query('select set_goal_timer($1,true)',[goals[0].id])
await db.query('select set_goal_timer($1,false)',[goals[0].id])
const seconds=await scalar('select time_seconds from goals where id=$1',[goals[0].id]);assert.ok(seconds>=65 && seconds<70)
await db.query('select set_goal_timer($1,false)',[goals[0].id])
assert.equal(await scalar('select time_seconds from goals where id=$1',[goals[0].id]),seconds)
assert.equal(await scalar('select time_seconds from goals where id=$1',[goals[1].id]),0)
await db.query('select set_goal_timer($1,true)',[goals[1].id])
await db.query('update goals set completed=true where id=$1',[goals[1].id])
assert.equal(await scalar('select timer_started_at from goals where id=$1',[goals[1].id]),null)
await assert.rejects(()=>db.query('select set_goal_timer($1,true)',[goals[1].id]),/Reabra/)
await login(other)
assert.equal(await scalar('select count(*)::integer from storage.objects'),0)
await assert.rejects(()=>db.query('select set_goal_timer($1,true)',[goals[0].id]),/não disponível/)
console.log('PASS: planning import, private material permissions, independent and idempotent timers, completion.')
await db.close()