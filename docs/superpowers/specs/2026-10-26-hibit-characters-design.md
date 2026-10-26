# Nhân vật Hi-Bit 64×64, góc 3/4: spec

Ngày: 2026-10-26 · Branch: `feat/retro-rooms` · Nghiên cứu: `docs/research/2026-10-26-hibit-characters.md`

## Mục tiêu

- Bỏ toàn bộ art nhân vật cũ. Mỗi agent có một sheet riêng 64×64 theo phong cách Hi-Bit / Neo-Retro.
- Chỉ dùng hai góc 3/4. Đứng yên là dáng 3/4 trước, không còn nhìn thẳng.
- Giai đoạn này (bản thử) vẽ **Trưởng phòng** và **một sheet chung** cho agent chưa có sheet riêng. Code chạy hoàn toàn trên hệ mới; không giữ song song hệ 32×64.

## Ngoài phạm vi

- 8 agent còn lại: vẽ sau khi bạn duyệt bản thử. Trong lúc chờ, họ hiện bằng sheet chung đã đổi màu theo `shirt`, `hair`, `pants` của mình.
- Vẽ lại đồ đạc, hoạt động ở pantry/phòng game (phần 2), thời tiết (phần 3).

## Định dạng sprite

- `manifest.json`: `"char_<kit>": { "w": 64, "h": 64, "frames": 11, "anchor": [16, 32] }` và `"char"` (sheet chung) cùng kích thước.
- Anchor [16, 32]: hộp 64×64 nằm giữa ô 32px nơi nhân vật đứng; chân ở hàng 58–60 của sprite; hàng 61–63 để trống.
- Người cao 56–60px, khoảng 4,5 đầu (đầu 13–14px).
- Chỉ dùng màu có trong `palette.json`; pixel phải đục hoàn toàn hoặc trong suốt hoàn toàn (test sẵn có). Bảng màu thêm các ramp 4–5 tông có hue shift cho da, tóc và vải.
- Sheet chung `char`: dáng 3/4 giống sheet riêng nhưng đơn giản hơn. Áo, tóc, quần vẽ bằng 3 key color mỗi phần (như hiện nay) để `agentColorMap` đổi màu được. Không có phụ kiện.

## Bộ khung

| # | Tên trong `FRAMES` | Góc | Dùng khi |
|---|---|---|---|
| 0 | `idle1` | 3/4 trước | đứng yên, nhịp thở 1 (600ms) |
| 1 | `idle2` | 3/4 trước | đứng yên, nhịp thở 2 (400ms), vai hạ 1px |
| 2–5 | `walk1`–`walk4` | 3/4 trước | đi xuống hoặc đi ngang; 150ms mỗi khung |
| 6 | `back` | 3/4 sau | đứng quay lưng; cũng là nhịp giữa của bước đi lên |
| 7–8 | `walkBack1`, `walkBack2` | 3/4 sau | đi lên: vòng 7 → 6 → 8 → 6, 150ms mỗi khung |
| 9–10 | `type1`, `type2` | 3/4 sau, ngồi | ngồi ở bàn; gõ phím thì luân phiên 250ms, không gõ thì giữ `type1` |

Sprite vẽ mặt hướng xuống-phải. Quy tắc `flip` (lật ngang):
- Đi sang trái: bật. Đi sang phải: tắt.
- Đi xuống: tắt.
- Đi lên, dừng lại, ngồi: giữ nguyên giá trị đang có.

## Thay đổi code

1. **`actors.js`**
   - `FRAMES` theo bảng trên.
   - `Actor.frame` chọn khung theo bảng. Thêm đồng hồ thở chạy khi đứng yên.
   - Bỏ `ACC_VIEW` và `accFrame`.
   - `pickActor(actors, x, y, metaFor, opaque)`: thêm tham số `opaque(actor, lx, ly)` để chỉ nhận cú bấm vào pixel có màu. `lx`, `ly` là toạ độ trong khung đang hiển thị, đã tính lật ngang. Mặc định luôn trả về true để test cũ vẫn chạy.
2. **`sprites.js`**
   - Bỏ phần dán phụ kiện trong `addAgentSprite`.
   - Thêm `opaqueAt(sprites, key, frame, flip, lx, ly)`: đọc alpha của sheet; lấy `getImageData` một lần cho mỗi sheet rồi giữ lại.
3. **`main.js`**: `actorAt` truyền `opaque` vào `pickActor`. Cấu hình dự phòng bỏ `acc`.
4. **`shadow.js`**: `footShadow` dùng bán kính cố định (rx 10, ry 2), đặt giữa hộp, `cy = box.y + box.h - 5`.
5. **`layout.json`**: bỏ trường `acc` của các agent.
6. **Art**
   - Xoá `acc_*.png`, `char_qa.png`, `char_build.png` và mục manifest tương ứng.
   - Vẽ lại `char.png` và `char_boss.png` theo định dạng mới.
7. **`art-preview.html`**: ô nhân vật 64×64, hiện đủ 11 khung, ghi chú tên khung.

## Phong cách (bắt buộc cho mọi sheet)

- Ánh sáng trên-trái. Ramp 4–5 tông có hue shift: bóng ngả tím hoặc xanh lạnh, sáng ngả vàng ấm.
- Sel-out: viền ngoài là tông tối của màu bên trong. Phía sáng viền nhạt hơn, phía tối viền đậm hơn. Không dùng đen thuần.
- Nét bên trong tối hơn mảng một bậc. AA thủ công ở đường cong bên trong; không AA viền ngoài.
- AO dưới cằm, chỗ tay áp thân, dưới thắt lưng. Viền sáng 1px ở mép trên-trái.
- Mặt 3/4: mắt 2×2 hoặc 2×3 có 1px điểm sáng, mắt xa hẹp hơn, lông mày, mũi gợi bằng bóng, miệng 1–2px.
- Dáng: dồn trọng tâm một chân, tay tách khỏi thân, đạo cụ ở tay phía gần.
- Không có pixel lẻ gây nhiễu: `pixel_lint` đạt từ 90 điểm trở lên.

**Trưởng phòng:** cao, vai rộng, blazer teal, sơ mi kem, cà vạt đất nung, tóc muối tiêu chải ngược, ria mép. Một tay chống hông, tay gần cầm cốc cà phê bốc hơi. Màu chủ đạo: teal.

## Cách vẽ (MCP pixelart, không model tạo ảnh, không script vẽ tự viết)

1. Vẽ tay khung 0 (idle 3/4 trước): silhouette → mảng màu → bóng → sel-out → chi tiết → lint.
2. Khung 1: copy khung 0, hạ vai và đầu 1px, cho tóc và cốc trễ một nhịp.
3. Khung 2–5: vẽ tay chân tách rời rồi dùng `pixel_define_rig` + `pixel_render_motion`. Nếu rig không ra dáng 3/4 đẹp, vẽ tay hai khung chạm đất rồi copy thân sang các khung còn lại.
4. Khung 6 vẽ tay; khung 7–8 lấy từ khung 6 bằng cách đổi chân và tay.
5. Khung 9–10: dáng ngồi từ phía sau, khuỷu tay đặt lên bàn phím, khung 10 nhấc tay 1px.
6. Sheet chung làm theo cùng quy trình, dùng key color.

## Test

- **`actors.test.js`**
  - Khung được chọn đúng trong từng trường hợp: đứng thở (0/1 theo thời gian), đi xuống, đi ngang, đi trái có lật, đi lên theo vòng 7-6-8-6, ngồi gõ, ngồi không gõ.
  - `pickActor` bỏ qua pixel trong suốt và chọn người phía sau.
  - Xoá các test `accFrame`.
- **`shadow.test.js`**: `footShadow` với hộp 64×64.
- **`art.test.js`**
  - `REQUIRED.char` là [64, 64, 11]; bỏ `acc_*`.
  - Mọi `char*` là 64×64×11, anchor [16, 32].
  - Không có pixel ở hàng 61 trở xuống.
  - Không còn file hoặc mục manifest nào bắt đầu bằng `acc_`.
  - `OWN_SHEETS` = [`char_boss`].
- **Chạy thật:** mở văn phòng trên cổng 4849 và phát lại demo. Nhân vật đứng giữa ô, bấm trúng người, bấm vào khoảng trống thì không chọn ai, nhãn tên và bong bóng đặt đúng chỗ, không có lỗi console. Chụp màn hình và xuất GIF idle/đi bộ của Trưởng phòng để bạn duyệt.

## Rủi ro

- **Chiều cao:** người 64px sẽ cao hơn ghế khi ngồi. Cần thử khung gõ phím với `chair` và `deskBoss` thật.
- **Rig:** `pixel_render_motion` được thiết kế cho dáng nhìn ngang. Ở góc 3/4 nó có thể làm méo tay chân; khi đó dùng cách vẽ tay ở bước 3.
- **Khối lượng:** một sheet khoảng 4–6 lượt vẽ lớn. Nếu chất lượng chưa đạt, mình sẽ báo kèm ảnh trước khi làm sheet chung.
