const fs = require("node:fs");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.GAME_URL || "http://localhost:8155",
  directory = "artifacts/m11";
const report = {
  checks: [],
  errors: [],
  widths: [],
  fixtures: [],
  playerId: null,
  childId: null,
};
function check(name) {
  report.checks.push(name);
  console.log("PASS " + name);
}
function sql(query) {
  return execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "db",
      "sh",
      "-c",
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -v ON_ERROR_STOP=1',
    ],
    { input: query, encoding: "utf8" },
  ).trim();
}
(async () => {
  fs.mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      reducedMotion: "reduce",
      acceptDownloads: true,
    }),
    page = await context.newPage();
  await context.addInitScript(() =>
    Object.defineProperty(window.crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    }),
  );
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.setDefaultTimeout(15000);
  const username = "qa_" + randomBytes(5).toString("hex"),
    password = randomBytes(20).toString("hex");
  async function go(path) {
    await page.goto(base + path);
    await page.locator(".game-hud").waitFor();
  }
  async function actionClick(button) {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/game/action") &&
        r.request().method() === "POST",
    );
    await button.click();
    const r = await response;
    assert(r.ok(), await r.text());
    return r.json();
  }
  async function quest(name) {
    await go("/quests");
    await actionClick(
      page
        .locator(".game-card")
        .filter({ has: page.getByRole("heading", { name, exact: true }) })
        .getByRole("button", { name: "Claim reward" }),
    );
  }
  async function read(path) {
    const r = await context.request.get(base + "/api/v1" + path);
    assert(r.ok(), await r.text());
    return r.json();
  }
  try {
    await page.goto(base);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByLabel("Username", { exact: true }).fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Start growing", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Keep your recovery codes" })
      .waitFor();
    assert.equal(await page.locator(".recovery-codes code").count(), 5);
    await page.getByRole("button", { name: /I've saved my codes/ }).click();
    await page.locator(".growing-slot").first().waitFor();
    assert.equal(await page.locator(".growing-slot").count(), 4);
    report.playerId = (await read("/me")).id;
    check("Register, one-time recovery UI and isolated four-slot greenhouse");
    await page.screenshot({
      path: directory + "/greenhouse-desktop.png",
      fullPage: true,
    });
    for (let i = 0; i < 3; i++)
      await actionClick(
        page
          .locator(".growing-slot")
          .nth(i)
          .getByRole("button", { name: "Plant starter seed", exact: true }),
      );
    const original = await page
      .locator(".growing-slot")
      .first()
      .locator(".slot-info p")
      .innerText();
    await page.waitForFunction(
      (text) =>
        document.querySelector(".growing-slot .slot-info p")?.textContent !==
        text,
      original,
      { timeout: 5000 },
    );
    check("Live server-synchronized countdown advances between state polls");
    check(
      "Cryptographic action IDs work without secure-context randomUUID (HTTP LAN compatibility)",
    );
    await page
      .locator(".growing-slot")
      .first()
      .getByRole("button", { name: "Harvest plant" })
      .waitFor({ timeout: 30000 });
    const harvested = await actionClick(
      page
        .locator(".growing-slot")
        .first()
        .getByRole("button", { name: "Harvest plant" }),
    );
    await page.getByRole("heading", { name: "A first of its kind." }).waitFor();
    await page.screenshot({
      path: directory + "/first-discovery.png",
      fullPage: true,
    });
    await quest("First green");
    await go("/plants/" + harvested.plantId);
    await page.getByLabel("Favorite", { exact: true }).check();
    await page
      .getByRole("button", { name: "Protected from sale", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "Protected from sale", exact: true })
        .isDisabled(),
    );
    await page.getByLabel("Favorite", { exact: true }).uncheck();
    await page.getByRole("button", { name: /Sell specimen/ }).click();
    await actionClick(
      page.getByRole("button", { name: "Confirm sale", exact: true }),
    );
    await page
      .getByRole("button", { name: "Sold · lineage preserved" })
      .waitFor();
    await quest("A little seed money");
    check(
      "Harvest, discovery, favorite safeguard, confirmed sale and one-time quest claims",
    );
    await go("/shop");
    await actionClick(
      page
        .locator(".game-card")
        .filter({
          has: page.getByRole("heading", {
            name: "Extra growing slot",
            exact: true,
          }),
        })
        .getByRole("button", { name: "Purchase", exact: true }),
    );
    await quest("Room to grow");
    await go("/shop");
    await actionClick(
      page
        .locator(".game-card")
        .filter({
          has: page.getByRole("heading", { name: "Starter seed", exact: true }),
        })
        .getByRole("button", { name: "Purchase", exact: true }),
    );
    check("Exact-price seed and growing-slot purchases");
    await go("/");
    assert.equal(await page.locator(".growing-slot").count(), 5);
    console.log("Waiting for two real two-minute crops…");
    for (const i of [1, 2]) {
      const button = page
        .locator(".growing-slot")
        .nth(i)
        .getByRole("button", { name: "Harvest plant" });
      await button.waitFor({ timeout: 130000 });
      await actionClick(button);
    }
    const plants = (await read("/plants?limit=100")).items.filter(
      (p) => p.gameEligible,
    );
    assert.equal(plants.length, 2);
    await go("/breed");
    await page
      .getByLabel("Parent A", { exact: true })
      .selectOption(plants[0].id);
    await page
      .getByLabel("Parent B", { exact: true })
      .selectOption(plants[1].id);
    const breeding = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/breeding") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Breed selected parents" }).click();
    const bred = await breeding;
    assert(bred.ok(), await bred.text());
    const child = (await bred.json()).plant;
    report.childId = child.id;
    assert.deepEqual(child.parents, [plants[0].id, plants[1].id]);
    await page.locator(".offspring-card").waitFor();
    await page.screenshot({
      path: directory + "/breeding-desktop.png",
      fullPage: true,
    });
    await go("/plants/" + child.id);
    await page.getByLabel("Favorite", { exact: true }).check();
    await page.getByRole("button", { name: "Protected from sale" }).waitFor();
    await page.reload();
    await page.getByLabel("Favorite", { exact: true }).waitFor();
    assert(await page.getByLabel("Favorite", { exact: true }).isChecked());
    check("Paid inherited breeding, persisted lineage and favorite child");
    await go("/lab?plant=" + child.id);
    await page.locator(".render-workbench").waitFor();
    assert((await page.locator(".plant-preview svg").count()) > 0);
    await go("/studies");
    assert((await page.locator(".plant-preview svg").count()) > 0);
    await go("/examples");
    await page.locator(".game-card").first().waitFor();
    assert.equal(await page.locator(".game-card").count(), 100);
    await page
      .getByRole("link", { name: "Inspect reference →", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Genotype & phenotype", exact: true })
      .waitFor();
    assert.equal(await page.locator(".plant-economy-actions").count(), 0);
    await go("/examples");
    await page
      .getByRole("button", { name: "More references →", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".game-card").length === 3,
    );
    check(
      "Advanced genome lab, deterministic renderer atlas and preserved reference herbarium",
    );
    // Explicit, UUID-scoped fixtures apply only to this newly registered QA account.
    // The real onboarding above uses no time/balance shortcuts. Integration tests cover worker resources with a controlled clock.
    if (process.env.GAME_QA_FIXTURES === "1") {
      assert.match(report.playerId, /^[a-f0-9-]{36}$/);
      sql(
        `UPDATE players SET xp=3000 WHERE id='${report.playerId}'; WITH funded AS (UPDATE players SET coin_balance=coin_balance+20000 WHERE id='${report.playerId}' RETURNING id,coin_balance) INSERT INTO coin_ledger(id,player_id,amount,balance_after,reason,reference) SELECT gen_random_uuid(),id,20000,coin_balance,'qa_fixture','m11-browser' FROM funded;`,
      );
      report.fixtures.push(
        "Only new QA account: level 10 and ledger-recorded 20,000-coin grant for late-game UI",
      );
      await go("/shop");
      for (const name of ["Grow lamp", "Irrigation", "Second greenhouse"])
        await actionClick(
          page
            .locator(".game-card")
            .filter({ has: page.getByRole("heading", { name, exact: true }) })
            .getByRole("button", { name: "Purchase", exact: true }),
        );
      await go("/research");
      for (const name of [
        "Living compost",
        "Botanical notes",
        "Selective breeding",
      ])
        await actionClick(
          page
            .locator(".game-card")
            .filter({ has: page.getByRole("heading", { name, exact: true }) })
            .getByRole("button", { name: "Research", exact: true }),
        );
      await go("/workers");
      for (const kind of ["gardener", "breeder"])
        await actionClick(
          page.getByRole("button", { name: "Hire " + kind, exact: true }),
        );
      const gardener = page.locator(".worker-card").filter({
          has: page.getByRole("heading", {
            name: "Junior gardener",
            exact: true,
          }),
        }),
        breeder = page.locator(".worker-card").filter({
          has: page.getByRole("heading", {
            name: "Breeding specialist",
            exact: true,
          }),
        });
      await gardener.getByLabel("Enable automation", { exact: true }).check();
      await gardener
        .getByLabel("Sell duplicate Common harvests automatically", {
          exact: true,
        })
        .check();
      await actionClick(
        gardener.getByRole("button", { name: "Save assignment", exact: true }),
      );
      await breeder
        .getByLabel("Parent A", { exact: true })
        .selectOption(plants[0].id);
      await breeder
        .getByLabel("Parent B", { exact: true })
        .selectOption(plants[1].id);
      await breeder
        .getByLabel("Policy", { exact: true })
        .selectOption("target_trait");
      await breeder
        .getByLabel("Desired pigment", { exact: true })
        .selectOption(child.phenotype.pigment);
      await breeder.getByLabel("Enable automation", { exact: true }).check();
      await actionClick(
        breeder.getByRole("button", { name: "Save assignment", exact: true }),
      );
      await page.screenshot({
        path: directory + "/workers-desktop.png",
        fullPage: true,
      });
      sql(
        `UPDATE workers SET last_processed_at=last_processed_at-interval '1 hour' WHERE player_id='${report.playerId}';`,
      );
      report.fixtures.push(
        "Only QA workers: persisted cursors shifted back one hour",
      );
      const s = await read("/game/state");
      assert(s.report && s.report.harvested > 0 && s.report.breeds > 0);
      const after = await read("/game/state");
      assert.equal(after.report, null);
      await go("/workers");
      check(
        "Late-game fixtures: upgrades, second house, research, worker policies and replay-safe hour offline",
      );
      // Leave QA workers paused so automated acceptance does not keep producing records.
      sql(
        `UPDATE workers SET enabled=false WHERE player_id='${report.playerId}';`,
      );
    }
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        "/",
        "/shop",
        "/gallery",
        "/breed",
        "/workers",
        "/research",
        "/quests",
        "/settings",
        "/lab",
      ]) {
        await go(route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        report.widths.push({ route, width, overflow });
        assert(overflow <= 1, `${route} overflow ${overflow}px at ${width}`);
        if (route === "/")
          await page.screenshot({
            path: directory + "/greenhouse-" + width + ".png",
            fullPage: true,
          });
      }
    }
    check("All gameplay routes usable at 360px and 1440px with reduced motion");
    await go("/settings");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page
      .getByRole("button", { name: "Enter greenhouse", exact: true })
      .waitFor();
    await page.getByLabel("Username", { exact: true }).fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Enter greenhouse", exact: true })
      .click();
    await page.locator(".game-hud").waitFor();
    assert.equal((await read("/me")).id, report.playerId);
    check("Logout and password login restore only the same account");
    const other = await browser.newContext(),
      otherPage = await other.newPage();
    await otherPage.goto(base);
    const denied = await other.request.get(
      base + "/api/v1/plants/" + report.childId,
    );
    assert.equal(denied.status(), 401);
    await other.close();
    check("Unauthenticated collection access denied");
    if (process.env.GAME_PUBLIC_URL) {
      const publicUrl = process.env.GAME_PUBLIC_URL,
        remote = await browser.newContext(),
        login = await remote.request.post(publicUrl + "/api/v1/auth/login", {
          headers: { origin: publicUrl },
          data: { username, password },
        });
      assert(login.ok(), "Public HTTPS login failed: " + login.status());
      const me = await remote.request.get(publicUrl + "/api/v1/me");
      assert(me.ok(), "Public session was not restored");
      assert.equal((await me.json()).id, report.playerId);
      const cookie = (await remote.cookies()).find(
        (c) => c.name === "botanica_session",
      );
      assert(cookie?.secure && cookie?.httpOnly && cookie?.sameSite === "Lax");
      await remote.close();
      check(
        "Public HTTPS through Cloudflare: authenticated cookie is Secure, HttpOnly and SameSite=Lax",
      );
    }
    assert.deepEqual(report.errors, []);
    check("No browser JavaScript errors");
  } catch (error) {
    const message = String(error.message).replaceAll(password, "[redacted]");
    report.failure = { url: page.url(), message };
    if (await page.locator(".game-hud").count())
      await page.screenshot({
        path: directory + "/failure.png",
        fullPage: true,
      });
    throw new Error(message);
  } finally {
    fs.writeFileSync(
      directory + "/browser-report.json",
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
