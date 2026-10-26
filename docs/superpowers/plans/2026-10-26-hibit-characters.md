# Nhân vật Hi-Bit 64×64 (bản thử Trưởng phòng): kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay toàn bộ nhân vật cũ bằng sheet 64×64 góc 3/4: đứng/đi (9 khung) và ngồi ở bàn có ghế (8 khung). Vẽ lại bàn và ghế. Bản thử gồm Trưởng phòng và một cặp sheet chung.

**Architecture:**
- `Actor.sprite` quyết định sheet (`char` hoặc `sit`), khung và lật ngang.
- `sprites.js` dựng `char:<key>` và `sit:<key>` từ sheet riêng hoặc sheet chung đã đổi màu, và trả lời câu hỏi "pixel này có màu không" cho việc bấm chọn.
- `room.js` vẽ người theo `actor.sprite` và ẩn ghế rời ở bàn đang có người ngồi.
- Art vẽ hoàn toàn bằng MCP pixelart.

**Tech Stack:**
- Node 24 (`E:\Dev\nodejs`), ESM, không có dependency.
- Test: `node --test`.
- Canvas 2D.
- MCP pixelart cho art.

**Spec:** `docs/superpowers/specs/2026-10-26-hibit-characters-design.md`

## Global Constraints

- **Vẽ art:** chỉ bằng MCP pixelart. Không model tạo ảnh, không script vẽ tự viết (Pillow, canvas...).
- **Phần mềm:** mọi cài đặt phải nằm trên ổ E. Không chi phí.
- **Git:** không push, không merge vào `main` khi chưa được đồng ý.
- **Kích thước sprite:**
  - `char*`: 64×64, 9 khung, anchor [16, 32].
  - `sit*`: 64×64, 8 khung, anchor [16, 32].
  - `desk` 64×32, `deskBoss` 96×32, `chair` 32×32, `chairBoss` 32×32.
- **Màu:** mọi pixel đục hoàn toàn hoặc trong suốt hoàn toàn, và chỉ dùng màu trong `palette.json` (`colors` + `keys`).
- **Sheet đứng/đi:** chân ở hàng 58–60; hàng 61–63 trống.
- **Sheet ngồi:**
  - đỉnh đầu không cao hơn hàng 20;
  - hai tay nằm trong vùng bàn phím, hàng 8–24 và cột 16–47;
  - chân ghế chạm hàng 60.
- **Thời lượng khung:**
  - thở: 600ms rồi 400ms;
  - đi: 150ms;
  - gõ phím: 180ms;
  - chờ: 500ms;
  - lỗi: 300ms.
- **Phong cách:**
  - ánh sáng trên-trái;
  - ramp 4–5 tông có hue shift;
  - sel-out, không dùng đen thuần;
  - AA thủ công chỉ ở bên trong;
  - có AO và viền sáng;
  - `pixel_lint` ≥ 90 cho mỗi khung gốc.
- **Trả lời người dùng:** bằng tiếng Việt.
- **Chạy lệnh:**
  - Node: `export PATH="/e/Dev/nodejs:$PATH"`.
  - Server thử: `OFFICE_PORT=4849 OFFICE_DATA=<scratchpad>/data4849 node server.js`, chạy nền.
  - Phát lại demo: `node <scratchpad>/replay.mjs 4849 8`.
  - Không dùng `cli.js demo` (lệnh này mở trình duyệt của người dùng).

## Review Focus

1. **Trạng thái đổi liên tục khi đang ngồi** (`working` → `error` → `waiting` → `working`): khung ngồi luôn nằm trong 0–7 và đúng nhóm của trạng thái mới, không bị kẹt khung cũ. Test ở Task 1.
2. **Agent có `char_<kit>` nhưng thiếu `sit_<kit>`, hoặc ngược lại:** mỗi loại sheet tự rơi về sheet chung đã đổi màu, không vỡ hình. Test ở Task 2.
3. **Chưa tải được art** (thiếu manifest hoặc PNG): `actorMeta` trả hộp dự phòng, `opaqueAt` trả về true, nên vẫn bấm chọn được. Test ở Task 2.
4. **Hướng lật ngang:** đi trái rồi đi lên vẫn lật; dừng lại vẫn giữ hướng; đi xuống thì bỏ lật. Test ở Task 1.
5. **Hai người đứng sát nhau:** bấm vào pixel có màu của người phía sau chọn đúng người đó, không phải người phía trước có hộp đè lên. Test ở Task 1.

---

### Task 1: Chọn sheet, khung, lật ngang và bấm chọn theo pixel (`actors.js`)

**Files:**
- Modify: `public/js/actors.js`
- Test: `test/actors.test.js`

**Interfaces:**
- Produces:
  - `FRAMES = { idle1: 0, idle2: 1, walk1: 2, walk2: 3, walk3: 4, walk4: 5, back: 6, walkBack1: 7, walkBack2: 8 }`
  - `SIT_FRAMES = { type1: 0, type2: 1, type3: 2, type4: 3, wait1: 4, wait2: 5, error1: 6, error2: 7 }`
  - `Actor#sprite` → `{ sheet: 'char' | 'sit', frame: number, flip: boolean }`
  - `Actor#seatedAtDesk` → boolean: đã ngồi đúng ghế, `view.status` thuộc nhóm làm việc, và `layout.desks[view.desk]` tồn tại.
  - `pickActor(actors, x, y, metaFor, opaque = () => true)`. `opaque(actor, lx, ly)` nhận toạ độ trong hộp như đang thấy trên màn hình (chưa lật). Việc lật để `opaqueAt` (Task 2) xử lý.
  - Bỏ `Actor#frame`, `accFrame`, `ACC_VIEW`.

- [ ] **Step 1: Viết test hỏng.** Sửa `test/actors.test.js`:
  - Bỏ import `accFrame` và hai test `accFrame`.
  - Thay mọi `a.frame` / `FRAMES.down|up|walk*|type*` bằng `a.sprite`.
  - Thêm các test sau (`runFor` như hiện có):
    - `'a standing actor breathes: idle1 for 600ms, then idle2 for 400ms'`: actor mới với `a.idleWait = 1e9` để nó đứng yên. Đọc khung ở các mốc 0ms, 599ms, 601ms, 999ms, 1001ms. Mong đợi khung lần lượt là `idle1, idle1, idle2, idle2, idle1`, `sheet === 'char'`.
    - `'walking down cycles walk1-4 at 150ms and clears flip'`: các khung thấy được khi đi xuống là đúng `{2,3,4,5}`; `flip === false`.
    - `'walking up cycles 7,6,8,6'`: thứ tự khung là `[7, 6, 8, 6]` lặp lại, mỗi khung 150ms. Đặt `a.x`, `a.y` vào một ô đi được có ít nhất 3 ô đi được thẳng phía trên (dùng `grid` để tìm trong test), rồi `a.goTo([x, y - 3])`.
    - `'flip turns on walking left, stays when walking up or stopping, clears walking down'`: dùng `desk: 9` như test cũ để có đoạn đi trái.
    - `'working at a desk shows the sit sheet typing 0-3 at 180ms'`: sau `runFor(20000)` thì `sheet === 'sit'`, `flip === false`; 8 lần `update(180)` thấy đúng `{0,1,2,3}`.
    - `'waiting at a desk alternates wait1/wait2 at 500ms; error alternates error1/error2 at 300ms'`.
    - `'status changes while seated jump straight to the new group'`: `working` → `error` → `waiting`. Ngay sau mỗi `sync`, khung thuộc đúng nhóm mới và luôn nằm trong 0–7.
    - `'working at the guest spot stands on the char sheet'`: `desk: -1` thì `sheet === 'char'` và khung là `idle1` hoặc `idle2`.
    - `'pickActor skips transparent pixels and picks the actor behind'`: hai actor có hộp chồng nhau. Hàm `opaque` giả chỉ trả true cho người phía sau tại điểm bấm. Mong đợi chọn người phía sau. Nếu `opaque` trả false cho cả hai thì kết quả là `undefined`.
    - Sửa test `spriteBox` thành hộp 64×64, anchor [16, 32]: `spriteBox({x:64,y:96}, {w:64,h:64,anchor:[16,32]})` → `{x:48, y:64, w:64, h:64}`.

- [ ] **Step 2: Chạy test để thấy hỏng.**
  - Lệnh: `node --test test/actors.test.js`
  - Mong đợi: FAIL ở các test mới (`sprite` chưa có, `FRAMES.idle1` là undefined).

- [ ] **Step 3: Cài đặt trong `public/js/actors.js`.**
  - Hằng số: `STEP_ANIM_MS = 150`, `BREATH_MS = [600, 400]`, `SIT_ANIM = { working: [180, [0,1,2,3]], waiting: [500, [4,5]], error: [300, [6,7]] }`, `BACK_CYCLE = [7, 6, 8, 6]`.
  - Đồng hồ thở chỉ chạy khi actor đứng yên và không ngồi; reset khi bắt đầu đi.
  - Đồng hồ ngồi reset trong `sync()` khi `view.status` đổi.
  - Hướng: `dx < 0` thì lật, `dx > 0` thì bỏ lật, `dy > 0` thì bỏ lật, còn lại giữ nguyên.
  - Trong `pickActor`: tính `lx = x - box.x`, `ly = y - box.y` rồi gọi `opaque(a, lx, ly)` trong `.find`.
  - `sprites.js` đang import `accFrame`. Bỏ import đó và đoạn dán phụ kiện trong `addAgentSprite` ngay ở task này, để file vẫn nạp được; Task 2 sẽ viết lại `addAgentSprite`.

- [ ] **Step 4: Chạy test để thấy qua.**
  - Lệnh: `node --test test/actors.test.js`
  - Mong đợi: PASS.

- [ ] **Step 5: Commit** `feat(actors): 3/4 stand/walk frames, seated sheet with work animations, pixel hit test`.

---

### Task 2: Dựng sprite cho từng agent và tra pixel (`sprites.js`, `main.js`, `layout.json`)

**Files:**
- Modify: `public/js/sprites.js`, `public/js/main.js`, `public/layout.json`
- Test: `test/actors.test.js` (các test của `sprites.js` hiện nằm ở đây)

**Interfaces:**
- Consumes: `Actor#sprite` (Task 1); `agentColorMap`, `recolor`.
- Produces:
  - `ownSheet(sprites, base, cfg)` → `` `${base}_${cfg.kit}` `` nếu sprite đó đã tải được, không thì `base`. `base` là `'char'` hoặc `'sit'`.
  - `actorMeta(sprites, key, sheet, T)` → `images[`${sheet}:${key}`] ?? images[sheet] ?? { w: 2*T, h: 2*T, anchor: [T/2, T] }`.
  - `addAgentSprite(sprites, key, cfg)` tạo cả `char:<key>` và `sit:<key>`. Sheet riêng dùng nguyên; sheet chung thì đổi màu. Không dán phụ kiện.
  - `opaqueAt(sprites, name, frame, flip, lx, ly)` → boolean. Trả về true khi chưa có canvas. Đọc alpha tại `(frame*w + (flip ? w-1-lx : lx), ly)`. Lấy `getImageData` một lần cho mỗi `name` rồi giữ lại.
  - Bỏ `charMeta` và `charSheet`.

- [ ] **Step 1: Viết test hỏng** trong `test/actors.test.js`, thay hai test `charMeta`/`charSheet`:
  - `'ownSheet picks char_<kit> and sit_<kit> independently'`: có `char_boss` mà không có `sit_boss` thì cho `'char_boss'` và `'sit'`.
  - `'actorMeta falls back to the shared sheet, then to a 2×2-tile box'`: với T=32, hộp dự phòng là `{ w: 64, h: 64, anchor: [16, 32] }`.
  - `'opaqueAt reads alpha in the shown frame and mirrors when flipped; true without art'`:
    - Dựng `sprites.images.x` bằng một canvas giả: object có `getContext().getImageData()` trả về sheet 2 khung rộng 4px, cao 1px, chỉ pixel (frame 1, x 0) là đục.
    - `opaqueAt(s,'x',1,false,0,0) === true`; `opaqueAt(s,'x',1,true,3,0) === true`; `opaqueAt(s,'x',0,false,0,0) === false`.
    - `opaqueAt({images:{}},'y',0,false,0,0) === true`.

- [ ] **Step 2: Chạy test để thấy hỏng.**
  - Lệnh: `node --test test/actors.test.js`
  - Mong đợi: FAIL (`ownSheet` chưa được export).

- [ ] **Step 3: Cài đặt `sprites.js` theo Interfaces.**
  - `main.js`:
    - `actorAt` gọi `pickActor(actors.values(), x, y, (a) => actorMeta(sprites, a.view.key, a.sprite.sheet, T), (a, lx, ly) => opaqueAt(sprites, `${a.sprite.sheet}:${a.view.key}`, a.sprite.frame, a.sprite.flip, lx, ly))`.
    - Cấu hình dự phòng thành `{ shirt: 'grey', hair: 'dark', pants: 'charcoal' }`.
  - `layout.json`: xoá trường `"acc"` ở mọi agent.

- [ ] **Step 4: Chạy test để thấy qua.**
  - Lệnh: `node --test test/actors.test.js`
  - Mong đợi: PASS.

- [ ] **Step 5: Commit** `feat(sprites): per-agent char and sit sheets, pixel lookup for clicks; drop accessories`.

---

### Task 3: Vẽ người theo sheet, ẩn ghế có người ngồi, bóng chân (`room.js`, `overlay.js`, `shadow.js`)

**Files:**
- Modify: `public/js/room.js`, `public/js/overlay.js`, `public/js/shadow.js`
- Test: `test/room.test.js`, `test/shadow.test.js`

**Interfaces:**
- Consumes: `Actor#sprite`, `Actor#seatedAtDesk`, `actorMeta`.
- Produces:
  - `occupiedSeats(actors)` → `Set<string>` các chuỗi `"x,y"` của những actor có `seatedAtDesk`, export từ `room.js`.
  - `footShadow(box)` → `{ cx: round(box.x + box.w/2), cy: box.y + box.h - 5, rx: 10, ry: 2 }`.

- [ ] **Step 1: Viết test hỏng.**
  - `room.test.js`: `'occupiedSeats lists only actors seated at a desk'`. Dùng actor giả `{ seatedAtDesk: true, x: 8, y: 7 }`, `{ seatedAtDesk: false, x: 12, y: 7 }`. Mong đợi `Set {'8,7'}`.
  - `shadow.test.js`: đổi test `footShadow` sang hộp `{x:100,y:200,w:64,h:64}`, mong đợi `{ cx: 132, cy: 259, rx: 10, ry: 2 }`.

- [ ] **Step 2: Chạy test để thấy hỏng.**
  - Lệnh: `node --test test/room.test.js test/shadow.test.js`
  - Mong đợi: FAIL.

- [ ] **Step 3: Cài đặt.**
  - `room.js`:
    - Ghế là `d.boss ? 'chairBoss' : 'chair'`, bỏ qua nếu `occupiedSeats(actors)` có `` `${d.seat[0]},${d.seat[1]}` ``.
    - Người vẽ bằng `` `${s.sheet}:${key}` ``, khung `s.frame`, `flip: s.flip`, hộp lấy từ `actorMeta(sprites, key, s.sheet, T)`.
    - Bóng chân chỉ vẽ cho actor không `seatedAtDesk`.
  - `overlay.js`: hộp lấy từ `actorMeta(sprites, actor.view.key, actor.sprite.sheet, 16*k)`.

- [ ] **Step 4: Chạy toàn bộ test.**
  - Lệnh: `node --test`
  - Mong đợi: chỉ `art.test.js` có thể hỏng (art chưa đổi); mọi file khác PASS.

- [ ] **Step 5: Commit** `feat(room): draw actors by sheet, hide occupied chairs, fixed foot shadow`.

---

### Task 4: Bàn và ghế Hi-Bit (art)

**Files:**
- Overwrite: `public/art/desk.png`, `public/art/deskBoss.png`, `public/art/chair.png`
- Create: `public/art/chairBoss.png`
- Delete: `public/art/chair2.png`
- Modify: `public/art/manifest.json`, `public/art/palette.json`, `test/art.test.js`

**Interfaces:**
- Produces: các sprite `desk`, `deskBoss`, `chair`, `chairBoss` với kích thước như Global Constraints; manifest có `"shadow"` giữ như hiện tại.

- [ ] **Step 1: Sửa test.** Trong `test/art.test.js`, `REQUIRED` bỏ `chair2` và thêm `chairBoss: [32, 32, 1]`.
  - Chạy `node --test test/art.test.js`.
  - Mong đợi: FAIL, thiếu `chairBoss`.
- [ ] **Step 2: Thêm ramp gỗ 5 tông và ramp da teal 5 tông vào `palette.json`.** Đặt tên `wood1..5` và `leather1..5`; tông tối ngả tím/xanh, tông sáng ngả vàng.
- [ ] **Step 3: Vẽ bằng MCP.** Thứ tự cho mỗi sprite: silhouette → mảng màu → bóng → sel-out → chi tiết → `pixel_lint` ≥ 90.
  - `desk` và `deskBoss`: khối 3/4 với mặt trên, mặt trước và mặt bên phải; vân gỗ thưa; mép trên-trái có ánh sáng; AO ở chân.
    - Mặt bàn phải để trống vùng bàn phím (cột seat, hàng 8–24) và vùng màn hình.
    - `deskBoss` có mặt da teal.
  - `chair`: ghế văn phòng nhìn từ sau, lưng cong, tay vịn, chân sao 5 cánh, bánh xe.
  - `chairBoss`: ghế bành da teal lưng cao, viền đinh tán vàng.
- [ ] **Step 4: Thêm `chairBoss` vào manifest, xoá mục `chair2` và file `chair2.png`.**
  - Chạy `node --test test/art.test.js`.
  - Mong đợi: PASS (trừ các test nhân vật, sẽ sửa ở Task 5–7, nếu đang hỏng).
- [ ] **Step 5: Commit** `feat(art): hi-bit desks and chairs; boss armchair; drop chair2`.

---

### Task 5: Sheet đứng/đi của Trưởng phòng `char_boss` (art)

**Files:**
- Overwrite: `public/art/char_boss.png` (576×64)
- Modify: `public/art/manifest.json`, `public/art/palette.json`, `test/art.test.js`

**Interfaces:**
- Produces: `char_boss` 64×64×9, anchor [16, 32], đúng thứ tự `FRAMES` của Task 1.

- [ ] **Step 1: Sửa test.** Trong `art.test.js`:
  - `OWN_SHEETS` = `['char_boss', 'sit_boss']`.
  - Test kích thước kiểm tra `char_*` là [64,64,9,[16,32]] và `sit_*` là [64,64,8,[16,32]].
  - Test "không có pixel dưới chân" áp cho `char` và `char_*`, từ hàng 61.
  - Chạy `node --test test/art.test.js`.
  - Mong đợi: FAIL ở `char_boss`.
- [ ] **Step 2: Thêm ramp 5 tông vào palette:** da (`skinA1..5`), tóc muối tiêu (`ashHair1..5`), blazer teal (`blazer1..5`), quần than (`slacks1..5`).
- [ ] **Step 3: Vẽ khung 0 (idle 3/4 trước)** trên canvas tạm 64×64, theo đúng mô tả Trưởng phòng trong spec, rồi chạy `pixel_lint` ≥ 90.
- [ ] **Step 4: Dựng các khung còn lại.**
  - Khung 1: hạ vai và đầu 1px.
  - Khung 2–5: thử `pixel_define_rig` + `pixel_render_motion` (`walk`, 4 khung). Nếu tay chân bị méo, vẽ tay khung 2 và 4 (hai lần chạm đất), khung 3 và 5 là nhịp giữa.
  - Khung 6: vẽ tay dáng 3/4 sau. Khung 7–8: từ khung 6, đổi chân và tay.
  - Ghép thành sheet 576×64 bằng `pixel_copy_region`.
- [ ] **Step 5: Cập nhật manifest** thành `char_boss` 64×64, `frames: 9`, `anchor: [16, 32]`.
  - Chạy `node --test test/art.test.js`. Mong đợi: chỉ còn hỏng ở `sit_boss`.
  - Xuất GIF idle (khung 0–1) và GIF đi (khung 2–5) bằng `pixel_export_gif` vào scratchpad.
- [ ] **Step 6: Commit** `feat(art): hi-bit 64×64 boss stand/walk sheet`.
- [ ] **Step 7: Điểm dừng.** Gửi ảnh và GIF cho người dùng. Nếu người dùng chưa duyệt Trưởng phòng, dừng lại, chưa làm Task 6–7.

---

### Task 6: Sheet ngồi của Trưởng phòng `sit_boss` (art)

**Files:**
- Create: `public/art/sit_boss.png` (512×64)
- Modify: `public/art/manifest.json`

**Interfaces:**
- Consumes: `deskBoss`, `chairBoss`, keyboard và vị trí màn hình từ `desks.js`.
- Produces: `sit_boss` 64×64×8, anchor [16, 32], đúng thứ tự `SIT_FRAMES`.

- [ ] **Step 1: Ghép nền thử** trên canvas tạm 96×96 trong scratchpad bằng `pixel_copy_region`: `deskBoss`, `keyboard` và `monitor` (khung 1) đặt đúng như `drawStatic`/`monitorPos` vẽ cho bàn Trưởng phòng. Đây chỉ là nền tham chiếu, không đưa vào art.
- [ ] **Step 2: Vẽ khung 0 (gõ phím, 3/4 sau)** trên một layer 64×64 riêng.
  - Ghế bành ở dưới, chân ghế chạm hàng 60.
  - Đỉnh đầu không cao hơn hàng 20. Hai tay trong hàng 8–24, cột 16–47.
  - Cốc cà phê đặt trên bàn cạnh bàn phím.
  - `pixel_lint` ≥ 90.
- [ ] **Step 3: Dựng khung 1–7.**
  - 1–3: đổi tay luân phiên, đầu gật 1px ở khung 2.
  - 4–5: ngả lưng, tay chống cằm; khung 5 có ngón tay gõ bàn.
  - 6–7: hai tay ôm đầu; khung 7 vai lệch 1px.
  - Ghép sheet 512×64.
- [ ] **Step 4: Thêm vào manifest.**
  - Chạy `node --test test/art.test.js`. Mong đợi: PASS.
  - Xuất GIF gõ phím (khung 0–3) lên nền thử.
- [ ] **Step 5: Commit** `feat(art): hi-bit boss seated sheet with typing, waiting and error`.

---

### Task 7: Sheet chung `char` và `sit`; xoá art cũ (art)

**Files:**
- Overwrite: `public/art/char.png` (576×64)
- Create: `public/art/sit.png` (512×64)
- Delete: `public/art/acc_*.png`, `public/art/char_qa.png`, `public/art/char_build.png`
- Modify: `public/art/manifest.json`, `test/art.test.js`

**Interfaces:**
- Produces: `char` 64×64×9 và `sit` 64×64×8, anchor [16, 32]. Áo, tóc, quần vẽ bằng các key color trong `palette.keys`.

- [ ] **Step 1: Sửa test.**
  - `REQUIRED.char = [64, 64, 9]`, thêm `sit: [64, 64, 8]`, bỏ 8 mục `acc_*`.
  - Thêm test `'no accessory sprites remain'`: không có key manifest nào bắt đầu bằng `acc_`.
  - Test key color áp cho cả `char` và `sit`.
  - Chạy `node --test test/art.test.js`. Mong đợi: FAIL.
- [ ] **Step 2: Vẽ `char`.** Nhân viên văn phòng trung tính, cùng tỉ lệ và cùng quy trình khung như Task 5. Áo, tóc, quần chỉ dùng 3 key color mỗi phần; da và giày dùng màu palette.
- [ ] **Step 3: Vẽ `sit`.** Cùng quy trình như Task 6, ngồi trên `chair`, nền thử là `desk`.
- [ ] **Step 4: Dọn art cũ.** Xoá các file và mục manifest `acc_*`, `char_qa`, `char_build`.
  - Chạy `node --test`. Mong đợi: tất cả PASS.
- [ ] **Step 5: Commit** `feat(art): shared hi-bit stand and sit sheets; remove old character art`.

---

### Task 8: Trang duyệt art, chạy thật và gửi bản thử

**Files:**
- Modify: `public/art-preview.html`

- [ ] **Step 1: Sửa phần agent trong `art-preview.html`.**
  - Với mỗi agent, hiện hai dải `char:<type>` (9 khung) và `sit:<type>` (8 khung), ô 64×64.
  - Chú thích bỏ phụ kiện; thêm tên khung theo `FRAMES` và `SIT_FRAMES`.
- [ ] **Step 2: Chạy thật.**
  - Khởi động server thử ở cổng 4849, phát lại demo, mở bằng trình duyệt trong app.
  - Kiểm tra:
    - nhân vật đứng giữa ô;
    - khi ngồi, ghế rời biến mất, tay nằm trên bàn phím và màn hình không bị đầu che;
    - bấm vào người thì chọn được, bấm vào khoảng trống trong hộp thì không chọn ai;
    - nhãn tên và bong bóng đúng chỗ;
    - không có lỗi trong `read_console_messages`.
- [ ] **Step 3: Gửi bản thử.** Chụp cận bàn Trưởng phòng và một bàn thường có người ngồi, chụp trang art-preview. Gửi ảnh cùng các GIF của Task 5–6 qua `SendUserFile`. Tắt server.
- [ ] **Step 4: Commit** `feat(preview): 64×64 stand and sit strips per agent`. Cập nhật memory.
