const { chromium } = require("playwright");

const baseUrl = "http://localhost:8080";
const outputDir = "./assets/screenshots";

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Main page - Custom API Spec tab (light mode)
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outputDir}/01-main-light.png`, fullPage: false });

  // 2. Click "Load Sample" to show content
  await page.click("button:has-text('Sample')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outputDir}/02-with-input.png`, fullPage: false });

  // 3. Click "Generate Document" to show output
  await page.click("button:has-text('Generate')");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outputDir}/03-with-output.png`, fullPage: false });

  // 4. Switch to OpenAPI Import tab
  await page.click("button:has-text('OpenAPI')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outputDir}/04-openapi-tab.png`, fullPage: false });

  // 5. Switch to AI Generate tab
  await page.click("button:has-text('AI Generate')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outputDir}/05-ai-tab.png`, fullPage: false });

  // 6. Dark mode
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const title = await btn.getAttribute("title");
    if (!title) continue;
    const lower = title.toLowerCase();
    if (lower.includes("theme") || lower.includes("toggle") || lower.includes("dark")) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outputDir}/06-dark-mode.png`, fullPage: false });

  await browser.close();
  console.log("Screenshots saved to", outputDir);
}

takeScreenshots().catch(console.error);
