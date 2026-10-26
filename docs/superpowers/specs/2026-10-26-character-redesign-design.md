# Làm lại nhân vật: concept vector → pixel 32×64

- Ngày: 2026-10-26
- Trạng thái: Thiết kế đã duyệt trong chat, chờ duyệt spec
- Branch: `feat/characters-v4` (tách từ `feat/retro-rooms`, nơi có bản đồ ô 32 px)
- Thay thế hoàn toàn: `docs/superpowers/specs/2026-10-26-hibit-characters-design.md`, `docs/superpowers/plans/2026-10-26-hibit-characters.md` và 5 tài liệu trong `docs/research/`.

## 1. Mục tiêu

Vẽ lại toàn bộ nhân vật của Pixel Office: **9 nhân viên văn phòng hiện đại, mỗi agent một thiết kế riêng**, cộng **1 nhân vật "khách"** cho agent lạ. Học **tỉ lệ, bố cục và cách vẽ chi tiết** từ Dead Cells, Blasphemous, Hades. Quy trình: **concept art vector trước, rồi mới chuyển sang pixel**.

### Tiêu chí thành công
1. Tô đen cả 10 nhân vật, xếp cạnh nhau: vẫn nhận ra từng người (silhouette khác nhau).
2. Ở kích thước 32×64, mặt đọc được hướng nhìn và biểu cảm; đồ nghề đặc trưng nhìn ra ngay.
3. Mỗi agent có đủ 2 sheet đúng kích thước, chạy được trong văn phòng hiện tại mà không cần đổi logic di chuyển hay trạng thái.
4. Người dùng đã duyệt: style guide, từng lô concept, nhân vật thí điểm.

## 2. Ràng buộc cứng

- **Tuyệt đối không dùng model tạo ảnh** (kể cả ArtCraft, Meshy, Hyper3D, Hunyuan…). Concept vẽ bằng **Inkscape qua inksmcp**; pixel vẽ bằng **pixelart-mcp**. Không thư viện asset.
- Không tốn chi phí.
- Mọi cài đặt nằm trên ổ E (`E:\Dev\...`); cache uv đã trỏ ra ổ E.
- Chỉ học **nguyên tắc** của ba game; **không sao chép** nhân vật, trang phục, biểu tượng cụ thể của họ.
- Nhân vật là **nhân viên văn phòng hiện đại**, không phải fantasy.

## 3. Ngoài phạm vi

- Đổi bản đồ, đồ nội thất, logic agent/hook/server.
- Thêm trạng thái hay animation mới ngoài 17 khung hiện có.
- Pipeline 3D (Blender) — chỉ là dự phòng, không làm trong spec này.

## 4. Những gì bỏ đi

| Loại | Mục |
|---|---|
| Sprite | `char.png`, `char_boss.png`, `char_qa.png`, `char_build.png`, `acc_tie/cap/glasses/headset/bow/beanie/helmet/scarf.png` và mục tương ứng trong `public/art/manifest.json` |
| Tài liệu | spec + plan `hibit-characters`; `docs/research/2026-10-26-character-*.md`, `2026-10-26-hibit-characters.md`, `2026-10-26-volume-dynamic-style.md` |
| Code | nhánh đổi màu sheet dùng chung trong `addAgentSprite` (`recolor` + `agentColorMap`) và màu khoá `keys`/`shirts`/`hairs`/`pants` trong palette; trường `shirt`/`hair`/`pants` của agent trong `layout.json` |

Mọi thứ vẫn còn trong lịch sử git.

## 5. Ngôn ngữ thiết kế

### 5.1 Tỉ lệ (khung 32×64, gót ở hàng 60; hàng 61–63 để trống cho bóng chân do code vẽ)
- **Khoảng 5 đầu.** Đầu (kể cả tóc) cao **12 px**; toàn thân **58–60 px**.
- Mốc dọc (tính từ đỉnh đầu, y = 1–3): cằm ≈ y 13, vai ≈ y 16, eo ≈ y 29, đáy hông ≈ y 35, gối ≈ y 47, gót = y 60.
- Vai rộng **1,5–2 đầu** (18–24 px) tuỳ dáng; dáng mảnh hẹp hơn, dáng đậm rộng hơn.
- Lý do: Dead Cells giữ đầu đủ lớn để đọc khi chuyển động; Blasphemous kéo thân cao gần thật; 5 đầu là điểm giữa đọc được ở 64 px.

### 5.2 Silhouette trước tiên (Hades, Dead Cells)
- Ba trục tạo khác biệt: **dáng người** (cao gầy / trung bình / thấp đậm / đậm), **khối tóc hoặc mũ**, **một đồ nghề đặc trưng** thò ra khỏi thân.
- Kiểm tra: 10 silhouette đen trên một hàng; không hai cái nào trùng ≥ 85% pixel (xem §9).

### 5.3 Ngôn ngữ hình khối (Hades)
- **Vuông** — vững vàng, đáng tin: Trưởng phòng, Review, Build, Setup.
- **Tam giác** — sắc sảo, năng động: Kiến trúc sư, Lập trình.
- **Tròn** — thân thiện, mềm: Thiết kế, Dựng cảnh, QA.
- Hình khối chủ đạo thể hiện ở vai, kiểu tóc, cổ áo, đồ nghề.

### 5.4 Ánh sáng và độ đậm nhạt (Blasphemous)
- Một nguồn sáng **trên-trái**.
- Mỗi chất liệu **3–4 tông**: sáng, gốc, tối, (tối sâu).
- **Selective outline**: viền dùng tông tối nhất của chất liệu kề nó, không viền đen đều; chỗ chất liệu tiếp sàn dùng `outline` chung.
- **Rim light 1 px** ở cạnh phải-trên để tách nhân vật khỏi sàn cam.
- Pixel gom thành **cụm ≥ 2 px**; không pixel lẻ loi (trừ mắt, điểm sáng).

### 5.5 Thứ tự chi tiết
1. Mặt (mắt, lông mày, bóng tóc trên trán), 2. tay, 3. đồ nghề, 4. trang phục (nếp gấp 1–2 nét), 5. giày.

### 5.6 Mặt 3/4 (vùng ≈ 8×8 px)
- Mắt 1×2 px (tông tối nhất của tóc hoặc `outline`), mắt xa nhỏ hơn hoặc 1 px.
- Lông mày 1 nét ngang trên mắt, nghiêng theo biểu cảm.
- Mũi: 1 px bóng (`skinShade`) phía xa nguồn sáng.
- Miệng 1–2 px.
- Bóng tóc rơi 1 px xuống trán.

### 5.7 Màu
- Palette chung `public/art/palette.json` được mở rộng thêm ramp cho da (4 tông × 3 sắc da), tóc, vải.
- Mỗi nhân vật dùng **tối đa 16 màu**, tất cả nằm trong palette chung.

## 6. Mười nhân vật

| Agent (`kit`) | Dáng / hình khối | Tóc / trang phục | Đồ nghề đặc trưng |
|---|---|---|---|
| Trưởng phòng (`boss`) | cao, vai rộng / vuông | tóc vuốt ngược, blazer, cà vạt, xắn tay áo | cốc cà phê lớn |
| Thiết kế (`design`) | mảnh / tròn | tóc bob, cardigan rộng | bút vẽ + sổ phác thảo |
| Kiến trúc sư (`architect`) | cao gầy / tam giác | kính gọng vuông, áo cổ lọ | ống bản vẽ |
| Setup (`setup`) | thấp đậm / vuông | mũ lưỡi trai đội ngược, hoodie | cuộn cáp, đai dụng cụ |
| Lập trình (`code`) | trung bình / tam giác | tóc rối, hoodie | tai nghe chụp tai |
| Dựng cảnh (`scene`) | trung bình / tròn | tóc búi, gile nhiều túi | kính VR đẩy lên trán |
| QA (`qa`) | mảnh / tròn | tóc đuôi ngựa, khăn quàng | bảng kẹp checklist |
| Review (`review`) | trung niên / vuông | tóc muối tiêu, áo len gile | kính đọc sách đeo dây, bút đỏ |
| Build (`build`) | đậm / vuông | mũ bảo hộ, áo phản quang | cờ lê |
| Khách (không `kit`) | trung bình / trung tính | áo khoác đơn giản | thẻ khách đeo cổ |

Sắc da, màu tóc và màu trang phục chốt trên tờ concept; 10 nhân vật phải đa dạng sắc da và giới tính thể hiện.

## 7. Sheet và khung hình (giữ nguyên engine)

| Sheet | Kích thước khung | Số khung | Thứ tự khung | `anchor` |
|---|---|---|---|---|
| `char_<kit>.png` | 32×64 | 9 | `idle1, idle2, walk1, walk2, walk3, walk4, back, walkBack1, walkBack2` | `[0, 32]` |
| `sit_<kit>.png` | 64×64 | 8 | `type1, type2, type3, type4, wait1, wait2, error1, error2` | `[16, 32]` |

- `idle*`, `walk*`: 3/4 trước, mặt hướng xuống-phải (đi trái = lật ngang, engine tự làm).
- `back`, `walkBack*`: 3/4 sau.
- `sit*`: nhìn từ sau lưng, ngồi trên ghế văn phòng (ghế vẽ trong sheet). `type*` đổi tay gõ; `wait*` tay rời bàn phím, đầu ngẩng; `error*` tay ôm đầu / người ngả ra.
- Nhân vật khách dùng tên chung `char.png` / `sit.png` (engine tự rơi về tên chung khi agent không có `kit`).
- Các khung xếp ngang trong một PNG, nền trong suốt.

## 8. Quy trình

### Giai đoạn 0 — Công cụ
- Cài **Inkscape 1.x** vào `E:\Dev\inkscape` (winget `--location`).
- Chạy **inksmcp** qua `E:\Dev\uv\uv.exe tool run inksmcp` (Python ≥ 3.12, cache trên ổ E). Đọc mã nguồn trước khi chạy: không có gọi mạng hay AI.
- Đăng ký MCP `inkscape` scope local cho `E:\UnityProject\tools\pixel-office`; mở phiên mới để có tool.
- Không chạy được trên Windows → **dừng, hỏi người dùng**.

### Giai đoạn 1 — Style guide → **người dùng duyệt**
`art-src/style-guide.svg` + `.png`: thước 5 đầu với các mốc §5.1, cách dựng mặt 3/4, bậc đậm nhạt mẫu cho da/vải/kim loại, hàng 10 silhouette đen.

### Giai đoạn 2 — Concept từng nhân vật → **duyệt theo lô 3**
`art-src/concepts/<kit>.svg` + `.png`, mỗi tờ gồm: đứng 3/4 trước, sau lưng, ngồi ở bàn (nhìn từ sau), mặt phóng to, bảng màu.
- Vẽ trên **lưới 8:1**: 1 pixel cuối = 8 đơn vị concept → mỗi dáng đứng nằm trong khung **256×512**, dáng ngồi trong **512×512**.
- Thứ tự lô: (Trưởng phòng — thí điểm, xem GĐ 4), rồi [Thiết kế, Kiến trúc sư, Setup], [Lập trình, Dựng cảnh, QA], [Review, Build, Khách].

### Giai đoạn 3 — Pixel
1. **Bản nền**: Inkscape xuất từng dáng của concept ở đúng 32×64 (đứng) / 64×64 (ngồi), không khử răng cưa nếu có tuỳ chọn.
2. pixelart-mcp mở bản nền, `pixel_apply_palette` ép về palette của nhân vật.
3. **Sửa tay** bằng pixelart-mcp theo §5: viền chọn lọc, mặt, cụm pixel, tông bóng, rim light. Ba **khung chuẩn**: `idle1`, `back`, `type1`.
4. **Khung phái sinh** (14 khung): nhân bản canvas từ khung chuẩn rồi chỉ vẽ phần khác bằng `pixel_draw_pixels` / `pixel_copy_region` / `pixel_shift_canvas`; kiểm tra bằng `pixel_onion_view`.
5. Ghép sheet (`pixel_export_spritesheet`) → `public/art/char_<kit>.png`, `sit_<kit>.png`; cập nhật `manifest.json`.
- Canvas làm việc ở `art-src/pixel/<kit>/`.

### Giai đoạn 4 — Thí điểm → **người dùng duyệt**
Trưởng phòng đi trọn GĐ 2–3 (concept → 17 khung) và chạy trong `office demo` trước; chỉ khi được duyệt mới làm 9 nhân vật còn lại theo lô.

### Giai đoạn 5 — Ghép và dọn
- Xoá mục §4; dọn code đổi màu; cập nhật `art-preview.html` (10 nhân vật, mọi khung, silhouette).
- `office demo` → chụp màn hình gửi người dùng.

## 9. Kiểm thử tự động (`node --test`)
- Mỗi `kit` trong `layout.json` (và nhân vật khách) có `char_*` 9 khung 32×64 và `sit_*` 8 khung 64×64; kích thước PNG khớp manifest.
- Mọi pixel không trong suốt có màu thuộc palette; mỗi nhân vật ≤ 16 màu.
- Ở `idle1`: chiều cao vùng không trong suốt 58–60 px; hàng thấp nhất có pixel là y = 60 (chân chạm cùng đường nền); mọi khung `char_*` không có pixel ở hàng 61+.
- Silhouette `idle1` của mọi cặp nhân vật trùng < 85% (IoU trên mặt nạ alpha).
- Các test hiện có của engine vẫn pass.

## 10. Rủi ro
| Rủi ro | Xử lý |
|---|---|
| inksmcp không chạy trên Windows | Dừng, hỏi người dùng |
| Bản nền xuất ra bị nhoè | Bình thường — chỉ là bản nền để sửa tay |
| Token vượt dự kiến | Bản nền tự động, nhân bản khung, thí điểm 1 nhân vật trước, duyệt theo lô |
| Concept đẹp nhưng không đọc được ở 32×64 | Style guide có hàng silhouette và thước tỉ lệ ở đúng lưới 8:1; duyệt thí điểm trước khi làm hàng loạt |
