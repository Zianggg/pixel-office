---
description: Bật/tắt văn phòng pixel theo dõi subagent (on|off|status|demo)
argument-hint: on|off|status|demo
allowed-tools: Bash(node:*)
---

Chạy lệnh sau bằng Bash **từ thư mục gốc project** (thư mục chứa `.claude/commands/office.md` này; nếu shell đã `cd` đi chỗ khác thì `cd` về trước), rồi báo lại kết quả ngắn gọn bằng tiếng Việt (giữ nguyên các dòng ✓ / ✗ / ⚠):

```
node "{{CLI}}" $ARGUMENTS
```

- Không có đối số → chạy `status`.
- Với `on`: hook có hiệu lực ngay, kể cả phiên đang mở; phiên mở ở thư mục con (vd. `<project>/DemoGame`) cần `on --project <thư mục con>`.
- Với `demo`: lệnh chạy khoảng 1–2 phút; chạy nền (`run_in_background`) và báo người dùng xem trình duyệt.
- Không sửa file nào khác.
