import { test, expect, type Page } from "@playwright/test";

const repeated = "山风吹过，松涛阵阵。";
const first = `第一章 初入江湖\n\n${repeated}\n\n少年背着竹箧，走在通往青云山的官道上。\n\n${repeated}\n\n${"落日余晖铺洒在山路上，远处的村庄升起炊烟。\n\n".repeat(50)}`;
const novel = `${first}\n第二章 未读秘密\n\n禁止出现的中间章节秘密。\n\n第三章 城门\n\n青砖黑瓦，门楼上挂着青云二字。`;

async function upload(page: Page) {
  await page.getByLabel("上传 TXT 小说").setInputFiles({ name: "青山旧事.txt", mimeType: "text/plain", buffer: Buffer.from(novel) });
  await expect(page.getByRole("heading", { name: "第一章 初入江湖" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { status: "ok", llmConfigured: true } }));
  await page.goto("/");
});

test("real IndexedDB: second occurrence annotation, chapter and scroll survive reload", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await upload(page);
  await page.evaluate((text) => {
    const root = document.querySelector("[data-reader-text]")!;
    const start = root.textContent!.lastIndexOf(text);
    const range = document.createRange(); range.setStart(root.firstChild!, start); range.setEnd(root.firstChild!, start + text.length);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  }, repeated);
  await page.locator("[data-floating-toolbar]").getByRole("button", { name: "批注", exact: true }).click();
  await page.getByLabel("批注内容").fill("这里的重复像是在回应开篇。");
  await page.getByRole("button", { name: "保存批注" }).click();
  await expect(page.getByText("这里的重复像是在回应开篇。")).toBeVisible();
  const start = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("immerseread", 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const items = await new Promise<Array<{startChar: number}>>((resolve) => { const request = db.transaction("annotations").objectStore("annotations").getAll(); request.onsuccess = () => resolve(request.result); });
    db.close(); return items[0].startChar;
  });
  expect(start).toBe(first.lastIndexOf(repeated));
  await page.locator(".reader-scroll").evaluate(element => { element.scrollTop = 900; element.dispatchEvent(new Event("scroll")); });
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const req = indexedDB.open("immerseread"); req.onsuccess = () => resolve(req.result); });
    const value = await new Promise<Array<{scrollRatio:number}>>(resolve => { const req = db.transaction("progress").objectStore("progress").getAll(); req.onsuccess = () => resolve(req.result); });
    db.close(); return value[0]?.scrollRatio ?? 0;
  })).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "第一章 初入江湖" })).toBeVisible();
  await expect.poll(() => page.locator(".reader-scroll").evaluate(element => element.scrollTop)).toBeGreaterThan(800);
  await page.getByRole("button", { name: "批注", exact: true }).click();
  await expect(page.getByText("这里的重复像是在回应开篇。")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desktop.png") });
  await page.getByRole("button", { name: `删除批注 ${repeated}` }).click();
  const confirm = page.getByRole("dialog", { name: "删除这条批注？" });
  await expect(confirm).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("annotation-delete.png") });
  await confirm.getByRole("button", { name: "取消删除" }).click();
  await expect(page.getByText("这里的重复像是在回应开篇。")).toBeVisible();
  expect(errors).toEqual([]);
});

test("jumping chapters excludes unread text; late chat is cancelled on chapter change", async ({ page }) => {
  await upload(page);
  let context = "";
  await page.route("**/api/llm/chat", async route => {
    context = route.request().postDataJSON().allowedContext;
    await route.fulfill({ json: { content: "只基于已读片段。", modelName: "test-fixture" } });
  });
  await page.getByRole("button", { name: "第三章 城门", exact: true }).click();
  await page.getByLabel("给书搭子的消息").fill("帮我梳理目前的线索");
  await page.getByRole("button", { name: "发送消息" }).click();
  await expect(page.getByText("只基于已读片段。")).toBeVisible();
  expect(context).toContain("青砖黑瓦");
  expect(context).not.toContain("禁止出现的中间章节秘密");
  await page.unroute("**/api/llm/chat");
  let requested = false;
  await page.route("**/api/llm/chat", async route => {
    requested = true;
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ json: { content: "不应该出现的迟到回复", modelName: "test-fixture" } }).catch(() => {});
  });
  await page.getByLabel("给书搭子的消息").fill("继续解释");
  await page.getByRole("button", { name: "发送消息" }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "第一章 初入江湖", exact: true }).click();
  await expect(page.getByRole("heading", { name: "第一章 初入江湖" })).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page.getByText("不应该出现的迟到回复")).toHaveCount(0);
});

test("one real audio instance survives tabs, chapters, collapse and volume changes", async ({ page }) => {
  await upload(page);
  await page.getByRole("button", { name: "打开音乐曲库" }).click();
  const dialog = page.getByRole("dialog", { name: "音乐曲库" });
  await dialog.getByRole("button", { name: /^播放 / }).first().click();
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await page.locator("audio").evaluate(element => { element.dataset.instance = "original"; });
  await expect(page.locator("audio")).toHaveJSProperty("paused", false);
  const src = await page.locator("audio").getAttribute("src");
  await page.getByRole("button", { name: "批注", exact: true }).click();
  await page.getByRole("button", { name: "第三章 城门", exact: true }).click();
  await page.getByRole("button", { name: "收起音乐栏" }).click();
  await page.getByRole("button", { name: "展开音乐栏" }).click();
  await page.getByLabel("音量").fill("25");
  await expect(page.locator("audio")).toHaveJSProperty("volume", .25);
  await expect(page.locator("audio")).toHaveAttribute("data-instance", "original");
  await expect(page.locator("audio")).toHaveAttribute("src", src!);
  await expect(page.locator("audio")).toHaveJSProperty("paused", false);
});

test("reference settings and collapsed sidebars remain usable at phone width", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload();
  await page.getByRole("button", { name: "阅读设置", exact: true }).click();
  await page.getByRole("button", { name: "夜间", exact: true }).click();
  await page.getByRole("button", { name: "关闭阅读设置" }).click();
  await expect(page.locator(".figma-reader")).toHaveClass(/reader-theme-night/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: "展开书架" }).click();
  await expect(page.getByLabel("上传 TXT 小说")).toBeAttached();
  await page.getByRole("button", { name: "折叠书架" }).click();
  await page.screenshot({ path: testInfo.outputPath("mobile-night.png") });
  await page.reload();
  await expect(page.locator(".figma-reader")).toHaveClass(/reader-theme-night/);
});

test("uploaded audio and its tags persist in IndexedDB and can be deleted", async ({ page }) => {
  // A self-generated PCM WAV avoids relying on external audio files.
  const samples = 8000, wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(samples * 2, 40);
  await page.getByRole("button", { name: "打开音乐曲库" }).click();
  await page.getByLabel("音乐标签").fill("治愈 雨夜");
  await page.getByLabel("上传本地音频").setInputFiles({ name: "测试音景.wav", mimeType: "audio/wav", buffer: wav });
  await expect(page.getByRole("button", { name: "播放 测试音景" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开音乐曲库" }).click();
  await expect(page.getByRole("dialog").getByText("治愈 · 雨夜")).toBeVisible();
  await page.getByRole("button", { name: "播放 测试音景" }).click();
  await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  await page.getByRole("button", { name: "删除音乐 测试音景" }).click();
  const confirm = page.getByRole("dialog", { name: "删除这首音乐？" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "取消删除" }).click();
  await expect(page.getByRole("button", { name: "播放 测试音景" })).toBeVisible();
  await page.getByRole("button", { name: "删除音乐 测试音景" }).click();
  await confirm.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("button", { name: "播放 测试音景" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "打开音乐曲库" }).click();
  await expect(page.getByRole("button", { name: "播放 测试音景" })).toHaveCount(0);
});

test("history hiding is explained and conversations return at the original scope", async ({ page }) => {
  await page.route("**/api/llm/chat", route => route.fulfill({ json: { content: "第三章的已读讨论记录。", modelName: "test-fixture" } }));
  await upload(page);
  await page.getByRole("button", { name: "第三章 城门", exact: true }).click();
  await page.getByLabel("给书搭子的消息").fill("城门前有什么线索？");
  await page.getByRole("button", { name: "发送消息" }).click();
  await expect(page.getByText("第三章的已读讨论记录。")).toBeVisible();
  await page.getByRole("button", { name: "第一章 初入江湖", exact: true }).click();
  await expect(page.getByText(/条对话因当前阅读范围暂时隐藏/)).toBeVisible();
  await expect(page.getByText("第三章的已读讨论记录。")).toHaveCount(0);
  await page.getByRole("button", { name: "第三章 城门", exact: true }).click();
  await expect(page.getByText("第三章的已读讨论记录。")).toBeVisible();
  await expect(page.getByText(/条对话因当前阅读范围暂时隐藏/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("第三章的已读讨论记录。")).toBeVisible();
});

test("AI music lock hides old and late recommendations while manual controls stay usable", async ({ page }) => {
  await upload(page);
  await expect(page.getByText(/重复上传会创建新副本/)).toBeVisible();
  await page.route("**/api/llm/atmosphere", async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ json: { segmentId: route.request().postDataJSON().segmentId, moods: ["轻松"], scenes: ["夕阳"], pace: "slow", intensity: .5, energy: .4, darkness: .85, warmth: .2, tags: [], chapterEndPrompt: "缓慢的叙事。", modelName: "test-fixture" } });
  });
  await page.getByRole("button", { name: "氛围", exact: true }).click();
  await page.getByRole("button", { name: "分析当前氛围" }).click();
  await expect(page.getByText("推荐 BGM（需确认后才会切换）")).toBeVisible();
  await page.getByRole("button", { name: "切换", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "确认", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "锁定 AI 换曲", exact: true }).click();
  await expect(page.getByText(/当前配乐已锁定，AI 换曲建议已暂停/)).toBeVisible();
  await expect(page.getByRole("button", { name: "确认", exact: true })).toHaveCount(0);
  await expect(page.getByText("推荐 BGM（需确认后才会切换）")).toHaveCount(0);
  await page.getByRole("button", { name: "解除 AI 换曲锁定", exact: true }).last().click();
  await expect(page.getByText("推荐 BGM（需确认后才会切换）")).toBeVisible();
  await page.getByRole("button", { name: "分析当前氛围" }).click();
  await page.getByRole("button", { name: "锁定 AI 换曲", exact: true }).click();
  await expect(page.getByRole("button", { name: "分析当前氛围" })).toBeVisible();
  await expect(page.getByText("推荐 BGM（需确认后才会切换）")).toHaveCount(0);
  await page.getByRole("button", { name: "下一首", exact: true }).click();
  await expect(page.getByRole("button", { name: "锁定 AI 换曲", exact: true })).toBeVisible();
  await expect(page.getByText("推荐 BGM（需确认后才会切换）")).toBeVisible();
});
