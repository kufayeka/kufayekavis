import type React from "react";
import {
    Bounds,
    CanvasElement,
    CanvasSettings,
    Point,
} from "./models";
import { getBounds, getCenter, getHandlePositions } from "./geometry";

const applyTransform = (
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    element: CanvasElement,
    draw: () => void
) => {
    const center = getCenter(bounds);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
    ctx.globalAlpha = element.opacity;
    draw();
    ctx.restore();
};

const drawRect = (ctx: CanvasRenderingContext2D, bounds: Bounds, radius: number) => {
    const { width, height } = bounds;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(-width / 2 + r, -height / 2);
    ctx.lineTo(width / 2 - r, -height / 2);
    ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + r);
    ctx.lineTo(width / 2, height / 2 - r);
    ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - r, height / 2);
    ctx.lineTo(-width / 2 + r, height / 2);
    ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - r);
    ctx.lineTo(-width / 2, -height / 2 + r);
    ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + r, -height / 2);
    ctx.closePath();
};

const drawElement = (
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    elementsById: Record<string, CanvasElement>
) => {
    if (!element.visible) return;

    if (element.type === "group") {
        element.children.forEach((childId) => {
            const child = elementsById[childId];
            if (child) drawElement(ctx, child, elementsById);
        });
        return;
    }

    const bounds = getBounds(element, elementsById);
    const strokeWidth = element.strokeWidth ?? 1;

    applyTransform(ctx, bounds, element, () => {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = element.stroke;
        ctx.fillStyle = element.fill;

        switch (element.type) {
            case "rect":
                drawRect(ctx, bounds, element.radius);
                if (element.fill !== "transparent") ctx.fill();
                if (strokeWidth > 0 && element.stroke !== "transparent") ctx.stroke();
                break;
            case "circle":
                ctx.beginPath();
                ctx.ellipse(0, 0, bounds.width / 2, bounds.height / 2, 0, 0, Math.PI * 2);
                if (element.fill !== "transparent") ctx.fill();
                if (strokeWidth > 0 && element.stroke !== "transparent") ctx.stroke();
                break;
            case "image": {
                const img = new Image();
                img.src = element.src;
                ctx.save();
                ctx.beginPath();
                ctx.rect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
                ctx.clip();
                ctx.drawImage(
                    img,
                    -bounds.width / 2,
                    -bounds.height / 2,
                    bounds.width,
                    bounds.height
                );
                ctx.restore();
                if (strokeWidth > 0 && element.stroke !== "transparent") ctx.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
                break;
            }
            case "text":
                ctx.textBaseline = "top";
                ctx.font = `${element.fontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.fill;
                ctx.fillText(element.text, -bounds.width / 2, -bounds.height / 2, bounds.width);
                break;
            case "line":
                ctx.beginPath();
                ctx.moveTo(element.x1 - bounds.x - bounds.width / 2, element.y1 - bounds.y - bounds.height / 2);
                ctx.lineTo(element.x2 - bounds.x - bounds.width / 2, element.y2 - bounds.y - bounds.height / 2);
                ctx.stroke();
                break;
            case "freehand":
                if (element.points.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(
                    element.points[0].x - bounds.x - bounds.width / 2,
                    element.points[0].y - bounds.y - bounds.height / 2
                );
                element.points.slice(1).forEach((p) => {
                    ctx.lineTo(p.x - bounds.x - bounds.width / 2, p.y - bounds.y - bounds.height / 2);
                });
                ctx.stroke();
                break;
            default:
                break;
        }
    });
};

const drawGrid = (
    ctx: CanvasRenderingContext2D,
    settings: CanvasSettings
) => {
    if (!settings.gridEnabled) return;
    const { width, height, gridSize } = settings;
    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    ctx.restore();
};

const drawRotatedSelection = (
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    rotation: number
) => {
    ctx.save();
    const center = getCenter(bounds);
    ctx.translate(center.x, center.y);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.strokeStyle = "#60a5fa";
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
    ctx.setLineDash([]);

    const handles = getHandlePositions(bounds);
    Object.values(handles).forEach((handle) => {
        const localX = handle.x - center.x;
        const localY = handle.y - center.y;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#60a5fa";
        ctx.fillRect(localX - 5, localY - 5, 10, 10);
        ctx.strokeRect(localX - 5, localY - 5, 10, 10);
    });

    const rotateHandleOffset = { x: 0, y: -bounds.height / 2 - 24 };
    ctx.beginPath();
    ctx.moveTo(0, -bounds.height / 2);
    ctx.lineTo(rotateHandleOffset.x, rotateHandleOffset.y);
    ctx.strokeStyle = "#60a5fa";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#60a5fa";
    ctx.beginPath();
    ctx.arc(rotateHandleOffset.x, rotateHandleOffset.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
};

const drawSelection = (ctx: CanvasRenderingContext2D, bounds: Bounds) => {
    drawRotatedSelection(ctx, bounds, 0);
};

const drawLineSelection = (
    ctx: CanvasRenderingContext2D,
    element: CanvasElement
) => {
    if (element.type !== "line") return;
    ctx.save();
    ctx.strokeStyle = "#60a5fa";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(element.x1, element.y1);
    ctx.lineTo(element.x2, element.y2);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawHandle = (x: number, y: number) => {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#60a5fa";
        ctx.fillRect(x - 5, y - 5, 10, 10);
        ctx.strokeRect(x - 5, y - 5, 10, 10);
    };

    drawHandle(element.x1, element.y1);
    drawHandle(element.x2, element.y2);
    ctx.restore();
};

export const renderCanvas = (
    ctx: CanvasRenderingContext2D,
    settings: CanvasSettings,
    rootIds: string[],
    elementsById: Record<string, CanvasElement>,
    selectedIds: string[],
    marqueeBounds?: Bounds
) => {
    ctx.clearRect(0, 0, settings.width, settings.height);
    ctx.fillStyle = settings.background;
    ctx.fillRect(0, 0, settings.width, settings.height);

    drawGrid(ctx, settings);

    rootIds.forEach((id) => {
        const element = elementsById[id];
        if (element) drawElement(ctx, element, elementsById);
    });

    if (selectedIds.length === 1) {
        const selected = elementsById[selectedIds[0]];
        if (selected?.type === "line") {
            drawLineSelection(ctx, selected);
        } else if (selected) {
            drawRotatedSelection(
                ctx,
                getBounds(selected, elementsById),
                selected.rotation ?? 0
            );
        }
    } else if (selectedIds.length > 1) {
        const boundsList = selectedIds
            .map((id) => elementsById[id])
            .filter(Boolean)
            .map((element) => getBounds(element, elementsById));
        if (boundsList.length) {
            const minX = Math.min(...boundsList.map((b) => b.x));
            const minY = Math.min(...boundsList.map((b) => b.y));
            const maxX = Math.max(...boundsList.map((b) => b.x + b.width));
            const maxY = Math.max(...boundsList.map((b) => b.y + b.height));
            drawSelection(ctx, {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
            });
        }
    }

    if (marqueeBounds) {
        ctx.save();
        ctx.strokeStyle = "#60a5fa";
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(
            marqueeBounds.x,
            marqueeBounds.y,
            marqueeBounds.width,
            marqueeBounds.height
        );
        ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
        ctx.fillRect(
            marqueeBounds.x,
            marqueeBounds.y,
            marqueeBounds.width,
            marqueeBounds.height
        );
        ctx.restore();
    }
};

export const toCanvasPoint = (
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement
): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
};
