import { describe, expect, it } from "vitest";
import { readTxtFile } from "./textFileReader";

describe("readTxtFile", () => {
  it("decodes GB18030 Chinese TXT files without replacement characters", async () => {
    const gb18030Bytes = new Uint8Array([
      0xc7, 0xa1, 0xb7, 0xea, 0xd3, 0xea, 0xc1, 0xac, 0xcc, 0xec, 0x0d, 0x0a, 0x0d, 0x0a,
      0xd7, 0xf7, 0xd5, 0xdf, 0xa3, 0xba, 0xb3, 0xc1, 0xf3, 0xe3, 0xd6, 0xae
    ]);
    const file = new File([gb18030Bytes], "恰逢雨连天.txt", { type: "text/plain" });

    await expect(readTxtFile(file)).resolves.toContain("恰逢雨连天");
    await expect(readTxtFile(file)).resolves.not.toContain("�");
  });

  it("keeps UTF-8 TXT files readable", async () => {
    const file = new File(["第一章 雨夜\n她推门进来。"], "utf8.txt", { type: "text/plain" });

    await expect(readTxtFile(file)).resolves.toContain("第一章 雨夜");
  });
});
