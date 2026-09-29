export const PAGE_TITLE = 'Outcore Tech — AI, IoT, Automation & Process Optimization';
export const DESCRIPTION =
  'Outcore Tech: AI engineering, IoT prototyping, systems automation, and production process optimization, backed by 25 years of real-world systems work.';

export async function fontsReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export const API = 'https://api.web3forms.com/submit';
export const ACCESS_KEY = '98353593-5ec7-47a2-8dbe-5ffe29725846';
export const SUCCESS_TEXT = "Thanks — your message is on its way. I'll be in touch soon.";
export const VISITOR = {
  name: 'Test Visitor',
  email: 'visitor@example.com',
  company: 'Example Co',
  service: 'IoT Prototyping',
  message: 'We need a LoRaWAN sensor pilot across three buildings.',
};

export async function fillForm(page, visitor = VISITOR) {
  await page.getByLabel('Name', { exact: true }).fill(visitor.name);
  await page.getByLabel('Email', { exact: true }).fill(visitor.email);
  await page.getByLabel('Company (optional)').fill(visitor.company);
  await page.getByLabel('What do you need help with?').selectOption(visitor.service);
  await page.getByLabel('Message').fill(visitor.message);
}
