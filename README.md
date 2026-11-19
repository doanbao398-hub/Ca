# Ocean Odyssey: Evolution (Modular Architecture)

## Cấu trúc dự án

- `index.html`: Khung giao diện chính.
- `css/`: Tách biệt style theo từng lớp (`base.css`, `hud.css`, `lobby.css`, `modals.css`).
- `js/data/`: Chứa dữ liệu tĩnh của loài, tiến hóa, bản đồ, nâng cấp và nhiệm vụ.
- `js/core/`: Lõi engine (`EventBus`, `Camera`, `InputManager`, `SoundSystem`, `StorageManager`).
- `js/graphics/`: Các module chuyên trách vẽ Canvas (`CreatureRenderer`, `AuraRenderer`, `WorldRenderer`, `ParticleSystem`, `MinimapRenderer`).
- `js/entities/`: Các thực thể trong game (`Creature`, `Player`, `RemotePlayer`, `EnemyBot`, `BossLeviathan`, `Pickups`).
- `js/systems/`: Các hệ thống xử lý logic độc lập (`SkillSystem`, `CombatSystem`).
- `js/network/`: Đồng bộ thời gian thực qua Firebase Realtime Database (`FirebaseClient`, `RoomSync`).
- `js/ui/`: Quản lý cập nhật DOM (`UIManager`).

## Cách chạy dự án

Vì dự án sử dụng chuẩn **ES Modules** (`import`/`export`), bạn cần chạy qua một HTTP Server cục bộ thay vì mở trực tiếp file `index.html`:

- **VS Code:** Cài extension **Live Server**, chuột phải vào `index.html` -> chọn **Open with Live Server**.
- **Python:** Chạy lệnh `python -m http.server 8080` tại thư mục gốc và mở `http://localhost:8080`.
  Sơ đồ cây
  Ca/
  ├── index.html # Giao diện khung HTML chính và điểm nhúng (entry point) của ứng dụng
  ├── README.md # Tài liệu mô tả tổng quan, hướng dẫn chơi và cách cài đặt dự án
  ├── css/ # Tầng trình bày (Presentation Layer - Giao diện & Hiệu ứng)
  │ ├── reset.css # Chuẩn hóa CSS mặc định giữa các trình duyệt
  │ ├── main.css # Bố cục chính (layout), màu sắc, font chữ và các màn hình menu/HUD
  │ └── animations.css # Hiệu ứng chuyển động UI, nút bấm, thông báo trong game
  └── js/ # Tầng xử lý nghiệp vụ & dữ liệu (Logic & Network Layer)
  ├── main.js # File khởi chạy chính, kết nối các module và quản lý vòng đời ứng dụng
  ├── core/ # Lõi vận hành game (Game Engine Core)
  │ ├── config.js # Hằng số cấu hình (kích thước canvas, FPS, tốc độ, thông số cân bằng game)
  │ ├── gameLoop.js # Vòng lặp cập nhật khung hình (requestAnimationFrame) và tính toán deltaTime
  │ └── inputHandler.js # Lắng nghe và xử lý sự kiện bàn phím, chuột hoặc cảm ứng
  ├── entities/ # Các đối tượng trong game (Game Objects)
  │ ├── player.js # Quản lý trạng thái, tọa độ, hành động và vẽ nhân vật người chơi
  │ └── world.js # Quản lý bản đồ, vật phẩm, chướng ngại vật và xử lý va chạm (collision)
  ├── network/ # Tầng kết nối mạng (Multiplayer)
  │ └── multiplayer.js # Đồng bộ dữ liệu thời gian thực (WebSocket/Firebase), phòng chơi và người chơi khác
  └── ui/ # Điều khiển giao diện động
  └── uiManager.js # Cập nhật điểm số, thanh máu, bảng xếp hạng và chuyển đổi các popup/menu

## Cấu hình bảo mật Firebase Realtime Database (Security Rules)

Để game hoạt động ổn định ở chế độ Multiplayer, chống gian lận chỉ số cơ bản (Anti-cheat) và tự động dọn dẹp dữ liệu khi người chơi ngắt kết nối (`onDisconnect`), hãy dán cấu hình Rules sau vào mục **Realtime Database -> Rules** trên Firebase Console:

```json
{
  "rules": {
    "ocean_odyssey": {
      "users": {
        "$uid": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        }
      },
      "leaderboard": {
        ".read": true,
        ".indexOn": ["highScore"],
        "$uid": {
          ".write": "auth != null && auth.uid === $uid"
        }
      },
      "rooms": {
        "$roomId": {
          "players": {
            ".read": true,
            "$playerId": {
              ".write": true,
              ".validate": "newData.val() === null || (newData.hasChildren(['x', 'y', 'radius', 'score']) && newData.child('radius').isNumber() && newData.child('radius').val() <= 200 && newData.child('score').isNumber() && newData.child('score').val() >= 0)"
            }
          },
          "hits": { ".read": true, ".write": true },
          "skills": { ".read": true, ".write": true },
          "emotes": { ".read": true, ".write": true }
        }
      }
    }
  }
}
```

https://repo2txt.com/
