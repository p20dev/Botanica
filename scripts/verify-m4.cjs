const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const directory = "artifacts/m4";
(async () => {
  fs.mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const report = { checks: [], errors: [], exports: [], pagination: [] };
  page.on("pageerror", (e) => report.errors.push(e.message));
  const base = "http://localhost:8155";
  async function ready() {
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    await page.waitForFunction(() => {
      const status = document.querySelector(
        ".collection-toolbar [role=status]",
      );
      return status && status.textContent.startsWith("Showing");
    });
  }
  async function width(route, size) {
    await page.setViewportSize({ width: size, height: 1100 });
    await page.goto(base + route);
    await page
      .getByRole("status")
      .filter({ hasText: "Laboratory online" })
      .waitFor();
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Overflow: " + route + " at " + size);
    report.checks.push("no overflow " + size + " " + route);
  }
  await width("/gallery", 1440);
  await ready();
  if ((await page.locator(".collection-card").count()) !== 24)
    throw Error("Collection page size");
  await page.screenshot({
    path: directory + "/collection-desktop.png",
    fullPage: true,
  });
  async function select(label, value, key) {
    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/plants?") &&
        new URL(r.url()).searchParams.get(key) === value,
    );
    const start = Date.now();
    await page
      .getByRole("combobox", { name: label, exact: true })
      .selectOption(value);
    await response;
    await ready();
    report.checks.push(label + " filter/sort " + value);
    return Date.now() - start;
  }
  report.filterMs = await select("Pigment", "purple", "pigment");
  if (
    !(await page.locator(".collection-card p").allTextContents()).every((t) =>
      t.toLowerCase().includes("purple"),
    )
  )
    throw Error("Wrong pigment results");
  await select("Pattern", "marbled", "pattern");
  if (
    !(await page.locator(".collection-card-footer").allTextContents()).every(
      (t) => t.toLowerCase().includes("marbled"),
    )
  )
    throw Error("Wrong pattern results");
  await page.screenshot({
    path: directory + "/filtered-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await ready();
  await select("Rarity", "Legendary", "rarity");
  if (
    !(
      await page.locator(".collection-card .rarity-badge").allTextContents()
    ).every((t) => t === "Legendary")
  )
    throw Error("Wrong rarity results");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await ready();
  await select("Sort plants", "name", "sort");
  const names = await page.locator(".collection-card h2").allTextContents();
  if (
    names.some(
      (name, i) => i > 0 && names[i - 1].toLowerCase() > name.toLowerCase(),
    )
  )
    throw Error("Names not sorted");
  await page
    .getByRole("searchbox", { name: "Search plants", exact: true })
    .fill("zzzz-no-match");
  await page
    .getByRole("heading", {
      name: "No plants match these filters",
      exact: true,
    })
    .waitFor();
  await page.screenshot({ path: directory + "/empty-state.png" });
  await page
    .getByRole("button", { name: "Show all plants", exact: true })
    .click();
  await page.locator(".collection-card").first().waitFor();
  await ready();
  while (
    await page
      .getByRole("button", { name: "Load more plants", exact: true })
      .isVisible()
  ) {
    const count = await page.locator(".collection-card").count(),
      start = Date.now();
    await page
      .getByRole("button", { name: "Load more plants", exact: true })
      .click();
    await page.waitForFunction(
      (previous) =>
        document.querySelectorAll(".collection-card").length > previous,
      count,
    );
    report.pagination.push({
      cards: await page.locator(".collection-card").count(),
      elapsedMs: Date.now() - start,
    });
  }
  if ((await page.locator(".collection-card").count()) < 100)
    throw Error("Expected 100+ persisted plants");
  report.checks.push("100+ persisted plants paginated");
  const metadata = JSON.parse(
    fs.readFileSync("artifacts/m3/browser-checks.json", "utf8"),
  );
  const childResponse = await fetch(
    base + "/api/v1/plants/" + metadata.childId,
  );
  if (!childResponse.ok) throw Error("M3 acceptance child missing");
  const child = await childResponse.json();
  await page
    .getByRole("searchbox", { name: "Search plants", exact: true })
    .fill(child.id);
  await ready();
  await page.waitForFunction(
    () => document.querySelectorAll(".collection-card").length === 1,
  );
  const trigger = page.getByRole("button", {
    name: "Inspect " + child.name,
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("heading", { name: "Genotype & phenotype", exact: true })
    .waitFor();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if (
      !(await page.evaluate(() => !!document.activeElement.closest("dialog")))
    )
      throw Error("Focus escaped modal");
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  if (!(await trigger.evaluate((e) => document.activeElement === e)))
    throw Error("Focus did not return to specimen");
  report.checks.push("modal focus trap, Escape and restoration");
  await trigger.click();
  await dialog
    .getByRole("heading", { name: "Genotype & phenotype", exact: true })
    .waitFor();
  await page.screenshot({ path: directory + "/inspector-child-desktop.png" });
  for (const background of ["warm", "transparent"]) {
    await dialog
      .getByRole("combobox", { name: "Export background", exact: true })
      .selectOption(background);
    for (const format of ["svg", "png", "json"]) {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        dialog
          .getByRole("button", {
            name: "Export " + format.toUpperCase(),
            exact: true,
          })
          .click(),
      ]);
      if (await download.failure()) throw Error("Download failed");
      await download.saveAs(directory + "/child-" + background + "." + format);
    }
    const saved = JSON.parse(
      fs.readFileSync(directory + "/child-" + background + ".json"),
    );
    if (
      saved.id !== child.id ||
      saved.parents.length !== 2 ||
      saved.generation !== 1 ||
      Object.keys(saved.genome).length !== 6 ||
      saved.genomeVersion !== 1 ||
      saved.rendererVersion !== 1
    )
      throw Error("JSON lineage/version export invalid");
    const svg = fs.readFileSync(
        directory + "/child-" + background + ".svg",
        "utf8",
      ),
      png = fs
        .readFileSync(directory + "/child-" + background + ".png")
        .toString("base64");
    if (/<script|foreignObject|<image|href=/.test(svg))
      throw Error("Unsafe SVG");
    const result = await page.evaluate(
      async ({ svg, png }) => {
        async function raster(src) {
          const image = new Image();
          image.src = src;
          await image.decode();
          const c = document.createElement("canvas");
          c.width = 512;
          c.height = 512;
          const ctx = c.getContext("2d");
          ctx.drawImage(image, 0, 0, 512, 512);
          return {
            data: ctx.getImageData(0, 0, 512, 512).data,
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
        }
        const a = await raster("data:image/png;base64," + png),
          b = await raster(
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
          ),
          c = await raster(
            "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(
                document.querySelector("dialog .specimen>.plant-preview svg")
                  .outerHTML,
              ),
          );
        let difference = 0,
          preview = 0;
        for (let i = 0; i < a.data.length; i++) {
          difference += Math.abs(a.data[i] - b.data[i]);
          preview += Math.abs(a.data[i] - c.data[i]);
        }
        return {
          width: a.width,
          height: a.height,
          corner: Array.from(a.data.slice(0, 4)),
          svgDifference: difference / a.data.length,
          previewDifference: preview / a.data.length,
        };
      },
      { svg, png },
    );
    if (
      result.width !== 512 ||
      result.height !== 512 ||
      result.svgDifference > 0.1 ||
      result.previewDifference > 0.1
    )
      throw Error("Image export mismatch");
    if (
      background === "transparent"
        ? result.corner[3] !== 0
        : result.corner.join(",") !== "246,243,232,255"
    )
      throw Error("Incorrect export background");
    report.exports.push({ background, ...result });
  }
  const parent = await (
    await fetch(base + "/api/v1/plants/" + child.parents[0])
  ).json();
  await dialog
    .getByRole("button", {
      name: "Parent A · " + parent.id.slice(0, 8) + " →",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("heading", { name: parent.name, exact: true })
    .waitFor();
  report.checks.push("inspector child to saved parent navigation");
  await page.keyboard.press("Escape");
  await page.route("**/api/v1/plants?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "ACCEPTANCE_OUTAGE",
          message: "Collection is temporarily unavailable.",
        },
      }),
    }),
  );
  await page.goto(base + "/gallery");
  await page
    .getByRole("alert")
    .filter({ hasText: "Collection is temporarily unavailable." })
    .waitFor();
  await page.screenshot({ path: directory + "/error-state.png" });
  await page.unroute("**/api/v1/plants?**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await ready();
  report.checks.push("recoverable API error and retry");
  for (const route of [
    "/lab",
    "/breed",
    "/gallery",
    "/plants/" + child.id,
    "/about",
  ]) {
    await width(route, 360);
    if (route === "/lab" || route === "/breed" || route === "/gallery")
      await page.screenshot({
        path: directory + "/" + route.slice(1) + "-mobile.png",
        fullPage: true,
      });
  }
  await page.goto(base + "/gallery?q=" + child.id);
  await ready();
  await page
    .getByRole("button", { name: "Inspect " + child.name, exact: true })
    .click();
  await dialog
    .getByRole("heading", { name: "Genotype & phenotype", exact: true })
    .waitFor();
  await page.reload();
  await dialog
    .getByRole("heading", { name: child.name, exact: true })
    .waitFor();
  if (await dialog.evaluate((e) => e.scrollWidth > e.clientWidth))
    throw Error("Mobile inspector overflow");
  await page.screenshot({ path: directory + "/inspector-mobile.png" });
  await page.keyboard.press("Escape");
  if (
    (await page
      .locator(".collection-card")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration)) !== "0s"
  )
    throw Error("Reduced-motion override missing");
  report.checks.push("deep-linked inspector reload and reduced motion");
  if (report.errors.length) throw Error(report.errors.join("\n"));
  fs.writeFileSync(
    directory + "/browser-checks.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
