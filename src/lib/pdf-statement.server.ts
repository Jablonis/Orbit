import "server-only";

const maxPages = 40;
const maxExtractedCharacters = 2_000_000;

export async function extractBankStatementText(data: Uint8Array) {
  let pdfParse: typeof import("pdf-parse");
  try {
    // pdf-parse requires its worker entry point in serverless environments.
    // Loading both modules here keeps platform-specific startup errors inside
    // the Route Handler's JSON error boundary instead of crashing the function.
    await import("pdf-parse/worker");
    pdfParse = await import("pdf-parse");
  } catch {
    throw new Error("The PDF engine could not start on this server.");
  }

  const parser = new pdfParse.PDFParse({
    data,
    verbosity: pdfParse.VerbosityLevel.WARNINGS,
  });

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
