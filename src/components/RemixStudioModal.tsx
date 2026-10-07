import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowRight,
  Heart,
  RotateCcw,
  Sparkles,
  X,
  Layers,
  Palette,
  Shuffle,
  RotateCw,
} from 'lucide-react';
import {
  RemixLook,
  RemixStudioRequest,
  RemixThemeId,
  StylePreferenceVote,
} from '../types/remix';
import {
  TOP_GARMENTS,
  BOTTOM_GARMENTS,
  TRADITIONAL_COLORS,
  TRADITIONAL_PATTERNS,
  FABRIC_MATERIALS,
  PatternId,
  FabricMaterialId,
  HemLengthCutId,
  mapAccessoryIdToName,
} from '../data/vietPhucData';
import {
  resolveTurntableFrames,
  renderRecoloredTurntableFrame,
  getCachedRecoloredCanvas,
  loadImageElement,
  prewarmAdjacentTurnaroundSheets,
} from '../utils/vstylistStorageAndZip';

const THEMES: Array<{ id: RemixThemeId; label: string; hint: string; icon: string }> = [
  { id: 'all', label: 'Tất Cả Bản Phối (40+)', hint: 'Đầy đủ 8 cổ phục & remix đa phong cách', icon: '✨' },
  { id: 'everyday', label: 'Phố Cổ Cuối Tuần', hint: 'Thoải mái, thanh lịch, dễ phối', icon: '🏮' },
  { id: 'editorial', label: 'Kỷ Yếu Hoài Cổ', hint: 'Điểm nhấn nghệ thuật, lên ảnh sắc sảo', icon: '📸' },
  { id: 'festival', label: 'Concert & Lễ Hội', hint: 'Phá cách Gen Z, năng lượng bùng nổ', icon: '🔥' },
  { id: 'formal', label: 'Lễ Nghi Trang Trọng', hint: 'Đúng quy chuẩn, tôn nghiêm cổ phong', icon: '👑' },
  { id: 'heritage', label: 'Tự Do Khám Phá', hint: 'Bắt đầu từ chiều sâu di sản', icon: '🌿' },
];

const STYLE_PROFILE_KEY = 'vai-stylist:style-shuffle:v2';

function readStyleProfile(): StylePreferenceVote[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(STYLE_PROFILE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (vote): vote is StylePreferenceVote =>
            vote &&
            typeof vote.costumeId === 'string' &&
            typeof vote.mainColor === 'string' &&
            typeof vote.bottomName === 'string' &&
            typeof vote.bottomColor === 'string' &&
            typeof vote.patternId === 'string' &&
            typeof vote.liked === 'boolean'
        ).slice(-40)
      : [];
  } catch {
    return [];
  }
}

function summarizeStyleProfile(votes: StylePreferenceVote[]): string {
  if (votes.length < 3) {
    return `Vuốt thêm ${3 - votes.length} bộ nữa để AI Stylist nắm bắt chính xác gu phối đồ của bạn nhé!`;
  }
  const liked = votes.filter((vote) => vote.liked);
  const skipped = votes.filter((vote) => !vote.liked);
  const mostCommon = <T,>(items: T[]): T | undefined =>
    items.reduce<{ value: T; count: number } | null>((best, value) => {
      const count = items.filter((item) => item === value).length;
      return !best || count > best.count ? { value, count } : best;
    }, null)?.value;

  if (liked.length < 2) {
    const oftenSkipped = mostCommon(skipped.map((vote) => vote.costumeId));
    const name = TOP_GARMENTS.find((item) => item.id === oftenSkipped)?.baseName;
    return name
      ? `Bạn có xu hướng bỏ qua ${name}; hãy thả tim thêm vài bộ bạn ưng ý để AI nhận diện rõ phom dáng nhé.`
      : 'Bạn đang khám phá đa dạng phong cách; hãy quẹt phải những bộ bạn thích nhất nào!';
  }

  const favoredCostume = mostCommon(liked.map((vote) => vote.costumeId));
  const favoredColor = mostCommon(liked.map((vote) => vote.mainColor));
  const favoredBottom = mostCommon(liked.map((vote) => vote.bottomName));
  const skippedBottom = mostCommon(skipped.map((vote) => vote.bottomName));
  const costumeName = TOP_GARMENTS.find((item) => item.id === favoredCostume)?.baseName;
  const colorName = TRADITIONAL_COLORS.find(
    (item) => item.hex.toLowerCase() === favoredColor?.toLowerCase()
  )?.name;
  const preferredParts = [colorName, costumeName, favoredBottom]
    .filter(Boolean)
    .join(' · ');
  const skippedPart =
    skipped.length >= 2 && skippedBottom && skippedBottom !== favoredBottom
      ? ` Bạn thường ít chọn phối cùng ${skippedBottom}.`
      : '';
  return `Trong ${votes.length} lượt vuốt, bạn đặc biệt chuộng ${preferredParts || 'các gam màu hài hòa và phom dáng cổ điển'}.${skippedPart}`;
}

/**
 * Danh mục 32 bản phối đặc trưng (Curated Signature Looks) phủ kín cả 8 loại Cổ Phục Việt
 */
function buildCuratedSignatureLooks(gender: 'male' | 'female'): RemixLook[] {
  const isFemale = gender === 'female';

  return [
    // ================= EVERYDAY (PHỐ CỔ CUỐI TUẦN) =================
    {
      id: 'everyday',
      uid: 'ev-1',
      title: 'Thư Sinh Phố Cổ',
      tagline: 'Ngũ Thân tay chẽn xanh cổ vịt dạo phố thanh lịch',
      stylistNote:
        'Áo Ngũ Thân Tay Chẽn sắc Xanh Cổ Vịt phối Quần Lụa Trắng ngà, phom tay gọn gàng dễ di chuyển và thưởng trà cuối tuần.',
      costumeId: 'ao-ngu-than-tay-chen',
      mainColor: '#134E4A',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_may_co',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-quat-tram', 'acc-guoc-moc'],
      remix: 12,
      contextNote: 'Phối màu kinh điển cho các buổi cafe phố cổ Hội An hoặc dạo Hồ Gươm.',
    },
    {
      id: 'everyday',
      uid: 'ev-2',
      title: 'Nhịp Sống Đương Đại',
      tagline: 'Áo Ngũ Thân giao thoa Quần Kaki Smart-Casual',
      stylistNote:
        'Áo Ngũ Thân sắc Vàng Hoàng Yến ấm áp kết hợp Quần Kaki ống rộng màu cát cháy, điểm xuyết kính râm Retro trẻ trung.',
      costumeId: 'ao-ngu-than-tay-chen',
      mainColor: '#D4AF37',
      bottomName: 'Quần Kaki Ống Rộng Contemporary',
      bottomColor: '#C5A880',
      patternId: 'none',
      fabricMaterialId: 'dui-to',
      accessoryIds: ['kinh-ram-retro'],
      remix: 48,
      contextNote: 'Sự giao thoa hoàn hảo giữa tà áo truyền thống và chất liệu Cotton Twill hiện đại.',
    },
    {
      id: 'everyday',
      uid: 'ev-3',
      title: 'Bạch Ngọc Thanh Tao',
      tagline: 'Áo Dài lụa trắng ngà tinh khôi dệt hoa cúc dây',
      stylistNote:
        'Áo Dài Truyền Thống sắc Bạch Ngọc thêu chìm hoa Cúc Dây trường thọ, phối Quần Lụa Trắng tạo vẻ đẹp thanh khiết vượt thời gian.',
      costumeId: 'ao-dai-truyen-thong',
      mainColor: '#F5F1E8',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_cuc_day',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-non-la', 'acc-guoc-moc'],
      remix: 10,
      contextNote: 'Bản phối bất hủ phù hợp mọi không gian từ trường học, bảo tàng đến đường phố.',
    },
    {
      id: 'everyday',
      uid: 'ev-4',
      title: 'Sắc Chàm Phương Nam',
      tagline: 'Áo Bà Ba lụa Tân Châu phóng khoáng, mát rượi',
      stylistNote:
        'Áo Bà Ba Nam Bộ sắc Xanh Chàm phối cùng Quần Lĩnh Đen bóng mượt, bước đi nhẹ nhàng với Nón Lá và Guốc Mộc.',
      costumeId: 'ao-ba-ba-nam-bo',
      mainColor: '#1E3A8A',
      bottomName: 'Quần Lĩnh Đen Ống Rộng',
      bottomColor: '#181615',
      patternId: 'none',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-non-la', 'acc-guoc-moc'],
      remix: 15,
      contextNote: 'Cực kỳ tôn dáng và thoáng mát cho những chuyến dạo chơi ngày nắng.',
    },
    {
      id: 'everyday',
      uid: 'ev-5',
      title: 'Hồng Đào Dạo Phố',
      tagline: 'Áo Bà Ba sắc Đỏ Son phối Quần Lụa Trắng tươi sáng',
      stylistNote:
        'Sự kết hợp giữa Áo Bà Ba xẻ tà duyên dáng và Quần Lụa Trắng mang lại thần thái rạng rỡ, trẻ trung giữa phố phường.',
      costumeId: 'ao-ba-ba-nam-bo',
      mainColor: '#9A2B1D',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_cuc_day',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-quat-tram', 'acc-kieng-bac'],
      remix: 22,
      contextNote: 'Lên hình cực kỳ nổi bật dưới nắng sớm Sài Gòn hoặc Hà Nội.',
    },
    {
      id: 'everyday',
      uid: 'ev-6',
      title: 'Đông Kinh Indigo',
      tagline: 'Áo Dài phối Quần Jeans ống suông cổ điển',
      stylistNote:
        'Áo Dài sắc Xanh Cổ Vịt mặc cùng Quần Jeans Ống Suông màu chàm tạo nên tuyên ngôn thời trang đường phố thanh lịch.',
      costumeId: 'ao-dai-truyen-thong',
      mainColor: '#134E4A',
      bottomName: 'Quần Jeans Ống Suông Cổ Điển',
      bottomColor: '#1E40AF',
      patternId: 'pattern_may_co',
      fabricMaterialId: 'dui-to',
      accessoryIds: ['kinh-ram-retro'],
      remix: 55,
      contextNote: 'Phù hợp đi xem triển lãm nghệ thuật, workshop sáng tạo hoặc dạo phố cuối tuần.',
    },

    // ================= EDITORIAL (KỶ YẾU HOÀI CỔ) =================
    {
      id: 'editorial',
      uid: 'ed-1',
      title: 'Hoàng Kim Cung Đình',
      tagline: 'Áo Nhật Bình sắc Đỏ Son phối Thường Lụa Vàng Kim',
      stylistNote:
        'Áo Nhật Bình cổ chữ nhật thêu kim tuyến phối cùng Thường Lụa Xếp Ly vàng hoàng yến và hoa văn Thủy Ba Sóng Nước uy quyền.',
      costumeId: 'ao-nhat-binh',
      mainColor: '#9A2B1D',
      bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
      bottomColor: isFemale ? '#D4AF37' : '#F5F1E8',
      patternId: 'pattern_song_nuoc',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-kieng-bac', 'acc-quat-tram'],
      remix: 18,
      contextNote: 'Bản phối chuẩn mực cho bộ ảnh kỷ yếu hoàng gia tại Đại Nội Huế hoặc Hoàng Thành Thăng Long.',
    },
    {
      id: 'editorial',
      uid: 'ed-2',
      title: 'Kinh Bắc Duyên Thầm',
      tagline: 'Áo Tứ Thân & Yếm Đào bên vành Nón Quai Thao',
      stylistNote:
        'Áo Tứ Thân Kinh Bắc bốn tà bay bổng khoe khéo lớp Yếm Đào và Thường Lụa Xếp Ly, đi kèm Nón Quai Thao đậm hồn Quan Họ.',
      costumeId: 'ao-tu-than-kinh-bac',
      mainColor: '#6B21A8',
      bottomName: 'Thường Lụa Xếp Ly',
      bottomColor: '#181615',
      patternId: 'pattern_cuc_day',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-non-quai-thao', 'acc-kieng-bac'],
      remix: 16,
      contextNote: 'Tái hiện không gian văn hóa Kinh Bắc cổ kính và nên thơ trong từng khung hình.',
    },
    {
      id: 'editorial',
      uid: 'ed-3',
      title: 'Tím Huế Mộng Mơ',
      tagline: 'Áo Dài sắc Tím Kinh Bắc dịu dàng bên sông Hương',
      stylistNote:
        'Áo Dài Truyền Thống màu Tím Kinh Bắc kết hợp Quần Lụa Trắng, Nón Lá Bài Thơ và Kiềng Bạc chạm khắc tinh xảo.',
      costumeId: 'ao-dai-truyen-thong',
      mainColor: '#6B21A8',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_may_co',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-non-la', 'acc-kieng-bac'],
      remix: 14,
      contextNote: 'Gam màu tím trầm mặc gắn liền với vẻ đẹp đài các xứ Thần Kinh.',
    },
    {
      id: 'editorial',
      uid: 'ed-4',
      title: 'Giao Lĩnh Thư Quán',
      tagline: 'Áo Giao Lĩnh cổ chéo Hữu Nhẫm thời Lê Trung Hưng',
      stylistNote:
        'Áo Giao Lĩnh Đối Khâm cổ giao nhau chữ Y sắc Xanh Cổ Vịt phối Thường/Quần Trắng Ngà và Quạt Trầm phong thái bậc văn nhân.',
      costumeId: 'ao-giao-linh',
      mainColor: '#134E4A',
      bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_chim_lac',
      fabricMaterialId: 'dui-to',
      accessoryIds: ['acc-quat-tram', 'acc-guoc-moc'],
      remix: 20,
      contextNote: 'Khắc họa khí chất nho nhã của sĩ tử và tiểu thư Đại Việt thế kỷ XVII.',
    },
    {
      id: 'editorial',
      uid: 'ed-5',
      title: 'Viên Lĩnh Đoàn Hoa',
      tagline: 'Áo Viên Lĩnh cổ tròn gấm thêu sang trọng',
      stylistNote:
        'Áo Viên Lĩnh cổ tròn ôm sát thanh lịch sắc Vàng Lụa Hoàng Cung, dệt nổi hoa văn Mây Cổ Khánh Vân quyền quý.',
      costumeId: 'ao-vien-linh',
      mainColor: '#D4AF37',
      bottomName: 'Quần Lĩnh Đen Ống Rộng',
      bottomColor: '#181615',
      patternId: 'pattern_may_co',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-quat-tram'],
      remix: 22,
      contextNote: 'Lựa chọn độc đáo giúp bộ ảnh tốt nghiệp và kỷ yếu khác biệt hoàn toàn.',
    },
    {
      id: 'editorial',
      uid: 'ed-6',
      title: 'Áo Tấc Khoa Bảng',
      tagline: 'Đại lễ phục tay thụng sắc Xanh Hải Quân',
      stylistNote:
        'Áo Tấc ống tay rộng trang nghiêm màu Xanh Chàm phối Quần Lụa Trắng và Khăn Đóng tám nếp, tôn vinh truyền thống hiếu học.',
      costumeId: 'ao-tac',
      mainColor: '#1E3A8A',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_song_nuoc',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-quat-tram'],
      remix: 10,
      contextNote: 'Trang phục kỷ yếu Văn Miếu Quốc Tử Giám được yêu thích bậc nhất.',
    },

    // ================= FESTIVAL (CONCERT & LỄ HỘI GEN Z) =================
    {
      id: 'festival',
      uid: 'fe-1',
      title: 'Gen Z Cháy Phố',
      tagline: 'Áo Ngũ Thân Đỏ Son phối Jeans & Kính Retro',
      stylistNote:
        'Áo Ngũ Thân Tay Chẽn sắc Đỏ Son rực rỡ kết hợp Quần Jeans Ống Suông chàm cổ điển và Kính Râm Mắt Mèo cực chất.',
      costumeId: 'ao-ngu-than-tay-chen',
      mainColor: '#9A2B1D',
      bottomName: 'Quần Jeans Ống Suông Cổ Điển',
      bottomColor: '#1E40AF',
      patternId: 'pattern_chim_lac',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['kinh-ram-retro'],
      remix: 72,
      contextNote: 'Bản phối Việt Phục Streetwear bùng nổ tại các concert âm nhạc đương đại.',
    },
    {
      id: 'festival',
      uid: 'fe-2',
      title: 'Lãnh Mỹ A Cyberpunk',
      tagline: 'Áo Bà Ba Xám Ú phối Kaki & Họa tiết Chim Lạc',
      stylistNote:
        'Áo Bà Ba chất lụa Lãnh Mỹ A huyền bí điểm hoa văn Chim Lạc ánh kim, phối Quần Kaki ống rộng và kính râm cá tính.',
      costumeId: 'ao-ba-ba-nam-bo',
      mainColor: '#334155',
      bottomName: 'Quần Kaki Ống Rộng Contemporary',
      bottomColor: '#C5A880',
      patternId: 'pattern_chim_lac',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['kinh-ram-retro'],
      remix: 68,
      contextNote: 'Tạo hình ấn tượng cho lễ hội âm nhạc và tuần lễ thiết kế sáng tạo.',
    },
    {
      id: 'festival',
      uid: 'fe-3',
      title: 'Nhật Bình Pop-Fusion',
      tagline: 'Áo Nhật Bình phối Jeans ống suông phá cách',
      stylistNote:
        'Khoác Áo Nhật Bình sắc Xanh Cổ Vịt dệt hoa văn Sóng Nước bên ngoài Quần Jeans Ống Suông, vừa uy quyền vừa năng động.',
      costumeId: 'ao-nhat-binh',
      mainColor: '#134E4A',
      bottomName: 'Quần Jeans Ống Suông Cổ Điển',
      bottomColor: '#1E40AF',
      patternId: 'pattern_song_nuoc',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['kinh-ram-retro', 'acc-kieng-bac'],
      remix: 78,
      contextNote: 'Dành riêng cho sân khấu biểu diễn nghệ thuật hoặc đêm hội thời trang Gen Z.',
    },
    {
      id: 'festival',
      uid: 'fe-4',
      title: 'Giao Lĩnh Street-Vibe',
      tagline: 'Áo Giao Lĩnh Tím Kinh Bắc phối Kaki hiện đại',
      stylistNote:
        'Cổ áo Giao Lĩnh chữ Y kết hợp tà lửng ngang đùi và Quần Kaki ống rộng mang đến tỷ lệ hình thể trẻ trung, phóng khoáng.',
      costumeId: 'ao-giao-linh',
      mainColor: '#6B21A8',
      bottomName: 'Quần Kaki Ống Rộng Contemporary',
      bottomColor: '#C5A880',
      patternId: 'pattern_chim_lac',
      hemLengthCut: 'ta-lung-ngang-dui',
      fabricMaterialId: 'dui-to',
      accessoryIds: ['kinh-ram-retro', 'acc-quat-tram'],
      remix: 75,
      contextNote: 'Cảm hứng Y2K kết hợp cổ phong Đại Việt cho các lễ hội ngoài trời.',
    },
    {
      id: 'festival',
      uid: 'fe-5',
      title: 'Tứ Thân Electro-Folk',
      tagline: 'Áo Tứ Thân dân gian đương đại sắc Vàng Hoàng Yến',
      stylistNote:
        'Lấy cảm hứng từ dòng nhạc dân gian điện tử (Folktronica), Áo Tứ Thân sắc Vàng Mai phối Thường Lụa Đỏ Son rực sáng sân khấu.',
      costumeId: 'ao-tu-than-kinh-bac',
      mainColor: '#D4AF37',
      bottomName: 'Thường Lụa Xếp Ly',
      bottomColor: '#9A2B1D',
      patternId: 'pattern_chim_lac',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-non-quai-thao', 'kinh-ram-retro'],
      remix: 64,
      contextNote: 'Nổi bật tuyệt đối trong các lễ hội văn hóa và MV ca nhạc trẻ.',
    },
    {
      id: 'festival',
      uid: 'fe-6',
      title: 'Viên Lĩnh Runway',
      tagline: 'Áo Viên Lĩnh Đỏ Son phối Quần Jeans Chàm',
      stylistNote:
        'Phom áo Viên Lĩnh cổ tròn đính hoa văn Đoàn Hoa kết hợp Quần Jeans ống suông tạo nét tương phản Đông - Tây cuốn hút.',
      costumeId: 'ao-vien-linh',
      mainColor: '#9A2B1D',
      bottomName: 'Quần Jeans Ống Suông Cổ Điển',
      bottomColor: '#1E40AF',
      patternId: 'pattern_may_co',
      hemLengthCut: 'dam-ngan-tren-goi',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['kinh-ram-retro'],
      remix: 70,
      contextNote: 'Bản phối high-fashion dành cho fashionista yêu thích di sản Việt.',
    },

    // ================= FORMAL (LỄ NGHI TRANG TRỌNG) =================
    {
      id: 'formal',
      uid: 'fo-1',
      title: 'Quốc Lễ Đại Triều',
      tagline: 'Tuyệt đỉnh uy nghiêm lễ phục triều Nguyễn',
      stylistNote: isFemale
        ? 'Áo Nhật Bình gấm Vàng Hoàng Yến viền cổ thêu loan phượng, phối Thường Lụa Trắng Ngà dệt hoa văn Thủy Ba.'
        : 'Áo Tấc đại lễ sắc Xanh Hải Quân phối Quần Lụa Trắng và Khăn Đóng chữ Nhân chuẩn mực triều đình.',
      costumeId: isFemale ? 'ao-nhat-binh' : 'ao-tac',
      mainColor: isFemale ? '#D4AF37' : '#1E3A8A',
      bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_song_nuoc',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-kieng-bac'],
      remix: 5,
      contextNote: 'Lễ phục tối cao dành cho các đại lễ ngoại giao, tế tự và sự kiện quốc gia.',
    },
    {
      id: 'formal',
      uid: 'fo-2',
      title: 'Áo Tấc Lễ Hôn Phối',
      tagline: 'Chuẩn mực đại lễ phục cưới truyền thống Việt Nam',
      stylistNote:
        'Áo Tấc tay thụng sắc Đỏ Son cát tường thêu hoa Cúc Dây trường thọ, phối Quần Lụa Trắng giữ trọn nếp nhà gia giáo.',
      costumeId: 'ao-tac',
      mainColor: '#9A2B1D',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_cuc_day',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-quat-tram'],
      remix: 6,
      contextNote: 'Mẫu lễ phục hàng đầu cho nghi lễ ăn hỏi, rước dâu và bái đường gia tiên.',
    },
    {
      id: 'formal',
      uid: 'fo-3',
      title: 'Nho Phong Cửa Phật',
      tagline: 'Áo Ngũ Thân Xanh Cổ Vịt kín đáo, khiêm cung',
      stylistNote:
        'Áo Ngũ Thân Tay Chẽn màu Xanh Cổ Vịt kết hợp Quần Lụa Trắng và Guốc Mộc, thể hiện lòng thành kính nơi đền chùa.',
      costumeId: 'ao-ngu-than-tay-chen',
      mainColor: '#134E4A',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_may_co',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-khan-dong', 'acc-guoc-moc'],
      remix: 5,
      contextNote: 'Đạt chuẩn 100% quy tắc văn hóa tôn nghiêm tại các không gian tâm linh.',
    },
    {
      id: 'formal',
      uid: 'fo-4',
      title: 'Phẩm Phục Viên Lĩnh',
      tagline: 'Áo Viên Lĩnh Xanh Hải Quân thêu Chim Lạc ánh kim',
      stylistNote:
        'Áo Viên Lĩnh cổ tròn khép kín tượng trưng cho đạo Trời tròn Đất vuông, phối Quần Lụa Trắng và Khăn Đóng đĩnh đạc.',
      costumeId: 'ao-vien-linh',
      mainColor: '#1E3A8A',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_chim_lac',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-quat-tram'],
      remix: 8,
      contextNote: 'Phù hợp cho lễ kỷ niệm lịch sử, lễ vinh danh và nghi thức văn hóa.',
    },
    {
      id: 'formal',
      uid: 'fo-5',
      title: 'Nhật Bình Bạch Ngọc',
      tagline: 'Áo Nhật Bình Trắng Ngà thanh cao, quyền quý',
      stylistNote:
        'Sắc Trắng Ngà Bạch Ngọc trên nền gấm Nhật Bình kết hợp Thường Lụa Vàng Mai tôn lên vẻ đẹp tinh khôi, trang nhã.',
      costumeId: 'ao-nhat-binh',
      mainColor: '#F5F1E8',
      bottomName: 'Thường Lụa Xếp Ly',
      bottomColor: '#D4AF37',
      patternId: 'pattern_cuc_day',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-kieng-bac'],
      remix: 10,
      contextNote: 'Rất được ưa chuộng trong các lễ hằng thuận tại chùa và lễ đính hôn.',
    },

    // ================= HERITAGE (TỰ DO KHÁM PHÁ DI SẢN) =================
    {
      id: 'heritage',
      uid: 'he-1',
      title: 'Dấu Ấn Giao Lĩnh',
      tagline: 'Cổ phục ngàn năm thời Lý - Trần - Lê',
      stylistNote:
        'Áo Giao Lĩnh vạt chéo Hữu Nhẫm sắc Đỏ Son phối Thường/Quần Trắng Ngà, tái hiện khí chất hào sảng thời phục hưng Đại Việt.',
      costumeId: 'ao-giao-linh',
      mainColor: '#9A2B1D',
      bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
      bottomColor: isFemale ? '#D4AF37' : '#F5F1E8',
      patternId: 'pattern_chim_lac',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-quat-tram', 'acc-guoc-moc'],
      remix: 14,
      contextNote: 'Một trong những thức áo cổ kính bậc nhất trong dòng chảy lịch sử Việt Phục.',
    },
    {
      id: 'heritage',
      uid: 'he-2',
      title: 'Hương Sắc Kinh Kỳ',
      tagline: 'Áo Ngũ Thân Tím Kinh Bắc phối Quần Lĩnh Đen',
      stylistNote:
        'Áo Ngũ Thân tơ tằm Hà Đông dệt chìm hoa Cúc Dây phối Quần Lĩnh Đen bóng mượt và Kiềng Bạc chạm hoa.',
      costumeId: 'ao-ngu-than-tay-chen',
      mainColor: '#6B21A8',
      bottomName: 'Quần Lĩnh Đen Ống Rộng',
      bottomColor: '#181615',
      patternId: 'pattern_cuc_day',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-khan-dong', 'acc-kieng-bac'],
      remix: 12,
      contextNote: 'Tái hiện phong thái đài các của giai nhân Hà thành đầu thế kỷ XX.',
    },
    {
      id: 'heritage',
      uid: 'he-3',
      title: 'Bổ Tử Triều Lê',
      tagline: 'Áo Viên Lĩnh Xanh Cổ Vịt phối Thường Lụa',
      stylistNote:
        'Áo Viên Lĩnh cổ tròn sắc Xanh Cổ Vịt thêu hoa văn Mây Cổ Khánh Vân, giữ trọn thần thái cổ vật bảo tàng.',
      costumeId: 'ao-vien-linh',
      mainColor: '#134E4A',
      bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_may_co',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-quat-tram'],
      remix: 8,
      contextNote: 'Bộ trang phục mang giá trị nghiên cứu và phục dựng mỹ thuật cổ sâu sắc.',
    },
    {
      id: 'heritage',
      uid: 'he-4',
      title: 'Mớ Ba Mớ Bảy',
      tagline: 'Áo Tứ Thân Đỏ Son phối Quần Lĩnh Đen truyền thống',
      stylistNote:
        'Áo Tứ Thân khoác ngoài Yếm Đào, kết hợp sắc Đỏ Son và đen lĩnh Bưởi tạo nên bức tranh ngũ sắc dân gian Bắc Bộ.',
      costumeId: 'ao-tu-than-kinh-bac',
      mainColor: '#9A2B1D',
      bottomName: 'Quần Lĩnh Đen Ống Rộng',
      bottomColor: '#181615',
      patternId: 'pattern_may_co',
      fabricMaterialId: 'dui-to',
      accessoryIds: ['acc-non-quai-thao', 'acc-guoc-moc'],
      remix: 15,
      contextNote: 'Vẻ đẹp mộc mạc mà quyến rũ của hội xuân chùa Hương và hội Lim.',
    },
    {
      id: 'heritage',
      uid: 'he-5',
      title: 'Ngọc Lục Bảo Tân Châu',
      tagline: 'Áo Bà Ba Xanh Cổ Vịt phối Quần Lụa Trắng',
      stylistNote:
        'Áo Bà Ba Nam Bộ sắc Xanh Ngọc Lục Bảo dịu mắt trên nền lụa tơ tằm, kết hợp Nón Lá và Guốc Mộc thanh bình.',
      costumeId: 'ao-ba-ba-nam-bo',
      mainColor: '#134E4A',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'none',
      fabricMaterialId: 'lua-ha-dong',
      accessoryIds: ['acc-non-la', 'acc-guoc-moc'],
      remix: 14,
      contextNote: 'Tôn vinh kỹ nghệ dệt lụa truyền thống của vùng sông nước Cửu Long.',
    },
    {
      id: 'heritage',
      uid: 'he-6',
      title: 'Hoàng Triều Vàng Son',
      tagline: 'Áo Tấc Vàng Hoàng Yến dệt Thủy Ba Sóng Nước',
      stylistNote:
        'Áo Tấc tay rộng sắc Vàng Mai rực rỡ kết hợp hoa văn Sóng Nước và Quần Lụa Trắng, gợi nhớ vẻ đẹp cung đình Phú Xuân.',
      costumeId: 'ao-tac',
      mainColor: '#D4AF37',
      bottomName: 'Quần Lụa Trắng',
      bottomColor: '#F5F1E8',
      patternId: 'pattern_song_nuoc',
      fabricMaterialId: 'gam-trieu-dinh',
      accessoryIds: ['acc-khan-dong', 'acc-quat-tram'],
      remix: 10,
      contextNote: 'Biểu tượng của sự thịnh vượng, cát tường trong các dịp lễ Tết cổ truyền.',
    },
  ];
}

/**
 * Sinh thêm các bản phối Remix đa dạng tự động (Procedural Remix Generator)
 * kết hợp toàn bộ 8 áo, 7 màu lụa + bảng màu hiện đại, 7 loại quần/chân váy, 5 họa tiết & kiểu cắt tà
 */
function generateProceduralRemixBatch(params: {
  theme: RemixThemeId;
  gender: 'male' | 'female';
  count: number;
  seedOffset: number;
}): RemixLook[] {
  const { theme, gender, count, seedOffset } = params;
  const isFemale = gender === 'female';

  const EXTRA_PALETTE = [
    ...TRADITIONAL_COLORS.map((c) => ({ hex: c.hex, name: c.name.replace('Màu ', '') })),
    { hex: '#BE185D', name: 'Hồng Cánh Sen' },
    { hex: '#047857', name: 'Xanh Lục Bảo' },
    { hex: '#B45309', name: 'Cam Đất Hoàng Hôn' },
    { hex: '#4338CA', name: 'Xanh Lam Điện Tử' },
  ];

  const POETIC_PREFIXES = [
    'Đông Kinh',
    'Phú Xuân',
    'Thăng Long',
    'Kinh Bắc',
    'Nam Phương',
    'Vân Vũ',
    'Kim Khuyết',
    'Thanh Hiên',
    'Hồng Trần',
    'Ngọc Điệp',
    'Lưu Ly',
    'Tân Thời',
  ];

  const POETIC_SUFFIXES = [
    'Giao Hòa',
    'Biến Tấu',
    'Khí Chất',
    'Đương Đại',
    'Cổ Phong',
    'Phá Cách',
    'Thanh Lịch',
    'Vương Giả',
    'Mộng Mơ',
    'Bừng Sáng',
    'Hội Ngộ',
    'Nhã Vận',
  ];

  const PATTERNS: PatternId[] = [
    'pattern_may_co',
    'pattern_chim_lac',
    'pattern_song_nuoc',
    'pattern_cuc_day',
    'none',
  ];

  const FABRICS: FabricMaterialId[] = ['lua-ha-dong', 'gam-trieu-dinh', 'dui-to'];

  const results: RemixLook[] = [];

  for (let i = 0; i < count; i++) {
    const idx = seedOffset + i;
    const garment = TOP_GARMENTS[idx % TOP_GARMENTS.length];
    const colorObj = EXTRA_PALETTE[(idx * 3 + 1) % EXTRA_PALETTE.length];
    const patternId = PATTERNS[(idx * 2) % PATTERNS.length];
    const fabricId = FABRICS[idx % FABRICS.length];

    // Pick bottom appropriate for theme
    let bottomPool = BOTTOM_GARMENTS;
    if (theme === 'formal' || theme === 'heritage') {
      bottomPool = BOTTOM_GARMENTS.filter((b) => b.category === 'Truyền Thống');
    } else if (theme === 'festival') {
      bottomPool = BOTTOM_GARMENTS.filter((b) => b.category !== 'Truyền Thống' || b.id === 'thuong-lua-xep-ly');
    } else if (theme === 'everyday') {
      bottomPool = BOTTOM_GARMENTS.filter((b) => b.tierHint !== 'CRITICAL');
    }
    const bottom = bottomPool[(idx * 5 + 2) % bottomPool.length] || BOTTOM_GARMENTS[0];

    // Optional hemline remix for festival/everyday
    let hemLengthCut: HemLengthCutId = 'ta-dai-chuan';
    if (theme === 'festival' && idx % 3 === 1) {
      hemLengthCut = 'ta-lung-ngang-dui';
    } else if (theme === 'festival' && idx % 3 === 2) {
      hemLengthCut = 'dam-ngan-tren-goi';
    }

    const isModernBottom = bottom.category !== 'Truyền Thống';
    const remixScore = isModernBottom
      ? Math.min(92, 52 + ((idx * 7) % 38))
      : Math.min(35, 8 + ((idx * 5) % 24));

    const accessoryIds = isModernBottom
      ? ['kinh-ram-retro', 'acc-quat-tram']
      : garment.id === 'ao-tu-than-kinh-bac'
      ? ['acc-non-quai-thao', 'acc-kieng-bac']
      : garment.id === 'ao-ba-ba-nam-bo'
      ? ['acc-non-la', 'acc-guoc-moc']
      : isFemale
      ? ['acc-khan-dong', 'acc-kieng-bac']
      : ['acc-khan-dong', 'acc-quat-tram'];

    const prefix = POETIC_PREFIXES[idx % POETIC_PREFIXES.length];
    const suffix = POETIC_SUFFIXES[(idx * 3) % POETIC_SUFFIXES.length];
    const patternName =
      TRADITIONAL_PATTERNS.find((p) => p.id === patternId)?.name || 'Lụa Trơn';

    const resolvedTheme: RemixThemeId =
      theme === 'all'
        ? (['everyday', 'editorial', 'festival', 'formal', 'heritage'][idx % 5] as RemixThemeId)
        : theme;

    results.push({
      id: resolvedTheme,
      uid: `proc-${resolvedTheme}-${idx}-${Date.now()}`,
      title: `${prefix} ${suffix} #${idx + 1}`,
      tagline: `${garment.baseName} · Sắc ${colorObj.name} × ${bottom.name}`,
      stylistNote: `Bản phối Remix kết hợp ${garment.baseName} nhuộm sắc ${colorObj.name} (${colorObj.hex}), dệt ${patternName} trên nền ${bottom.name} mang lại tổng thể vừa tôn dáng vừa đậm cá tính.`,
      costumeId: garment.id,
      mainColor: colorObj.hex,
      bottomName: bottom.name,
      bottomColor: bottom.hex,
      patternId,
      fabricMaterialId: fabricId,
      hemLengthCut,
      accessoryIds,
      remix: remixScore,
      contextNote: isModernBottom
        ? 'Phối hợp phá cách giữa cổ phục truyền thống và phom quần đương đại cho dạo phố, concert và chụp lookbook.'
        : 'Giữ trọn phom dáng chuẩn mực truyền thống, hài hòa ngũ hành và tôn nghiêm lễ nghi.',
    });
  }

  return results;
}

/**
 * Xây dựng bộ bài (Deck) phong phú cho mỗi chủ đề (20 - 40+ bản phối đa dạng)
 */
function generateDiverseLooksCatalog(params: {
  theme: RemixThemeId;
  gender: 'male' | 'female';
  event: string;
  styleVotes: StylePreferenceVote[];
}): RemixLook[] {
  const { theme, gender, styleVotes } = params;
  const allCurated = buildCuratedSignatureLooks(gender);

  // Filter curated looks by theme, or take all 29 curated looks if theme === 'all'
  const filteredCurated =
    theme === 'all'
      ? allCurated
      : allCurated.filter((item) => item.id === theme);

  // Add procedural remix looks so even a single theme has 16+ rich combinations across all 8 garments
  const proceduralCount = theme === 'all' ? 16 : 12;
  const proceduralBatch = generateProceduralRemixBatch({
    theme,
    gender,
    count: proceduralCount,
    seedOffset: theme === 'all' ? 0 : theme.charCodeAt(0),
  });

  const combined = [...filteredCurated, ...proceduralBatch];

  // If the user has prior likes, gently boost their favorite garment/color styles without losing variety
  if (styleVotes && styleVotes.length >= 3) {
    const likedCostumes = new Set(
      styleVotes.filter((v) => v.liked).map((v) => v.costumeId)
    );
    if (likedCostumes.size > 0) {
      // Interleave liked costumes with exploration looks so user always sees diverse outfits
      const favored = combined.filter((l) => likedCostumes.has(l.costumeId));
      const others = combined.filter((l) => !likedCostumes.has(l.costumeId));
      const interleaved: RemixLook[] = [];
      const maxLen = Math.max(favored.length, others.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < others.length) interleaved.push(others[i]);
        if (i < favored.length) interleaved.push(favored[i]);
      }
      return interleaved;
    }
  }

  return combined;
}

const ANGLE_LABELS = [
  '0° Chính diện',
  '90° Nghiêng trái',
  '180° Phía sau',
  '270° Nghiêng phải',
];

/**
 * Component dựng trực tiếp Mô hình 3D trên Trang Chủ (cùng engine với VietPhucCanvas)
 * với đúng màu áo, quần/chân váy, họa tiết, phụ kiện và giới tính ngay trên thẻ Tinder!
 */
const Remix3DCharacterStage: React.FC<{
  look: RemixLook;
  gender: 'male' | 'female';
  angleIdx: number;
  compact?: boolean;
}> = ({ look, gender, angleIdx, compact = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setIsRendering(true);

    const safeAngle = ((angleIdx % 4) + 4) % 4;
    const bottomObj =
      BOTTOM_GARMENTS.find((b) => b.name === look.bottomName) || BOTTOM_GARMENTS[0];
    const mappedAccessories = look.accessoryIds.map((id) => mapAccessoryIdToName(id));

    (async () => {
      try {
        const turntable = await resolveTurntableFrames(look.costumeId, gender);
        if (cancelled || !turntable) {
          if (!cancelled) setIsRendering(false);
          return;
        }

        const frameUrl = await renderRecoloredTurntableFrame({
          modelId: turntable.modelId,
          frameIndex: safeAngle,
          frameSrc: turntable.frames[safeAngle],
          calibratedBaseHue: turntable.calibratedBaseHue,
          aoHex: look.mainColor,
          quanHex: look.bottomColor || bottomObj.hex,
          bottomId: bottomObj.id,
          accessories: mappedAccessories,
          enableTrouserKey: true,
          patternId: look.patternId,
          hoaTietHex: look.hoaTietHex || '#D4AF37',
          patternConfig: {
            scale: 1.2,
            rotationDeg: 0,
            strength: 0.55,
          },
          fabricMaterialId: look.fabricMaterialId || 'lua-ha-dong',
          lightAngleMode: 'studio',
          hairStyle: gender === 'female' ? 'bui-truyen-thong' : 'toc-ivy',
          hairColorHex: '#181513',
          expression: 'trang-nghiem',
          necklineCut: look.necklineCut || 'co-truyen-thong',
          hemLengthCut: look.hemLengthCut || 'ta-dai-chuan',
        });

        if (cancelled) return;

        const targetCanvas = canvasRef.current;
        if (!targetCanvas) return;
        const ctx = targetCanvas.getContext('2d');
        if (!ctx) return;

        const cachedSource = getCachedRecoloredCanvas(frameUrl);
        if (cachedSource) {
          ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
          ctx.drawImage(
            cachedSource,
            0,
            0,
            targetCanvas.width,
            targetCanvas.height
          );
        } else {
          const img = await loadImageElement(frameUrl);
          if (cancelled) return;
          ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
          ctx.drawImage(img, 0, 0, targetCanvas.width, targetCanvas.height);
        }
        setIsRendering(false);
      } catch {
        if (!cancelled) setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    look.costumeId,
    look.mainColor,
    look.bottomName,
    look.bottomColor,
    look.patternId,
    look.hoaTietHex,
    look.fabricMaterialId,
    look.necklineCut,
    look.hemLengthCut,
    look.accessoryIds,
    gender,
    angleIdx,
  ]);

  return (
    <div className="studio-stage relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Studio Radial Highlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255,251,244,0.58) 0%, rgba(242,237,228,0) 66%)',
        }}
      />

      {/* Soft Ground Contact Shadow beneath character's feet */}
      <div
        className="absolute bottom-[6%] w-44 h-7 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(28,25,23,0.26) 0%, rgba(28,25,23,0.09) 52%, rgba(28,25,23,0) 78%)',
        }}
      />

      {/* 3DRecolored Character Canvas (same 768x1152 pipeline as homepage VietPhucCanvas) */}
      <canvas
        ref={canvasRef}
        width={768}
        height={1152}
        className={`relative z-10 w-full h-full object-contain pointer-events-none select-none transition-opacity duration-150 ${
          compact ? 'opacity-70 scale-95' : 'opacity-100'
        }`}
        style={{
          filter: 'drop-shadow(0 10px 14px rgba(28, 25, 23, 0.16))',
        }}
      />

      {isRendering && !compact && (
        <div className="absolute top-12 left-3 z-20 px-2.5 py-1 rounded-full bg-[#1C1917]/75 text-[#FDE68A] text-[10px] font-semibold flex items-center gap-1.5 backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-[#FDE68A] animate-ping" />
          <span>Đang dựng mẫu 3D...</span>
        </div>
      )}
    </div>
  );
};

interface RemixStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Omit<RemixStudioRequest, 'theme' | 'styleVotes'>;
  onApply: (look: RemixLook) => void;
}

export const RemixStudioModal: React.FC<RemixStudioModalProps> = ({
  isOpen,
  onClose,
  request,
  onApply,
}) => {
  const [theme, setTheme] = useState<RemixThemeId>('all');
  const [previewGender, setPreviewGender] = useState<'male' | 'female'>(request.gender);
  const [looks, setLooks] = useState<RemixLook[]>([]);
  const [styleProfile, setStyleProfile] = useState<StylePreferenceVote[]>(readStyleProfile);
  const styleProfileRef = useRef<StylePreferenceVote[]>(styleProfile);
  styleProfileRef.current = styleProfile;

  const [lookIndex, setLookIndex] = useState(0);
  const [sessionLikes, setSessionLikes] = useState(0);
  const [historyStack, setHistoryStack] = useState<
    Array<{ lookIndex: number; look: RemixLook; liked: boolean }>
  >([]);
  const [proceduralBatchCount, setProceduralBatchCount] = useState(1);

  // Multi-view card state:
  // 0 = 3D Studio 0° (Chính diện)
  // 1 = 3D Studio 90° (Nghiêng trái)
  // 2 = 3D Studio 180° (Phía sau)
  // 3 = 3D Studio 270° (Nghiêng phải)
  // 4 = Bảng Phân Tích Chi Tiết Bản Phối
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  // Tinder Swipe Gesture State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const styleInsight = summarizeStyleProfile(styleProfile);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  // Sync gender when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewGender(request.gender);
    }
  }, [isOpen, request.gender]);

  // Initialize deck ONLY when modal opens, theme changes, or gender changes.
  // CRITICAL FIX: Do NOT include `styleProfile` in dependencies so swiping never resets `lookIndex` back to 0!
  const loadDeck = useCallback(
    (targetTheme: RemixThemeId = theme, targetGender: 'male' | 'female' = previewGender) => {
      const catalog = generateDiverseLooksCatalog({
        theme: targetTheme,
        gender: targetGender,
        event: request.event,
        styleVotes: styleProfileRef.current,
      });
      setLooks(catalog);
      setLookIndex(0);
      setActivePhotoIdx(0);
      setHistoryStack([]);
      setExitDirection(null);
      setSwipeOffset(0);
      setSwipeOffsetY(0);
    },
    [theme, previewGender, request.event]
  );

  useEffect(() => {
    if (isOpen) {
      loadDeck(theme, previewGender);
    }
  }, [isOpen, theme, previewGender, loadDeck]);

  // Prewarm 3D turnaround sheets for upcoming cards in background so swiping is 0ms
  useEffect(() => {
    if (!isOpen || looks.length === 0) return;
    const currentLook = looks[lookIndex];
    if (currentLook) {
      prewarmAdjacentTurnaroundSheets(currentLook.costumeId, previewGender);
    }
    for (const upcoming of looks.slice(lookIndex + 1, lookIndex + 4)) {
      resolveTurntableFrames(upcoming.costumeId, previewGender).catch(() => {});
    }
  }, [isOpen, lookIndex, looks, previewGender]);

  // Append more procedural Remix outfits anytime user wants or nears the end of the deck
  const handleAppendMoreRemixLooks = useCallback(() => {
    const nextBatch = generateProceduralRemixBatch({
      theme,
      gender: previewGender,
      count: 12,
      seedOffset: looks.length + proceduralBatchCount * 17,
    });
    setProceduralBatchCount((c) => c + 1);
    setLooks((prev) => [...prev, ...nextBatch]);
  }, [theme, previewGender, looks.length, proceduralBatchCount]);

  // Keyboard navigation support (ArrowLeft = Pass, ArrowRight = Like, Up/Down = Rotate 3D Angle, Space/Enter = Apply 3D)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (looks.length === 0 || lookIndex >= looks.length || exitDirection !== null) return;
      const currentLook = looks[lookIndex];
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerSwipe('left', currentLook);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerSwipe('right', currentLook);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePhotoIdx((prev) => (prev + 1) % 5);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePhotoIdx((prev) => (prev + 4) % 5);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onApply(currentLook);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STYLE_PROFILE_KEY, JSON.stringify(styleProfile));
    } catch {
      // Storage fallback
    }
  }, [styleProfile]);

  if (!isOpen) return null;

  const closeStudio = () => {
    onClose();
  };

  const chooseTheme = (nextTheme: RemixThemeId) => {
    if (nextTheme === theme) return;
    setTheme(nextTheme);
  };

  const rateLook = (look: RemixLook, liked: boolean) => {
    const vote: StylePreferenceVote = {
      costumeId: look.costumeId,
      mainColor: look.mainColor,
      bottomName: look.bottomName,
      bottomColor: look.bottomColor,
      patternId: look.patternId,
      liked,
    };
    const nextProfile = [...styleProfileRef.current, vote].slice(-40);
    setStyleProfile(nextProfile);
    if (liked) setSessionLikes((current) => current + 1);

    setHistoryStack((prev) => [...prev, { lookIndex, look, liked }]);
    setLookIndex((current) => current + 1);
    setActivePhotoIdx(0);
    setSwipeOffset(0);
    setSwipeOffsetY(0);
    setExitDirection(null);
  };

  const triggerSwipe = (direction: 'left' | 'right', look: RemixLook) => {
    if (exitDirection) return;
    setExitDirection(direction);
    setSwipeOffset(direction === 'right' ? 600 : -600);
    setTimeout(() => {
      rateLook(look, direction === 'right');
    }, 220);
  };

  const handleUndo = () => {
    if (historyStack.length === 0 || exitDirection !== null) return;
    const lastAction = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setLookIndex(lastAction.lookIndex);
    setActivePhotoIdx(0);
    setSwipeOffset(0);
    setSwipeOffsetY(0);
    if (lastAction.liked) {
      setSessionLikes((c) => Math.max(0, c - 1));
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    swipeStartX.current = event.clientX;
    swipeStartY.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (swipeStartX.current !== null && swipeStartY.current !== null) {
      const dx = event.clientX - swipeStartX.current;
      const dy = event.clientY - swipeStartY.current;
      setSwipeOffset(dx);
      setSwipeOffsetY(dy * 0.25);
    }
  };

  const handlePointerUp = (look: RemixLook) => {
    if (swipeStartX.current === null) return;
    const distance = swipeOffset;
    swipeStartX.current = null;
    swipeStartY.current = null;
    setIsDragging(false);

    if (Math.abs(distance) >= 80) {
      triggerSwipe(distance > 0 ? 'right' : 'left', look);
    } else {
      setSwipeOffset(0);
      setSwipeOffsetY(0);
    }
  };

  // Rotation and opacity physics
  const swipeRotationDeg = swipeOffset / 14;
  const likeStampOpacity = Math.min(1, Math.max(0, (swipeOffset - 25) / 80));
  const nopeStampOpacity = Math.min(1, Math.max(0, (-swipeOffset - 25) / 80));

  return (
    <div className="fixed inset-0 z-[70] bg-[#141210]/85 backdrop-blur-md p-2 sm:p-4 md:p-6 flex items-center justify-center animate-fade-in">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="remix-studio-title"
        className="w-full max-w-5xl h-[94vh] max-h-[900px] overflow-hidden flex flex-col bg-[#F6F1E8] border border-[#D9CEBC] shadow-2xl rounded-2xl"
      >
        {/* Modal Header */}
        <header className="px-4 sm:px-6 py-3 border-b border-[#DED4C3] flex items-center justify-between gap-3 bg-[#FBF8F1] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#9A3412] to-[#EA580C] text-white flex items-center justify-center shadow-md shadow-[#9A3412]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="remix-studio-title"
                  className="text-lg sm:text-xl font-editorial font-bold text-[#201B17]"
                >
                  Style Shuffle · Lướt Gu Việt Phục 3D
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-[#EAE3D7] text-[#78350F] rounded-full uppercase tracking-wider">
                  Tinder 3D Studio
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#685F54]">
                Dựng trực tiếp từ mô hình 3D trang chủ với 8 cổ phục, bảng màu lụa & hạ y. Quẹt phải để thích, quẹt trái để qua bộ mới!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Nam / Nữ 3D Model Switcher */}
            <div className="flex items-center bg-[#EBE6DF] p-0.5 rounded-lg border border-[#D9CEBC] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewGender('male')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  previewGender === 'male'
                    ? 'bg-[#1C1917] text-[#FDE68A]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Mẫu Nam 3D
              </button>
              <button
                type="button"
                onClick={() => setPreviewGender('female')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  previewGender === 'female'
                    ? 'bg-[#9A3412] text-[#FBF9F5]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Mẫu Nữ 3D
              </button>
            </div>

            <button
              type="button"
              onClick={closeStudio}
              aria-label="Đóng Studio"
              className="p-2 text-[#554D44] hover:text-black hover:bg-black/5 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Theme Pills Selector + Infinite Remix Generator Button */}
        <div className="px-4 sm:px-6 py-2 bg-[#F4EDE0] border-b border-[#E3D9C8] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78350F] shrink-0 mr-1">
              Chủ đề:
            </span>
            {THEMES.map((item) => {
              const selected = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseTheme(item.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#1C1917] text-[#FBF8F1] shadow-md'
                      : 'bg-[#FBF8F1] text-[#4C443B] border border-[#D9CEBC] hover:border-[#1C1917]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAppendMoreRemixLooks}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#9A3412] hover:bg-[#7C2D12] text-[#FDE68A] flex items-center gap-1.5 shrink-0 shadow-xs transition-colors cursor-pointer"
            title="Sinh thêm 12 bản phối Remix ngẫu nhiên mới vào bộ thẻ hiện tại"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>+12 Remix Mới</span>
          </button>
        </div>

        {/* Main Swipe Arena */}
        <div className="flex-1 overflow-hidden p-3 sm:p-4 flex flex-col items-center justify-center relative select-none">
          {looks.length > 0 && lookIndex < looks.length ? (
            (() => {
              const look = looks[lookIndex];
              const nextLook = looks[lookIndex + 1];
              const thirdLook = looks[lookIndex + 2];
              const garment = TOP_GARMENTS.find((item) => item.id === look.costumeId);
              const colorName =
                TRADITIONAL_COLORS.find(
                  (c) => c.hex.toLowerCase() === look.mainColor.toLowerCase()
                )?.name.replace('Màu ', '') || look.mainColor;
              const fabricName =
                FABRIC_MATERIALS.find((f) => f.id === look.fabricMaterialId)?.shortName ||
                'Lụa Hà Đông';

              return (
                <div className="w-full max-w-md h-full max-h-[650px] flex flex-col relative">
                  {/* Card Counter & Session Likes Pill */}
                  <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-[#685F54]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                      <span>
                        Bản phối <strong>{lookIndex + 1}</strong> / {looks.length}
                      </span>
                      <span className="text-[#A8A29E]">·</span>
                      <span className="text-[#78350F] font-mono-tabular">
                        8 Cổ Phục 3D
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#BE185D] font-bold">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>{sessionLikes} đã thích</span>
                    </div>
                  </div>

                  {/* STACKED CARDS CONTAINER */}
                  <div className="flex-1 relative w-full h-full min-h-[430px]">
                    {/* Background Card 3 (Lowest layer) */}
                    {thirdLook && (
                      <div
                        className="absolute inset-0 rounded-2xl bg-[#E8DFC8] border border-[#D9CEBC] shadow-md pointer-events-none transition-all duration-300"
                        style={{
                          transform: 'translateY(16px) scale(0.92)',
                          opacity: 0.5,
                          zIndex: 10,
                        }}
                      />
                    )}

                    {/* Background Card 2 (Middle layer with real 3D preview of nextLook) */}
                    {nextLook && (
                      <div
                        className="absolute inset-0 rounded-2xl bg-[#F0E8D7] border border-[#D9CEBC] shadow-lg pointer-events-none transition-all duration-300 overflow-hidden"
                        style={{
                          transform: `translateY(${Math.max(
                            0,
                            8 - Math.abs(swipeOffset) * 0.03
                          )}px) scale(${Math.min(
                            1.0,
                            0.96 + Math.abs(swipeOffset) * 0.0002
                          )})`,
                          opacity: Math.min(1.0, 0.85 + Math.abs(swipeOffset) * 0.0005),
                          zIndex: 20,
                        }}
                      >
                        <Remix3DCharacterStage
                          look={nextLook}
                          gender={previewGender}
                          angleIdx={0}
                          compact
                        />
                      </div>
                    )}

                    {/* Active Top Card (Swipable Layer) */}
                    <article
                      key={look.uid || `${look.costumeId}-${lookIndex}`}
                      className="absolute inset-0 rounded-2xl bg-[#FBF8F1] border-2 border-[#D9CEBC] shadow-2xl overflow-hidden flex flex-col transition-all cursor-grab active:cursor-grabbing"
                      style={{
                        zIndex: 30,
                        transform: `translate3d(${swipeOffset}px, ${swipeOffsetY}px, 0) rotate(${swipeRotationDeg}deg)`,
                        opacity: exitDirection ? 0 : 1,
                        transition: isDragging
                          ? 'none'
                          : 'transform 240ms cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 200ms ease',
                        touchAction: 'none',
                      }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={() => handlePointerUp(look)}
                      onPointerCancel={() => {
                        swipeStartX.current = null;
                        swipeStartY.current = null;
                        setIsDragging(false);
                        setSwipeOffset(0);
                        setSwipeOffsetY(0);
                      }}
                    >
                      {/* TINDER BADGES: LIKE STAMP */}
                      <div
                        className="absolute top-12 left-6 z-40 border-4 border-[#16A34A] text-[#16A34A] font-black text-2xl sm:text-3xl px-3 py-1 rounded-xl uppercase tracking-widest pointer-events-none transform -rotate-12 shadow-lg bg-[#16A34A]/15 backdrop-blur-xs"
                        style={{
                          opacity: likeStampOpacity,
                          transform: `rotate(-14deg) scale(${0.85 + likeStampOpacity * 0.25})`,
                        }}
                      >
                        💚 THÍCH
                      </div>

                      {/* TINDER BADGES: NOPE STAMP */}
                      <div
                        className="absolute top-12 right-6 z-40 border-4 border-[#DC2626] text-[#DC2626] font-black text-2xl sm:text-3xl px-3 py-1 rounded-xl uppercase tracking-widest pointer-events-none transform rotate-12 shadow-lg bg-[#DC2626]/15 backdrop-blur-xs"
                        style={{
                          opacity: nopeStampOpacity,
                          transform: `rotate(14deg) scale(${0.85 + nopeStampOpacity * 0.25})`,
                        }}
                      >
                        ❌ BỎ QUA
                      </div>

                      {/* Top Stories Progress Bars (5 Views: 0° / 90° / 180° / 270° / Chi tiết) */}
                      <div className="absolute top-2.5 left-3 right-3 z-30 flex items-center gap-1">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIdx(idx);
                            }}
                            className="flex-1 h-1.5 rounded-full bg-black/25 backdrop-blur-xs overflow-hidden cursor-pointer"
                          >
                            <div
                              className={`h-full transition-all duration-200 ${
                                activePhotoIdx === idx
                                  ? 'bg-[#9A3412] shadow'
                                  : activePhotoIdx > idx
                                  ? 'bg-[#1C1917]/70'
                                  : 'bg-transparent'
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Interactive 3D Angle Selector Bar inside Card */}
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between gap-1 pointer-events-auto"
                      >
                        <div className="flex items-center gap-1 bg-[#FBF9F5]/90 backdrop-blur-md border border-[#DFD8C8] px-2 py-0.5 rounded-full shadow-xs">
                          <Layers className="w-3 h-3 text-[#9A3412]" />
                          <span className="text-[10px] font-bold text-[#1C1917]">
                            {activePhotoIdx < 4
                              ? `Mô Hình 3D · ${ANGLE_LABELS[activePhotoIdx]}`
                              : 'Bảng Phân Tích Phối Đồ'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIdx((prev) => (prev < 3 ? prev + 1 : 0));
                            }}
                            className="px-2.5 py-0.5 bg-[#1C1917]/85 hover:bg-[#1C1917] text-[#FDE68A] rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Xoay góc 3D (0° / 90° / 180° / 270°)"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Xoay 360°</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIdx((prev) => (prev === 4 ? 0 : 4));
                            }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs cursor-pointer ${
                              activePhotoIdx === 4
                                ? 'bg-[#9A3412] text-white border-[#9A3412]'
                                : 'bg-[#FBF9F5]/90 text-[#1C1917] border-[#DFD8C8]'
                            }`}
                          >
                            {activePhotoIdx === 4 ? 'Xem 3D' : 'Chi tiết'}
                          </button>
                        </div>
                      </div>

                      {/* Card Media Container */}
                      <div className="relative flex-1 w-full bg-[#F2EDE4] overflow-hidden">
                        {/* VIEWS 0..3: LIVE RECOLORED 3D STUDIO CHARACTER FROM HOMEPAGE */}
                        {activePhotoIdx < 4 && (
                          <Remix3DCharacterStage
                            look={look}
                            gender={previewGender}
                            angleIdx={activePhotoIdx}
                          />
                        )}

                        {/* VIEW 4: Palette & Cultural Breakdown */}
                        {activePhotoIdx === 4 && (
                          <div className="w-full h-full bg-[#201C18] p-5 pt-12 flex flex-col justify-center text-white space-y-3">
                            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                              <Palette className="w-4 h-4" />
                              <span>Cấu Trúc Bản Phối 3D</span>
                            </div>
                            <div className="space-y-2">
                              <div className="p-2.5 bg-white/10 rounded-xl flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-white/60 uppercase">
                                    Áo Thượng Y ({garment?.dynasty})
                                  </p>
                                  <p className="text-sm font-bold">
                                    {garment?.baseName} · {colorName}
                                  </p>
                                </div>
                                <span
                                  className="w-7 h-7 rounded-full border-2 border-white shadow-md shrink-0"
                                  style={{ backgroundColor: look.mainColor }}
                                  title="Màu áo"
                                />
                              </div>
                              <div className="p-2.5 bg-white/10 rounded-xl flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-white/60 uppercase">
                                    Quần / Chân Váy Hạ Y
                                  </p>
                                  <p className="text-sm font-bold">{look.bottomName}</p>
                                </div>
                                <span
                                  className="w-7 h-7 rounded-full border-2 border-white shadow-md shrink-0"
                                  style={{ backgroundColor: look.bottomColor }}
                                  title="Màu quần"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 bg-white/10 rounded-xl">
                                  <span className="text-[10px] text-white/60 block uppercase">
                                    Hoa văn dệt
                                  </span>
                                  <span className="font-semibold text-[#FDE68A]">
                                    {look.patternId === 'none'
                                      ? 'Lụa Dệt Trơn'
                                      : TRADITIONAL_PATTERNS.find((p) => p.id === look.patternId)
                                          ?.name || look.patternId}
                                  </span>
                                </div>
                                <div className="p-2.5 bg-white/10 rounded-xl">
                                  <span className="text-[10px] text-white/60 block uppercase">
                                    Chất liệu PBR
                                  </span>
                                  <span className="font-semibold text-[#FDE68A]">
                                    {fabricName}
                                  </span>
                                </div>
                              </div>
                              <div className="p-2.5 bg-white/10 rounded-xl text-xs">
                                <span className="text-[10px] text-white/60 block uppercase">
                                  Bối cảnh gợi ý
                                </span>
                                <span className="text-white/90 leading-snug">
                                  {look.contextNote}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Left / Right Tap zones to rotate 3D angles */}
                        <div
                          className="absolute inset-y-12 left-0 w-1/4 z-20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : 4));
                          }}
                          title="Góc 3D trước"
                        />
                        <div
                          className="absolute inset-y-12 right-0 w-1/4 z-20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePhotoIdx((prev) => (prev < 4 ? prev + 1 : 0));
                          }}
                          title="Góc 3D tiếp theo"
                        />

                        {/* Bottom Gradient Overlay for Title Readability */}
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#141210]/90 via-[#141210]/45 to-transparent pointer-events-none z-20" />

                        {/* Floating Info on Image Bottom */}
                        <div className="absolute bottom-3 left-4 right-4 text-white z-20 pointer-events-none">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/45 border border-white/20 backdrop-blur-md">
                              {garment?.baseName || 'Việt Phục'}
                            </span>
                            <span className="text-xs font-mono-tabular font-bold bg-[#9A3412] px-2.5 py-0.5 rounded-full shadow">
                              {look.remix}% Remix
                            </span>
                          </div>
                          <h3 className="mt-1 text-xl sm:text-2xl font-editorial font-bold leading-tight drop-shadow-md">
                            {look.title}
                          </h3>
                          <p className="text-xs text-white/90 font-medium line-clamp-1 drop-shadow-sm mt-0.5">
                            {look.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Card Info Footer (Stylist & Cultural Note) */}
                      <div className="p-3.5 bg-[#FBF8F1] border-t border-[#E3D9C8] flex flex-col justify-between shrink-0 space-y-2">
                        <p className="text-xs text-[#4C443B] leading-relaxed line-clamp-2">
                          <span className="font-bold text-[#9A3412]">AI Stylist: </span>
                          {look.stylistNote}
                        </p>

                        <div className="flex items-center justify-between pt-0.5 text-[11px] text-[#78350F] font-semibold">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: look.mainColor }}
                            />
                            <span className="truncate">{colorName}</span>
                            <span className="text-[#A8A29E]">×</span>
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: look.bottomColor }}
                            />
                            <span className="truncate">{look.bottomName}</span>
                          </div>
                          <span className="text-[10px] text-[#9A3412] shrink-0 ml-2">
                            Chạm cạnh thẻ để xoay 360°
                          </span>
                        </div>
                      </div>
                    </article>
                  </div>

                  {/* TINDER BOTTOM ACTION CONTROLS */}
                  <div className="mt-3.5 flex items-center justify-center gap-3 sm:gap-5 shrink-0 z-40">
                    {/* REWIND BUTTON */}
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={historyStack.length === 0}
                      title="Quay lại bộ trước"
                      className="w-11 h-11 rounded-full bg-white border border-[#D9CEBC] text-[#D97706] hover:bg-[#FEF3C7] flex items-center justify-center shadow-md transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* DISLIKE / NOPE BUTTON */}
                    <button
                      type="button"
                      onClick={() => triggerSwipe('left', look)}
                      title="Bỏ qua (Quẹt trái)"
                      className="w-14 h-14 rounded-full bg-white border-2 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#FEE2E2] hover:border-[#EF4444] flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
                    >
                      <X className="w-7 h-7 stroke-[3]" />
                    </button>

                    {/* APPLY TO 3D STUDIO (HERO ACTION) */}
                    <button
                      type="button"
                      onClick={() => onApply(look)}
                      title="Mặc thử ngay vào Studio 3D chính"
                      className="px-5 h-14 rounded-full bg-gradient-to-r from-[#134E4A] to-[#047857] text-[#FBF8F1] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#134E4A]/30 hover:scale-105 transition-all active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#FDE68A]" />
                      <span>Mặc Thử 3D</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* LIKE BUTTON */}
                    <button
                      type="button"
                      onClick={() => triggerSwipe('right', look)}
                      title="Thích bộ này (Quẹt phải)"
                      className="w-14 h-14 rounded-full bg-white border-2 border-[#16A34A]/30 text-[#16A34A] hover:bg-[#DCFCE7] hover:border-[#16A34A] flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
                    >
                      <Heart className="w-7 h-7 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            /* DECK FINISHED SCREEN */
            <div className="max-w-md w-full p-6 bg-[#FBF8F1] border border-[#D9CEBC] rounded-2xl shadow-xl text-center space-y-4 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mx-auto shadow-inner">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#16A34A]">
                  Hoàn Thành Vòng Phối
                </span>
                <h3 className="text-2xl font-editorial font-bold text-[#201B17] mt-1">
                  Đã lướt qua {looks.length} bản phối 3D!
                </h3>
                <p className="text-xs text-[#685F54] mt-2 leading-relaxed">
                  Bạn đã thả tim <strong className="text-[#16A34A]">{sessionLikes}</strong> bộ trong phiên này.
                </p>
              </div>

              {styleProfile.length > 0 && (
                <div className="p-3.5 bg-[#F4EDE0] rounded-xl border border-[#E3D9C8] text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A3412]">
                    Phân Tích Gu Của Bạn
                  </p>
                  <p className="text-xs text-[#4C443B] leading-relaxed mt-1">{styleInsight}</p>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleAppendMoreRemixLooks}
                  className="flex-1 py-3 bg-[#134E4A] hover:bg-[#0F3F3C] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shuffle className="w-4 h-4 text-[#FDE68A]" />
                  <span>+ Tạo Tiếp 12 Bản Phối Mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadDeck(theme, previewGender)}
                  className="py-3 px-4 bg-[#9A3412] hover:bg-[#7C2D12] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Lướt Lại Từ Đầu</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Info */}
        <footer className="px-4 sm:px-6 py-2.5 bg-[#FBF8F1] border-t border-[#DED4C3] flex items-center justify-between text-[11px] text-[#78350F] shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span>💡 Phím tắt:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#D9CEBC] rounded text-[10px] font-mono">
              ← Bỏ qua
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#D9CEBC] rounded text-[10px] font-mono">
              → Thích
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#D9CEBC] rounded text-[10px] font-mono">
              ↑/↓ Xoay góc 3D
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#D9CEBC] rounded text-[10px] font-mono">
              Space Mặc thử
            </kbd>
          </div>
          <span className="hidden sm:inline text-[#685F54] truncate max-w-xs">
            {styleInsight}
          </span>
        </footer>
      </section>
    </div>
  );
};
