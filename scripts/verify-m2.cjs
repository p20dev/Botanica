const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const directory = "artifacts/m2";
fs.mkdirSync(directory, { recursive: true });
(async () => {
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
  const report = { routes: [], exports: [], errors: [] };
  page.on("pageerror", (e) => report.errors.push(e.message));
  async function checkWidth(route, width) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("http://localhost:8155" + route);
    await page
      .getByRole("status")
      .filter({ hasText: "Laboratory online" })
      .waitFor();
    const size = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    if (size.width !== size.scrollWidth)
      throw Error("Horizontal overflow " + route + " " + width);
    report.routes.push({ route, ...size });
  }
  await checkWidth("/lab", 1440);
  await page.getByLabel("Golden veins · manual preview").check();
  const before = await page.locator(".trait-summary").innerText();
  await page.getByLabel("Visual seed", { exact: true }).fill("9876");
  if ((await page.locator(".trait-summary").innerText()) !== before)
    throw Error("Seed changed phenotype");
  await page.getByLabel("Visual seed", { exact: true }).fill("8155");
  await page.getByLabel("Golden veins · manual preview").uncheck();
  await page.screenshot({
    path: directory + "/lab-desktop.png",
    fullPage: true,
  });
  for (const background of ["warm", "transparent"]) {
    await page
      .getByLabel("Preview & export background")
      .selectOption(background);
    for (const format of ["svg", "png"]) {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page
          .getByRole("button", {
            name: "Export " + format.toUpperCase(),
            exact: true,
          })
          .click(),
      ]);
      if (await download.failure()) throw Error("Download failed");
      await download.saveAs(directory + "/export-" + background + "." + format);
    }
    const svg = fs.readFileSync(
      directory + "/export-" + background + ".svg",
      "utf8",
    );
    if (
      !svg.includes('viewBox="0 0 512 512"') ||
      /<script|foreignObject|<image|href=/.test(svg)
    )
      throw Error("Unsafe SVG export");
    const png = fs
      .readFileSync(directory + "/export-" + background + ".png")
      .toString("base64");
    const comparison = await page.evaluate(
      async ({ svg, png }) => {
        async function raster(url) {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 512;
          const c = canvas.getContext("2d");
          c.drawImage(image, 0, 0, 512, 512);
          return {
            width: image.naturalWidth,
            height: image.naturalHeight,
            data: c.getImageData(0, 0, 512, 512).data,
          };
        }
        const a = await raster("data:image/png;base64," + png),
          b = await raster(
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
          );
        const preview = document.querySelector(
          ".specimen>.plant-preview svg",
        ).outerHTML;
        const c = await raster(
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(preview),
        );
        let pngDifference = 0,
          previewDifference = 0;
        for (let i = 0; i < a.data.length; i++) {
          pngDifference += Math.abs(a.data[i] - b.data[i]);
          previewDifference += Math.abs(a.data[i] - c.data[i]);
        }
        return {
          width: a.width,
          height: a.height,
          corner: Array.from(a.data.slice(0, 4)),
          pngToSvgMeanDifference: pngDifference / a.data.length,
          pngToPreviewMeanDifference: previewDifference / a.data.length,
        };
      },
      { svg, png },
    );
    if (
      comparison.width !== 512 ||
      comparison.height !== 512 ||
      comparison.pngToSvgMeanDifference > 0.1 ||
      comparison.pngToPreviewMeanDifference > 0.1
    )
      throw Error("Export mismatch " + JSON.stringify(comparison));
    if (
      background === "transparent"
        ? comparison.corner[3] !== 0
        : comparison.corner.join(",") !== "246,243,232,255"
    )
      throw Error("Wrong background alpha/color");
    report.exports.push({ background, ...comparison });
  }
  await page.getByLabel("Preview & export background").selectOption("warm");
  await page
    .locator(".specimen>.plant-preview")
    .screenshot({ path: directory + "/hero-512.png" });
  await page
    .locator(".specimen-bottom .plant-preview")
    .screenshot({ path: directory + "/icon-64.png" });
  await checkWidth("/gallery", 1440);
  if ((await page.locator(".plant-card").count()) !== 12)
    throw Error("Expected 12 studies");
  await page.screenshot({
    path: directory + "/atlas-desktop.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    window.__qa = {
      gaps: [],
      tasks: [],
      start: performance.now(),
      last: performance.now(),
    };
    new PerformanceObserver((list) =>
      window.__qa.tasks.push(...list.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask", buffered: false });
    const frame = (now) => {
      window.__qa.gaps.push(now - window.__qa.last);
      window.__qa.last = now;
      if (now - window.__qa.start < 3000) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page
    .getByRole("button", { name: "Show 100-seed study", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".plant-card").length === 100,
  );
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  report.performance = await page.evaluate(() => ({
    cards: document.querySelectorAll(".plant-card").length,
    elapsedMs: performance.now() - window.__qa.start,
    maxFrameGapMs: Math.max(...window.__qa.gaps),
    longTasksMs: window.__qa.tasks,
    uniqueIds: new Set(
      Array.from(document.querySelectorAll("[id]")).map((e) => e.id),
    ).size,
    ids: document.querySelectorAll("[id]").length,
  }));
  if (report.performance.ids !== report.performance.uniqueIds)
    throw Error("SVG instance ID collision");
  await page.screenshot({ path: directory + "/smoke-desktop.png" });
  await page
    .getByRole("button", { name: "Show 12 studies", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".plant-card").length === 12,
  );
  for (const route of ["/lab", "/gallery", "/breed", "/about"]) {
    await checkWidth(route, 360);
    if (["/lab", "/gallery"].includes(route))
      await page.screenshot({
        path:
          directory +
          "/" +
          (route === "/lab" ? "lab" : "atlas") +
          "-mobile.png",
        fullPage: true,
      });
  }
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
