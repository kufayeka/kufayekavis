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

function cssEscape(value: string): string {
  // CSS.escape is not available in all runtimes/types by default.
  // This minimal escape is sufficient for our generated element ids.
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function focusElementInCanvas(elementId: string) {
  const node = document.querySelector(`[data-el-id="${cssEscape(elementId)}"]`) as Element | null;
  if (!node) return;

  const scroller = (node.closest?.('[data-designer-scroller="1"]') as HTMLElement | null) ?? null;
  if (!scroller) {
    node.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    return;
  }

  const safeLeft = Number(scroller.dataset.safeLeft ?? 0);
  const safeRight = Number(scroller.dataset.safeRight ?? 0);
  const safeTop = Number(scroller.dataset.safeTop ?? 0);
  const safeBottom = Number(scroller.dataset.safeBottom ?? 0);

  const safeWidth = Math.max(0, scroller.clientWidth - safeLeft - safeRight);
  const safeHeight = Math.max(0, scroller.clientHeight - safeTop - safeBottom);

  const nodeRect = node.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();

  // Current element center position within the scroller's visible client area.
  const centerX = nodeRect.left - scrollerRect.left + nodeRect.width / 2;
  const centerY = nodeRect.top - scrollerRect.top + nodeRect.height / 2;

  // Desired center position within the *safe* viewport (excluding overlay panels).
  const targetCenterX = safeLeft + safeWidth / 2;
  const targetCenterY = safeTop + safeHeight / 2;

  const nextLeft = scroller.scrollLeft + (centerX - targetCenterX);
  const nextTop = scroller.scrollTop + (centerY - targetCenterY);

  scroller.scrollTo({ left: nextLeft, top: nextTop, behavior: "smooth" });
}

export function ElementsPanel({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
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
