# Pixel Office — văn phòng pixel theo dõi subagent

- Ngày: 2026-10-25
- Trạng thái: Thiết kế đã duyệt, chờ duyệt spec
- Vị trí project: `E:\UnityProject\tools\pixel-office\`

## 1. Mục tiêu

Một trang web chạy local hiển thị **một văn phòng pixel art mở** (phong cách top-down như ảnh tham chiếu 2: sàn gạch cam, tường xanh xám, bàn máy tính, tủ sách), trong đó **mỗi subagent Claude Code là một nhân vật ngồi một bàn**. Nhìn vào là biết ngay agent nào đang làm gì, ai đang lỗi, ai đang chờ duyệt, ai đã xong — giống ý tưởng "phòng kế toán AI" ở ảnh tham chiếu 1 nhưng gói trong một phòng duy nhất.

Người dùng chính: chủ workspace `E:\UnityProject`, đang chạy đội 9 subagent Unity (`unity-game-director`, `unity-game-designer`, `unity-tech-architect`, `unity-project-setup`, `unity-gameplay-programmer`, `unity-scene-builder`, `unity-qa-tester`, `unity-code-reviewer`, `unity-build-engineer`).

### Tiêu chí thành công
1. Bật bằng một lệnh (`office on` hoặc `/office on`), tắt bằng một lệnh; khi tắt, Claude Code chạy y như chưa cài gì.
2. Sự kiện của agent hiện trên văn phòng trong vòng < 1 giây.
3. Click một nhân vật xem được nhật ký các bước gần nhất và báo cáo cuối của agent đó.
4. Toàn bộ chi phí bằng 0: không API trả phí, không model tạo ảnh, không token phát sinh khi chạy.

## 2. Ràng buộc cứng

- **Tuyệt đối không dùng model tạo ảnh** (kể cả ArtCraft hay bất kỳ diffusion/image model nào). Mọi sprite được Claude vẽ bằng code qua một **MCP vẽ pixel chạy local**.
- Không dịch vụ trả phí, không cloud. Server chỉ nghe `127.0.0.1`.
- Server không phụ thuộc package npm (chỉ dùng module có sẵn của Node).
- Hook chỉ cài ở mức project `E:\UnityProject` (file `settings.local.json`), không cài toàn máy.
- Hook không in gì vào context của Claude → không tốn token.

## 3. Ngoài phạm vi (YAGNI)

- Nhiều phòng / nhiều tầng; điều khiển agent từ văn phòng (chỉ xem, không ra lệnh).
- Lưu trữ lịch sử dài hạn, thống kê, biểu đồ.
- Âm thanh, chế độ mobile, truy cập từ máy khác.
- Spritesheet/atlas: ~30 PNG nhỏ được tải trực tiếp.

## 4. Điều kiện tiên quyết

- **Node.js LTS** (miễn phí). Máy hiện chưa có Node lẫn Python thật (`python` chỉ là alias Microsoft Store). Cài qua `winget install OpenJS.NodeJS.LTS` — **hỏi người dùng trước khi cài**.
- Claude Code ≥ bản có hook `type: "http"` và trường `agent_id`/`agent_type` (máy đang có 2.1.308, tài liệu hook hiện tại xác nhận cả hai).

## 5. Kiến trúc

```
Claude Code (phiên chính + subagent)
   │  hook type:"http", timeout 2s  (không sinh tiến trình)
   ▼
server.js  127.0.0.1:4848
   ├─ POST /hook        nhận payload hook → tóm tắt → ghi data/events.jsonl → cập nhật state
   ├─ GET  /events      SSE đẩy sự kiện đã tóm tắt xuống trình duyệt
   ├─ GET  /api/state   ảnh chụp trạng thái toàn bộ agent (dùng khi tải trang / kết nối lại)
   └─ GET  /*           phục vụ public/
   ▼
Trình duyệt: Canvas 320×180 phóng ×4 + panel nhật ký HTML
```

### Cấu trúc thư mục
```
pixel-office/
  server.js              HTTP + SSE + static, không phụ thuộc ngoài
  office.cmd             entry Windows: gọi node cli.js %*
  cli.js                 lệnh on | off | status | demo
  lib/
    summarize.js         payload hook → sự kiện tóm tắt (cắt ngắn, bỏ nội dung file)
    state.js             reducer thuần: (state, event) → state
    labels.js            sự kiện → câu tiếng Việt cho bong bóng
    hooks-config.js      thêm/gỡ hook office trong settings.local.json (thuần, nhận/trả JSON)
    eventlog.js          ghi JSONL + xoay vòng ở 5 MB, đọc lại khi khởi động
  public/
    index.html  style.css
    office.js            vòng vẽ 12 fps, layout phòng, đồ vật
    actors.js            nhân vật: trạng thái, đi lại (BFS lưới), animation, đổi màu palette
    panel.js             panel nhật ký khi click nhân vật, thanh trạng thái trên cùng
    layout.json          lưới ô đi được, vị trí bàn, điểm lang thang
    art/                 PNG do MCP vẽ + manifest.json + palette.json
    art-preview.html     xem toàn bộ sprite để duyệt
  data/events.jsonl      nhật ký (không commit)
  demo/scenario.json     chuỗi sự kiện giả cho `office demo`
  test/                  node:test
```

Mỗi file một trách nhiệm; `lib/*` là hàm thuần để test không cần server.

## 6. Luồng dữ liệu

### 6.1 Hook được cài
`SubagentStart`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SubagentStop`, `Notification`, `Stop` — mỗi event một entry:
```json
{ "hooks": [{ "type": "http", "url": "http://127.0.0.1:4848/hook", "timeout": 2 }] }
```
Server tắt → kết nối bị từ chối ngay, lỗi không chặn, Claude chạy tiếp.

### 6.2 Tóm tắt payload (`summarize.js`)
Giữ: `hook_event_name`, `session_id`, `agent_id`, `agent_type`, `tool_name`, `tool_use_id`, `duration_ms`, thời điểm nhận, và một `detail` ngắn (≤ 120 ký tự):
- Read/Edit/Write → tên file (basename)
- Bash/PowerShell → `description` nếu có, không thì lệnh cắt ngắn
- Agent → `subagent_type` được giao
- PostToolUseFailure → dòng đầu của `error`
- SubagentStop → `last_assistant_message` (≤ 2000 ký tự, chỉ hiện trong panel)

**Không bao giờ lưu** `tool_input.content`, `new_string`, `tool_response` đầy đủ.

### 6.3 Ai là ai
- Có `agent_type` → nhân vật theo `agent_type`.
- Không có `agent_id` (luồng chính) → bàn **Trưởng phòng** (dùng chung cho `unity-game-director` khi chạy bằng `claude --agent`).
- Nhiều instance cùng `agent_type` chạy song song (đếm theo `agent_id`) → nhân vật hiện "×N".
- `agent_type` lạ → tự kê bàn trống tiếp theo; hết bàn trống → đứng ở khu "khách".

### 6.4 Trạng thái nhân vật (`state.js`)
```
idle ──SubagentStart──▶ working ──PreToolUse──▶ working (bong bóng mới)
working ──PostToolUse──▶ working (toolCount+1)
working ──PostToolUseFailure──▶ error (giữ 5 s rồi về working)
working ──Notification(permission)──▶ waiting ──PreToolUse──▶ working
working ──SubagentStop──▶ done ──60 s không có gì──▶ idle
```
Mỗi agent: `{ key, name, role, desk, status, instances, bubble, toolCount, startedAt, endedAt, finalReport, log[≤50] }`.
`Stop` của phiên chính → Trưởng phòng về `done`.

### 6.5 Trình duyệt
Tải trang → `GET /api/state` → mở SSE `/events`. SSE rớt → tự kết nối lại (backoff 1→10 s) rồi lấy lại `/api/state`.

## 7. Giao diện

### 7.1 Khung
- Canvas gốc **320×180**, lưới **20×11 ô 16 px**, phóng nguyên lần (×4 → 1280×720, tự co ×2/×3 theo cửa sổ), `imageSmoothingEnabled = false`.
- Thanh trên cùng (HTML): Hook BẬT/TẮT · Kết nối · Tổng tool call · Số agent đang làm.

### 7.2 Bố cục phòng (một văn phòng mở)
- Tường trên (2 hàng ô) xanh xám có viền; cửa ra vào ở giữa; đồng hồ, tranh, bảng trắng **"Kết quả: xong/tổng"**.
- Hai tủ sách hai bên cửa, máy nước góc phải, cây cảnh góc dưới phải, thùng rác cạnh bàn.
- **Bàn Trưởng phòng** (to hơn) góc trái; 8 bàn nhân viên xếp 2 hàng × 4 giữa phòng; còn 2 bàn trống dự phòng cho agent lạ.

### 7.3 Nhân vật
- Sprite **16×24**, MCP chỉ vẽ **một nhân vật gốc** với các khung: đứng (xuống/lên), đi (2 khung × hướng, trái = lật phải), ngồi gõ phím (2 khung, nhìn từ sau).
- Mỗi agent khác nhau nhờ **đổi màu palette lúc chạy** (màu áo, màu tóc) + một phụ kiện nhỏ (mũ, kính, tai nghe…) vẽ riêng 8×8.
- Trên đầu: **đèn trạng thái** (xanh làm · vàng chờ · đỏ lỗi · xám rảnh · ✓ xong), **huy hiệu số** tool call, **bong bóng thoại** (9-slice, chữ pixel, tự xuống dòng, tối đa ~28 ký tự × 2 dòng).
- Màn hình trên bàn: tắt (rảnh) · chữ xanh chạy (làm) · đỏ (lỗi).
- Rảnh → lang thang giữa các điểm: máy nước, tủ sách, cây, cửa sổ; đi theo BFS trên lưới ô đi được. Có việc → đi về bàn rồi ngồi.

### 7.4 Panel nhật ký
Click nhân vật (hit-test theo khung sprite) → panel HTML bên phải: tên + vai trò · trạng thái · thời gian chạy · số tool call · 50 bước gần nhất (giờ, tool, detail, ✓/✗) · báo cáo cuối. Esc / click ra ngoài để đóng.

### 7.5 Bảng tên & màu mặc định
| agent_type | Tên hiển thị | Màu áo |
|---|---|---|
| (luồng chính) / unity-game-director | Trưởng phòng | đỏ đô |
| unity-game-designer | Thiết kế | tím |
| unity-tech-architect | Kiến trúc sư | xanh dương đậm |
| unity-project-setup | Setup | cam |
| unity-gameplay-programmer | Lập trình | xanh lá |
| unity-scene-builder | Dựng cảnh | vàng |
| unity-qa-tester | QA | hồng |
| unity-code-reviewer | Review | xám |
| unity-build-engineer | Build | nâu |

Cấu hình trong `public/layout.json`, sửa được không cần đụng code.

## 8. Asset pixel bằng MCP

- **Công cụ**: MCP vẽ pixel local. Ứng viên 1 `pixel-mcp` (npx); dự phòng `pixelart-mcp`. Bước đầu của kế hoạch: cài thử, vẽ 1 ô 16×16, xác nhận xuất được PNG đúng kích thước, màu chính xác, không khử răng cưa → chọn công cụ. Nếu cả hai không đạt, dừng lại hỏi người dùng (không tự chuyển sang model tạo ảnh).
- **Palette** ~24 màu tông ấm (gạch cam, gỗ, xanh xám tường, xanh lá cây, màn hình xanh/đỏ), lưu `palette.json`; mọi sprite chỉ dùng màu trong palette.
- **Danh sách (~25)**: gạch sàn (2 biến thể), tường, viền tường, cửa; bàn, bàn trưởng phòng, ghế (từ sau), màn hình ×3 trạng thái, case máy, bàn phím; tủ sách, máy nước, cây, đồng hồ, tranh, bảng trắng, thùng rác, cốc; nhân vật gốc (các khung) + 8 phụ kiện; đèn trạng thái, khung bong bóng 9-slice, huy hiệu, dấu ✓.
- `manifest.json` liệt kê tên, file, kích thước, số khung, anchor.
- `art-preview.html` hiển thị tất cả sprite phóng ×6 trên nền sàn để người dùng duyệt **trước** khi ghép vào văn phòng.

## 9. Bật / tắt

### 9.1 CLI `office`
- `office on`: (1) thêm 7 hook vào `E:\UnityProject\.claude\settings.local.json` (tạo file nếu chưa có, giữ nguyên mọi cấu hình khác); (2) khởi động `server.js` chạy nền, ghi PID vào `data/server.pid`; (3) mở `http://127.0.0.1:4848` bằng trình duyệt mặc định; (4) in nhắc nếu phiên Claude đang mở cần mở lại (theo kết quả kiểm tra ở §12).
- `office off`: gỡ đúng các entry có `url` = `http://127.0.0.1:4848/hook` (xoá cả mảng event/khối `hooks` nếu rỗng); dừng server theo PID.
- `office status`: hook bật/tắt, server chạy/không, số sự kiện đã nhận.
- `office demo`: bật server (không đụng hook) và phát `demo/scenario.json` qua `POST /hook`.
- Đường dẫn project Unity mặc định `E:\UnityProject`, đổi bằng `--project <path>`.
- Thêm `tools\pixel-office` vào PATH người dùng để gõ `office` ở mọi nơi — **hỏi người dùng trước**.

### 9.2 Lệnh tắt `/office` trong chat Claude
- File `E:\UnityProject\.claude\commands\office.md`: nhận `$ARGUMENTS` (`on|off|status|demo`), chạy `node E:\UnityProject\tools\pixel-office\cli.js $ARGUMENTS` và báo lại kết quả ngắn gọn bằng tiếng Việt.
- Ghi chú trong output: `/office on` gõ giữa phiên có thể chỉ có hiệu lực từ phiên sau (xem §12).

## 10. Tiết kiệm tài nguyên

- Hook `http`: không sinh tiến trình; ~1–5 ms/sự kiện khi bật; 0 khi tắt.
- Server: idle không làm gì; chỉ chạy khi `office on`/`demo`.
- Trình duyệt: vẽ 12 fps; `document.hidden` → dừng vòng vẽ; chỉ vẽ lại nền tĩnh một lần vào canvas offscreen.
- `events.jsonl` xoay vòng ở 5 MB (giữ 1 file cũ `events.1.jsonl`); khi khởi động chỉ dựng lại state từ 2000 dòng cuối.

## 11. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Server tắt khi hook bật | Hook lỗi không chặn, Claude chạy tiếp; sự kiện bị bỏ qua |
| Payload hook thiếu trường / JSON hỏng | Trả 200, ghi cảnh báo console server, bỏ qua |
| Dòng `events.jsonl` hỏng | Bỏ qua dòng đó khi đọc lại |
| Cổng 4848 bận | `office on` báo lỗi rõ ràng, không sửa settings |
| `settings.local.json` không parse được | Không ghi đè; báo lỗi và dừng |
| SSE rớt | Tự kết nối lại + lấy lại `/api/state` |
| Thiếu sprite | Vẽ ô màu thay thế + cảnh báo console, trang không sập |

## 12. Điểm cần kiểm chứng khi triển khai

1. Claude Code có áp dụng hook mới trong `settings.local.json` ngay giữa phiên hay chỉ khi mở phiên mới → quyết định thông báo của `office on` / `/office on`.
2. Hành vi thực tế khi hook `http` gặp connection refused (xác nhận không chặn, không làm phiền UI).
3. Payload thật của `Notification` khi chờ duyệt quyền (trường nào phân biệt "chờ duyệt").
4. Luồng chính khi chạy `claude --agent unity-game-director` có kèm `agent_type` không.
5. Công cụ MCP vẽ pixel được chọn (§8).

## 13. Kiểm thử

- **Unit (node:test, không cần server)**:
  - `summarize`: mỗi loại tool cho ra `detail` đúng; không rò `content`/`new_string`.
  - `state`: các chuyển trạng thái ở §6.4, đếm instance, agent lạ được kê bàn, `done → idle` sau 60 s (đồng hồ giả).
  - `labels`: câu tiếng Việt đúng cho từng tool, cắt ngắn đúng.
  - `hooks-config`: thêm vào file rỗng / file có hook khác của người dùng; gỡ chỉ xoá entry office; chạy `on` hai lần không nhân đôi.
  - `eventlog`: xoay vòng ở ngưỡng, bỏ qua dòng hỏng.
- **Tích hợp**: khởi động server, POST payload mẫu, đọc `/api/state` và SSE.
- **Bằng mắt**: `office demo` → mở trong browser, chụp màn hình: đủ 9 nhân vật, có lỗi đỏ, có chờ vàng, có hoàn thành ✓, click mở panel.
- **Thật**: `office on` → chạy một subagent nhỏ trong `E:\UnityProject` → nhân vật tương ứng phản ứng; `office off` → `settings.local.json` trở về như trước.

## 14. Tiêu chí hoàn thành

- Tất cả unit test pass; demo hiển thị đúng như mục 13.
- `office on/off/status/demo` và `/office` hoạt động; `office off` để lại settings đúng như trước khi `on`.
- Toàn bộ sprite trong `public/art/` sinh từ MCP vẽ pixel, có `art-preview.html`, không file nào đến từ model tạo ảnh.
