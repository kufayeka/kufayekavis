# Plugin Standard (Baku) — Kufayeka Visual Designer

Tujuan dokumen ini: bikin aturan main yang **konsisten** supaya banyak orang bisa nambah fitur lewat plugin tanpa bikin core/UI drift.

Dokumen ini melengkapi:
- [PLUGIN_API.md](../PLUGIN_API.md)
- [plugins/README.md](README.md)

---

## 1) Definisi plugin di project ini

Plugin = module yang didaftarkan ke `PluginManager` lalu di-`activate()` dengan context:
- `api` (operasi designer)
- `registry` (slot-slot kontribusi UI)
- `elements` (registrasi element)
- opsional `host`/`engine` (untuk plugin “native” di app)

Konsekuensi:
- Plugin tidak auto-discover dari folder; harus di-wire di tempat host dibuat.
- Plugin harus aman di-reload: **semua side-effect harus bisa di-dispose**.

---

## 2) Kontrak minimum (wajib)

Setiap plugin WAJIB:

1) Punya `id` yang unik dan namespaced
- Format disarankan: `scope.feature.name`
- Contoh: `system.mqttScada`, `acme.timeseries.influx`.

2) Semua kontribusi (UI / elements / subscriptions) harus punya disposer
- `activate()` mengembalikan `Disposable` atau `Disposable[]`.

3) Tidak boleh “nyolok” UI lewat DOM
- Tidak boleh `querySelector`, inject HTML, dll.
- Semua UI harus lewat `DesignerRegistry` slots.

4) Mutasi state wajib lewat `DesignerAPI` / `DesignerEngine`
- Disarankan: lewat `api`.
- Hindari menyentuh `state.doc.elements` secara langsung.

5) Tidak ada side-effect saat import module
- Jangan connect MQTT / start timers di top-level file.
- Mulai runtime hanya di `activate()`.

---

## 3) Naming convention (biar tidak tabrakan)

Gunakan prefix `pluginId` untuk semua id turunan:

- Dialog id: `${pluginId}.dialog.settings`
- Ribbon item id: `${pluginId}.ribbon.openSettings`
- Panel section id: `${pluginId}.panel.status`
- Overlay id: `${pluginId}.overlay.hud`

Ini penting karena `DesignerRegistry` replace-by-id.

---

## 4) Settings (baku) + scope penyimpanan

### Scope yang ada sekarang

- **Project scope (disarankan)**: disimpan di `project.pluginSettings[pluginId]`.
  - Ikut export/import project.
  - Cocok untuk: datasource config, mapping tag, behavior default.

Catatan: sebelumnya ada legacy `doc.pluginSettings` (per-canvas). Sekarang canonical ada di `project.pluginSettings`.

### Aturan settings

- Semua settings plugin harus punya:
  - schema (disarankan `zod`)
  - default values
  - `coerce()` untuk menangani data lama/korup

- Jangan simpan secret beneran (password) ke project kalau targetnya sharing file.
  - Kalau butuh: simpan credential di user-level storage (future work), dan di project hanya simpan reference.

---

## 5) Struktur folder (disarankan untuk plugin yang “serius”)

Untuk plugin kecil: 1 file `*.tsx` masih OK.

Untuk plugin yang kompleks (contoh MQTT/remote-control), pakai struktur ini:

```
src/designer/plugins/<pluginId>/
  index.ts               // export plugin
  manifest.ts            // metadata (optional tapi disarankan)
  settings.ts            // schema + defaults + coerce
  runtime/
    service.ts           // koneksi eksternal (mqtt/ws/polling)
    commands.ts          // parser + executor command
  ui/
    SettingsDialog.tsx
    StatusBadge.tsx
```

Tujuan pemisahan:
- `runtime/*`: pure logic + side effects eksternal
- `ui/*`: React components
- `settings.ts`: satu-satunya sumber kebenaran settings
- `index.ts`: wiring via `activate()`

---

## 6) Lifecycle (pola yang benar)

Pola baku di `activate()`:

1) Register UI slots (buttons/panels/dialog)
2) Register element definitions (jika ada)
3) Start runtime (mqtt/ws/timers) — simpan handle
4) Kembalikan disposers yang mematikan semuanya

Checklist cleanup:
- unsubscribe engine/api
- unregister registry items
- stop timers
- disconnect mqtt/ws

---

## 7) PR checklist (Definition of Done)

Sebelum merge plugin baru:
- Tidak ada side-effect top-level
- Semua `register*` punya disposer dan di-return
- Semua listener/timer/mqtt disconnect saat dispose
- Semua id turunan pakai prefix `pluginId`
- Settings punya default + coerce, dan tersimpan di `project.pluginSettings`

---

## 8) Catatan tentang konsep existing kamu (ringkas)

Yang sudah bagus:
- `PluginManager` simple + ada disposer contract.
- `DesignerRegistry` replace-by-id → aman reload.
- Core menghindari React types (render typed `unknown`) → boundary core/UI cukup rapi.

Yang bikin “terasa mbulet” saat plugin membesar:
- Satu file plugin membungkus semuanya (UI + runtime + parsing) seperti SCADA MQTT → sulit di-maintain tim.

Solusi baku:
- Wajib pakai pemisahan folder untuk plugin kompleks + settings schema tunggal.
