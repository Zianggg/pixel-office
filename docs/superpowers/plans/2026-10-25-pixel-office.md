# Pixel Office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang web local hiển thị một văn phòng pixel art mở, mỗi subagent Claude Code là một nhân vật ở một bàn, cập nhật realtime qua hook `http`, bật/tắt bằng `office on|off` hoặc `/office`.

**Architecture:** Hook `type:"http"` của Claude Code POST payload tới `server.js` (Node thuần, 127.0.0.1:4848). Server tóm tắt payload, ghi `events.jsonl`, gộp vào state bằng reducer thuần, đẩy xuống trình duyệt qua SSE. Trình duyệt vẽ phòng 320×180 trên canvas phóng nguyên lần; chữ (bong bóng, huy hiệu) vẽ trên canvas overlay ở độ phân giải hiển thị để tiếng Việt có dấu hiện đúng. Sprite do Claude vẽ bằng MCP pixel local.

**Tech Stack:** Node.js LTS (ESM, `node:http`, `node:test`, `node:fs`), HTML/Canvas/JS thuần, một MCP vẽ pixel local. Không npm dependency.

**Spec:** `E:\UnityProject\tools\pixel-office\docs\superpowers\specs\2026-10-25-pixel-office-design.md`

## Global Constraints

- Tuyệt đối không dùng model tạo ảnh (ArtCraft, diffusion…); mọi PNG trong `public/art/` sinh từ MCP vẽ pixel local. MCP không đạt → dừng, hỏi người dùng.
- Không npm dependency; chỉ module có sẵn của Node. `package.json` có `"type": "module"`.
- Server chỉ bind `127.0.0.1`, cổng `4848`. Hook URL đúng chuỗi `http://127.0.0.1:4848/hook`, `timeout: 2`.
- Hook chỉ ghi vào `E:\UnityProject\.claude\settings.local.json`; giữ nguyên mọi cấu hình khác.
- Không lưu `tool_input.content`, `tool_input.new_string`, `tool_input.old_string`, `tool_response` đầy đủ. `detail` ≤ 120 ký tự; `finalReport` ≤ 2000 ký tự.
- `events.jsonl` xoay vòng ở 5 MB (5 \* 1024 \* 1024 byte), giữ 1 file `events.1.jsonl`; khởi động dựng lại state từ 2000 dòng cuối.
- Canvas gốc 320×180, ô 16 px, lưới 20×11; vẽ 12 fps; dừng khi `document.hidden`.
- Log mỗi agent ≤ 50 mục. `error` giữ 5 s rồi về `working`; `done` → `idle` sau 60 s không có sự kiện.
- Văn bản hiển thị cho người dùng bằng tiếng Việt.
- Cài Node, thêm PATH, cài MCP: **hỏi người dùng trước** từng việc.
- Test: `node --test` chạy trong `E:\UnityProject\tools\pixel-office`.

## Review Focus

1. **Đường dẫn Windows** (`E:\UnityProject\Game\Assets\Player.cs`) trong `file_path` → `detail` phải là `Player.cs`, không phải cả chuỗi. Test ở Task 1.
2. **`settings.local.json` đã có hook của người dùng cùng event** (hoặc có BOM UTF-8) → `on` thêm cạnh, `off` chỉ gỡ entry office, BOM không làm parse lỗi. Test ở Task 5.
3. **Agent kẹt "working" mãi** khi server khởi động lại giữa chừng hoặc mất `SubagentStop` → agent không có sự kiện trong 10 phút chuyển `idle`. Test ở Task 3.
4. **Cắt chuỗi tiếng Việt / emoji** → cắt theo code point (`Array.from`), không để lại nửa cặp surrogate; thêm `…` khi cắt. Test ở Task 2.
5. **Cổng 4848 bị chiếm** → `office on` báo lỗi tiếng Việt và **không** sửa settings. Test ở Task 6.

---

## File Structure

```
E:\UnityProject\tools\pixel-office\
  package.json  .gitignore  office.cmd  cli.js  server.js
  lib/summarize.js  lib/labels.js  lib/state.js  lib/eventlog.js  lib/hooks-config.js
  public/index.html  public/style.css  public/layout.json
  public/js/main.js        SSE client, vòng 12 fps, ghép các phần
  public/js/room.js        vẽ nền tĩnh (offscreen) + đồ vật động (màn hình)
  public/js/actors.js      vị trí/animation nhân vật, đổi màu palette
  public/js/path.js        BFS thuần (test được bằng node)
  public/js/overlay.js     bong bóng, huy hiệu, đèn trạng thái (canvas overlay)
  public/js/panel.js       thanh trên cùng + panel nhật ký
  public/art/*.png  public/art/manifest.json  public/art/palette.json
  public/art-preview.html
  demo/scenario.json
  test/*.test.js  test/fixtures/*.json
E:\UnityProject\.claude\commands\office.md
```

## Kiểu dữ liệu dùng chung

```js
// OfficeEvent — đầu ra summarize(), dòng trong events.jsonl, payload SSE "event"
{ t: number /*ms*/, ev: string /*hook_event_name*/, session: string,
  agentId: string|null, agentType: string|null, tool: string|null,
  toolUseId: string|null, detail: string, ok: boolean|null,
  waiting: boolean, finalReport: string|null }

// AgentView — phần tử của state.agents (key = agentType hoặc "__main__")
{ key, name, role, desk: number /*index trong layout.desks, -1 = khu khách*/,
  status: "idle"|"working"|"waiting"|"error"|"done",
  instances: number, bubble: string, toolCount: number,
  startedAt: number|null, endedAt: number|null, lastEventAt: number|null,
  errorUntil: number|null, finalReport: string|null,
  log: Array<{t, tool, detail, ok}> }

// OfficeState
{ agents: Record<string, AgentView>, totals: { tools: number, done: number, started: number },
  activeIds: Record<string /*agentId*/, string /*key*/> }
```

`layout.json` (Task 3 tạo, frontend dùng):
```json
{ "cols": 20, "rows": 11, "tile": 16,
  "agents": [ { "type": "__main__", "name": "Trưởng phòng", "shirt": "red", "hair": "dark", "acc": "tie", "desk": 0 }, ... 8 agent theo spec §7.5 ... ],
  "desks": [ { "x":1,"y":3,"w":3,"seat":[2,4],"boss":true },
             { "x":6,"y":4,"w":2,"seat":[6,5] }, { "x":9,"y":4,"w":2,"seat":[9,5] }, { "x":12,"y":4,"w":2,"seat":[12,5] }, { "x":15,"y":4,"w":2,"seat":[15,5] },
             { "x":6,"y":7,"w":2,"seat":[6,8] }, { "x":9,"y":7,"w":2,"seat":[9,8] }, { "x":12,"y":7,"w":2,"seat":[12,8] }, { "x":15,"y":7,"w":2,"seat":[15,8] },
             { "x":1,"y":7,"w":2,"seat":[1,8],"spare":true }, { "x":1,"y":9,"w":2,"seat":[1,10],"spare":true } ],
  "guest": [17,10],
  "props": [ {"sprite":"door","x":9,"y":0}, {"sprite":"bookshelf","x":7,"y":0}, {"sprite":"bookshelf","x":12,"y":0},
             {"sprite":"clock","x":5,"y":0}, {"sprite":"painting","x":15,"y":0}, {"sprite":"whiteboard","x":2,"y":0},
             {"sprite":"cooler","x":18,"y":2}, {"sprite":"plant","x":18,"y":9}, {"sprite":"bin","x":4,"y":4} ],
  "wander": [[18,3],[8,2],[13,2],[17,9],[10,2]],
  "blocked": "tính từ desks + props + 2 hàng tường (y=0..1), trừ ô cửa" }
```
Agents theo đúng bảng spec §7.5, desk 1→8 theo thứ tự bảng. `acc` lấy từ `tie, cap, glasses, headset, bow, beanie, helmet, scarf` (mỗi tên dùng một lần); agent thứ 9 có `"acc": null`. `unity-game-director` dùng chung desk 0 với `__main__` (cùng `key: "__main__"`).

---

### Task 0: Chuẩn bị môi trường

**Files:**
- Create: `package.json`, `.gitignore`, `test/smoke.test.js`

- [ ] **Step 1:** Hỏi người dùng cho phép chạy `winget install OpenJS.NodeJS.LTS`. Sau khi cài, mở shell mới, chạy `node --version` → Expected: `v2x.x.x` (LTS).
- [ ] **Step 2:** Hỏi người dùng cho phép `git init` trong `E:\UnityProject\tools\pixel-office` (để commit theo từng task). Nếu từ chối: bỏ qua mọi bước commit.
- [ ] **Step 3:** Tạo `package.json` `{ "name": "pixel-office", "private": true, "type": "module", "scripts": { "test": "node --test" } }`; `.gitignore`: `data/`, `node_modules/`.
- [ ] **Step 4:** `test/smoke.test.js` khẳng định `1+1===2`; chạy `node --test` → Expected: `pass 1`.
- [ ] **Step 5:** Commit `chore: scaffold pixel-office` (kèm spec + plan).

### Task 1: `summarize` — payload hook → OfficeEvent

**Files:** Create `lib/summarize.js`, `test/summarize.test.js`, `test/fixtures/*.json` (một payload mẫu mỗi event, lấy theo schema trong tài liệu hook).

**Interfaces:**
- Produces: `export function summarize(payload: object, now = Date.now()): OfficeEvent | null` — trả `null` khi thiếu `hook_event_name`.

- [ ] **Step 1: Viết test thất bại** — các case:
  - `Edit` với `file_path: "E:\\UnityProject\\Game\\Assets\\Player.cs"` → `detail === "Player.cs"` (dùng `path.win32.basename`, đúng cả với `/`).
  - `Write` có `content` 10 KB → `JSON.stringify(ev)` không chứa chuỗi content; `detail === tên file`.
  - `Bash` có `description: "Chạy test"` → `detail === "Chạy test"`; không có description → lệnh cắt ≤ 120 ký tự.
  - `Agent` với `tool_input.subagent_type: "unity-qa-tester"` → `detail === "unity-qa-tester"`.
  - `PostToolUseFailure` `error: "Exit code 1\nError: X"` → `ok === false`, `detail === "Exit code 1"`.
  - `PostToolUse` → `ok === true`. `PreToolUse` → `ok === null`.
  - `SubagentStop` `last_assistant_message` 5000 ký tự → `finalReport.length <= 2000`.
  - `Notification` có `notification_type === "permission_prompt"` **hoặc** message chứa "permission" → `waiting === true`.
  - Thiếu `agent_id` → `agentId === null`, `agentType === null`.
  - `{}` → `null`.
- [ ] **Step 2:** `node --test test/summarize.test.js` → Expected: FAIL (module chưa có).
- [ ] **Step 3: Implement `summarize`** cùng helper `export function clip(s: string, n: number): string` (cắt theo code point bằng `Array.from`, thêm `…` khi cắt) trong `lib/summarize.js`; Task 2 import lại.
- [ ] **Step 4:** Chạy lại → Expected: PASS.
- [ ] **Step 5:** Commit `feat: summarize hook payloads`.

### Task 2: `labels` — câu tiếng Việt cho bong bóng

**Files:** Create `lib/labels.js`, `test/labels.test.js`.

**Interfaces:**
- Consumes: `clip` từ `lib/summarize.js`.
- Produces: `export function bubbleText(ev: OfficeEvent): string` (≤ 56 ký tự).

Bảng chữ (copy cố định):
| Điều kiện | Câu |
|---|---|
| tool `Read` | `Đọc {detail}` |
| `Edit` / `MultiEdit` | `Sửa {detail}` |
| `Write` | `Viết {detail}` |
| `Bash` / `PowerShell` | `{detail}` |
| `Grep` / `Glob` | `Tìm kiếm…` |
| `Agent` | `Giao việc cho {detail}` |
| `WebSearch` / `WebFetch` | `Tra cứu web…` |
| tool bắt đầu bằng `mcp__` | `Dùng {tên server MCP}` |
| tool khác | `Dùng {tool}` |
| `ev === "SubagentStart"` | `Vào việc!` |
| `ev === "SubagentStop"` / `Stop` | `Xong rồi ✓` |
| `ok === false` | `Lỗi: {detail}` |
| `waiting` | `Chờ sếp duyệt…` |

- [ ] **Step 1: Test thất bại** — mỗi dòng bảng một assert; thêm: `clip("Sửa 😀😀😀", 6)` không chứa ký tự `\uD83D` lẻ và kết thúc bằng `…`; chuỗi tiếng Việt 200 ký tự → `bubbleText(...).length <= 56` (đếm bằng `Array.from`).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement `bubbleText`.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5:** Commit `feat: vietnamese bubble labels`.

### Task 3: `state` — reducer trạng thái + `layout.json`

**Files:** Create `lib/state.js`, `public/layout.json`, `test/state.test.js`.

**Interfaces:**
- Consumes: `OfficeEvent`, `bubbleText`.
- Produces:
  - `export function createState(layout): OfficeState` — tạo sẵn AgentView `idle` cho mọi agent trong `layout.agents`.
  - `export function reduce(state, ev: OfficeEvent, layout): OfficeState` — trả object mới (không mutate).
  - `export function tick(state, now: number): OfficeState` — áp các mốc thời gian.
  - `export function keyFor(ev): string` — `agentType ?? "__main__"`, `"unity-game-director"` → `"__main__"`.

- [ ] **Step 1: Test thất bại**:
  - `SubagentStart` (agentId `a1`, type `unity-qa-tester`) → `status "working"`, `instances 1`, `startedAt === ev.t`, `totals.started 1`.
  - Thêm `SubagentStart` `a2` cùng type → `instances 2`; `SubagentStop` `a1` → vẫn `working`, `instances 1`; `SubagentStop` `a2` → `done`, `totals.done 1`, `finalReport` lấy từ ev.
  - `PreToolUse` → `bubble === bubbleText(ev)`, thêm 1 mục log; 60 `PreToolUse` → `log.length === 50`, giữ 50 mục mới nhất.
  - `PostToolUse` → `toolCount +1`, `totals.tools +1`.
  - `PostToolUseFailure` tại t → `status "error"`, `errorUntil === t+5000`; `tick(s, t+5001)` → `working`.
  - `Notification` waiting → `waiting`; `PreToolUse` sau đó → `working`.
  - `done` tại t, `tick(s, t+60001)` → `idle`.
  - **Review Focus 3:** `working`, `lastEventAt = t`, `tick(s, t + 10*60*1000 + 1)` → `idle`.
  - Agent type lạ `my-agent` → được gán desk `spare` đầu tiên còn trống; agent lạ thứ 3 → `desk -1`.
  - Event không có agentId → key `__main__`; `Stop` → `__main__` `done`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement; viết `layout.json` đúng như mục "Kiểu dữ liệu dùng chung" (khối `blocked` không ghi vào file — frontend tự tính).
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5:** Commit `feat: office state reducer`.

### Task 4: `eventlog` — JSONL có xoay vòng

**Files:** Create `lib/eventlog.js`, `test/eventlog.test.js`.

**Interfaces:**
- Produces: `export function createEventLog({ dir: string, maxBytes = 5*1024*1024 }): { append(ev): void, readTail(n = 2000): OfficeEvent[], count(): number }` — `append` dùng `fs.appendFileSync`; vượt `maxBytes` thì đổi tên thành `events.1.jsonl` (ghi đè file cũ) rồi bắt đầu file mới.

- [ ] **Step 1: Test thất bại** (thư mục tạm `fs.mkdtempSync`): append 3 → `readTail()` trả 3 theo thứ tự; `maxBytes: 200`, append 20 event → tồn tại `events.1.jsonl`, `events.jsonl` < 200 byte; chèn dòng `{hỏng` → `readTail` bỏ qua, không throw; `readTail(5)` khi có 2 file ghép đúng 5 dòng cuối.
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: rotating event log`.

### Task 5: `hooks-config` — thêm/gỡ hook office

**Files:** Create `lib/hooks-config.js`, `test/hooks-config.test.js`.

**Interfaces:**
- Produces:
  - `export const HOOK_URL = "http://127.0.0.1:4848/hook"`, `export const HOOK_EVENTS = ["SubagentStart","PreToolUse","PostToolUse","PostToolUseFailure","SubagentStop","Notification","Stop"]`.
  - `export function addOfficeHooks(settings: object, url = HOOK_URL): object` — idempotent, mỗi event thêm `{ hooks: [{ type: "http", url, timeout: 2 }] }`.
  - `export function removeOfficeHooks(settings: object, url = HOOK_URL): object` — gỡ mọi hook có `url` trùng; xoá matcher-group rỗng, mảng event rỗng, khối `hooks` rỗng.
  - `export function hasOfficeHooks(settings: object, url = HOOK_URL): boolean`.
  - Mọi hàm không mutate input.
  - `export function readSettings(file: string): object` (file không có → `{}`; bỏ BOM; JSON hỏng → throw `Error("settings.local.json không đọc được: ...")`), `export function writeSettings(file, obj): void` (JSON 2 space, tạo thư mục nếu thiếu).

- [ ] **Step 1: Test thất bại**: `addOfficeHooks({})` có đủ 7 event; gọi 2 lần → không nhân đôi; settings có sẵn `permissions` + `hooks.PreToolUse` của người dùng (command hook) → giữ nguyên cả hai, office thêm cạnh; `removeOfficeHooks(addOfficeHooks(x))` deep-equal `x` với `x` có/không có hook người dùng; **Review Focus 2:** `readSettings` file bắt đầu bằng `\uFEFF{}` → `{}`; file `{hỏng` → throw có chữ "không đọc được".
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: settings hook editor`.

### Task 6: `server.js` + `cli.js` + lệnh `office` + `/office` + demo

**Files:** Create `server.js`, `cli.js`, `office.cmd`, `demo/scenario.json`, `E:\UnityProject\.claude\commands\office.md`, `test/server.test.js`, `test/cli.test.js`.

**Interfaces:**
- Consumes: Task 1–5.
- Produces:
  - `export function createOfficeServer({ dataDir, publicDir, layout, projectDir, port = 4848, now = Date.now }): Promise<{ server, close(): Promise<void> }>` — bind `127.0.0.1`; `hooksOn` = `hasOfficeHooks(readSettings(<projectDir>/.claude/settings.local.json), url theo port)`. Chạy `node server.js` trực tiếp: đọc `OFFICE_PORT`, `OFFICE_PROJECT` từ env. Routes:
    - `POST /hook` → luôn trả `200 {}` (JSON hỏng/`summarize` null cũng 200, `console.warn`); event hợp lệ → `eventlog.append`, `reduce`, gửi SSE `event: event` data = OfficeEvent.
    - `GET /events` → SSE; ping `: ping` mỗi 15 s; khi `tick` đổi state (setInterval 1 s) gửi `event: state`.
    - `GET /api/state` → `{ state, layout, hooksOn: boolean }`.
    - `GET /*` → file tĩnh trong `publicDir` (chặn `..`), MIME cho html/js/css/json/png.
    - Khởi động: dựng state bằng `readTail(2000)` reduce lần lượt rồi `tick(now())`.
  - `cli.js`: `node cli.js <on|off|status|demo> [--project <path>]`, mặc định project `E:\UnityProject`.
    - `on`: kiểm tra cổng trống (thử `net.createServer().listen(4848,'127.0.0.1')`) → bận thì in `Cổng 4848 đang bị chiếm — chưa bật hook.`, exit 1, **không** ghi settings; trống → `addOfficeHooks` + ghi settings, spawn `node server.js` detached (`windowsHide: true`), lưu `data/server.pid`, mở trình duyệt (`cmd /c start "" http://127.0.0.1:4848`), in 3 dòng ✓ + dòng ⚠ theo kết quả Task 12.
    - `off`: `removeOfficeHooks` + ghi settings; kill PID (bỏ qua nếu đã chết); in ✓.
    - `status`: `Hook: BẬT|TẮT · Server: đang chạy|tắt · Sự kiện đã nhận: N`.
    - `demo`: khởi server nếu chưa chạy, mở trình duyệt, POST lần lượt các event trong `demo/scenario.json` theo trường `delayMs`.
  - `office.cmd`: `@node "%~dp0cli.js" %*`.
  - `.claude/commands/office.md`: frontmatter `description: Bật/tắt văn phòng pixel theo dõi subagent (on|off|status|demo)`, `argument-hint: on|off|status|demo`; thân: chạy `node "E:\UnityProject\tools\pixel-office\cli.js" $ARGUMENTS` bằng Bash, báo lại output bằng tiếng Việt, nhắc rằng `on` giữa phiên có thể chỉ hiệu lực từ phiên sau.
  - `demo/scenario.json`: ~60 event, đủ 9 agent; có ≥1 `PostToolUseFailure`, ≥1 Notification waiting, 2 instance `unity-gameplay-programmer` song song, 1 agent lạ `art-helper`, tất cả kết thúc bằng `SubagentStop`; tổng ~90 s.

- [ ] **Step 1: Test thất bại** (`server.test.js`, port ngẫu nhiên `0` → đọc `server.address().port`): POST fixture `SubagentStart` → `/api/state` có agent `working`; POST `"{hỏng"` → 200; mở SSE bằng `fetch` stream, POST 1 event → nhận được dòng `event: event`; `GET /../package.json` → 404; khởi động lại với cùng `dataDir` → state khôi phục. (`cli.test.js`) **Review Focus 5:** chiếm cổng bằng `net.createServer` trên một port, chạy `on` với env `OFFICE_PORT` = port đó và `--project` thư mục tạm → exit 1, settings không tồn tại/không đổi. (`OFFICE_PORT` ghi đè 4848 chỉ để test; CLI truyền `url = http://127.0.0.1:<port>/hook` vào các hàm Task 5.)
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `node --test` → toàn bộ PASS.
- [ ] **Step 5:** Thủ công: `office on --project <tmp>` → `<tmp>\.claude\settings.local.json` có 7 hook; `office status` → BẬT/đang chạy; `office off` → file trở về `{}`, server tắt.
- [ ] **Step 6:** Hỏi người dùng thêm `E:\UnityProject\tools\pixel-office` vào PATH người dùng (`[Environment]::SetEnvironmentVariable('Path', ..., 'User')`).
- [ ] **Step 7:** Commit `feat: office server, cli and /office command`.

### Task 7: Chọn MCP vẽ pixel (spike)

**Files:** Create `docs/mcp-choice.md` (kết quả), `public/art/palette.json`.

- [ ] **Step 1:** Đọc README của `pixel-mcp` (github.com/adrianoamaral/pixel-mcp) và `pixelart-mcp`; ghi lại: lệnh chạy, tên package, có xuất PNG ra đĩa không, có chọn màu hex chính xác không, cần runtime gì. Loại bỏ bất kỳ công cụ nào gọi model tạo ảnh.
- [ ] **Step 2:** Hỏi người dùng cho phép thêm MCP vào project: `claude mcp add --scope project pixel -- <lệnh chạy>`. Người dùng mở lại phiên Claude để có tool MCP.
- [ ] **Step 3:** Vẽ thử `public/art/_probe.png` 16×16: ô bàn cờ 2 màu `#c8743c` / `#e09a5a`. Kiểm tra bằng Node: `PNG width/height === 16` (đọc 8 byte chữ ký + IHDR), và mở trong trình duyệt phóng ×16 thấy cạnh sắc, đúng 2 màu. Không đạt → thử công cụ dự phòng; cả hai không đạt → **dừng, báo người dùng**.
- [ ] **Step 4:** Viết `palette.json` ~24 màu có tên (`floor`, `floorDark`, `wall`, `wallTrim`, `wood`, `woodDark`, `screenOff`, `screenOn`, `screenErr`, `plant`, `skin`, `outline`, …) và khối `keys`: `{ "shirt": ["#ff00ff","#b000b0"], "hair": ["#00ffff","#00a0a0"] }` (màu khoá sẽ được thay lúc chạy) và `shirts`/`hairs`: tên → cặp màu thật cho §7.5.
- [ ] **Step 5:** Ghi `docs/mcp-choice.md`, xoá `_probe.png`, commit `docs: choose pixel mcp`.

### Task 8: Vẽ asset bằng MCP + `art-preview.html`

**Files:** Create `public/art/*.png`, `public/art/manifest.json`, `public/art-preview.html`.

**Interfaces:**
- Produces `manifest.json`: `{ "<name>": { "file": "x.png", "w": number, "h": number, "frames": number, "anchor": [x,y] } }` — frame xếp ngang trong một PNG.
- Tên bắt buộc (frontend dùng đúng tên này): `floor`, `floor2`, `wall`, `wallTrim`, `door` (32×32), `desk` (32×16), `deskBoss` (48×16), `chair`, `monitor` (16×16, 3 frame: off/on/err), `pc`, `keyboard`, `bookshelf` (32×32), `cooler` (16×32), `plant` (16×32), `clock`, `painting` (32×16), `whiteboard` (32×16), `bin`, `mug`, `char` (16×24, 8 frame theo thứ tự cố định `[down, up, walkDown1, walkDown2, walkSide1, walkSide2, type1, type2]`; đi sang trái = lật ngang `walkSide*`; `type*` nhìn từ sau), `acc_tie`, `acc_cap`, `acc_glasses`, `acc_headset`, `acc_bow`, `acc_beanie`, `acc_helmet`, `acc_scarf` (8×8), `lamp` (6×6, 5 frame: green/yellow/red/grey/check), `bubble` (9×9 9-slice), `badge` (8×8).
- `char` dùng màu khoá `keys.shirt`/`keys.hair` ở vùng áo/tóc.

- [ ] **Step 1:** Vẽ từng sprite bằng MCP, chỉ dùng màu trong `palette.json`; phong cách theo ảnh tham chiếu 2 (viền tối, đổ bóng 1 tông, sàn gạch cam có mạch).
- [ ] **Step 2:** Viết `manifest.json`; script kiểm tra nhanh (test `test/art.test.js`): mọi file trong manifest tồn tại, kích thước PNG (IHDR) = `w*frames` × `h`.
- [ ] **Step 3:** `art-preview.html`: lưới mọi sprite + mọi frame phóng ×6 trên nền `floor`, kèm 9 nhân vật đã đổi màu (dùng `recolor` của Task 9 — nếu làm Task 8 trước thì preview đổi màu thêm sau Task 9).
- [ ] **Step 4:** Mở preview trong trình duyệt tích hợp, chụp màn hình gửi người dùng **duyệt** trước khi sang Task 10. Sửa theo góp ý.
- [ ] **Step 5:** `node --test` PASS; commit `art: pixel sprites drawn via MCP`.

### Task 9: `path.js` + `actors.js` — đi lại, animation, đổi màu

**Files:** Create `public/js/path.js`, `public/js/actors.js`, `test/path.test.js`, `test/actors.test.js`.

**Interfaces:**
- Produces:
  - `path.js`: `export function buildGrid(layout): boolean[][]` (true = đi được; hai hàng tường y=0..1 chặn toàn bộ, cửa chỉ để trang trí; ô bàn và ô props chặn; ô `seat` đi được; nhân vật xuất hiện lần đầu ở (9,2) trước cửa), `export function findPath(grid, from:[x,y], to:[x,y]): Array<[x,y]> | null` (BFS 4 hướng, bao gồm điểm đầu và cuối).
  - `actors.js` (không chạm DOM khi import):
    - `export function recolor(rgba: Uint8ClampedArray, map: Record<string,string>): Uint8ClampedArray` — thay pixel trùng màu khoá hex.
    - `export class Actor { constructor(view: AgentView, layout, grid); sync(view: AgentView, now): void; update(dtMs: number, rand = Math.random): void; get frame(): number; get px(): {x,y} }` — tốc độ đi 2 ô/giây; `working|waiting|error` → đi tới `seat` rồi ngồi (frame `type1/type2` luân phiên 4 lần/giây khi `working`, đứng yên `type1` khi `waiting|error`); `idle|done` → chọn điểm `wander` ngẫu nhiên, đứng 3–8 s rồi đi tiếp; `desk -1` → đứng ở `guest`.
- [ ] **Step 1: Test thất bại**: `findPath` từ cửa (9,2) tới seat (15,5) không đi qua ô bị chặn và độ dài = BFS ngắn nhất; tới ô bị bao kín → `null`. `recolor` thay đúng `#ff00ff` → `#c03030`, giữ nguyên alpha và pixel khác. `Actor` `idle` → `sync(working)` → sau đủ `update` tới khi `px` = seat và `frame ∈ {type1,type2}`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat: actor movement and recolor`.

### Task 10: Vẽ phòng + overlay + panel + SSE (frontend hoàn chỉnh)

**Files:** Create `public/index.html`, `public/style.css`, `public/js/main.js`, `public/js/room.js`, `public/js/overlay.js`, `public/js/panel.js`.

**Interfaces:**
- Consumes: `/api/state`, SSE `/events` (Task 6); manifest (Task 8); `Actor`, `buildGrid`, `recolor` (Task 9).
- Produces (nội bộ frontend):
  - `room.js`: `export function drawStatic(ctx, layout, sprites)` (vẽ một lần vào canvas offscreen 320×180), `export function drawDynamic(ctx, layout, sprites, state, t)` (màn hình theo status của agent ngồi bàn đó; bảng trắng ghi `xong/tổng` từ `totals`).
  - `overlay.js`: `export function drawOverlay(ctx, scale, actors, state)` — vẽ ở độ phân giải hiển thị: đèn trạng thái, huy hiệu `toolCount`, `×N` khi `instances>1`, bong bóng (tự xuống dòng ≤ 2 dòng, font `12px "Segoe UI", sans-serif` đậm, khung từ sprite `bubble` 9-slice phóng theo `scale`). Bong bóng chỉ hiện với `working|waiting|error|done` và tắt sau 8 s không đổi.
  - `panel.js`: `export function renderTopBar(el, { hooksOn, connected, totals, working })`, `export function openPanel(el, agent: AgentView, now)`, `export function closePanel(el)`.
  - `main.js`: tải `/api/state` → tạo sprite (đổi màu từng agent) → SSE với tự kết nối lại backoff 1,2,4,8,10 s; mỗi lần nối lại gọi lại `/api/state`; vòng `setTimeout` 1000/12 ms, bỏ qua khi `document.hidden`; scale = `Math.max(1, Math.floor(min(innerWidth/320, (innerHeight-topbar)/180)))`; canvas thế giới CSS `image-rendering: pixelated`; click → hit-test theo khung 16×24 của actor → `openPanel`; Esc / click ngoài → `closePanel`.
  - Sprite thiếu → ô màu `#ff00ff` + `console.warn`, trang không sập.
- [ ] **Step 1:** Implement các file.
- [ ] **Step 2:** `office demo` → mở trong trình duyệt tích hợp; chụp màn hình ở các mốc: đầu (mọi người lang thang), giữa (đa số đang gõ, 1 đỏ, 1 vàng, lập trình ×2, `art-helper` ở bàn dự phòng), cuối (✓, bảng trắng `9/9`… theo scenario). Click 1 nhân vật → panel có log và báo cáo cuối.
- [ ] **Step 3:** Ẩn tab 10 s rồi hiện lại → không lỗi console, trạng thái đúng. Tắt server rồi bật lại → thanh trên báo mất kết nối rồi tự nối lại.
- [ ] **Step 4:** Gửi ảnh chụp cho người dùng xem. Commit `feat: pixel office frontend`.

### Task 11: Kiểm chứng với Claude Code thật (spec §12) và hoàn thiện thông báo

**Files:** Modify `cli.js` (dòng ⚠ của `on`), `lib/summarize.js` (nếu payload Notification thật khác), `lib/state.js` (nếu luồng chính có `agent_type`), `E:\UnityProject\.claude\commands\office.md`; Create `README.md` (cách dùng tiếng Việt, ngắn).

- [ ] **Step 1 (§12.1):** Mở một phiên `claude` trong `E:\UnityProject`, sau đó `office on` từ terminal khác; trong phiên đó cho chạy một subagent nhỏ (vd. `Explore` đọc `CLAUDE.md`). Có sự kiện tới văn phòng không? Ghi kết quả; cập nhật dòng ⚠ của `on` và câu nhắc trong `/office` cho đúng.
- [ ] **Step 2 (§12.2):** `office off` server nhưng giữ hook (dừng PID thủ công) → chạy 1 tool trong Claude: xác nhận Claude không bị chặn và không hiện lỗi gây phiền. Nếu có hiện → thêm hướng dẫn trong README.
- [ ] **Step 3 (§12.3):** Gây một yêu cầu duyệt quyền trong subagent; đọc dòng Notification trong `data/events.jsonl` (chạy tạm với log payload thô bật bằng env `OFFICE_DEBUG=1` — thêm vào server, ghi `data/raw.jsonl`, mặc định tắt) → chỉnh điều kiện `waiting` trong `summarize` + thêm fixture thật vào test.
- [ ] **Step 4 (§12.4):** `claude --agent unity-game-director` → xem luồng chính có `agent_type`; `keyFor` đã gộp về `__main__` — xác nhận bằng log.
- [ ] **Step 5:** `office off` → so sánh `settings.local.json` với bản trước khi `on` (giống hệt). `node --test` toàn bộ PASS.
- [ ] **Step 6:** README + commit `chore: verify against real claude code`.

---

## Thứ tự & phụ thuộc

Task 0 → 1 → 2 → 3 → 4 → 5 → 6 (backend dùng được với demo) · Task 7 → 8 (asset, cần người dùng mở lại phiên sau khi thêm MCP) · Task 9 → 10 (cần 3, 6, 8) · Task 11 cuối cùng. Task 7–8 độc lập với 1–6 nên có thể làm song song.
