#!/usr/bin/env node
/* eslint-disable no-console */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function parseArgs(argv) {
  const args = {
    dryRun: false,
    only: null, // Set<string> | null
    pageSize: 500,
    batchMax: 400,
    logEvery: 1000,
  };

  for (const raw of argv) {
    if (raw === "--dry-run") args.dryRun = true;
    else if (raw.startsWith("--only=")) {
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
      // handled by main
      args.help = true;
    }
  }

  return args;
}

function initAdmin() {
  if (admin.apps?.length) return;

  const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    // Local/dev: pinned service account file in repo root.
    // (Kept consistent with existing migration scripts in this repo.)
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }

  // Production/CI: rely on GOOGLE_APPLICATION_CREDENTIALS or workload identity.
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

function nowIso() {
  return new Date().toISOString();
}

function pickMigrationPatch(data, pairs) {
  // pairs: [{ from: "buyerId", to: "buyerUid" }, ...]
  const patch = {};

  let alreadyMigratedCount = 0;
  let migratedCount = 0;
  let missingBothCount = 0;

  for (const { from, to } of pairs) {
    const hasTo = data?.[to] !== undefined && data?.[to] !== null && data?.[to] !== "";
    const hasFrom = data?.[from] !== undefined && data?.[from] !== null && data?.[from] !== "";

    if (hasTo) {
      alreadyMigratedCount++;
      continue; // never overwrite
    }

    if (hasFrom) {
      patch[to] = data[from];
      migratedCount++;
    } else {
      missingBothCount++;
    }
  }

  return { patch, alreadyMigratedCount, migratedCount, missingBothCount };
}

async function migrateCollection({ db, name, pairs, args }) {
  const startedAt = Date.now();

  const stats = {
    collection: name,
    scanned: 0,
    updatedDocs: 0,
    skippedDocs: 0,
    missingBothDocs: 0,
    missingBothFields: 0,
    alreadyMigratedFields: 0,
    migratedFields: 0,
    commits: 0,
    writeOps: 0,
    dryRun: Boolean(args.dryRun),
  };

  console.log(`[${nowIso()}] ${name}: start (dryRun=${stats.dryRun})`);

  let lastDoc = null;

  // batch state
  let batch = db.batch();
  let opsInBatch = 0;

  async function maybeCommit(reason) {
    if (opsInBatch === 0) return;
    stats.commits += 1;
    stats.writeOps += opsInBatch;

    if (args.dryRun) {
      console.log(
        `[${nowIso()}] ${name}: DRY-RUN would commit ${opsInBatch} ops (commit #${stats.commits}, reason=${reason})`
      );
    } else {
      await batch.commit();
      console.log(
        `[${nowIso()}] ${name}: committed ${opsInBatch} ops (commit #${stats.commits}, reason=${reason})`
      );
    }

    batch = db.batch();
    opsInBatch = 0;
  }

  while (true) {
    let q = db.collection(name).orderBy(admin.firestore.FieldPath.documentId()).limit(args.pageSize);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();

    if (snap.empty) break;

    for (const doc of snap.docs) {
      stats.scanned += 1;
      const data = doc.data() || {};

      const { patch, alreadyMigratedCount, migratedCount, missingBothCount } = pickMigrationPatch(data, pairs);

      stats.alreadyMigratedFields += alreadyMigratedCount;
      stats.migratedFields += migratedCount;
      stats.missingBothFields += missingBothCount;

      if (migratedCount === 0) {
        // Nothing to write. Track skipped + "missing both" at doc level.
        stats.skippedDocs += 1;
        if (missingBothCount === pairs.length) stats.missingBothDocs += 1;
      } else {
        batch.update(doc.ref, patch);
        opsInBatch += 1;
        stats.updatedDocs += 1;
      }

      if (opsInBatch >= args.batchMax) {
        await maybeCommit("batch-max");
      }

      if (stats.scanned % args.logEvery === 0) {
        console.log(
          `[${nowIso()}] ${name}: progress scanned=${stats.scanned} updatedDocs=${stats.updatedDocs} skippedDocs=${stats.skippedDocs} missingBothDocs=${stats.missingBothDocs}`
        );
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
  }

  await maybeCommit("final");

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[${nowIso()}] ${name}: done scanned=${stats.scanned} updatedDocs=${stats.updatedDocs} skippedDocs=${stats.skippedDocs} missingBothDocs=${stats.missingBothDocs} commits=${stats.commits} writeOps=${stats.writeOps} elapsedMs=${elapsedMs}`
  );

  if (stats.missingBothDocs > 0) {
    console.log(
      `[${nowIso()}] ${name}: NOTE ${stats.missingBothDocs} docs missing ALL legacy+uid fields for configured pairs`
    );
  }

  return stats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Usage:
  node scripts/migrate_uids.js [--dry-run] [--only=matches,listings,requests,reviews] [--page-size=500] [--batch-max=400] [--log-every=1000]

Notes:
  - Idempotent: never overwrites existing buyerUid/sellerUid.
  - Does NOT delete old buyerId/sellerId fields.
  - Batch writes capped at 400 ops per commit.
`);
    process.exit(0);
  }

  initAdmin();
  const db = admin.firestore();

  const migrations = [
    {
      name: "matches",
      pairs: [
        { from: "buyerId", to: "buyerUid" },
        { from: "sellerId", to: "sellerUid" },
      ],
    },
    { name: "listings", pairs: [{ from: "sellerId", to: "sellerUid" }] },
    { name: "requests", pairs: [{ from: "buyerId", to: "buyerUid" }] },
    { name: "reviews", pairs: [{ from: "buyerId", to: "buyerUid" }] },
  ];

  const selected = args.only ? migrations.filter((m) => args.only.has(m.name)) : migrations;
  const selectedNames = selected.map((m) => m.name).join(", ");

  console.log(`[${nowIso()}] migrate_uids: starting collections=[${selectedNames || ""}]`);
  console.log(
    `[${nowIso()}] migrate_uids: settings dryRun=${args.dryRun} pageSize=${args.pageSize} batchMax=${args.batchMax} logEvery=${args.logEvery}`
  );

  const totals = {
    scanned: 0,
    updatedDocs: 0,
    skippedDocs: 0,
    missingBothDocs: 0,
    commits: 0,
    writeOps: 0,
    migratedFields: 0,
    alreadyMigratedFields: 0,
    missingBothFields: 0,
  };

  for (const m of selected) {
    // eslint-disable-next-line no-await-in-loop
    const s = await migrateCollection({ db, name: m.name, pairs: m.pairs, args });
    totals.scanned += s.scanned;
    totals.updatedDocs += s.updatedDocs;
    totals.skippedDocs += s.skippedDocs;
    totals.missingBothDocs += s.missingBothDocs;
    totals.commits += s.commits;
    totals.writeOps += s.writeOps;
    totals.migratedFields += s.migratedFields;
    totals.alreadyMigratedFields += s.alreadyMigratedFields;
    totals.missingBothFields += s.missingBothFields;
  }

  console.log(
    `[${nowIso()}] migrate_uids: summary scanned=${totals.scanned} updatedDocs=${totals.updatedDocs} skippedDocs=${totals.skippedDocs} missingBothDocs=${totals.missingBothDocs} commits=${totals.commits} writeOps=${totals.writeOps}`
  );
  console.log(
    `[${nowIso()}] migrate_uids: fieldSummary migratedFields=${totals.migratedFields} alreadyMigratedFields=${totals.alreadyMigratedFields} missingBothFields=${totals.missingBothFields}`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(`[${nowIso()}] migrate_uids failed:`, err);
  process.exit(1);
});

