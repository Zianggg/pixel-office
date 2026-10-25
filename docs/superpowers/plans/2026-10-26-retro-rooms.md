# Retro Rooms (Phần 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bản đồ 36×20 gồm văn phòng, pantry và phòng game; bảng màu mid-century ấm; nhân vật 32×64; toàn bộ sprite vẽ lại bằng MCP pixelart.

**Architecture:** `layout.json` khai báo `rooms`, `dividers` và `spots`. Các hàm thuần như `buildGrid`, `roomAt`, `tileAt`, `spriteBox` và `agentColorMap` biến dữ liệu đó thành lưới đi lại, ô vẽ, hộp nhân vật và bảng đổi màu. Renderer chỉ gọi các hàm này. Art làm theo từng nhóm: mỗi nhóm thêm mục vào `REQUIRED` trong `test/art.test.js`, vẽ bằng MCP, rồi khai báo trong manifest.

**Tech Stack:** Node 24 (`E:\Dev\nodejs`), ESM, `node --test`, Canvas 2D, MCP pixelart (`pixel_create_canvas`, `pixel_batch`, `pixel_view_canvas`, `pixel_export_png`).

**Spec:** `docs/superpowers/specs/2026-10-26-retro-rooms-design.md`

## Global Constraints

- Sprite chỉ vẽ bằng MCP pixelart local. Không dùng model tạo ảnh, không tự viết script vẽ ảnh (Pillow, canvas, …).
- Không tốn chi phí, không thêm dependency npm. Phần mềm cài thêm (nếu có) chỉ đặt trên ổ E.
- Ô 32px, nhìn từ trên xuống kiểu 3/4, 12 fps. Mọi pixel đục trong PNG phải là màu có trong `palette.json`, và chỉ có hai mức alpha: 0 hoặc 255.
- Viền `#3d2a22`, không dùng đen. Bóng lệch về tím-đỏ, chỗ sáng lệch về vàng.
- Làm trên branch `feat/retro-rooms`. Không push, không merge vào `main` khi người dùng chưa duyệt ảnh chụp.
- Trước khi chạy Node: `export PATH="/e/Dev/nodejs:$PATH"` (Git Bash). Lệnh test: `node --test`.
- Văn bản hiển thị cho người dùng viết bằng tiếng Việt.

## Review Focus

1. Agent có `pants` không nằm trong `palette.pants`, hoặc agent lạ không có cấu hình: nhân vật vẫn phải vẽ được, giữ màu khoá và không lỗi. Test nằm ở Task 2.
2. Sprite `char` chưa tải hoặc thiếu trong manifest: `charMeta` trả hộp mặc định 32×64, overlay và vùng click vẫn chạy. Test nằm ở Task 2.
3. Ô cửa của vách nằm sát hàng tường của phòng bên phải (cửa pantry ở y5 so với tường y0–2): phải đi qua được theo cả hai chiều. Test nằm ở Task 1.
4. Prop `decal` (thảm) nằm dưới ghế hoặc sofa: không được chặn đường, nhưng ô sofa vẫn phải bị chặn. Test nằm ở Task 1.
5. Agent đang đứng ở toạ độ cũ, nay là tường hoặc vách (ví dụ hàng y=5 cũ): `goTo` không được treo. `findPath` trả `null` và actor giữ nguyên chỗ, như hiện nay. Test nằm ở Task 1.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `public/layout.json` | Dữ liệu bản đồ: phòng, vách, bàn, prop, chỗ chơi, agent (kèm `pants`) |
| `public/js/path.js` | `roomAt`, `buildGrid` theo phòng, `findPath` (giữ nguyên) |
| `public/js/room.js` | `tileAt` (tên sprite của từng ô nền), `drawStatic`, `drawDynamic` |
| `public/js/actors.js` | `spriteBox`, `agentColorMap` (thuần), Actor |
| `public/js/sprites.js` | `charMeta`, `addAgentSprite` dùng `agentColorMap` |
| `public/js/overlay.js`, `public/js/main.js` | Lấy toạ độ đầu, tên và vùng click từ `spriteBox` |
| `public/js/glow.js` | Vệt nắng tính theo phòng chứa cửa sổ, tính cả `windowWide` |
| `public/art/palette.json`, `public/art/manifest.json`, `public/art/*.png` | Art |
| `public/art-preview.html` | Trang xem toàn bộ sprite |
| `test/path.test.js`, `test/room.test.js`, `test/actors.test.js`, `test/glow.test.js`, `test/art.test.js`, `test/server.test.js` | Test |

---

### Task 1: Bản đồ nhiều phòng và lưới đi lại

**Files:**
- Modify: `public/layout.json`, `public/js/path.js`
- Test: `test/path.test.js` (viết lại), `test/server.test.js:30` (đổi `26` thành `36`), `test/art.test.js` (test `prop sprites match their tile footprints` chỉ duyệt các prop có sprite trong manifest; việc sprite có tồn tại hay không do `REQUIRED` của Task 8 bảo đảm)

**Interfaces:**
- Produces:
  - `roomAt(layout, x, y) → room | null`: phòng có hình chữ nhật chứa ô `(x, y)`. Ô vách trả `null`.
  - `buildGrid(layout) → boolean[rows][cols]`.
  - Lược đồ `layout.json` mới. Các task sau đọc `rooms[i].{id,x,y,w,h,wallRows,wall,floor}`, `dividers[i].{x,y,h,doors}`, `spots[i].{x,y,room,face,act}` và `props[i].decal`.

- [ ] **Step 1: Tạo branch** `git switch -c feat/retro-rooms`

- [ ] **Step 2: Viết lại `test/path.test.js`**

Viết các test sau, dùng hàm `roomOf(p) = roomAt(layout, p.x, p.y)`:
- `map is 36×20 with office, pantry and game rooms`: `cols 36`, `rows 20`, `tile 32`. Các `rooms.map(r => r.id)` bằng `['office','pantry','game']`. Có đúng một divider `{x:24,y:0,h:20,doors:[5,15]}`.
- `roomAt finds the room of a tile and null on the divider`:
  - `roomAt(l,3,3).id === 'office'`
  - `roomAt(l,30,4).id === 'pantry'`
  - `roomAt(l,30,10).id === 'game'`
  - `roomAt(l,24,8) === null`
  - `roomAt(l,40,0) === null`
- `walls of every room block; divider blocks except its doors`:
  - với mọi phòng `r` và mọi `y < r.y + r.wallRows`, mọi ô `x` trong `r` có `g[y][x] === false`;
  - `g[3][24]`, `g[8][24]`, `g[12][24]` đều `false`;
  - `g[5][24]`, `g[15][24]` đều `true`.
- `desks, props and furniture block; decals, seats and spots do not`:
  - `g[6][8] === false` (bàn);
  - `g[7][8] === true` (ghế);
  - `g[15][8] === false` (bàn trà, nằm trên thảm);
  - `g[14][7] === true` (thảm `decal`);
  - `g[17][9] === false` (giữa sofa, không phải chỗ chơi);
  - mọi spot `[x,y]` đều có `g[y][x] === true`.
- `wall-hung props stay inside their room's wall band, clear of its sides`:
  - áp dụng cho các sprite `window, windowWide, clock, painting, whiteboard, poster`;
  - điều kiện: `p.y >= r.y` và `p.y + p.h <= r.y + r.wallRows`, đồng thời `p.x >= r.x + 1` và `p.x + p.w <= r.x + r.w - 1`.
- `wall-standing props stand on their room's wall base`:
  - áp dụng cho `door, bookshelf, counter, fridge, arcade, tvStand`;
  - điều kiện: `p.y + p.h === r.y + r.wallRows`, cùng điều kiện cạnh như trên.
- `floor props keep one tile from their room's wall and sides`:
  - áp dụng cho mọi prop còn lại, kể cả `decal`, với `r = roomAt(layout, p.x, p.y)`;
  - điều kiện: `p.y >= r.y + r.wallRows + 1`, `p.y + p.h <= r.y + r.h - 1`, `p.x >= r.x + 1`, `p.x + p.w <= r.x + r.w - 1`.
- `desks and chairs keep clear of the office edges and of each other`: giữ logic test hiện có, nhưng giới hạn lấy từ phòng `office`:
  - `x0 >= r.x + 2`, `x1 <= r.x + r.w - 3`;
  - `y0 >= r.y + r.wallRows + 1`, `y1 <= r.y + r.h - 2`.
- `spots are unique, inside their declared room, and never a desk seat`: kiểm `roomAt(...).id === s.room`, không có cặp `x,y` trùng, và không trùng `seat` của bàn nào. Mỗi `face` thuộc `up/down/left/right`, mỗi `act` thuộc `coffee/fridge/eat/arcade/pingpong/tv/sofa`.
- `every seat, spot, wander point and the guest spot is reachable from spawn`.
- `doorways connect both ways`: `findPath(g,[23,5],[25,5])` và `findPath(g,[25,5],[23,5])` không `null`; tương tự với `[23,15]` và `[25,15]`.
- `a path from a tile that is now a wall returns null instead of hanging`: `findPath(g,[24,8],[3,7]) === null`.
- `shortest path avoids blocked cells`: `findPath(g, layout.spawn, [20,7])` bắt đầu ở `[12,3]`, kết thúc ở `[20,7]`, dài 13 ô, không đi qua ô bị chặn, mỗi bước cách nhau đúng 1.

- [ ] **Step 3: Chạy `node --test test/path.test.js`.** Kỳ vọng: FAIL (`roomAt` chưa có, `cols` vẫn là 26).

- [ ] **Step 4: Viết lại `public/layout.json`**

Giữ nguyên 9 agent với `type/name/role/shirt/hair/acc/desk/kit`, và thêm `pants` theo thứ tự:
`charcoal, khaki, denim, olive, denim, brown, khaki, charcoal, olive`.
Các trường còn lại lấy đúng như sau:

```json
{
  "cols": 36, "rows": 20, "tile": 32,
  "rooms": [
    {"id":"office","x":0,"y":0,"w":24,"h":20,"wallRows":3,"wall":"wall","floor":["floor","floor2"]},
    {"id":"pantry","x":25,"y":0,"w":11,"h":9,"wallRows":3,"wall":"wallPantry","floor":["floorTile"]},
    {"id":"game","x":25,"y":9,"w":11,"h":11,"wallRows":3,"wall":"wallGame","floor":["floorCarpet"]}
  ],
  "dividers": [{"x":24,"y":0,"h":20,"doors":[5,15]}],
  "desks": [
    {"x":2,"y":6,"w":3,"seat":[3,7],"boss":true},
    {"x":8,"y":6,"w":2,"seat":[8,7]}, {"x":12,"y":6,"w":2,"seat":[12,7]},
    {"x":16,"y":6,"w":2,"seat":[16,7]}, {"x":20,"y":6,"w":2,"seat":[20,7]},
    {"x":8,"y":12,"w":2,"seat":[8,13]}, {"x":12,"y":12,"w":2,"seat":[12,13]},
    {"x":16,"y":12,"w":2,"seat":[16,13]}, {"x":20,"y":12,"w":2,"seat":[20,13]},
    {"x":2,"y":12,"w":2,"seat":[2,13],"spare":true},
    {"x":2,"y":16,"w":2,"seat":[2,17],"spare":true}
  ],
  "guest": [5,9],
  "spawn": [12,3],
  "props": [
    {"sprite":"whiteboard","x":1,"y":1,"w":2,"h":1},
    {"sprite":"window","x":4,"y":0,"w":2,"h":2},
    {"sprite":"clock","x":7,"y":1,"w":1,"h":1},
    {"sprite":"bookshelf","x":9,"y":1,"w":2,"h":2},
    {"sprite":"door","x":12,"y":0,"w":2,"h":3},
    {"sprite":"painting","x":15,"y":1,"w":2,"h":1},
    {"sprite":"window","x":18,"y":0,"w":2,"h":2},
    {"sprite":"bookshelf","x":21,"y":1,"w":2,"h":2},
    {"sprite":"cooler","x":22,"y":9,"w":1,"h":2},
    {"sprite":"bin","x":6,"y":7,"w":1,"h":1},
    {"sprite":"plant","x":22,"y":16,"w":1,"h":2},
    {"sprite":"rug","x":7,"y":14,"w":5,"h":4,"decal":true},
    {"sprite":"coffeeTable","x":8,"y":15,"w":2,"h":1},
    {"sprite":"sofa","x":8,"y":17,"w":3,"h":1},
    {"sprite":"arcLamp","x":12,"y":16,"w":1,"h":2},
    {"sprite":"monstera","x":5,"y":16,"w":1,"h":2},
    {"sprite":"counter","x":26,"y":1,"w":3,"h":2},
    {"sprite":"windowWide","x":29,"y":0,"w":3,"h":2},
    {"sprite":"fridge","x":33,"y":0,"w":1,"h":3},
    {"sprite":"pantryTable","x":29,"y":5,"w":2,"h":1},
    {"sprite":"pantryChair","x":28,"y":5,"w":1,"h":1},
    {"sprite":"pantryChair","x":31,"y":5,"w":1,"h":1},
    {"sprite":"pantryChair","x":29,"y":6,"w":1,"h":1},
    {"sprite":"pantryChair","x":30,"y":6,"w":1,"h":1},
    {"sprite":"arcade","x":26,"y":10,"w":1,"h":2},
    {"sprite":"arcade","x":27,"y":10,"w":1,"h":2},
    {"sprite":"window","x":29,"y":9,"w":2,"h":2},
    {"sprite":"tvStand","x":32,"y":10,"w":2,"h":2},
    {"sprite":"poster","x":34,"y":10,"w":1,"h":1},
    {"sprite":"pingpong","x":27,"y":15,"w":3,"h":2},
    {"sprite":"beanbag","x":32,"y":13,"w":1,"h":1},
    {"sprite":"beanbag","x":33,"y":13,"w":1,"h":1},
    {"sprite":"plant","x":34,"y":17,"w":1,"h":2}
  ],
  "spots": [
    {"x":27,"y":3,"room":"pantry","face":"up","act":"coffee"},
    {"x":33,"y":3,"room":"pantry","face":"up","act":"fridge"},
    {"x":28,"y":5,"room":"pantry","face":"right","act":"eat"},
    {"x":31,"y":5,"room":"pantry","face":"left","act":"eat"},
    {"x":29,"y":6,"room":"pantry","face":"up","act":"eat"},
    {"x":30,"y":6,"room":"pantry","face":"up","act":"eat"},
    {"x":26,"y":12,"room":"game","face":"up","act":"arcade"},
    {"x":27,"y":12,"room":"game","face":"up","act":"arcade"},
    {"x":26,"y":15,"room":"game","face":"right","act":"pingpong"},
    {"x":30,"y":16,"room":"game","face":"left","act":"pingpong"},
    {"x":32,"y":13,"room":"game","face":"up","act":"tv"},
    {"x":33,"y":13,"room":"game","face":"up","act":"tv"},
    {"x":8,"y":17,"room":"office","face":"up","act":"sofa"},
    {"x":10,"y":17,"room":"office","face":"up","act":"sofa"}
  ],
  "wander": [[5,4],[16,4],[22,4],[6,10],[14,10],[18,9],[4,18],[14,18],[19,16],[26,7],[33,7],[26,18],[31,18]]
}
```

- [ ] **Step 5: Viết `roomAt` và `buildGrid` trong `public/js/path.js`**

`buildGrid`:
- Bắt đầu với một ô đi được khi `roomAt` trả về một phòng và `y >= r.y + r.wallRows`, hoặc khi ô là cửa của divider (`x === d.x` và `d.doors.includes(y)`).
- Chặn ô của bàn và của prop, trừ prop có `decal`.
- Cuối cùng mở lại ô `seat` của mọi bàn và ô của mọi spot.
- Bỏ trường `layout.wallRows`.

- [ ] **Step 6: Chạy `node --test`.** Kỳ vọng: `path.test.js` PASS. `server.test.js` PASS sau khi đổi `26` thành `36`. `glow.test.js` có thể FAIL ở các test vệt nắng và vị trí màn hình; Task 2 sửa. Ghi lại test nào fail.

- [ ] **Step 7: Commit** `git add -A && git commit -m "feat: multi-room layout with pantry, game room and spots"`

---

### Task 2: Hộp nhân vật, màu quần, vệt nắng theo phòng

**Files:**
- Modify: `public/js/actors.js`, `public/js/sprites.js`, `public/js/overlay.js`, `public/js/main.js`, `public/js/room.js` (chỉ phần vẽ nhân vật), `public/js/glow.js`
- Test: `test/actors.test.js`, `test/glow.test.js`

**Interfaces:**
- Consumes: `roomAt` (Task 1).
- Produces:
  - `spriteBox(px, meta) → {x, y, w, h}`, với `x = px.x - meta.anchor[0]`, `y = px.y - meta.anchor[1]`, `w = meta.w`, `h = meta.h`.
  - `agentColorMap(palette, cfg) → {[keyHex]: hex}`: ghép `palette.keys.{shirt,hair,pants}` với `palette.shirts[cfg.shirt]`, `palette.hairs[cfg.hair]`, `palette.pants[cfg.pants]`. Ramp nào thiếu (tên lạ hoặc không có) thì bỏ qua; `keys.pants` thiếu cũng bỏ qua.
  - `charMeta(sprites, key, T) → {w, h, anchor}`: lấy `sprites.images['char:'+key]`, nếu không có thì `sprites.images.char`, nếu vẫn không có thì `{w:T, h:2*T, anchor:[0,T]}`.

- [ ] **Step 1: Thêm test**

`test/actors.test.js`:
- `spriteBox lifts a 32×64 character by its anchor`: `spriteBox({x:64,y:96},{w:32,h:64,anchor:[0,32]})` bằng `{x:64,y:64,w:32,h:64}`.
- `agentColorMap maps shirt, hair and pants keys and skips unknown ramps`: dùng một palette giả có `keys` 3 nhóm và ramp `shirts.red`, `hairs.dark`, `pants.denim`:
  - `{shirt:'red',hair:'dark',pants:'denim'}` cho 9 mục;
  - `{shirt:'red',hair:'nope'}` cho 3 mục;
  - palette không có `keys.pants` vẫn chạy.
- `charMeta falls back to a 32×64 box when no char sprite is loaded`: `charMeta({images:{}},'x',32)` bằng `{w:32,h:64,anchor:[0,32]}`. Có `images.char` thì trả về chính nó.

`test/glow.test.js`:
- Đổi `windows` thành `layout.props.filter(p => p.sprite.startsWith('window'))`.
- Beam `i` có `top.y === (r.y + r.wallRows) * T` với `r = roomAt(layout, w.x, w.y)`.
- Test màn hình dùng desk 3: kỳ vọng `[16*T + 8*k, 6*T - 10*k + 5*k, P.screenOn]`.
- Thêm test `the pantry's wide window casts sunlight`: có một nguồn `sun` ở `((29 + 1.5) * T, 1 * T)`.

- [ ] **Step 2: Chạy `node --test test/actors.test.js test/glow.test.js`.** Kỳ vọng: FAIL (`spriteBox`, `agentColorMap`, `charMeta` chưa có; beam pantry sai mép sàn).

- [ ] **Step 3: Viết code**
- `spriteBox` và `agentColorMap` đặt trong `actors.js`; `charMeta` đặt trong `sprites.js`.
- `addAgentSprite` dùng `agentColorMap(pal, cfg)`.
- `main.js`:
  - agent không có trong layout dùng `{shirt:'grey',hair:'dark',pants:'charcoal',acc:null}`;
  - `actorAt` dùng `spriteBox(a.px, charMeta(sprites, a.view.key, T))`.
- `room.js` vẽ nhân vật ở `box.x, box.y` với `w: box.w, h: box.h`.
- `overlay.js`:
  - `cx = (box.x + box.w/2) * s`;
  - `head = box.y * s`;
  - tên đặt ở `(box.y + box.h) * s`.
  Với nhân vật 32×48 cũ, các công thức này cho đúng toạ độ hiện nay (`px.y - 16` và `px.y + 32`).
- `glow.js`:
  - `windows()` lấy các prop có sprite bắt đầu bằng `window`;
  - mép sàn = `(r.y + r.wallRows) * T`, với `r = roomAt(layout, w.x, w.y)`.

- [ ] **Step 4: Chạy `node --test`.** Kỳ vọng: mọi test PASS.

- [ ] **Step 5: Commit** `git commit -am "feat: character box from manifest anchor, pants recolor, per-room sun beams"`

---

### Task 3: Vẽ nền theo phòng

**Files:**
- Modify: `public/js/room.js`
- Test: `test/room.test.js`

**Interfaces:**
- Consumes: `roomAt`, các trường `rooms` và `dividers`.
- Produces: `tileAt(layout, x, y) → string | null`, trả tên sprite nền của ô.

- [ ] **Step 1: Thêm test `tileAt names wall, trim, floor, divider and doorway tiles`** vào `test/room.test.js`:
  - `tileAt(l,5,0) === 'wall'`, `tileAt(l,5,2) === 'wallTrim'`;
  - `tileAt(l,30,1) === 'wallPantry'`, `tileAt(l,30,2) === 'wallPantryTrim'`;
  - `tileAt(l,30,10) === 'wallGame'`, `tileAt(l,30,11) === 'wallGameTrim'`;
  - `tileAt(l,30,4) === 'floorTile'`, `tileAt(l,30,14) === 'floorCarpet'`;
  - `['floor','floor2']` chứa `tileAt(l,5,5)`;
  - `tileAt(l,24,1) === 'wall'`, `tileAt(l,24,2) === 'wallTrim'` (vách cạnh hàng tường của văn phòng);
  - `tileAt(l,24,8) === 'divider'`, `tileAt(l,24,5) === 'doorway'`, `tileAt(l,24,15) === 'doorway'`;
  - `tileAt(l,99,0) === null`.

- [ ] **Step 2: Chạy `node --test test/room.test.js`.** Kỳ vọng: FAIL (`tileAt` chưa có).

- [ ] **Step 3: Viết code**
- `tileAt`:
  - Trong phòng `r`, với `ly = y - r.y`: nếu `ly < r.wallRows` thì trả `ly === r.wallRows - 1 ? r.wall + 'Trim' : r.wall`.
  - Còn lại trả `r.floor[1]` khi `r.floor.length > 1 && (x*7 + y*3) % 5 === 0`, nếu không thì `r.floor[0]`.
  - Trên vách: ô cửa trả `'doorway'`. Ô nằm trong dải tường của phòng bên trái (`roomAt(layout, x-1, y)`) trả tên tường của phòng đó, như trên. Còn lại trả `'divider'`.
- `drawStatic` lần lượt:
  1. duyệt mọi ô qua `tileAt`;
  2. vẽ các prop có `decal`;
  3. vẽ các prop còn lại;
  4. vẽ bàn, bàn phím và kit như cũ.
- `drawDynamic`: ghế của bàn `i` dùng `i % 2 ? 'chair2' : 'chair'`.

- [ ] **Step 4: Chạy `node --test`.** Kỳ vọng: PASS.

- [ ] **Step 5: Commit** `git commit -am "feat: draw walls, floors and dividers per room"`

---

### Task 4: Bảng màu mid-century và màu khoá quần

**Files:**
- Modify: `public/art/palette.json`, `test/art.test.js`

**Interfaces:**
- Produces:
  - `palette.colors`: bảng mới, xem dưới.
  - `palette.legacy`: toàn bộ `colors` cũ, chỉ giữ tạm để sprite cũ vẫn qua test; Task 10 xoá.
  - `palette.keys.pants = ["#ffff00","#b0b000","#ffff80"]`.
  - Ramp `palette.pants.{denim,charcoal,khaki,olive,brown}`, mỗi ramp 3 tông theo thứ tự giữa, tối, sáng.

- [ ] **Step 1: Thêm test** vào `test/art.test.js`:
  - `palette defines pants keys and every agent's pants ramp`: `keys.pants` có 3 phần tử; mỗi agent có `pants` và `palette.pants[pants]` có 3 phần tử.
  - `palette keeps the color names the code reads`: `colors` có đủ `sun, sunGlow, screenOff, screenOn, screenErr, lampGreen, lampYellow, lampRed, lampGrey`, và `colors.outline === '#3d2a22'`.
  - Sửa `allowed` để gộp `Object.values(palette.legacy ?? {})` và `palette.keys.pants ?? []`.

- [ ] **Step 2: Chạy `node --test test/art.test.js`.** Kỳ vọng: FAIL (chưa có `keys.pants`).

- [ ] **Step 3: Viết `palette.json`**
- `colors` lấy đúng bảng màu trong spec, đặt tên theo dải: `outline, outlineSoft, cream1..cream4, teal1..teal4, honey1..honey4, walnut1..walnut4, mustard1..mustard3, terra1..terra3, olive1..olive3, peach1..peach3, skin1..skin4, chrome1..chrome3`. Số nhỏ là tông sáng.
- Đặt thêm `screenOff #3c3a40`, `screenOn #8fe3a8`, `screenErr #f07a62`, `sun #fff2c4`, `sunGlow #ffd98a`. Giữ giá trị hiện có của `lampGreen, lampYellow, lampRed, lampGrey`.
- `shirts` và `hairs`: giữ tên, đổi sang tông ấm và dịu hơn.
- `pants`:
  - denim `#5a7a9a/#3f5a78/#7f9db8`
  - charcoal `#5c5560/#403a46/#7d7682`
  - khaki `#c9b07a/#a08a58/#e0cc9c`
  - olive `#7d8a4a/#5e6a36/#a0ad6c`
  - brown `#8a6248/#674634/#ab8466`
- Lúc vẽ được thêm màu trung gian vào `colors`, miễn nằm trên các dải trên.

- [ ] **Step 4: Chạy `node --test`.** Kỳ vọng: PASS.

- [ ] **Step 5: Commit** `git commit -am "feat: mid-century palette and pants key colors"`

---

## Art tasks (5–9): quy trình chung

Mỗi art task làm theo các bước sau, mỗi bước là một ô checkbox trong task:

1. Thêm các mục `[w, h, frames]` của task vào `REQUIRED` trong `test/art.test.js`.
2. Chạy `node --test test/art.test.js`. Kỳ vọng: FAIL vì thiếu sprite hoặc sai kích thước.
3. Với từng sprite:
   - `pixel_create_canvas` đúng kích thước;
   - vẽ bằng `pixel_batch`, dùng `draw_rect` với toạ độ chính xác (không gõ tay `paint_grid` dài) cùng `draw_line` và `draw_ellipse`, chỉ dùng màu trong `palette.colors`;
   - `pixel_view_canvas` để tự kiểm tra;
   - `pixel_export_png` vào `public/art/<name>.png`.
4. Khai báo trong `public/art/manifest.json` dạng `{file, w, h, frames, anchor}`; `anchor` là `[0,0]` trừ khi task ghi khác.
5. Chạy `node --test`. Kỳ vọng: PASS.
6. Commit.

Hướng phong cách: viền ngoài `outline`, viền trong `outlineSoft`, ánh sáng từ trên-trái, mỗi mảng có 3 tông, gỗ có vân, vải có nếp.

### Task 5: Sàn, tường, vách

Sprite cần vẽ:
- `floor`, `floor2`: 32×32, gỗ xương cá mật ong. Cạnh ô phải ghép liền khi lát cạnh nhau. `floor2` thêm vài vân và vết xước.
- `floorTile`: 32×32, gạch ca-rô 2×2 màu kem và đất nung, có ron.
- `floorCarpet`: 32×32, thảm teal có hoạ tiết mù tạt, lát liền.
- `wall`, `wallTrim`: 32×32. `wall` là tường kem. `wallTrim` là ốp gỗ teal ở nửa dưới, nẹp mù tạt ở đỉnh, chân tường óc chó ở đáy.
- `wallPantry`, `wallPantryTrim`: 32×32. Tường kem và gạch men trắng ngà kiểu subway; trim là gạch kèm nẹp gỗ.
- `wallGame`, `wallGameTrim`: 32×32, teal đậm, trim có sọc mù tạt.
- `divider`: 32×32, mặt trên vách nhìn từ trên xuống, giữa là kem, hai mép óc chó.
- `doorway`: 32×32, ngưỡng cửa gỗ óc chó nằm trên nền sàn.

Test bổ sung: thêm `floor, floor2, floorTile, floorCarpet` vào một test `tiles have no transparent pixels`, kiểm mọi pixel có alpha 255.

Commit: `feat(art): retro floors, walls and dividers`

### Task 6: Đồ văn phòng

Sprite cần vẽ, kích thước như bảng trong spec:
- `door`: cửa gỗ óc chó có ô kính tròn.
- `window`: khung óc chó, rèm hồng đào hai bên, kính màu trời.
- `desk`, `deskBoss`: mặt bàn óc chó, chân vát kiểu mid-century.
- `chair`, `chair2`: ghế nệm mù tạt và teal nhìn từ sau.
- `monitor`: 3 khung tắt, bật, lỗi; viền màu kem.
- `pc`, `keyboard`, `bookshelf` (sách nhiều màu), `cooler`, `plant` (chậu đất nung), `clock` (mặt kem, viền mù tạt), `painting` (tranh trừu tượng mid-century), `whiteboard`, `bin`, `mug`.

Test bổ sung: thêm `chair2` vào `REQUIRED`. Test lề 4px cho `window, clock, painting, whiteboard` đã có sẵn và phải pass với sprite mới.

Commit: `feat(art): retro office furniture`

### Task 7: Bộ đồ cá nhân trên bàn

Vẽ lại `kit_boss, kit_design, kit_architect, kit_setup, kit_code, kit_scene, kit_qa, kit_review, kit_build`, mỗi bộ 32×32. Giữ ý tưởng cũ của từng bộ, đổi sang bảng màu mới.

Commit: `feat(art): retro desk kits`

### Task 8: Lounge, pantry, phòng game

Sprite cần vẽ, kích thước theo spec:
- `rug`: thảm tròn, hoạ tiết vòng mù tạt, đất nung, kem; nền ngoài vòng trong suốt.
- `coffeeTable`, `sofa` (đất nung, nhìn từ sau), `arcLamp` (chân óc chó, chụp đèn mù tạt), `monstera`.
- `counter`: quầy óc chó có máy pha cà phê chrome và cốc.
- `windowWide`: rèm hồng đào.
- `fridge`: tủ lạnh retro màu teal nhạt, tay nắm chrome.
- `pantryTable`, `pantryChair`.
- `arcade`: thân đất nung, màn hình xanh.
- `tvStand`: kệ óc chó kèm TV CRT và máy chơi game.
- `poster`: poster game, giữ lề 4px.
- `pingpong`: mặt xanh teal, lưới kem.
- `beanbag`: mù tạt.

Test bổ sung: thêm `poster` và `windowWide` vào danh sách lề 4px trong `wall-hung sprites keep a transparent margin`. Khi đã thêm mọi sprite của task này vào `REQUIRED`, mọi prop trong `layout.json` đều có sprite đúng kích thước theo số ô.

Commit: `feat(art): lounge, pantry and game room furniture`

### Task 9: Nhân vật 32×64 và phụ kiện

- `char`: 32×64, 8 khung theo thứ tự `down, up, walkDown1, walkDown2, walkSide1, walkSide2, type1, type2`, `anchor [0,32]`.
  - Bố cục dọc trong khung: đầu y 4–18, thân 18–40, chân 40–58, giày tới y 60, bóng bầu dục rộng khoảng 16px ở y 59–62 dùng màu `walnut3`.
  - Áo dùng `keys.shirt`, tóc dùng `keys.hair`, quần dùng `keys.pants`, da dùng `skin1..skin4`.
  - Khung `type`: nhìn lưng, tay đặt về phía trước; khung `type2` có vai lệch 1px.
  - Vẽ khung `down` trước, rồi `copy_region` sang các khung khác và chỉ sửa phần khác biệt.
- `acc_tie, acc_cap, acc_glasses, acc_headset, acc_bow, acc_beanie, acc_helmet, acc_scarf`: 16×16×3 (trước, sau, nghiêng). `anchor` mới khớp đầu và cổ của `char` mới, ghi vào manifest.
- Đổi `REQUIRED.char` thành `[32, 64, 8]`. Thêm test `char uses the pants key colors`, mở rộng test màu khoá hiện có.
- `public/art-preview.html`: ô nhân vật đổi sang `32, 64`; thêm mọi sprite mới vào lưới xem trước.
- Kiểm bằng mắt: `pixel_view_canvas` từng khung, rồi mở `art-preview.html` trong trình duyệt tích hợp.

Commit: `feat(art): 32×64 retro characters and accessories`

### Task 10: Dọn bảng màu, UI sprite, kiểm bằng mắt

**Files:** `public/art/palette.json`, `public/art/{lamp,bubble,badge}.png`, `test/art.test.js`

- [ ] **Step 1: Thêm test `no legacy palette remains`.** Kiểm `palette.legacy === undefined`, và bỏ `legacy` khỏi `allowed`. Chạy test, kỳ vọng FAIL.
- [ ] **Step 2: Vẽ lại `lamp` (12×12×5), `bubble` (18×18), `badge` (16×16) bằng màu mới.** Xoá `palette.legacy`.
- [ ] **Step 3: Chạy `node --test`.** Kỳ vọng: PASS toàn bộ. Nếu có sprite fail vì còn màu cũ, vẽ lại phần đó bằng MCP.
- [ ] **Step 4: Chạy demo** `OFFICE_PORT=4849 node cli.js demo` (chạy nền). Mở `http://127.0.0.1:4849` trong trình duyệt tích hợp.
  - Chụp toàn cảnh, cận từng phòng và `art-preview.html`.
  - Xác nhận: nhân vật đi qua cả hai cửa, đèn trạng thái, tên và bong bóng nằm trên đầu, click vào nhân vật mở panel.
  - Console không có lỗi.
- [ ] **Step 5: Commit** `git commit -am "feat(art): retro UI sprites; drop legacy palette"`
- [ ] **Step 6: Gửi ảnh chụp cho người dùng duyệt.** Chỉ merge `feat/retro-rooms` vào `main` khi người dùng đồng ý. Sau khi merge, khởi động lại server văn phòng để nạp `layout.json` mới.
