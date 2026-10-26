# Pixel có khối (3D) và động (dynamic): ghi chú nghiên cứu để thiết kế lại asset

Ngày: 2026-10-26 · Trạng thái: đề xuất, chờ duyệt

## 1. Tài liệu người dùng đưa (phân tích 3 ảnh mẫu)

Phần dùng được cho Pixel Office:

- Pixel vuông cứng, không khử răng cưa, không gradient mượt.
- Mỗi vật liệu 3–4 tông (tối, trung, sáng, điểm nhấn), ánh sáng từ trên-trái.
- **Hue shift:** bóng ngả lạnh (tím/xanh), sáng ngả ấm (vàng), không chỉ làm đậm hay nhạt cùng một màu.
- Viền chọn lọc theo màu mảng kề bên, không dùng đen #000.
- Silhouette đọc được nghề. Một màu chủ đạo bão hòa trên nền màu trầm. Một đạo cụ kể chuyện.
- Tỉ lệ khoảng 4 đầu, mặt tối giản. Có bóng elip dưới chân.
- Quy trình: chốt bảng màu → silhouette → mảng màu → sáng tối → viền → chi tiết.
- Lỗi cần tránh: quá nhiều màu, mặt quá chi tiết, tay chân không đồng nhất giữa các nhân vật, nét cong mượt.

Phần **không** áp dụng: tài liệu gợi ý "vẽ bằng code (HTML/canvas/SVG)". Quy tắc của dự án là chỉ vẽ bằng MCP pixelart, không dùng model tạo ảnh và không tự viết script vẽ. Quy tắc này giữ nguyên. Nền xám #D4D4D4 và nhãn tên chỉ dùng cho trang `art-preview.html`, không dùng trong văn phòng.

## 2. Tìm hiểu thêm: cảm giác 3D trong pixel 2D

1. **Tưởng tượng vật thể là khối 3D dưới một nguồn sáng.** Độ sáng giảm dần khi mặt cong ra xa nguồn sáng. Tránh "pillow shading" (tối dần đều từ tâm ra viền). Viền một nét trơn không tạo được khối.
2. **Một góc nhìn duy nhất cho cả game:** 3/4 nhìn từ trên xuống, thấy cùng lúc **mặt trên** và **mặt trước** của đồ vật. Đồng nhất quan trọng hơn chính xác. Nhìn thẳng từ trên thì ghế chỉ là một ô vuông, nên phải dùng 3/4.
3. **Ba mặt, ba giá trị:** mặt trên sáng nhất (hứng sáng), mặt trước trung bình, mặt bên phải tối nhất (xa nguồn sáng trên-trái). Đây là cách nhanh nhất để đồ vật có khối.
4. **Tỉ lệ 60/25/15:** khoảng 60% màu gốc, 25% bóng, 15% sáng. Nếu bóng phủ gần hết mảng là đang pillow shading.
5. **Ambient occlusion:** nét 1px tối nhất ở chỗ hai vật chạm nhau (dưới cằm, tay áp thân, chân bàn chạm sàn). Tốn ít pixel nhất mà hiệu quả nhất.
6. **Bóng đổ:** một mảng phẳng tối hơn 1–2 bậc trên mặt sàn, lệch về phía xa nguồn sáng (xuống-phải). Nhân vật có bóng elip dưới chân.
7. **Ánh sáng hắt và viền sáng:** 1px tông lạnh hơi sáng ở mép phía tối làm vật nổi khối. Viền sáng (rim light) 1px ở mép trên-trái tách nhân vật khỏi nền.
8. **Điểm phản chiếu:** 1–2px tông sáng nhất, chỉ dùng cho kim loại, kính, màn hình.
9. **Bóng vẽ sẵn vào sprite** là cách hiệu quả nhất cho game 2D tĩnh (kiểu 16-bit). Ánh sáng động (normal map, shader rim) chỉ đáng làm ở game có đèn di chuyển.

## 3. Tìm hiểu thêm: "dynamic"

1. **Dáng:** contrapposto (dồn trọng tâm một chân, vai và hông nghiêng ngược nhau 1px), tay tách khỏi thân, đầu quay 3/4.
2. **Idle "thở":** 2–4 khung, lệch 1px (thu xuống khi thở ra, nhô lên khi hít vào), mỗi khung 300–500ms. Tóc và phụ kiện trễ một khung.
3. **Đi bộ:** 4–6 khung, 100–150ms mỗi khung. Thân hạ xuống khi chân chạm đất. Tay vung ngược chân.
4. **Squash/stretch:** 1–3px, giữ thể tích. Không dùng cho vật tĩnh.
5. **Thời lượng khung không đều:** giữ lâu khung đỉnh hoặc khung va chạm, các khung khác nhanh. Thời lượng đều trông máy móc.
6. **Hành động phụ:** hơi cà phê, màn hình nhấp nháy, lá cây rung, bụi khi bước. Tạo cảm giác "sống" mà không cần vẽ lại cả nhân vật.
7. MCP pixelart có `pixel_define_rig` và `pixel_render_motion`: vẽ một lần nhìn ngang, rồi máy tự xoay tay chân ra các khung đi hoặc chạy. Có thể dùng cho 2 khung đi ngang.

## 4. Đối chiếu với asset hiện tại

| Asset | Hiện tại | Thiếu |
|---|---|---|
| Đồ đạc (sofa, arcade, tủ lạnh...) | Vẽ nhìn thẳng mặt trước, 2 tông | Mặt trên, mặt bên, AO, bóng đổ xuống sàn |
| Bàn làm việc | Có mặt trên và mặt trước nhưng phẳng | Mặt bên phải tối, AO ở chân bàn, phản chiếu nhẹ trên mặt gỗ |
| Nhân vật (3 bản thử) | Dáng và đạo cụ đã có cá tính | Bóng 2 tông cùng màu, chưa hue shift, chưa có viền sáng, bóng chân là mảng nâu đặc |
| Bảng màu | Ramp ấm mid-century, viền nâu #3d2a22 | Chưa có tông bóng lạnh (tím/xanh đậm) để hue shift |
| Chuyển động | 8 khung: đứng, lưng, đi, gõ phím | Chưa có khung thở; bóng chưa tách khỏi sprite |

## 5. Hướng đề xuất (chờ duyệt)

**A — Khối 3/4 vẽ sẵn + bóng mờ vẽ bằng code (khuyên dùng)**
- Thêm khoảng 6–8 màu bóng lạnh vào `palette.json` để hue shift.
- Vẽ lại toàn bộ đồ đạc theo một phép chiếu 3/4: mặt trên, mặt trước, mặt bên phải. Thêm AO và viền chọn lọc.
- Nhân vật: bóng 3 tầng có hue shift, viền sáng 1px trên-trái. Bỏ mảng bóng đặc dưới chân.
- Code: vẽ bóng đổ bán trong suốt dưới đồ đạc và nhân vật. Test bắt pixel phải đục hoàn toàn, nên bóng mờ không thể nằm trong sprite.
- Có thể thêm khung "thở" (sheet tăng từ 8 lên 10 khung).

**B — Chỉ vẽ lại, không đổi code**
- Bóng đổ vẽ đặc vào sprite. Rẻ hơn, nhưng bóng che sàn và không mờ được.

**C — Ánh sáng động (normal map, rim shader trên canvas)**
- Đẹp khi có ngày/đêm (phần 3), nhưng tốn công. Nên để sau phần thời tiết.

**Thứ tự làm (theo A):**
1. Bảng màu.
2. Bản thử một góc phòng (bàn + ghế + sofa + arcade) và vẽ lại Trưởng phòng theo kỹ thuật mới, để duyệt.
3. Phần còn lại của đồ đạc.
4. 8 nhân vật còn lại.
5. Animation thở (nếu duyệt).

## Nguồn

- [itch.io — pixel tutorial: shading curves](https://itch.io/t/2172486/pixel-tutorial-shading-curves)
- [itch.io — pixel tutorial: tortoise](https://itch.io/t/2087708/pixel-tutorial-tortoise)
- [PokéCommunity — pillow shading](https://www.pokecommunity.com/goto/post?id=8871853)
- [Slynyrd Pixelblog 3 — Graphical Projection](https://www.slynyrd.com/blog/2018/3/14/pixelblog-3-graphical-projections-1)
- [Slynyrd Pixelblog 35 — Top Down Interiors](https://www.slynyrd.com/blog/2021/11/30/pixelblog-35-top-down-interiors)
- [Sprite AI — Room pixel art](https://www.sprite-ai.art/gallery/rooms)
- [Pixel Beef — 4 things to add light and depth](https://pixel-beef.itch.io/xdasher/devlog/192949/4-things-we-did-to-add-light-and-depth-to-our-pixel-art-game)
- [Godot Shaders — 2D Rim Light](https://godotshaders.com/shader/2d-rim-light/)
- [Sprite AI — animation principles for pixel art](https://www.sprite-ai.art/guides/animation-principles)
- [Pixnote — animation basics](https://pixnote.net/en/learn/animation)
- [Clip Studio — 12 principles of animation](https://www.clipstudio.net/en/animation/12-principles/)
- Hướng dẫn `shading` và `animation` của MCP pixelart (pixel_guide)
