# Pixel Office — Phần 1: phòng mới + bộ art modern retro

Ngày: 2026-10-26 · Trạng thái: chờ duyệt

## Mục tiêu

Vẽ lại văn phòng theo phong cách hai ảnh tham chiếu (nhân vật pixel cao ~4,5 đầu, đổ bóng nhiều tông lệch màu,
viền nâu; cảnh pixel ấm, mềm) với tông **mid-century ấm**, và mở rộng bản đồ có thêm **pantry** và **phòng game**.

Đây là phần 1 trong 3:

1. **Phần 1 (spec này):** bảng màu, nhân vật 32×64, bản đồ 36×20 nhiều phòng, vẽ lại toàn bộ sprite.
2. Phần 2 (spec riêng): agent rảnh vào pantry/phòng game làm động tác; animation nhân vật và phòng.
3. Phần 3 (spec riêng): thời tiết thật (Open-Meteo), ngày/đêm, mùa qua cửa sổ và ánh sáng phòng.

Phần 1 chỉ **đặt sẵn** các chỗ chơi (`spots`) và test là đi tới được; agent rảnh vẫn đi loanh quanh như cũ.

## Ràng buộc (giữ nguyên)

- Sprite chỉ vẽ bằng MCP pixelart local. Không model tạo ảnh, không script vẽ ảnh tự viết.
- Không tốn chi phí, không thêm dependency npm. Cài đặt (nếu có) chỉ trên ổ E.
- Nhìn từ trên xuống kiểu 3/4; ô 32px; 12 fps; mọi màu trong PNG phải có trong `palette.json`.
- Không push, không merge `main` khi chưa được đồng ý.

## Bảng màu (`public/art/palette.json`)

Viết lại toàn bộ `colors`. Mỗi chất liệu 3–4 tông: bóng lệch về tím-đỏ, sáng lệch về vàng. Không dùng đen.

| Nhóm | Tông (sáng → tối) |
|---|---|
| Viền | `#3d2a22` (viền ngoài), `#6b4a3a` (viền trong / viền chọn lọc) |
| Kem (tường) | `#fbf1dc` `#f3e3c3` `#e2c9a0` `#c9a77e` |
| Teal (ốp tường, ghế) | `#7cbcb2` `#4f9a94` `#3a7a78` `#2c5a5e` |
| Mật ong (sàn) | `#ecc088` `#d9a066` `#b97a45` `#94593a` |
| Óc chó (gỗ) | `#b8875a` `#9a6a42` `#6e4a2c` `#4f3322` |
| Mù tạt | `#f3cf6a` `#e3b341` `#b8862f` |
| Đất nung | `#eb9670` `#d4724a` `#a8513a` |
| Ô liu | `#b0bd6e` `#8a9a4b` `#66743a` |
| Hồng đào | `#f6c9ad` `#eaa58a` `#c9806c` |
| Da | `#fbe0c8` `#f0c09c` `#d39478` `#a86a5a` |
| Kim loại ấm | `#e6dccb` `#b8ab98` `#7d6f62` |
| Màn hình | tắt `#3c3a40`, bật `#8fe3a8`, lỗi `#f07a62` |
| Ánh sáng | nắng `#fff2c4`, quầng nắng `#ffd98a`, đèn trạng thái giữ xanh/vàng/đỏ |

Có thể thêm vài tông trung gian khi vẽ, nhưng phải nằm trên các dải trên và được khai báo trong `colors`.
Tên khoá trong `colors` mà code đang dùng (`sun`, `sunGlow`, `screenOn`, `screenErr`, `lampGreen`, `lampYellow`,
`lampRed`, …) giữ nguyên tên, chỉ đổi giá trị.

**Màu khoá để đổi màu theo agent** (3 tông: giữa, tối, sáng):

- `keys.shirt` magenta (giữ), `keys.hair` cyan (giữ), **mới** `keys.pants` = `#ffff00`, `#b0b000`, `#ffff80`.
- `shirts`, `hairs` chỉnh lại cho dịu, ấm. **Mới** `pants`: `denim`, `charcoal`, `khaki`, `olive`, `brown`.
- `layout.json`: mỗi agent có thêm `pants`.

## Nhân vật

- `char` 32×64, vẫn 8 khung: `down, up, walkDown1, walkDown2, walkSide1, walkSide2, type1, type2`.
- Cao ~4,5 đầu: đầu ~14px, thân ~22px, chân ~22px; đứng chéo 3/4; viền `#3d2a22`; tóc từng lọn có điểm sáng;
  áo có nếp và 3 tông; tay tách thân; quần, giày rõ; bóng bầu dục dưới chân.
- Khung `type1/2`: nhìn lưng, vai cử động; phần dưới bị ghế che.
- `anchor` của `char` thành `[0, 32]`: hình vẽ cao hơn ô đứng 32px.
- 8 phụ kiện vẽ lại theo vị trí đầu mới; vẫn 3 góc nhìn (trước, sau, nghiêng); kích thước và `anchor` mới ghi
  trong manifest.

## Bản đồ 36×20

```
x: 0 ─────────────── 23 │24│ 25 ──────── 35
y0-2  tường VP            │▓▓│ tường pantry + cửa sổ lớn
y3-8  sàn xương cá        │  │ sàn gạch ca-rô        (cửa ở y5)
y9-11                     │▓▓│ tường phòng game
y12-19 lounge ở đáy VP    │  │ thảm                  (cửa ở y15)
```

### Lược đồ `layout.json` mới

```jsonc
{
  "cols": 36, "rows": 20, "tile": 32,
  "rooms": [
    { "id": "office", "x": 0,  "y": 0, "w": 24, "h": 20, "wallRows": 3, "wall": "wall",       "floor": ["floor", "floor2"] },
    { "id": "pantry", "x": 25, "y": 0, "w": 11, "h": 9,  "wallRows": 3, "wall": "wallPantry", "floor": ["floorTile"] },
    { "id": "game",   "x": 25, "y": 9, "w": 11, "h": 11, "wallRows": 3, "wall": "wallGame",   "floor": ["floorCarpet"] }
  ],
  "dividers": [ { "x": 24, "y": 0, "h": 20, "doors": [5, 15] } ],
  "agents": [ /* như cũ + "pants" */ ],
  "desks": [ /* tọa độ mới, bên dưới */ ],
  "props": [ /* có thêm "decal": true cho đồ trải sàn không chặn đường */ ],
  "spots": [ { "x": 27, "y": 3, "room": "pantry", "face": "up", "act": "coffee" } /* … */ ],
  "guest": [5, 9], "spawn": [12, 3],
  "wander": [ /* vài điểm mỗi phòng */ ]
}
```

- `wallRows` thuộc về từng phòng; trường `wallRows` cấp cao bị bỏ. Hàng tường cuối của mỗi phòng vẽ bằng sprite
  `<wall>Trim` (ví dụ `wallTrim`, `wallPantryTrim`, `wallGameTrim`).
- Sàn: chọn trong mảng `floor` theo công thức ô (như hiện nay) để có biến thể.
- Vách ngăn `dividers`: cột 1 ô. Ở các hàng tường của phòng bên trái thì vẽ như tường, còn lại vẽ `divider`.
  Ô cửa vẽ `doorway` (ngưỡng cửa) và đi qua được.

### Văn phòng (x 0–23)

- Treo tường (y 0–2): bảng trắng (1,1), cửa sổ (4,0), đồng hồ (7,1), tủ sách (9,1), cửa ra vào (12,0),
  tranh (15,1), cửa sổ (18,0), tủ sách (21,1).
- Bàn sếp `{x:2,y:6,w:3,seat:[3,7]}`. Dãy A ở y=6, dãy B ở y=12, x = 8, 12, 16, 20 (w 2, ghế ở hàng dưới).
  Bàn dự phòng (2,12) và (2,16).
- Máy nước (22,9), thùng rác (6,7), cây (22,16).
- Lounge: thảm tròn `decal` (7,14, 5×4), bàn trà (8,15, 2×1), sofa đất nung (8,17, 3×1),
  đèn cây cong (12,16, 1×2), monstera (5,16, 1×2).

### Pantry (x 25–35, sàn y 3–8)

- Treo/đứng tường: quầy bếp kèm máy pha cà phê (26,1, 3×2), cửa sổ lớn `windowWide` (29,0, 3×2),
  tủ lạnh retro (33,0, 1×3).
- Sàn: bàn (29,5, 2×1); ghế pantry (28,5), (31,5), (29,6), (30,6).
- Chỗ chơi: pha cà phê (27,3), mở tủ lạnh (33,3), bốn ghế quanh bàn.

### Phòng game (x 25–35, tường y 9–11, sàn y 12–19)

- Đứng/treo tường: 2 máy arcade (26,10) và (27,10), cửa sổ (29,9), kệ TV CRT (32,10, 2×2), poster (34,10).
- Sàn: bàn bóng bàn (27,15, 3×2), 2 beanbag (32,13) và (33,13), cây (34,17).
- Chỗ chơi: trước 2 máy arcade (26,12), (27,12); hai đầu bàn bóng bàn (26,15), (30,16); 2 beanbag.
  Lounge văn phòng có 2 chỗ sofa (8,17), (10,17).

Toạ độ ở trên là dự kiến. Test khoảng cách và đường đi là thước đo; nếu test buộc dời 1 ô thì dời và ghi lại.

## Danh sách sprite (vẽ bằng MCP pixelart)

| Nhóm | Sprite (kích thước px) |
|---|---|
| Sàn | `floor`, `floor2` xương cá 32×32; `floorTile` ca-rô kem/đất nung 32×32; `floorCarpet` thảm teal/mù tạt 32×32 |
| Tường | `wall`, `wallTrim` (kem + ốp teal + nẹp mù tạt); `wallPantry`, `wallPantryTrim` (gạch men); `wallGame`, `wallGameTrim` (teal đậm); `divider`, `doorway` 32×32 |
| Văn phòng | `door` 64×96, `window` 64×64 (rèm hồng đào), `desk` 64×32, `deskBoss` 96×32 (chân vát), `chair`, `chair2` 32×32 (mù tạt / teal), `monitor` 32×32×3, `pc` 32×32, `keyboard` 32×16, `bookshelf` 64×64, `cooler` 32×64, `plant` 32×64, `clock` 32×32, `painting` 64×32, `whiteboard` 64×32, `bin` 32×32, `mug` 16×16, `kit_*` ×9 32×32 |
| Lounge | `rug` 160×128, `coffeeTable` 64×32, `sofa` 96×32, `arcLamp` 32×64, `monstera` 32×64 |
| Pantry | `counter` 96×64, `windowWide` 96×64, `fridge` 32×96, `pantryTable` 64×32, `pantryChair` 32×32 |
| Phòng game | `arcade` 32×64, `tvStand` 64×64, `poster` 32×32, `pingpong` 96×64, `beanbag` 32×32 |
| Nhân vật | `char` 32×64×8, `acc_*` ×8 |
| UI | `lamp`, `bubble`, `badge` (đổi màu theo bảng mới, giữ kích thước) |

Khoảng 60 sprite. Ghế bàn làm việc xen kẽ `chair` và `chair2` theo chỉ số bàn.
Đồ treo tường (cửa sổ, đồng hồ, tranh, bảng trắng, poster) giữ lề trong suốt 4px như hiện nay.

## Thay đổi code

| File | Thay đổi |
|---|---|
| `public/js/path.js` | `buildGrid` đi được khi ô nằm trong sàn của một phòng hoặc là ô cửa của vách; chặn bàn và prop (trừ `decal`); mở lại ô ghế và ô `spots` |
| `public/js/room.js` | `drawStatic` vẽ tường và sàn theo từng phòng, vách ngăn, rồi `decal`, rồi prop; ghế xen kẽ `chair`/`chair2`; vẽ nhân vật theo hộp từ `spriteBox` |
| `public/js/actors.js` | thêm hàm thuần `spriteBox(px, meta)` → `{x, y, w, h}` tính từ `anchor` và kích thước của manifest |
| `public/js/overlay.js` | vị trí đèn, đầu, tên, bong bóng lấy từ `spriteBox` thay cho số cố định |
| `public/js/main.js` | vùng click lấy từ `spriteBox` |
| `public/js/glow.js` | vệt nắng bắt đầu ở mép sàn của phòng chứa cửa sổ; tính cả `windowWide` |
| `public/js/sprites.js` | `addAgentSprite` đổi thêm màu quần |
| `public/layout.json`, `public/art/*` | lược đồ và toạ độ mới, palette mới, manifest mới, PNG mới |
| `public/art-preview.html` | ô nhân vật 32×64; thêm mục cho sprite mới |

## Test (TDD: test trước, xem fail, rồi làm)

- `art.test.js`: `REQUIRED` cập nhật theo bảng sprite (trong đó `char` [32,64,8]). `char` có đủ màu khoá
  áo/tóc/quần. Mọi agent có `pants` nằm trong `palette.pants`. Lề 4px cho mọi đồ treo tường. Kích thước prop
  khớp số ô.
- `path.test.js` viết lại theo phòng:
  - kích thước 36×20;
  - ô tường của từng phòng bị chặn; ô vách bị chặn trừ ô cửa;
  - đồ treo/đứng tường nằm trong dải tường của **phòng mình**;
  - đồ sàn cách tường và mép phòng ít nhất 1 ô;
  - bàn và ghế không chạm nhau;
  - `decal` không chặn đường;
  - mọi ghế, `spots`, điểm lang thang và chỗ khách đều tới được từ `spawn`;
  - `spots` không trùng nhau và không trùng ghế bàn làm việc.
- `glow.test.js`: vệt nắng bắt đầu ở mép sàn của phòng chứa cửa sổ; `windowWide` cũng có nắng.
- Test mới cho `spriteBox`: nhân vật 32×64 với `anchor [0,32]` cho hộp `{x, y-32, 32, 64}`.
- Test hiện có (state, server, cli, summarize, …) phải vẫn pass.

## Kiểm tra bằng mắt

Mở trang trong trình duyệt tích hợp, chụp toàn cảnh và cận từng phòng, xem `art-preview.html`. Gửi ảnh để bạn
duyệt trước khi commit.

## Rủi ro đã chấp nhận

- Nhân vật cao hơn nên lúc đi có thể đè lên đồ ở hàng trên, và tên/bong bóng nằm cao hơn. Phần 2 sẽ thêm sắp xếp
  theo chiều sâu cho đồ ngồi (sofa, beanbag, ghế pantry).
- Ô ghế và ô `spots` đi xuyên được, giống ghế bàn làm việc hiện nay.
- Khoảng 60 sprite vẽ tay qua MCP: tốn thời gian nhất là 8 khung nhân vật.

## Ngoài phạm vi phần 1

Hành vi đi chơi khi rảnh, khung animation mới, animation phòng, thời tiết, ngày/đêm, mùa.
