"use client";

import type React from "react";

import type { CustomElement } from "../../designer/core/types";
import type { PropertiesSectionRenderCtx } from "../../designer/ui/components/properties/types";
import { BUTTON_ACTION_IDS } from "./button.actions";
import { Button, ButtonGroup, FormControlLabel, Switch, TextField } from "@mui/material";

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function renderButtonProperties(ctxUnknown: unknown): React.ReactNode {
  const { api, state } = ctxUnknown as PropertiesSectionRenderCtx;
  const selectedId = state.selection.ids.length === 1 ? state.selection.ids[0] : null;
  const el = selectedId ? api.getElement(selectedId) : null;
  const isButton = el && el.type === "custom" && el.kind === "button";
  if (!isButton) return null;

  const c = el as CustomElement;
  const props = (c.props ?? {}) as Record<string, unknown>;
  const text = String(props.text ?? "Button");
  const backgroundColor = String(props.backgroundColor ?? "#007bff");
  const textColor = String(props.textColor ?? "#ffffff");
  const fontSize = clampInt(Number(props.fontSize ?? 14), 1, 999);
  const fontWeight = clampInt(Number(props.fontWeight ?? 400), 100, 900);
  const bold = Boolean(props.bold ?? false);
  const italic = Boolean(props.italic ?? false);
  const underline = Boolean(props.underline ?? false);
  const onClickAction = String(props.onClickAction ?? "");

  const useConfirmationDialog = Boolean(props.useConfirmationDialog ?? false);
  const confirmationDialogText = String(props.confirmationDialogText ?? "Are you sure?");
  const okAlias = String(props.okAlias ?? "OK");
  const cancelAlias = String(props.cancelAlias ?? "Cancel");

  return (
    <div className="rounded border border-black/10 p-2 space-y-2">
      <div className="text-sm font-medium">Button</div>

      <TextField
        label="Text"
        value={text}
        onChange={(e) => api.updateCustomProps(c.id, { text: e.target.value })}
        size="small"
        fullWidth
      />

      <TextField
        label="Background Color"
        value={backgroundColor}
        onChange={(e) => api.updateCustomProps(c.id, { backgroundColor: e.target.value })}
        size="small"
        fullWidth
      />

      <TextField
        label="Text Color"
        value={textColor}
        onChange={(e) => api.updateCustomProps(c.id, { textColor: e.target.value })}
        size="small"
        fullWidth
      />

      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Font Size"
          type="number"
          value={fontSize}
          onChange={(e) => api.updateCustomProps(c.id, { fontSize: clampInt(Number(e.target.value), 1, 999) })}
          size="small"
          fullWidth
        />

        <TextField
          label="Font Weight"
          type="number"
          value={fontWeight}
          onChange={(e) => api.updateCustomProps(c.id, { fontWeight: clampInt(Number(e.target.value), 100, 900) })}
          size="small"
          fullWidth
          helperText="100..900 (Bold toggle overrides)"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <FormControlLabel
          control={<Switch checked={bold} onChange={(e) => api.updateCustomProps(c.id, { bold: e.target.checked })} />}
          label="Bold"
        />
        <FormControlLabel
          control={<Switch checked={italic} onChange={(e) => api.updateCustomProps(c.id, { italic: e.target.checked })} />}
          label="Italic"
        />
        <FormControlLabel
          control={<Switch checked={underline} onChange={(e) => api.updateCustomProps(c.id, { underline: e.target.checked })} />}
          label="Underline"
        />
      </div>

      <TextField
        label="On Click Payload"
        value={onClickAction}
        onChange={(e) => api.updateCustomProps(c.id, { onClickAction: e.target.value })}
        size="small"
        fullWidth
        helperText='Optional metadata sent with MQTT event "onClick" as field "action".'
      />

      <div className="rounded border border-black/10 p-2 space-y-2">
        <div className="text-xs font-medium text-black/70">Confirmation Dialog</div>

        <FormControlLabel
          control={
            <Switch
              checked={useConfirmationDialog}
              onChange={(e) => api.updateCustomProps(c.id, { useConfirmationDialog: e.target.checked })}
            />
          }
          label="Use confirm() before click"
        />

        <TextField
          label="Dialog Text"
          value={confirmationDialogText}
          onChange={(e) => api.updateCustomProps(c.id, { confirmationDialogText: e.target.value })}
          size="small"
          fullWidth
          multiline
          minRows={3}
          helperText="Shown using window.confirm(...)."
        />

        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="OK Alias"
            value={okAlias}
            onChange={(e) => api.updateCustomProps(c.id, { okAlias: e.target.value })}
            size="small"
            fullWidth
            helperText="Note: browser confirm() can't rename buttons. Used as hint text."
          />

          <TextField
            label="Cancel Alias"
            value={cancelAlias}
            onChange={(e) => api.updateCustomProps(c.id, { cancelAlias: e.target.value })}
            size="small"
            fullWidth
            helperText="Note: browser confirm() can't rename buttons. Used as hint text."
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <ButtonGroup>
          <Button onClick={() => api.callElementAction(c.id, BUTTON_ACTION_IDS.setText, "New Button")}>Set Text=New Button</Button>
          <Button onClick={() => api.callElementAction(c.id, BUTTON_ACTION_IDS.setBackgroundColor, "#28a745")}>Green BG</Button>
          <Button onClick={() => api.callElementAction(c.id, BUTTON_ACTION_IDS.setTextColor, "#000000")}>Black Text</Button>
        </ButtonGroup>
      </div>
    </div>
  );
}