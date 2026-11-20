export const SPECIES_EVOLUTION_PASSIVES = {
  fish: [
    {
      stage: 2,
      id: "fish_p2",
      name: "Mũi Kiếm Xuyên Giáp",
      icon: "🗡️",
      desc: "Tự động kích hoạt khi bơi tốc độ cao > 1.5s: Cú đớp đầu tiên gây +40% sát thương.",
    },
    {
      stage: 4,
      id: "fish_p4",
      name: "Săn Mồi Cô Độc",
      icon: "🎯",
      desc: "Tự động khóa mục tiêu đơn độc gần nhất, tăng +22% tốc độ truy đuổi.",
    },
    {
      stage: 6,
      id: "fish_p6",
      name: "Vũ Điệu Kiếm Ảnh",
      icon: "⚔️",
      desc: "Tự động kích hoạt sau khi hạ gục kẻ địch: Triệu hồi 2 kiếm khí chém quét xung quanh.",
    },
    {
      stage: 8,
      id: "fish_p8",
      name: "Nhất Kiếm Đoạt Mệnh",
      icon: "⚡",
      desc: "Tự động phóng tia kiếm khí kết liễu mục tiêu trước mặt có HP dưới 25% & hồi đầy thể lực.",
    },
  ],
  turtle: [
    {
      stage: 2,
      id: "turtle_p2",
      name: "Mai Giáp Hấp Thụ",
      icon: "🛡️",
      desc: "Tự động tạo khiên thủy tinh chặn hoàn toàn 1 đòn đánh mạnh mỗi 12 giây.",
    },
    {
      stage: 4,
      id: "turtle_p4",
      name: "Hào Quang Phục Hồi",
      icon: "💚",
      desc: "Tự động tỏa sóng hồi 4% HP/giây khi bơi chậm hoặc đứng yên quan sát.",
    },
    {
      stage: 6,
      id: "turtle_p6",
      name: "Địa Chấn Hải Quy",
      icon: "🌊",
      desc: "Tự động giậm sóng đẩy văng & làm choáng 1s khi có từ 2 kẻ địch áp sát.",
    },
    {
      stage: 8,
      id: "turtle_p8",
      name: "Bất Tử Huyền Vũ",
      icon: "🐢",
      desc: "Tự động kích hoạt khi HP dưới 18%: Bất tử 3.5s & hồi ngay 40% HP (hồi 45s).",
    },
  ],
  croc: [
    {
      stage: 2,
      id: "croc_p2",
      name: "Bản Năng Phục Kích",
      icon: "🌿",
      desc: "Tự động ẩn thân trong tảo/rễ đước; đòn đánh đầu khi thoát ẩn thân chí mạng x1.8.",
    },
    {
      stage: 4,
      id: "croc_p4",
      name: "Hàm Răng Khóa Chặt",
      icon: "🩸",
      desc: "Tự động gây xuất huyết & làm chậm 40% trong 2.5s mỗi khi cắn trúng đuôi.",
    },
    {
      stage: 6,
      id: "croc_p6",
      name: "Cuồng Nộ Đầm Lầy",
      icon: "💢",
      desc: "Tự động hóa đỏ khi HP dưới 50%: Tăng +35% sát thương cắn & +25% hút máu.",
    },
    {
      stage: 8,
      id: "croc_p8",
      name: "Ác Mộng Vực Sâu",
      icon: "🐊",
      desc: "Mỗi 10 giây giao tranh tự động triệu hồi hàm năng lượng ngoạm kẻ địch gần nhất.",
    },
  ],
  diver: [
    {
      stage: 2,
      id: "diver_p2",
      name: "Radar Dò Kho Báu",
      icon: "📡",
      desc: "Mỗi 8 giây tự động quét sóng sonar lộ diện kẻ tàng hình & hút ngọc từ xa.",
    },
    {
      stage: 4,
      id: "diver_p4",
      name: "Drone Hộ Vệ Tự Động",
      icon: "🛸",
      desc: "Triệu hồi 1 Drone bay quanh người tự động bắn laser vào kẻ địch mỗi 1.5s.",
    },
    {
      stage: 6,
      id: "diver_p6",
      name: "Trường Lực Nano",
      icon: "💠",
      desc: "Tự động bật giáp điện từ sau 4s không nhận sát thương, làm choáng kẻ chạm vào.",
    },
    {
      stage: 8,
      id: "diver_p8",
      name: "Pháo Hủy Diệt Orbital",
      icon: "🛰️",
      desc: "Khi Nộ > 80% hoặc Hóa Thần, tự động gọi chùm tia vệ tinh bắn kẻ địch nhiều máu nhất.",
    },
  ],
  space: [
    {
      stage: 2,
      id: "space_p2",
      name: "Rạn Nứt Không Gian",
      icon: "🌌",
      desc: "Kỹ năng gây sát thương để lại ấn Rạn Nứt, làm lệch hướng địch & tăng +35% tốc độ truy đuổi.",
    },
    {
      stage: 4,
      id: "space_p4",
      name: "Hấp Thụ Chiều Không Gian",
      icon: "🌀",
      desc: "Khi đứng bên trong Lãnh Địa của bản thân, nhận +20% giảm sát thương và hồi thể lực nhanh gấp đôi.",
    },
    {
      stage: 6,
      id: "space_p6",
      name: "Cộng Hưởng Bước Nhảy",
      icon: "⚡",
      desc: "Mỗi lần Bước Nhảy Không Gian tạo xung chấn nhẹ làm chậm kẻ địch xung quanh điểm đến.",
    },
    {
      stage: 8,
      id: "space_p8",
      name: "Chúa Tể Đa Vũ Trụ",
      icon: "👑",
      desc: "Bán kính Lãnh Địa mở rộng tối đa & mọi kỹ năng trong Lãnh Địa giảm 25% thời gian hồi chiêu.",
    },
  ],
  time: [
    {
      stage: 2,
      id: "time_p2",
      name: "Nhịp Đập Thời Không",
      icon: "⏳",
      desc: "Mỗi đòn cắn hoặc kỹ năng trúng địch đánh cắp 1 giây thời gian, làm khựng mục tiêu & giảm 1s hồi chiêu.",
    },
    {
      stage: 4,
      id: "time_p4",
      name: "Dư Ảnh Lệch Pha",
      icon: "🕰️",
      desc: "Bản Thể Quá Khứ & Tương Lai được kéo dài thời gian tồn tại và tăng tỷ lệ kế thừa sát thương.",
    },
    {
      stage: 6,
      id: "time_p6",
      name: "Nghịch Lý Bùng Nổ",
      icon: "💫",
      desc: "Sát thương tích tụ bên trong Lồng Giam Thời Gian được khuếch đại thêm +30% khi phát nổ.",
    },
    {
      stage: 8,
      id: "time_p8",
      name: "Chúa Tể Vĩnh Hằng",
      icon: "👑",
      desc: "Trong Lãnh Địa Trường Thời Gian, giảm 50% hồi chiêu & mở khóa Tua Ngược Dòng Thời Gian 3 giây.",
    },
  ],
};

export function getUnlockedPassives(species, evoStage) {
  const list = SPECIES_EVOLUTION_PASSIVES[species] || [];
  return list.filter((p) => evoStage >= p.stage);
}

