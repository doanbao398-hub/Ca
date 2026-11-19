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
