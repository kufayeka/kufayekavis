# Kufayeka Visual Designer - Plugin API Documentation

**Version:** 1.0.0  
**Status:** Active & Stable  
**Last Updated:** January 8, 2026

Tujuan dokumen ini: Ringkasan cepat tentang komponen plugin (Engine/API/Registry/Elements).

Dokumentasi plugin yang lebih akurat + tutorial step-by-step ada di:

- `src/designer/plugins/README.md`

> Catatan: file ini sebelumnya berisi beberapa contoh yang tidak sesuai dengan arsitektur yang berjalan (mis. menyuruh edit `PropertiesPanel.tsx` untuk setiap custom element). Sekarang praktik yang direkomendasikan adalah menambah UI lewat `DesignerRegistry` (properties section / ribbon action) dan menambah element lewat `ElementRegistry`.

## 🎯 Arsitektur Overview

Kufayeka Visual Designer menggunakan arsitektur modular dengan komponen-komponen berikut:

### Core Components

- **DesignerEngine**: State management dan operasi dasar
- **DesignerAPI**: Interface publik untuk manipulasi designer
- **DesignerRegistry**: Registry untuk UI contributions (top panel, panels, dialogs, popups, canvas overlays)
- **ElementRegistry**: Registry untuk custom elements
- **PluginManager**: Manager untuk aktivasi dan deaktivasi plugin
- **DesignerHost**: Container utama yang menggabungkan semua komponen

### Data Flow

```
User Interaction → UI Components → DesignerAPI → DesignerEngine → State Update
                                      ↓
                               Plugin Actions → MQTT Events
```

## 🔧 Mengakses Designer dari UI

### useDesignerHost Hook

Di dalam komponen React, gunakan hook `useDesignerHost()` untuk mengakses semua komponen designer:

```typescript
import { useDesignerHost } from "../hooks/useDesignerHost";

function MyComponent() {
  const { api } = useDesignerHost();

  // Contoh penggunaan
  const handleClick = () => {
    api.createElement({
      type: "rect",
      x: 100,
      y: 100,
      width: 200,
      height: 100
    });
  };

  return <button onClick={handleClick}>Create Rectangle</button>;
}
```

## 📋 DesignerAPI Reference

Interface utama untuk berinteraksi dengan designer:

### State Management
```typescript
// Mendapatkan state saat ini
const state = api.getState();

// Subscribe ke perubahan state
const unsubscribe = api.subscribe(() => {
  console.log("State changed!");
});
```

### Tools & View
```typescript
// Mengubah tool aktif
api.setTool("select" | "rect" | "circle" | "line" | "image" | "text" | "free");

// Toggle view mode (edit/preview)
api.setViewMode(true); // true = view mode, false = edit mode
```

### Selection Management
```typescript
// Select elements
api.select(["element-id-1", "element-id-2"]);

// Select dengan append (multi-select)
api.select(["element-id-3"], { append: true });

// Clear selection
api.clearSelection();
```

### Element Operations
```typescript
// Create element
const elementId = api.createElement({
  type: "rect",
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  fill: "#ff0000"
});

// Update element
api.updateElement(elementId, {
  x: 150,
  y: 150,
  fill: "#00ff00"
});

// Delete elements
api.deleteElements([elementId]);

// Transform operations
api.translate([elementId], 50, 50); // Move by dx, dy
api.bringToFront([elementId]);
api.groupSelection(); // Returns group element ID
api.ungroupSelection(); // Returns array of ungrouped element IDs
```

### Custom Elements
```typescript
// Update custom properties
api.updateCustomProps(elementId, { customProp: "new value" });

// Call element action
const result = api.callElementAction(elementId, "setSpeed", 150);
```

### Clipboard Operations
```typescript
// Copy selection
api.copySelection();

// Paste dengan offset
const pastedIds = api.pasteClipboard({ dx: 20, dy: 20 });

// Duplicate selection
const duplicatedIds = api.duplicateSelection();
```

### Import/Export
```typescript
// Export project sebagai JSON
const jsonString = api.exportProjectJson();

// Import project dari JSON
api.importProjectJson(jsonString);
```

### MQTT Event Publishing
```typescript
// Publish event ke MQTT topic
api.publishEvent("myapp/events", {
  eventType: "onClick",
  sourceElement: "element-id",
  timestamp: Date.now()
});
```

## 🎨 UI Contributions (Registry)

Mulai January 2026, kontribusi UI disarankan lewat **View APIs** yang baku di `DesignerRegistry`:

- `registry.topPanelViewAPI()`
- `registry.leftPanelViewAPI()`
- `registry.rightPanelViewAPI()`
- `registry.bottomPanelViewAPI()`
- `registry.dialogViewAPI()`
- `registry.popUpViewAPI()`
- `registry.canvasViewAPI()`

Tujuannya supaya struktur UI tidak drift: semua fitur/tombol/panel wajib “register” ke slot yang jelas.

> Legacy API (`registerRibbonAction`) masih didukung, tapi sebaiknya pakai top panel API.

### Top Panel (Recommended)

Tambahkan item di top panel (ribbon slot):

```ts
const dispose = registry.topPanelViewAPI().registerItem({
  kind: "button",
  id: "my-plugin.tool.open",
  placement: "right",
  order: 10,
  label: "My Tool",
  onClick: () => {
    registry.dialogViewAPI().open("my-plugin.dialog");
  },
});

return dispose;
```

### Dialog Tool (Recommended)

```ts
const dispose = registry.dialogViewAPI().registerDialog({
  id: "my-plugin.dialog",
  title: "My Dialog",
  render: (ctx) => {
    // ctx = { engine, state, api, host, dialog }
    return "...";
  },
});

return dispose;
```

### PopUp Tool (Recommended)

```ts
const dispose = registry.popUpViewAPI().registerPopup({
  id: "my-plugin.popup",
  title: "My Popup",
  render: (ctx) => "...",
});

// open somewhere:
registry.popUpViewAPI().open("my-plugin.popup", { anyProps: true });

return dispose;
```

### Canvas Overlay (Recommended)

Canvas overlay adalah UI yang “nempel” di area canvas (HUD/tools/indicators) tanpa harus edit `SvgCanvas`.

```ts
const dispose = registry.canvasViewAPI().registerOverlayItem({
  id: "my-plugin.canvas.hud",
  order: 10,
  render: (ctx) => {
    // ctx = { engine, state, api, host }
    return "...";
  },
});
```

### Ribbon Actions (Legacy)

Tambahkan tombol ke ribbon toolbar:

```typescript
const disposeAction = registry.registerRibbonAction({
  id: "my-plugin.custom-action",
  label: "Custom Action",
  onClick: () => {
    console.log("Custom action executed!");
  },
  disabled: false // optional
});

// Cleanup saat plugin di-unload
return disposeAction;
```

### Properties Sections

Tambahkan section custom ke Properties Panel:

```typescript
const disposeSection = registry.registerPropertiesSection({
  id: "my-plugin.custom-section",
  render: (ctx) => {
    // ctx = { engine, state, api, host }
    const { api, state } = ctx as {
      api: DesignerAPI;
      state: DesignerState;
    };

    return (
      <div className="space-y-2">
        <h4 className="font-medium">Custom Controls</h4>
        <button
          className="px-3 py-1 rounded border border-black/15 hover:bg-black/5"
          onClick={() => api.clearSelection()}
        >
          Clear Selection
        </button>
      </div>
    );
  }
});

return disposeSection;
```

## 🔌 Plugin Development

### Plugin Structure

```typescript
import type { DesignerPlugin } from "../core/plugins";

export const ExamplePlugin: DesignerPlugin = {
  id: "my-plugin",
  activate: ({ api, registry, elements }) => {
    const disposers: Array<() => void> = [];

    // Register ribbon action
    disposers.push(
      registry.registerRibbonAction({
        id: "my-plugin.action",
        label: "My Action",
        onClick: () => {
          // Plugin logic here
        }
      })
    );

    // Register properties section
    disposers.push(
      registry.registerPropertiesSection({
        id: "my-plugin.section",
        render: (ctx) => {
          // Return React component
          return <div>My Custom Section</div>;
        }
      })
    );

    // Return cleanup functions
    return disposers;
  }
};
```

### Plugin Registration

```typescript
// Di aplikasi utama (DesignerApp.tsx): host membuat PluginManager,
// tapi plugin TIDAK auto-aktif. Kamu harus register + activate.

host.plugins.register(ExamplePlugin);
host.plugins.activateAll({ api: host.api, registry: host.registry, elements: host.elements });

// Register plugin
host.plugins.register(ExamplePlugin);

// Activate plugin
host.plugins.activateAll({
  api: host.api,
  registry: host.registry,
  elements: host.elements
});
```

## 🎭 Custom Elements

### Element Definition Structure

```typescript
import type { ElementDefinition } from "../core/elements";

export const myElementDefinition: ElementDefinition = {
  id: "custom:myElement",
  type: "custom",
  kind: "myElement",
  label: "My Custom Element",
  palette: {
    label: "My Element",
    order: 100
  },

  // Factory function untuk create element
  createInput: (pt) => ({
    type: "custom",
    kind: "myElement",
    x: pt.x,
    y: pt.y,
    width: 200,
    height: 100,
    enableOnMouseHoverEventListener: false,
    enableOnMouseClickEventListener: false,
    enableOnMouseLeaveEventListener: false,
    mqttTopic: "",
    props: {
      customValue: 0,
      customText: "Default"
    }
  }),

  // Render function untuk SVG canvas
  render: (ctx) => {
    // Model A: render() hanya menggambar “inner visuals”.
    // Jangan attach handler/ref/MQTT di sini. Itu tugas renderer (RenderTree).
    const { element } = ctx;
    const el = element as {
      width: number;
      height: number;
      fill: string;
      stroke: string;
      strokeWidth: number;
      props?: Record<string, unknown>;
    };

    return (
      <g>
        <rect
          x={0}
          y={0}
          width={el.width}
          height={el.height}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
        />
        <text
          x={el.width / 2}
          y={el.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fill={el.stroke}
        >
          {el.props?.customText || "Custom Element"}
        </text>
      </g>
    );
  },

  // Export function untuk SVG export
  exportSvg: (ctx) => {
    const { element } = ctx;
    const el = element as any;

    return `<rect x="0" y="0" width="${el.width}" height="${el.height}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />
<text x="${el.width / 2}" y="${el.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="${el.stroke}">${el.props?.customText || "Custom Element"}</text>`;
  },

  // Custom actions
  actions: {
    setCustomValue: ({ api, element }, value: number) => {
      api.updateCustomProps(element.id, { customValue: value });
    },

    setCustomText: ({ api, element }, text: string) => {
      api.updateCustomProps(element.id, { customText: text });
    }
  }
};
```

### Render Pipeline & Single Source of Truth (Guideline)

Kalau targetmu adalah: **"buat file code → definisikan → register"** tanpa patch di banyak tempat, maka aturan bakunya perlu jelas.

Di Kufayeka, ada 2 kategori element:

1) **Native elements** (`rect/circle/line/free/image/text/...`) → datanya langsung di canvas coordinate
2) **Custom elements** (`type: "custom"`) → biasanya box-based dan render di dalam wrapper `svg` (viewBox lokal)

Supaya rapi dan maintainable, pakai prinsip ini:

- `ElementDefinition` adalah **Single Source of Truth untuk “apa itu element”**: palette + createInput + render + export + actions.
- `RenderTree` adalah **Single Source of Truth untuk “wiring lintas element”**: ref registration, `data-el-id`, cursor/selection targeting, dan publish event MQTT.

Dengan begitu: definition fokus ke *visual* + behavior spesifik, sementara hal umum tidak diduplikasi.

#### Kontrak render (recommended)

Ada 2 model yang mungkin. Pilih salah satu dan jadikan standar tim.

**Model A — Definition hanya return “inner visuals” (recommended untuk konsistensi)**

- `definition.render(ctx)` hanya menggambar bentuknya.
- Tidak menempelkan event handler, tidak publish event, tidak akses DOM refs.
- Transform/opacity/event wiring dipasang oleh renderer (mis. `RenderTree`) secara seragam.

**Kelebihan**
- Paling “aturan baku”: semua element dapat wiring yang sama.
- Kecil risiko ada element yang lupa pasang handler/ref atau beda perilaku.
- Mudah ganti kebijakan global (mis. event publish, data attributes) tanpa edit semua element.

**Kekurangan**
- Renderer harus cukup kuat untuk menerapkan transform/opacity secara generic.
- Kalau ada element yang butuh perilaku render khusus (contoh: nested SVG yang tricky), kamu butuh escape hatch yang jelas.

**Model B — Definition bertanggung jawab atas semuanya (flexibility tinggi, tapi rawan drift)**

- `definition.render(ctx)` menggambar sekaligus memasang transform/opacity/handler/wiring.

**Kelebihan**
- Sangat fleksibel untuk elemen yang unik.
- Renderer bisa tetap tipis.

**Kekurangan / what could go wrong**
- High risk kode “drift”: ada element lupa pasang `data-el-id`, lupa register ref, beda event behavior.
- Double transform/opacity (mis. renderer juga apply transform) → bug yang susah dilacak.
- Sulit enforce konsistensi tanpa review ketat + lint rules.

#### Rule of thumb (biar tidak jadi bencana)

Kalau kamu ingin sistem “proven” dan scalable:

- Gunakan **Model A** sebagai default.
- Sediakan **escape hatch** untuk kasus spesial (mis. `definition.renderMode = "selfManaged"` atau `definition.renderWithWrapper = true`) — tapi batasi pemakaiannya.

#### Hal yang HARUS dihindari di `render(ctx)`

- Side effects: jangan `api.update...`, jangan publish MQTT, jangan mutate state.
- Jangan melakukan random / time-based output (kecuali memang intentional) → bikin undo/redo dan preview sulit stabil.
- Jangan mengandalkan DOM query/ref di render.

#### Coordinate system guideline

 **Custom elements**: render di coordinate lokal (0..width/height) karena dimasukkan ke wrapper `svg` dengan `viewBox` lokal.
 **Native elements**: render di canvas coordinate (x/y/cx/cy) karena mereka langsung ada di root SVG canvas.

#### Bagaimana sistem merender element (Model A)

Secara ringkas, pipeline render yang berjalan adalah:

1) **Registry lookup**: renderer mengambil `ElementDefinition` dari `ElementRegistry` berdasarkan `el.type` (atau `custom:${kind}`).
2) **Inner visuals**: `definition.render(ctx)` dipanggil dan harus mengembalikan React node (SVG elements) tanpa side effect.
3) **Wiring layer (single place)**: `RenderTree` memasang hal lintas element:
  - `ref` registration (supaya drag/selection bisa bekerja)
  - `data-el-id`
  - `opacity` + `transform` (flip/rotate) secara konsisten
  - publish event MQTT (`onMouseEnter/onClick/onMouseLeave`) secara konsisten

> Catatan penting: Karena wiring dipasang di wrapper, `definition.render` tidak boleh mencoba meng-attach handler/ref/transform sendiri.

### Element “Ingredients” (Checklist)

Kalau kamu ingin workflow yang baku (buat file → definisikan → register), minimal ingredient untuk element adalah:

1) **Definition file** (`*.definition.ts`)
  - `id`, `type` (+ `kind` untuk custom)
  - `label`, `palette` (kalau mau muncul di palette)
  - `createInput(pt)` (supaya bisa dibuat dari palette)
  - `render(ctx)` (Model A: inner visuals only)
  - optional: `exportSvg(ctx)`, `actions`

2) **Render file** (`*.render.ts` / `*.render.tsx`)
  - fungsi `renderX(ctx)` yang dipakai di definition
  - harus pure (no side effects)

3) **(Optional tapi direkomendasikan) Schema/validation**
  - khusus custom element: validasi `props` (mis. Zod) sebelum dipakai
  - jangan trust `unknown` dari project JSON

4) **Plugin registration**
  - buat `DesignerPlugin` yang melakukan `ctx.elements.register(myElementDefinition)`
  - register plugin dari app (`DesignerApp`) lalu `activateAll(...)`

### Do / Don’t (Model A)

**Do**
- Render harus deterministik (input sama → output sama).
- Pisahkan file: `*.definition.ts` untuk metadata + wiring ke functions, `*.render.ts(x)` untuk visual.
- Gunakan `actions` + `DesignerAPI` untuk behavior (dipanggil dari UI plugin, bukan dari render).
- Kalau butuh UI properties: register via `DesignerRegistry` (properties sections), bukan edit core panel.

**Don’t**
- Jangan `api.update...` / publish MQTT / mutate state di `render(ctx)`.
- Jangan attach `onClick/onMouseEnter/...` di `render(ctx)` untuk kebutuhan global (biar konsisten).
- Jangan hardcode akses DOM (`document.querySelector`, refs) di `render(ctx)`.

### Flexibility: se-flexible apa Model A vs Model B?

**Model A (default, recommended)**
- Sangat fleksibel untuk visual (SVG apa pun) + export + actions + props schema.
- Yang “lebih terbatas” adalah wiring interaksi yang granular per-sub-shape (karena handler dipasang di wrapper). Biasanya masih oke karena event bubble tetap sampai wrapper.
- Kalau ada kebutuhan super spesifik (mis. element ingin event behavior beda total, atau transform center custom), buat escape hatch yang eksplisit (mis. renderMode self-managed). Jangan jadikan default.

**Model B (self-managed)**
- Paling fleksibel, tapi biaya maintain tinggi.
- Risiko drift dan bug tersembunyi paling besar.

### Worth it kah native render via definition?

**Worth it kalau:**

- Kamu ingin semua built-in bisa diperlakukan seperti plugin (override/disable/extend).
- Kamu akan punya banyak element (native + custom) dan ingin pola yang konsisten.
- Kamu butuh tempat baku untuk export (`exportSvg`), actions, schema, dll per element.

**Mungkin tidak worth it kalau:**

- App kecil dan jenis element tidak bertambah.
- Kamu tidak butuh extensibility dan lebih penting simple debugging 1 file.

**Risiko utama (dan mitigasinya):**

- Indirection/debugging: “kok render beda?” → mitigasi: log/trace registry + devtool panel yang menampilkan definition yang aktif.
- Performance: extra function calls → biasanya negligible untuk skala ini.
- Ketidakkonsistenan kalau Model B dipakai bebas → mitigasi: Model A default + review/linters.

### Element Registration

```typescript
// Register element
const disposeElement = elements.register(myElementDefinition);

// Cleanup
return disposeElement;
```

### Element Properties Integration

Untuk menampilkan UI properties custom, **jangan edit core** `PropertiesPanel.tsx` untuk setiap element.
Cara yang dianjurkan:

- Tambahkan section lewat `registry.registerPropertiesSection(...)`
- Di dalam section itu, cek selection saat ini, lalu render control untuk element yang kamu target

Contohnya bisa lihat di `DesignerApp.tsx` yang mendaftarkan section untuk Numeric Display.

## 📡 MQTT Event System

### Event Listener Properties

Setiap element memiliki properties untuk enable/disable event listeners:

```typescript
{
  enableOnMouseHoverEventListener: true,  // onMouseEnter
  enableOnMouseClickEventListener: true,   // onClick
  enableOnMouseLeaveEventListener: true,   // onMouseLeave
  mqttTopic: "myapp/elements/events"       // Target MQTT topic
}
```

### Event Publishing

Saat event terjadi, sistem akan publish JSON object:

```json
{
  "eventType": "onClick",
  "sourceElement": "element-id-123",
  "timestamp": 1704739200000
}
```

### Mock Implementation

Saat ini menggunakan mock implementation untuk development:

```typescript
// Di api.ts
publishEvent: (topic, data) => {
  console.log(`[MQTT Mock] Publishing to topic "${topic}":`, JSON.stringify(data, null, 2));
  // TODO: Replace dengan MQTT client real
  // mqttClient.publish(topic, JSON.stringify(data));
}
```

## 🔄 Plugin Lifecycle

### Activation

```typescript
// Plugin diaktifkan saat aplikasi start
host.plugins.activateAll({
  api: host.api,
  registry: host.registry,
  elements: host.elements
});
```

### Deactivation

```typescript
// Plugin otomatis di-deactivate saat unregister
host.plugins.unregister("my-plugin");
```

### Hot Reload Support

Registry menggunakan replace-by-id, sehingga plugin bisa di-reload tanpa restart aplikasi.

## 📁 File Structure

```
src/
├── designer/
│   ├── core/
│   │   ├── api.ts              # DesignerAPI interface
│   │   ├── engine.ts           # State management
│   │   ├── host.ts             # Host container
│   │   ├── plugins.ts          # Plugin manager
│   │   ├── registry.ts         # UI registry
│   │   └── elements.ts         # Element registry
│   └── ui/
│       ├── components/
│       │   ├── PropertiesPanel.tsx
│       │   ├── Ribbon.tsx
│       │   └── SvgCanvas.tsx
│       └── hooks/
│           └── useDesignerHost.tsx
└── elements/                   # Custom element definitions
    └── myElement/
        ├── myElement.definition.ts
        └── myElement.render.ts
```

## 🚀 Best Practices

### Plugin Development
1. Selalu return cleanup functions dari `activate()`
2. Gunakan ID yang unik dengan prefix plugin name
3. Handle error gracefully
4. Test plugin dengan hot reload

### Element Development
1. Implement `render` dan `exportSvg` functions
2. Provide meaningful default values
3. Include proper TypeScript types
4. Test dengan berbagai ukuran dan properties

### Event Handling
1. Enable event listeners hanya saat diperlukan
2. Use descriptive MQTT topics
3. Handle event data consistently
4. Consider performance impact

## 🔮 Future Enhancements

- **Plugin Sandboxing**: Isolated execution environment
- **Dynamic Loading**: Load plugins from external URLs
- **Plugin Marketplace**: Centralized plugin repository
- **Advanced Events**: Keyboard events, drag events
- **Real MQTT Integration**: Production-ready MQTT client

---

**Note**: API ini dirancang untuk stabil dan backward-compatible. Perubahan breaking akan di-dokumentasikan dengan versi major baru.
