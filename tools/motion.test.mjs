// Spec §4.5: the logo mark and the hero pulse animate only when the visitor has not asked for reduced motion.
// The global reduce kill-switch is a backstop; the rules themselves must live inside
// @media (prefers-reduced-motion: no-preference), so a browser that honours the query never sees them.
// The three motion states (data-motion absent / "loop" / "paused" on <html>) must also be mutually exclusive.
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
const KEYFRAMES = /^@(?:-webkit-)?keyframes\s+((?:mark-|sch-pulse)[\w-]*)$/i;
const LAYERS = ['trace', 'bloom', 'lit', 'flare', 'node', 'beam'];
const STATE = { finite: ':root:not([data-motion])', loop: ':root[data-motion="loop"]', paused: ':root[data-motion="paused"]' };
const inside = (inner, outer) => outer.start < inner.start && inner.end < outer.end;
const squash = (s) => s.replace(/\s+/g, ' ').trim();

async function motionBlocks() {
  const blocks = cssBlocks(await readFile('site/assets/css/site.css', 'utf8'));
  const guards = blocks.filter((b) => NO_PREFERENCE.test(b.prelude));
  assert.ok(guards.length > 0, 'site.css has at least one @media (prefers-reduced-motion: no-preference) block');
  const unguarded = (b) => !guards.some((g) => inside(b, g));
  return { blocks, unguarded };
}

// The rules that declare an animation on a logo layer or on the hero pulse, with their selectors
// and the comma-separated animations of the declaration (`none` for the paused state).
function animatedRules(blocks) {
  return blocks
    .filter((b) => !b.prelude.startsWith('@') && /\.mark|\.sch-pulse/.test(b.prelude) && /\banimation\s*:/i.test(b.body))
    .map((b) => ({
      ...b,
      selectors: b.prelude.split(',').map(squash),
      animations: squash(b.body.match(/\banimation\s*:([^;]+)/i)[1]).split(/\s*,\s*/),
    }));
}

// A @keyframes block as a Map of percentage → sorted declarations. `animation-timing-function` is left out,
// because it shapes the interval that follows a stop, not the stop's own state.
function keyframeStops(blocks, name) {
  const frames = blocks.find((b) => KEYFRAMES.exec(b.prelude)?.[1] === name);
  assert.ok(frames, `@keyframes ${name} exists`);
  const stops = new Map();
  for (const stop of blocks.filter((b) => inside(b, frames))) {
    const declarations = stop.body.split(';').map(squash).filter((d) => d && !d.startsWith('animation-timing-function'));
    for (const selector of stop.prelude.split(',').map(squash)) {
      const percent = selector === 'from' ? 0 : selector === 'to' ? 100 : Number.parseFloat(selector);
      assert.ok(Number.isFinite(percent), `${name}: keyframe selector "${selector}"`);
      stops.set(percent, [...(stops.get(percent) ?? []), ...declarations].sort());
    }
  }
  return new Map([...stops].sort((a, b) => a[0] - b[0]));
}

// The value of one property at each stop that declares it, in timeline order: [[percent, value], …].
const track = (stops, property) =>
  [...stops].flatMap(([percent, declarations]) => {
    const found = declarations.find((d) => d.startsWith(`${property}:`));
    return found ? [[percent, squash(found.slice(property.length + 1))]] : [];
  });

const seconds = (animation) => Number.parseFloat(animation.match(/\b([\d.]+)s\b/)[1]);

test('every mark-* and sch-pulse @keyframes sits inside @media (prefers-reduced-motion: no-preference)', async () => {
  const { blocks, unguarded } = await motionBlocks();
  const keyframes = blocks.filter((b) => KEYFRAMES.test(b.prelude));
  const names = keyframes.map((b) => KEYFRAMES.exec(b.prelude)[1]);
  const expected = [
    ...LAYERS.flatMap((layer) => [`mark-${layer}`, `mark-${layer}-r`, `mark-${layer}-loop`]),
    'sch-pulse',
    'sch-pulse-loop',
  ];
  assert.deepEqual([...names].sort(), [...expected].sort(), 'the 18 mark keyframes (6 load + 6 replay + 6 loop) and the 2 hero pulse keyframes');
  assert.deepEqual(keyframes.filter(unguarded).map((b) => b.prelude), []);
});

test('every .mark and .sch-pulse rule that declares an animation sits inside @media (prefers-reduced-motion: no-preference)', async () => {
  const { blocks, unguarded } = await motionBlocks();
  const animated = animatedRules(blocks);
  const mark = animated.filter((b) => b.prelude.includes('.mark'));
  const pulse = animated.filter((b) => b.prelude.includes('.sch-pulse'));
  assert.ok(mark.length >= 19, `expected the 6 load, 6 hover/focus, 6 loop and the paused mark rules, found ${mark.length}`);
  assert.ok(pulse.length >= 3, `expected the finite, loop and paused hero pulse rules, found ${pulse.length}`);
  assert.deepEqual(animated.filter(unguarded).map((b) => squash(b.prelude)), []);
});

test('the three motion states are mutually exclusive: finite without data-motion, infinite only under "loop", none under "paused"', async () => {
  const { blocks } = await motionBlocks();
  const covered = { finite: new Set(), loop: new Set(), paused: new Set() };
  for (const rule of animatedRules(blocks)) {
    const label = squash(rule.prelude);
    const names = rule.animations.map((a) => a.split(' ')[0]);
    const state = names.every((n) => n === 'none') ? 'paused' : names.every((n) => n.endsWith('-loop')) ? 'loop' : 'finite';
    for (const selector of rule.selectors) {
      assert.ok(selector.startsWith(`${STATE[state]} `), `"${selector}" (${state}: ${rule.animations.join(', ')}) starts with ${STATE[state]}`);
      covered[state].add(selector.match(/\.(mark-[a-z]+|sch-pulse)$/)?.[1] ?? assert.fail(`"${selector}" ends in a mark layer or .sch-pulse`));
    }
    for (const animation of rule.animations) {
      // "forwards" (or "both") on the filtered layers leaves a Chrome filter artifact; see site.css.
      assert.doesNotMatch(animation, /\b(?:forwards|both)\b/, label);
      if (state === 'loop') assert.match(animation, /\binfinite\b/, label);
      if (state === 'finite') {
        assert.doesNotMatch(animation, /\binfinite\b|-loop\b/, label);
        const [duration, delay = 0] = [...animation.matchAll(/\b([\d.]+)s\b/g)].map((m) => Number.parseFloat(m[1]));
        const count = Number(animation.match(/\s(\d+)(?:\s|$)/)?.[1] ?? 1);
        assert.ok(delay + duration * count <= 5, `${label}: ${animation} ends within 5 s (WCAG 2.2.2)`);
      }
    }
  }
  const all = [...LAYERS.map((layer) => `mark-${layer}`), 'sch-pulse'].sort();
  for (const state of Object.keys(covered)) assert.deepEqual([...covered[state]].sort(), all, `${state} rules cover every layer and the hero pulse`);
});

test('the logo loop replays the 3.4 s scan timeline exactly, rescaled to its own cycle', async () => {
  const { blocks } = await motionBlocks();
  const rules = animatedRules(blocks);
  for (const layer of LAYERS) {
    const duration = (name) => {
      const animation = rules.flatMap((r) => r.animations).find((a) => a.startsWith(`${name} `));
      assert.ok(animation, `an animation rule uses ${name}`);
      return seconds(animation);
    };
    const scale = duration(`mark-${layer}`) / duration(`mark-${layer}-loop`);
    assert.ok(scale > 0.45 && scale < 0.6, `mark-${layer}-loop leaves room for a rest (scan is ${scale} of the cycle)`);
    const finite = keyframeStops(blocks, `mark-${layer}`);
    const loop = keyframeStops(blocks, `mark-${layer}-loop`);
    assert.deepEqual([...keyframeStops(blocks, `mark-${layer}-r`)], [...finite], `mark-${layer}-r is identical to mark-${layer}`);
    assert.deepEqual(loop.get(0), finite.get(0), `mark-${layer}-loop starts in the same state as mark-${layer}`);
    assert.deepEqual(loop.get(100), finite.get(0), `mark-${layer}-loop ends in its own start state, so the wrap-around is seamless`);
    for (const [percent, declarations] of finite) {
      if (percent === 100) continue; // the end of the scan is the start of the loop's rest; the browser tests cover it
      const scaled = Math.round(percent * scale * 1000) / 1000;
      assert.deepEqual(loop.get(scaled), declarations, `mark-${layer}-loop ${scaled}% matches mark-${layer} ${percent}%`);
    }
  }
});

test('the scan beam and the head of the lit trace stay in step, in the load, replay and loop keyframes', async () => {
  const { blocks } = await motionBlocks();
  // The trace's vertices and the node, as x in the 32-unit viewBox, keyed by the stroke-dashoffset that puts the head there.
  const HEAD_X = { 0.8212: 9.5, 0.552: 15.5, 0: 25.5 };
  for (const suffix of ['', '-r', '-loop']) {
    const sweep = track(keyframeStops(blocks, `mark-beam${suffix}`), 'transform').map(([percent, value]) => [
      percent,
      Number.parseFloat(value.match(/^translateX\(([\d.]+)px\)$/)[1]),
    ]);
    const [[startPercent, startX], [endPercent, endX]] = sweep;
    assert.deepEqual([startPercent, startX, endX], [0, 1, 31], `mark-beam${suffix} sweeps x 1 → 31 from 0%`);
    const beamX = (percent) => startX + ((endX - startX) * (percent - startPercent)) / (endPercent - startPercent);
    for (const layer of ['lit', 'bloom']) {
      const offsets = track(keyframeStops(blocks, `mark-${layer}${suffix}`), 'stroke-dashoffset');
      for (const [offset, x] of Object.entries(HEAD_X)) {
        const stop = offsets.find(([, value]) => Number(value) === Number(offset));
        assert.ok(stop, `mark-${layer}${suffix} has a stop at stroke-dashoffset ${offset}`);
        assert.ok(Math.abs(beamX(stop[0]) - x) < 0.02, `mark-${layer}${suffix}: head at x ${x} when the beam is at ${beamX(stop[0])} (${stop[0]}%)`);
      }
    }
    // The node is fully lit at the moment the head reaches it.
    const lit = track(keyframeStops(blocks, `mark-node${suffix}`), 'fill').find(([, value]) => value === 'var(--signal-node)');
    assert.ok(Math.abs(beamX(lit[0]) - 25.5) < 0.02, `mark-node${suffix} is lit when the beam reaches it (${lit[0]}%)`);
  }
});

test('the hero pulse loop keeps the dash off the path at both ends of its cycle', async () => {
  const { blocks } = await motionBlocks();
  // pathLength is 100 and the dash is 6 long: it is off the path at offset ≥ 6 (before the start) or < -100 (past the end).
  // At exactly -100 the dash starts on the path's last point and its round cap paints a dot, so the rest must be beyond it.
  const offsets = track(keyframeStops(blocks, 'sch-pulse-loop'), 'stroke-dashoffset').map(([percent, value]) => [percent, Number(value)]);
  assert.deepEqual(offsets[0], [0, 6]);
  const [endPercent, endOffset] = offsets.at(-1);
  assert.equal(endPercent, 100);
  assert.ok(endOffset <= -100.5 && endOffset >= -106, `the loop rests just past the end of the path (${endOffset})`);
  const arrival = offsets.find(([, value]) => value === endOffset)[0];
  assert.ok(arrival >= 70 && arrival <= 80, `the dash crosses the route in about 75% of the cycle, then rests (${arrival}%)`);
  const loop = animatedRules(blocks).flatMap((r) => r.animations).find((a) => a.startsWith('sch-pulse-loop '));
  assert.ok(seconds(loop) >= 3 && seconds(loop) <= 3.5, `the hero pulse cycle is about 3.2 s (${loop})`);
});

test('both pages carry the same pause control and the one-line pre-paint script right after the stylesheet links', async () => {
  const BAR = [
    '<div class="bsd-bar">',
    '<button type="button" class="motion-toggle" hidden>',
    '<svg class="motion-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path class="motion-icon-pause" d="M3 2v8M9 2v8"/><path class="motion-icon-play" d="M3.5 2l6 4-6 4z"/></svg>',
    '<span class="motion-label">Pause motion</span>',
    '</button>',
    '<p class="bsd" lang="he" dir="rtl">בס״ד</p>',
    '</div>',
  ].join('');
  const SCRIPT = "<script>try{if(localStorage.getItem('motion')==='paused')document.documentElement.dataset.motion='paused'}catch(e){}</script>";
  for (const file of ['site/index.html', 'site/404.html']) {
    const html = await readFile(file, 'utf8');
    const bar = html.match(/<div class="bsd-bar">[\s\S]*?<\/div>/)?.[0] ?? '';
    assert.equal(bar.replace(/>\s+</g, '><'), BAR, `${file}: top bar markup`);
    assert.match(html.slice(html.indexOf('</div>', html.indexOf('class="bsd-bar"'))), /^<\/div>\s*<header class="site-header">/, `${file}: the bar sits immediately before the header`);
    const head = html.slice(0, html.indexOf('</head>'));
    assert.equal(head.split(SCRIPT).length, 2, `${file}: the inline script appears exactly once in <head>`);
    const before = head.slice(0, head.indexOf(SCRIPT)).trimEnd();
    assert.match(before, /<noscript><link rel="stylesheet" href="\/?assets\/css\/nojs\.css"><\/noscript>$/, `${file}: the inline script follows the stylesheet links`);
    assert.ok(head.indexOf(SCRIPT) < head.indexOf('site.js'), `${file}: the inline script runs before site.js`);
    assert.doesNotMatch(html, /aria-pressed/, `${file}: the toggle's name carries its state; no aria-pressed`);
  }
});
