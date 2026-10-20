#!/usr/bin/env node
// Copies packages/schema/src into supabase/functions/_shared/schema so Edge Functions
// bundle the exact same validation code the browser runs. Run automatically by the
// functions:* scripts. The destination is generated and gitignored.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "packages/schema/src");
const dest = join(root, "supabase/functions/_shared/schema");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`synced ${src} -> ${dest}`);
