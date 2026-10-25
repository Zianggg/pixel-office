# Phong cách nhân vật "dynamic, đặc sắc" — ghi chú nghiên cứu

Ngày: 2026-10-26 · Trạng thái: đề xuất, chờ duyệt rồi mới vẽ (sau khi reset token)

## Ba ảnh mẫu người dùng gửi

| Ảnh | Điểm rút ra |
|---|---|
| A — cô gái tóc đuôi ngựa (sheet trang phục) | Nhìn 3/4; tóc đuôi ngựa tạo silhouette riêng; áo khoác mở ngoài áo crop (nhiều lớp); lọn tóc to, đổ bóng 3–4 tông lệch màu; bóng bầu dục dưới chân |
| B — thợ rèn, cô hầu bàn, đồ tể, người đi rừng | Mỗi người một **dáng cơ thể** (già khom vai cơ bắp, đầy đặn váy dài, hói râu đô con, mảnh khảnh); **đang làm gì đó** (đập búa, bưng khay, lau tay, chống hông); viền tối chọn lọc, ánh sáng viền, mảng sáng tối gom rõ |
| C — 12 lính (Hazmat, Chemist, K9 Trainer…) | Gần như phẳng 2–3 tông, gần như không viền; **silhouette nói lên vai trò** nhờ đồ nghề (bộ hazmat, bình đeo lưng, chó, bộ điều khiển drone, áo poncho); mỗi người **một món đặc trưng**; nhận ra chỉ qua hình bóng |

## Nguyên tắc (ảnh mẫu + tìm hiểu trên mạng)

1. **Thử silhouette:** tô đen toàn bộ vẫn phải nhận ra ai, đang làm gì. Tách tay khỏi thân bằng khoảng trống âm.
2. **Ưu tiên ở cỡ sprite nhỏ:** silhouette → bảng màu → dáng → vài món đồ đặc trưng; chi tiết nhỏ sẽ mất.
3. **Dáng nói tính cách:** tròn rộng = hiền, gọn góc cạnh = nhanh nhẹn. Đa dạng chiều cao (52–60px trong khung 64) và bề ngang.
4. **Dáng động:** contrapposto (dồn trọng tâm một chân, hông và vai nghiêng ngược nhau 1px), đầu quay 3/4, tay làm động tác, không đứng nghiêm đối xứng.
5. **Đổ bóng lệch màu:** bóng ngả lạnh/tím-đỏ, sáng ngả vàng; 3 tầng (sáng, gốc, tối) cho sprite 32px; giữ một hướng sáng (trên-trái).
6. **Viền chọn lọc:** viền theo màu mảng kề bên, tối hơn một bậc, thay vì một màu viền tối đều khắp.
7. **Giữ cố định đặc điểm** (tóc, trang phục, tỉ lệ) giữa các khung, chỉ đổi động tác.

Nguồn: [Binus — The Power of Silhouette](https://binus.ac.id/bandung/dkv/2025/11/04/the-power-of-silhouette-designing-readable-characters-in-motion/),
[PoseMyArt — dynamic poses](https://posemy.art/blog/how-to-draw-dynamic-poses-guide/),
[Penusbmic — creating unique characters](https://penusbmic.itch.io/pixel-art-tutorial-creating-unique-characters),
[Lospec — outlines using color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color),
[itch.io — selective outlines](https://itch.io/t/2422252/pixel-tutorial-selective-outlines),
[Pixnote — shading & lighting](https://pixnote.net/en/learn/shading).

## Đề xuất thiết kế

**Thay đổi lớn:** mỗi agent một sprite sheet riêng (`char_<kit>`, 32×64×8) thay cho một thân chung đổi màu + phụ kiện. Thân chung đổi màu vẫn giữ cho agent lạ ngoài layout.

| Agent | Dáng người | Trang phục | Món đặc trưng | Dáng đứng |
|---|---|---|---|---|
| Trưởng phòng | cao, vai rộng | blazer + sơ mi + cà vạt, tóc mai muối tiêu | cốc cà phê | một tay chống hông |
| Thiết kế | mảnh | mũ beret, cardigan rộng, tóc đuôi ngựa | sổ phác thảo kẹp nách, bút chì gài tai | nghiêng đầu |
| Kiến trúc sư | cao gầy | kính tròn, áo cổ lọ + gile | ống bản vẽ vác vai | thẳng, cằm hơi ngẩng |
| Setup | thấp đậm | mũ lưỡi trai quay ngược, yếm có dụng cụ | hộp đồ nghề | dồn chân, vai lệch |
| Lập trình | trung bình, hơi khom | hoodie, tai nghe quàng cổ | laptop kẹp nách, lon nước | khom, tay đút túi |
| Dựng cảnh | trung bình | mũ len, gile nhiều túi, quần túi hộp | máy quay / bảng clapper | bước chân rộng |
| QA | thấp | áo blouse trắng | vợt bắt bọ (bug net) + kính lúp | giơ vợt |
| Review | lớn tuổi, đầy đặn | râu, kính đọc sách trễ mũi, cardigan | bút đỏ + xấp giấy | khoanh tay |
| Build | to khoẻ | mũ bảo hộ, áo phản quang mù tạt/đất nung, ủng | cờ lê lớn vác vai | đứng chống chân |

- **Khung:** giữ 8 khung. Đứng/đi cầm đồ nghề; khung gõ phím (nhìn lưng) đặt đồ xuống.
- **Kỹ thuật vẽ:** 3–4 tông lệch màu theo palette mid-century, viền chọn lọc, viền sáng 1px trên-trái, bóng bầu dục.
- **Code:** manifest thêm `char_<kit>`; `addAgentSprite` dùng sheet riêng nếu có, không đổi màu/không gắn phụ kiện; agent lạ dùng thân chung. Test: mỗi agent có `char_<kit>` [32,64,8], chỉ màu trong palette.
- **Khối lượng:** 9 × 8 = 72 khung. Mỗi người vẽ tay khoảng 4 khung gốc (đứng, lưng, 2 khung đi ngang), phần còn lại dựng bằng copy_region. Đề xuất vẽ thử 3 người trước (Trưởng phòng, QA, Build) để duyệt phong cách, rồi mới vẽ 6 người còn lại.
