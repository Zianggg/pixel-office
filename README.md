# Pixel Office

Văn phòng pixel art chạy local (http://127.0.0.1:4848) để xem đội subagent Claude Code trong `E:\UnityProject` làm việc theo thời gian thực. Dữ liệu tới từ hook `type: "http"` của Claude Code. Không npm dependency, không dịch vụ trả phí; mọi sprite vẽ bằng MCP pixelart local.

## Dùng

```
node E:\UnityProject\tools\pixel-office\cli.js on       # gắn hook + bật server + mở trình duyệt
node E:\UnityProject\tools\pixel-office\cli.js status   # hook / server / số sự kiện
node E:\UnityProject\tools\pixel-office\cli.js demo     # phát kịch bản demo (không đụng hook)
node E:\UnityProject\tools\pixel-office\cli.js off      # gỡ hook + tắt server
```

Trong chat Claude: `/office on|off|status|demo`.

## Đã kiểm chứng với Claude Code 2.1.310

- Hook có hiệu lực **ngay**, kể cả với phiên đang mở (headless và tương tác).
- Chỉ theo dõi phiên mở **đúng tại** `E:\UnityProject`. Phiên mở ở thư mục con (vd. `E:\UnityProject\DemoGame`) không được theo dõi → chạy thêm `cli.js on --project E:\UnityProject\DemoGame` (và `off --project ...` khi xong).
- Server tắt mà hook còn bật: Claude **không bị chặn**, nhưng mỗi tool call hiện dòng `hook error … ECONNREFUSED`. Luôn tắt bằng `off` (gỡ hook cùng lúc); `status` sẽ cảnh báo nếu rơi vào tình huống này.
- Payload `Notification` khi chờ duyệt quyền **không có** `agent_id` dù subagent hỏi; văn phòng gán trạng thái chờ cho agent đang có tool call dở.
- `claude --agent unity-game-director`: luồng chính mang `agent_type`, được gộp về bàn Trưởng phòng.
- `off` trả settings về y nguyên (xoá `settings.local.json` nếu `on` đã tạo nó).

## Gỡ lỗi

`OFFICE_DEBUG=1` khi chạy `on`/server → ghi payload thô vào `data/raw.jsonl` (chứa nội dung đầy đủ — chỉ bật khi cần).

## Test

`node --test` trong thư mục này.
