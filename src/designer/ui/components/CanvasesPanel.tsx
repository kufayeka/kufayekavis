"use client";

import { useMemo } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import type { DesignerEngine, DesignerState } from "../../core/engine";
import { ColorInput, numberInput, Row } from "./properties/controls";

export function CanvasesPanel({ engine, state }: { engine: DesignerEngine; state: DesignerState }) {
  const project = state.project;
  const canvases = project.canvases;
  const activeId = project.activeCanvasId;
  const defaultCanvasId = project.defaultCanvasId;
  const isViewMode = state.viewMode;

  const activeCanvas = useMemo(() => canvases.find((c) => c.id === activeId) ?? canvases[0], [activeId, canvases]);

  const canDelete = canvases.length > 1;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const onDelete = () => {
    if (!activeCanvas) return;
    if (!canDelete) return;
    const ok = window.confirm(`Delete canvas "${activeCanvas.name}"?`);
    if (!ok) return;
    engine.deleteCanvas(activeCanvas.id);
  };

  const onDuplicate = () => {
    if (!activeCanvas) return;
    engine.duplicateCanvas(activeCanvas.id);
  };

  const onAdd = () => {
    engine.addCanvas();
  };

  const commitName = (raw: string) => {
    if (!activeCanvas) return;
    const trimmed = (raw ?? "").trim();
    if (!trimmed) return;
    if (trimmed !== activeCanvas.name) engine.renameCanvas(activeCanvas.id, trimmed);
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
        <ButtonGroup size="small" variant="outlined">
          <Button startIcon={<AddIcon />} onClick={onAdd} disabled={isViewMode}>
            Add
          </Button>
          <Button startIcon={<FileCopyIcon />} onClick={onDuplicate} disabled={isViewMode || !activeCanvas}>
            Duplicate
          </Button>
          <Button startIcon={<DeleteIcon />} onClick={onDelete} disabled={isViewMode || !activeCanvas || !canDelete}>
            Delete
          </Button>
        </ButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
          {canvases.length} canvas
        </Typography>
      </Stack>

      <Divider sx={{ mb: 1 }} />

      <List dense disablePadding>
        {canvases.map((c) => (
          <ListItem key={c.id} disablePadding>
            <ListItemButton selected={c.id === activeId} onClick={() => engine.setActiveCanvas(c.id)}>
              {c.id === defaultCanvasId && <StarIcon sx={{ mr: 1, color: "gold" }} />}
              <ListItemText
                primary={c.name}
                secondary={c.id}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ sx: { fontFamily: "monospace" } }}
              />
            </ListItemButton>
            {!isViewMode && (
              <IconButton
                size="small"
                onClick={() => engine.setDefaultCanvas(c.id)}
                disabled={c.id === defaultCanvasId}
                title="Set as first canvas"
              >
                {c.id === defaultCanvasId ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            )}
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1 }} />

      {activeCanvas && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Pengaturan Canvas</Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Canvas ID"
              size="small"
              value={activeCanvas.id}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <Tooltip title="Copy">
              <IconButton onClick={() => void copyToClipboard(activeCanvas.id)} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <TextField
            label="Canvas Name"
            size="small"
            key={activeCanvas.id}
            defaultValue={activeCanvas.name}
            onBlur={(e) => commitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={isViewMode}
            fullWidth
          />

          <Divider />

          {!isViewMode ? (
            <Box className="grid grid-cols-2 gap-2 items-center">
              <Row
                id="canvas-width"
                label="Width"
                control={numberInput("canvas-width", state.doc.canvas.width, (v) => engine.setCanvas({ width: Math.max(1, v) }))}
              />

              <Row
                id="canvas-height"
                label="Height"
                control={numberInput("canvas-height", state.doc.canvas.height, (v) => engine.setCanvas({ height: Math.max(1, v) }))}
              />

              <Row
                id="canvas-bg"
                label="Background"
                control={
                  <ColorInput
                    id="canvas-bg"
                    value={state.doc.canvas.background}
                    onChange={(v) => engine.setCanvas({ background: v })}
                  />
                }
              />

              <Row
                id="canvas-grid"
                label="Grid"
                control={
                  <Checkbox
                    id="canvas-grid"
                    checked={state.doc.canvas.gridEnabled}
                    onChange={(e) => engine.setCanvas({ gridEnabled: e.target.checked })}
                  />
                }
              />

              <Row
                id="canvas-snap"
                label="Snap to Grid"
                control={
                  <Checkbox
                    id="canvas-snap"
                    checked={state.doc.canvas.snapToGrid}
                    onChange={(e) => engine.setCanvas({ snapToGrid: e.target.checked })}
                  />
                }
              />

              <Row
                id="canvas-grid-size"
                label="Grid Size"
                control={numberInput(
                  "canvas-grid-size",
                  state.doc.canvas.gridSize,
                  (v) => engine.setCanvas({ gridSize: Math.max(1, v) }),
                )}
              />
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              View Mode: canvas settings are locked.
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
