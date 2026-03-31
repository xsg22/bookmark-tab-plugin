import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function readManifest() {
  return JSON.parse(readProjectFile('manifest.json'));
}

test('manifest no longer overrides the Chrome new tab page', () => {
  const manifest = readManifest();

  // The extension must keep a single-purpose shortcut search flow.
  assert.equal(manifest.chrome_url_overrides, undefined);
});

test('manifest metadata describes a command palette instead of a new tab experience', () => {
  const manifest = readManifest();
  const metadataFields = [
    manifest.name,
    manifest.description,
    manifest.action?.default_title
  ].filter(Boolean);

  metadataFields.forEach((field) => {
    // Guard against store-facing strings drifting back to "new tab" wording.
    assert.equal(/new tab|新标签页/i.test(field), false);
  });
});

test('background script no longer references the retired newtab page fallback', () => {
  const backgroundSource = readProjectFile('background.js');

  // Injection failure should not reopen the removed new-tab surface.
  assert.equal(backgroundSource.includes('newtab.html'), false);
});
