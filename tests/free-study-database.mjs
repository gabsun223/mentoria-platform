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
await db.exec(await sql('migrations/0011_free_study_sessions.sql'));
await login(student);
const request='20000000-0000-4000-8000-000000000001';
const call=(id,goal,subject,topic,sec=120,total=2,correct=1)=>db.query(`select record_study_session($1,$2,current_date,$3,$4,$5,'teoria',$6,$7,false,'nota','aula')`,[id,goal,sec,subject,topic,total,correct]);
await call(request,null,'Nova matéria','Novo assunto');await call(request,null,'Nova matéria','Novo assunto');
assert.equal(await scalar(`select count(*)::int from study_records where id=$1`,[request]),1);
assert.equal(await scalar(`select count(*)::int from syllabus_topics where mentor_id=$1 and subject='Nova matéria'`,[student]),1);
await call('20000000-0000-4000-8000-000000000002',null,'nova matéria','novo assunto');
assert.equal(await scalar(`select count(*)::int from syllabus_topics where mentor_id=$1 and lower(subject)='nova matéria'`,[student]),1);
await call('20000000-0000-4000-8000-000000000003',old,'ignored','ignored');
assert.equal(await scalar(`select time_seconds from goals where id=$1`,[old]),720);
assert.equal(await scalar(`select sum(seconds)::int from study_records where goal_id=$1`,[old]),720);
assert.equal(await scalar(`select sum(questions_total)::int from study_records where goal_id=$1`,[old]),12);
assert.equal(await scalar(`select questions_total from goals where id=$1`,[old]),12);
await assert.rejects(call('20000000-0000-4000-8000-000000000004',null,'Bad','Bad',120,1,2));
await login(other);await assert.rejects(call('20000000-0000-4000-8000-000000000005',old,'ignored','ignored'));
console.log('PASS: free/linked sessions, case-insensitive syllabus reuse, duplicate protection, additive totals and permissions');await db.close();

