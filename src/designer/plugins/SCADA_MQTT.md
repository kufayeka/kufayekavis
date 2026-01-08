# SCADA MQTT (WebSocket) Plugin — `system.mqttScada`

Dokumen ini khusus untuk plugin **SCADA MQTT Connections** yang ada di project ini.

- Source: `src/designer/plugins/mqttScadaPlugin.tsx`
- Plugin id: `system.mqttScada`
- Dialog id: `system.mqttScada.settings`
- Tombol ribbon: **SCADA MQTT**

Tujuan plugin:
1) **UI Remote Control Interface**: menerima command dari MQTT topic dan mengontrol canvas + element (create/update/delete/selection/zoom/dll) via `DesignerAPI`.
2) **UI Event Output Interface**: publish event UI (onClick/onMouseEnter/onMouseLeave dari element, plus event basic dari canvas) ke MQTT topic untuk kebutuhan SCADA / kolaborasi.

---

## Cara pakai cepat

1) Jalankan aplikasi, buka halaman editor: `/edit`
2) Klik tombol ribbon **SCADA MQTT**
3) Isi `Broker WS URL` (contoh: `ws://localhost:9001/mqtt`)
4) Klik **Save**
5) (Opsional) Klik **Test** untuk cek connect/timeout

Kalau URL kosong, plugin tidak connect dan `api.publishEvent(...)` akan fallback ke console log (mock default).

---

## Penyimpanan setting (export/import JSON)

Setting plugin disimpan di project JSON:

- Lokasi: `doc.pluginSettings["system.mqttScada"]`
- Tersimpan saat export: `engine.exportProjectJson()`
- Ter-restore saat import: `engine.importProjectJson(json)`

Catatan penting:
- `pluginSettings` **tidak masuk** ke undo/redo history. Jadi mengubah setting SCADA tidak membuat “history commit”.

---

## Parameter / Field konfigurasi

Semua setting ini ada di `doc.pluginSettings["system.mqttScada"]`.

### MQTT Connection

- `url` (string, wajib)
  - Format: `ws://host:port/mqtt` atau `wss://...`
  - Contoh: `ws://localhost:9001/mqtt`

- `username` (string, optional)
- `password` (string, optional)
- `clientId` (string, optional)
- `clean` (boolean, default `true`)
  - Clean session.

- `keepalive` (number, detik, default `30`)
- `reconnectPeriodMs` (number, ms, default `2000`)

### Remote Control Interface (subscribe)

- `remoteControlEnabled` (boolean, default `true`)
- `remoteControlTopic` (string, default `scada/rc`)
- `remoteControlResponseTopic` (string, default `scada/rc/resp`)
  - Jika diisi, plugin bisa mengirim response untuk command tertentu (mis: export/import/call action).

Plugin akan subscribe ke `remoteControlTopic` saat MQTT `connect`.

### Event Output Interface (publish)

- `eventOutputEnabled` (boolean, default `true`)
- `defaultEventTopic` (string, default `scada/events`)
  - Mapping khusus untuk publish ke topic `default/events`.

- `forcePublishElementEvents` (boolean, default `false`)
  - Jika `true`, semua element akan publish event UI (enter/click/leave) walaupun flag per-element belum diaktifkan.

- `forcePublishCanvasEvents` (boolean, default `false`)
  - Saat ini canvas event sudah selalu dipanggil (publishing tetap ditentukan oleh `eventOutputEnabled`).

Mapping yang dilakukan:
- Jika ada pemanggilan `api.publishEvent("default/events", data)`, plugin akan publish ke `defaultEventTopic`.
- Jika `topic` bukan `default/events`, maka publish ke topic yang diberikan.

---

## Event yang dipublish

### Event element

Event element dipublish oleh render tree SVG ketika flag listener element aktif.

Syarat per-element:
- `enableOnMouseHoverEventListener: true` untuk mengaktifkan publish onMouseEnter
- `enableOnMouseClickEventListener: true` untuk mengaktifkan publish onClick
- `enableOnMouseLeaveEventListener: true` untuk mengaktifkan publish onMouseLeave

Topic per-element:
- Jika element punya `mqttTopic`, event akan dikirim ke topic itu.
- Jika tidak ada, event akan dikirim ke `default/events` (lalu di-map ke `defaultEventTopic`).

Payload event element (current implementation):

- onMouseEnter:
  ```json
  { "eventType": "onMouseEnter", "sourceElement": "<elementId>" }
  ```
- onClick:
  ```json
  { "eventType": "onClick", "sourceElement": "<elementId>" }
  ```
- onMouseLeave:
  ```json
  { "eventType": "onMouseLeave", "sourceElement": "<elementId>" }
  ```

### Event canvas

Canvas publish event basic ke topic `default/events` (di-map ke `defaultEventTopic`):

- Click background canvas (bukan klik element):
  ```json
  { "eventType": "onCanvasClick" }
  ```

- Mouse enter area SVG:
  ```json
  { "eventType": "onCanvasEnter" }
  ```

- Mouse leave area SVG:
  ```json
  { "eventType": "onCanvasLeave" }
  ```

Catatan:
- Kalau user klik element, canvas `onClick` tidak publish (karena dianggap event element).

---

## Remote control: format message & command

Remote control message adalah JSON dengan bentuk:

```json
{ "action": "<actionName>", "payload": { }, "requestId": "optional" }
```

Jika `remoteControlResponseTopic` aktif dan command mendukung response, plugin akan publish JSON ke topic itu dengan format:

```json
{ "type": "<responseType>", "requestId": "...", "ok": true, "result": {}, "error": "" }
```

### 1) Selection

- `select`
  - payload:
    ```json
    { "ids": ["id1", "id2"], "append": false }
    ```

- `clearSelection`
  - payload: `{}`

### 2) Tool & View mode

- `setTool`
  - payload:
    ```json
    { "tool": "select" }
    ```
  - contoh tool bawaan: `select`, `magnifier`, `rect`, `circle`, `line`, `free`, `image`, `text`

- `setViewMode`
  - payload:
    ```json
    { "value": true }
    ```

### 3) Zoom

- `setZoom`
  - payload:
    ```json
    { "scale": 1.2, "panX": 0, "panY": 0 }
    ```

Catatan:
- `scale` di engine dikunci/clamp (0.1..8 untuk setZoom di core).

### 4) Canvas settings

- `setCanvas`
  - payload contoh:
    ```json
    { "width": 1920, "height": 1080, "gridEnabled": true, "gridSize": 20, "snapToGrid": false, "background": "var(--background)" }
    ```

### 5) Create element

- `createElement`
  - payload:
    ```json
    { "input": { "type": "rect", "x": 100, "y": 100 } }
    ```

`CreateElementInput` yang didukung:
- Rect:
  ```json
  { "type": "rect", "x": 100, "y": 100 }
  ```
- Circle:
  ```json
  { "type": "circle", "x": 200, "y": 200 }
  ```
- Line:
  ```json
  { "type": "line", "x1": 100, "y1": 100, "x2": 300, "y2": 200 }
  ```
- Free:
  ```json
  { "type": "free", "d": "M 10 10 L 20 20" }
  ```
- Text:
  ```json
  { "type": "text", "x": 100, "y": 100, "text": "Hello" }
  ```
- Image:
  ```json
  { "type": "image", "x": 100, "y": 100, "href": "https://...", "width": 220, "height": 160, "fit": "contain" }
  ```
- Custom:
  ```json
  { "type": "custom", "kind": "numericDisplay", "x": 100, "y": 100, "width": 200, "height": 100, "props": {"value": 10} }
  ```

### 6) Update element

- `updateElement`
  - payload:
    ```json
    { "id": "rect_123", "patch": { "x": 120, "y": 140, "rotation": 15 } }
    ```

Catatan:
- Patch langsung masuk ke `api.updateElement(id, patch)`.

### 7) Delete elements

- `deleteElements`
  - payload:
    ```json
    { "ids": ["rect_123", "circle_9"] }
    ```

- `deleteAllElements`
  - payload: `{}`

### 8) Translate (move)

- `translate`
  - payload:
    ```json
    { "ids": ["rect_123"], "dx": 10, "dy": -5 }
    ```

### 9) Z-order

- `bringToFront`
  - payload:
    ```json
    { "ids": ["rect_123"] }
    ```

### 10) Grouping

- `groupSelection`
  - payload: `{}`

- `ungroupSelection`
  - payload: `{}`

### 11) Custom props

- `updateCustomProps`
  - payload:
    ```json
    { "id": "custom_1", "patch": { "value": 123, "unit": "bar" } }
    ```

### 12) Call element action (Custom element)

- `callElementAction`
  - payload:
    ```json
    { "id": "custom_1", "actionId": "setValue", "args": [123] }
    ```
  - response (jika response topic aktif):
    ```json
    { "type": "callElementAction", "requestId": "abc", "ok": true, "result": null }
    ```

### 13) Export / Import project JSON

- `exportProjectJson`
  - payload: `{}`
  - response:
    ```json
    { "type": "exportProjectJson", "requestId": "abc", "ok": true, "json": "{...}" }
    ```

- `importProjectJson`
  - payload salah satu:
    ```json
    { "jsonText": "{...}" }
    ```
    atau
    ```json
    { "doc": {"canvas": {"width": 800, "height": 600}, "rootIds": [], "elements": {}} }
    ```
  - response:
    ```json
    { "type": "importProjectJson", "requestId": "abc", "ok": true }
    ```

---

## Perilaku koneksi (runtime)

- Plugin membuat client MQTT hanya jika `url` terisi.
- Plugin mencoba reconnect kalau `url`/credential berubah.
- Subscribe remote control dilakukan saat event `connect`.

Tombol **Test**:
- Membuat koneksi sementara dan resolve `Connected` atau error/timeout.

---

## Troubleshooting

### 1) Event tidak publish

Cek:
- `eventOutputEnabled = true`
- `url` valid dan broker bisa menerima WS
- Element punya flag listener:
  - `enableOnMouseClickEventListener` / `enableOnMouseHoverEventListener` / `enableOnMouseLeaveEventListener`

Kalau kamu mau "tanpa setting flag per element", aktifkan:
- `forcePublishElementEvents = true`

### 2) Remote control tidak jalan

Cek:
- `remoteControlEnabled = true`
- `remoteControlTopic` sama persis dengan publisher
- Payload valid JSON

### 3) Browser block mixed content

Kalau halaman kamu HTTPS, broker WS biasanya harus `wss://...`.

---

## Catatan keamanan (penting)

- Remote control topic memberi kemampuan create/update/delete. Gunakan:
  - broker yang aman
  - auth (username/password)
  - topic ACL
  - network segmentation

---

## Contoh end-to-end (minimal)

### Publish event (dari UI)

Jika defaultEventTopic = `scada/events`, saat user click element yang event enabled:

- topic: `scada/events`
- payload:
  ```json
  { "eventType": "onClick", "sourceElement": "rect_123" }
  ```

### Remote create element

Publish ke `scada/rc`:

```json
{ "action": "createElement", "payload": { "input": { "type": "text", "x": 120, "y": 80, "text": "SCADA" } } }
```
