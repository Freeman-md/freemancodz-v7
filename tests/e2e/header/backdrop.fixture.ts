import type { Page } from "@playwright/test";

// Test-only stripes make the real header's filtering observable without product demonstration graphics.
export async function installBackdropPattern(page: Page) {
  const stylesheet = await page.addStyleTag({
    content: `main { background: repeating-linear-gradient(90deg, #ffffff 0 4px, #020c1b 4px 8px); }`,
  });
  return () =>
    stylesheet.evaluate((element) => element.parentNode?.removeChild(element));
}

export async function removeBackdropSupport(page: Page) {
  await page.evaluate(() => {
    const removed: { sheet: CSSStyleSheet; index: number; text: string }[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
        const rule = sheet.cssRules[index];
        if (
          rule instanceof CSSSupportsRule &&
          rule.conditionText.includes("backdrop-filter")
        ) {
          removed.push({ sheet, index, text: rule.cssText });
          sheet.deleteRule(index);
        }
      }
    }
    Reflect.set(window, "restoreBackdropSupport", () => {
      for (const rule of removed.reverse()) {
        rule.sheet.insertRule(rule.text, rule.index);
      }
    });
  });
  return () =>
    page.evaluate(() => {
      Reflect.get(window, "restoreBackdropSupport")();
      Reflect.deleteProperty(window, "restoreBackdropSupport");
    });
}
