# Character Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay toàn bộ nhân vật Pixel Office bằng 10 nhân vật mới (9 agent + khách), mỗi người vẽ concept vector trong Inkscape rồi chuyển sang 2 sheet pixel 32×64 / 64×64 bằng pixelart-mcp.

**Architecture:** Engine giữ nguyên: nó đã nạp sheet riêng `char_<kit>` / `sit_<kit>` theo `manifest.json` và rơi về `char` / `sit` cho agent không có `kit`. Việc của plan là (1) cài công cụ, (2) đổi test hợp đồng nghệ thuật và dọn code đổi màu, (3) sản xuất nghệ thuật theo lô với điểm duyệt của người dùng. Mỗi tờ concept có bố cục toạ độ cố định nên một script xuất "bản nền" pixel đúng kích thước.

**Tech Stack:** Inkscape 1.x + inksmcp (MCP, vector), pixelart-mcp (MCP, pixel), Node 24 (`node:test`), JS thuần ở frontend.

**Spec:** `docs/superpowers/specs/2026-10-26-character-redesign-design.md`

## Global Constraints

- Tuyệt đối không dùng model tạo ảnh hay thư viện asset; concept chỉ bằng tool inksmcp, pixel chỉ bằng tool pixelart-mcp. Công cụ không chạy → dừng, hỏi người dùng.
- Cài đặt trên ổ E: Inkscape ở `E:\Dev\inkscape`; uv `E:\Dev\uv\uv.exe` (biến `UV_*` đã trỏ ra E). Node: `E:\Dev\nodejs`.
- Plan chạy trong một phiên Claude mở tại `E:\UnityProject\tools\pixel-office` (MCP đăng ký scope local cho thư mục này). Branch `feat/characters-v4`.
- Nhân viên văn phòng hiện đại; chỉ học nguyên tắc của Dead Cells / Blasphemous / Hades, không sao chép nhân vật, trang phục, biểu tượng.
- Không chữ hay logo trên quần áo (engine lật ngang khi đi sang trái).
- Tỉ lệ (spec §5.1): đầu 12 px; toàn thân 58–60 px; gót ở hàng 60; hàng 61–63 của `char_*` trống.
- Màu: chỉ màu trong `public/art/palette.json`, alpha 0 hoặc 255; ≤ 16 màu mỗi nhân vật (gộp cả 2 sheet).
- Sheet (spec §7): `char_<kit>` 32×64 × 9 khung, anchor `[0, 32]`; `sit_<kit>` 64×64 × 8 khung, anchor `[16, 32]`. Khách: `char` / `sit` cùng kích thước.
- Thứ tự khung `char`: `idle1, idle2, walk1, walk2, walk3, walk4, back, walkBack1, walkBack2`; `sit`: `type1, type2, type3, type4, wait1, wait2, error1, error2`.
- `kit` của 9 agent (theo `public/layout.json`): `boss, design, architect, setup, code, scene, qa, review, build`.
- Bố cục tờ concept (đơn vị SVG, lưới 8:1), kích thước trang 1024×768:
  - `stand` (3/4 trước): vùng `0,0 → 256,512`
  - `back` (3/4 sau): vùng `256,0 → 512,512`
  - `sit` (ngồi ở bàn, nhìn sau, có ghế): vùng `512,0 → 1024,512`
  - mặt phóng to: `0,512 → 256,768`; bảng màu: `256,512 → 1024,768`
- Điểm duyệt của người dùng (dừng chờ): style guide (Task 3), concept + sheet thí điểm Trưởng phòng (Task 4, 5), concept mỗi lô (Task 6–8).
- Test: `node --test` trong `E:\UnityProject\tools\pixel-office`.

## Review Focus

1. **Đầu giật khi gõ phím** — `type1..type4` chỉ được đổi tay: hàng trên cùng có pixel phải bằng nhau ở cả 4 khung. Test ở Task 2 (`seated typing keeps the head still`).
2. **Nhân vật nhún lên xuống khi đứng thở** — `idle1`/`idle2` khác nhau ≤ 1 px ở hàng trên cùng và cùng hàng gót 60. Test ở Task 2 (`breathing moves at most 1 px`).
3. **Chân lơ lửng khi đi** — mọi khung `walk*` / `walkBack*` có hàng thấp nhất trong 58–60. Test ở Task 2 (`walking frames keep feet on the ground`).
4. **Agent lạ hiện ô màu thay thế** vì thiếu sheet khách — test hoàn tất ở Task 9 đòi `char` và `sit` tồn tại.
5. **Nhảy hình khi ngồi xuống** — ghế trong `sit_*` lệch so với chỗ ghế bàn được vẽ: kiểm bằng ảnh chụp `office demo` ở Task 5 (thí điểm) trước khi làm hàng loạt; ghi ruling nếu phải dời anchor.

---

## File Structure

```
art-src/
  style-guide.svg/.png            Task 3
  concepts/<kit>.svg/.png         Task 4, 6–8 (khách: guest.svg)
  bases/<kit>/{stand,back,sit}.png    (script xuất, không commit — .gitignore)
  pixel/<kit>/*.png               canvas làm việc pixelart-mcp (commit)
  export-bases.mjs                Task 2
public/art/
  char_<kit>.png, sit_<kit>.png, char.png, sit.png   Task 5–9
  manifest.json, palette.json     cập nhật dần
public/art-preview.html           Task 2 (khung), dùng lại đến cuối
public/js/sprites.js, actors.js   Task 2 (dọn đổi màu)
test/png.js                       Task 2 (tách từ art.test.js)
test/art.test.js                  Task 2 (sửa hợp đồng), Task 9 (test hoàn tất)
test/characters.test.js           Task 2
test/export-bases.test.js         Task 2
docs/mcp-choice.md                Task 1
```

---

### Task 0: Workspace

- [ ] **Step 1:** Xác nhận đang ở `feat/characters-v4`, cây làm việc sạch; tạo ledger `.superpowers/sdd/2026-10-26-character-redesign/progress.md` (script `sdd-workspace`).
- [ ] **Step 2:** Thêm `art-src/bases/` vào `.gitignore`. Commit `chore: workspace for character redesign`.

### Task 1: Inkscape + inksmcp

**Files:** Modify `docs/mcp-choice.md`.

- [ ] **Step 1:** **Hỏi người dùng** rồi chạy `winget install --id Inkscape.Inkscape -e --location "E:\Dev\inkscape"`. Kiểm: `E:\Dev\inkscape\bin\inkscape.exe --version` → `Inkscape 1.x`. Có gì ghi ra ổ C (ví dụ cache) → báo người dùng.
- [ ] **Step 2:** Tải mã nguồn inksmcp vào thư mục riêng `E:\Dev\mcp\inksmcp` (`git clone --depth 1 https://github.com/bhanutpt/inksmcp`), grep import mạng/AI (`requests|urllib|httpx|aiohttp|socket|openai|anthropic|diffusion`) và lệnh chạy ngoài ngoài Inkscape. Có → dừng, báo người dùng.
- [ ] **Step 3:** `uv sync` trong `E:\Dev\mcp\inksmcp` (Python ≥ 3.12). Đăng ký: `claude mcp add inkscape --scope local -e UV_CACHE_DIR=E:\Dev\uv\cache -e UV_PYTHON_INSTALL_DIR=E:\Dev\uv\python -- E:\Dev\uv\uv.exe --directory E:\Dev\mcp\inksmcp run inksmcp` (nếu inksmcp cần đường dẫn Inkscape, thêm `-e` theo README, trỏ `E:\Dev\inkscape\bin\inkscape.exe`). `claude mcp get inkscape` → `Connected`.
- [ ] **Step 4:** Kiểm CLI xuất PNG đúng vùng và kích thước, không khử răng cưa: tạo SVG thử 256×512 có một hình chữ nhật, chạy `inkscape.exe test.svg --export-type=png --export-area=0:0:256:512 --export-width=32 --export-height=64 --export-png-antialias=0 -o out.png`; đọc IHDR = 32×64. Ghi lại cờ thật sự dùng được.
- [ ] **Step 5:** Ghi `docs/mcp-choice.md` mục "inksmcp": nguồn, kết quả kiểm mã, lệnh đăng ký, danh sách tool (sau khi phiên mới nạp), cờ xuất. Commit `docs: add inksmcp`. **Mở phiên mới** nếu tool `inkscape` chưa có trong phiên.

### Task 2: Hợp đồng nghệ thuật mới + dọn code đổi màu + script bản nền

**Files:**
- Create: `test/png.js`, `test/characters.test.js`, `test/export-bases.test.js`, `art-src/export-bases.mjs`
- Modify: `test/art.test.js`, `test/actors.test.js`, `public/js/sprites.js`, `public/js/actors.js`, `public/art-preview.html`, `public/layout.json`, `public/art/palette.json`

**Interfaces:**
- Produces (`test/png.js`): `readPng(fileUrl) → { w, h, rgba: Uint8Array }` (RGBA 8-bit, giải mã như `readPng`+`pixels` hiện có); `frameMask(png, frame, fw, fh) → Uint8Array` (1 = alpha 255); `rowsWithPixels(mask, fw, fh) → { top, bottom }` (`-1` nếu trống); `iou(a, b) → number`; `colorsOf(png) → Set<'#rrggbb'>`.
- Produces (`art-src/export-bases.mjs`): `export const AREAS = { stand: [0,0,256,512,32,64], back: [256,0,512,512,32,64], sit: [512,0,1024,512,64,64] }`; `export function inkscapeArgs(svg, view, out) → string[]`; CLI `node art-src/export-bases.mjs <kit>` đọc `art-src/concepts/<kit>.svg`, ghi `art-src/bases/<kit>/{stand,back,sit}.png`, đường dẫn Inkscape từ env `INKSCAPE` (mặc định `E:\Dev\inkscape\bin\inkscape.exe`).
- Produces (`test/characters.test.js`): kiểm mọi sheet nhân vật **đang có trong manifest** (`char`, `sit`, `char_*`, `sit_*`); test hoàn tất 10 nhân vật để Task 9.

- [ ] **Step 1: Test thất bại**
  - `export-bases.test.js`: `inkscapeArgs('a.svg','sit','o.png')` chứa `--export-area=512:0:1024:512`, `--export-width=64`, `--export-height=64`, `--export-png-antialias=0`, `-o`, `o.png`; view lạ → throw.
  - `characters.test.js` chạy trên: các sheet nhân vật trong `public/art/manifest.json` **không trong suốt hoàn toàn**, cộng một cặp fixture `test/fixtures/char_fixture.png` / `sit_fixture.png` khai báo trong `test/fixtures/manifest.json` (vẽ bằng pixelart-mcp: hình người đơn giản thoả mọi luật bên dưới, dùng màu palette) để test không bao giờ rỗng:
    - `char sheets are 32×64 × 9, anchor [0,32]; sit sheets 64×64 × 8, anchor [16,32]`
    - `character feet sit on row 60 and rows 61+ stay empty` — `idle1`: `bottom === 60`, `bottom - top + 1` trong 58–60; mọi khung char: không pixel ở hàng ≥ 61
    - `breathing moves at most 1 px` — `|top(idle1) − top(idle2)| ≤ 1`, `bottom` bằng nhau
    - `walking frames keep feet on the ground` — `walk1..4`, `walkBack1..2`: `bottom` trong 58–60
    - `seated typing keeps the head still` — `top` bằng nhau ở `type1..type4`
    - `each character uses at most 16 palette colors` — gộp `char_<k>` + `sit_<k>`
    - `idle silhouettes differ: IoU < 0.85 for every pair` (bỏ qua khi < 2 nhân vật)
  - `art.test.js`: bỏ `acc_*` khỏi `REQUIRED`, bỏ test `char uses the shirt, hair and pants key colors`, bỏ test palette `pants keys`; `REQUIRED.char = [32, 64, 9]`, thêm `sit: [64, 64, 8]`; `SHEET_SIZE.char = [32, 64, 9, [0, 32]]`, `SHEET_SIZE.sit = [64, 64, 8, [16, 32]]`; `OWN_SHEETS` = mọi `char_*`/`sit_*` có trong manifest.
  - `actors.test.js`: bỏ test `recolor …` và `agentColorMap …`.
- [ ] **Step 2:** `node --test` → FAIL (thiếu `test/png.js`, `export-bases.mjs`; art test đỏ vì `char` còn 8 khung và `acc_*` còn trong manifest).
- [ ] **Step 3: Implement**
  - `test/png.js` (tách từ `art.test.js`), `art-src/export-bases.mjs`.
  - `sprites.js`: `addAgentSprite` chỉ gán `sprites.images[\`${base}:${key}\`] = sprites.images[ownSheet(...)]`; xoá import `recolor`, `agentColorMap`. `actors.js`: xoá `recolor`, `agentColorMap`, `accFrame` nếu còn.
  - `palette.json`: xoá `keys`, `shirts`, `hairs`, `pants`. `layout.json`: xoá `shirt`, `hair`, `pants`, `acc` khỏi agent; fallback trong `main.js` thành `{}`.
  - `manifest.json` + `public/art/`: xoá `acc_*`, `char_boss`, `sit_boss`, `char_qa`, `char_build`; `char` / `sit` tạm thời trỏ tới hai sheet trong suốt đúng kích thước (`char.png` 288×64, `sit.png` 512×64, tạo bằng `pixel_create_canvas` + `pixel_export_png`) để engine và test hợp đồng chạy cho đến Task 9.
  - `art-preview.html`: một hàng mỗi nhân vật có trong manifest — mọi khung `char` + `sit` phóng ×4, thêm hàng silhouette đen của `idle1`; bỏ phần đổi màu.
- [ ] **Step 4:** `node --test` → toàn bộ PASS. Mở `office demo` (`OFFICE_NO_BROWSER=1`) trong trình duyệt tích hợp: trang chạy, không lỗi console (nhân vật chưa hiện vì sheet trong suốt).
- [ ] **Step 5:** Xoá tài liệu cũ: `docs/superpowers/specs/2026-10-26-hibit-characters-design.md`, `docs/superpowers/plans/2026-10-26-hibit-characters.md`, 5 file `docs/research/2026-10-26-*.md`. Commit `refactor: drop old character art and recoloring; new character art contract`.

### Task 3: Style guide → **người dùng duyệt**

**Files:** Create `art-src/style-guide.svg`, `art-src/style-guide.png`; Modify `public/art/palette.json`.

- [ ] **Step 1:** Bằng tool inksmcp, vẽ trang 1024×768 gồm:
  - thước tỉ lệ ở lưới 8:1 (1 px = 8 đơn vị): khung 256×512 với vạch đỉnh đầu y 16, cằm 104, vai 128, eo 232, đáy hông 280, gối 376, gót 480 (= hàng pixel 2, 13, 16, 29, 35, 47, 60);
  - cách dựng mặt 3/4 trên lưới 8×8 pixel (mắt 1×2, lông mày, 1 px bóng mũi, miệng, bóng tóc);
  - ramp mẫu 4 tông cho 3 sắc da, 2 màu tóc, vải, kim loại; ví dụ selective outline và rim light 1 px;
  - hàng 10 silhouette đen (dáng + khối tóc/mũ + đồ nghề theo spec §6) ở đúng tỉ lệ.
- [ ] **Step 2:** Thêm các ramp đã chọn vào `palette.json` (tên dạng `skinLight1..4`, `skinMid1..4`, `skinDeep1..4`, …). `node --test` PASS.
- [ ] **Step 3:** Xuất `style-guide.png` (tool inksmcp hoặc Inkscape CLI), gửi người dùng **duyệt**. Sửa theo góp ý. Commit `art: style guide`.

### Task 4: Concept Trưởng phòng (thí điểm) → **người dùng duyệt**

**Files:** Create `art-src/concepts/boss.svg`, `art-src/concepts/boss.png`.

- [ ] **Step 1:** Vẽ bằng inksmcp theo bố cục trong Global Constraints và spec §5–§6: dáng vuông, cao vai rộng, tóc vuốt ngược, blazer, cà vạt, xắn tay áo, cốc cà phê lớn; ngồi nhìn từ sau trên ghế văn phòng; mặt phóng to; bảng màu ≤ 16 màu đều có trong palette.
- [ ] **Step 2:** Đối chiếu bằng `render_preview`: gót đúng y 480 trong vùng `stand`/`back`; silhouette khác các silhouette còn lại trên style guide.
- [ ] **Step 3:** Xuất `boss.png`, gửi người dùng **duyệt**. Commit `art: boss concept`.

### Task 5: Sheet pixel Trưởng phòng (thí điểm) → **người dùng duyệt**

**Files:** Create `art-src/pixel/boss/*.png`, `public/art/char_boss.png`, `public/art/sit_boss.png`; Modify `public/art/manifest.json`.

- [ ] **Step 1:** `node art-src/export-bases.mjs boss` → 3 bản nền.
- [ ] **Step 2:** Với từng bản nền: `pixel_apply_palette` (chỉ màu của boss), rồi sửa tay thành **khung chuẩn** `idle1` (từ `stand`), `back`, `type1` (từ `sit`) theo spec §5.4–§5.6; kiểm bằng `pixel_view_canvas` / `pixel_ascii_view`.
- [ ] **Step 3:** Khung phái sinh bằng `pixel_duplicate_canvas` + `pixel_draw_pixels` / `pixel_copy_region` / `pixel_shift_canvas`, soát bằng `pixel_onion_view`:
  - `idle2`: thân trên hạ 1 px (hàng ≥ vai), đầu giữ hoặc hạ 1 px
  - `walk1..4`: chu kỳ chân trái bước / qua / chân phải bước / qua; tay ngược chân
  - `walkBack1..2`: chân trái / phải từ `back`
  - `type2..4`: chỉ tay; `wait1..2`: tay rời phím, đầu ngẩng 0–1 px; `error1..2`: tay lên đầu, người ngả
- [ ] **Step 4:** `pixel_export_spritesheet` → `char_boss.png` (9 khung), `sit_boss.png` (8 khung); thêm mục manifest `{ "file", "w", "h", "frames", "anchor" }` theo Global Constraints. `node --test` PASS.
- [ ] **Step 5:** `office demo` trong trình duyệt tích hợp, chụp: Trưởng phòng đứng, đi, ngồi gõ, chờ, lỗi; kiểm Review Focus 5 (ghế không nhảy khi ngồi xuống). Gửi ảnh + `art-preview.html` cho người dùng **duyệt**. Sửa theo góp ý (ghi ruling nếu đổi anchor). Commit `art: boss sheets (pilot)`.

### Task 6–8: Ba lô nhân vật

| Task | Lô (`kit`) |
|---|---|
| 6 | `design`, `architect`, `setup` |
| 7 | `code`, `scene`, `qa` |
| 8 | `review`, `build`, khách (`guest.svg` → `char.png`, `sit.png`) |

**Files mỗi lô:** `art-src/concepts/<kit>.svg/.png`, `art-src/pixel/<kit>/*.png`, `public/art/char_<kit>.png`, `public/art/sit_<kit>.png` (khách: `char.png`, `sit.png`), `manifest.json`, `palette.json` (màu mới nếu cần).

- [ ] **Step 1:** Vẽ 3 concept như Task 4 Step 1–2, theo hàng tương ứng trong spec §6; dùng lại thước và quy tắc đã duyệt.
- [ ] **Step 2:** Xuất 3 PNG, gửi người dùng **duyệt cả lô**. Commit `art: concepts batch N`.
- [ ] **Step 3:** Làm pixel cho từng nhân vật như Task 5 Step 1–4.
- [ ] **Step 4:** `node --test` PASS (gồm IoU silhouette với mọi nhân vật đã có). `art-preview.html` chụp gửi người dùng. Commit `art: sheets batch N`.

### Task 9: Hoàn tất và review

**Files:** Modify `test/characters.test.js`, `docs/superpowers/specs/2026-10-26-character-redesign-design.md` (trạng thái).

- [ ] **Step 1: Test thất bại trước khi kiểm:** thêm `all 10 characters are present` — với mỗi `kit` trong `layout.json` có `char_<kit>` và `sit_<kit>`; có `char` và `sit` không trong suốt hoàn toàn (khách). Chạy trên một bản manifest tạm thiếu `char_review` → FAIL, khôi phục → PASS.
- [ ] **Step 2:** Bỏ fixture `test/fixtures/char_fixture.png`/`sit_fixture.png` khỏi test nếu đã đủ 10 nhân vật thật. `node --test` → toàn bộ PASS.
- [ ] **Step 3:** `office demo`: chụp đầu / giữa / cuối, gồm agent lạ `art-helper` dùng sheet khách. Gửi người dùng.
- [ ] **Step 4:** Review cuối toàn branch bằng reviewer trên model mạnh nhất (gói `review-package`, merge base = `12450eb^`), kèm Review Focus ở trên; sửa Critical/Important theo TDD. Ghi ruling và minor vào ledger. Không merge, không push nếu người dùng chưa đồng ý.
