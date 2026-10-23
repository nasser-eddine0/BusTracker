import { expect, test } from "@playwright/test";

test("welcome page opens role selection from the sign-in button", async ({ page }) => {
  await page.goto("/");

  const signIn = page.getByRole("link", { name: "Sign In", exact: true });
  await expect(page.locator(".welcome-background-full")).toBeVisible();
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", "/choose-role");

  await signIn.focus();
  await expect(signIn).toBeFocused();
  await signIn.press("Enter");

  await expect(page).toHaveURL(/\/choose-role$/);
  await expect(page.getByRole("heading", { name: /Transport scolaire|نقل مدرسي/ })).toBeVisible();
});

test("welcome button motion resets and respects reduced motion", async ({ page }) => {
  await page.goto("/");
  const signIn = page.getByRole("link", { name: "Sign In", exact: true });
  const bounds = await signIn.boundingBox();

  await page.mouse.move(bounds.x + bounds.width - 8, bounds.y + bounds.height - 8);
  await expect(signIn).not.toHaveCSS("transform", "none");
  await page.mouse.move(0, 0);
  await expect(signIn).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(bounds.x + bounds.width - 8, bounds.y + bounds.height - 8);
  await expect(signIn).toHaveCSS("transform", "none");
});

test("welcome image waits for loading before the continuous focus reveal", async ({ page }) => {
  let releaseFullImage;
  const fullImageRequest = new Promise((resolve) => {
    releaseFullImage = resolve;
  });

  await page.route("**/welcome-school-bus.png", async (route) => {
    await fullImageRequest;
    await route.continue();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const pageRoot = page.locator(".welcome-page");
  const placeholder = page.locator(".welcome-background-placeholder");
  const fullImage = page.locator(".welcome-background-full");

  await expect(pageRoot).toHaveAttribute("data-image-phase", "loading");
  await expect(placeholder).toHaveCSS("opacity", "1");
  await expect(fullImage).toHaveCSS("opacity", "0");
  await expect(fullImage).toHaveCSS("filter", "blur(28px) brightness(0.78) saturate(0.88)");

  releaseFullImage();

  await expect(pageRoot).toHaveAttribute("data-image-phase", "covering");
  await expect(fullImage).toHaveCSS("filter", "blur(28px) brightness(0.78) saturate(0.88)");
  await expect(pageRoot).toHaveAttribute("data-image-phase", "revealing");

  const blurSamples = await fullImage.evaluate(async (image) => {
    const samples = [];
    const startedAt = performance.now();

    while (performance.now() - startedAt < 3300) {
      const match = getComputedStyle(image).filter.match(/blur\(([\d.]+)px\)/);
      samples.push(match ? Number(match[1]) : 0);
      await new Promise(requestAnimationFrame);
    }

    return samples;
  });

  expect(blurSamples.length).toBeGreaterThan(15);
  expect(blurSamples[0]).toBeGreaterThan(0);
  expect(blurSamples.at(-1)).toBeLessThan(0.1);

  for (let index = 1; index < blurSamples.length; index += 1) {
    expect(blurSamples[index]).toBeLessThanOrEqual(blurSamples[index - 1] + 0.05);
  }

  await expect(fullImage).toHaveCSS("filter", "blur(0px) brightness(1) saturate(1)");
  await expect(fullImage).toHaveCSS("opacity", "1");
  await expect(placeholder).toHaveCSS("opacity", "0");
});

test("welcome image is immediately sharp with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const fullImage = page.locator(".welcome-background-full");
  const placeholder = page.locator(".welcome-background-placeholder");

  await expect(fullImage).toHaveCSS("filter", "blur(0px) brightness(1) saturate(1)");
  await expect(fullImage).toHaveCSS("opacity", "1");
  await expect(fullImage).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await expect(placeholder).toHaveCSS("opacity", "0");
});
