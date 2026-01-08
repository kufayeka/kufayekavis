export async function loadImageSize(href: string): Promise<{ naturalWidth?: number; naturalHeight?: number }> {
  return await new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = href;
      // Some browsers won't fire onload for data URLs that are empty; guard with timeout
      setTimeout(() => {
        resolve({ naturalWidth: img.naturalWidth || undefined, naturalHeight: img.naturalHeight || undefined });
      }, 500);
    } catch {
      resolve({});
    }
  });
}

export function rotateDelta(dx: number, dy: number, degrees: number): { dx: number; dy: number } {
  if (!degrees) return { dx, dy };
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { dx: dx * c - dy * s, dy: dx * s + dy * c };
}

export function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  const [first, ...rest] = points;
  const parts = [`M ${first.x} ${first.y}`];
  for (const p of rest) parts.push(`L ${p.x} ${p.y}`);
  return parts.join(" ");
}

export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}
