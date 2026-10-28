const fs = require("fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  fs.mkdirSync("artifacts/m3", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:8155/lab");
  await page
    .getByRole("combobox", { name: "Pigment allele A", exact: true })
    .waitFor();
  const original = await page.locator(".specimen>.plant-preview").innerHTML();
  await page
    .getByRole("combobox", { name: "Pigment allele A", exact: true })
    .selectOption("G");
  await page.waitForFunction(() =>
    document
      .querySelector(".phenotype-inspector")
      .textContent.includes("green"),
  );
  if (original === (await page.locator(".specimen>.plant-preview").innerHTML()))
    throw Error("Allele edit did not update illustration");
  await page
    .getByLabel("Golden veins · manual preview only", { exact: true })
    .check();
  await page
    .getByLabel("Plant name", { exact: true })
    .fill("M3 acceptance founder");
  const savedResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/plants") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Save designed plant", exact: true })
    .click();
  const saved = await (await savedResponse).json();
  if (saved.mutations.length || saved.generation !== 0)
    throw Error("Manual preview persisted as mutation");
  await page.getByText("Saved to your collection.", { exact: false }).waitFor();
  await page.screenshot({
    path: "artifacts/m3/lab-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Inspect M3 acceptance founder →", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "M3 acceptance founder", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "M3 acceptance founder", exact: true })
    .waitFor();
  await page.goto("http://localhost:8155/breed");
  await page
    .getByRole("combobox", { name: "Parent A", exact: true })
    .selectOption(saved.id);
  await page
    .getByRole("combobox", { name: "Parent B", exact: true })
    .selectOption("10000000-0000-4000-8000-000000000002");
  const bredResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/breeding") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Breed selected parents", exact: true })
    .click();
  const result = await (await bredResponse).json();
  if (
    result.plant.parents.join(",") !==
      [saved.id, "10000000-0000-4000-8000-000000000002"].join(",") ||
    result.plant.generation !== 1
  )
    throw Error("Incorrect lineage");
  await page
    .getByRole("heading", { name: "Velvetleaf · generation 1", exact: true })
    .waitFor();
  await page.screenshot({
    path: "artifacts/m3/breed-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Inspect child & lineage →", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Velvetleaf · generation 1", exact: true })
    .waitFor();
  await page.screenshot({
    path: "artifacts/m3/lineage-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "Velvetleaf · generation 1", exact: true })
    .waitFor();
  await page
    .getByRole("link", {
      name: "Parent A · " + saved.id.slice(0, 8) + " →",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: "M3 acceptance founder", exact: true })
    .waitFor();
  for (const route of ["/lab", "/breed", "/plants/" + result.plant.id]) {
    await page.setViewportSize({ width: 360, height: 1000 });
    await page.goto("http://localhost:8155" + route);
    await page
      .getByRole("status")
      .filter({ hasText: "Laboratory online" })
      .waitFor();
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Mobile overflow " + route);
    await page.screenshot({
      path:
        "artifacts/m3/" +
        (route.startsWith("/plants") ? "details" : route.slice(1)) +
        "-mobile.png",
      fullPage: true,
    });
  }
  if (errors.length) throw Error(errors.join("\n"));
  fs.writeFileSync(
    "artifacts/m3/browser-checks.json",
    JSON.stringify(
      {
        savedPlantId: saved.id,
        childId: result.plant.id,
        eventId: result.event.id,
        checks: [
          "allele preview update",
          "manual mutation not persisted",
          "saved founder reload",
          "persisted cross and generation",
          "child reload",
          "lineage parent link",
          "360px no overflow",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("M3 browser acceptance passed", result.plant.id);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
