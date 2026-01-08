export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string, mime = "application/json") {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function downloadSvg(filename: string, svg: string) {
  downloadBlob(filename, new Blob([svg], { type: "image/svg+xml" }));
}
