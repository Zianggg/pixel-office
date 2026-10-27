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

# MCP vẽ vector: inksmcp (concept nhân vật)

| | |
|---|---|
| Nguồn | github.com/bhanutpt/inksmcp, commit `e80bee0` (Release 0.3.0), clone `--depth 1` vào `E:\Dev\mcp\inksmcp` |
| Runtime | Python 3.12 qua uv (`.venv` trong thư mục mã nguồn), phụ thuộc chỉ `lxml`, `mcp` |
| Kiểm mã | `src/inksmcp`: không import `requests/httpx/aiohttp/socket/openai/anthropic/diffusion`; `urllib.parse` chỉ để đọc đường dẫn `file:`; tiến trình con duy nhất là `inkscape --shell` / `inkscape --version` (`inkscape.py`) |
| Inkscape | 1.4.4, winget `Inkscape.Inkscape --location E:\Dev\inkscape`; dùng bản console `E:\Dev\inkscape\bin\inkscape.com` |

## Đăng ký (scope local cho thư mục pixel-office)
```
claude mcp add inkscape --scope local -e UV_CACHE_DIR=E:\Dev\uv\cache -e UV_PYTHON_INSTALL_DIR=E:\Dev\uv\python -e INKSCAPE_PATH=E:\Dev\inkscape\bin\inkscape.com -e INKSCAPE_PROFILE_DIR=E:\Dev\inkscape\profile -- E:\Dev\uv\uv.exe --directory E:\Dev\mcp\inksmcp run inksmcp
```
- `INKSCAPE_PATH` phải trỏ `inkscape.com` (bản `.exe` là GUI, không trả lời trên stdout).
- `INKSCAPE_PROFILE_DIR` giữ hồ sơ Inkscape trên ổ E (mặc định nó ghi `%APPDATA%\inkscape`).
- Gỡ: `claude mcp remove inkscape -s local`.

## Tool (theo `docs/tools.md` của inksmcp 0.3.0)
`inkscape_info`, `document_create`, `document_open`, `document_save`, `inspect`, `add_elements`, `update_elements`, `delete_elements`, `import_file`, `repeat`, `split`, `connect`, `layout`, `path_operation`, `run_actions`, `page_fit`, `page_resize`, `grid`, `plot`, `z_order`, `move_to_layer`, `align`, `export`, `render_preview`.

## Cờ xuất bản nền (đã thử với Inkscape 1.4.4)
```
inkscape.com <svg> --export-type=png --export-area=x0:y0:x1:y1 --export-width=W --export-height=H --export-png-antialias=0 -o <png>
```
Toạ độ `--export-area` là đơn vị SVG, gốc trên-trái, y hướng xuống. Với SVG thử 1024×768: vùng `0:0:256:512` → PNG 32×64, vùng `512:0:1024:512` → 64×64; chỉ có alpha 0/255 và đúng màu tô (không khử răng cưa).
