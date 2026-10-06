import heroEditorialImg from '../assets/images/hero_viet_phuc_editorial_1790760857499.jpg';
import aoNhatBinhImg from '../assets/images/garment_ao_nhat_binh_1790760873674.jpg';
import aoNguThanImg from '../assets/images/garment_ao_ngu_than_1790760888198.jpg';
import aoTacArchiveImg from '../assets/images/garment_ao_tac_ceremonial_1790760907617.jpg';

import stylized3dAoNguThan from '../assets/images/stylized_3d_ao_ngu_than_1790762718134.jpg';
import stylized3dAoNhatBinh from '../assets/images/stylized_3d_ao_nhat_binh_1790762731866.jpg';
import stylized3dAoTac from '../assets/images/stylized_3d_ao_tac_1790762743567.jpg';
import stylized3dAoGiaoLinh from '../assets/images/stylized_3d_ao_giao_linh_1790762755949.jpg';
import stylized3dAoTuThan from '../assets/images/stylized_3d_ao_tu_than_1790789448648.jpg';
import stylized3dAoVienLinh from '../assets/images/stylized_3d_ao_vien_linh_1790789463445.jpg';
import stylized3dAoBaBa from '../assets/images/stylized_3d_ao_ba_ba_1790789477322.jpg';
import turnaroundPhotorealNamNguThan from '../assets/images/turnaround_photoreal_nam_ngu_than_1790837551165.jpg';
import turnaroundPhotorealNuNguThan from '../assets/images/turnaround_photoreal_nu_ngu_than_1790837564657.jpg';
import turnaroundPhotorealNuNhatBinh from '../assets/images/turnaround_photoreal_nu_nhat_binh_1790837576379.jpg';
import turnaroundPhotorealNamAoTac from '../assets/images/turnaround_photoreal_nam_ao_tac_1790837585352.jpg';
import turnaroundPhotorealNuAoTac from '../assets/images/turnaround_photoreal_nu_ao_tac_1790843831474.jpg';
import turnaroundPhotorealNamNhatBinh from '../assets/images/turnaround_photoreal_nam_nhat_binh_1790843841337.jpg';
import turnaroundPhotorealVienLinhNu from '../assets/images/turnaround_photoreal_vien_linh_1790839901833.jpg';
import turnaroundPhotorealVienLinhNam from '../assets/images/turnaround_photoreal_vien_linh_nam_1790839985163.jpg';
import turnaroundPhotorealGiaoLinhNam from '../assets/images/turnaround_photoreal_giao_linh_1790839915654.jpg';
import turnaroundPhotorealGiaoLinhNu from '../assets/images/turnaround_photoreal_giao_linh_nu_1790839999804.jpg';
import turnaroundPhotorealTuThanNu from '../assets/images/turnaround_photoreal_tu_than_1790839930641.jpg';
import turnaroundPhotorealAoBaBaNu from '../assets/images/turnaround_photoreal_ao_ba_ba_1790839943726.jpg';
import turnaroundPhotorealAoBaBaNam from '../assets/images/turnaround_photoreal_ao_ba_ba_nam_1790840011532.jpg';
import turnaroundPhotorealAoDaiNu from '../assets/images/turnaround_photoreal_ao_dai_nu_1790839955780.jpg';
import turnaroundPhotorealAoDaiNam from '../assets/images/turnaround_photoreal_ao_dai_nam_1790869287379.jpg';
import turnaroundPhotorealTuThanNam from '../assets/images/turnaround_photoreal_tu_than_nam_1790869302070.jpg';
import turnaroundPhotorealFusionJeans from '../assets/images/turnaround_photoreal_fusion_jeans_1790871117913.jpg';
import turnaroundPhotorealFusionShorts from '../assets/images/turnaround_photoreal_fusion_shorts_1790871131434.jpg';
import turnaroundPhotorealNamFusionJeans from '../assets/images/turnaround_photoreal_nam_fusion_jeans_1790871165917.jpg';
import turnaroundPhotorealNamFusionShorts from '../assets/images/turnaround_photoreal_nam_fusion_shorts_1790871200309.jpg';
import turnaroundPhotorealFusionThuongLua from '../assets/images/turnaround_photoreal_fusion_thuong_lua_1790871751411.jpg';

export const IMAGE_MODEL = 'gemini-3.1-flash-image';

export const TURNAROUND_SHEET_NAM = turnaroundPhotorealNamNguThan;
export const TURNAROUND_SHEET_NU = turnaroundPhotorealNuNguThan;

/**
 * Built-in photorealistic 4-view turnaround sheets for every traditional costume (Nam & Nữ)
 * so each costume immediately displays its authentic historical silhouette, collar, and sleeves.
 */
export const BUILTIN_TURNAROUND_SHEETS: Record<string, string> = {
  'ao-ngu-than-tay-chen-male': turnaroundPhotorealNamNguThan,
  'ao-ngu-than-tay-chen-female': turnaroundPhotorealNuNguThan,
  'ao-dai-truyen-thong-male': turnaroundPhotorealAoDaiNam,
  'ao-dai-truyen-thong-female': turnaroundPhotorealAoDaiNu,
  'ao-tu-than-kinh-bac-male': turnaroundPhotorealTuThanNam,
  'ao-tu-than-kinh-bac-female': turnaroundPhotorealTuThanNu,
  'ao-nhat-binh-male': turnaroundPhotorealNamNhatBinh,
  'ao-nhat-binh-female': turnaroundPhotorealNuNhatBinh,
  'ao-tac-male': turnaroundPhotorealNamAoTac,
  'ao-tac-female': turnaroundPhotorealNuAoTac,
  'ao-giao-linh-male': turnaroundPhotorealGiaoLinhNam,
  'ao-giao-linh-female': turnaroundPhotorealGiaoLinhNu,
  'ao-vien-linh-male': turnaroundPhotorealVienLinhNam,
  'ao-vien-linh-female': turnaroundPhotorealVienLinhNu,
  'ao-ba-ba-nam-bo-male': turnaroundPhotorealAoBaBaNam,
  'ao-ba-ba-nam-bo-female': turnaroundPhotorealAoBaBaNu,
};

/**
 * Built-in photorealistic 4-view 360° turnaround sheets for alternative/modern lower-body garments
 * (Quần Jeans Ống Suông, Quần Kaki Ống Rộng, Quần Short Jeans, Chân Váy Ngắn Miniskirt, Thường Lụa Xếp Ly)
 * so selecting any bottom garment fits seamlessly with the 3D 360° character across all 4 angles.
 */
export const BUILTIN_BOTTOM_TURNAROUND_SHEETS: Record<string, string> = {
  'quan-lua-trang-female': turnaroundPhotorealAoBaBaNu,
  'quan-lua-trang-male': turnaroundPhotorealAoBaBaNam,
  'quan-linh-den-female': turnaroundPhotorealAoBaBaNu,
  'quan-linh-den-male': turnaroundPhotorealAoBaBaNam,
  'quan-jeans-ong-suong-female': turnaroundPhotorealFusionJeans,
  'quan-jeans-ong-suong-male': turnaroundPhotorealNamFusionJeans,
  'quan-kaki-ong-rong-female': turnaroundPhotorealFusionJeans,
  'quan-kaki-ong-rong-male': turnaroundPhotorealNamFusionJeans,
  'quan-short-jeans-cat-ngan-female': turnaroundPhotorealFusionShorts,
  'quan-short-jeans-cat-ngan-male': turnaroundPhotorealNamFusionShorts,
  'chan-vay-ngan-miniskirt-female': turnaroundPhotorealFusionThuongLua,
  'chan-vay-ngan-miniskirt-male': turnaroundPhotorealNamFusionShorts,
  'thuong-lua-xep-ly-female': turnaroundPhotorealFusionThuongLua,
  'thuong-lua-xep-ly-male': turnaroundPhotorealFusionThuongLua,
};

export type PatternId =
  | 'pattern_may_co'
  | 'pattern_chim_lac'
  | 'pattern_song_nuoc'
  | 'pattern_cuc_day'
  | 'none';

export interface PatternOption {
  id: PatternId;
  name: string;
  desc: string;
}

export const TRADITIONAL_PATTERNS: PatternOption[] = [
  { id: 'pattern_may_co', name: 'Mây Cổ', desc: 'Vân mây cát tường dệt chìm' },
  { id: 'pattern_chim_lac', name: 'Chim Lạc', desc: 'Chim Lạc Đông Sơn ánh kim' },
  { id: 'pattern_song_nuoc', name: 'Sóng Nước', desc: 'Thủy ba triều Nguyễn' },
  { id: 'pattern_cuc_day', name: 'Cúc Dây', desc: 'Hoa cúc dây trường thọ' },
  { id: 'none', name: 'Lụa Trơn', desc: 'Dệt trơn truyền thống' },
];

export type FabricMaterialId = 'lua-ha-dong' | 'gam-trieu-dinh' | 'dui-to';

export type FabricWeaveArchitecture =
  | 'satin-twill'
  | 'jacquard-brocade'
  | 'slub-linen';

export interface FabricNormalMapConfig {
  weaveArchitecture: FabricWeaveArchitecture;
  weaveArchitectureLabel: string;
  normalScale: [number, number];
  normalStrength: number;
  repeatUV: [number, number];
  threadSpacing: { warp: number; weft: number };
  reliefContrast: number;
  microFoldDepth: number;
  slubIrregularity: number;
}

export interface FabricMaterialSpec {
  id: FabricMaterialId;
  name: string;
  shortLabel: string;
  shortName: string;
  roughness: number;
  sheen: number;
  sheenRoughness: number;
  anisotropy: number;
  anisotropyRotation: number;
  specularAttenuation: number;
  bumpDepth: number;
  bumpScale: number;
  normalScale: [number, number];
  normalStrength: number;
  drapeStiffness: number;
  normalMapDetail: string;
  drapeDesc: string;
  normalMapConfig: FabricNormalMapConfig;
}

export const FABRIC_MATERIALS: FabricMaterialSpec[] = [
  {
    id: 'lua-ha-dong',
    name: 'Lụa Tơ Tằm Hà Đông / Bảo Lộc',
    shortLabel: 'Lụa Hà Đông',
    shortName: 'Lụa Hà Đông',
    roughness: 0.65,
    sheen: 0.52,
    sheenRoughness: 0.6,
    anisotropy: 0.55,
    anisotropyRotation: 0.785,
    specularAttenuation: 0.22,
    bumpDepth: 0.0028,
    bumpScale: 0.0028,
    normalScale: [0.68, 0.68],
    normalStrength: 2.8,
    drapeStiffness: 0.95,
    normalMapDetail:
      'Sợi tơ tằm đan chéo satin mịn (Roughness 0.65, Sheen 0.52, Anisotropy 0.55), giữ rõ nếp gấp tự nhiên không bóng nhựa',
    drapeDesc: 'Mềm rủ tự nhiên (Matte-Satin Silk)',
    normalMapConfig: {
      weaveArchitecture: 'satin-twill',
      weaveArchitectureLabel: 'Vân Dệt Satin Tơ Tằm (4-Harness Satin Weave)',
      normalScale: [0.68, 0.68],
      normalStrength: 2.8,
      repeatUV: [3, 3],
      threadSpacing: { warp: 6, weft: 4 },
      reliefContrast: 0.62,
      microFoldDepth: 0.45,
      slubIrregularity: 0.08,
    },
  },
  {
    id: 'gam-trieu-dinh',
    name: 'Gấm Triều Đình (Imperial Brocade)',
    shortLabel: 'Gấm Triều Đình',
    shortName: 'Gấm Triều Đình',
    roughness: 0.72,
    sheen: 0.5,
    sheenRoughness: 0.6,
    anisotropy: 0.42,
    anisotropyRotation: 0.0,
    specularAttenuation: 0.25,
    bumpDepth: 0.0085,
    bumpScale: 0.0085,
    normalScale: [1.35, 1.35],
    normalStrength: 4.8,
    drapeStiffness: 1.28,
    normalMapDetail:
      'Độ nổi hoa văn Jacquard dệt nổi cao (Roughness 0.72, Sheen 0.50, Anisotropy 0.42), phom đứng cung đình',
    drapeDesc: 'Đứng phom vương giả (Structured Brocade)',
    normalMapConfig: {
      weaveArchitecture: 'jacquard-brocade',
      weaveArchitectureLabel: 'Vân Dệt Nổi Gấm Cung Đình (Imperial Jacquard Relief)',
      normalScale: [1.35, 1.35],
      normalStrength: 4.8,
      repeatUV: [2, 2],
      threadSpacing: { warp: 4, weft: 4 },
      reliefContrast: 0.98,
      microFoldDepth: 0.82,
      slubIrregularity: 0.14,
    },
  },
  {
    id: 'dui-to',
    name: 'Đũi / Tơ Tằm Mộc (Linen / Gauze)',
    shortLabel: 'Đũi / Tơ Kép',
    shortName: 'Đũi / Tơ Kép',
    roughness: 0.82,
    sheen: 0.45,
    sheenRoughness: 0.65,
    anisotropy: 0.28,
    anisotropyRotation: 0.0,
    specularAttenuation: 0.16,
    bumpDepth: 0.0048,
    bumpScale: 0.0048,
    normalScale: [1.05, 1.05],
    normalStrength: 3.9,
    drapeStiffness: 0.85,
    normalMapDetail:
      'Bề mặt lì tự nhiên (Roughness 0.82, Sheen 0.45, Anisotropy 0.28), kết cấu thớ sợi đũi mộc đan chữ thập nổi rõ',
    drapeDesc: 'Nhẹ thoáng mộc mạc (Matte Slub Linen)',
    normalMapConfig: {
      weaveArchitecture: 'slub-linen',
      weaveArchitectureLabel: 'Vân Dệt Chữ Thập Tơ Đũi Mộc (Organic Slub Linen Weave)',
      normalScale: [1.05, 1.05],
      normalStrength: 3.9,
      repeatUV: [4, 4],
      threadSpacing: { warp: 3, weft: 3 },
      reliefContrast: 0.85,
      microFoldDepth: 0.68,
      slubIrregularity: 0.76,
    },
  },
];

export function getFabricMaterialSpec(
  fabricMaterialId?: FabricMaterialId
): FabricMaterialSpec {
  return (
    FABRIC_MATERIALS.find((f) => f.id === fabricMaterialId) || FABRIC_MATERIALS[0]
  );
}

export interface VPhucPrecisionAuditOutput {
  historical_accuracy_score: number;
  garment_identification: string;
  fabric_pbr_properties: {
    material_type: string;
    roughness: number;
    sheen: number;
    normal_map_detail: string;
  };
  tailoring_verification: {
    collar_status: string;
    panel_cut_status: string;
    sleeve_status: string;
  };
  '3d_asset_correction_instructions': string;
}

export interface OutfitEvaluationOutput {
  lookbook_title: string;
  style_score: number;
  weather_advice: string;
  cultural_status: 'SAFE' | 'WARNING' | 'CRITICAL';
  cultural_warning_msg: string;
  cultural_history_fact: string;
  custom_request_feedback: string | null;
  recommended_color_hex: string | null;
  recommended_pattern_id: PatternId | null;
  heritage_guard_audit?: VPhucPrecisionAuditOutput;
  genz_ai_comment?: string | null;
}

export interface OutfitInputPayload {
  selected_items: {
    top: string;
    bottom: string;
    primary_color?: string;
    fabric_material?: FabricMaterialId;
    accessories: string[];
  };
  selected_pattern?: PatternId;
  weather_data: {
    location: string;
    temperature: string;
    condition: string;
  };
  event_type: string;
  user_custom_request?: string;
}

export interface TraditionalColor {
  id: string;
  name: string;
  nameEn: string;
  hex: string;
  meaning: string;
  element: string;
}

export type GarmentSilhouetteType =
  | 'ngu-than'
  | 'nhat-binh'
  | 'ao-tac'
  | 'giao-linh'
  | 'ao-dai'
  | 'tu-than'
  | 'vien-linh'
  | 'ba-ba';

export interface GarmentHistoricalLore {
  eraTitle: string;
  originStory: string;
  symbolismDecode: string[];
  famousAnecdote: string;
  youthRevivalNote: string;
}

export interface TopGarmentOption {
  id: string;
  baseName: string;
  dynasty: string;
  formality:
    | 'Lễ Phục Cung Đình'
    | 'Đại Lễ Phục'
    | 'Thường Phục Nhã Nhặn'
    | 'Cổ Phục Giao Thời'
    | 'Quốc Phục Truyền Thống'
    | 'Dân Gian Kinh Bắc'
    | 'Nam Bộ Truyền Thống';
  accessionCode: string;
  material: string;
  silhouetteType: GarmentSilhouetteType;
  image: string;
  stylized3dImage: string;
  garmentFeaturesEn: string;
  description: string;
  historySnippet: string;
  historicalLore: GarmentHistoricalLore;
}

export interface BottomGarmentOption {
  id: string;
  name: string;
  nameEn: string;
  colorEn: string;
  category: 'Truyền Thống' | 'Giao Thoa Gen Z' | 'Vi Phạm Quy Chuẩn';
  tierHint: 'SAFE' | 'WARNING' | 'CRITICAL';
  material: string;
  hex: string;
  note: string;
}

export interface AccessoryOption {
  id: string;
  name: string;
  nameEn: string;
  colorEn: string;
  category: 'Truyền Thống' | 'Hiện Đại' | 'Không Phù Hợp Lễ Nghi';
  tierHint: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface WeatherPreset {
  id: string;
  location: string;
  temperature: string;
  condition: string;
  humidity: string;
}

export type HairStyleId =
  | 'toc-ivy'
  | 'bui-truyen-thong'
  | 'xoa-tu-nhien'
  | 're-ngoi-thu-sinh'
  | 'bob-ca-tinh';
export type ExpressionId = 'tuoi-tan' | 'trang-nghiem' | 'nhay-mat' | 'hao-hung';

export interface HairStyleOption {
  id: HairStyleId;
  label: string;
}

export interface HairColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface ExpressionOption {
  id: ExpressionId;
  label: string;
  desc: string;
}

export const HAIR_STYLES: HairStyleOption[] = [
  { id: 'toc-ivy', label: 'Tóc Ngắn Gọn Gàng (Nam)' },
  { id: 'bui-truyen-thong', label: 'Búi Thấp Gọn Gàng (Nữ)' },
  { id: 'xoa-tu-nhien', label: 'Tóc Xõa Mái Bay' },
  { id: 're-ngoi-thu-sinh', label: 'Rẽ Ngôi Thư Sinh' },
  { id: 'bob-ca-tinh', label: 'Tóc Ngắn Gen Z' },
];

export const HAIR_COLORS: HairColorOption[] = [
  { id: 'den-huyen', label: 'Đen Huyền', hex: '#181513' },
  { id: 'nau-hat-de', label: 'Nâu Hạt Dẻ', hex: '#4A2C18' },
  { id: 'nau-tra-sua', label: 'Nâu Trà', hex: '#784B31' },
  { id: 'do-anh-tim', label: 'Đỏ Trầm', hex: '#581C23' },
];

export const EXPRESSIONS: ExpressionOption[] = [
  { id: 'trang-nghiem', label: 'Gương Mẫu', desc: 'Điềm đạm, khép môi chuẩn mực' },
  { id: 'tuoi-tan', label: 'Tươi Tắn', desc: 'Mỉm cười dịu dàng' },
  { id: 'nhay-mat', label: 'Tinh Nghịch', desc: 'Nháy mắt Gen Z' },
  { id: 'hao-hung', label: 'Rạng Rỡ', desc: 'Cười tươi má hồng' },
];

export const HERO_EDITORIAL_IMAGE = heroEditorialImg;

export interface VStylistConsultationInput {
  location?: string;
  weather?: string;
  event?: string;
  freeformRequest?: string;
  gender?: 'male' | 'female';
  selectedCostumeId?: string;
  selectedMainColor?: string;
  selectedMainColorName?: string;
  selectedBottomColor?: string;
  selectedBottomName?: string;
  selectedPatternId?: PatternId;
  selectedAccessoryIds?: string[];
}

export interface VStylistConsultationOutput {
  contextAnalysis: {
    location: string;
    weather: string;
    event: string;
  };
  recommendation: {
    costumeId: string;
    mainColor: string;
    bottomColor: string;
    patternId: PatternId;
    accessoryIds: string[];
  };
  stylistNote: string;
  audioGuideScript: string;
}

export const CATALOG_COLOR_SWATCHES: Array<{
  hex: string;
  name: string;
  element: string;
}> = [
  { hex: '#134E4A', name: 'Xanh Ngọc', element: 'Mộc / Thủy' },
  { hex: '#D4AF37', name: 'Vàng Lụa', element: 'Thổ / Kim' },
  { hex: '#9A2B1D', name: 'Đỏ Son', element: 'Hỏa' },
  { hex: '#F5F1E8', name: 'Trắng Ngà', element: 'Kim' },
  { hex: '#1E3A8A', name: 'Xanh Hải Quân', element: 'Thủy' },
  { hex: '#6B21A8', name: 'Tím Kinh Bắc', element: 'Thủy / Hỏa' },
  { hex: '#334155', name: 'Xám Ú Bà Ba', element: 'Thủy / Thổ' },
];

export const TRADITIONAL_COLORS: TraditionalColor[] = [
  {
    id: 'xanh-co-vit',
    name: 'Màu Xanh Ngọc',
    nameEn: 'jade emerald teal (xanh ngọc, #134E4A)',
    hex: '#134E4A',
    meaning: 'Thanh tao, mát dịu và tĩnh tại như mặt hồ cổ tự',
    element: 'Thủy / Mộc',
  },
  {
    id: 'vang-mai',
    name: 'Màu Vàng Lụa',
    nameEn: 'imperial silk gold (#D4AF37)',
    hex: '#D4AF37',
    meaning: 'Phú quý, hoàng gia và rạng rỡ ánh lụa cung đình',
    element: 'Thổ / Kim',
  },
  {
    id: 'do-son',
    name: 'Màu Đỏ Son',
    nameEn: 'imperial vermilion red (#9A2B1D)',
    hex: '#9A2B1D',
    meaning: 'Cát tường, quyền uy và nhiệt huyết son sắt',
    element: 'Hỏa',
  },
  {
    id: 'bach-ngoc',
    name: 'Màu Trắng Ngà',
    nameEn: 'warm ivory silk (#F5F1E8)',
    hex: '#F5F1E8',
    meaning: 'Tinh khiết, thoáng mát và cốt cách nho nhã',
    element: 'Kim',
  },
  {
    id: 'xanh-hai-quan',
    name: 'Màu Xanh Hải Quân',
    nameEn: 'deep royal navy silk (#1E3A8A)',
    hex: '#1E3A8A',
    meaning: 'Đĩnh đạc, uy nghiêm và chiều sâu văn hiến Đại Việt',
    element: 'Thủy',
  },
  {
    id: 'tim-hue',
    name: 'Màu Tím Kinh Bắc',
    nameEn: 'imperial Kinh Bac violet (#6B21A8)',
    hex: '#6B21A8',
    meaning: 'Thủy chung, trầm mặc và đậm chất thơ kinh kỳ',
    element: 'Thủy / Hỏa',
  },
  {
    id: 'cham-co',
    name: 'Màu Xám Ú Bà Ba',
    nameEn: 'southern slate charcoal silk (#334155)',
    hex: '#334155',
    meaning: 'Bền bỉ, điềm đạm và gắn liền với nếp sống phương Nam',
    element: 'Thủy / Thổ',
  },
];

export const TOP_GARMENTS: TopGarmentOption[] = [
  {
    id: 'ao-ngu-than-tay-chen',
    baseName: 'Áo Ngũ Thân Tay Chẽn',
    dynasty: 'Triều Nguyễn · 1744',
    formality: 'Thường Phục Nhã Nhặn',
    accessionCode: 'ACC.VP.1744.01',
    material: 'Lụa Tơ Tằm Hà Đông',
    silhouetteType: 'ngu-than',
    image: aoNguThanImg,
    stylized3dImage: turnaroundPhotorealNamNguThan,
    garmentFeaturesEn:
      "a Vietnamese traditional men's long tunic (áo ngũ thân): stand collar, long fitted sleeves, tunic length to below the knees with side slits, diagonal asymmetrical closure from the neck across the chest to the side seam with small round gold buttons",
    description:
      'Thức áo 5 thân tay ôm gọn gàng, cổ đứng cài 5 khuy bên phải, giữ trọn đạo lý Ngũ Thường.',
    historySnippet:
      'Áo Ngũ Thân lập quy dưới thời chúa Nguyễn Phúc Khoát với 5 tà áo đại diện cho Ngũ Thường (Nhân, Lễ, Nghĩa, Trí, Tín) và Ngũ Hành.',
    historicalLore: {
      eraTitle: 'Cải Cách Võ Vương Nguyễn Phúc Khoát (1744) & Định Chế Minh Mạng',
      originStory:
        'Năm 1744, khi xưng vương tại Phú Xuân (Huế), chúa Nguyễn Phúc Khoát đã ban hành sắc dụ định chế lại trang phục Đàng Trong nhằm khẳng định bản sắc độc lập, tạo tiền đề cho sự ra đời của Áo Ngũ Thân. Đến thời vua Minh Mạng (1828), Áo Ngũ Thân chính thức trở thành trang phục thống nhất trên toàn cõi Việt Nam.',
      symbolismDecode: [
        '4 thân áo lớn (2 thân trước, 2 thân sau) tượng trưng cho Tứ Thân Phụ Mẫu (cha mẹ đẻ và cha mẹ bên nội/ngoại).',
        '1 thân con nằm ẩn bên trong vạt trước bên phải tượng trưng cho chính bản thân người mặc, luôn được cha mẹ chở che.',
        '5 hạt nút (khuy áo) bằng đồng, ngọc hoặc hổ phách cài từ cổ sang nách phải đại diện cho Ngũ Thường (Nhân, Lễ, Nghĩa, Trí, Tín) và Ngũ Hành (Kim, Mộc, Thủy, Hỏa, Thổ).',
        'Đường tà áo lượn nhẹ (hạ eo nhẹ nhưng không bó sát cơ thể) thể hiện sự khiêm nhường, đoan chính của người quân tử và bậc thục nữ.',
      ],
      famousAnecdote:
        'Người xưa có quy tắc bất thành văn: khi mặc Áo Ngũ Thân bắt buộc phải mặc kèm áo lót trắng bên trong (Áo Trung Đơn) để giữ vệ sinh cho lớp lụa quý bên ngoài, đồng thời để lộ một viền cổ trắng thanh khiết tượng trưng cho tâm hồn minh bạch.',
      youthRevivalNote:
        'Hiện nay, Áo Ngũ Thân Tay Chẽn là cổ phục được giới trẻ Việt Nam lựa chọn nhiều nhất để chụp ảnh kỷ yếu, dạo phố Tết, dự sự kiện văn hóa và kết hợp cùng phụ kiện đương đại nhờ phần tay áo gọn gàng, năng động.',
    },
  },
  {
    id: 'ao-dai-truyen-thong',
    baseName: 'Áo Dài Truyền Thống',
    dynasty: 'Tân Thời & Đương Đại · TK XX',
    formality: 'Quốc Phục Truyền Thống',
    accessionCode: 'ACC.VP.1930.02',
    material: 'Lụa Tơ Tằm & Gấm Mềm',
    silhouetteType: 'ao-dai',
    image: aoNguThanImg,
    stylized3dImage: turnaroundPhotorealAoDaiNu,
    garmentFeaturesEn:
      'a Vietnamese áo dài: stand-up collar, fitted bodice and waist, long fitted sleeves, two long panels front and back to the ankles with side slits from the waist',
    description:
      'Quốc phục Việt Nam kế thừa từ Áo Ngũ Thân, tôn vinh đường nét thanh thoát với 2 tà dài thướt tha.',
    historySnippet:
      'Áo Dài hiện đại được phát triển từ nền tảng Áo Ngũ Thân từ thập niên 1930 (Áo Dài Lemur Cát Tường, Áo Dài Lê Phổ) và trở thành biểu tượng văn hóa Việt Nam trên trường quốc tế.',
    historicalLore: {
      eraTitle: 'Hành Trình Từ Áo Ngũ Thân Đến Quốc Phục Áo Dài Tân Thời (1930s – Nay)',
      originStory:
        'Vào đầu thập niên 1930 tại Hà Nội, họa sĩ Nguyễn Cát Tường (bút danh Lemur) thuộc nhóm Tự Lực Văn Đoàn đã khởi xướng cuộc cách tân Áo Ngũ Thân thành Áo Dài Lemur, lược bỏ tà thứ 5 và ôm gọn theo đường nét cơ thể. Sau đó, họa sĩ Lê Phổ tiếp tục dung hòa lại với nét cổ kín đáo truyền thống để tạo nên dáng Áo Dài kinh điển.',
      symbolismDecode: [
        'Cổ áo cao 3–4 phân giữ nét kín đáo, tôn vinh chiếc cổ cao thanh tú.',
        'Hai tà áo (trước và sau) xẻ từ ngang hông xuống chấm cổ chân, tung bay mềm mại theo từng bước đi nhưng vẫn che phủ kín đáo nhờ chiếc quần lụa ống rộng.',
        'Tay áo Raglan (xuất hiện từ thập niên 1960 tại Sài Gòn) với đường ráp chéo từ cổ xuống nách giúp triệt tiêu nếp nhăn phần vai.',
      ],
      famousAnecdote:
        'Khi họa sĩ Cát Tường ra mắt mẫu Áo Dài Tân Thời trên báo Phong Hóa năm 1934, đây từng là cuộc cách mạng thẩm mỹ táo bạo bậc nhất Đông Dương, được Hoàng hậu Nam Phương đặc biệt yêu thích và lăng xê.',
      youthRevivalNote:
        'Thế hệ Gen Z hiện nay vừa yêu thích Áo Dài chiết eo truyền thống, vừa chuộng xu hướng "Áo Dài Dáng Suông" lấy cảm hứng ngược về phom dáng thập niên 1930 và Áo Ngũ Thân xưa.',
    },
  },
  {
    id: 'ao-tu-than-kinh-bac',
    baseName: 'Áo Tứ Thân & Yếm Đào',
    dynasty: 'Thời Lý - Trần - Lê · Kinh Bắc',
    formality: 'Dân Gian Kinh Bắc',
    accessionCode: 'ACC.VP.1450.03',
    material: 'Lụa Đũi & Lĩnh Bưởi',
    silhouetteType: 'tu-than',
    image: heroEditorialImg,
    stylized3dImage: stylized3dAoTuThan,
    garmentFeaturesEn:
      'Traditional Northern Vietnamese four-panel folk garment (Áo Tứ Thân) featuring an open front revealing a crimson silk diamond-shaped bodice (Yếm đào) underneath, tied with a vibrant green silk waist sash (Thắt lưng bao), paired with a black silk skirt.',
    description:
      'Trang phục dân gian Bắc Bộ và liền chị Quan Họ với 4 tà áo bay bổng khoe khéo lớp Yếm Đào thắm đượm.',
    historySnippet:
      'Áo Tứ Thân gắn liền với văn hóa dân gian Đồng bằng Bắc Bộ từ thời Lý - Trần, nổi bật với hình ảnh Yếm Đào, thắt lưng lụa hoa lý và Nón Quai Thao.',
    historicalLore: {
      eraTitle: 'Tinh Hoa Văn Hóa Dân Gian Kinh Bắc & Liền Chị Quan Họ',
      originStory:
        'Áo Tứ Thân xuất hiện từ rất sớm trong đời sống người phụ nữ Việt cổ vùng châu thổ sông Hồng (Lý – Trần – Lê). Do khổ vải dệt thủ công xưa chỉ rộng khoảng 35–40cm, người thợ đã khéo léo ghép 4 khổ vải lại thành 4 tà áo.',
      symbolismDecode: [
        '2 tà sau khâu liền sống lưng, 2 tà trước tách rời vắt chéo hoặc buộc nhẹ trước bụng tượng trưng cho Tứ Thân Phụ Mẫu.',
        'Lớp Yếm Đào (hoặc Yếm Sen) bên trong che ngực, kết hợp với Thắt lưng hoa lý (xanh lục hoặc vàng) tạo nên nghệ thuật phối màu ngũ sắc rực rỡ mà tinh tế.',
        'Thường phối cùng Váy Đụp / Váy Lĩnh đen cùng Khăn Mỏ Quạ và Nón Quai Thao đường kính rộng.',
      ],
      famousAnecdote:
        'Ca dao xưa có câu: "Áo tứ thân mớ ba mớ bảy" — người con gái Kinh Bắc đi hội mùa xuân thường mặc từ 3 đến 7 lớp áo lụa mỏng chồng lên nhau, để lộ các viền cổ áo chuyển màu nhịp nhàng như cánh hoa đào.',
      youthRevivalNote:
        'Áo Tứ Thân đang tạo nên cơn sốt mạnh mẽ trong các MV âm nhạc đương đại (như dòng nhạc dân gian điện tử) và các bộ ảnh nghệ thuật mùa lễ hội chùa Hương, hội Lim.',
    },
  },
  {
    id: 'ao-nhat-binh',
    baseName: 'Áo Nhật Bình',
    dynasty: 'Triều Nguyễn · Thế kỷ XIX',
    formality: 'Lễ Phục Cung Đình',
    accessionCode: 'ACC.VP.1802.04',
    material: 'Sa Gấm Thêu Kim Tuyến',
    silhouetteType: 'nhat-binh',
    image: aoNhatBinhImg,
    stylized3dImage: stylized3dAoNhatBinh,
    garmentFeaturesEn:
      'Traditional Nguyen Dynasty court robe featuring a wide rectangular gold-embroidered collar (cổ Nhật Bình) across the chest, wide ceremonial sleeves adorned with five-color horizontal silk bands near the cuffs, side slits, and knee-length flowing panels.',
    description:
      'Lễ phục triều đình dành cho Bậc Hậu phi, Công chúa và Mệnh phụ phu nhân, nổi bật với cổ chữ nhật thêu vàng.',
    historySnippet:
      'Áo Nhật Bình là loại áo khoác ngoài dành cho Bậc Hậu phi, Công chúa và Nữ quan triều Nguyễn, có phần cổ áo hình chữ nhật đặc trưng thể hiện quyền uy và lễ nghi.',
    historicalLore: {
      eraTitle: 'Thường Triều Phục Hoàng Gia Triều Nguyễn (1802 – 1945)',
      originStory:
        'Áo Nhật Bình được vua Gia Long và Minh Mạng quy định làm lễ phục cung đình cho Hoàng Thái hậu, Hoàng hậu, Công chúa và các bậc Mệnh phụ phu nhân triều Nguyễn, kế thừa và cải biến từ thức áo Phi Phong thời Lê – Chúa Nguyễn.',
      symbolismDecode: [
        'Cổ áo bản to hình chữ nhật trước ngực: khi cài dây buộc lại sẽ tạo thành hình chữ "Nhật" (日), do đó có tên gọi là Nhật Bình.',
        'Dải ngũ sắc ở cổ tay áo (lục, huỳnh, lam, bạch, hồng) tượng trưng cho Ngũ Hành tương sinh và phúc khí đất trời.',
        'Họa tiết Loan Phượng hình tròn (Đoàn Phượng) được thêu bằng chỉ kim tuyến vàng bạc tùy theo phẩm cấp từ Hoàng Quý phi đến Cung tần.',
      ],
      famousAnecdote:
        'Vào cuối triều Nguyễn, Áo Nhật Bình không còn đóng khung trong Tử Cấm Thành Huế mà được cho phép làm lễ phục cưới hỏi của phụ nữ quý tộc và danh gia vọng tộc, trở thành biểu tượng hỷ phục cao quý.',
      youthRevivalNote:
        'Ngày nay, hàng chục ngàn cặp đôi trẻ Việt Nam đã chọn Áo Nhật Bình (phối cùng Áo Tấc của chú rể) làm lễ phục chính trong ngày ăn hỏi và thành hôn.',
    },
  },
  {
    id: 'ao-tac',
    baseName: 'Áo Tấc (Ngũ Thân Tay Thụng)',
    dynasty: 'Triều Nguyễn · 1828',
    formality: 'Đại Lễ Phục',
    accessionCode: 'ACC.VP.1828.09',
    material: 'Gấm Vân Mây Cổ Truyền',
    silhouetteType: 'ao-tac',
    image: aoTacArchiveImg,
    stylized3dImage: stylized3dAoTac,
    garmentFeaturesEn:
      'Ceremonial five-panel Vietnamese grand tunic reaching past the knees with very wide, long flowing ceremonial sleeves (tay thụng), upright standing collar, diagonal right lapel overlap with 5 small gold buttons.',
    description:
      'Đại lễ phục toàn dân với ống tay dài và rộng một tấc bốn phân, tạo dáng vẻ cung kính, trang nghiêm tuyệt đối.',
    historySnippet:
      'Áo Tấc được vua Minh Mạng định chế làm quốc phục đại lễ từ Bắc chí Nam, không phân biệt giai tầng đều mặc trong các dịp tế lễ, cưới hỏi trọng đại.',
    historicalLore: {
      eraTitle: 'Quốc Phục Đại Lễ Toàn Dân Thời Nguyễn',
      originStory:
        'Áo Tấc (còn gọi là Áo Lễ hoặc Áo Thụng) có cấu trúc 5 thân giống Áo Ngũ Thân Tay Chẽn nhưng phần tay áo được may dài quá bàn tay và rộng thụng xuống. Tên gọi "Áo Tấc" xuất phát từ phần viền hoặc độ rộng tay áo theo đơn vị "tấc" cổ.',
      symbolismDecode: [
        'Ống tay áo thụng rộng giúp người mặc khi chắp hai tay trước ngực (vái lạy tổ tiên, thần phật) tạo thành một đường vòng cung kín đáo, che đi bàn tay.',
        'Độ rủ nặng của gấm và lụa ở hai tay áo buộc người mặc phải di chuyển khoan thai, lưng thẳng, giữ phong thái đĩnh đạc.',
      ],
      famousAnecdote:
        'Điều đặc biệt nhất của Áo Tấc là tính bình đẳng lễ nghi: từ Vua, Quan, Sĩ tử đi thi Hương - thi Hội cho tới người dân thường trong ngày cưới hoặc tế đình đều mặc chung một phom dáng Áo Tấc (chỉ phân biệt chất liệu gấm vóc hay vải nhuộm).',
      youthRevivalNote:
        'Các bạn nam nữ sinh viên thường chọn Áo Tấc cho lễ tốt nghiệp đại học, lễ trưởng thành và lễ cưới truyền thống.',
    },
  },
  {
    id: 'ao-giao-linh',
    baseName: 'Áo Giao Lĩnh Đối Khâm',
    dynasty: 'Thời Lý - Trần - Lê · TK XVII',
    formality: 'Cổ Phục Giao Thời',
    accessionCode: 'ACC.VP.1680.12',
    material: 'Đũi Tơ Tằm Thủ Công',
    silhouetteType: 'giao-linh',
    image: heroEditorialImg,
    stylized3dImage: stylized3dAoGiaoLinh,
    garmentFeaturesEn:
      'Traditional Vietnamese cross-collar robe (Giao Lĩnh) where the left lapel crosses neatly over the right lapel with a crisp white inner collar trim, wide draped sleeves, secured with a woven silk sash around the waist.',
    description:
      'Thức áo cổ giao nhau vạt trái đè vạt phải (hữu nhẫm), dáng suông rộng phóng khoáng kết hợp cùng thường lụa.',
    historySnippet:
      'Áo Giao Lĩnh là thức áo cổ chéo truyền thống thịnh hành suốt các triều Lý, Trần, Lê trước khi cuộc cải cách trang phục Đàng Trong ra đời.',
    historicalLore: {
      eraTitle: 'Cốt Cách Văn Hiến Đại Việt Thời Lý – Trần – Lê Sơ – Lê Trung Hưng',
      originStory:
        'Trước thế kỷ XVIII, Áo Giao Lĩnh (áo cổ giao nhau hình chữ Y) là trang phục phổ biến nhất của cả triều đình lẫn dân gian Đại Việt. Tư liệu lịch sử và tranh khắc gỗ thế kỷ XVII ghi nhận người Việt mặc áo Giao Lĩnh phủ ngoài Thường lụa xếp ly.',
      symbolismDecode: [
        'Quy tắc "Hữu Nhẫm" (vạt áo bên trái vắt sang phải, che đi vạt phải tạo thành chữ Y): đây là quy chuẩn cực kỳ nghiêm ngặt, tuyệt đối không được mặc ngược thành "Tả Nhẫm" (vì Tả Nhẫm xưa chỉ dùng cho người đã khuất).',
        'Đai lưng lụa thắt ngang eo vừa cố định tà áo, vừa phân chia tỷ lệ cơ thể hài hòa.',
      ],
      famousAnecdote:
        'Trong các bức tranh cổ như "Trúc Lâm Đại Sĩ Xuất Sơn Đồ" (thời Trần) hay tượng các Hoàng hậu thời Lê Trung Hưng tại chùa Mía, chùa Bút Tháp, phom dáng Áo Giao Lĩnh nhiều lớp hiện lên vô cùng uyển chuyển và trang nhã.',
      youthRevivalNote:
        'Giới trẻ đam mê cổ phục thời Lý – Trần – Lê đặc biệt yêu thích Áo Giao Lĩnh vì vẻ đẹp cổ điển, bay bổng như bước ra từ phim cổ trang lịch sử Việt.',
    },
  },
  {
    id: 'ao-vien-linh',
    baseName: 'Áo Viên Lĩnh Đoàn Hoa',
    dynasty: 'Thời Lý - Trần - Lê Sơ · TK XV',
    formality: 'Đại Lễ Phục',
    accessionCode: 'ACC.VP.1428.07',
    material: 'Gấm Thêu Hoa Văn Tròn',
    silhouetteType: 'vien-linh',
    image: aoTacArchiveImg,
    stylized3dImage: stylized3dAoVienLinh,
    garmentFeaturesEn:
      'Traditional Vietnamese round-collar robe (Áo Viên Lĩnh) featuring a neat circular collar hugging the neck, a circular gold-embroidered medallion (Đoàn Hoa) centered on the chest, wide ceremonial sleeves, and side slits over a pleated skirt or silk trousers.',
    description:
      'Thức áo cổ tròn cài khuy bên phải, chính giữa ngực thêu hoa văn Đoàn Hoa hoặc Bổ Tử uy nghi.',
    historySnippet:
      'Áo Viên Lĩnh có phần cổ tròn ôm sát thanh lịch, từng là phẩm phục quan lại và thường phục trang trọng trải dài từ thời Lý - Trần đến thời Lê.',
    historicalLore: {
      eraTitle: 'Phẩm Phục & Lễ Phục Cổ Tròn Thời Lý – Trần – Lê',
      originStory:
        'Song hành cùng Áo Giao Lĩnh, Áo Viên Lĩnh (hay Bàn Lĩnh) với phần cổ tròn khép kín là trang phục quy chuẩn của bậc Đế vương, Bá quan văn võ và tầng lớp quý tộc suốt gần một thiên niên kỷ lịch sử Đại Việt.',
      symbolismDecode: [
        'Cổ áo tròn tượng trưng cho bầu trời ("Thiên viên địa phương" — Trời tròn đất vuông).',
        'Hoa văn Đoàn Hoa (vòng tròn thêu rồng, phượng, hạc hoặc hoa sen trước ngực) thể hiện phẩm trật và ước vọng viên mãn.',
      ],
      famousAnecdote:
        'Những hiện vật khảo cổ và tượng đá lăng mộ thời Lê Trung Hưng cho thấy Áo Viên Lĩnh của người Việt có độ xẻ tà cao và phần tay áo linh hoạt để thích ứng với khí hậu nhiệt đới nóng ẩm phương Nam.',
      youthRevivalNote:
        'Áo Viên Lĩnh hiện được các nhóm nghiên cứu cổ phục trẻ phục dựng tinh xảo với các mẫu thêu Bổ Tử hạc trắng, phượng hoàng cực kỳ bắt mắt.',
    },
  },
  {
    id: 'ao-ba-ba-nam-bo',
    baseName: 'Áo Bà Ba Lụa Lãnh Mỹ A',
    dynasty: 'Nam Bộ · Thế kỷ XIX – XX',
    formality: 'Nam Bộ Truyền Thống',
    accessionCode: 'ACC.VP.1890.08',
    material: 'Lụa Lãnh Mỹ A Tân Châu',
    silhouetteType: 'ba-ba',
    image: aoNguThanImg,
    stylized3dImage: stylized3dAoBaBa,
    garmentFeaturesEn:
      'Traditional Southern Vietnamese collarless silk tunic (Áo Bà Ba) with a straight row of small buttons down the center front, two small front lower pockets, gentle side slits at the hip, long sleeves, worn with flowing black or white silk trousers.',
    description:
      'Biểu tượng mộc mạc, phóng khoáng của miền sông nước Nam Bộ với hàng cúc thẳng giữa ngực và lụa mát rượi.',
    historySnippet:
      'Áo Bà Ba gắn liền với công cuộc khai hoang mở cõi phương Nam, nổi bật với thiết kế không cổ thoáng mát, xẻ tà hai bên hông và chất liệu lụa Tân Châu.',
    historicalLore: {
      eraTitle: 'Hồn Cốt Phóng Khoáng Của Vùng Đất Phương Nam',
      originStory:
        'Áo Bà Ba định hình rõ nét vào nửa cuối thế kỷ XIX tại vùng đất Nam Bộ (như được nhà văn Sơn Nam ghi chép), kết hợp kỹ thuật cắt may linh hoạt cùng chất liệu lụa Lãnh Mỹ A Tân Châu (An Giang) nhuộm bằng trái mặc nưa đen bóng huyền thoại.',
      symbolismDecode: [
        'Thiết kế không cổ áo (cổ tròn khoét nhẹ) và hàng khuy cài thẳng chính giữa ngực giúp người mặc vô cùng thoáng mát dưới nắng gió miền Tây.',
        'Hai túi nhỏ phía dưới vạt trước vừa tạo điểm nhấn cân đối, vừa tiện lợi trong sinh hoạt thường ngày.',
      ],
      famousAnecdote:
        'Thứ lụa Lãnh Mỹ A may Áo Bà Ba xưa quý đến mức phải nhuộm ròng rã hàng trăm lần bằng nhựa trái mặc nưa, càng mặc lâu mặt lụa càng lên nước bóng mượt, mùa hè mặc mát lạnh như băng, mùa đông lại ấm áp.',
      youthRevivalNote:
        'Các bạn trẻ hiện nay rất chuộng diện Áo Bà Ba lụa pastel hoặc Lãnh Mỹ A kèm Khăn Rằn và Guốc Mộc trong các chuyến du lịch văn hóa miền Tây và chụp ảnh hoài cổ.',
    },
  },
];

export const BOTTOM_GARMENTS: BottomGarmentOption[] = [
  {
    id: 'quan-lua-trang',
    name: 'Quần Lụa Trắng',
    nameEn: 'wide-leg white (#F5F1E8) silk trousers',
    colorEn: 'warm white (#F5F1E8)',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
    material: 'Lụa Satin Tơ Tằm',
    hex: '#F5F1E8',
    note: 'Chuẩn mực cổ truyền, tôn lên sắc áo và giữ sự thanh lịch nơi tôn nghiêm.',
  },
  {
    id: 'thuong-lua-xep-ly',
    name: 'Thường Lụa Xếp Ly',
    nameEn: 'full-length pleated traditional Vietnamese silk wrap skirt (Thường lụa)',
    colorEn: 'imperial brocade gold (#D4AF37)',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
    material: 'Gấm Mềm Dệt Hoa',
    hex: '#D4AF37',
    note: 'Chân váy quấn xếp ly truyền thống kết hợp hoàn mỹ cùng Áo Nhật Bình, Tứ Thân và Giao Lĩnh.',
  },
  {
    id: 'quan-linh-den',
    name: 'Quần Lĩnh Đen Ống Rộng',
    nameEn: 'wide-leg traditional black silk trousers',
    colorEn: 'deep charcoal black (#181615)',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
    material: 'Lĩnh Bưởi Truyền Thống',
    hex: '#181615',
    note: 'Trang nhã, tạo độ tương phản chiều sâu cho các sắc áo sáng màu và Áo Bà Ba.',
  },
  {
    id: 'quan-jeans-ong-suong',
    name: 'Quần Jeans Ống Suông Cổ Điển',
    nameEn: 'straight-leg classic denim jeans',
    colorEn: 'vintage indigo denim (#1E40AF)',
    category: 'Giao Thoa Gen Z',
    tierHint: 'WARNING',
    material: 'Denim Chàm Mộc',
    hex: '#1E40AF',
    note: 'Bản phối Streetwear Gen Z năng động khi dạo phố, cần lưu ý nếu vào đền chùa.',
  },
  {
    id: 'quan-kaki-ong-rong',
    name: 'Quần Kaki Ống Rộng Contemporary',
    nameEn: 'wide-leg cotton twill khaki trousers',
    colorEn: 'warm sand khaki (#C5A880)',
    category: 'Giao Thoa Gen Z',
    tierHint: 'WARNING',
    material: 'Cotton Twill',
    hex: '#C5A880',
    note: 'Phong cách Smart-Casual giao thoa hiện đại cho sự kiện sáng tạo.',
  },
  {
    id: 'quan-short-jeans-cat-ngan',
    name: 'Quần Short Jeans Cắt Ngắn',
    nameEn: 'short cut denim shorts',
    colorEn: 'bright blue denim (#2563EB)',
    category: 'Vi Phạm Quy Chuẩn',
    tierHint: 'CRITICAL',
    material: 'Denim Cắt Ngắn',
    hex: '#2563EB',
    note: 'Làm mất tính tôn nghiêm của Việt phục, đặc biệt tối kỵ với lễ phục cung đình.',
  },
  {
    id: 'chan-vay-ngan-miniskirt',
    name: 'Chân Váy Ngắn Micro-Miniskirt',
    nameEn: 'short pleated mini-skirt',
    colorEn: 'crimson burgundy pleated (#9A2B1D)',
    category: 'Vi Phạm Quy Chuẩn',
    tierHint: 'CRITICAL',
    material: 'Polyester Xếp Ly',
    hex: '#9A2B1D',
    note: 'Sai lệch tỷ lệ thẩm mỹ và quy chuẩn văn hóa của trang phục truyền thống.',
  },
];

export const ACCESSORIES: AccessoryOption[] = [
  {
    id: 'acc-khan-dong',
    name: 'Khăn Đóng Tám Nếp',
    nameEn: 'traditional 8-fold silk turban (Khăn đóng)',
    colorEn: 'matte black silk',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
  },
  {
    id: 'acc-non-quai-thao',
    name: 'Nón Quai Thao Kinh Bắc',
    nameEn: 'traditional flat broad-rimmed Kinh Bac palm hat (Nón quai thao)',
    colorEn: 'woven golden palm leaf with silk chin tassel',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
  },
  {
    id: 'acc-non-la',
    name: 'Nón Lá Bài Thơ Huế',
    nameEn: 'traditional Vietnamese conical palm hat (Nón lá)',
    colorEn: 'natural light bamboo and palm leaf',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
  },
  {
    id: 'acc-quat-tram',
    name: 'Quạt Trầm Châm Kim',
    nameEn: 'traditional folding agarwood & paper fan (Quạt trầm)',
    colorEn: 'warm agarwood bamboo and ivory paper',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
  },
  {
    id: 'acc-kieng-bac',
    name: 'Kiềng Bạc Chạm Khắc',
    nameEn: 'engraved silver torc necklace (Kiềng bạc)',
    colorEn: 'polished sterling silver',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
  },
  {
    id: 'acc-guoc-moc',
    name: 'Guốc Mộc Sơn Mài',
    nameEn: 'traditional Vietnamese wooden clogs (Guốc mộc)',
    colorEn: 'polished dark wood and velvet strap',
    category: 'Truyền Thống',
    tierHint: 'SAFE',
  },
  {
    id: 'kinh-ram-retro',
    name: 'Kính Râm Mắt Mèo Retro',
    nameEn: 'retro cat-eye sunglasses',
    colorEn: 'tortoiseshell black with gold bridge',
    category: 'Hiện Đại',
    tierHint: 'WARNING',
  },
];

export function mapAccessoryIdToName(idOrName: string): string {
  const clean = idOrName.trim().toLowerCase();
  const byId = ACCESSORIES.find((a) => a.id.toLowerCase() === clean);
  if (byId) return byId.name;
  if (clean.includes('quat')) return 'Quạt Trầm Châm Kim';
  if (clean.includes('non-la') || clean.includes('nón lá')) return 'Nón Lá Bài Thơ Huế';
  if (clean.includes('khan-dong') || clean.includes('khăn đóng')) return 'Khăn Đóng Tám Nếp';
  if (clean.includes('kieng-bac') || clean.includes('kiềng bạc')) return 'Kiềng Bạc Chạm Khắc';
  if (clean.includes('guoc-moc') || clean.includes('guốc mộc')) return 'Guốc Mộc Sơn Mài';
  if (clean.includes('quai-thao') || clean.includes('quai thao')) return 'Nón Quai Thao Kinh Bắc';
  const byName = ACCESSORIES.find((a) => a.name.toLowerCase() === clean);
  return byName ? byName.name : idOrName;
}

export function mapAccessoryNameToId(nameOrId: string): string {
  const clean = nameOrId.trim().toLowerCase();
  const byId = ACCESSORIES.find((a) => a.id.toLowerCase() === clean);
  if (byId) return byId.id;
  if (clean.includes('quạt')) return 'acc-quat-tram';
  if (clean.includes('nón lá')) return 'acc-non-la';
  if (clean.includes('khăn đóng')) return 'acc-khan-dong';
  if (clean.includes('kiềng bạc')) return 'acc-kieng-bac';
  if (clean.includes('guốc')) return 'acc-guoc-moc';
  if (clean.includes('quai thao')) return 'acc-non-quai-thao';
  const byName = ACCESSORIES.find((a) => a.name.toLowerCase() === clean);
  return byName ? byName.id : 'acc-khan-dong';
}

/**
 * Deterministic cultural consultation following the exact V-Stylist AI rules:
 * - Nắng nóng / Di chuyển ngoài trời: Ưu tiên áo tay chẽn hoặc bà ba ("ao-ngu-than-tay-chen", "ao-ba-ba-nam-bo"),
 *   màu mát như xanh ngọc (#134E4A) hoặc trắng ngà (#F5F1E8). Tránh Áo Tấc tay quá dài.
 * - Lễ chùa / Đền cúng tế: Bắt buộc trang trọng, kín đáo ("ao-tac", "ao-ngu-than-tay-chen", "ao-nhat-binh").
 * - Chụp ảnh hoài cổ / Kỷ yếu: Chọn Áo Giao Lĩnh, Áo Tứ Thân hoặc Nhật Bình.
 */
export function buildDeterministicVStylistConsultation(
  input: VStylistConsultationInput
): VStylistConsultationOutput {
  const rawFreeform = (input.freeformRequest || '').trim();
  const combined = `${input.location || ''} ${input.weather || ''} ${input.event || ''} ${rawFreeform}`.toLowerCase();

  // 1. Detect Location
  let detectedLocation = input.location || 'Hà Nội';
  if (combined.includes('huế') || combined.includes('đại nội') || combined.includes('thiên mụ')) {
    detectedLocation = 'Cố Đô Huế';
  } else if (
    combined.includes('sài gòn') ||
    combined.includes('tp.hcm') ||
    combined.includes('hồ chí minh') ||
    combined.includes('nam bộ') ||
    combined.includes('miền tây')
  ) {
    detectedLocation = 'TP.HCM / Nam Bộ';
  } else if (combined.includes('kinh bắc') || combined.includes('bắc ninh') || combined.includes('hội lim')) {
    detectedLocation = 'Kinh Bắc (Bắc Ninh)';
  } else if (combined.includes('đà lạt')) {
    detectedLocation = 'Đà Lạt';
  } else if (combined.includes('hà nội') || combined.includes('thăng long') || combined.includes('văn miếu')) {
    detectedLocation = 'Hà Nội';
  }

  // 2. Detect Weather
  const tempMatch = combined.match(/(\d{2})\s*°?\s*c/i);
  const tempNum = tempMatch ? parseInt(tempMatch[1], 10) : 25;
  const isHotOrOutdoor =
    tempNum >= 30 ||
    combined.includes('nắng nóng') ||
    combined.includes('oi bức') ||
    combined.includes('ngoài trời') ||
    combined.includes('dạo phố') ||
    combined.includes('du lịch') ||
    combined.includes('nắng gắt');

  let detectedWeather = input.weather || 'Mát mẻ (22°C)';
  if (isHotOrOutdoor && !detectedWeather.toLowerCase().includes('nắng')) {
    detectedWeather = tempMatch ? `Nắng nóng (${tempNum}°C)` : 'Nắng nóng ngoài trời (33°C)';
  }

  // 3. Detect Event
  const isSacredTemple =
    combined.includes('chùa') ||
    combined.includes('đền') ||
    combined.includes('cúng') ||
    combined.includes('tế') ||
    combined.includes('lễ phật') ||
    combined.includes('từ đường');
  const isRetroOrYearbook =
    combined.includes('kỷ yếu') ||
    combined.includes('hoài cổ') ||
    combined.includes('cổ trang') ||
    combined.includes('chụp ảnh') ||
    combined.includes('triển lãm');
  const isRoyalOrWedding =
    combined.includes('hôn lễ') ||
    combined.includes('cưới') ||
    combined.includes('hoàng cung') ||
    combined.includes('cung đình');

  let detectedEvent = input.event || 'Đi Lễ Chùa';
  if (rawFreeform) {
    if (isSacredTemple) detectedEvent = 'Lễ Chùa & Chiêm Bái Tâm Linh';
    else if (isRoyalOrWedding) detectedEvent = 'Đại Lễ / Hôn Lễ Truyền Thống';
    else if (isRetroOrYearbook) detectedEvent = 'Chụp Ảnh Hoài Cổ / Kỷ Yếu';
    else if (isHotOrOutdoor) detectedEvent = 'Du Ngoạn & Di Chuyển Ngoài Trời';
  }

  // 4. Select Optimal Costume, Colors, Pattern, and Accessories from Catalog
  let costumeId: string = 'ao-ngu-than-tay-chen';
  let mainColor = '#134E4A';
  let bottomColor = '#F5F1E8';
  let patternId: PatternId = 'pattern_may_co';
  let accessoryIds: string[] = ['acc-khan-dong', 'acc-quat-tram'];
  let stylistNote = '';
  let audioGuideScript = '';

  if (isSacredTemple && isHotOrOutdoor) {
    costumeId = 'ao-ngu-than-tay-chen';
    mainColor = '#134E4A';
    bottomColor = '#F5F1E8';
    patternId = 'pattern_may_co';
    accessoryIds = ['acc-khan-dong', 'acc-quat-tram', 'acc-guoc-moc'];
  } else if (isHotOrOutdoor && !isSacredTemple && !isRetroOrYearbook) {
    const preferBaBa =
      combined.includes('nam bộ') ||
      combined.includes('miền tây') ||
      combined.includes('bà ba') ||
      combined.includes('tp.hcm') ||
      combined.includes('sài gòn');
    if (preferBaBa) {
      costumeId = 'ao-ba-ba-nam-bo';
      mainColor = '#F5F1E8';
      bottomColor = '#334155';
      patternId = 'none';
      accessoryIds = ['acc-non-la', 'acc-guoc-moc'];
    } else {
      costumeId = 'ao-ngu-than-tay-chen';
      mainColor = '#134E4A';
      bottomColor = '#F5F1E8';
      patternId = 'pattern_song_nuoc';
      accessoryIds = ['acc-non-la', 'acc-quat-tram', 'acc-guoc-moc'];
    }
  } else if (isSacredTemple) {
    if (combined.includes('nhật bình') || combined.includes('hoàng cung')) {
      costumeId = 'ao-nhat-binh';
      mainColor = '#D4AF37';
      bottomColor = '#F5F1E8';
      patternId = 'pattern_cuc_day';
      accessoryIds = ['acc-khan-dong', 'acc-kieng-bac', 'acc-quat-tram'];
    } else if (combined.includes('tấc') || combined.includes('cúng tế') || combined.includes('đại lễ')) {
      costumeId = 'ao-tac';
      mainColor = '#1E3A8A';
      bottomColor = '#F5F1E8';
      patternId = 'pattern_may_co';
      accessoryIds = ['acc-khan-dong', 'acc-guoc-moc'];
    } else {
      costumeId = 'ao-ngu-than-tay-chen';
      mainColor = '#134E4A';
      bottomColor = '#F5F1E8';
      patternId = 'pattern_may_co';
      accessoryIds = ['acc-khan-dong', 'acc-quat-tram', 'acc-guoc-moc'];
    }
  } else if (isRetroOrYearbook || isRoyalOrWedding) {
    if (combined.includes('tứ thân') || combined.includes('kinh bắc') || combined.includes('quan họ')) {
      costumeId = 'ao-tu-than-kinh-bac';
      mainColor = '#6B21A8';
      bottomColor = '#334155';
      patternId = 'pattern_cuc_day';
      accessoryIds = ['acc-non-quai-thao', 'acc-kieng-bac', 'acc-guoc-moc'];
    } else if (combined.includes('nhật bình') || isRoyalOrWedding) {
      costumeId = 'ao-nhat-binh';
      mainColor = '#9A2B1D';
      bottomColor = '#F5F1E8';
      patternId = 'pattern_chim_lac';
      accessoryIds = ['acc-khan-dong', 'acc-kieng-bac', 'acc-quat-tram'];
    } else if (combined.includes('áo dài')) {
      costumeId = 'ao-dai-truyen-thong';
      mainColor = '#F5F1E8';
      bottomColor = '#F5F1E8';
      patternId = 'none';
      accessoryIds = ['acc-non-la', 'acc-guoc-moc'];
    } else {
      costumeId = 'ao-giao-linh';
      mainColor = '#9A2B1D';
      bottomColor = '#F5F1E8';
      patternId = 'pattern_chim_lac';
      accessoryIds = ['acc-quat-tram', 'acc-kieng-bac', 'acc-guoc-moc'];
    }
  } else {
    costumeId = 'ao-vien-linh';
    mainColor = '#D4AF37';
    bottomColor = '#F5F1E8';
    patternId = 'pattern_song_nuoc';
    accessoryIds = ['acc-khan-dong', 'acc-quat-tram'];
  }

  // If the user has an active costume selection in the studio, synchronize the recommendation,
  // stylistNote, and 30-second audioGuideScript directly with their chosen costume & styling!
  if (input.selectedCostumeId) {
    costumeId = input.selectedCostumeId;
  }
  if (input.selectedMainColor) {
    mainColor = input.selectedMainColor;
  }
  if (input.selectedBottomColor) {
    bottomColor = input.selectedBottomColor;
  }
  if (input.selectedPatternId) {
    patternId = input.selectedPatternId;
  }
  if (Array.isArray(input.selectedAccessoryIds) && input.selectedAccessoryIds.length > 0) {
    accessoryIds = input.selectedAccessoryIds;
  }

  const matchedColorObj =
    TRADITIONAL_COLORS.find((c) => c.hex.toLowerCase() === mainColor.toLowerCase()) ||
    CATALOG_COLOR_SWATCHES.find((c) => c.hex.toLowerCase() === mainColor.toLowerCase());
  const colorLabel = (
    input.selectedMainColorName ||
    matchedColorObj?.name ||
    'Trắng Ngà'
  ).replace(/^Màu\s+/i, '');

  const matchedBotColorObj =
    TRADITIONAL_COLORS.find((c) => c.hex.toLowerCase() === bottomColor.toLowerCase()) ||
    CATALOG_COLOR_SWATCHES.find((c) => c.hex.toLowerCase() === bottomColor.toLowerCase());
  const botColorLabel = (matchedBotColorObj?.name || 'Trắng Ngà').replace(/^Màu\s+/i, '');
  const bottomNameLabel = input.selectedBottomName || 'Quần Lụa Trắng';

  const patObj = TRADITIONAL_PATTERNS.find((p) => p.id === patternId);
  const patLabel =
    patternId === 'none' || !patObj ? 'lụa trơn dệt mịn' : `họa tiết ${patObj.name}`;

  accessoryIds = [];

  switch (costumeId) {
    case 'ao-dai-truyen-thong': {
      stylistNote = `Tại ${detectedLocation} (${detectedWeather}) cho dịp ${detectedEvent}, bộ Áo Dài Truyền Thống sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) và ${patLabel} tôn vinh đường nét thanh tú, mềm mại đặc trưng của người Việt.`;
      audioGuideScript = `Áo Dài Truyền Thống sắc ${colorLabel} trên nền ${patLabel} là biểu tượng văn hóa kết tinh vẻ đẹp dịu dàng mà kiên cường của người Việt. Thiết kế cổ đứng kín đáo nối liền hai tà áo thướt tha cùng ${bottomNameLabel} sắc ${botColorLabel} tôn vinh trọn vẹn cốt cách thanh tao và tâm hồn Việt Nam.`;
      break;
    }
    case 'ao-nhat-binh': {
      stylistNote = `Cho sự kiện ${detectedEvent} tại ${detectedLocation}, Áo Nhật Bình Hoàng Cung sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) và ${patLabel} tái hiện thần thái vương giả của cung đình Huế.`;
      audioGuideScript = `Áo Nhật Bình sắc ${colorLabel} kết hợp ${patLabel} vốn là triều phục cao quý của bậc Hậu phi và Công chúa triều Nguyễn. Tên gọi Nhật Bình bắt nguồn từ phần cổ áo hình chữ nhật khi cài lại tạo thành chữ Nhật, kết hợp dải ngũ sắc nơi cổ tay tượng trưng cho Ngũ Hành hòa hợp và phúc lộc hoàng gia.`;
      break;
    }
    case 'ao-tac': {
      stylistNote = `Trong không gian ${detectedEvent} tại ${detectedLocation}, Đại lễ phục Áo Tấc sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) và ${patLabel} là chuẩn mực cao quý của lễ nghi cổ truyền.`;
      audioGuideScript = `Đại lễ phục Áo Tấc sắc ${colorLabel} cùng ${patLabel} mang ý nghĩa biểu trưng cho sự tôn nghiêm và bình đẳng trong lễ nhạc triều Nguyễn từ thời vua Minh Mạng. Tên gọi Áo Tấc xuất phát từ đường viền rộng đúng một tấc quanh cổ và tà áo, cùng hai ống tay thụng rộng thể hiện lòng thành kính khi chắp tay hành lễ.`;
      break;
    }
    case 'ao-giao-linh': {
      stylistNote = `Với bối cảnh ${detectedEvent} tại ${detectedLocation} (${detectedWeather}), Áo Giao Lĩnh Cổ Chéo sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) và ${patLabel} gợi lên khí chất cổ phong thời Lý - Trần - Lê.`;
      audioGuideScript = `Áo Giao Lĩnh Cổ Chéo sắc ${colorLabel} điểm ${patLabel} là thức áo cổ xưa gắn liền với văn hiến Đại Việt suốt các triều đại Lý, Trần, Lê. Phần cổ giao nhau chữ Y cài vạt sang bên phải theo quy chuẩn Hữu Nhẫm biểu thị sự thuận theo lẽ tự nhiên và cốt cách nho nhã của người xưa.`;
      break;
    }
    case 'ao-tu-than-kinh-bac': {
      stylistNote = `Cho dịp ${detectedEvent} tại ${detectedLocation}, Áo Tứ Thân Kinh Bắc sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) và ${patLabel} mang đậm hồn quê đồng bằng Bắc Bộ.`;
      audioGuideScript = `Áo Tứ Thân Kinh Bắc sắc ${colorLabel} cùng ${patLabel} là biểu tượng của văn hóa dân gian Bắc Bộ và di sản dân ca Quan Họ. Bốn tà áo tượng trưng cho tứ thân phụ mẫu, hai tà trước buộc nhẹ nơi thắt lưng tôn vinh vẻ đẹp tần tảo, duyên dáng và tình nghĩa thủy chung của người phụ nữ Việt.`;
      break;
    }
    case 'ao-vien-linh': {
      stylistNote = `Bản phối Áo Viên Lĩnh Cổ Tròn sắc ${colorLabel} (${mainColor}) cùng ${bottomNameLabel} (${bottomColor}) và ${patLabel} mang đến diện mạo sang trọng, hài hòa cho dịp ${detectedEvent} tại ${detectedLocation}.`;
      audioGuideScript = `Áo Viên Lĩnh sắc ${colorLabel} kết hợp ${patLabel} gửi gắm triết lý Trời tròn Đất vuông sâu sắc trong văn hóa phục sức Đại Việt. Phần cổ tròn ôm khít tượng trưng cho bầu trời viên mãn, hòa quyện cùng tà áo rộng đại diện cho mặt đất, thể hiện ước vọng giao hòa giữa con người và vũ trụ.`;
      break;
    }
    case 'ao-ba-ba-nam-bo': {
      stylistNote = `Dưới tiết trời ${detectedWeather} tại ${detectedLocation}, Áo Bà Ba Nam Bộ sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) và ${patLabel} là lựa chọn thoáng mát, phóng khoáng bậc nhất cho dịp ${detectedEvent}.`;
      audioGuideScript = `Áo Bà Ba sắc ${colorLabel} trên nền ${patLabel} mang ý nghĩa biểu trưng cho tinh thần phóng khoáng, mộc mạc và kiên cường của người dân miền sông nước Nam Bộ. Thiết kế không cổ cùng hai đường xẻ tà bên hông tạo sự thanh thoát, gắn liền với hành trình khai hoang mở cõi phương Nam.`;
      break;
    }
    case 'au-phuc-dong-duong': {
      stylistNote = `Tại ${detectedLocation} trong dịp ${detectedEvent}, Âu Phục Đông Dương sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) tạo nên phong cách giao thoa Đông - Tây lịch lãm thập niên 1930.`;
      audioGuideScript = `Bộ Âu Phục Đông Dương sắc ${colorLabel} phản ánh ý nghĩa giao thoa văn hóa Đông Tây của tầng lớp trí thức Việt Nam đầu thế kỷ hai mươi. Sự kết hợp giữa kỹ thuật cắt may chuẩn mực phương Tây và chất liệu nhiệt đới bản địa khẳng định bản lĩnh hội nhập mà vẫn giữ vững cốt cách dân tộc.`;
      break;
    }
    case 'ao-ngu-than-tay-chen':
    default: {
      stylistNote = `Tại ${detectedLocation} (${detectedWeather}) cho dịp ${detectedEvent}, Áo Ngũ Thân Tay Chẽn sắc ${colorLabel} (${mainColor}) phối ${bottomNameLabel} (${bottomColor}) và ${patLabel} mang lại vẻ đẹp kín đáo, khiêm cung và linh hoạt.`;
      audioGuideScript = `Áo Ngũ Thân Tay Chẽn sắc ${colorLabel} kết hợp ${patLabel} ẩn chứa triết lý đạo đức sâu sắc của người Việt: bốn thân áo ngoài tượng trưng cho tứ thân phụ mẫu, thân thứ năm bên trong đại diện cho người con, và năm hạt khuy cài nhắc nhở về Ngũ Thường: Nhân, Lễ, Nghĩa, Trí, Tín.`;
      break;
    }
  }

  return {
    contextAnalysis: {
      location: detectedLocation,
      weather: detectedWeather,
      event: detectedEvent,
    },
    recommendation: {
      costumeId,
      mainColor,
      bottomColor,
      patternId,
      accessoryIds,
    },
    stylistNote,
    audioGuideScript,
  };
}

export const FOOTWEAR_ACCESSORY_NAMES: string[] = [];

export const HEADWEAR_ACCESSORY_NAMES: string[] = [
  'Khăn Đóng Tám Nếp',
  'Nón Lá Bài Thơ Huế',
  'Nón Quai Thao Kinh Bắc',
];

export type NecklineCutId =
  | 'co-truyen-thong'
  | 'ao-tre-vai'
  | 'co-yem-dao'
  | 'tay-ngan-cach-tan';

export type HemLengthCutId =
  | 'ta-dai-chuan'
  | 'ta-lung-ngang-dui'
  | 'dam-ngan-tren-goi'
  | 'crop-top-pha-cach';

export interface CustomCutOption<T extends string> {
  id: T;
  label: string;
  desc: string;
  tierHint: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export const NECKLINE_CUT_OPTIONS: CustomCutOption<NecklineCutId>[] = [
  {
    id: 'co-truyen-thong',
    label: 'Cổ & Vai Truyền Thống',
    desc: 'Chuẩn mực cổ đứng / giao lĩnh kín đáo',
    tierHint: 'SAFE',
  },
  {
    id: 'ao-tre-vai',
    label: 'Áo Trễ Vai Cách Tân',
    desc: 'Lộ bờ vai & xương quai xanh phá cách',
    tierHint: 'CRITICAL',
  },
  {
    id: 'co-yem-dao',
    label: 'Cổ Yếm Lộ Vai Thon',
    desc: 'Dáng cổ yếm khoét vai hiện đại',
    tierHint: 'WARNING',
  },
  {
    id: 'tay-ngan-cach-tan',
    label: 'Tay Ngắn Cách Tân',
    desc: 'Thu gọn ống tay lỡ năng động',
    tierHint: 'WARNING',
  },
];

export const HEM_LENGTH_CUT_OPTIONS: CustomCutOption<HemLengthCutId>[] = [
  {
    id: 'ta-dai-chuan',
    label: 'Tà Dài Chuẩn (Lộ Giày)',
    desc: 'Tà áo qua gối, gấu quần lộ rõ giày/dép',
    tierHint: 'SAFE',
  },
  {
    id: 'ta-lung-ngang-dui',
    label: 'Tà Lửng (Lộ Rõ Quần)',
    desc: 'Vạt áo ngang hông giúp thấy trọn dáng quần',
    tierHint: 'WARNING',
  },
  {
    id: 'dam-ngan-tren-goi',
    label: 'Đầm Ngắn / Váy Ngắn',
    desc: 'Cắt ngắn thành đầm mini trên gối lộ chân',
    tierHint: 'CRITICAL',
  },
  {
    id: 'crop-top-pha-cach',
    label: 'Áo Dáng Lửng (Cropped)',
    desc: 'Áo lửng ngang eo phối quần/váy Gen Z',
    tierHint: 'CRITICAL',
  },
];

export const WEATHER_PRESETS: WeatherPreset[] = [
  {
    id: 'hanoi-autumn',
    location: 'Hà Nội',
    temperature: '22°C',
    condition: 'Mát mẻ',
    humidity: '68%',
  },
  {
    id: 'hue-imperial',
    location: 'Cố Đô Huế',
    temperature: '26°C',
    condition: 'Dịu nhẹ',
    humidity: '74%',
  },
  {
    id: 'hcm-sunny',
    location: 'TP.HCM',
    temperature: '34°C',
    condition: 'Nắng Nóng',
    humidity: '62%',
  },
  {
    id: 'dalat-mist',
    location: 'Đà Lạt',
    temperature: '16°C',
    condition: 'Se lạnh',
    humidity: '82%',
  },
];

export const EVENT_TYPES: string[] = [
  'Đi Lễ Chùa',
  'Đi Lễ Đền',
  'Chụp Ảnh Kỷ Yếu',
  'Dạo Phố Chụp Ảnh',
  'Hôn Lễ Truyền Thống',
  'Triển Lãm Nghệ Thuật',
];

export interface CuratedPreset {
  id: string;
  label: string;
  subtitle: string;
  badgeTier: 'SAFE' | 'WARNING' | 'CRITICAL';
  genderEn: 'male' | 'female';
  topId: string;
  colorId: string;
  patternId: PatternId;
  bottomName: string;
  accessories: string[];
  weatherId: string;
  eventType: string;
  userCustomRequest: string;
  precomputedOutput: OutfitEvaluationOutput;
}

export const CURATED_PRESETS: CuratedPreset[] = [
  {
    id: 'preset-safe-standard',
    label: '01. Chuẩn Mực',
    subtitle: 'Áo Ngũ Thân Xanh Cổ Vịt · Hoa Văn Mây Cổ · Lễ Chùa Hà Nội',
    badgeTier: 'SAFE',
    genderEn: 'female',
    topId: 'ao-ngu-than-tay-chen',
    colorId: 'xanh-co-vit',
    patternId: 'pattern_may_co',
    bottomName: 'Quần Lụa Trắng',
    accessories: ['Khăn Đóng Tám Nếp'],
    weatherId: 'hanoi-autumn',
    eventType: 'Đi Lễ Chùa',
    userCustomRequest: '',
    precomputedOutput: {
      lookbook_title: 'Thanh Phong Trụ Vũ',
      style_score: 98,
      weather_advice:
        'Thời tiết Hà Nội 22°C vô cùng lý tưởng để diện Áo Ngũ Thân lụa kết hợp hoa văn Mây Cổ mà không lo oi nóng.',
      cultural_status: 'SAFE',
      cultural_warning_msg:
        'Trang phục hoàn hảo! Sự kết hợp giữa sắc Xanh Cổ Vịt, họa tiết Mây Cổ chìm và guốc gỗ thể hiện trọn vẹn nét nhã nhặn, tôn nghiêm khi đi lễ đền chùa.',
      cultural_history_fact:
        'Áo Ngũ Thân định hình quy chuẩn từ thời chúa Nguyễn Phúc Khoát với 5 tà đại diện cho Ngũ Thường (Nhân, Lễ, Nghĩa, Trí, Tín) và Ngũ Hành.',
      custom_request_feedback: null,
      recommended_color_hex: null,
      recommended_pattern_id: 'pattern_may_co',
    },
  },
  {
    id: 'preset-warning-fusion',
    label: '02. Kỷ Yếu Gen Z',
    subtitle: 'Áo Ngũ Thân Đỏ Son · Sneaker & Kính Râm · Chụp Ảnh Kỷ Yếu',
    badgeTier: 'WARNING',
    genderEn: 'male',
    topId: 'ao-ngu-than-tay-chen',
    colorId: 'do-son',
    patternId: 'none',
    bottomName: 'Quần Jeans Ống Suông Cổ Điển',
    accessories: ['Kính Râm Mắt Mèo Retro'],
    weatherId: 'hue-imperial',
    eventType: 'Chụp Ảnh Kỷ Yếu',
    userCustomRequest: 'Muốn phối kiểu Gen Z nổi bật để chụp ảnh kỷ yếu nhưng không bị ô dề',
    precomputedOutput: {
      lookbook_title: 'Đông Kinh Phá Cách',
      style_score: 85,
      weather_advice:
        'Nhiệt độ 26°C nắng nhẹ rất thích hợp cho buổi chụp ảnh ngoại cảnh kỷ yếu cùng bạn bè.',
      cultural_status: 'WARNING',
      cultural_warning_msg:
        'Bản phối rất cá tính! Việc kết hợp Sneaker và Kính mát mang lại tinh thần Gen Z năng động cho ảnh kỷ yếu. Tuy nhiên, nếu ghé thăm các di tích lịch sử trong buổi chụp, bạn nên tháo kính râm để giữ sự trang trọng.',
      cultural_history_fact:
        'Áo Ngũ Thân nam thường có cổ đứng cao, gài 5 khuy đại diện cho đạo làm người và sự hòa hợp giữa gia đình, xã hội.',
      custom_request_feedback:
        "Để nổi bật hơn mà vẫn tinh tế, AI gợi ý bạn phủ thêm họa tiết 'Chim Lạc' ánh kim ở viền tay áo và giữ tông màu Đỏ Son chủ đạo.",
      recommended_color_hex: '#9A2B1D',
      recommended_pattern_id: 'pattern_chim_lac',
      genz_ai_comment:
        'Bản phối Gen Z cháy phố dữ dằn nha ní! Chụp ảnh kỷ yếu thì bao chất, nhưng nếu ghé di tích lịch sử thì tháo kính râm xíu nhen homie! 😎',
    },
  },
  {
    id: 'preset-critical-violation',
    label: '03. Cảnh Báo Lễ Nghi',
    subtitle: 'Áo Nhật Bình Vàng Mai · Quần Short Jeans · Đi Lễ Đền 34°C',
    badgeTier: 'CRITICAL',
    genderEn: 'female',
    topId: 'ao-nhat-binh',
    colorId: 'vang-mai',
    patternId: 'none',
    bottomName: 'Quần Short Jeans Cắt Ngắn',
    accessories: [],
    weatherId: 'hcm-sunny',
    eventType: 'Đi Lễ Đền',
    userCustomRequest: '',
    precomputedOutput: {
      lookbook_title: 'Bất Hòa Phong Cách',
      style_score: 30,
      weather_advice:
        'Khoác Áo Nhật Bình nhiều lớp dưới thời tiết 34°C nắng nóng sẽ gây cảm giác oi bức, nên chọn chất liệu lụa mỏng nhẹ.',
      cultural_status: 'CRITICAL',
      cultural_warning_msg:
        'Cảnh báo vi phạm quy chuẩn! Áo Nhật Bình là lễ phục triều đình tôn nghiêm, tuyệt đối không kết hợp với quần short ngắn khi đi lễ đền. Hãy chuyển sang Quần lụa ống rộng để đảm bảo tính trang trọng.',
      cultural_history_fact:
        'Áo Nhật Bình là triều phục dành cho Bậc Hậu phi, Công chúa triều Nguyễn, có dải cổ áo hình chữ nhật đặc trưng thể hiện uy quyền và lễ nghi hoàng cung.',
      custom_request_feedback: null,
      recommended_color_hex: '#1C1917',
      recommended_pattern_id: 'none',
      genz_ai_comment:
        'Gì dợ má? Áo Nhật Bình triều đình tôn nghiêm mà mix với quần short jeans đi lễ đền là kiếp nạn thứ 82 của cụ cố tổ gòi á! Đổi qua quần lụa ống rộng dài chấm gót liền kẻo bị các cụ gõ đầu nè! 👑',
    },
  },
];

/**
 * Dynamically populates the exact Stylized 3D Illustration Prompt Template from the user specification.
 */
export function buildStylized3DPrompt(params: {
  genderEn: 'male' | 'female';
  topGarment: TopGarmentOption;
  color: TraditionalColor;
  bottomGarment: BottomGarmentOption;
  selectedAccessoryNames: string[];
  lookMode?: 'semi_realistic_3d' | 'photorealistic';
}): string {
  const {
    genderEn,
    topGarment,
    color,
    bottomGarment,
    lookMode = 'semi_realistic_3d',
  } = params;

  const isFemale = genderEn === 'female';
  const personNoun = isFemale ? 'woman' : 'man';

  const lookLine =
    lookMode === 'photorealistic'
      ? 'photorealistic, real-looking human, natural proportions, natural skin with subtle texture, realistic hair and eyes, calm neutral expression with mouth closed, realistic fabric.'
      : 'semi-realistic 3D character, realistic proportions, smooth even skin with soft natural shading, slightly simplified clean facial details, calm neutral expression with mouth closed, realistic fabric.';

  const isDefaultNamNguThan =
    !isFemale && topGarment.silhouetteType === 'ngu-than';
  const isDefaultNuAoDai =
    isFemale && topGarment.silhouetteType === 'ao-dai';

  const outfitLine = isDefaultNamNguThan
    ? `a Vietnamese traditional men's long tunic (áo ngũ thân) in ${color.nameEn}: stand collar, long fitted sleeves, tunic length to below the knees with side slits, diagonal asymmetrical closure from the neck across the chest to the side seam with small round gold buttons; worn over wide-leg white (${bottomGarment.hex}) trousers and plain dark shoes. Realistic fabric: visible silk weave, natural folds, stitching, real metal buttons.`
    : isDefaultNuAoDai
    ? `a Vietnamese áo dài in ${color.nameEn}: stand-up collar, fitted bodice and waist, long fitted sleeves, two long panels front and back to the ankles with side slits from the waist; worn over wide-leg white (${bottomGarment.hex}) silk trousers and simple flat shoes. Realistic fabric: visible silk weave and sheen, natural folds, stitching, small fastenings.`
    : `${topGarment.baseName} (${topGarment.garmentFeaturesEn}) in ${color.nameEn}; worn over ${bottomGarment.nameEn} (${bottomGarment.hex}) and ${isFemale ? 'simple flat shoes' : 'plain dark shoes'}. Realistic fabric: visible silk weave, natural folds, stitching, small fastenings.`;

  const hairAndHeadBlock = isFemale
    ? `HAIR AND HEAD: long black hair tied back in a low neat bun, BARE HEAD.
No hat, no headscarf, no earrings, no jewelry, no accessories.`
    : `HAIR AND HEAD: short neat black hair, BARE HEAD. No hat, no turban, no
headwear, no glasses, no jewelry, no accessories.`;

  const backGarmentWord = isFemale ? 'áo dài' : 'tunic';

  return `Create a character turnaround sheet of ONE fictional young Vietnamese
${personNoun}, adult around 22, not resembling any real person or celebrity.
FOUR full-body views in ONE wide image, side by side, same scale, same
height, feet on the same baseline, evenly spaced, in this order:
(1) front, (2) left side profile, (3) back, (4) right side profile.

LOOK: ${lookLine}

OUTFIT: ${outfitLine}

${hairAndHeadBlock}

POSE: upright A-pose, arms about 30 degrees away from the body, hands
open with fingers slightly apart and visible, not touching the torso.
Back view: plain back of the ${backGarmentWord} with the same seams and slits; do
NOT invent patterns, logos or text.

LIGHTING: soft even studio lighting, identical in all four views, gentle
natural shading, no hard cast shadows.
BACKGROUND: plain solid warm-ivory (#F2EDE4). Full body visible head to
toe in every view. No text, no watermark, no extra people.`;
}

/**
 * Generates the exact "V-Phuc Heritage Guard & Precision 3D Engine" structured audit JSON
 * matching <output_format_spec> & <historical_tailoring_rules>.
 */
export function buildVPhucPrecisionAudit(params: {
  genderEn: 'male' | 'female';
  topGarment: TopGarmentOption;
  bottomGarment: BottomGarmentOption;
  fabricMaterialId: FabricMaterialId;
  patternId: PatternId;
  culturalStatus: 'SAFE' | 'WARNING' | 'CRITICAL';
}): VPhucPrecisionAuditOutput {
  const { genderEn, topGarment, bottomGarment, fabricMaterialId, culturalStatus } = params;
  const genderLabel = genderEn === 'male' ? 'Nam' : 'Nữ';
  const fabricSpec =
    FABRIC_MATERIALS.find((f) => f.id === fabricMaterialId) || FABRIC_MATERIALS[0];
  const sil = topGarment.silhouetteType;

  const isCritical = culturalStatus === 'CRITICAL';
  const isWarning = culturalStatus === 'WARNING';

  const accuracyScore = isCritical ? 32 : isWarning ? 84 : 99;
  const standardSuffix = isCritical
    ? 'Vi phạm quy chuẩn Hạ Y truyền thống'
    : isWarning
    ? 'Biến tấu Giao Thoa Hiện Đại (Fusion)'
    : `Đúng quy chuẩn ${topGarment.dynasty}`;

  let collarStatus =
    'Cổ đứng (Lập lĩnh) ôm gọn quanh cổ, lộ viền cổ lót trắng và cài chuẩn 5 hạt khuy đồng Ngũ Thường (Nhân, Lễ, Nghĩa, Trí, Tín).';
  let panelCutStatus =
    'Cấu trúc 5 thân chuẩn mực (4 thân ngoài ghép qua đường Trung Phùng & Sống Lưng + 1 Tà Lót nội tâm bên dưới vạt phải); lai áo xòe cong hình cánh cung mềm mại.';
  let sleeveStatus =
    'Tay chẽn nối liền vai xuôi cổ truyền, thuôn gọn từ nách xuống cổ tay kèm nếp gấp tự nhiên tại khuỷu tay.';

  if (sil === 'ao-tac') {
    sleeveStatus =
      'Tay thụng lễ phục dài rộng buông rủ tự nhiên qua khuỷu tay theo trọng lực, lộ lớp tay áo lót lụa trắng tinh khôi bên trong.';
  } else if (sil === 'nhat-binh') {
    collarStatus =
      'Cổ bản to hình chữ nhật (Cổ Nhật Bình) thêu kim tuyến phẳng ôm sát ngực, cố định bằng dây khấu vàng và 2 dải thắt lưng/đai buông rủ.';
    panelCutStatus =
      'Phom Đối Khâm xẻ tà chính diện kèm dải nẹp vạt thêu kim tuyến phẳng mịn, tà áo lượn cong uy nghiêm phối cùng Thường lụa xếp ly.';
    sleeveStatus =
      'Tay áo đại lễ cực rộng thêu chuẩn 5 dải màu đồng tâm Ngũ Sắc (Xanh, Vàng, Đỏ, Trắng, Đen) tượng trưng cho Ngũ Hành ở cổ tay.';
  } else if (sil === 'giao-linh') {
    collarStatus =
      'Cổ giao lĩnh chữ Y phẳng ôm sát ngực theo quy tắc Hữu Nhẫm (vạt trái đắp chéo qua vạt phải), lộ bản cổ lót lụa trắng trang nhã.';
    panelCutStatus =
      'Thân áo liền mạch từ vai xuống lai áo hình cánh cung, thắt đai lưng lụa bản rộng kèm 2 dải đai rủ mềm phía trước.';
    sleeveStatus =
      'Tay thụng rộng thời Lê Trung Hưng buông rủ mềm mại, tạo nếp gấp vải tự nhiên theo cánh tay.';
  } else if (sil === 'vien-linh') {
    collarStatus =
      'Cổ tròn Viên Lĩnh ôm khít chân cổ cài khuy bên vai phải, đính Đoàn Hoa Bổ Tử thêu kim tuyến ôm cong theo lồng ngực.';
    sleeveStatus =
      'Tay thụng lễ phục rộng rãi nối liền vai xuôi, rủ nếp lụa/gấm tự nhiên.';
  } else if (sil === 'tu-than') {
    collarStatus =
      'Cổ áo mớ ba mớ bảy buông mở tự nhiên, tôn trọn Yếm đào lụa thêu hoa sen ôm sát ngực.';
    panelCutStatus =
      '4 tà áo lụa mềm rủ kết hợp thắt lưng lụa xanh hoa lý buộc nơ hai dải bay nhẹ trên nền Váy đụp xếp ly.';
  } else if (sil === 'ba-ba') {
    collarStatus =
      'Cổ tròn tim không bâu thanh thoát, đính hàng 6 cúc xà cừ dọc chính diện.';
    panelCutStatus =
      'Thân áo xẻ tà hai bên hông nhẹ nhàng, lai áo lượn cong vừa vặn chuẩn Nam Bộ.';
  }

  if (isCritical) {
    panelCutStatus = `CẢNH BÁO: Tà áo ${topGarment.baseName} bị phá vỡ tính tôn nghiêm do phối sai với ${bottomGarment.name}. Cần thay ngay bằng Quần lụa ống rộng chạm mu bàn chân.`;
  }

  return {
    historical_accuracy_score: accuracyScore,
    garment_identification: `${topGarment.baseName} (${genderLabel}) - ${standardSuffix}`,
    fabric_pbr_properties: {
      material_type: fabricSpec.name,
      roughness: fabricSpec.roughness,
      sheen: fabricSpec.sheen,
      normal_map_detail: fabricSpec.normalMapDetail,
    },
    tailoring_verification: {
      collar_status: collarStatus,
      panel_cut_status: panelCutStatus,
      sleeve_status: sleeveStatus,
    },
    '3d_asset_correction_instructions':
      'Chỉ nạp trực tiếp tệp mô hình /public/models/{costumeId}-{gender}.glb qua GLTFLoader + DRACOLoader + MeshoptDecoder (chuẩn hóa chiều cao 1.75m, chân tại y=0, tuyệt đối không dùng hình học nguyên thủy hay nhân vật Mixamo cũ). Chất liệu vải giữ nguyên texture gốc với anisotropy >= 8, roughness >= 0.65, metalness = 0, sheen ~ 0.5 (sheenRoughness 0.6), chỉ bật metalness cho các mesh có tên chứa "button", và đổi màu tức thì (<100ms) qua shader onBeforeCompile hue-key (±25°, saturation >= 0.3).',
  };
}
