import mammoth from "mammoth";
import { extractText } from "unpdf";

async function readBlobAsText(file: Blob): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function readBlobAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts raw text from uploaded files:
 * - .txt and .csv: plain text reading
 * - .docx: extracts paragraphs using Mammoth
 * - .pdf: extracts text layers page-by-page using unpdf
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (extension === "txt" || extension === "csv" || file.type.startsWith("text/")) {
    return readBlobAsText(file);
  }

  if (
    extension === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const arrayBuffer = await readBlobAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  if (extension === "pdf" || file.type === "application/pdf") {
    const arrayBuffer = await readBlobAsArrayBuffer(file);
    const { text } = await extractText(arrayBuffer);
    if (Array.isArray(text)) {
      return text.join("\n");
    }
    return String(text || "");
  }

  // Fallback to text reading
  return readBlobAsText(file);
}
