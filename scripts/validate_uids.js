#!/usr/bin/env node
/* eslint-disable no-console */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function parseArgs(argv) {
  const args = {
    only: null, // Set<string> | null
    pageSize: 500,
    logEvery: 2000,
    sampleLimit: 10,
  };

  for (const raw of argv) {
    if (raw.startsWith("--only=")) {
      const list = raw.slice("--only=".length).trim();
      args.only = new Set(list.split(",").map((s) => s.trim()).filter(Boolean));
    } else if (raw.startsWith("--page-size=")) {
      const n = Number(raw.slice("--page-size=".length));
      if (Number.isFinite(n) && n > 0) args.pageSize = Math.floor(n);
    } else if (raw.startsWith("--log-every=")) {
      const n = Number(raw.slice("--log-every=".length));
      if (Number.isFinite(n) && n > 0) args.logEvery = Math.floor(n);
    } else if (raw.startsWith("--sample-limit=")) {
      const n = Number(raw.slice("--sample-limit=".length));
      if (Number.isFinite(n) && n >= 0) args.sampleLimit = Math.floor(n);
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

function nowIso() {
  return new Date().toISOString();
}

function isPresent(v) {
  return v !== undefined && v !== null && v !== "";
}

function pushSample(samples, key, sample, limit) {
  if (limit <= 0) return;
  if (!samples[key]) samples[key] = [];
  if (samples[key].length >= limit) return;
  samples[key].push(sample);
}

function validateDoc({ collection, docId, data, requiredUidFields, sampleLimit, samples, counts }) {
  // counts is mutated; samples is mutated
  let anyIssue = false;

  // Strict-only checks: require UID fields, and optionally flag legacy fields if present.
  for (const uidField of requiredUidFields) {
    const uid = data?.[uidField];
    const hasUid = isPresent(uid);

    if (!hasUid) {
      counts.missingUidFields += 1;
      anyIssue = true;
      pushSample(samples, "missing_uid", { collection, docId, field: uidField, uid }, sampleLimit);
    }
  }

  // Flag legacy identity fields if they still exist in data
  const legacyFieldsPresent = [];
  for (const f of ["buyerId", "sellerId"]) {
    if (Object.prototype.hasOwnProperty.call(data || {}, f)) legacyFieldsPresent.push(f);
  }
  if (legacyFieldsPresent.length) {
    counts.legacyFieldsPresentDocs += 1;
    anyIssue = true;
    pushSample(
      samples,
      "legacy_present",
      { collection, docId, legacyFields: legacyFieldsPresent },
      sampleLimit
    );
  }

  if (anyIssue) counts.corruptedDocs += 1;
}

async function scanCollection({ db, name, requiredUidFields, args }) {
  const startedAt = Date.now();

  const counts = {
    collection: name,
    scannedDocs: 0,
    corruptedDocs: 0,

    // Field-level counts (most precise for requirements)
    missingUidFields: 0,
    legacyFieldsPresentDocs: 0,
  };

  const samples = {
    missing_uid: [],
    legacy_present: [],
  };

  console.log(`[${nowIso()}] ${name}: scan start`);

  let lastDoc = null;

  while (true) {
    let q = db.collection(name).orderBy(admin.firestore.FieldPath.documentId()).limit(args.pageSize);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      counts.scannedDocs += 1;
      validateDoc({
        collection: name,
        docId: doc.id,
        data: doc.data() || {},
        requiredUidFields,
        sampleLimit: args.sampleLimit,
        samples,
        counts,
      });

      if (args.logEvery > 0 && counts.scannedDocs % args.logEvery === 0) {
        console.log(
          `[${nowIso()}] ${name}: progress scanned=${counts.scannedDocs} corrupted=${counts.corruptedDocs} missingUidFields=${counts.missingUidFields} legacyFieldsPresentDocs=${counts.legacyFieldsPresentDocs}`
        );
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
  }

  const elapsedMs = Date.now() - startedAt;

  console.log(
    `[${nowIso()}] ${name}: scan done scanned=${counts.scannedDocs} corrupted=${counts.corruptedDocs} missingUidFields=${counts.missingUidFields} legacyFieldsPresentDocs=${counts.legacyFieldsPresentDocs} elapsedMs=${elapsedMs}`
  );

  return { counts, samples };
}

function printSamples(title, arr) {
  if (!arr?.length) return;
  console.log(`\n${title} (showing ${arr.length}):`);
  for (const s of arr) console.log(`- ${JSON.stringify(s)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Usage:
  node scripts/validate_uids.js [--only=matches,listings,requests,reviews] [--page-size=500] [--log-every=2000] [--sample-limit=10]

Read-only validator (no writes).

Checks:
  1) Missing required UID fields (strict schema)
  2) Legacy identity fields still present: buyerId/sellerId (should be removed)
`);
    process.exit(0);
  }

  initAdmin();
  const db = admin.firestore();

  const targets = [
    {
      name: "matches",
      requiredUidFields: ["buyerUid", "sellerUid"],
    },
    { name: "listings", requiredUidFields: ["sellerUid"] },
    { name: "requests", requiredUidFields: ["buyerUid"] },
    { name: "reviews", requiredUidFields: ["buyerUid"] },
  ];

  const selected = args.only ? targets.filter((t) => args.only.has(t.name)) : targets;

  console.log(`[${nowIso()}] validate_uids: start collections=[${selected.map((s) => s.name).join(", ")}]`);
  console.log(
    `[${nowIso()}] validate_uids: settings pageSize=${args.pageSize} logEvery=${args.logEvery} sampleLimit=${args.sampleLimit}`
  );

  const totals = {
    scannedDocs: 0,
    corruptedDocs: 0,
    missingUidFields: 0,
    legacyFieldsPresentDocs: 0,
  };

  const combinedSamples = {
    missing_uid: [],
    legacy_present: [],
  };

  for (const t of selected) {
    // eslint-disable-next-line no-await-in-loop
    const { counts, samples } = await scanCollection({ db, name: t.name, requiredUidFields: t.requiredUidFields, args });
    totals.scannedDocs += counts.scannedDocs;
    totals.corruptedDocs += counts.corruptedDocs;
    totals.missingUidFields += counts.missingUidFields;
    totals.legacyFieldsPresentDocs += counts.legacyFieldsPresentDocs;

    for (const k of Object.keys(combinedSamples)) {
      for (const s of samples[k] || []) {
        if (combinedSamples[k].length < args.sampleLimit) combinedSamples[k].push(s);
      }
    }
  }

  console.log(
    `\n[${nowIso()}] validate_uids: TOTAL scannedDocs=${totals.scannedDocs} corruptedDocs=${totals.corruptedDocs}`
  );
  console.log(`[${nowIso()}] validate_uids: missingUidFields=${totals.missingUidFields} (expected 0)`);
  console.log(`[${nowIso()}] validate_uids: legacyFieldsPresentDocs=${totals.legacyFieldsPresentDocs} (expected 0)`);

  printSamples("Sample: missing UID fields", combinedSamples.missing_uid);
  printSamples("Sample: legacy identity fields present", combinedSamples.legacy_present);

  const ok =
    totals.missingUidFields === 0 && totals.legacyFieldsPresentDocs === 0;

  if (!ok) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[${nowIso()}] validate_uids failed:`, err);
  process.exit(2);
});

