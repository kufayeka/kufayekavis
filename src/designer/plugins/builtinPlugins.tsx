"use client";
import type { DesignerPlugin } from "../core/plugins";

import { rectElementDefinition } from "../../elements/native/rect/rect.definition";
import { circleElementDefinition } from "../../elements/native/circle/circle.definition";
import { lineElementDefinition } from "../../elements/native/line/line.definition";
import { freeElementDefinition } from "../../elements/native/free/free.definition";
import { imageElementDefinition } from "../../elements/native/image/image.definition";
import { textElementDefinition } from "../../elements/native/text/text.definition";

import { renderRectProperties } from "../../elements/native/rect/rect.properties";
import { renderCircleProperties } from "../../elements/native/circle/circle.properties";
import { renderLineProperties } from "../../elements/native/line/line.properties";
import { renderFreeProperties } from "../../elements/native/free/free.properties";
import { renderImageProperties } from "../../elements/native/image/image.properties";
import { renderTextProperties } from "../../elements/native/text/text.properties";

import { numericDisplayElementDefinition } from "../../elements/numericDisplay/numericDisplay.definition";
import { renderNumericDisplayProperties } from "../../elements/numericDisplay/numericDisplay.properties";
import { webEmbedElementDefinition } from "../../elements/webEmbed/webEmbed.definition";
import { renderWebEmbedProperties } from "../../elements/webEmbed/webEmbed.properties";
import { motionPathLineElementDefinition } from "../../elements/motionPathLine/motionPathLine.definition";
import { renderMotionPathLineProperties } from "../../elements/motionPathLine/motionPathLine.properties";
import { gaugeElementDefinition } from "../../elements/gauge/gauge.definition";
import { renderGaugeProperties } from "../../elements/gauge/gauge.properties";
import { barGaugeElementDefinition } from "../../elements/barGauge/barGauge.definition";
import { renderBarGaugeProperties } from "../../elements/barGauge/barGauge.properties";
import { registerBuiltInUiContributions } from "../ui/components/builtins/registerBuiltInUi";

export const builtInUiPlugin: DesignerPlugin = {
  id: "builtin.ui",
  activate: (ctx) => {
    const host = ctx.host;
    const engine = ctx.engine ?? ctx.api.engine;
    if (!host) return;

    return registerBuiltInUiContributions({ host, engine });
  },
};

export const rectElementPlugin: DesignerPlugin = {
  id: "builtin.element.rect",
  activate: (ctx) => [
    ctx.elements.register(rectElementDefinition),
    ctx.registry.registerPropertiesSection({ id: "builtin.props.rect", render: renderRectProperties }),
  ],
};

export const circleElementPlugin: DesignerPlugin = {
  id: "builtin.element.circle",
  activate: (ctx) => [
    ctx.elements.register(circleElementDefinition),
    ctx.registry.registerPropertiesSection({ id: "builtin.props.circle", render: renderCircleProperties }),
  ],
};

export const lineElementPlugin: DesignerPlugin = {
  id: "builtin.element.line",
  activate: (ctx) => [
    ctx.elements.register(lineElementDefinition),
    ctx.registry.registerPropertiesSection({ id: "builtin.props.line", render: renderLineProperties }),
  ],
};

export const freeElementPlugin: DesignerPlugin = {
  id: "builtin.element.free",
  activate: (ctx) => [
    ctx.elements.register(freeElementDefinition),
    ctx.registry.registerPropertiesSection({ id: "builtin.props.free", render: renderFreeProperties }),
  ],
};

export const imageElementPlugin: DesignerPlugin = {
  id: "builtin.element.image",
  activate: (ctx) => [
    ctx.elements.register(imageElementDefinition),
    ctx.registry.registerPropertiesSection({ id: "builtin.props.image", render: renderImageProperties }),
  ],
};

export const textElementPlugin: DesignerPlugin = {
  id: "builtin.element.text",
  activate: (ctx) => [
    ctx.elements.register(textElementDefinition),
    ctx.registry.registerPropertiesSection({ id: "builtin.props.text", render: renderTextProperties }),
  ],
};

export const groupDefinitionPlugin: DesignerPlugin = {
  id: "builtin.definition.group",
  activate: (ctx) =>
    ctx.elements.register({
      id: "group",
      type: "group",
      label: "Group",
    }),
};

export const builtInPalettePlugins: readonly DesignerPlugin[] = [
  rectElementPlugin,
  circleElementPlugin,
  lineElementPlugin,
  freeElementPlugin,
  imageElementPlugin,
  textElementPlugin,
  // Group isn't in the palette but is a native type.
  groupDefinitionPlugin,
];

export const numericDisplayPlugin: DesignerPlugin = {
  id: "builtin.element.numericDisplay",
  activate: (ctx) => {
    const host = ctx.host;
    if (!host) return;
    return [
      host.elements.register(numericDisplayElementDefinition),
      host.registry.registerPropertiesSection({ id: "builtin.props.numericDisplay", render: renderNumericDisplayProperties }),
    ];
  },
};

export const webEmbedPlugin: DesignerPlugin = {
  id: "builtin.element.webEmbed",
  activate: (ctx) => {
    const host = ctx.host;
    if (!host) return;
    return [
      host.elements.register(webEmbedElementDefinition),
      host.registry.registerPropertiesSection({ id: "builtin.props.webEmbed", render: renderWebEmbedProperties }),
    ];
  },
};

export const motionPathLinePlugin: DesignerPlugin = {
  id: "builtin.element.motionPathLine",
  activate: (ctx) => {
    const host = ctx.host;
    if (!host) return;
    return [
      host.elements.register(motionPathLineElementDefinition),
      host.registry.registerPropertiesSection({ id: "builtin.props.motionPathLine", render: renderMotionPathLineProperties }),
    ];
  },
};

export const gaugePlugin: DesignerPlugin = {
  id: "builtin.element.gauge",
  activate: (ctx) => {
    const host = ctx.host;
    if (!host) return;
    return [
      host.elements.register(gaugeElementDefinition),
      host.registry.registerPropertiesSection({ id: "builtin.props.gauge", render: renderGaugeProperties }),
    ];
  },
};

export const barGaugePlugin: DesignerPlugin = {
  id: "builtin.element.barGauge",
  activate: (ctx) => {
    const host = ctx.host;
    if (!host) return;
    return [
      host.elements.register(barGaugeElementDefinition),
      host.registry.registerPropertiesSection({ id: "builtin.props.barGauge", render: renderBarGaugeProperties }),
    ];
  },
};

export const builtInElementPlugins: readonly DesignerPlugin[] = [
  ...builtInPalettePlugins,
  numericDisplayPlugin,
  webEmbedPlugin,
  motionPathLinePlugin,
  gaugePlugin,
  barGaugePlugin,
];
