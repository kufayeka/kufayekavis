"use client";

import { IconButton, List, ListItem, ListItemButton, ListItemText, Stack, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import type { DesignerEngine, DesignerState } from "../../core/engine";
import { getElementBBox } from "../../core/geometry";
import { clamp } from "../../core/math";

export function ElementsPanel({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const focusElementInCanvas = (elementId: string) => {
    const el = state.doc.elements[elementId];
    if (!el) return;

    const scroller = document.querySelector<HTMLElement>("[data-designer-scroller='1']");
    if (!scroller) return;

    const safeLeft = Number(scroller.dataset.safeLeft ?? 0);
    const safeRight = Number(scroller.dataset.safeRight ?? 0);
    const safeTop = Number(scroller.dataset.safeTop ?? 0);
    const safeBottom = Number(scroller.dataset.safeBottom ?? 0);

    const visibleW = Math.max(1, scroller.clientWidth - safeLeft - safeRight);
    const visibleH = Math.max(1, scroller.clientHeight - safeTop - safeBottom);

    const box = getElementBBox(el, state.doc);
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const scale = state.zoom.scale;

    const newPanX = centerX - visibleW / (2 * scale);
    const newPanY = centerY - visibleH / (2 * scale);
    const maxPanX = Math.max(0, state.doc.canvas.width - visibleW / scale);
    const maxPanY = Math.max(0, state.doc.canvas.height - visibleH / scale);

    engine.setZoom({ panX: clamp(newPanX, 0, maxPanX), panY: clamp(newPanY, 0, maxPanY) });
  };

  const elements = Object.values(state.doc.elements)
    .filter(Boolean)
    .slice()
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0) || a.id.localeCompare(b.id));

  return (
    <List dense disablePadding>
      {elements.map((el) => {
        const isLocked = Boolean(el.locked);
        const isHidden = Boolean(el.hidden);
        const isSelected = state.selection.ids.includes(el.id);
        const primary = (el.name && el.name.trim().length > 0 ? el.name.trim() : el.type) + (el.type === "custom" ? ` (${el.kind})` : "");

        return (
          <ListItem
            key={el.id}
            disablePadding
            divider
            secondaryAction={
              <Stack direction="row" spacing={0.5}>
                <Tooltip title={isHidden ? "Show" : "Hide"}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      engine.updateElements([el.id], (cur) => ({ ...cur, hidden: !Boolean(cur.hidden) }));
                    }}
                  >
                    {isHidden ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                <Tooltip title={isLocked ? "Unlock" : "Lock"}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      engine.updateElements([el.id], (cur) => ({ ...cur, locked: !Boolean(cur.locked) }));
                    }}
                  >
                    {isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Duplicate">
                  <IconButton
                    size="small"
                    onClick={() => {
                      engine.select([el.id]);
                      engine.duplicateSelection();
                    }}
                  >
                    <FileCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Copy id">
                  <IconButton
                    size="small"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(el.id);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      engine.deleteElements([el.id]);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
          >
            <ListItemButton
              selected={isSelected}
              onClick={() => {
                engine.select([el.id]);
                requestAnimationFrame(() => focusElementInCanvas(el.id));
              }}
              sx={{ pr: 16 }}
            >
              <ListItemText primary={primary} secondary={el.id} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}
