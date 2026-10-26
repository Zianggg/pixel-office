# Ngôn ngữ thiết kế nhân vật Pixel Office (bản 3)

Ngày: 2026-10-26 · Trạng thái: đề xuất, chờ duyệt bằng ảnh preview · **Thay cho bản 2** (`2026-10-26-character-design-language.md`, mannequin 3 đầu) và các bản trước.

Nguyên văn yêu cầu: "bỏ toàn bộ thiết kế nhân vật cũ đi, tham khảo các nhân vật của game pixel nổi tiếng như deadcell, blasphemos, hades, tập trung vào bố cục nhân vật, tỉ lệ khuôn mặt và cơ thể cùng với cách vẽ chi tiết nhân vật".

**Nguyên tắc:** chỉ học cách làm (bố cục, silhouette, tỉ lệ, cách tách khối và đổ bóng). Không chép nhân vật, trang phục hay biểu tượng của các game này. Hades là tranh vẽ tay, không phải pixel art; từ Hades chỉ lấy tỉ lệ và độ rõ của silhouette, rồi chuyển sang pixel.

## 1. Quan sát từ ba game

| | Dead Cells | Blasphemous | Hades |
|---|---|---|---|
| Kỹ thuật | Dựng 3D rồi render ra pixel bằng công cụ riêng; bảng màu bão hoà; mục tiêu "neo-retro" | Pixel vẽ tay hoàn toàn, không shader, không 3D; sprite lớn, animation vẽ từng khung | Tranh vẽ tay; nét ngoài dày đều, nét trong mảnh dần |
| Tỉ lệ | Khoảng 6 đầu; đầu nhỏ, vai rộng, quần ống phồng | Khoảng 6 đầu; đầu nhỏ (mũ cao kéo dài silhouette), vai rộng gù về trước | Khoảng 7–7,5 đầu; đầu nhỏ với tóc lớn, vai rộng, eo hẹp, chân dài |
| Dáng | Hai chân dạng, gối chùng, thân nghiêng về trước, sẵn sàng hành động | Dáng nặng, trọng tâm thấp, tay cầm vũ khí xa khỏi thân | Đứng rộng, vai mở, các khối rõ ràng |
| Bất đối xứng | Giáp vai một bên, khăn quàng | Áo choàng và dải vải lệch một bên | Áo choàng một vai, trang phục chia nửa đỏ/đen |
| Màu và sáng tối | Một màu nhấn đỏ trên nền trầm; tương phản mạnh | Gần như toàn bóng tối; viền sáng lạnh ở mép; một màu đỏ thẫm | Một màu bão hoà chủ đạo trên mảng đen lớn; ranh giới sáng–tối có hue shift |
| Mặt | Không có mặt (đầu lửa); nhận ra nhờ hình đầu | Bị mũ che hết | Nét mặt góc cạnh, đọc nhờ lông mày và bóng hốc mắt |
| Chi tiết | Tập trung ở vai, đầu, vũ khí | Rất dày ở giáp và vải, theo từng cụm | Dày ở vùng mặt và thân trên, chân đơn giản |

**Điểm chung:**
1. **Đầu nhỏ, thân dài (6–7 đầu).** Người được nhận ra nhờ silhouette của vai, đồ nghề và kiểu tóc hay mũ, không nhờ nét mặt.
2. **Một chi tiết lớn kéo dài silhouette** (tóc, mũ, khăn, áo choàng, giáp vai), thường lệch một bên.
3. **Dáng có lực:** chân dạng, gối chùng, vai và đầu đưa về trước, tay tách khỏi thân.
4. **Mảng sáng tối lớn:** bóng chiếm 40–60% diện tích, viền sáng ở mép phía nguồn sáng. Chỉ một màu nhấn bão hoà, phần còn lại trầm.
5. **Chi tiết dồn về điểm nhìn** (đầu, vai, tay, đạo cụ); chân và vạt áo đơn giản.

## 2. Ngôn ngữ thiết kế bản 3 cho Pixel Office

### 2.1 Khung và tỉ lệ

- Khung 64×64, anchor [16, 32] (giữ nguyên code). Người cao 54–58px, chân chạm hàng 60.
- **Khoảng 5,5–6 đầu:** đầu 9–10px (chưa kể tóc hoặc mũ), vai 16–20px, eo 9–11px, chân dài khoảng một nửa chiều cao.
- Tóc hoặc mũ được phép vượt khỏi đầu 3–8px để tạo silhouette.

| Phần | Hàng | Ghi chú |
|---|---|---|
| Tóc/mũ + đầu | 2–14 | đầu 9–10px; mặt ở hàng 7–13 |
| Cổ | 14–15 | |
| Vai đến eo | 15–32 | vai ở hàng 16–17 rộng nhất; eo ở hàng 30–32 |
| Hông đến chân | 32–60 | chân khoảng 26–28px; gối ở khoảng hàng 46 |

### 2.2 Mặt (nhỏ, góc cạnh, nhìn 3/4 sang phải)

- Mặt rộng khoảng 7px, cao khoảng 7px.
- **Hốc mắt:** một dải bóng ngang 1px dưới lông mày, chạy qua cả hai mắt.
- **Mắt:** mắt gần là 1×2px tối, có 1px sáng nếu cần ánh nhìn; mắt xa 1px.
- **Mũi:** một bậc lồi 1px ở viền phải của mặt.
- **Miệng và cằm:** miệng 1–2px; cằm và hàm vuông, có bóng dưới cằm.
- **Tai:** 1–2px ở phía xa.
- Biểu cảm đến từ góc lông mày và tư thế đầu, không đến từ mắt to.

### 2.3 Silhouette và bố cục

- Mỗi người có: **1 chi tiết đầu** (kiểu tóc hoặc mũ), **1 chi tiết vai hoặc cổ lệch một bên** (khăn, dây đeo thẻ, áo khoác vắt vai, giáp vai, túi đồ), **1 đạo cụ cầm tay**.
- Dáng: chân dạng rộng hơn vai một chút; gối chân sau chùng; thân nghiêng 1–2px về hướng nhìn; tay tách khỏi thân.
- Kiểm tra: tô đen toàn bộ vẫn nhận ra vai trò.

### 2.4 Màu và đổ bóng

- Bóng cel vẽ tay, 3 tông mỗi chất liệu (sáng, gốc, bóng), cộng 1 tông bóng sâu dùng chung cho cả người (tím đen lạnh) để gom thành mảng tối lớn.
- Ánh sáng trên-trái. Thêm viền sáng 1px ở mép trái/trên, tông lạnh nhạt.
- **Một màu nhấn bão hoà mỗi người.** Các mảng còn lại hạ độ bão hoà.
- Mảng bóng phủ cả nửa phải của thân, mặt dưới tay, bên trong áo khoác, dưới vành tóc.

### 2.5 Nét và chi tiết

- Viền ngoài 1px tối, đều, có màu (không dùng đen thuần). Nét trong chỉ đặt ở chỗ tách khối và để mảnh hơn: dùng tông bóng thay vì tông viền.
- Chi tiết là các cụm 2–4px (nút, đường may, nếp áo, ánh kim), dồn về đầu, vai, tay và đạo cụ. Chân và vạt áo dưới để đơn giản.
- Không dùng `shade_region` hay `outline_sprite` cho nhân vật; tất cả vẽ tay bằng `paint_grid` hoặc `draw_pixels`. Kiểm tra bằng `pixel_lint` để không còn pixel lẻ.

### 2.6 Đổi màu cho agent

- Sheet riêng (`char_<kit>`, `sit_<kit>`) vẽ bằng màu cuối cùng.
- Sheet chung (`char`, `sit`) giữ key color (`palette.keys`: áo, tóc, quần, mỗi phần 3 tông) để 9 agent đổi được màu áo, tóc, quần. Tông bóng sâu và viền là màu cố định, không thuộc key.

## 3. Kế hoạch

1. **Preview:** vẽ Trưởng phòng khung 0 (idle 3/4) theo bản 3, kèm bản silhouette đen và một thước tỉ lệ. Đặt lên sàn cạnh bàn và ghế, gửi ảnh 1× và 4×. **Dừng chờ duyệt.**
2. Khi được duyệt: sửa spec (mục Tỉ lệ và Phong cách), vẽ nốt các khung của Trưởng phòng, rồi tiếp tục kế hoạch cũ từ Task 5 đến Task 8. Code không đổi.

## Nguồn

- [80.lv — Interview with the developers of Dead Cells](https://80.lv/articles/interview-with-the-developers-of-dead-cells)
- [GoNintendo — Dead Cells dev blog: art design deep dive](https://gonintendo.com/archives/280488-dead-cells-dev-blog-art-design-deep-dive-giving-back-colors-to-cryptic-worlds)
- [WN Hub — Dead Cells 3D-to-pixel pipeline](https://wnhub.io/news/art/item-13775)
- [Hollywood Reporter — Blasphemous purist pixel art approach](https://www.hollywoodreporter.com/heat-vision/blasphemous-designer-purist-approach-games-pixel-art-style-1238370)
- [HeavyMag — interview with The Game Kitchen](https://heavymag.com.au/interview-blasphemous-the-game-kitchen/)
- [Blasphemous BackerKit update — character design process](https://blasphemous.backerkit.com/hosted_preorders/project_updates?page=7)
- [Niche Gamer — Blasphemous spotlight](https://nichegamer.com/2017/07/17/niche-spotlight-blasphemous-gorgeous-pixelated-yet-brutal-hand-crafted-2d-action-platformer/)
- [Wikipedia — Jen Zee](https://en.wikipedia.org/wiki/Jen_Zee)
- [Kymira — Style study: Hades](https://kymira.bearblog.dev/style-study-hades/)
- [Kotaku — The Art of Hades](https://kotaku.com/the-art-of-hades-1845443438)
- Ảnh tham khảo xem qua Bing Images: Penitent One (sprite trong game và bảng "pixel art evolution" từ artbook), The Beheaded (sprite trong game), bảng turnaround Zagreus.
