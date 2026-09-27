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
const old=await scalar(`insert into goals(student_id,title,topic,category,due_date,time_seconds,questions_total,questions_correct) values($1,'Contratos','Contratos','Civil',current_date,600,10,8) returning id`,[student])
await db.exec('reset role');await db.exec(await sql('migrations/0010_syllabus_study_records.sql'))
await login(mentor)
const goal=(await db.query('select * from goals where id=$1',[old])).rows[0];assert.ok(goal.syllabus_topic_id);assert.equal(goal.day_order,1)
const template=await scalar(`insert into goal_templates(title,category,topic,syllabus_topic_id,legislation_url,questions_url) values('Contratos','Civil','Contratos',$1,'https://example.com/lei','https://example.com/questoes') returning id`,[goal.syllabus_topic_id])
const pack=await scalar(`insert into goal_week_packs(name,items) values('Edital',$1) returning id`,[JSON.stringify([{template_id:template,weekday:0}])]);await db.query(`select import_goal_week_pack($1,$2,'2026-10-05')`,[pack,student]);const imported=(await db.query("select * from goals where due_date='2026-10-05'")).rows[0];assert.equal(imported.syllabus_topic_id,goal.syllabus_topic_id);assert.equal(imported.questions_url,'https://example.com/questoes')
await login(student)
assert.equal(await scalar('select count(*)::integer from syllabus_topics'),1)
assert.equal(await scalar('select study_date from study_records where goal_id=$1',[old]),null)
const day=await scalar("select ((clock_timestamp() at time zone 'America/Manaus')::date-1)::text")
const request='20000000-0000-4000-8000-000000000001'
await db.query('select record_goal_study($1,$2,900,12,9,true,$3,600)',[old,day,request])
await db.query('select record_goal_study($1,$2,900,12,9,true,$3,600)',[old,day,request])
assert.equal(await scalar('select count(*)::integer from goal_completions'),1)
assert.equal(await scalar('select sum(seconds)::integer from study_records where goal_id=$1',[old]),900)
assert.equal(await scalar('select sum(questions_total)::integer from study_records where goal_id=$1',[old]),12)
assert.equal(await scalar('select sum(questions_correct)::integer from study_records where goal_id=$1',[old]),9)
assert.equal(await scalar('select count(*)::integer from study_records where goal_id=$1 and study_date is null',[old]),0)
await assert.rejects(()=>db.query("select record_goal_study($1,current_date+2,900,12,9,true,gen_random_uuid(),900)",[old]),/data de estudo/)
await db.query('update goals set completed=false where id=$1',[old]);assert.equal(await scalar('select completed_at from goals where id=$1',[old]),null)
await db.query('select record_goal_study($1,$2,300,4,3,false,gen_random_uuid(),900)',[old,day]);assert.equal(await scalar('select sum(seconds)::integer from study_records where goal_id=$1',[old]),300)
await db.exec('reset role');await db.query("update goals set timer_started_at=(((clock_timestamp() at time zone 'America/Manaus')::date)::timestamp at time zone 'America/Manaus')-interval '60 seconds' where id=$1",[imported.id]);await login(student);await db.query('select set_goal_timer($1,false)',[imported.id]);assert.equal(await scalar('select count(distinct study_date)::integer from study_records where goal_id=$1',[imported.id]),2)
await login(other);assert.equal(await scalar('select count(*)::integer from study_records'),0);assert.equal(await scalar('select count(*)::integer from syllabus_topics'),0);await assert.rejects(()=>db.query('select record_goal_study($1,$2,0,null,null,true,gen_random_uuid(),300)',[old,day]),/não disponível/)
console.log('PASS: syllabus scoping, pack links, ordered goals, dated/legacy time, midnight timer split, completion/retry/correction and isolation.')
await db.close()