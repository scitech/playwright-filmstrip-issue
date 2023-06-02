import { test, expect, Page } from '@playwright/test';
import path from "path";
import fs from "fs";
import AxeBuilder from "@axe-core/playwright";

export const passesAudit = async (
  page: Page,
  fileName: string,
  disableRules: string[] = []
) => {
  const savePath = path.join(__dirname, `../test-results/audit_${fileName}.json`);
  const results = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "section508",
      "best-practice",
      "experimental",
    ])
    .disableRules([...disableRules])
    .analyze();

  if (results && results.violations.length > 0) {
    fs.writeFile(
      savePath,
      JSON.stringify(results.violations, null, 2),
      (error) => {
        if (error) {
          console.error("Error writing audit results");
          throw error;
        }
      }
    );
    return savePath;
  } else {
    fs.stat(savePath, (err) => {
      if (!err) {
        fs.unlink(savePath, (error) => {
          if (error) {
            console.error("Error deleting audit results");
            throw error;
          }
        });
      }
    });
    return null;
  }
};

export async function assertPassesAudit(
  page: Page,
  name: string,
  disableRules: string[] = []
) {
  const findingsPath = await passesAudit(page, name, [
    ...disableRules,
    "duplicate-id",
    "heading-order",
  ]);
  expect(
    findingsPath ? `See ${findingsPath} for a11y violations` : null
  ).toBeNull();
}

test.describe("Happy path", () => {
  test('should pass accessibility', async ({ page }) => {
    await page.goto('https://healthcare.gov/see-plans');

    await test.step("landing page", async () => {
      await page.type(".ds-c-field", "60647");
      await page.waitForSelector(".ds-c-autocomplete__list-item");

      await assertPassesAudit(page, "happy_path_landing");

      await page.click(".ds-c-autocomplete__list-item");
      const selector = ".ws-c-landing__continue-btn";
      const continueBtn = await page.waitForSelector(selector);
      await continueBtn.click();
      await page.waitForSelector(".ds-c-step-list");
    });
    await test.step("steps page", async () => {
      expect(page).toHaveURL("https://www.healthcare.gov/see-plans/#/steps");

      await assertPassesAudit(page, "happy_path_steps");

      await page.click(".ds-c-button.ds-c-button--solid");
    });
    await test.step("household page", async () => {
      expect(page).toHaveURL("https://www.healthcare.gov/see-plans/#/household");
      
      await assertPassesAudit(page, "happy_path_household");
    });
  });
})
