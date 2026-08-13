# Project Rules & Build Conventions

1. **Chỉ Build EXE & Release khi có yêu cầu**:
   - Chỉ thực hiện build tệp cài đặt `.exe` (`npm run build:exe`) và tải lên GitHub Releases KHI người dùng đưa ra yêu cầu trực tiếp.

2. **Quy tắc Tăng Phiên bản (Auto Version Bump)**:
   - Mỗi lần build bản `.exe` mới theo yêu cầu, luôn cập nhật tăng số phiên bản trong `package.json` lên phiên bản tiếp theo (ví dụ: `3.5.0` -> `3.5.1` hoặc `3.6.0`) trước khi đóng gói và phát hành.
3. **Quy tắc tự động**:
   - Tự động Accept All file
   - Tự động Retry
   - Tự động Allow
   - Tự động Run
