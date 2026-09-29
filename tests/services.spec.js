import { test, expect } from '@playwright/test';

const SERVICES = [
  {
    id: 'ai',
    index: '01',
    title: 'AI Engineering',
    lead: 'Practical AI built into real systems — not demos.',
    body: 'I build AI into the systems you already run: LLM apps and agents, machine learning on operational and sensor data, and computer vision on live video.',
    bullets: [
      'LLM apps and agents: chat assistants, document processing, and workflow automation',
      'Machine learning on operational and sensor data: prediction, anomaly detection, and forecasting',
      'Computer vision on real-time video: event detection, inspection, counting, and tracking',
      'Event-triggered automation at the edge, such as automated recording',
    ],
  },
  {
    id: 'iot',
    index: '02',
    title: 'IoT Prototyping',
    lead: 'From bench prototype to field pilot.',
    body: 'Connected devices built around ESP32, LoRaWAN, and Wi-Fi, with the sensors, controls, and interfaces your product or equipment needs.',
    bullets: [
      'ESP32-based controllers',
      'Touchscreen controls, timers, and scheduling',
      'LoRaWAN and Wi-Fi sensor networks',
      'Serial integration with existing equipment',
      'Matter smart-home integration',
    ],
  },
  {
    id: 'automation',
    index: '03',
    title: 'Systems Automation',
    lead: 'Equipment that runs on rules, not clipboards.',
    body: "PLCs, SCADA, building controls, and networks tied together, and to the cloud, so systems respond on their own and report what they're doing.",
    bullets: [
      'PLC and MES/SCADA integration',
      'HVAC, temperature, and ventilation control',
      'Building and home automation',
      'High-density networks, fiber optics, and real-time video distribution',
    ],
  },
  {
    id: 'process',
    index: '04',
    title: 'Production Process Optimization',
    lead: 'Instrument the process. Find the bottleneck. Automate the fix.',
    body: 'I replace paper, duplicate data entry, and blind spots with real-time data and automated workflows.',
    bullets: [
      'Paper systems and duplicative manual processes replaced completely',
      'Real-time metrics and driver feedback',
      'QR code scanning and passwordless driver authentication',
      'Monitoring, alerting, and centralized situational views',
      'Pick/pack, load/unload, and delivery workflows',
    ],
  },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

for (const s of SERVICES) {
  test(`service card ${s.index}: ${s.title}`, async ({ page }) => {
    const card = page.locator(`#services article#${s.id}`);
    await expect(card.locator('.card-index')).toHaveText(s.index);
    await expect(card.locator('h3')).toHaveText(s.title);
    await expect(card.locator('.service-lead')).toHaveText(s.lead);
    await expect(card.locator('.service-body')).toHaveText(s.body);
    await expect(card.locator('.ticks li')).toHaveText(s.bullets);
  });
}

test('hero service strip links to each card using the short names', async ({ page }) => {
  const links = page.locator('.hero .service-strip a');
  await expect(links).toHaveText([
    '01 AI Engineering', '02 IoT Prototyping', '03 Systems Automation', '04 Process Optimization',
  ]);
  expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '#ai', '#iot', '#automation', '#process',
  ]);
});

test('industries list', async ({ page }) => {
  await expect(page.locator('#industries .industry-name')).toHaveText([
    'Manufacturing',
    'Distribution & logistics',
    'Industrial process',
    'Traffic control',
    'Building control & HVAC',
    'Home automation',
    'Public-private partnerships (3P)',
  ]);
});

test('how I work has the four approved steps', async ({ page }) => {
  const steps = page.locator('#how-i-work .step');
  await expect(steps.locator('h3')).toHaveText(['Assess', 'Prototype', 'Deploy', 'Support']);
  await expect(steps.locator('p:not(.step-index)')).toHaveText([
    'I learn the operation or product, map the systems and data, and agree with you on what "better" looks like, in terms you can measure.',
    'A working proof on real hardware and real data, built fast, so decisions rest on evidence rather than slides.',
    'Taken from prototype into the field, with the networking and monitoring to keep it running and documentation your team can own.',
    'Monitoring, tuning, and extensions as your operation or product changes.',
  ]);
});

test('service grid has 1, 2 and 4 columns at 375, 768 and 1280 px', async ({ page }) => {
  for (const [width, columns] of [[375, 1], [768, 2], [1280, 4]]) {
    await page.setViewportSize({ width, height: 900 });
    const tops = await page
      .locator('#services .service')
      .evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(tops.filter((top) => top === tops[0]), `at ${width}px`).toHaveLength(columns);
  }
});
