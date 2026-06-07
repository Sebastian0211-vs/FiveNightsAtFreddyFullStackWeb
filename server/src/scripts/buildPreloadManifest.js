// ============================================================
//  buildPreloadManifest.js — generate the gameplay preload list
//
//  Walks the asset folders the standalone game (MainRoom) pulls from at
//  runtime and writes assets/preload-manifest.json: a flat array of
//  "/assets/<relative path>" URLs that preload.js warms before a night starts.
//
//  Run AFTER the assets are in place (folder casing must match the live files):
//      npm run manifest
//
//  Tip: to shrink the first-load download, remove heavy folders from FOLDERS
//  below (e.g. drop 'FNaF 1 Audio' to skip ~94 MB of sound) and re-run.
// ============================================================
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dirname, '../../..'); // project root
const ASSETS = path.join(ROOT, 'assets');

// Folders the game requests at runtime, using the SAME casing as the code
// (so the warmed cache key matches the game's later request). 'Menu' is left
// out on purpose: the menu noise frames are already preloaded in MainRoom.html
// and the code requests them lowercase, which would be a different cache key.
const FOLDERS = [
    'Main Room', 'Cam_views', 'Battery', 'Door_Buttons',
    'Bonnie', 'Chica', 'Foxy', 'Freddy', 'Golden Freddy',
    'Map', 'Tablette', 'Text_Box', 'artifacts',
    'door_left', 'door_right', 'ventilateur',
    'FNaF 1 Audio',
];

const EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.wav', '.mp3', '.ogg',
    '.otf', '.ttf', '.woff', '.woff2',
]);

async function walk(dir, out) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return; } // folder absent — skip silently
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            await walk(full, out);
        } else if (EXTS.has(path.extname(e.name).toLowerCase())) {
            const rel = path.relative(ASSETS, full).split(path.sep).join('/');
            out.push('/assets/' + rel);
        }
    }
}

const out = [];
for (const f of FOLDERS) await walk(path.join(ASSETS, f), out);

const dest = path.join(ASSETS, 'preload-manifest.json');
await fs.writeFile(dest, JSON.stringify(out));
console.log(`Wrote ${out.length} entries to ${path.relative(ROOT, dest)}`);
