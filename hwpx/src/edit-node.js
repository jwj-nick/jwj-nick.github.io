// Node-targeted text editing — powers in-place editing in the viewer.
//
// Edits are applied by splicing the ORIGINAL section XML string at the
// source offsets recorded by buildXmlTree, so every byte outside the edit
// points stays untouched (minimum validity risk). After any edit the
// section's linesegarray caches are stripped (see src/edit.js rationale).
//
// Edit target kinds (by the element the path points at):
//   t   → its text content is replaced
//   run → a new <t> holding the text is appended inside
//   p   → a new <run charPrIDRef=…><t>…</t></run> is appended inside
//         (for empty paragraphs that have no run at all)
// '\n' in the text becomes <…:lineBreak/> (soft line break).

import { buildXmlTree, findByPath, localName, isElement, textContent } from './xml-tree.js';
import { encodeEntities } from './xml.js';
import { stripLineSegArrays } from './edit.js';

function nsPrefix(name) {
  const i = name.indexOf(':');
  return i < 0 ? '' : name.slice(0, i + 1); // e.g. "hp:"
}

function textToXml(text, pfx) {
  return text.split('\n').map(encodeEntities).join(`<${pfx}lineBreak/>`);
}

/**
 * @param {string} sectionXml
 * @param {Array<{path: number[], text: string}>} edits paths are element-index
 *   paths from the document root (node.path of buildXmlTree)
 * @param {{charPrIDRef?: string}} [opts] char style for newly created runs
 * @returns {string} edited section XML (linesegarray stripped)
 */
export function applyTextEdits(sectionXml, edits, { charPrIDRef = '0' } = {}) {
  if (!edits.length) return sectionXml;
  const root = buildXmlTree(sectionXml);
  const splices = [];

  for (const edit of edits) {
    const node = findByPath(root, edit.path);
    if (!node || !isElement(node)) {
      throw new Error(`edit target not found at path ${edit.path.join('.')}`);
    }
    const kind = localName(node.name);
    const pfx = nsPrefix(node.name);
    const xmlText = textToXml(edit.text, pfx);

    if (kind === 't') {
      if (node.selfClosing) {
        const open = `<${node.name}${node.rawAttrs ? ' ' + node.rawAttrs : ''}>`;
        splices.push({ start: node.openStart, end: node.closeEnd, insert: `${open}${xmlText}</${node.name}>` });
      } else {
        splices.push({ start: node.contentStart, end: node.contentEnd, insert: xmlText });
      }
    } else if (kind === 'run') {
      if (node.selfClosing) throw new Error('cannot edit a self-closing run');
      splices.push({ start: node.contentEnd, end: node.contentEnd, insert: `<${pfx}t>${xmlText}</${pfx}t>` });
    } else if (kind === 'p') {
      if (node.selfClosing) throw new Error('cannot edit a self-closing paragraph');
      // reuse an existing text-less run if the paragraph has one — its
      // charPr is exactly the style the author left there
      const emptyRun = node.children.find(
        (c) => isElement(c) && localName(c.name) === 'run' && !c.selfClosing &&
          !c.children.some((g) => isElement(g) && (localName(g.name) === 'secPr' || localName(g.name) === 't')),
      );
      if (emptyRun) {
        splices.push({ start: emptyRun.contentEnd, end: emptyRun.contentEnd, insert: `<${pfx}t>${xmlText}</${pfx}t>` });
      } else {
        // inherit char style from the nearest run in document order,
        // then per-edit override, then the opts default
        const inherited = edit.charPrIDRef ?? inheritCharPr(root, edit.path) ?? charPrIDRef;
        splices.push({
          start: node.contentEnd,
          end: node.contentEnd,
          insert: `<${pfx}run charPrIDRef="${inherited}"><${pfx}t>${xmlText}</${pfx}t></${pfx}run>`,
        });
      }
    } else {
      throw new Error(`unsupported edit target <${node.name}> (expected t/run/p)`);
    }
  }

  // apply back-to-front so earlier offsets stay valid
  splices.sort((a, b) => b.start - a.start);
  let out = sectionXml;
  let prevStart = Infinity;
  for (const s of splices) {
    if (s.end > prevStart) throw new Error('overlapping edits');
    out = out.slice(0, s.start) + s.insert + out.slice(s.end);
    prevStart = s.start;
  }
  return stripLineSegArrays(out);
}

function cmpPath(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

/** Nearest run's charPrIDRef in document order, preferring the one just before the path. */
function inheritCharPr(root, path) {
  const runs = [];
  (function walkNode(n) {
    for (const c of n.children) {
      if (!isElement(c)) continue;
      if (localName(c.name) === 'run' && c.attrs.charPrIDRef != null) runs.push(c);
      walkNode(c);
    }
  })(root);
  if (!runs.length) return null;
  let best = null;
  for (const r of runs) {
    if (cmpPath(r.path, path) < 0) best = r;
    else break;
  }
  return (best ?? runs[0]).attrs.charPrIDRef;
}

/**
 * Find & replace that works across run boundaries: each paragraph's t-texts
 * are concatenated for matching; a match spanning several runs puts the whole
 * replacement into the first covered run (the tail runs' covered text is
 * removed). t-elements containing markers (markpen, field anchors, tabs…)
 * take part in matching but are never modified — a match touching one is
 * skipped and reported in `skipped`.
 *
 * @returns {{xml: string, count: number, skipped: number}}
 */
export function replaceTextAcrossRuns(sectionXml, search, replace) {
  if (!search) throw new Error('search string must not be empty');
  const root = buildXmlTree(sectionXml);
  const edits = [];
  let count = 0;
  let skipped = 0;

  for (const p of collectParagraphs(root)) {
    const segs = [];
    collectTs(p, segs);
    if (!segs.length) continue;
    const concat = segs.map((s) => s.text).join('');
    if (!concat.includes(search)) continue;

    const starts = [];
    let acc = 0;
    for (const s of segs) {
      starts.push(acc);
      acc += s.text.length;
    }
    const ownerOf = (pos) => {
      let k = segs.length - 1;
      while (k > 0 && starts[k] > pos) k--;
      return k;
    };

    const outs = segs.map(() => '');
    let changed = false;
    let i = 0;
    while (i < concat.length) {
      if (concat.startsWith(search, i)) {
        const first = ownerOf(i);
        const last = ownerOf(i + search.length - 1);
        let mutable = true;
        for (let k = first; k <= last; k++) {
          if (!segs[k].mutable) {
            mutable = false;
            break;
          }
        }
        if (mutable) {
          outs[first] += replace;
          i += search.length;
          changed = true;
          count++;
          continue;
        }
        skipped++;
      }
      outs[ownerOf(i)] += concat[i];
      i++;
    }
    if (!changed) continue;
    for (let k = 0; k < segs.length; k++) {
      if (segs[k].mutable && outs[k] !== segs[k].text) {
        edits.push({ path: segs[k].node.path, text: outs[k] });
      }
    }
  }

  return { xml: edits.length ? applyTextEdits(sectionXml, edits) : sectionXml, count, skipped };
}

function collectParagraphs(root, out = []) {
  for (const c of root.children) {
    if (!isElement(c)) continue;
    if (localName(c.name) === 'p') out.push(c);
    collectParagraphs(c, out);
  }
  return out;
}

/** t-elements of a paragraph in order, NOT descending into nested paragraphs. */
function collectTs(node, segs) {
  for (const c of node.children) {
    if (!isElement(c)) continue;
    const ln = localName(c.name);
    if (ln === 'p') continue; // nested (table cell) paragraphs are their own units
    if (ln === 't') {
      const complex = c.children.some((g) => isElement(g));
      segs.push({ node: c, text: complex ? textContent(c) : (c.children[0]?.text ?? ''), mutable: !complex });
    } else {
      collectTs(c, segs);
    }
  }
}
