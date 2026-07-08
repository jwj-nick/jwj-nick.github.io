// Phase 2 editor core — text replacement + valid re-save.
//
// Editing rules (docs/format-notes.md "Phase 2 3대 함정"):
// 1. Any paragraph whose text changed must lose its hp:linesegarray
//    (stale line-layout cache triggers Hangul's "document corrupted/tampered"
//    warning; Hangul recalculates when it is absent — official Hancom answer).
//    We strip ALL linesegarrays in a modified section: always safe, Hangul
//    just re-lays-out the whole section.
// 2. mimetype stays the first, uncompressed zip entry (rebuildHwpx).
// 3. We only touch hp:t text — charPrIDRef/paraPrIDRef references stay
//    untouched, so header.xml ID integrity is preserved by construction.

import { decodeEntities, encodeEntities } from './xml.js';
import { writeZip } from './zip-write.js';

/**
 * Replace text inside <hp:t> elements of a section XML string.
 * v1 scope: only t-elements with pure text content (no nested markpen/field
 * markers) are edited; others are left untouched.
 *
 * @returns {{xml: string, count: number}} count = number of t-elements changed
 */
export function replaceSectionText(sectionXml, search, replace) {
  if (!search) throw new Error('search string must not be empty');
  let count = 0;
  const out = sectionXml.replace(
    /(<([\w.-]+):t(?:\s[^>]*)?>)([\s\S]*?)(<\/\2:t>)/g,
    (match, open, _prefix, inner, close) => {
      if (inner.includes('<')) return match; // nested elements — skip in v1
      const text = decodeEntities(inner);
      if (!text.includes(search)) return match;
      count++;
      return open + encodeEntities(text.split(search).join(replace)) + close;
    },
  );
  return { xml: count > 0 ? stripLineSegArrays(out) : sectionXml, count };
}

/** Remove all line-layout caches (<hp:linesegarray>) from a section XML. */
export function stripLineSegArrays(xml) {
  return xml
    .replace(/<([\w.-]+):linesegarray\b[^>]*\/>/g, '')
    .replace(/<([\w.-]+):linesegarray\b[^>]*>[\s\S]*?<\/\1:linesegarray>/g, '');
}

/**
 * Rebuild a complete .hwpx from an open document, substituting the given
 * entries. Keeps original entry order; mimetype first and uncompressed.
 *
 * @param {import('./hwpx.js').HwpxDocument} doc
 * @param {Map<string, string|Uint8Array>} replacements zip entry name → new content
 * @returns {Promise<Uint8Array>}
 */
export async function rebuildHwpx(doc, replacements = new Map()) {
  const names = doc.zip.names();
  const ordered = names.includes('mimetype')
    ? ['mimetype', ...names.filter((n) => n !== 'mimetype')]
    : names;
  const files = [];
  for (const name of ordered) {
    const data = replacements.has(name) ? replacements.get(name) : await doc.zip.read(name);
    files.push({ name, data, store: name === 'mimetype' });
  }
  return writeZip(files);
}

/**
 * High-level: replace text across all sections of a document.
 * @returns {Promise<{bytes: Uint8Array, count: number}>} new .hwpx + replacement count
 */
export async function replaceTextInHwpx(doc, search, replace) {
  const replacements = new Map();
  let count = 0;
  for (const path of doc.sectionPaths) {
    const res = replaceSectionText(await doc.zip.readText(path), search, replace);
    if (res.count > 0) {
      replacements.set(path, res.xml);
      count += res.count;
    }
  }
  const bytes = await rebuildHwpx(doc, replacements);
  return { bytes, count };
}
