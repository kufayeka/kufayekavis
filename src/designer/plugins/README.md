# Plugins (Manual + Tutorial)

Dokumen ini adalah panduan praktis yang sesuai dengan implementasi saat ini (January 8, 2026) di folder `src/designer/core/*` dan UI `src/designer/ui/*`.

Kalau kamu capek dan cuma butuh "cara pakai": mulai dari bagian **Quick Start**.

---

## Konsep penting (biar nggak misleading)

Di project ini, **plugin** itu bukan “folder yang otomatis kebaca”. Plugin adalah *module* yang dieksekusi ketika kamu memanggil `host.plugins.activateAll(...)`.

Ada 2 jalur extensibility yang beda:

1) **UI contributions** (toolbar + panel): lewat `DesignerRegistry`
- Ribbon buttons: `registry.registerRibbonAction(...)`
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
Buat file baru misalnya `src/designer/plugins/myPlugin.ts`:

```ts
import type { DesignerPlugin } from "../core/plugins";
import type { DesignerAPI } from "../core/api";
import type { DesignerState } from "../core/engine";

export const myPlugin: DesignerPlugin = {
  id: "my.myPlugin",
  activate: ({ api, registry, elements }) => {
    const disposers: Array<() => void> = [];

    // 1) Tambah tombol di Ribbon
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

### 2) Register + activate plugin di app
Buka `src/designer/ui/components/DesignerApp.tsx` (atau tempat host dibuat), lalu tambahkan:

```ts
import { myPlugin } from "../../plugins/myPlugin";

// setelah host dibuat
host.plugins.register(myPlugin);
host.plugins.activateAll({ api: host.api, registry: host.registry, elements: host.elements });
```

Poin penting:
- `createDesignerHost()` **tidak** auto-activate plugins.
- `activateAll(...)` perlu context `{ api, registry, elements }`.

### 3) Cek hasil
- Tombol muncul di Ribbon
- Section muncul di Properties panel bagian "Plugins"

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

```ts
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
