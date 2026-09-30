// Spec §4.5: the logo mark animates only when the visitor has not asked for reduced motion.
// The global reduce kill-switch is a backstop; the rules themselves must live inside
// @media (prefers-reduced-motion: no-preference), so a browser that honours the query never sees them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Every `{ … }` block in the stylesheet, found by brace-depth matching. Comments are blanked
// (offsets preserved) and quoted strings are skipped so a brace inside either can't miscount.
function cssBlocks(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length));
  const blocks = [];
  const open = [];
  let preludeStart = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const end = css.indexOf(ch, i + 1);
      assert.notEqual(end, -1, `unterminated string at offset ${i}`);
      i = end;
    } else if (ch === '{') {
      open.push({ prelude: css.slice(preludeStart, i).trim(), start: i });
      preludeStart = i + 1;
    } else if (ch === '}') {
      const block = open.pop();
      assert.ok(block, `unbalanced "}" at offset ${i}`);
      blocks.push({ ...block, end: i, body: css.slice(block.start + 1, i) });
      preludeStart = i + 1;
    } else if (ch === ';') {
      preludeStart = i + 1;
    }
  }
  assert.equal(open.length, 0, 'unbalanced "{"');
  return blocks;
}

const NO_PREFERENCE = /^@media\b[^{]*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/i;
const inside = (inner, outer) => outer.start < inner.start && inner.end < outer.end;

async function motionBlocks() {
  const blocks = cssBlocks(await readFile('site/assets/css/site.css', 'utf8'));
  const guards = blocks.filter((b) => NO_PREFERENCE.test(b.prelude));
  assert.ok(guards.length > 0, 'site.css has at least one @media (prefers-reduced-motion: no-preference) block');
  const unguarded = (b) => !guards.some((g) => inside(b, g));
  return { blocks, unguarded };
}

test('every mark-* @keyframes sits inside @media (prefers-reduced-motion: no-preference)', async () => {
  const { blocks, unguarded } = await motionBlocks();
  const keyframes = blocks.filter((b) => /^@(?:-webkit-)?keyframes\s+mark-/i.test(b.prelude));
  assert.ok(keyframes.length >= 12, `expected the 12 mark keyframes (6 load + 6 replay), found ${keyframes.length}`);
  assert.deepEqual(keyframes.filter(unguarded).map((b) => b.prelude), []);
});

test('every .mark rule that declares an animation sits inside @media (prefers-reduced-motion: no-preference)', async () => {
  const { blocks, unguarded } = await motionBlocks();
  const animated = blocks.filter(
    (b) => !b.prelude.startsWith('@') && b.prelude.includes('.mark') && /\banimation\b/i.test(b.body),
  );
  assert.ok(animated.length >= 12, `expected the 6 load and 6 hover/focus mark rules, found ${animated.length}`);
  assert.deepEqual(animated.filter(unguarded).map((b) => b.prelude.replace(/\s+/g, ' ')), []);
});
