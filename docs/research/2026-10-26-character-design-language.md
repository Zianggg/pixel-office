# Ngôn ngữ thiết kế nhân vật Pixel Office (bản 2)

Ngày: 2026-10-26 · Trạng thái: **ĐÃ THAY THẾ** bởi `2026-10-26-character-design-language-v3.md` (người dùng bỏ hướng mannequin 3 đầu)

Người dùng nhận xét Trưởng phòng 64×64 (commit b1f2119) có bố cục khuôn mặt và cơ thể chưa đạt, và yêu cầu dựa vào 3 video dưới đây để làm lại toàn bộ ngôn ngữ thiết kế nhân vật.

## 1. Ba video đã xem

YouTube chặn tải transcript, nên các ghi chú dưới đây lấy từ tiêu đề, phần mô tả, danh sách chương và các khung hình mình tua tới rồi phóng to.

### A. AdamCYounis — "Drawing a pixel character from *scratch*" (21:51)

Các chương: Brief → Finding the Pose → Secondary Shapes & Costume → Lighting Armour → Costume Round 2 → Refinements → Process Review.

- **Đặt cạnh nhân vật chính ngay từ đầu.** Một khối silhouette tối được đặt bên cạnh nhân vật chính có sẵn để chốt tỉ lệ trước khi vẽ bất cứ chi tiết nào.
- **Dáng đến trước, chi tiết đến sau.** Toàn bộ người là một mảng màu tối, cầm vũ khí theo một đường hành động (line of action) rõ ràng. Sau đó mới vẽ các mảng phụ: mũ trùm, khăn, thắt lưng, áo choàng.
- **Mảng to, ít màu.** Bản hoàn thiện gần như không có viền đen. Mỗi chất liệu chỉ 2–3 tông và mảng sáng tối gom thành khối lớn: thân tối, da và giáp sáng. Tay chân thon dần về cuối, bàn tay và bàn chân hơi to.
- **Nhân vật chính (Insignia) cao khoảng 50px:**
  - đầu và tóc chiếm khoảng 1/3 chiều cao, tóc là một khối gai đỏ tạo hình dáng riêng;
  - mắt to, có tròng trắng và con ngươi tối;
  - lông mày 1 nét, mũi 1 pixel bóng, miệng nhỏ;
  - vai hẹp hơn đầu, chân dài đi bốt, áo khoác dài mở vạt.

### B. Saultoons — "Pixel Art Character Design Tutorial - Step By Step!" (10:35)

Các chương: Reference → Silhouette → Style.

- **Tham khảo trước:** gom ảnh thật về đối tượng, rồi rút ra 2–3 đặc điểm nhận dạng.
- **Silhouette:** vẽ một khối đen đơn giản, thử nhiều biến thể, chọn cái đọc được ngay.
- **Phong cách:** lặp nhiều phiên bản đặt cạnh nhau. Luôn xem lại ở kích thước thật (cửa sổ preview 1×), vì chỉ ở cỡ đó mới biết thiết kế có đọc được không.

### C. Juniper Dev — "The ONLY Pixel Art Guide You Need" (15:01)

Các chương: Software → Color → Linework → Shading & Perspective → Defining Style → Tips.

- **Màu:** dùng bảng màu có sẵn hoặc tự chọn có chủ đích (ví dụ Resurrect 64); dùng quan hệ màu như analogous; giới hạn số màu.
- **Nét:** nét 1px sạch, không dày đôi, không răng cưa lẻ. Độ dốc nhất quán (1:1, 2:1).
- **Đổ bóng:** chọn một hướng sáng. Bóng kiểu cel 2 tông với ranh giới rõ, hình lưỡi liềm trên khối cầu. Cả một mặt tối đi theo hướng sáng, không pha nhiều tầng nhiễu.
- **Phong cách:** đặt luật rồi giữ nguyên cho mọi nhân vật (ví dụ Celeste: người nhỏ, đầu to, mặt tối giản nhưng đọc được ngay).

## 2. Vì sao Trưởng phòng bản trước chưa đạt

| Vấn đề | Nguyên nhân |
|---|---|
| Mặt không đọc được ở cỡ thật | Đầu chỉ khoảng 14/58px (hơn 4 đầu). Mắt là chấm 1–2px không có tròng trắng. Mặt bị tô cam đất gần hết. |
| Thân như cái hộp | Áo blazer là một khối chữ nhật: vai, eo, hông cùng bề rộng; chân là hai ống thẳng; không có đường hành động. |
| Bóng nhiễu | Dùng `shade_region` tự động nên các dải tông bị rải loang lổ, không gom thành mảng cel rõ ràng. |
| Viền không đều | `outline_sprite` tự động tạo viền dày mỏng khác nhau, có chỗ lem màu (ví dụ làn hơi cà phê). |
| Tay | Hai khối da vuông, không có ngón, không thon. |

## 3. Ngôn ngữ thiết kế mới

### 3.1 Tỉ lệ (khoảng 3 đầu)

Khung 64×64, anchor [16, 32]; người cao 56–58px, chân chạm hàng 60.

| Phần | Hàng (y) | Cao | Rộng |
|---|---|---|---|
| Đầu (kể cả tóc) | 3–22 | khoảng 20px | 18–22px; tóc có thể phồng thêm |
| Cổ | không vẽ hoặc 1px | | |
| Thân và áo | 22–40 | khoảng 18px | vai 16px, eo 12px |
| Chân và giày | 40–60 | khoảng 20px | mỗi chân 5–6px, giày hơi to |

- Đầu to để mặt đọc được khi văn phòng hiển thị ở 1× trên màn 1080p.
- Vai hẹp hơn hoặc bằng đầu. Tay chân thon dần; bàn tay 3×3–4×4 với ngón cái tách ra; giày dài hơn ống chân.
- Dáng người thay đổi theo vai trò bằng bề ngang thân và độ dài chân, không đổi kích thước đầu. Cả nhóm giữ cùng "khuôn mặt".

### 3.2 Khuôn mặt mẫu (dùng chung, nhìn 3/4 sang phải)

Vùng mặt khoảng 14×10px ở nửa dưới của đầu; nửa trên là tóc hoặc trán.

- **Mắt:** cao 3px.
  - Mắt gần cao 3 × rộng 3: cột trái trắng, giữa con ngươi tối, có 1px sáng.
  - Mắt xa cao 3 × rộng 2.
  - Hai mắt cách nhau 3px. Đường giữa mặt lệch về bên phải.
- **Lông mày:** 1 nét 2–4px; độ nghiêng thể hiện tính cách (nghiêm, vui, lo).
- **Mũi:** 1–2px bóng ở mép phải, không vẽ viền mũi.
- **Miệng:** 2–3px tông tối của da; đổi được theo biểu cảm khi làm việc hoặc báo lỗi.
- **Má:** tuỳ chọn 1–2px hồng.
- **Tai:** ở phía xa (bên trái), 2×3px.
- **Da:** 3 tông (sáng, gốc, bóng). Bóng chỉ nằm dưới tóc, dưới cằm và mép phải.

### 3.3 Hình khối theo tính cách

- Mỗi nhân vật dựng từ 3 khối lớn: **tóc/đầu**, **áo/thân**, **chân**, cộng **1 đạo cụ**.
- Chọn ngôn ngữ hình theo tính cách:
  - **vuông:** vững, mạnh (Trưởng phòng, Build, Setup);
  - **tròn:** thân thiện (QA, Review);
  - **tam giác:** sắc, nhanh (Thiết kế, Lập trình, Dựng cảnh, Kiến trúc sư).
- Tóc là chữ ký silhouette của từng người; không ai có kiểu tóc giống ai.
- Đạo cụ phải đọc được khi tô đen toàn bộ.

### 3.4 Dáng

- Có đường hành động hình chữ C hoặc S, dồn trọng tâm một chân, hai tay khác nhau, có khoảng trống giữa tay và thân.
- Dáng idle 3/4 phải "đang làm gì đó", theo bảng đạo cụ trong `2026-10-26-character-style.md`.

### 3.5 Màu và đổ bóng

- Mỗi nhân vật dùng tối đa 4 chất liệu. Mỗi chất liệu 3 tông: sáng, gốc, bóng; bóng ngả lạnh, sáng ngả ấm.
- Thêm 1 màu viền tối chung và 1 màu nhấn. Tổng khoảng 14–16 màu cho một sprite.
- **Bóng cel tô tay, ranh giới rõ, ánh sáng trên-trái.** Không dùng `shade_region` tự động trên nhân vật; chỉ dùng cho mảng lớn của đồ đạc nếu cần.
- Gom bóng thành mảng: cả cạnh phải của thân, dưới tóc, dưới cằm, chỗ tay áp thân.

### 3.6 Nét

- Viền 1px màu tối có sắc độ, không dùng đen thuần.
- Vẽ viền bằng tay (`paint_grid`), không dùng `outline_sprite` tự động.
- Độ dốc sạch (1:1, 2:1), không có pixel đôi ở góc.
- Nét bên trong chỉ đặt ở chỗ cần tách khối (tay trước thân, vạt áo).

### 3.7 Quy trình cho mỗi nhân vật (MCP pixelart)

1. **Brief:** vai trò, tính cách, hình khối, tóc, đạo cụ, màu chủ đạo.
2. **Silhouette:** vẽ 3 biến thể bằng một màu trên khung 64×64, đặt cạnh mannequin và bàn ghế, chọn bản đọc tốt nhất ở 1×.
3. **Mảng màu phẳng** theo các khối.
4. **Bóng cel tô tay**, 3 tông.
5. **Mặt** theo mẫu 3.2.
6. **Viền tay** và chi tiết.
7. **Kiểm tra ở 1× và 2×** trên nền sàn văn phòng; dùng `pixel_lint` để bắt pixel lẻ.
8. **Animation:** chỉnh từ khung gốc.

### 3.8 Mannequin dùng chung

Vẽ trước một **mannequin 64×64** gồm đầu, mặt mẫu, thân, tay và chân ở dáng 3/4, cùng bản quay lưng và bản ngồi. Mọi nhân vật được "mặc đồ" lên mannequin này, nên tỉ lệ, mặt và độ thon của tay chân đồng nhất giữa 9 người.

## 4. Kế hoạch làm lại

1. **Chốt ngôn ngữ thiết kế này** (bạn duyệt).
2. **Sửa spec** (mục Tỉ lệ và Phong cách) theo tài liệu này. Code đã làm (khung hình, sheet ngồi, bấm chọn, bóng) **giữ nguyên**, vì chỉ đổi art.
3. **Vẽ mannequin:** khung idle 3/4 và quay lưng. Gửi bạn duyệt tỉ lệ và mặt trước khi vẽ ai.
4. **Vẽ lại Trưởng phòng** trên mannequin, gồm silhouette 3 biến thể, rồi hoàn thiện khung 0. Gửi duyệt.
5. Tiếp tục kế hoạch cũ từ Task 5 (các khung còn lại), Task 6 (sheet ngồi), Task 7 (sheet chung dựng từ mannequin), Task 8.

## Nguồn

- [AdamCYounis — Drawing a pixel character from *scratch*](https://www.youtube.com/watch?v=l1aJq9F855s)
- [Saultoons — Pixel Art Character Design Tutorial - Step By Step!](https://www.youtube.com/watch?v=vXm5VjZA4Ys)
- [Juniper Dev — The ONLY Pixel Art Guide You Need (Beginner to Advanced)](https://www.youtube.com/watch?v=DKmrBUpd0yw)
- [Lospec — Resurrect 64 palette](https://lospec.com/palette-list/resurrect-64) (được nhắc trong video C)
