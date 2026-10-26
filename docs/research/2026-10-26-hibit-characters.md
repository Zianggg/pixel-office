# Nhân vật Hi-Bit / Neo-Retro 64×64, dáng 3/4: nghiên cứu và đề xuất

Ngày: 2026-10-26 · Trạng thái: đề xuất, chờ duyệt

Yêu cầu: bỏ toàn bộ thiết kế nhân vật cũ (thân chung `char` đổi màu, phụ kiện `acc_*`, ba bản thử `char_boss/qa/build`). Vẽ lại ở khung 64×64 theo phong cách hiện đại, chi tiết cao (Hi-Bit / Neo-Retro). Dáng idle nghiêng 3/4 thay vì nhìn thẳng.

## 1. Hi-Bit / Neo-Retro là gì

- Hi-Bit là pixel art "nhìn như 16-bit nhưng không bị giới hạn phần cứng": vẫn thấy rõ từng pixel, nhưng sprite lớn hơn, nhiều màu hơn, chuyển động mượt hơn, và có hiệu ứng hiện đại (ánh sáng động, bóng, hạt) vẽ đúng lưới pixel. Ví dụ: Sea of Stars, The Messenger, Eastward, Owlboy, CrossCode.
- Sea of Stars: nhà làm game muốn cảm giác cuối thập niên 90. Nhân vật có màu nhấn từ ánh sáng động; bóng, hạt và hiệu ứng đều vẽ cùng tỉ lệ pixel nên không bị lạc tông. Biểu cảm đến từ việc đổi dáng rõ ràng giữa các khung.
- Một nghiên cứu (Theseus) xếp các yếu tố sau là dấu hiệu Hi-Bit, khác pixel cổ điển: hiển thị pixel-perfect, normal map, animation bằng xương.
- **Giới hạn cần giữ:** sprite quá to và quá nhiều chi tiết sẽ mất cảm giác "mỗi pixel đặt có chủ đích". Hi-Bit vẫn cần mảng màu gọn (cluster) và bảng màu chọn lọc.

## 2. Kỹ thuật cho sprite 64×64

- **Kích thước:** 64×64 là cỡ bắt đầu đủ chỗ cho một ramp đầy đủ trên mặt cong (32×32 chỉ đủ tông gốc, bóng và sáng). Với nhân vật cao khoảng 64px, đầu nên cao 14–18px, mắt 2×2 hoặc 2×3, có 1px ánh sáng trong mắt.
- **Ramp:** 4–5 tông mỗi vật liệu, có hue shift (bóng ngả lạnh, sáng ngả ấm). Khoảng 24–32 màu cho một nhân vật.
- **Selective outline (sel-out):** viền dùng tông tối của màu bên trong. Phía được chiếu sáng viền nhạt hơn, phía tối viền đậm hơn. Viền phải luôn tăng tương phản với nền.
- **Nét bên trong:** tối hơn mảng một bậc. Nét giữa hai mảng lấy màu của mảng gần mắt hơn hoặc mảng nằm trong bóng. Nét có thể đứt ở chỗ bóng để mắt người xem tự nối.
- **Khử răng cưa thủ công (manual AA):** một tông trung gian ở các đường cong và đường xiên bên trong. Không làm ở viền ngoài, để khỏi bị quầng sáng khi nhân vật đứng trên nền khác màu.
- **Cluster:** tránh các pixel lẻ gây nhiễu; dùng `pixel_lint` để kiểm tra.
- **Khối:** thân và tay chân tô như hình trụ, đầu như hình cầu. AO (nét tối nhất) ở chỗ tay áp thân, dưới cằm, dưới thắt lưng. Viền sáng 1px ở mép trên-trái. Bóng đổ dưới chân do code vẽ (`shadow.js`, đã có).
- **Mặt:** mắt, lông mày, mũi chỉ gợi bằng một điểm bóng, miệng 1–2px. Đủ để có biểu cảm ở mức phóng to của văn phòng.

## 3. Dáng 3/4

- Góc 3/4 là trung gian giữa nhìn thẳng và nhìn ngang, cho cảm giác có chiều sâu.
- Đường giữa mặt lệch về phía xa. Mắt xa hẹp hơn. Vai và tay phía xa ngắn và tối hơn; tay chân phía gần to và sáng hơn.
- Dồn trọng tâm một chân (contrapposto). Tay tách khỏi thân. Đạo cụ cầm ở tay phía gần.
- **Idle "thở":** 2 khung, lệch 1px (vai hạ, tóc hoặc áo trễ một nhịp). Thời lượng khung không đều, ví dụ 600ms và 400ms.
- **Đi bộ:** 4 khung, mỗi khung 100–150ms. Thân hạ xuống khi chân chạm đất, tay vung ngược chân.
- MCP pixelart có `pixel_define_rig` + `pixel_render_motion`: vẽ tay chân tách rời một lần, máy tự xoay ra các khung đi. Có thể dùng cho khung đi để giảm công vẽ tay.

## 4. Ảnh hưởng tới code hiện tại

| Chỗ | Hiện tại | Cần đổi |
|---|---|---|
| Kích thước và anchor (manifest) | 32×64, anchor [0,32] | 64×64, anchor [16,32] để nhân vật nằm giữa ô đứng. `spriteBox` và overlay đã đọc anchor nên tự theo. |
| Khung hình (`FRAMES`, `Actor.frame`) | 8 khung: nhìn thẳng, lưng, đi xuống ×2, đi ngang ×2, gõ ×2 | Bộ khung mới theo 3/4 (mục 5) |
| Bấm chọn nhân vật (`pickActor`) | Bấm vào hình chữ nhật | Khung rộng 64 sẽ đè lên người đứng cạnh, nên chỉ nhận cú bấm vào pixel có màu |
| Bóng chân (`footShadow`) | rx = 30% bề rộng | Đổi sang bán kính cố định, vì bề rộng khung không còn bằng bề rộng người |
| Đổi màu + phụ kiện | `char` + `acc_*` + `ACC_VIEW` | Bỏ. Agent lạ dùng một sheet 64×64 chung, vẫn đổi màu bằng key color nhưng không có phụ kiện. |
| Test | `char` [32,64,8], `acc_*` | Viết lại theo kích thước và bộ khung mới |

## 5. Đề xuất

**Tỉ lệ:** khung 64×64, người cao khoảng 56–60px, khoảng 4,5 đầu (đầu ~13–14px). Chiều cao giữ gần như hiện tại để vẫn khớp với bàn, cửa và tủ. Bề ngang gấp đôi dành cho dáng 3/4, tay làm động tác và đạo cụ.

**Hướng nhìn:** chỉ dùng hai góc 3/4.
- 3/4 trước, mặt hướng xuống-phải: dùng khi đứng yên, đi xuống, đi sang phải. Lật ngang cho hướng trái.
- 3/4 sau: dùng khi đi lên và khi ngồi gõ phím ở bàn.

**Bộ khung (11):**

| # | Khung | Ghi chú |
|---|---|---|
| 0–1 | idle 3/4 trước | thở 2 nhịp |
| 2–5 | đi 3/4 trước | 4 nhịp |
| 6 | đứng 3/4 sau | |
| 7–8 | đi 3/4 sau | 2 nhịp |
| 9–10 | ngồi gõ phím (3/4 sau) | 2 nhịp |

**Phong cách:** ramp 4–5 tông có hue shift, sel-out, AA thủ công bên trong, viền sáng trên-trái, AO, mặt có biểu cảm, mỗi người một màu chủ đạo và một đạo cụ (giữ bảng thiết kế trong `2026-10-26-character-style.md`). Bảng màu mở rộng thêm các ramp 5 tông cho da, tóc và vải.

**Cách làm:**
1. Vẽ thử một người: Trưởng phòng, đủ 11 khung. Sửa code theo mục 4 để xem được trong văn phòng.
2. Bạn duyệt.
3. Vẽ 8 người còn lại và sheet chung cho agent lạ.

Khối lượng: 9 người × 11 khung = 99 khung 64×64, cộng sheet chung. Mỗi người vẽ tay 3 khung gốc (idle trước, đứng sau, ngồi gõ); khung thở, khung đi và khung gõ thứ hai dựng bằng copy_region hoặc rig.

## Nguồn

- [Theseus — thesis on hi-bit pixel art](https://www.theseus.fi/bitstream/handle/10024/501981/?sequence=2)
- [Megavisions — The art of Sea of Stars](https://www.megavisions.net/the-art-of-sea-of-stars-a-sea-of-pixels/)
- [LRM Online — Sea of Stars interview](https://lrmonline.com/news/how-the-retro-inspired-sea-of-star-captures-the-feeling-of-90s-rpgs-exclusive-interview/)
- [DearGamers — Sea of Stars lighting](https://www.deargamers.net/features/sea-of-stars-proves-turn-based-rpgs-are-alive-and-kicking)
- [ResetEra — Sea of Stars pixel art thread](https://www.resetera.com/threads/its-frankly-insane-how-good-sea-of-stars-pixel-art-is.1048128/)
- [Game Developer — Road to the IGF: Eastward](https://www.gamedeveloper.com/disciplines/road-to-the-igf-pixpil-s-i-eastward-i-)
- [Lospec — Pixel art outlines, part 2: using color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color)
- [Wesnoth wiki — How to anti-alias sprite art](https://wiki.wesnoth.org/How_to_anti-alias_sprite_art)
- [Binus journal — pixel art detail vs. size](https://journal.binus.ac.id/index.php/ijvcdc/article/download/8238/4731/52848)
- [Sprite AI — 64×64 sprites](https://www.sprite-ai.art/gallery/64x64)
- [itch.io — pixel art idle cycle tutorial](https://itch.io/blog/559673/pixel-art-idle-cycle-animation-tutorial)
- [itch.io — hero idle animation](https://itch.io/t/2489389/pixel-tutorial-hero-idle-animation)
- [Creative Bloq — Pedro Medeiros' GIF tutorials](https://creativebloq.com/news/artist-makes-animated-gif-tutorials-to-teach-you-pixel-art)
- Hướng dẫn `characters`, `sizing`, `animation`, `shading` của MCP pixelart
