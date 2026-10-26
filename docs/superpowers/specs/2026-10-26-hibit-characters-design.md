# Nhân vật Hi-Bit 64×64, góc 3/4, ngồi làm việc ở bàn: spec

Ngày: 2026-10-26 · Branch: `feat/retro-rooms` · Nghiên cứu: `docs/research/2026-10-26-hibit-characters.md`

## Mục tiêu

- Bỏ toàn bộ art nhân vật cũ. Mỗi agent có sheet riêng 64×64 theo phong cách Hi-Bit / Neo-Retro, chỉ dùng hai góc 3/4. Đứng yên là dáng 3/4 trước.
- Khi agent ngồi vào bàn, vẽ bằng một **sheet ngồi riêng** gồm cả người lẫn ghế. Tay đặt lên bàn phím thật của bàn, có animation làm việc theo trạng thái. Ghế rời của bàn đó bị ẩn trong lúc có người ngồi.
- Vẽ lại bàn và ghế theo cùng phong cách, cho khớp tỉ lệ nhân vật mới.
- Bản thử (giai đoạn này):
  - Trưởng phòng: sheet đứng/đi và sheet ngồi.
  - Một cặp sheet chung (đứng/đi và ngồi) cho các agent chưa có sheet riêng.
  - Bàn, bàn Trưởng phòng, ghế, ghế Trưởng phòng.
  - Code chạy hoàn toàn trên hệ mới.

## Ngoài phạm vi

- Sheet riêng của 8 agent còn lại: vẽ sau khi bạn duyệt bản thử. Trong lúc chờ, họ dùng sheet chung đổi màu theo `shirt`, `hair`, `pants`.
- Màn hình, bàn phím, đồ cá nhân trên bàn (`kit_*`); các đồ đạc khác; phần 2 (hoạt động) và phần 3 (thời tiết).

## Định dạng sprite

| Sprite | Kích thước × khung | Anchor | Ghi chú |
|---|---|---|---|
| `char_<kit>`, `char` (chung) | 64×64 × 9 | [16, 32] | đứng và đi |
| `sit_<kit>`, `sit` (chung) | 64×64 × 8 | [16, 32] | ngồi ở bàn, có ghế |
| `desk` | 64×32 | — | footprint giữ nguyên |
| `deskBoss` | 96×32 | — | |
| `chair` | 32×32 | — | một kiểu cho mọi bàn thường; bỏ `chair2` |
| `chairBoss` | 32×32 | — | ghế bành của Trưởng phòng |

- Anchor [16, 32]: hộp 64×64 nằm giữa ô nhân vật đứng hoặc ngồi.
- Sheet đứng/đi: chân ở hàng 58–60; hàng 61–63 để trống.
- Người cao 56–60px, khoảng 4,5 đầu (đầu 13–14px).
- **Sheet ngồi:** góc 3/4 sau. Ghế nằm ở dưới, chân ghế chạm hàng 60. Đỉnh đầu không cao hơn hàng 20 của sprite, để đầu nằm dưới màn hình (màn hình kết thúc ở hàng 12 của ô bàn). Hai tay vươn lên đặt vào vùng bàn phím, ở hàng 8–24 của ô bàn, tức hàng 8–24 và cột 16–47 của sprite.
- Chỉ dùng màu có trong `palette.json`; pixel đục hoàn toàn hoặc trong suốt hoàn toàn. Bảng màu thêm các ramp 4–5 tông có hue shift.
- Sheet chung (`char`, `sit`) dùng 3 key color cho áo, tóc, quần để `agentColorMap` đổi màu được; không có phụ kiện.

## Bộ khung

**Đứng/đi (`char*`, 9 khung):**

| # | `FRAMES` | Góc | Dùng khi |
|---|---|---|---|
| 0 | `idle1` | 3/4 trước | đứng yên, nhịp thở 1 (600ms) |
| 1 | `idle2` | 3/4 trước | đứng yên, nhịp thở 2 (400ms), vai hạ 1px |
| 2–5 | `walk1`–`walk4` | 3/4 trước | đi xuống hoặc đi ngang; 150ms mỗi khung |
| 6 | `back` | 3/4 sau | đứng quay lưng; nhịp giữa khi đi lên |
| 7–8 | `walkBack1`, `walkBack2` | 3/4 sau | đi lên: vòng 7 → 6 → 8 → 6, 150ms mỗi khung |

**Ngồi (`sit*`, 8 khung):**

| # | `SIT_FRAMES` | Trạng thái agent | Animation |
|---|---|---|---|
| 0–3 | `type1`–`type4` | `working` | gõ phím: hai tay luân phiên, đầu gật nhẹ ở khung 2; 180ms mỗi khung |
| 4–5 | `wait1`, `wait2` | `waiting` | ngả lưng, một tay chống cằm; khung 5 gõ ngón tay lên bàn; 500ms |
| 6–7 | `error1`, `error2` | `error` | hai tay ôm đầu, vai rung 1px; 300ms |

**Quy tắc `flip`** (sprite vẽ mặt hướng xuống-phải):
- Đi sang trái: bật. Đi sang phải: tắt.
- Đi xuống: tắt.
- Đi lên, dừng lại: giữ nguyên.
- Sheet ngồi không lật.

**Ngồi ở đâu:** sheet ngồi chỉ dùng khi chỗ làm việc là ghế của một bàn (`desk.seat`). Agent làm việc ở chỗ khách (`layout.guest`) thì đứng, dùng khung idle.

## Thay đổi code

1. **`actors.js`**
   - `FRAMES` (9 khung) và `SIT_FRAMES` (8 khung).
   - `Actor.sprite` trả về `{ sheet: 'char' | 'sit', frame, flip }` theo hai bảng trên. Thêm đồng hồ thở và đồng hồ làm việc.
   - `Actor.seatedAtDesk`: đã đến ghế của một bàn và đang ở trạng thái làm việc.
   - Bỏ `ACC_VIEW` và `accFrame`.
   - `pickActor(actors, x, y, metaFor, opaque)`: thêm `opaque(actor, lx, ly)` để chỉ nhận cú bấm vào pixel có màu (lx, ly tính trong khung đang hiển thị, đã lật). Mặc định trả về true.
2. **`sprites.js`**
   - `addAgentSprite` tạo `char:<key>` và `sit:<key>`: dùng sheet riêng nếu có, không thì đổi màu sheet chung.
   - Bỏ phần dán phụ kiện.
   - Thêm `opaqueAt(sprites, name, frame, flip, lx, ly)`; đọc `getImageData` một lần cho mỗi sheet rồi giữ lại.
3. **`room.js`**
   - `drawDynamic` vẽ người bằng `actor.sprite`.
   - Bỏ qua ghế rời ở những bàn đang có người ngồi.
   - Ghế: `chairBoss` cho bàn `boss`, `chair` cho các bàn còn lại.
   - Thêm helper thuần `occupiedSeats(actors)` để test được.
4. **`shadow.js`**
   - `footShadow` dùng bán kính cố định (rx 10, ry 2), đặt giữa hộp, `cy = box.y + box.h - 5`.
   - Người đang ngồi không có bóng chân; bóng của ghế (đã có trong `staticShadows`) vẫn giữ.
5. **`main.js`**: `actorAt` truyền `opaque`; cấu hình dự phòng bỏ `acc`.
6. **`overlay.js`**: dùng meta của sheet đang hiển thị để đặt nhãn tên và bong bóng.
7. **`layout.json`**: bỏ trường `acc`.
8. **Art**
   - Xoá `acc_*.png`, `char_qa.png`, `char_build.png`, `chair2.png` và mục manifest tương ứng.
   - Vẽ mới hoặc vẽ lại: `char`, `sit`, `char_boss`, `sit_boss`, `desk`, `deskBoss`, `chair`, `chairBoss`.
9. **`art-preview.html`**: ô 64×64, hiện đủ khung của cả hai sheet, kèm tên khung.

## Phong cách (bắt buộc cho mọi sprite trong bản thử)

- Ánh sáng trên-trái. Ramp 4–5 tông có hue shift: bóng ngả tím hoặc xanh lạnh, sáng ngả vàng ấm.
- Sel-out: viền ngoài là tông tối của màu bên trong; phía sáng nhạt hơn, phía tối đậm hơn; không dùng đen thuần.
- Nét bên trong tối hơn mảng một bậc. AA thủ công ở đường cong bên trong; không AA viền ngoài.
- AO dưới cằm, chỗ tay áp thân, dưới thắt lưng, chỗ người chạm ghế. Viền sáng 1px ở mép trên-trái.
- Mặt 3/4: mắt 2×2 hoặc 2×3 có 1px điểm sáng, mắt xa hẹp hơn, lông mày, mũi gợi bằng bóng, miệng 1–2px.
- Dáng: dồn trọng tâm một chân, tay tách khỏi thân, đạo cụ ở tay phía gần.
- `pixel_lint` từ 90 điểm trở lên.
- **Bàn và ghế:** khối 3/4 (mặt trên, mặt trước, mặt bên phải), gỗ óc chó hoặc mật ong với ramp 5 tông, vân gỗ thưa, mép trên-trái có ánh sáng, AO ở chân.
  - Ghế văn phòng: lưng cong, có tay vịn, chân sao 5 cánh, bánh xe.
  - Ghế Trưởng phòng: ghế bành da teal lưng cao, viền đinh tán vàng.

**Trưởng phòng:** cao, vai rộng, blazer teal, sơ mi kem, cà vạt đất nung, tóc muối tiêu chải ngược, ria mép. Đứng một tay chống hông, tay gần cầm cốc cà phê bốc hơi. Khi ngồi, cốc đặt trên bàn cạnh bàn phím.

## Cách vẽ (MCP pixelart, không model tạo ảnh, không script vẽ tự viết)

1. Vẽ bàn và ghế trước, để có kích thước thật khi vẽ sheet ngồi.
2. Sheet đứng/đi:
   - Khung 0 vẽ tay theo thứ tự: silhouette → mảng màu → bóng → sel-out → chi tiết → lint.
   - Khung 1: copy khung 0 rồi hạ vai 1px.
   - Khung 2–5: thử `pixel_define_rig` + `pixel_render_motion`. Nếu tay chân bị méo ở góc 3/4, vẽ tay hai khung chạm đất rồi copy thân.
   - Khung 6 vẽ tay; khung 7–8 lấy từ khung 6.
3. Sheet ngồi:
   - Vẽ tay khung 0 trên nền là ảnh ghép thử bàn + ghế ở đúng vị trí trong văn phòng (canvas tạm, không đưa vào art).
   - Khung 1–3: đổi vị trí tay. Khung 4–7: đổi tay, đầu và lưng từ khung 0.
4. Sheet chung làm theo cùng quy trình, dùng key color.

## Test

- **`actors.test.js`**
  - Chọn đúng sheet và khung: đứng thở (0/1 theo thời gian), đi xuống, đi ngang, đi trái có lật, đi lên theo vòng 7-6-8-6.
  - Ngồi ở bàn: `working` thì chạy 0–3, `waiting` thì 4–5, `error` thì 6–7.
  - Làm việc ở chỗ khách thì đứng.
  - `pickActor` bỏ qua pixel trong suốt và chọn người phía sau. Xoá các test `accFrame`.
- **`room.test.js`**: `occupiedSeats` chỉ chứa ghế có người đang ngồi.
- **`shadow.test.js`**: `footShadow` với hộp 64×64.
- **`art.test.js`**
  - `REQUIRED`: `char` [64, 64, 9], `sit` [64, 64, 8], `chairBoss` [32, 32, 1]; bỏ `acc_*` và `chair2`.
  - Mọi `char*` là 64×64×9 và mọi `sit*` là 64×64×8, anchor [16, 32].
  - Sheet đứng/đi không có pixel ở hàng 61 trở xuống.
  - Không còn mục manifest nào bắt đầu bằng `acc_`.
  - `OWN_SHEETS` = [`char_boss`, `sit_boss`].
- **Chạy thật** (cổng 4849, phát lại demo):
  - Nhân vật đứng giữa ô. Khi ngồi, ghế rời biến mất và tay nằm trên bàn phím. Màn hình vẫn nhìn thấy, không bị đầu che.
  - Bấm trúng người, bấm vào khoảng trống thì không chọn ai. Nhãn tên và bong bóng đúng chỗ. Không có lỗi console.
  - Gửi ảnh chụp, GIF đứng thở/đi bộ và GIF ngồi gõ phím của Trưởng phòng.

## Rủi ro

- **Rig:** `pixel_render_motion` được thiết kế cho dáng nhìn ngang, có thể làm méo tay chân ở góc 3/4. Khi đó vẽ tay (bước 2).
- **Sheet chung:** phải hợp với nhiều màu áo, tóc, quần, nên ít chi tiết hơn sheet riêng.
- **Khối lượng:** bản thử gồm 4 sheet nhân vật (34 khung) và 4 đồ vật. Nếu Trưởng phòng chưa đạt, mình gửi ảnh cho bạn xem trước khi vẽ sheet chung.
