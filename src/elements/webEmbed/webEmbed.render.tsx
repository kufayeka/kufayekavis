import React from "react";
import type { DesignerElement } from "../../designer/core/types";

type RenderCtx = {
  element: DesignerElement;
};

// Helper function to normalize URLs
function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return "https://example.com";
  
  const trimmed = url.trim();
  if (!trimmed) return "https://example.com";
  
  // If it already has a protocol, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // If it starts with www., add https://
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  
  // For other cases, assume it's a domain and add https://
  return `https://${trimmed}`;
}

export function renderWebEmbed(ctx: unknown): unknown {
    const { element } = ctx as RenderCtx;
    const el = element as any; // Cast to access custom props
    const props = el.props || {};
    const url = normalizeUrl(props.url || "https://example.com");
    const allowFullscreen = props.allowFullscreen ? "allowfullscreen" : "";
    const allowScripts = props.allowScripts ? "" : "sandbox"; // If not allowing scripts, use sandbox
    const title = props.title || "Embedded Web Content";

    // For SVG canvas, we use foreignObject to embed HTML
    return React.createElement(
        "foreignObject",
        {
            x: 0,
            y: 0,
            width: el.width,
            height: el.height
        },
        React.createElement(
            "div",
            {
                xmlns: "http://www.w3.org/1999/xhtml",
                style: {
                    width: '100%',
                    height: '100%',
                    border: `1px solid ${el.stroke || '#ccc'}`,
                    borderRadius: '4px',
                    overflow: 'hidden'
                }
            },
            React.createElement("iframe", {
                src: url,
                title: title,
                width: "100%",
                height: "100%",
                style: {
                    border: 'none',
                    pointerEvents: 'auto'
                },
                allowFullScreen: !!allowFullscreen,
                sandbox: allowScripts ? undefined : "allow-same-origin allow-scripts",
                loading: "lazy"
            })
        )
    );
}

export function exportWebEmbedSvg(ctx: unknown): string {
    const { element } = ctx as RenderCtx;
    const el = element as any;
    const props = el.props || {};
    const url = normalizeUrl(props.url || "https://example.com");
    const title = props.title || "Embedded Web Content";

    // For SVG export, we can't actually embed iframes, so we'll show a placeholder
    return `<rect x="0" y="0" width="${el.width}" height="${el.height}" fill="${el.fill || 'white'}" stroke="${el.stroke || '#ccc'}" stroke-width="${el.strokeWidth || 1}" rx="4" />
<text x="${el.width / 2}" y="${el.height / 2 - 10}" text-anchor="middle" font-size="12" fill="${el.stroke || '#666'}">Web Embed</text>
<text x="${el.width / 2}" y="${el.height / 2 + 10}" text-anchor="middle" font-size="10" fill="${el.stroke || '#999'}">${url}</text>`;
}