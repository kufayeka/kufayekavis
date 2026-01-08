# Plugins (Manual + Tutorial)

Dokumen ini adalah panduan praktis yang sesuai dengan implementasi saat ini (January 8, 2026) di folder `src/designer/core/*` dan UI `src/designer/ui/*`.

Kalau kamu capek dan cuma butuh "cara pakai": mulai dari bagian **Quick Start**.

---

## Konsep penting (biar nggak misleading)

Di project ini, **plugin** itu bukan “folder yang otomatis kebaca”. Plugin adalah *module* yang dieksekusi ketika kamu memanggil `host.plugins.activateAll(...)`.

Ada 2 jalur extensibility yang beda:

1) **UI contributions** (toolbar + panel): lewat `DesignerRegistry`

API yang disarankan (lebih “fixed” dan scalable):
- Top ribbon items: `registry.registerTopRibbonItem(...)`
- Left panel sections: `registry.registerLeftPanelSection(...)`
- Bottom bar items: `registry.registerBottomBarItem(...)`
- Dialog tools (center overlay): `registry.registerDialog(...)` + `registry.openDialog(...)`

API legacy (tetap didukung supaya plugin lama tidak rusak):
- Ribbon buttons: `registry.registerRibbonAction(...)` (akan tampil di sisi kanan ribbon)
- Properties panel sections: `registry.registerPropertiesSection(...)`

2) **Custom elements** (palette + render SVG + actions): lewat `ElementRegistry`
- Daftar element baru: `elements.register(definition)`
- Render element custom di canvas: `definition.render(ctx)`
- Export SVG: `definition.exportSvg(ctx)`
- Expose actions: `definition.actions` (dipanggil via `api.callElementAction(...)`)

`DesignerAPI` adalah “remote control”-nya: update element, custom props, import/export, selection, dsb.

---

## Quick Start: bikin plugin pertama

### 1) Buat file plugin
Kalau contoh plugin kamu mengembalikan JSX (`<div>...</div>`) dari `render`, file plugin-nya **harus** `.tsx`.

Penting: “ada 2 return” itu **normal** karena beda scope:
- `activate()` return array `disposers` (cleanup)
- `render()` return UI (ReactNode/JSX)

Buat file baru misalnya `src/designer/plugins/myPlugin.tsx`:

```tsx
import type { DesignerPlugin } from "../core/plugins";
import type { DesignerAPI } from "../core/api";
import type { DesignerState } from "../core/engine";

export const myPlugin: DesignerPlugin = {
  id: "my.myPlugin",
  activate: ({ api, registry, elements }) => {
    const disposers: Array<() => void> = [];

    // 1) Tambah tombol di Ribbon (legacy)
    disposers.push(
      registry.registerRibbonAction({
        id: "my.myPlugin.hello",
        label: "Hello",
        onClick: () => {
          // api.engine juga ada kalau butuh
          api.createElement({ type: "text", x: 100, y: 100, text: "Hello" });
        },
      }),
    );

    // 2) Tambah section di Properties > Plugins
    disposers.push(
      registry.registerPropertiesSection({
        id: "my.myPlugin.section",
        render: (ctx: unknown) => {
          const { state } = ctx as { api: DesignerAPI; state: DesignerState };
          return (
            <div className="space-y-2">
              <div className="text-sm font-medium">My Plugin</div>
              <div className="text-xs text-black/60">selected: {state.selection.ids.length}</div>
              <button
                className="px-2 py-1 rounded border border-black/15 hover:bg-black/5"
                onClick={() => api.clearSelection()}
              >
                Clear Selection
              </button>
            </div>
          );
        },
      }),
    );

    return disposers;
  },
};
```

### Bonus: pakai UI Slot API (recommended)

Slot API ini membuat UI kamu lebih rapi karena semua “tempat” kontribusi UI jelas dan baku.

Contoh top ribbon button + dialog tool:

```ts
disposers.push(
  registry.registerDialog({
    id: "my.myPlugin.dialog",
    title: "My Tool",
    render: (ctx: unknown) => {
      // ctx punya { engine, state, api, host, dialog }
      return "...";
    },
  }),
);

disposers.push(
  registry.registerTopRibbonItem({
    kind: "button",
    id: "my.myPlugin.openDialog",
    placement: "right",
    order: 5,
    label: "My Tool",
    onClick: () => registry.openDialog("my.myPlugin.dialog"),
  }),
);
```

Kalau kamu tetap mau file `.ts` (tanpa `.tsx`), jangan pakai JSX. Return UI-nya pakai `React.createElement(...)` (lihat contoh di `src/designer/plugins/testPropertiesPanel.ts`).

### 2) Register + activate plugin di app
Sekarang plugin **harus** di-wire di tempat host dibuat (contoh default project ini: `src/designer/ui/components/DesignerApp.tsx`).

Di file itu:
1) import plugin
2) `register(...)` ke `host.plugins`
3) `activateAll(...)` dengan context `{ api, registry, elements }`

Contoh:

```ts
import { myPlugin } from "../../plugins/myPlugin";

// setelah host dibuat
const dispose = host.plugins.register(myPlugin);
host.plugins.activateAll({ api: host.api, registry: host.registry, elements: host.elements });

// saat unmount
dispose();
```

Poin penting:
- `createDesignerHost()` **tidak** auto-activate plugins.
- `activateAll(...)` perlu context `{ api, registry, elements }`.

### 3) Cek hasil
- Tombol muncul di Ribbon
- Section muncul di Properties panel bagian "Plugins"

---

## Lifecycle plugin (penting biar robust)

Plugin kamu harus mengembalikan *cleanup functions* (disposers) dari `activate()`.
Tujuannya:
- kalau page reload / component unmount, registry & element registry tidak “nyangkut”
- plugin bisa di-reload dengan aman

Contoh pola yang benar:

```ts
activate: ({ api, registry, elements }) => {
  const disposers: Array<() => void> = [];
  disposers.push(registry.registerRibbonAction(...));
  // recommended:
  disposers.push(registry.registerTopRibbonItem(...));
  disposers.push(registry.registerLeftPanelSection(...));
  disposers.push(registry.registerBottomBarItem(...));
  disposers.push(registry.registerDialog(...));
  disposers.push(registry.registerPropertiesSection(...));
  disposers.push(elements.register(myElementDef));
  return disposers;
}
```

---

## Aturan baku (biar plugin tidak ngawur / tidak drift)

- `id` harus unik dan namespaced: `company.feature.thing`.
- Jangan akses DOM langsung (querySelector) untuk “nyolok” UI; selalu lewat `DesignerRegistry`.
- UI plugin tidak boleh mutate state doc secara langsung; selalu lewat `DesignerAPI` / `DesignerEngine`.
- Semua `register*` wajib di-cleanup dengan disposer yang dikembalikan.
- Kalau butuh state eksternal (MQTT/HTTP/SQL), taruh di layer `runtime/*` lalu panggil `DesignerAPI`.

---

## SCADA MQTT plugin (remote control + event output)

Plugin bawaan: `system.mqttScada` (file: `src/designer/plugins/mqttScadaPlugin.tsx`).

Fungsi:
- **UI remote control interface**: subscribe topic MQTT (WebSocket) dan menjalankan command untuk canvas/element lewat `DesignerAPI`.
- **UI event output interface**: publish event onClick/onHover/onLeave dari element (dan event basic dari canvas) ke topic MQTT.

### Konfigurasi
- Buka dialog dari tombol **SCADA MQTT** di ribbon.
- Tombol **Save** menyimpan pengaturan ke project JSON, di field `doc.pluginSettings["system.mqttScada"]`.
- Tombol **Test** hanya mengetes koneksi (connect/timeout).

Catatan:
- Default event publish menggunakan topic `default/events`; plugin akan memetakan ini ke `defaultEventTopic` (mis. `scada/events`).

### Format message remote control
Message payload adalah JSON:

```json
{ "action": "updateElement", "payload": { "id": "rect_123", "patch": { "x": 100, "y": 120 } } }
```

Action yang didukung saat ini:
- `select` { ids: string[], append?: boolean }
- `clearSelection`
- `setTool` { tool: string }
- `setViewMode` { value: boolean }
- `setZoom` { scale?: number, panX?: number, panY?: number }
- `setCanvas` { width?, height?, background?, gridEnabled?, gridSize?, snapToGrid? }
- `createElement` { input: CreateElementInput }
- `updateElement` { id: string, patch: Partial<DesignerElement> }
- `deleteElements` { ids: string[] }
- `translate` { ids: string[], dx: number, dy: number }
- `bringToFront` { ids: string[] }
- `groupSelection`
- `ungroupSelection`

---

## Struktur folder yang direkomendasikan

Ini struktur yang enak dipelihara (bisa kamu adopsi pelan-pelan):

```
src/designer/plugins/
  README.md
  myPlugin.tsx
  runtime/
    mqttBridge.ts
src/elements/
  myElement/
    myElement.definition.ts
    myElement.render.tsx
```

Pemisahan ini sengaja:
- plugin = wiring & UI contributions
- elements = definisi elemen & rendering
- runtime = logic eksternal (mis. MQTT, WebSocket, polling) yang memanggil `DesignerAPI`

---

## Cara nambah Custom Element (element plugin)

### Struktur yang dipakai sekarang
Lihat contoh real:
- Numeric display: `src/elements/numericDisplay/*`
- Web embed: `src/elements/webEmbed/*`

Intinya ada 2 file:
- `*.definition.ts` -> mendaftarkan element ke palette + actions + factory
- `*.render.tsx` -> render SVG (untuk canvas) + exportSvg

### ElementDefinition minimal

```tsx
import type { ElementDefinition } from "../../designer/core/elements";

export const myElementDef: ElementDefinition = {
  id: "custom:myKind",
  type: "custom",
  kind: "myKind",
  label: "My Element",
  palette: { label: "My Element", order: 80 },

  createInput: (pt) => ({
    type: "custom",
    kind: "myKind",
    x: pt.x,
    y: pt.y,
    width: 200,
    height: 100,
    props: { value: 0 },
  }),

  render: (ctx: unknown) => {
    const { element } = ctx as { element: any };
    return (
      <>
        <rect x={0} y={0} width={element.width} height={element.height} />
      </>
    );
  },

  actions: {
    setValue: (ctx: unknown, value: number) => {
      const { api, element } = ctx as { api: any; element: any };
      api.updateCustomProps(element.id, { value });
    },
  },
};
```

### Registrasi element
Di tempat yang punya akses ke `host.elements` (contoh saat ini: `DesignerApp.tsx`):

```ts
const dispose = host.elements.register(myElementDef);
```

Kamu bisa juga mendaftarkan element ini dari dalam plugin (di `activate()`), karena plugin context menyediakan `elements`.

---

## Cara bikin UI Properties untuk element custom (tanpa edit core)

Praktik yang dipakai sekarang: tambahkan section lewat `registry.registerPropertiesSection()`.

Pola umum:
1) cek selection
2) cek apakah element yang dipilih adalah kind yang kamu mau
3) render control -> panggil `api.updateCustomProps()` atau `api.updateElement()`

Contoh real bisa dilihat di `DesignerApp.tsx` (section Numeric Display).

Tips praktik:
- di `render(ctx)` selalu cek selection dulu
- kalau selection bukan element yang kamu target, return `null`
- semua update lewat `api.updateElement(...)` atau `api.updateCustomProps(...)`

---

## Cara manipulasi element dari luar (menuju MQTT)

Tujuanmu: ada event eksternal (MQTT message) → update element UI.

**Jangan taruh side-effect polling/timer di renderer element.** Renderer harus pure (render berdasarkan props).

### Pola yang disarankan: runtime controller / bridge
Buat 1 module yang menerima `DesignerAPI`, lalu expose fungsi `handleMessage`.

```ts
import type { DesignerAPI } from "../core/api";

export function createRuntimeBridge(api: DesignerAPI) {
  // OPTIONAL: bikin index topic->ids biar cepat
  const rebuildIndex = () => {
    const doc = api.getDocument();
    const map = new Map<string, string[]>();
    for (const el of Object.values(doc.elements)) {
      const t = (el as any).mqttTopic;
      if (!t) continue;
      map.set(t, [...(map.get(t) ?? []), el.id]);
    }
    return map;
  };

  let topicIndex = rebuildIndex();
  const unsub = api.subscribe(() => {
    // kalau doc berubah (edit mode), index ikut update
    topicIndex = rebuildIndex();
  });

  const handleMessage = (topic: string, payload: any) => {
    const ids = topicIndex.get(topic) ?? [];
    for (const id of ids) {
      const el = api.getElement(id);
      if (!el) continue;

      // contoh: numericDisplay
      if (el.type === "custom" && el.kind === "numericDisplay") {
        api.updateCustomProps(id, { value: Number(payload?.value ?? payload ?? 0) });
        continue;
      }

      // contoh generik: update fill
      if (typeof payload?.fill === "string") {
        api.updateElement(id, { fill: payload.fill });
      }
    }
  };

  const dispose = () => {
    try { unsub(); } catch {}
  };

  return { handleMessage, dispose };
}
```

Nanti MQTT client kamu tinggal panggil:

```ts
bridge.handleMessage(topic, parsedPayload);
```

### Di mana bikin bridge ini?
Pola termudah:
- bikin di `DesignerApp.tsx` (atau page `/online`) di dalam `useEffect`
- pass `host.api` ke `createRuntimeBridge(host.api)`
- subscribe MQTT event → panggil `bridge.handleMessage(...)`

Dengan cara ini, kamu tidak perlu mengubah element renderer sama sekali.

### Catatan penting untuk Online mode
- Kalau halaman `/online` harus read-only (nggak bisa edit), UI sudah bisa di-`viewMode=true`.
- Tapi update dari MQTT (runtime) tetap bisa jalan karena itu update state programmatic.
- Kalau kamu nggak mau update runtime masuk ke history undo/redo, nanti kita bisa tambahin opsi “silent updates” (mis. update doc tanpa commit history) khusus online.

---

## Anti-pattern yang bikin bingung (hindari)

- Jangan bikin `new DesignerRegistry()` di file plugin. Registry yang dipakai aplikasi adalah `host.registry`.
- Jangan `return` di top-level module TS.
- Jangan edit `PropertiesPanel.tsx` untuk setiap custom element. Pakai `registry.registerPropertiesSection`.
- Jangan update state dari dalam `definition.render()` (side-effect), karena akan bikin loop/performance buruk.

---

## Referensi file penting

- Plugin manager: `src/designer/core/plugins.ts`
- Registry (ribbon/properties): `src/designer/core/registry.ts`
- Element registry: `src/designer/core/elements.ts`
- API: `src/designer/core/api.ts`
- Host: `src/designer/core/host.ts`
- App wiring (host + register elements/sections): `src/designer/ui/components/DesignerApp.tsx`

---

## Contoh yang sudah ada di repo

- Plugin TSX example: `src/designer/plugins/myPlugin.tsx`
- Plugin TS (tanpa JSX) example: `src/designer/plugins/testPropertiesPanel.ts`
- Custom element example: `src/elements/numericDisplay/*`
