# MCP vẽ pixel đã chọn: pixelart-mcp

| | pixelart-mcp (chọn) | pxcli-mcp |
|---|---|---|
| Nguồn | github.com/light-vp/pixelart-mcp (v0.7.0) | npm `pxcli-mcp` 0.1.0 |
| Runtime | Python 3.12 qua uv | Node |
| Vẽ cả sprite trong 1 lần gọi | Có — `pixel_paint_grid` (lưới ký tự + legend màu hex) | Không — chỉ `set_pixel` / `fill_rect` / `draw_line` |
| Xuất PNG ra đĩa | Có — canvas là file PNG, `pixel_export_png` | Có |
| Gọi mạng / model AI | Không (chỉ import Pillow, mcp, pydantic — đã kiểm tra mã nguồn) | Không thấy |

Lý do chọn: ~25 sprite, `pixel_paint_grid` giảm số tool call từ hàng chục xuống 1–2 mỗi sprite.

## Cài đặt (tất cả trên ổ E)
- uv: `E:\Dev\uv\uv.exe` (winget `astral-sh.uv --location E:\Dev\uv`)
- Biến môi trường người dùng: `UV_PYTHON_INSTALL_DIR=E:\Dev\uv\python`, `UV_CACHE_DIR=E:\Dev\uv\cache`, `UV_TOOL_DIR=E:\Dev\uv\tools`, `UV_PYTHON_BIN_DIR=E:\Dev\uv\bin`
- Mã nguồn: `E:\Dev\mcp\pixelart-mcp`, Python ghim 3.12 (`.python-version`), `uv sync`
- Đăng ký (scope local cho thư mục pixel-office):
  `claude mcp add pixelart --scope local -e UV_CACHE_DIR=E:\Dev\uv\cache -e UV_PYTHON_INSTALL_DIR=E:\Dev\uv\python -- E:\Dev\uv\uv.exe --directory E:\Dev\mcp\pixelart-mcp run -m pixelart_mcp`
- Gỡ: `claude mcp remove pixelart -s local` (chạy trong `E:\UnityProject\tools\pixel-office`)

Tool MCP chỉ có trong phiên Claude **mở mới** tại `E:\UnityProject\tools\pixel-office`.
