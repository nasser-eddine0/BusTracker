import { test, expect } from "@playwright/test";

// Synthetic browser-only credential; never use a real account here.
const syntheticPassword = process.env.BUS_TRACKER_E2E_PASSWORD || "SyntheticPassword123";

// Synthetic fixtures verify browser contracts, not live provider behavior.
test.beforeEach(async ({ page }) => {
  const reactLoopErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Maximum update depth")) {
      reactLoopErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const user = { id: "1", name: "Test operator", email: "operator@example.test", role: "super_admin", status: "active", schoolId: null };
  await page.addInitScript((account) => {
    localStorage.setItem("token", "synthetic-test-token");
    localStorage.setItem("auth_user", JSON.stringify(account));
    localStorage.setItem("app-lang", "fr");
  }, user);
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  let schools = [{ id: 1, name: "Test school", subdomain: "test-school", is_active: true, max_buses: 5, admin_count: 1, subscription_status: "past_due", stripe_customer_id: "cus_fixture", stripe_subscription_id: "sub_fixture" }];
  let admins = [{ id: "2", name: "School admin", email: "admin@example.test", phone: null, school_id: "1", school: { id: "1", name: "Test school" }, role: "admin", status: "active" }];
  let account = { name: user.name, email: user.email, phone: "" };
  let sessions = [{ id: "1", name: "current", current: true }, { id: "2", name: "other", current: false }];
  let syncs = [{ id: 10, school_id: "1", status: "failed", membership_key: "school:1:user:2" }];
  await page.route(/^http:\/\/127\.0\.0\.1:5176\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api", "");
    const method = request.method();
    const body = method === "GET" || method === "DELETE" ? {} : request.postDataJSON();
    let data;
    if (path === "/me") data = { user };
    else if (path === "/firebase-token") return route.fulfill({ status: 503, json: { message: "Firebase is mocked in browser tests" } });
    else if (path === "/super-admin/schools" && method === "GET") data = { schools };
    else if (path === "/super-admin/schools" && method === "POST") {
      const school = { ...body, id: 3, is_active: true, admin_count: 0, subscription_status: "inactive" };
      schools = [school, ...schools]; data = { school, message: "School created." };
    } else if (/\/schools\/\d+\/toggle-status$/.test(path)) {
      schools[0] = { ...schools[0], is_active: body.is_active }; data = { school: schools[0], message: "School access updated." };
    } else if (/\/schools\/\d+\/admins$/.test(path)) {
      admins = [...admins, { ...body, id: "3", school: { id: "1", name: "Test school" }, role: "admin", status: "active" }];
      data = { school: { ...schools[0], admin_count: 2 }, message: "Admin created." };
    } else if (/\/schools\/\d+$/.test(path) && method === "PUT") {
      schools[0] = { ...schools[0], ...body }; data = { school: schools[0], message: "School saved." };
    } else if (path === "/super-admin/admins") data = { admins };
    else if (/\/admins\/\d+$/.test(path)) {
      admins[0] = { ...admins[0], ...body }; data = { admin: admins[0], message: "Admin saved." };
    } else if (path === "/super-admin/firebase-syncs" && method === "GET") data = { data: syncs, current_page: 1, last_page: 1, total: syncs.length, per_page: 100 };
    else if (/\/super-admin\/firebase-syncs\/\d+\/retry$/.test(path) && method === "POST") { syncs = syncs.map((sync) => ({ ...sync, status: "pending" })); data = { message: "Firebase membership synchronization queued.", sync: syncs[0] }; }
    else if (path === "/super-admin/audit-logs") data = {
      data: [{ id: 1, action: "school_updated", severity: "warning", description: "Synthetic audit entry", created_at: "2026-10-15T10:00:00Z", user_id: 1, user: { email: user.email }, school: { name: "Test school" }, old_values: { name: "Before" }, new_values: { name: "After" } }],
      current_page: Number(url.searchParams.get("page") || 1), last_page: 2, total: 2, per_page: 1,
    };
    else if (path === "/super-admin/account") {
      if (method === "PUT") account = { name: body.name, email: body.email, phone: body.phone };
      data = { account, message: "Account saved." };
    } else if (path === "/super-admin/account/password") data = { message: "Password changed." };
    else if (path === "/super-admin/account/sessions") data = { sessions };
    else if (path === "/super-admin/account/sessions/2" && method === "DELETE") { sessions = sessions.slice(0, 1); data = { message: "Session revoked." }; }
    else return route.fulfill({ status: 404, json: { message: `Unhandled test endpoint: ${method} ${path}` } });
    await route.fulfill({ json: data });
  });
  await page.goto("/");
  await page.evaluate((account) => {
    localStorage.setItem("token", "synthetic-test-token");
    localStorage.setItem("auth_user", JSON.stringify(account));
    localStorage.setItem("app-lang", "fr");
  }, user);
  await page.goto("/super-admin");
  await expect(page.getByRole("heading", { name: "Super Admin", exact: true })).toBeVisible();
  expect(reactLoopErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("school and admin save workflows close dialogs and refresh records", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "Schools", exact: true }).click();
  await page.getByRole("button", { name: "Add School", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("New school");
  await dialog.getByLabel("Subdomain").fill("new-school");
  await dialog.getByRole("button", { name: "Save School" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "New school", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Users", exact: true }).click();
  await page.getByRole("button", { name: "Add Admin", exact: true }).click();
  await dialog.getByRole("combobox", { name: "School", exact: true }).selectOption("1");
  await dialog.getByLabel("Name", { exact: true }).fill("New admin");
  await dialog.getByLabel("Email", { exact: true }).fill("new@example.test");
  await dialog.getByLabel("Password", { exact: true }).fill(syntheticPassword);
  await dialog.getByRole("button", { name: "Create Admin", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "New admin", exact: true })).toBeVisible();
  await page.getByRole("row").filter({ hasText: "School admin" }).getByRole("button", { name: "Edit", exact: true }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Renamed admin");
  await dialog.getByRole("button", { name: "Save Admin", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Renamed admin", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toHaveJSProperty("scrollWidth", 0);
  await page.screenshot({ path: testInfo.outputPath("users.png"), fullPage: true });
});

test("audit reset and pagination use applied filters; billing shows recorded data", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "Audit Logs", exact: true }).click();
  await page.getByLabel("Action", { exact: true }).fill("school_updated");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("Synthetic audit entry", { exact: false }).first()).toBeVisible();
  await page.getByLabel("Action", { exact: true }).fill("unsaved-filter");
  const next = page.waitForRequest((request) => request.url().includes("audit-logs") && request.url().includes("page=2"));
  await page.getByRole("button", { name: "Next", exact: true }).click();
  expect(new URL((await next).url()).searchParams.get("action")).toBe("school_updated");
  const reset = page.waitForRequest((request) => request.url().includes("audit-logs") && !new URL(request.url()).searchParams.has("action"));
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await reset;
  await page.getByText("Details", { exact: true }).click();
  await expect(page.getByText('"Before"', { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Billing", exact: true }).click();
  await expect(page.getByText("cus_fixture", { exact: true })).toBeVisible();
  await page.getByLabel("Search billing schools").fill("no-match");
  await expect(page.getByText("No subscriptions found.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("billing.png"), fullPage: true });
});

test("settings persist, security revokes own sessions, and failed saves stay failed", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Updated operator");
  await page.getByLabel("Current password", { exact: true }).fill(syntheticPassword);
  await page.getByRole("button", { name: "Save account" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Account saved." })).toBeVisible();
  await page.getByRole("button", { name: "Security", exact: true }).click();
  await expect(page.getByText("current (current)")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Revoke session 2" }).click();
  await expect(page.getByRole("button", { name: "Revoke session 2" })).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Updated operator");
  await page.route("**/api/super-admin/account", (route) => route.request().method() === "PUT"
    ? route.fulfill({ status: 422, json: { message: "Invalid password", errors: { current_password: ["Incorrect current password."] } } }) : route.fallback());
  await page.getByLabel("Current password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Save account" }).click();
  await expect(page.getByRole("alert")).toHaveText("Incorrect current password.");
  await expect(page.getByText("Account saved.", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("settings.png"), fullPage: true });
});
