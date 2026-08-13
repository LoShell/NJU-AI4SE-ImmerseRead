export async function readTxtFile(file: File): Promise<string> {
  const buffer = await readFileBuffer(file);
  const utf8Text = decodeStrictUtf8(buffer);

  return utf8Text ?? new TextDecoder("gb18030").decode(buffer);
}

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as ArrayBuffer));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("File read failed")));
    reader.readAsArrayBuffer(file);
  });
}

function decodeStrictUtf8(buffer: ArrayBuffer): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return undefined;
  }
}
