import type { ElementDefinition } from "../../designer/core/elements";

import { BAR_GAUGE_KIND } from "./barGauge.model";
import { renderBarGauge } from "./barGauge.render";
import { barGaugeActions } from "./barGauge.actions";

export const barGaugeElementDefinition: ElementDefinition = {
  id: `custom:${BAR_GAUGE_KIND}`,
  type: "custom",
  kind: BAR_GAUGE_KIND,
  label: "Bar Gauge",
  palette: { label: "Bar Gauge", order: 74 },

  createInput: (pt) => ({
    type: "custom",
    kind: BAR_GAUGE_KIND,
    x: pt.x,
    y: pt.y,
    width: 240,
    height: 48,
    props: {
      value: 67,
      min: 0,
      max: 100,

      orientation: "horizontal",
      direction: "forward",
      padding: 0,

      backgroundColor: "transparent",
      trackColor: "color-mix(in_srgb,var(--foreground)_20%,transparent)",
      fillColor: "var(--foreground)",
      trackRadius: 8,
      trackStrokeColor: "transparent",
      trackStrokeWidth: 0,

      zones: [],
      zonesCode: "[\n  { \"from\": 0, \"to\": 60, \"color\": \"#00ff00\" },\n  { \"from\": 60, \"to\": 85, \"color\": \"#ffaa00\" },\n  { \"from\": 85, \"to\": 100, \"color\": \"#ff0000\" }\n]",
      zonesOpacity: 0.85,
      zoneThickness: 10,

      showTicks: true,
      numTicks: 5,
      tickColor: "var(--foreground)",
      tickLength: 8,
      tickWidth: 2,

      showMinorTicks: false,
      minorTicksPerInterval: 4,
      minorTickColor: "color-mix(in_srgb,var(--foreground)_60%,transparent)",
      minorTickLength: 5,
      minorTickWidth: 1,

      showLabels: false,
      labelColor: "var(--foreground)",
      labelFontSize: 10,
      labelOffset: 10,
      labelDecimals: 0,

      showValueText: true,
      valuePosition: "center",
      valueColor: "var(--foreground)",
      valueFontSize: 16,
      valueFontWeight: 700,
      valueDecimals: 0,
      valuePrefix: "",
      valueSuffix: "",

      animate: true,
      animateFill: true,
      animateValueText: false,
      animationDuration: 0.5,
      animationEase: "power2.out",
    },
  }),

  render: renderBarGauge,
  actions: barGaugeActions,
};
