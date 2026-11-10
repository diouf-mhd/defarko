import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const db = new PGlite();
const q = async (sql, p) => (await db.query(sql, p)).rows;
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗ FAIL:', msg); } };
const asUser = async (uid, role = 'authenticated') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`);
};
const root = async () => { await db.exec('reset role;'); };
const fails = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };

// --- Stub Supabase auth
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table public.profiles (id uuid primary key, email text not null, nom text not null, prenom text not null, role text not null);
  create function public.other_app_user_trigger() returns trigger language plpgsql as $$ begin return new; end $$;
  create trigger on_auth_user_created after insert on auth.users for each row execute function public.other_app_user_trigger();
  create function public.other_app_function() returns boolean language sql as $$ select true $$;
  grant execute on function public.other_app_function() to anon;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`);
const [legacyUser] = await q(`insert into auth.users (email, raw_user_meta_data) values ('legacy@x.sn', '{"full_name":"Legacy User","phone":"770000000"}') returning id`);
await db.exec(`insert into public.profiles (id, email, nom, prenom, role) values ('${legacyUser.id}', 'legacy@x.sn', 'User', 'Legacy', 'student')`);
await db.exec(fs.readFileSync(new URL('../migrations/20261110000000_init.sql', import.meta.url), 'utf8'));
await db.exec(fs.readFileSync(new URL('../migrations/20261110000200_backfill_profiles.sql', import.meta.url), 'utf8'));
await db.exec(fs.readFileSync(new URL('../migrations/20261110000300_preferred_request_date.sql', import.meta.url), 'utf8'));
console.log('Schéma chargé sans erreur');

const [legacyProfile] = await q(`select full_name, phone, role from public.defarko_profiles where id='${legacyUser.id}'`);
ok(legacyProfile.full_name === 'Legacy User' && legacyProfile.phone === '770000000' && legacyProfile.role === 'client', "un compte Auth existant reçoit son profil Defar ko");
const [existingProfile] = await q(`select nom, prenom, role from public.profiles where id='${legacyUser.id}'`);
ok(existingProfile.nom === 'User' && existingProfile.prenom === 'Legacy' && existingProfile.role === 'student', "la table profiles de l'autre application reste intacte");
const [otherFunction] = await q(`select has_function_privilege('anon', 'public.other_app_function()', 'execute') as allowed`);
ok(otherFunction.allowed, "les droits des fonctions de l'autre application restent intacts");
const authTriggers = await q(`select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal`);
ok(authTriggers.some((trigger) => trigger.tgname === 'on_auth_user_created') && authTriggers.some((trigger) => trigger.tgname === 'on_defarko_user_created'), "les déclencheurs d'inscription cohabitent");

const [A] = await q(`insert into auth.users (email, raw_user_meta_data) values ('admin@x.sn', '{"full_name":"Admin","phone":"770000000"}') returning id`);
const [C] = await q(`insert into auth.users (email, raw_user_meta_data) values ('client@x.sn', '{"full_name":"Client","phone":"771111111","role":"admin"}') returning id`);
const [P] = await q(`insert into auth.users (email, raw_user_meta_data) values ('ouvrier@x.sn', '{"full_name":"Ouvrier"}') returning id`);
const [T] = await q(`insert into auth.users (email, raw_user_meta_data) values ('prof@x.sn', '{"full_name":"Prof"}') returning id`);
await db.exec(`update public.defarko_profiles set role='admin' where id='${A.id}'`);

console.log('\n1. Rôles et inscription');
let r = await q(`select role from public.defarko_profiles where id='${C.id}'`);
ok(r[0].role === 'client', "un rôle 'admin' glissé dans le formulaire est ignoré (client)");

await asUser(C.id);
let e = await fails(() => db.exec(`update public.defarko_profiles set role='admin' where id='${C.id}'`));
ok(e && /permission denied/i.test(e), "un client ne peut pas se promouvoir admin");
await db.exec(`update public.defarko_profiles set phone='772222222' where id='${C.id}'`);
ok(true, "un client peut modifier son téléphone");

console.log('\n2. Inscription ouvrier + vérification');
await asUser(P.id);
const [{ become_provider: provId }] = await q(`select public.defarko_become_provider('Moussa Ndiaye','electricien','Électricien','8','Diamniadio','Dakar','{domicile}',3000,'devis',null,null,'+221 77 000 00 01') as become_provider`.replace("'8'", '8'));
r = await q(`select role from public.defarko_profiles where id='${P.id}'`);
ok(r[0].role === 'prestataire', "le profil devient « prestataire »");
await asUser(null, 'anon');
r = await q(`select id from public.defarko_providers`);
ok(r.length === 0, "le public ne voit pas un ouvrier en attente");
await asUser(P.id);
r = await q(`select id from public.defarko_providers`);
ok(r.length === 1, "l'ouvrier voit son propre profil");
e = await fails(() => db.exec(`update public.defarko_providers set status='verifie' where id='${provId}'`));
ok(e && /permission denied/i.test(e), "un ouvrier ne peut pas se vérifier lui-même");
e = await fails(() => db.exec(`update public.defarko_providers set rating=5 where id='${provId}'`));
ok(e && /permission denied/i.test(e), "un ouvrier ne peut pas modifier sa note");
await db.exec(`update public.defarko_providers set availability='occupe' where id='${provId}'`);
ok(true, "un ouvrier peut changer sa disponibilité");
await db.exec(`update public.defarko_providers set availability='disponible' where id='${provId}'`);

await asUser(C.id);
e = await fails(() => q(`select public.defarko_admin_set_provider_status('${provId}','verifie')`));
ok(e && /réservé aux administrateurs/.test(e), "un client ne peut pas vérifier un ouvrier");
await asUser(A.id);
await db.exec(`select public.defarko_admin_set_provider_status('${provId}','verifie')`);
await asUser(null, 'anon');
r = await q(`select id from public.defarko_providers`);
ok(r.length === 1, "après vérification, le public voit l'ouvrier (sans compte)");
e = await fails(() => q(`select public.defarko_create_request('${provId}','test','domicile','x',1)`));
ok(e && /permission denied/i.test(e), "un visiteur sans compte ne peut pas créer de demande");

console.log('\n3. Parcours complet : diagnostic → devis → complément → confirmation → commission');
await asUser(C.id);
e = await fails(() => q(`select public.defarko_create_request_with_date('${provId}','Panne de courant dans le salon','domicile','Diamniadio',1,current_date - 1)`));
ok(e && /date souhaitée ne peut pas être dans le passé/i.test(e), "une date d'intervention passée est refusée");
const [{ create_request_with_date: reqId }] = await q(`select public.defarko_create_request_with_date('${provId}','Panne de courant dans le salon','domicile','Diamniadio',1,current_date + 1) as create_request_with_date`);
r = await q(`select preferred_date = current_date + 1 as date_matches from public.defarko_requests where id='${reqId}'`);
ok(r[0].date_matches, "la date souhaitée est enregistrée avec la demande");
r = await q(`select status, diagnostic_fee from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'diagnostic_a_payer' && r[0].diagnostic_fee === 3000, "demande créée : diagnostic 3000 à payer");
r = await q(`select kind, amount, status from public.defarko_payments where request_id='${reqId}'`);
ok(r.length === 1 && r[0].kind === 'diagnostic' && r[0].amount === 3000, "paiement de diagnostic créé");

await asUser(P.id);
e = await fails(() => q(`select public.defarko_provider_quote('${reqId}', 15000, 'x')`));
ok(e && /diagnostic non payé/.test(e), "l'ouvrier ne peut pas proposer un prix avant le paiement du diagnostic");
r = await q(`select p.phone from public.defarko_profiles p where p.id='${C.id}'`);
ok(r.length === 1 && r[0].phone === '772222222', "l'ouvrier peut récupérer le numéro du client");

await asUser(C.id);
const [{ id: payDiag }] = await q(`select id from public.defarko_payments where request_id='${reqId}'`);
await db.exec(`select public.defarko_declare_payment('${payDiag}', 'Wave 1234')`);
r = await q(`select status from public.defarko_payments where id='${payDiag}'`);
ok(r[0].status === 'declare', "le client déclare avoir payé");
e = await fails(() => q(`select public.defarko_admin_validate_payment('${payDiag}')`));
ok(e && /réservé aux administrateurs/.test(e), "le client ne peut pas valider son propre paiement");
await asUser(P.id);
e = await fails(() => q(`select public.defarko_admin_validate_payment('${payDiag}')`));
ok(e && /réservé aux administrateurs/.test(e), "l'ouvrier ne peut pas valider un paiement");
await asUser(A.id);
await db.exec(`select public.defarko_admin_validate_payment('${payDiag}')`);
r = await q(`select status from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'diagnostic_paye', "l'admin valide : diagnostic payé");

await asUser(P.id);
await db.exec(`select public.defarko_provider_quote('${reqId}', 15000, 'Remplacement du disjoncteur')`);
r = await q(`select status, quote_amount from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'devis_propose' && r[0].quote_amount === 15000, "l'ouvrier propose 15 000 FCFA");

await asUser(C.id);
await db.exec(`select public.defarko_client_answer_quote('${reqId}', true)`);
r = await q(`select kind, amount, status from public.defarko_payments where request_id='${reqId}' and kind='devis'`);
ok(r.length === 1 && r[0].amount === 12000, "le client accepte : reste à payer 12 000 (le diagnostic est déduit)");
const [{ id: payDevis }] = await q(`select id from public.defarko_payments where request_id='${reqId}' and kind='devis'`);
await db.exec(`select public.defarko_declare_payment('${payDevis}', null)`);
await asUser(A.id);
await db.exec(`select public.defarko_admin_validate_payment('${payDevis}')`);
r = await q(`select status from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'en_cours', "paiement validé : travail en cours");

await asUser(P.id);
await db.exec(`select public.defarko_provider_request_extra('${reqId}', 5000, 'Câble principal à remplacer')`);
r = await q(`select status from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'complement_demande', "l'ouvrier demande un complément de 5 000");
await asUser(C.id);
const [{ id: payExtra }] = await q(`select id from public.defarko_payments where request_id='${reqId}' and kind='complement'`);
await db.exec(`select public.defarko_client_answer_extra('${payExtra}', true)`);
r = await q(`select status from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'paiement_a_faire', "le client accepte le complément : nouveau paiement à faire");
await db.exec(`select public.defarko_declare_payment('${payExtra}', null)`);
await asUser(A.id);
await db.exec(`select public.defarko_admin_validate_payment('${payExtra}')`);

await asUser(P.id);
await db.exec(`select public.defarko_provider_mark_done('${reqId}')`);
await asUser(C.id);
await db.exec(`select public.defarko_client_confirm_done('${reqId}')`);
r = await q(`select status from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'termine', "le client confirme la fin du travail");

await asUser(P.id);
e = await fails(() => q(`select public.defarko_admin_payout('${reqId}')`));
ok(e && /réservé aux administrateurs/.test(e), "l'ouvrier ne peut pas se reverser lui-même");
await asUser(A.id);
await db.exec(`select public.defarko_admin_payout('${reqId}')`);
r = await q(`select status, commission_amount, payout_amount from public.defarko_requests where id='${reqId}'`);
ok(r[0].status === 'reverse' && r[0].commission_amount === 1000 && r[0].payout_amount === 19000, `commission 5 % sur 20 000 = 1 000, ouvrier reçoit 19 000 (obtenu: ${r[0].commission_amount}/${r[0].payout_amount})`);

console.log('\n4. Isolation des données');
const [{ become_provider: provT }] = await q(`select 1 as x`).then(async () => { await asUser(T.id); return q(`select public.defarko_become_provider('Awa Diop','enseignant','Maths',5,'Diamniadio','Dakar','{domicile}',0,'fixe',3000,'heure','+221770000004') as become_provider`); });
await asUser(A.id);
await db.exec(`select public.defarko_admin_set_provider_status('${provT}','verifie')`);
await asUser(T.id);
r = await q(`select id from public.defarko_requests`);
ok(r.length === 0, "un autre ouvrier ne voit pas les demandes des autres");
await asUser(P.id);
const other = await q(`select id from public.defarko_requests where provider_id='${provT}'`);
ok(other.length === 0, "un ouvrier ne voit pas les demandes d'un autre ouvrier");
r = await q(`select id from public.defarko_profiles`);
ok(r.length === 2 || r.length === 1, `un ouvrier ne voit que son profil et ses clients (vu: ${r.length})`);

console.log('\n5. Prix fixe (enseignant) : 2 heures');
await asUser(C.id);
const [{ create_request: fixId }] = await q(`select public.defarko_create_request('${provT}','Maths 3e','domicile','Diamniadio',2) as create_request`);
r = await q(`select status, quote_amount from public.defarko_requests where id='${fixId}'`);
ok(r[0].status === 'paiement_a_faire' && r[0].quote_amount === 6000, "2 h × 3 000 = 6 000 à payer directement");
e = await fails(() => q(`select public.defarko_cancel_request('${fixId}')`));
ok(e === null, "annulation possible avant paiement");

console.log('\n6. Complément refusé, litige, remboursement');
const [{ create_request: r3 }] = await q(`select public.defarko_create_request('${provId}','Prise cassée','domicile','Pikine',1) as create_request`);
const [{ id: pd }] = await q(`select id from public.defarko_payments where request_id='${r3}'`);
await db.exec(`select public.defarko_declare_payment('${pd}', null)`);
await asUser(A.id); await db.exec(`select public.defarko_admin_validate_payment('${pd}')`);
await asUser(P.id); await db.exec(`select public.defarko_provider_quote('${r3}', 3000, null)`);
await asUser(C.id); await db.exec(`select public.defarko_client_answer_quote('${r3}', true)`);
r = await q(`select status from public.defarko_requests where id='${r3}'`);
ok(r[0].status === 'en_cours', "prix final = diagnostic : aucun paiement en plus, travail en cours");
await asUser(P.id); await db.exec(`select public.defarko_provider_request_extra('${r3}', 8000, 'Autre panne')`);
await asUser(C.id);
const [{ id: ex }] = await q(`select id from public.defarko_payments where request_id='${r3}' and kind='complement'`);
await db.exec(`select public.defarko_client_answer_extra('${ex}', false)`);
r = await q(`select status from public.defarko_requests where id='${r3}'`);
ok(r[0].status === 'en_cours', "complément refusé : retour au travail en cours, sans surcoût");
await db.exec(`select public.defarko_open_dispute('${r3}', 'Travail non terminé')`);
await asUser(A.id);
await db.exec(`select public.defarko_admin_resolve_dispute('${r3}', 'rembourser')`);
r = await q(`select status from public.defarko_requests where id='${r3}'`);
ok(r[0].status === 'annule', "litige réglé par l'admin");

console.log('\n7. Avis clients');
await asUser(C.id);
e = await fails(() => q(`select public.defarko_add_review('${r3}', 5, 'ok')`));
ok(e && /service sera terminé/.test(e), "pas d'avis sur un service annulé / non terminé");
await db.exec(`select public.defarko_add_review('${reqId}', 5, 'Très professionnel et rapide')`);
r = await q(`select author_name, rating from public.defarko_reviews where request_id='${reqId}'`);
ok(r.length === 1 && r[0].author_name === 'Client' && r[0].rating === 5, `avis enregistré (auteur: ${r[0].author_name})`);
e = await fails(() => q(`select public.defarko_add_review('${reqId}', 4, 'bis')`));
ok(e && /déjà donné/.test(e), "un seul avis par service");
await asUser(null, 'anon');
r = await q(`select rating, reviews_count from public.defarko_providers where id='${provId}'`);
ok(Number(r[0].rating) === 5 && r[0].reviews_count === 1, "note et nombre d'avis mis à jour automatiquement");
r = await q(`select comment from public.defarko_reviews where provider_id='${provId}'`);
ok(r.length === 1, "les avis sont visibles publiquement (sans compte)");
await asUser(P.id);
e = await fails(() => q(`select public.defarko_add_review('${reqId}', 1, 'x')`));
ok(e && /introuvable/i.test(e), "l'ouvrier ne peut pas s'écrire un avis");
e = await fails(() => db.exec(`insert into public.defarko_reviews (request_id, provider_id, client_id, author_name, rating) values ('${reqId}','${provId}','${C.id}','x',5)`));
ok(e && /permission denied/i.test(e), "aucun avis ne peut être inséré directement");

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
