export const PAGE_TITLE = 'Outcore Tech — AI, IoT, Automation & Process Optimization';
export const DESCRIPTION =
  'Outcore Tech: AI engineering, IoT prototyping, systems automation, and production process optimization, backed by 25 years of real-world systems work.';

export async function fontsReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
