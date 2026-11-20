export const BOSS_SKILL_CORES = {
  boss_space_1: {
    id: "boss_space_1",
    bossType: "space",
    slotIndex: 1,
    name: "Bành Trướng Lãnh Địa",
    shortName: "Lãnh Địa KG",
    icon: "🌌",
    defaultKey: "KeyZ",
    cooldown: 12.0,
    desc: "Kiến tạo Lãnh Địa Không Gian & cho phép Bước Nhảy dịch chuyển tức thời bên trong.",
    v2Name: "Bành Trướng Tinh Vân V2",
    v2Desc:
      "V2: Hào quang Đỏ-Vàng rực rỡ, bán kính rộng hơn & tạo xung chấn khi dịch chuyển.",
  },
  boss_space_2: {
    id: "boss_space_2",
    bossType: "space",
    slotIndex: 2,
    name: "Lát Cắt Không Gian",
    shortName: "Lát Cắt KG",
    icon: "🌙",
    defaultKey: "KeyX",
    cooldown: 4.5,
    desc: "Phóng lưỡi liềm xé không gian (hoặc chém Vết Nứt Tuyệt Đối nếu đứng trong Lãnh Địa).",
    v2Name: "Tam Trảm Hư Không V2",
    v2Desc:
      "V2: Phóng 3 lưỡi liềm hình quạt / Vết Nứt kép màu Đỏ-Vàng-Lam, tầm & sát thương vượt trội.",
  },
  boss_space_3: {
    id: "boss_space_3",
    bossType: "space",
    slotIndex: 3,
    name: "Hạ Cấp & Bóp Méo",
    shortName: "Hạ Cấp KG",
    icon: "🔮",
    defaultKey: "KeyC",
    cooldown: 11.0,
    desc: "Phóng Quả Cầu Bán Lãnh Địa giam cầm & nghiền ép (hoặc Bóp Méo Tức Thì trong Lãnh Địa).",
    v2Name: "Hố Đen Phá Hủy V2",
    v2Desc:
      "V2: Xoáy Hố Đen Đỏ-Vàng, bán kính giam cầm lớn hơn & kích nổ sóng xung kích kép.",
  },
  boss_time_1: {
    id: "boss_time_1",
    bossType: "time",
    slotIndex: 1,
    name: "Dòng Chảy Đa Chiều",
    shortName: "Bản Thể TG",
    icon: "⏳",
    defaultKey: "KeyV",
    cooldown: 11.0,
    desc: "Triệu hồi Bản Thể Quá Khứ (0.5x) & Bản Thể Tương Lai Khổng Lồ (2.0x) hỗ trợ săn mồi.",
    v2Name: "Vòng Lặp Vĩnh Hằng V2",
    v2Desc:
      "V2: Bản thể Bạch Kim-Lam Ngọc phát sáng, tồn tại lâu hơn & cộng hưởng mạnh mẽ.",
  },
  boss_time_2: {
    id: "boss_time_2",
    bossType: "time",
    slotIndex: 2,
    name: "Lồng Giam Ngưng Đọng",
    shortName: "Lồng Giam TG",
    icon: "⌛",
    defaultKey: "KeyB",
    cooldown: 8.5,
    desc: "Phóng cầu tạo Lồng Giam Thời Gian đóng băng kẻ địch và nổ Nghịch Lý khi hết giờ.",
    v2Name: "Ngục Tù Chronos V2",
    v2Desc:
      "V2: Đồng hồ Thiên Hà Lam-Vàng, tăng bán kính giam giữ & sát thương nổ Nghịch Lý.",
  },
  boss_time_3: {
    id: "boss_time_3",
    bossType: "time",
    slotIndex: 3,
    name: "Trường Thời Gian",
    shortName: "Trường TG",
    icon: "🕰️",
    defaultKey: "KeyF",
    cooldown: 16.0,
    desc: "Mở Trường Thời Gian làm chậm địch & kích hoạt Tua Ngược 3 giây hồi HP.",
    v2Name: "Đế Chế Vĩnh Cửu V2",
    v2Desc:
      "V2: Trường Thời Gian Lam-Vàng Thiên Hà, hồi thêm HP khi Tua Ngược & gây choáng nhịp.",
  },
};

export const BOSS_SKILL_IDS_BY_TYPE = {
  space: ["boss_space_1", "boss_space_2", "boss_space_3"],
  time: ["boss_time_1", "boss_time_2", "boss_time_3"],
};

export const ALL_BOSS_SKILL_IDS = [
  ...BOSS_SKILL_IDS_BY_TYPE.space,
  ...BOSS_SKILL_IDS_BY_TYPE.time,
];

export function getBossSkillConfig(skillId) {
  return BOSS_SKILL_CORES[skillId] || null;
}

export function getKeyLabel(code) {
  if (!code) return "?";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}
