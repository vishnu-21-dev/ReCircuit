#!/usr/bin/env node
/* eslint-disable no-console */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = {
    only: null, // Set<string> | null
    pageSize: 500,
    batchMax: 400,
    logEvery: 1000,
  };

  for (const raw of argv) {
    if (raw.startsWith("--only=")) {
      const list = raw.slice("--only=".length).trim();
      args.only = new Set(list.split(",").map((s) => s.trim()).filter(Boolean));
    } else if (raw.startsWith("--page-size=")) {
      const n = Number(raw.slice("--page-size=".length));
      if (Number.isFinite(n) && n > 0) args.pageSize = Math.floor(n);
    } else if (raw.startsWith("--batch-max=")) {
      const n = Number(raw.slice("--batch-max=".length));
      if (Number.isFinite(n) && n > 0) args.batchMax = Math.min(400, Math.floor(n));
    } else if (raw.startsWith("--log-every=")) {
      const n = Number(raw.slice("--log-every=".length));
      if (Number.isFinite(n) && n > 0) args.logEvery = Math.floor(n);
    } else if (raw === "--help" || raw === "-h") {
      args.help = true;
    }
  }

  return args;
}

function initAdmin() {
  if (admin.apps?.length) return;

  const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

async function deleteQueryInBatches({ db, query, batchMax, logEvery, label }) {
  let deleted = 0;
  let commits = 0;
  let lastDoc = null;

  while (true) {
    let q = query;
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops += 1;
      deleted += 1;

      if (ops >= batchMax) {
        await batch.commit();
        commits += 1;
        batch = db.batch();
        ops = 0;
      }

      if (logEvery > 0 && deleted % logEvery === 0) {
        console.log(`[${nowIso()}] ${label}: deleted=${deleted} commits=${commits}`);
      }
    }

    if (ops > 0) {
      await batch.commit();
      commits += 1;
    }

    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return { deleted, commits };
}

async function clearSubcollection({ db, parentDocRef, subcollectionName, args, parentLabel }) {
  const colRef = parentDocRef.collection(subcollectionName);
  const query = colRef.orderBy(admin.firestore.FieldPath.documentId()).limit(args.pageSize);
  const label = `${parentLabel}/${subcollectionName}`;

  return await deleteQueryInBatches({
    db,
    query,
    batchMax: args.batchMax,
    logEvery: args.logEvery,
    label,
  });
}

async function clearCollection({ db, name, args, subcollections = [] }) {
  const startedAt = Date.now();
  console.log(`[${nowIso()}] ${name}: clearing start`);

  let clearedDocs = 0;
  let clearedCommits = 0;
  let lastDoc = null;
  let scanned = 0;
  let subDeletes = 0;

  const colRef = db.collection(name);

  while (true) {
    let q = colRef.orderBy(admin.firestore.FieldPath.documentId()).limit(args.pageSize);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      scanned += 1;

      // Clear subcollections first (Firestore doesn't cascade delete).
      for (const sub of subcollections) {
        // eslint-disable-next-line no-await-in-loop
        const subRes = await clearSubcollection({
          db,
          parentDocRef: doc.ref,
          subcollectionName: sub,
          args,
          parentLabel: `${name}/${doc.id}`,
        });
        subDeletes += subRes.deleted;
      }

      batch.delete(doc.ref);
      ops += 1;
      clearedDocs += 1;

      if (ops >= args.batchMax) {
        await batch.commit();
        clearedCommits += 1;
        batch = db.batch();
        ops = 0;
      }

      if (args.logEvery > 0 && clearedDocs % args.logEvery === 0) {
        console.log(
          `[${nowIso()}] ${name}: progress deletedDocs=${clearedDocs} scanned=${scanned} subDeletes=${subDeletes} commits=${clearedCommits}`
        );
      }
    }

    if (ops > 0) {
      await batch.commit();
      clearedCommits += 1;
    }

    lastDoc = snap.docs[snap.docs.length - 1];
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[${nowIso()}] ${name}: clearing done deletedDocs=${clearedDocs} subDeletes=${subDeletes} commits=${clearedCommits} elapsedMs=${elapsedMs}`
  );
  console.log(`${name} cleared`);

  return { deletedDocs: clearedDocs, deletedSubDocs: subDeletes, commits: clearedCommits };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Usage:
  node scripts/reset_database.js [--only=listings,requests,matches,reviews] [--page-size=500] [--batch-max=400] [--log-every=1000]

Deletes ALL documents from:
  - listings
  - requests
  - matches (also deletes matches/{matchId}/messages)
  - reviews

Does NOT touch:
  - shops
  - roles
  - compatibility
`);
    process.exit(0);
  }

  initAdmin();
  const db = admin.firestore();

  const targets = [
    { name: "listings", subcollections: [] },
    { name: "requests", subcollections: [] },
    { name: "matches", subcollections: ["messages"] },
    { name: "reviews", subcollections: [] },
  ];

  const selected = args.only ? targets.filter((t) => args.only.has(t.name)) : targets;
  console.log(`[${nowIso()}] reset_database: start collections=[${selected.map((s) => s.name).join(", ")}]`);
  console.log(
    `[${nowIso()}] reset_database: settings pageSize=${args.pageSize} batchMax=${args.batchMax} logEvery=${args.logEvery}`
  );

  for (const t of selected) {
    // eslint-disable-next-line no-await-in-loop
    await clearCollection({ db, name: t.name, args, subcollections: t.subcollections });
  }

  console.log(`[${nowIso()}] reset_database: done`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[${nowIso()}] reset_database failed:`, err);
  process.exit(1);
});

