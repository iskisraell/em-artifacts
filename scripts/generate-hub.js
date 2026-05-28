#!/usr/bin/env bun

/**
 * Hub indexer for Eletromidia Artifacts.
 * Scans YYYY-MM-DD-slug/ directories for metadata.json files
 * and rebuilds the root index.html with all artifacts.
 *
 * Usage: bun run scripts/generate-hub.js
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const HUB_TEMPLATE = join(ROOT, "scripts", "hub-template.html");
const INDEX_OUT = join(ROOT, "index.html");

function collectArtifacts() {
  const dirs = readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}-/.test(d.name))
    .map((d) => d.name);

  const artifacts = [];

  for (const dir of dirs) {
    const metaPath = join(ROOT, dir, "metadata.json");
    if (!existsSync(metaPath)) {
      console.warn(`[WARN] No metadata.json in ${dir}, skipping`);
      continue;
    }

    const raw = readFileSync(metaPath, "utf-8");
    let meta;
    try {
      meta = JSON.parse(raw);
    } catch {
      console.warn(`[WARN] Invalid metadata.json in ${dir}, skipping`);
      continue;
    }

    // Validate required fields
    if (!meta.title || !meta.date) {
      console.warn(`[WARN] Missing title or date in ${dir}/metadata.json, skipping`);
      continue;
    }

    artifacts.push({
      slug: dir,
      title: meta.title,
      date: meta.date,
      description: meta.description || "",
      tags: meta.tags || [],
      sections: meta.sections || [],
    });
  }

  // Sort newest first
  artifacts.sort((a, b) => b.date.localeCompare(a.date));

  return artifacts;
}

function buildHub(artifacts) {
  const template = readFileSync(HUB_TEMPLATE, "utf-8");
  const json = JSON.stringify(artifacts, null, 6);
  // Replace the empty array with actual data
  const output = template.replace(
    /var artifacts = \[[\s\S]*?\];/,
    `var artifacts = ${json};`
  );
  return output;
}

function main() {
  console.log("[generate-hub] Scanning for artifacts...");
  const artifacts = collectArtifacts();
  console.log(`[generate-hub] Found ${artifacts.length} artifact(s)`);

  const html = buildHub(artifacts);
  writeFileSync(INDEX_OUT, html, "utf-8");
  console.log(`[generate-hub] Wrote index.html (${html.length} bytes)`);
}

main();
