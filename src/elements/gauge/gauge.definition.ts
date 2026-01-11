import type { ElementDefinition } from "../../designer/core/elements";

import { GAUGE_KIND } from "./gauge.model";
import { renderGauge } from "./gauge.render";
import { gaugeActions } from "./gauge.actions";

export const gaugeElementDefinition: ElementDefinition = {
  id: `custom:${GAUGE_KIND}`,
  type: "custom",
  kind: GAUGE_KIND,
  label: "Gauge",
  palette: { label: "Gauge", order: 73 },

  createInput: (pt) => ({
    type: "custom",
    kind: GAUGE_KIND,
    x: pt.x,
    y: pt.y,
    width: 220,
    height: 160,
    props: {
      value: 67,
      min: 0,
      max: 100,

      startAngle: 90,
      endAngle: 270,
      numTicks: 5,
      diameter: 160,

      fitMode: "contain",
      padding: 0,

      backgroundColor: "transparent",
      trackColor: "color-mix(in_srgb,var(--foreground)_20%,transparent)",
      fillColor: "var(--foreground)",
      arcWidth: 24,

      zones: [],
      zonesCode: "[\n  { \"from\": 0, \"to\": 60, \"color\": \"#00ff00\" },\n  { \"from\": 60, \"to\": 85, \"color\": \"#ffaa00\" },\n  { \"from\": 85, \"to\": 100, \"color\": \"#ff0000\" }\n]",
      zonesOpacity: 1,
      zoneArcWidth: 12,
      zoneArcGap: 4,

      showTicks: true,
      tickColor: "var(--foreground)",
      tickLength: 8,
      tickWidth: 2,

      showMinorTicks: false,
      minorTicksPerInterval: 4,
      minorTickColor: "color-mix(in_srgb,var(--foreground)_60%,transparent)",
      minorTickLength: 5,
      minorTickWidth: 1,

      showLabels: true,
      labelColor: "var(--foreground)",
      labelFontSize: 10,
      labelOffset: 20,
      labelDecimals: 0,

      showNeedle: true,
      needleType: "simple",
      needleColor: "var(--foreground)",
      needleLengthRatio: 0.9,
      needleWidth: 4,
      needleBaseRadius: 12,
      needleTipRadius: 8,

      showValueText: true,
      valuePosition: "center",
      valueColor: "var(--foreground)",
      valueFontSize: 18,
      valueFontWeight: 700,
      valueDecimals: 0,
      valuePrefix: "",
      valueSuffix: "",

      animate: true,
      animateArc: true,
      animateNeedle: true,
      animateValueText: false,
      animationDuration: 0.5,
      animationEase: "power2.out",
    },
  }),

  render: renderGauge,
  actions: gaugeActions,
};
