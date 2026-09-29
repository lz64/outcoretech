import { test, expect } from '@playwright/test';

const WORK = [
  {
    title: 'Smart 36 kW pool heater controller',
    tags: ['IoT Prototyping', 'Systems Automation'],
    industry: null,
    challenge: 'Board-controlled heaters slammed the heating elements on and off, with no flexibility in how or when they ran.',
    built: 'A standalone Wi-Fi controller with soft ramp up/down, eco consumption modes, timers and scheduling, ambient temperature inputs, pump speed control and pump-state awareness, Matter smart-home integration, and a touchscreen interface.',
    result: "Controlled ramping instead of hard starts, running on the owner's schedule from the wall panel or any Matter app.",
  },
  {
    title: 'Warehouse and delivery logistics platform',
    tags: ['Process Optimization', 'Systems Automation'],
    industry: 'Distribution & logistics',
    challenge: 'Pick/pack, load/unload, and delivery ran on paper, with the same information keyed in more than once.',
    built: 'QR code scanning at every step, Google API integrations, passwordless driver sign-in, and real-time metrics with driver feedback.',
    result: 'Completely replaced the paper systems and the duplicated manual processes.',
  },
  {
    title: 'Quarry operations monitoring',
    tags: ['Systems Automation', 'Process Optimization'],
    industry: 'Industrial process',
    challenge: "Large industrial quarries ran SCADA networks with no centralized situational view or information repository, and remote locations couldn't drill into detail.",
    built: 'Monitoring, alerting, and process improvement across the SCADA networks with integrated real-time video feeds, plus a centralized situational view with drill-down from remote locations.',
    result: 'One operational picture, with the detail available from any location.',
  },
  {
    title: 'Edge-virtualized real-time video distribution',
    tags: ['AI Engineering', 'Systems Automation'],
    industry: 'Traffic control',
    challenge: 'Multiple large real-time video distribution and control systems were held back by parallel concurrency limits, with no conditional awareness or remote enablement.',
    built: 'An edge virtualization platform with compression and location awareness, monitoring, and AI event detection that triggers automated recording for situational awareness.',
    result: 'Removed the concurrency ceiling and added event-driven recording and remote enablement.',
  },
  {
    title: 'Automated building hot water',
    tags: ['IoT Prototyping', 'Systems Automation'],
    industry: 'Building control',
    challenge: 'Conventional hot water meant waiting at the tap or wasting energy keeping the lines hot.',
    built: 'Wi-Fi and cloud control of tankless units, valve controls, and recirculation pumps, with multiple temperature sensing points and fault detection.',
    result: 'Hot water available everywhere, without the waste, and fully configurable.',
  },
];

const TOOLSET = [
  ['AI & edge', ['LLM apps & agents', 'Machine learning', 'Computer vision', 'AI/ML event detection', 'Edge virtualization', 'Video compression']],
  ['Networks & video', ['High-density networks', 'Fiber optics', 'Real-time video sharing']],
  ['Field & controls', ['ESP32', 'PLC', 'Serial', 'MES/SCADA', 'LoRaWAN', 'Wi-Fi', 'Matter', 'HVAC', 'Temperature & ventilation control', 'Building control', 'Home automation']],
  ['Software & cloud', ['Python', 'Azure', 'AWS', 'Google APIs']],
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('there are exactly five project cards', async ({ page }) => {
  await expect(page.locator('#work .work-card')).toHaveCount(5);
});

WORK.forEach((w, i) => {
  test(`project ${i + 1}: ${w.title}`, async ({ page }) => {
    const card = page.locator('#work .work-card').nth(i);
    await expect(card.locator('.card-index')).toHaveText(`Project 0${i + 1}`);
    await expect(card.locator('h3')).toHaveText(w.title);
    await expect(card.locator('.tags li')).toHaveText(w.tags);
    if (w.industry) await expect(card.locator('.work-industry')).toHaveText(`Industry: ${w.industry}`);
    else await expect(card.locator('.work-industry')).toHaveCount(0);
    await expect(card.locator('dt')).toHaveText(['Challenge', 'Built', 'Result']);
    await expect(card.locator('dd')).toHaveText([w.challenge, w.built, w.result]);
  });
});

test('about: name, role and bio', async ({ page }) => {
  const about = page.locator('#about');
  await expect(about.locator('h2')).toHaveText('Ari Friedman');
  await expect(about.locator('.about-role')).toHaveText('Computer Systems Engineer · 25 years');
  await expect(about.locator('.about-bio p:not(.about-role)')).toHaveText(
    "I've spent 25 years as a computer systems engineer, building systems that have to work in the real world: high-density networks, fiber optics, and real-time video; PLCs, MES/SCADA, and building controls; ESP32 and LoRaWAN devices; Python, Azure, and AWS; and AI, from LLM apps to computer vision. Outcore Tech is how I bring that full stack to clients: one engineer who can take a problem from the sensor to the cloud and back.",
  );
});

test('about: four toolset groups with the approved chips', async ({ page }) => {
  const groups = page.locator('#about .tool-group');
  await expect(groups.locator('h3')).toHaveText(TOOLSET.map(([name]) => name));
  for (const [i, [, chips]] of TOOLSET.entries()) {
    await expect(groups.nth(i).locator('.chips li')).toHaveText(chips);
  }
});

test('project cards use 1 column below 900 px and 2 from 900 px', async ({ page }) => {
  for (const [width, columns] of [[375, 1], [1280, 2]]) {
    await page.setViewportSize({ width, height: 900 });
    const tops = await page
      .locator('#work .work-card')
      .evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(tops.filter((top) => top === tops[0]), `at ${width}px`).toHaveLength(columns);
  }
});
