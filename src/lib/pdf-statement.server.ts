import "server-only";

import { PDFParse } from "pdf-parse";

const maxPages = 40;
const maxExtractedCharacters = 2_000_000;

export async function extractBankStatementText(data: Uint8Array) {
  const parser = new PDFParse({ data });

  try {
    const info = await parser.getInfo();
    if (info.total > maxPages) {
      throw new Error(`Bank statements are limited to ${maxPages} pages.`);
    }

    const result = await parser.getText();
    const text = result.text.trim();
    if (text.length < 80) {
      throw new Error(
        "This PDF has no readable transaction text. Export a text-based statement instead of a scan.",
      );
    }
    if (text.length > maxExtractedCharacters) {
      throw new Error("The extracted statement text is too large to process safely.");
    }

    return { pages: info.total, text };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
      throw new Error("Remove the PDF password in your bank app before importing it.");
    }
    throw error;
  } finally {
    await parser.destroy();
  }
}
