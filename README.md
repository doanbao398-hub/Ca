# Ocean Odyssey: Evolution (Modular Architecture)

## Tính năng nổi bật (Phiên bản 2.0)

- **Hệ thống 100 Cấp Độ & 8 Chuẩn Tiến Hóa:** Tốc độ cày cấp thử thách dần, kích thước phóng đại cực đại theo điểm số và cấp độ (bán kính lên tới 320px), tự động mở khóa 8 dạng tiến hóa với hào quang và vệ tinh năng lượng riêng.
- **Bảng Điều Khiển Admin Động (`F2` hoặc nút `👑 ADMIN`):** Tự động đọc cấu trúc tiến hóa và cấp độ tối đa của dự án, cho phép biến hình trực tiếp qua 8 dạng, đặt cấp độ 1–100, phóng to khổng lồ và triệu hồi Boss Leviathan.
- **Chat Multiplayer Thời Gian Thực:** Khung chat góc trái màn hình (`Enter` để gõ nhanh) kết hợp bong bóng thoại hiển thị ngay trên đầu nhân vật trong phòng chơi.
- **Tối Ưu Mobile & Màn Hình Xoay Ngang:** Tự động nhắc xoay ngang màn hình khi cầm dọc trên điện thoại, cụm nút cảm ứng vòng cung bên phải thuận tay.

## Cấu hình bảo mật Firebase Realtime Database (Security Rules)

Hãy dán cấu hình Rules sau vào mục **Realtime Database -> Rules** trên Firebase Console để hỗ trợ kích thước khổng lồ (`radius <= 360`) và kênh `chat`:

```json
{
  "rules": {
    "ocean_odyssey": {
      "users": {
        "$uid": {
          ".read": "auth != null && (auth.uid === $uid || auth.token.email === 'doanbao398@gmail.com')",
          ".write": "auth != null && (auth.uid === $uid || auth.token.email === 'doanbao398@gmail.com')"
        }
      },
      "leaderboard": {
        ".read": true,
        ".indexOn": ["highScore"],
        "$uid": {
          ".write": "auth != null && (auth.uid === $uid || auth.token.email === 'doanbao398@gmail.com')"
        }
      },
      "rooms": {
        "$roomId": {
          "players": {
            ".read": true,
            "$playerId": {
              ".write": true,
              ".validate": "newData.val() === null || (newData.hasChildren(['x', 'y', 'radius', 'score']) && newData.child('radius').isNumber() && newData.child('radius').val() <= 360 && newData.child('score').isNumber() && newData.child('score').val() >= 0)"
            }
          },
          "hits": { ".read": true, ".write": true },
          "skills": { ".read": true, ".write": true },
          "emotes": { ".read": true, ".write": true },
          "chat": { ".read": true, ".write": true }
        }
      }
    }
  }
}
```
