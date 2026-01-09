# Elements System (Definition / Render / Properties / Actions)

Folder ini adalah **single source of truth** untuk semua elemen yang bisa dipakai di Designer (native palette & custom/plugin).

Tujuan desainnya:
- **Seragam**: setiap element punya modul yang konsisten (`*.definition.ts`, `*.render.tsx`, `*.properties.tsx`, opsional `*.actions.ts`).
- **No magic UI**: field/controls spesifik element **tidak** muncul dari core `PropertiesPanel` secara diam-diam; semua muncul dari `*.properties.tsx` via plugin registration.
- **No duplicate logic**: logic operasional (misalnya “reload”, “fit to box”, “set defaults”) ditaruh di **actions**, UI cukup memanggil action.

---

## 1) Struktur folder yang disarankan

Untuk setiap element, pakai struktur seperti ini:

```
src/elements/<elementName>/
  <elementName>.definition.ts   # registrasi element + default creation + wiring ke render/actions
  <elementName>.render.tsx      # visual inner-only (Model A)
  <elementName>.properties.tsx  # UI panel property khusus element (plugin section)
  <elementName>.actions.ts      # (opsional) aksi-aksi domain (no UI)
```

Catatan:
- Untuk **native** element, lokasinya ada di `src/elements/native/<type>/...`.
- Untuk **custom** element, lokasinya di `src/elements/<kind>/...`.

---

## 2) Konsep utama

### A. `ElementDefinition`
Tipe ada di `src/designer/core/elements.ts`.

**Intinya:** `ElementDefinition` adalah metadata + kontrak kemampuan element.

Field penting:
- `id: string`
  - ID registrasi, sekaligus ID palette.
  - Native biasanya: `"rect" | "circle" | ...`.
  - Custom biasanya: `custom:<kind>` (contoh: `custom:webEmbed`).

- `type: DesignerElementType`
  - Salah satu: `rect | circle | line | free | image | text | custom | group`.

- `kind?: string`
  - Hanya untuk `type === "custom"`.

- `label: string`
  - Nama human-readable.

- `palette?: { label: string; order?: number }`
  - Kalau ada, element muncul di palette.

- `createInput?: (pt) => CreateElementInput`
  - Fungsi **factory** untuk membuat input standar ke `engine.createElement()`.
  - Dipakai ketika user klik element di palette lalu nge-place di canvas.

- `render?: (ctx) => unknown`
  - Visual rendering (SVG) yang dipakai render pipeline.
  - **Model A**: `render()` hanya return "inner visuals" (tanpa wrapper transform/ref/event).

- `exportSvg?: (ctx) => string`
  - Optional: export element jadi SVG string.

- `actions?: Record<string, (ctx, ...args) => unknown>`
  - Kumpulan aksi “domain” yang bisa dipanggil via `api.callElementAction(elementId, actionId, ...)`.
  - Dipakai oleh UI, hotkeys, automation, dsb.

---

### B. `createInput` itu buat apa?
`createInput` adalah **cara standar** untuk menciptakan element instance dengan default yang benar.

Kenapa tidak dibuat langsung di UI/palette?
- Supaya default-nya **1 sumber** (tidak nyebar di UI).
- Supaya plugin bisa menentukan default `width/height/props/mqttTopic/listeners` sekali.
- Supaya future: import/export, tools, dan palette placement semua konsisten.

`createInput` *hanya* membentuk input “minimal + default”, engine boleh menambahkan default lain (misal stroke/fill/opacity/zIndex) sesuai rules engine.

---

### C. `*.render.tsx` (Render)
**Tanggung jawab:** menggambar bentuk element (inner SVG).

Aturan Model A (yang kamu pilih):
- Render hanya menggambar isi (rect/path/text/image/foreignObject/dll).
- Jangan pasang:
  - transform umum (rotate/flip)
  - opacity
  - event publishing
  - ref wiring

Semua cross-cutting itu milik renderer layer (contoh: `src/designer/ui/components/svgCanvas/renderTree.tsx`).

---

### D. `*.properties.tsx` (Properties)
**Tanggung jawab:** UI untuk mengedit property spesifik element.

Aturan penting:
- Module ini cuma UI, bukan tempat logic domain.
- Untuk update field simpel (x/y/w/h/text), boleh:
  - `engine.updateElement(...)` atau `api.updateCustomProps(...)`
- Untuk operasi yang *lebih dari sekadar set field* (contoh: “reload”, “reset”, “fit”), wajib:
  - taruh logic di `*.actions.ts`
  - UI panggil `api.callElementAction(...)`

Context type standar:
- `PropertiesSectionRenderCtx` ada di `src/designer/ui/components/properties/types.ts`.

Registrasinya dilakukan via plugin (contoh: `src/designer/plugins/builtinPlugins.tsx`):
- `ctx.registry.registerPropertiesSection({ id: "builtin.props.<x>", render: renderXProperties })`

---

### E. `*.actions.ts` (Actions)
**Tanggung jawab:** logic domain yang reusable.

Contoh terbaik:
- `webEmbed` punya action `reload` yang meng-update `reloadTrigger`.
  - UI tombol Reload **tidak** boleh bikin logic kedua.
  - UI cukup: `api.callElementAction(id, WEB_EMBED_ACTION_IDS.reload)`.

Kenapa actions dipisah?
- Tidak duplikasi
- Bisa dipakai dari:
  - Properties UI
  - Ribbon buttons
  - Keyboard shortcuts
  - Automation/SCADA integration

---

## 3) “Apa bedanya action vs onClick?”

- `onClick` (di UI) = event handler UI.
- `action` (di definition/actions) = fungsi domain.

Rule yang kita pakai:
- UI handler boleh ada, tapi *isi handler* idealnya cuma:
  - validasi input UI ringan
  - panggil `engine.updateElement` untuk set field sederhana, atau
  - panggil `api.callElementAction` untuk operasi domain

Kalau ada logic yang sama muncul di 2 tempat (properties vs definition), itu indikasi harus dipindah ke actions.

---

## 4) Checklist ketika bikin element baru

1. Buat `*.definition.ts`
   - isi `id/type/kind/label/palette`
   - buat `createInput` default yang masuk akal

2. Buat `*.render.tsx`
   - inner visuals only (Model A)

3. Buat `*.properties.tsx`
   - UI editor spesifik element
   - gunakan `PropertiesSectionRenderCtx`

4. Kalau ada tombol/operasi non-trivial
   - buat `*.actions.ts`
   - panggil via `api.callElementAction` dari UI

5. Register plugin
   - di `src/designer/plugins/builtinPlugins.tsx`

---

## 5) Referensi file penting

- Core element definition: `src/designer/core/elements.ts`
- API (call actions): `src/designer/core/api.ts`
- Renderer (Model A wrapper): `src/designer/ui/components/svgCanvas/renderTree.tsx`
- Properties controls: `src/designer/ui/components/properties/controls.tsx`
- Properties ctx type: `src/designer/ui/components/properties/types.ts`
