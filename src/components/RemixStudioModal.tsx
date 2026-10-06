import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowRight,
  Heart,
  RotateCcw,
  Sparkles,
  X,
  Layers,
  Palette,
  Eye,
} from 'lucide-react';
import {
  RemixLook,
  RemixStudioRequest,
  RemixThemeId,
  StylePreferenceVote,
} from '../types/remix';
import { culturalData } from '../data/culturalDataLoader';
import {
  TOP_GARMENTS,
  TRADITIONAL_COLORS,
  TRADITIONAL_PATTERNS,
} from '../data/vietPhucData';

const THEMES: Array<{ id: RemixThemeId; label: string; hint: string; icon: string }> = [
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
        ).slice(-30)
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
 * Sinh danh mục bộ phối phong phú (12+ looks) đa dạng về phom dáng, màu sắc, chất liệu và phong cách
 */
function generateDiverseLooksCatalog(params: {
  theme: RemixThemeId;
  gender: 'male' | 'female';
  event: string;
  styleVotes: StylePreferenceVote[];
}): RemixLook[] {
  const { theme, gender, styleVotes } = params;
  const isFemale = gender === 'female';

  const baseLooks: RemixLook[] = [];

  // Theme 1: Everyday (Phố cổ cuối tuần)
  if (theme === 'everyday') {
    baseLooks.push(
      {
        id: 'everyday',
        title: 'Thư Sinh Phố Cổ',
        tagline: 'Gọn gàng, thoáng mát dạo phố',
        stylistNote: isFemale
          ? 'Áo Bà Ba lụa hồng cánh sen phối Quần Lụa Trắng thanh tao, kèm Khăn Rằn tạo vẻ đẹp mộc mạc Nam Bộ.'
          : 'Áo Ngũ Thân Tay Chẽn xanh chàm mộc kết hợp Quần Lĩnh Đen, phom tay gọn dễ dàng di chuyển và chụp ảnh.',
        costumeId: isFemale ? 'ao-ba-ba-nam-bo' : 'ao-ngu-than-tay-chen',
        mainColor: isFemale ? '#BE185D' : '#134E4A',
        bottomName: isFemale ? 'Quần Lụa Trắng' : 'Quần Lĩnh Đen Ống Rộng',
        bottomColor: isFemale ? '#F5F1E8' : '#181615',
        patternId: 'none',
        accessoryIds: isFemale ? ['acc-khan-ran'] : ['acc-quat-tram'],
        remix: 15,
        contextNote: 'Phối màu kinh điển cho các buổi cafe cuối tuần hoặc dạo quanh phố cổ Hội An / Hà Nội.',
      },
      {
        id: 'everyday',
        title: 'Nhịp Sống Đương Đại',
        tagline: 'Cổ phục gặp chất liệu thường ngày',
        stylistNote: 'Áo Ngũ Thân kết hợp Quần Kaki ống rộng tạo cảm giác trẻ trung, đĩnh đạc nhưng không hề gò bó.',
        costumeId: isFemale ? 'ao-dai-truyen-thong' : 'ao-ngu-than-tay-chen',
        mainColor: '#D97706',
        bottomName: 'Quần Kaki Ống Rộng Contemporary',
        bottomColor: '#C5A880',
        patternId: 'pattern_may_co',
        accessoryIds: ['kinh-ram-retro'],
        remix: 45,
        contextNote: 'Sự giao thoa độc đáo giữa tà áo truyền thống và phom quần Smart-Casual đương đại.',
      },
      {
        id: 'everyday',
        title: 'Bạch Ngọc Thanh Tao',
        tagline: 'Tối giản thuần khiết chuẩn mực',
        stylistNote: isFemale
          ? 'Áo Dài trắng ngà thêu hoa cúc dây, phối Quần Lụa Trắng tạo nét đẹp tinh khôi nữ sinh trường Đồng Khánh.'
          : 'Áo Ngũ Thân trắng ngà kết hợp chuỗi hạt gỗ và quạt trầm nho nhã.',
        costumeId: isFemale ? 'ao-dai-truyen-thong' : 'ao-ngu-than-tay-chen',
        mainColor: '#F5F1E8',
        bottomName: 'Quần Lụa Trắng',
        bottomColor: '#F5F1E8',
        patternId: 'pattern_cuc_day',
        accessoryIds: isFemale ? ['acc-chuoi-ngoc'] : ['acc-quat-tram'],
        remix: 10,
        contextNote: 'Bản phối bất hủ phù hợp mọi không gian từ trường học, bảo tàng đến đường phố.',
      },
      {
        id: 'everyday',
        title: 'Sắc Chàm Phương Nam',
        tagline: 'Bình dị, phóng khoáng, đậm chất sông nước',
        stylistNote: 'Áo Bà Ba Nam Bộ vải lụa tơ tằm mềm mại phối cùng Quần Lĩnh Đen bóng nhẹ, bước đi êm ái với guốc mộc.',
        costumeId: 'ao-ba-ba-nam-bo',
        mainColor: '#1E3A8A',
        bottomName: 'Quần Lĩnh Đen Ống Rộng',
        bottomColor: '#181615',
        patternId: 'none',
        accessoryIds: ['acc-khan-ran', 'acc-guoc-moc'],
        remix: 12,
        contextNote: 'Cực kỳ tôn dáng và mát mẻ cho những chuyến du lịch miền Tây sông nước.',
      }
    );
  }

  // Theme 2: Editorial (Kỷ yếu hoài cổ)
  if (theme === 'editorial') {
    baseLooks.push(
      {
        id: 'editorial',
        title: 'Hoàng Kim Cung Đình',
        tagline: 'Sắc gấm quyền quý, chiều sâu điện ảnh',
        stylistNote: isFemale
          ? 'Áo Nhật Bình sắc đỏ son vương giả phối cùng Thường Lụa xếp ly vàng kim dệt chìm hoa văn Thủy Ba.'
          : 'Áo Tấc tay thụng xanh cổ vịt quý phái, tay áo rộng buông rủ tạo độ uy nghi cho từng khung hình.',
        costumeId: isFemale ? 'ao-nhat-binh' : 'ao-tac',
        mainColor: isFemale ? '#9A2B1D' : '#134E4A',
        bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
        bottomColor: isFemale ? '#D4AF37' : '#F5F1E8',
        patternId: 'pattern_song_nuoc',
        accessoryIds: isFemale ? ['acc-khan-van', 'acc-chuoi-ngoc'] : ['acc-khan-dong', 'acc-quat-tram'],
        remix: 25,
        contextNote: 'Bản phối chuẩn mực cho bộ ảnh kỷ yếu hoàng gia tại Hoàng Thành Thăng Long hoặc Đại Nội Huế.',
      },
      {
        id: 'editorial',
        title: 'Kinh Bắc Duyên Thầm',
        tagline: 'Nét duyên quan họ bên tà áo Tứ Thân',
        stylistNote: 'Áo Tứ Thân Kinh Bắc phối Yếm Đào son thắm, dải thắt lưng xanh buông rủ cùng Nón Quai Thao đặc trưng.',
        costumeId: 'ao-tu-than-kinh-bac',
        mainColor: '#181615',
        bottomName: 'Thường Lụa Xếp Ly',
        bottomColor: '#9A2B1D',
        patternId: 'pattern_chim_lac',
        accessoryIds: ['acc-non-quai-thao'],
        remix: 20,
        contextNote: 'Tái hiện không gian lễ hội vùng Kinh Bắc với vẻ đẹp đằm thắm của người phụ nữ xưa.',
      },
      {
        id: 'editorial',
        title: 'Tím Huế Mộng Mơ',
        tagline: 'Nét thơ trầm mặc xứ Thần Kinh',
        stylistNote: 'Áo Dài sắc tím Huế mộng mơ phối cùng Quần Lụa Trắng, nón lá bài thơ và chuỗi ngọc thanh nhã.',
        costumeId: 'ao-dai-truyen-thong',
        mainColor: '#6B21A8',
        bottomName: 'Quần Lụa Trắng',
        bottomColor: '#F5F1E8',
        patternId: 'pattern_cuc_day',
        accessoryIds: ['acc-chuoi-ngoc', 'acc-quat-tram'],
        remix: 15,
        contextNote: 'Tone màu tím đặc trưng gắn liền với vẻ đẹp dịu dàng của người con gái sông Hương.',
      },
      {
        id: 'editorial',
        title: 'Giao Lĩnh Thư Quán',
        tagline: 'Phong thái nho nhã thời Lê - Nguyễn',
        stylistNote: 'Áo Giao Lĩnh Hữu Nhậm cổ chéo thanh tú, phối cùng quần lụa dài và quạt xếp cổ mạ vàng.',
        costumeId: 'ao-giao-linh',
        mainColor: '#047857',
        bottomName: 'Quần Lụa Trắng',
        bottomColor: '#F5F1E8',
        patternId: 'pattern_may_co',
        accessoryIds: ['acc-quat-tram'],
        remix: 18,
        contextNote: 'Vẻ đẹp học thức, uyên bác của các sĩ tử chốn kinh kỳ xưa.',
      }
    );
  }

  // Theme 3: Festival (Concert & Lễ hội)
  if (theme === 'festival') {
    baseLooks.push(
      {
        id: 'festival',
        title: 'Gen Z Cháy Phố',
        tagline: 'Phá cách Streetwear đậm chất Việt',
        stylistNote: 'Áo Ngũ Thân cách tân phối Quần Jeans ống suông, mix Kính râm Retro và Sneaker bừng sáng sân khấu.',
        costumeId: isFemale ? 'ao-dai-truyen-thong' : 'ao-ngu-than-tay-chen',
        mainColor: '#D97706',
        bottomName: 'Quần Jeans Ống Suông Cổ Điển',
        bottomColor: '#1E40AF',
        patternId: 'none',
        accessoryIds: ['kinh-ram-retro', 'acc-sneaker-streetwear'],
        remix: 72,
        contextNote: 'Xu hướng Việt Phục Remix đang bùng nổ tại các concert âm nhạc truyền thống đương đại.',
      },
      {
        id: 'festival',
        title: 'Lãnh Mỹ A Cyberpunk',
        tagline: 'Sắc đen huyền bí giao thoa tương lai',
        stylistNote: 'Áo Bà Ba lụa Lãnh Mỹ A đen tuyền phối Quần Kaki ống rộng, điểm xuyết kính mắt mèo cá tính.',
        costumeId: 'ao-ba-ba-nam-bo',
        mainColor: '#181615',
        bottomName: 'Quần Kaki Ống Rộng Contemporary',
        bottomColor: '#C5A880',
        patternId: 'pattern_chim_lac',
        accessoryIds: ['kinh-ram-retro'],
        remix: 65,
        contextNote: 'Tạo hình ấn tượng cho các festival thời trang và sự kiện sáng tạo của giới trẻ.',
      },
      {
        id: 'festival',
        title: 'Rực Rỡ Lễ Hội',
        tagline: 'Năng lượng bùng nổ của sắc màu',
        stylistNote: 'Áo Ngũ Thân sắc xanh hoàng gia kết hợp hoa văn Chim Lạc Đông Sơn ánh kim nổi bật giữa đám đông.',
        costumeId: isFemale ? 'ao-nhat-binh' : 'ao-ngu-than-tay-chen',
        mainColor: '#1E3A8A',
        bottomName: 'Quần Jeans Ống Suông Cổ Điển',
        bottomColor: '#1E40AF',
        patternId: 'pattern_chim_lac',
        accessoryIds: ['acc-sneaker-streetwear'],
        remix: 58,
        contextNote: 'Cực kỳ bắt mắt dưới ánh đèn sân khấu và các đêm nhạc hội văn hóa.',
      }
    );
  }

  // Theme 4: Formal (Lễ nghi trang trọng)
  if (theme === 'formal') {
    baseLooks.push(
      {
        id: 'formal',
        title: 'Quốc Lễ Đại Triều',
        tagline: 'Tuyệt đỉnh uy nghiêm vương triều Đại Việt',
        stylistNote: isFemale
          ? 'Áo Nhật Bình gấm ngũ sắc cung đình, viền cổ thêu chim phượng, phối Thường Lụa vàng dệt hoa văn Thủy Ba.'
          : 'Áo Viên Lĩnh Bổ Tử thêu Kỳ Lân dệt chỉ kim tuyến, đi kèm Khăn Đóng chữ Nhất và quần lụa trắng ngà.',
        costumeId: isFemale ? 'ao-nhat-binh' : 'ao-vien-linh',
        mainColor: isFemale ? '#9A2B1D' : '#1E3A8A',
        bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
        bottomColor: isFemale ? '#D4AF37' : '#F5F1E8',
        patternId: 'pattern_song_nuoc',
        accessoryIds: isFemale ? ['acc-khan-van', 'acc-chuoi-ngoc'] : ['acc-khan-dong'],
        remix: 5,
        contextNote: 'Lễ phục tối cao dành cho các đại lễ ngoại giao, lễ tế tôn nghiêm và sự kiện quốc gia.',
      },
      {
        id: 'formal',
        title: 'Áo Tấc Lễ Hôn Phối',
        tagline: 'Chuẩn mực lễ phục cưới truyền thống',
        stylistNote: 'Áo Tấc tay thụng sắc đỏ điều thêu hoa cúc dây trường thọ, giữ trọn nếp nhà gia giáo trong ngày trọng đại.',
        costumeId: 'ao-tac',
        mainColor: '#9A2B1D',
        bottomName: 'Quần Lụa Trắng',
        bottomColor: '#F5F1E8',
        patternId: 'pattern_cuc_day',
        accessoryIds: ['acc-khan-dong', 'acc-quat-tram'],
        remix: 8,
        contextNote: 'Mẫu áo được các cặp đôi ưa chuộng hàng đầu trong nghi lễ rước dâu và gia tiên.',
      },
      {
        id: 'formal',
        title: 'Nho Phong Nhã Nhặn',
        tagline: 'Khí chất đĩnh đạc nơi cửa Phật',
        stylistNote: 'Áo Ngũ Thân xanh sẫm kết hợp Quần Lụa Trắng kín đáo, thanh tao và đoan chính khi viếng chùa đền.',
        costumeId: 'ao-ngu-than-tay-chen',
        mainColor: '#134E4A',
        bottomName: 'Quần Lụa Trắng',
        bottomColor: '#F5F1E8',
        patternId: 'none',
        accessoryIds: ['acc-quat-tram'],
        remix: 5,
        contextNote: 'Đảm bảo 100% quy chuẩn văn hóa tôn nghiêm tại các không gian linh thiêng.',
      }
    );
  }

  // Theme 5: Heritage (Tự do khám phá)
  if (theme === 'heritage') {
    baseLooks.push(
      {
        id: 'heritage',
        title: 'Dấu Ấn Giao Lĩnh',
        tagline: 'Cổ phục ngàn năm thời Lý - Trần',
        stylistNote: 'Áo Giao Lĩnh vạt chéo kết hợp dải ngũ sắc thắt eo, tái hiện khí chất hào sảng thời kỳ phục hưng Đại Việt.',
        costumeId: 'ao-giao-linh',
        mainColor: '#047857',
        bottomName: isFemale ? 'Thường Lụa Xếp Ly' : 'Quần Lụa Trắng',
        bottomColor: isFemale ? '#D4AF37' : '#F5F1E8',
        patternId: 'pattern_chim_lac',
        accessoryIds: ['acc-quat-tram'],
        remix: 15,
        contextNote: 'Một trong những thức áo cổ kính bậc nhất trong dòng chảy lịch sử Việt Phục.',
      },
      {
        id: 'heritage',
        title: 'Hương Sắc Kinh Kỳ',
        tagline: 'Vẻ đẹp đoan trang thiếu nữ thành thị xưa',
        stylistNote: 'Áo Ngũ Thân tơ tằm dệt chìm hoa cúc dây kết hợp Khăn Đóng gấm nhung quý phái.',
        costumeId: 'ao-ngu-than-tay-chen',
        mainColor: '#BE185D',
        bottomName: 'Quần Lĩnh Đen Ống Rộng',
        bottomColor: '#181615',
        patternId: 'pattern_cuc_day',
        accessoryIds: ['acc-khan-dong', 'acc-chuoi-ngoc'],
        remix: 12,
        contextNote: 'Tái hiện phong thái đài các của các tiểu thư Hà thành đầu thế kỷ XX.',
      },
      {
        id: 'heritage',
        title: 'Bổ Tử Triều Đình',
        tagline: 'Cốt cách quan chức thời Lê Trung Hưng',
        stylistNote: 'Áo Viên Lĩnh cổ tròn đính Bổ Tử vuông trước ngực, mang đậm dấu ấn phẩm phục cung đình.',
        costumeId: 'ao-vien-linh',
        mainColor: '#1E3A8A',
        bottomName: 'Quần Lụa Trắng',
        bottomColor: '#F5F1E8',
        patternId: 'pattern_may_co',
        accessoryIds: ['acc-khan-dong'],
        remix: 8,
        contextNote: 'Bộ trang phục mang giá trị nghiên cứu và phục dựng lịch sử sâu sắc.',
      }
    );
  }

  // Personalize deck based on user's liked votes if available
  if (styleVotes && styleVotes.length > 0) {
    const likedCostumes = styleVotes.filter((v) => v.liked).map((v) => v.costumeId);
    if (likedCostumes.length > 0) {
      baseLooks.sort((a, b) => {
        const aFav = likedCostumes.includes(a.costumeId) ? 1 : 0;
        const bFav = likedCostumes.includes(b.costumeId) ? 1 : 0;
        return bFav - aFav;
      });
    }
  }

  return baseLooks;
}

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
  const [theme, setTheme] = useState<RemixThemeId>('everyday');
  const [looks, setLooks] = useState<RemixLook[]>([]);
  const [styleProfile, setStyleProfile] = useState<StylePreferenceVote[]>(readStyleProfile);
  const [lookIndex, setLookIndex] = useState(0);
  const [sessionLikes, setSessionLikes] = useState(0);
  const [historyStack, setHistoryStack] = useState<Array<{ lookIndex: number; look: RemixLook; liked: boolean }>>([]);

  // Multi-photo card carousel state (0 = 3D Studio, 1 = Lookbook Editorial, 2 = Bảng màu & Chi tiết)
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  // Tinder Swipe Gesture State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const styleInsight = summarizeStyleProfile(styleProfile);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  // Initialize and preload looks on theme change
  const loadDeck = useCallback(() => {
    const catalog = generateDiverseLooksCatalog({
      theme,
      gender: request.gender,
      event: request.event,
      styleVotes: styleProfile,
    });
    setLooks(catalog);
    setLookIndex(0);
    setActivePhotoIdx(0);
    setHistoryStack([]);
    setExitDirection(null);
  }, [theme, request.gender, request.event, styleProfile]);

  useEffect(() => {
    if (isOpen) {
      loadDeck();
    }
  }, [isOpen, theme, loadDeck]);

  // Preload next images in background
  useEffect(() => {
    if (!isOpen || looks.length === 0) return;
    for (const look of looks.slice(lookIndex, lookIndex + 4)) {
      const garment = TOP_GARMENTS.find((item) => item.id === look.costumeId);
      if (!garment) continue;
      for (const src of [garment.stylized3dImage || garment.image, garment.image]) {
        const image = new Image();
        image.decoding = 'async';
        image.src = src;
      }
    }
  }, [isOpen, lookIndex, looks]);

  // Keyboard navigation support (ArrowLeft = Pass, ArrowRight = Like, Space = 3D)
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
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onApply(currentLook);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, looks, lookIndex, exitDirection, onApply]);

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
    const nextProfile = [...styleProfile, vote].slice(-30);
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
    }, 240);
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

    if (Math.abs(distance) >= 85) {
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
        <header className="px-4 sm:px-6 py-3.5 border-b border-[#DED4C3] flex items-center justify-between gap-3 bg-[#FBF8F1] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#9A3412] to-[#EA580C] text-white flex items-center justify-center shadow-md shadow-[#9A3412]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="remix-studio-title" className="text-lg sm:text-xl font-editorial font-bold text-[#201B17]">
                  Style Shuffle · Lướt Gu Việt Phục
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-[#EAE3D7] text-[#78350F] rounded-full uppercase tracking-wider">
                  Tinder Mode
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#685F54]">
                Quẹt phải để thích, quẹt trái để bỏ qua. AI Studio sẽ học gu phối đồ của bạn tức thì.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeStudio}
            aria-label="Đóng Studio"
            className="p-2 text-[#554D44] hover:text-black hover:bg-black/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Theme Pills Selector */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#F4EDE0] border-b border-[#E3D9C8] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#78350F] shrink-0 flex items-center gap-1">
            <span>Vibe:</span>
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
                    ? 'bg-[#1C1917] text-[#FBF8F1] shadow-md scale-105'
                    : 'bg-[#FBF8F1] text-[#4C443B] border border-[#D9CEBC] hover:border-[#1C1917]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Swipe Arena */}
        <div className="flex-1 overflow-hidden p-3 sm:p-5 flex flex-col items-center justify-center relative select-none">
          {looks.length > 0 && lookIndex < looks.length ? (
            (() => {
              const look = looks[lookIndex];
              const nextLook = looks[lookIndex + 1];
              const thirdLook = looks[lookIndex + 2];
              const garment = TOP_GARMENTS.find((item) => item.id === look.costumeId);

              // 3 Photos per Card Carousel:
              // 0: 3D Turnaround Silhouette
              // 1: Lookbook Editorial Art Portrait
              // 2: Color Palette & Swatch Breakdown
              const photoUrls = [
                garment?.stylized3dImage || garment?.image || '',
                garment?.image || '',
                garment?.stylized3dImage || garment?.image || '',
              ];

              return (
                <div className="w-full max-w-md h-full max-h-[640px] flex flex-col relative">
                  {/* Card Counter & Session Likes Pill */}
                  <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold text-[#685F54]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                      <span>
                        Bản phối {lookIndex + 1} / {looks.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#BE185D] font-bold">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>{sessionLikes} đã thích</span>
                    </div>
                  </div>

                  {/* STACKED CARDS CONTAINER */}
                  <div className="flex-1 relative w-full h-full min-h-[440px]">
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

                    {/* Background Card 2 (Middle layer) */}
                    {nextLook && (
                      <div
                        className="absolute inset-0 rounded-2xl bg-[#F0E8D7] border border-[#D9CEBC] shadow-lg pointer-events-none transition-all duration-300 overflow-hidden"
                        style={{
                          transform: `translateY(${Math.max(0, 8 - Math.abs(swipeOffset) * 0.03)}px) scale(${Math.min(1.0, 0.96 + Math.abs(swipeOffset) * 0.0002)})`,
                          opacity: Math.min(1.0, 0.85 + Math.abs(swipeOffset) * 0.0005),
                          zIndex: 20,
                        }}
                      >
                        {(() => {
                          const nextG = TOP_GARMENTS.find((g) => g.id === nextLook.costumeId);
                          return (
                            nextG && (
                              <img
                                src={nextG.stylized3dImage || nextG.image}
                                alt={nextG.baseName}
                                className="w-full h-full object-cover object-top opacity-60 filter blur-[0.5px]"
                              />
                            )
                          );
                        })()}
                      </div>
                    )}

                    {/* Active Top Card (Swipable Layer) */}
                    <article
                      className="absolute inset-0 rounded-2xl bg-[#FBF8F1] border-2 border-[#D9CEBC] shadow-2xl overflow-hidden flex flex-col transition-all cursor-grab active:cursor-grabbing"
                      style={{
                        zIndex: 30,
                        transform: `translate3d(${swipeOffset}px, ${swipeOffsetY}px, 0) rotate(${swipeRotationDeg}deg)`,
                        opacity: exitDirection ? 0 : 1,
                        transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 220ms ease',
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
                        className="absolute top-8 left-6 z-40 border-4 border-[#16A34A] text-[#16A34A] font-black text-2xl sm:text-3xl px-3 py-1 rounded-xl uppercase tracking-widest pointer-events-none transform -rotate-12 shadow-lg bg-[#16A34A]/10 backdrop-blur-xs"
                        style={{
                          opacity: likeStampOpacity,
                          transform: `rotate(-14deg) scale(${0.85 + likeStampOpacity * 0.25})`,
                        }}
                      >
                        💚 THÍCH
                      </div>

                      {/* TINDER BADGES: NOPE STAMP */}
                      <div
                        className="absolute top-8 right-6 z-40 border-4 border-[#DC2626] text-[#DC2626] font-black text-2xl sm:text-3xl px-3 py-1 rounded-xl uppercase tracking-widest pointer-events-none transform rotate-12 shadow-lg bg-[#DC2626]/10 backdrop-blur-xs"
                        style={{
                          opacity: nopeStampOpacity,
                          transform: `rotate(14deg) scale(${0.85 + nopeStampOpacity * 0.25})`,
                        }}
                      >
                        ❌ BỎ QUA
                      </div>

                      {/* Top Stories Progress Bars (1 / 2 / 3) */}
                      <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
                        {[0, 1, 2].map((idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIdx(idx);
                            }}
                            className="flex-1 h-1.5 rounded-full bg-black/30 backdrop-blur-xs overflow-hidden cursor-pointer"
                          >
                            <div
                              className={`h-full transition-all duration-200 ${
                                activePhotoIdx === idx
                                  ? 'bg-white shadow'
                                  : activePhotoIdx > idx
                                  ? 'bg-white/70'
                                  : 'bg-transparent'
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Card Media Container */}
                      <div className="relative flex-1 w-full bg-[#181513] overflow-hidden">
                        {/* PHOTO VIEW 0: 3D Studio Silhouette */}
                        {activePhotoIdx === 0 && (
                          <div className="w-full h-full relative">
                            {garment && (
                              <img
                                src={photoUrls[0]}
                                alt={garment.baseName}
                                className="w-full h-full object-cover object-top filter brightness-[1.02]"
                                draggable={false}
                              />
                            )}
                            <div className="absolute top-8 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] text-white font-bold flex items-center gap-1">
                              <Layers className="w-3 h-3 text-[#F59E0B]" />
                              <span>Studio 3D Toàn Thân</span>
                            </div>
                          </div>
                        )}

                        {/* PHOTO VIEW 1: Lookbook Editorial Portrait */}
                        {activePhotoIdx === 1 && (
                          <div className="w-full h-full relative">
                            {garment && (
                              <img
                                src={photoUrls[1]}
                                alt={garment.baseName}
                                className="w-full h-full object-cover object-center filter contrast-105"
                                draggable={false}
                              />
                            )}
                            <div className="absolute top-8 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] text-white font-bold flex items-center gap-1">
                              <Eye className="w-3 h-3 text-[#38BDF8]" />
                              <span>Cận Cảnh Lookbook</span>
                            </div>
                          </div>
                        )}

                        {/* PHOTO VIEW 2: Palette Breakdown */}
                        {activePhotoIdx === 2 && (
                          <div className="w-full h-full bg-[#201C18] p-5 flex flex-col justify-center text-white space-y-4">
                            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                              <Palette className="w-4 h-4" />
                              <span>Phân Tích Chi Tiết Bản Phối</span>
                            </div>
                            <div className="space-y-2.5">
                              <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-white/60 uppercase">Áo Thượng Y</p>
                                  <p className="text-sm font-bold">{garment?.baseName}</p>
                                </div>
                                <span
                                  className="w-7 h-7 rounded-full border-2 border-white shadow-md"
                                  style={{ backgroundColor: look.mainColor }}
                                  title="Màu áo"
                                />
                              </div>
                              <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-white/60 uppercase">Quần / Chân Váy Hạ Y</p>
                                  <p className="text-sm font-bold">{look.bottomName}</p>
                                </div>
                                <span
                                  className="w-7 h-7 rounded-full border-2 border-white shadow-md"
                                  style={{ backgroundColor: look.bottomColor }}
                                  title="Màu quần"
                                />
                              </div>
                              <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between text-xs">
                                <span className="text-white/70">Hoa văn:</span>
                                <span className="font-semibold text-[#FDE68A]">
                                  {look.patternId === 'none'
                                    ? 'Lụa Dệt Trơn'
                                    : TRADITIONAL_PATTERNS.find((p) => p.id === look.patternId)?.name || look.patternId}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Left / Right Tap zones to toggle photos */}
                        <div
                          className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : 2));
                          }}
                        />
                        <div
                          className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePhotoIdx((prev) => (prev < 2 ? prev + 1 : 0));
                          }}
                        />

                        {/* Dark Gradient Overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-black/20 to-transparent pointer-events-none" />

                        {/* Floating Info on Image Bottom */}
                        <div className="absolute bottom-3 left-4 right-4 text-white z-20 pointer-events-none">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-md">
                              {garment?.dynasty || 'Việt Phục'}
                            </span>
                            <span className="text-xs font-mono-tabular font-bold bg-[#9A3412] px-2 py-0.5 rounded-full shadow">
                              {look.remix}% Remix
                            </span>
                          </div>
                          <h3 className="mt-1 text-2xl sm:text-3xl font-editorial font-bold leading-tight drop-shadow-md">
                            {look.title}
                          </h3>
                          <p className="text-xs text-white/90 font-medium line-clamp-1 drop-shadow-sm mt-0.5">
                            {look.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Card Info Footer (Stylist & Cultural Note) */}
                      <div className="p-4 bg-[#FBF8F1] border-t border-[#E3D9C8] flex flex-col justify-between shrink-0 space-y-2">
                        <p className="text-xs text-[#4C443B] leading-relaxed line-clamp-2">
                          <span className="font-bold text-[#9A3412]">AI Stylist: </span>
                          {look.stylistNote}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-[#78350F] font-semibold">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: look.mainColor }}
                            />
                            <span>{garment?.baseName}</span>
                            <span className="text-[#A8A29E]">✕</span>
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: look.bottomColor }}
                            />
                            <span>{look.bottomName.split(' ')[0]} {look.bottomName.split(' ')[1]}</span>
                          </div>
                          <span className="text-[10px] text-[#A8A29E]">Chạm ảnh để xem thêm góc</span>
                        </div>
                      </div>
                    </article>
                  </div>

                  {/* TINDER BOTTOM ACTION CONTROLS */}
                  <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6 shrink-0 z-40">
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
                      title="Mặc thử ngay vào Studio 3D"
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#16A34A]">Hoàn Thành Vòng Phối</span>
                <h3 className="text-2xl font-editorial font-bold text-[#201B17] mt-1">
                  Đã xem hết {looks.length} bản phối!
                </h3>
                <p className="text-xs text-[#685F54] mt-2 leading-relaxed">
                  Bạn đã thích <strong className="text-[#16A34A]">{sessionLikes}</strong> bộ trong vòng này.
                </p>
              </div>

              {styleProfile.length > 0 && (
                <div className="p-3.5 bg-[#F4EDE0] rounded-xl border border-[#E3D9C8] text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A3412]">Phân Tích Gu Của Bạn</p>
                  <p className="text-xs text-[#4C443B] leading-relaxed mt-1">{styleInsight}</p>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={loadDeck}
                  className="flex-1 py-3 bg-[#9A3412] hover:bg-[#7C2D12] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Xáo Thẻ & Lướt Tiếp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStyleProfile([])}
                  className="py-3 px-4 bg-white border border-[#D9CEBC] hover:bg-black/5 text-[#685F54] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Làm mới gu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Info */}
        <footer className="px-4 sm:px-6 py-2.5 bg-[#FBF8F1] border-t border-[#DED4C3] flex items-center justify-between text-[11px] text-[#78350F] shrink-0">
          <div className="flex items-center gap-2">
            <span>💡 Phím tắt:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#D9CEBC] rounded text-[10px] font-mono">← Bỏ qua</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#D9CEBC] rounded text-[10px] font-mono">→ Thích</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#D9CEBC] rounded text-[10px] font-mono">Space Thử 3D</kbd>
          </div>
          <span className="hidden sm:inline text-[#A8A29E]">Powered by Google Gemini & VAI-Stylist</span>
        </footer>
      </section>
    </div>
  );
};
