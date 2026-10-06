# 🇻🇳 VAI-Stylist — Cố Vấn Cổ Phục Việt & Định Hình Phong Cách
> **Hệ thống trí tuệ nhân tạo thẩm định thẩm mỹ, kiểm duyệt quy chuẩn văn hóa Việt Phục (Áo Ngũ Thân, Nhật Bình, Áo Tấc, Tứ Thân...) và bộ công cụ thử đồ ảo 3D/360° kết hợp chuyển giao trang phục chân thực.**

---

## 📑 Mục Lục
1. [Giới Thiệu Tổng Quan](#-giới-thiệu-tổng-quan)
2. [Sơ Đồ Kiến Trúc Hệ Thống (High-Level Architecture)](#-sơ-đồ-kiến-trúc-hệ-thống-high-level-architecture)
3. [Chi Tiết Các Pipeline Cốt Lõi](#-chi-tiết-các-pipeline-cốt-lõi)
   - [3.1. Pipeline Thẩm Định Văn Hóa & Phong Cách (Cultural Guardrail Engine)](#31-pipeline-thẩm-định-văn-hóa--phong-cách-cultural-guardrail-engine)
   - [3.2. Pipeline Hiển Thị 3D & Xoay 360° (Hybrid Canvas: GLB + 360° Turntable)](#32-pipeline-hiển-thị-3d--xoay-360-hybrid-canvas-glb--360-turntable)
   - [3.3. Pipeline Thay Quần / Hạ Y Chân Thực (Realistic Trouser & Bottom Transfer Engine)](#33-pipeline-thay-quần--hạ-y-chân-thực-realistic-trouser--bottom-transfer-engine)
   - [3.4. Pipeline Sinh Ảnh 360° AI & Thử Đồ Ảo (Virtual Try-On & Multimodal Vision)](#34-pipeline-sinh-ảnh-360-ai--thử-đồ-ảo-virtual-try-on--multimodal-vision)
4. [Bảng Đặc Tả API Server (`server.ts`)](#-bảng-đặc-tả-api-server-serverts)
5. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
6. [Hướng Dẫn Cài Đặt & Khởi Chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
7. [Quy Chuẩn Văn Hóa & Guardrails](#-quy-chuẩn-văn-hóa--guardrails)

---

## 🌟 Giới Thiệu Tổng Quan

**VAI-Stylist** là nền tảng số hóa di sản trang phục truyền thống Việt Nam kết hợp thời trang đương đại thế hệ mới (Gen Z Fashion Fusion). Ứng dụng cung cấp:
- **Tương tác trực quan 3D/360°**: Quan sát mọi góc nhìn (Trước 0°, Trái 90°, Sau 180°, Phải 270°) của các trang phục cổ truyền (Áo Ngũ Thân tay chẽn, Áo Tấc, Áo Nhật Bình, Áo Tứ Thân, Áo Dài Tân Thời, Áo Bà Ba, Giao Lĩnh, Viên Lĩnh).
- **Hệ thống Thay Quần / Hạ Y đời thật**: Chuyển đổi linh hoạt giữa Quần Lụa truyền thống, Quần Lĩnh, Quần Tây Kaki, Quần Jeans, Thường Lụa Xếp Ly, Quần Short... với thuật toán phân tách tà áo, bảo tồn bóng đổ nếp gấp vải HDR và vân dệt thực tế.
- **Giám định văn hóa bằng AI (Cultural Guardrails)**: Đánh giá độ phù hợp (SAFE, WARNING, CRITICAL) theo ngữ cảnh thời tiết, địa điểm (đền chùa, dạo phố, chụp kỷ yếu, lễ cưới) và hướng dẫn sửa đổi an toàn.

---

## 🏗 Sơ Đồ Kiến Trúc Hệ Thống (High-Level Architecture)

```
+-----------------------------------------------------------------------------------+
|                                  NGƯỜI DÙNG                                       |
|               (Web Browser: Desktop / Mobile / Tablet - Responsive)               |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                           FRONTEND (React 19 + Vite + Tailwind)                   |
|                                                                                   |
|  [Outfit Store (State)] ───► [App.tsx (Main UI)] ───► [VietPhucCanvas (Viewer)]  |
|         │                                                       │                 |
|         ├─ Chọn Áo, Màu, Họa Tiết                               ├─ 3D GLB Mode    |
|         ├─ Chọn Hạ Y (Quần/Thường/Short)                        ├─ 360° Turntable |
|         ├─ Chọn Phụ Kiện (Khăn đóng, Nón lá, Kiềng...)          └─ Cloth Physics  |
|         └─ Bối cảnh (Thời tiết, Sự kiện, Yêu cầu tùy biến)                        |
+-----------------------------------------------------------------------------------+
                                         │
                   REST API Calls (JSON & Multipart/Buffers)
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        BACKEND PROXY SERVER (Node.js + Express)                   |
|                                                                                   |
|  ├─ /api/evaluate-outfit        : Giám định văn hóa & phong cách                 |
|  ├─ /api/generate-3d-illustration: Sinh ảnh xoay 4 góc bằng AI                     |
|  ├─ /api/generate-realistic-garment: Sinh ảnh lookbook thực tế                    |
|  ├─ /api/detect-person-anchors  : Trích xuất mốc cơ thể (Vision Pose)             |
|  ├─ /api/virtual-try-on         : Thử đồ ảo giữ nguyên khuôn mặt                  |
|  └─ /public/models & /turntable : Phục vụ mô hình 3D (.glb) và khung ảnh tĩnh    |
+-----------------------------------------------------------------------------------+
                                         │
                    Gemini AI + Local Deterministic Fallbacks
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                               AI & LOCAL ENGINES                                  |
|                                                                                   |
|  [Google Gemini API / AI Studio]                  [Deterministic Rules]            |
|  - Gemini text and vision models                  - Cultural checks               |
|  - Gemini 3.1 Flash Image                         - Weather guidance               |
|  - Optional image generation                      - Built-in 3D and turntables     |
+-----------------------------------------------------------------------------------+
```

---

## ⚡ Chi Tiết Các Pipeline Cốt Lõi

### 3.1. Pipeline Thẩm Định Văn Hóa & Phong Cách (Cultural Guardrail Engine)

Mỗi khi người dùng thay đổi bất kỳ thành phần nào trên trang phục (áo, quần, màu sắc, hoa văn, phụ kiện) hoặc thay đổi địa điểm / sự kiện:

```
[User Input Event]
        │
        ▼
[Frontend: handleRequestAiEvaluation()]
        │  Gửi JSON: { selected_items, selected_pattern, weather_data, event_type, user_custom_request }
        ▼
[Backend: POST /api/evaluate-outfit]
        │
        ├─► [Kiểm tra GEMINI_API_KEY]
        │         │
        │         ├─ Có Key ──► [GoogleGenAI SDK: gemini-3-flash-preview]
        │         │                    │ (Structured JSON Output + System Instructions)
        │         │                    ▼
        │         │             [Trả về kết quả chuẩn hóa]
        │         │
        │         └─ Không có Key / Lỗi Quota 429 / Offline
        │                              │
        │                              ▼
        │             [deterministicCulturalEvaluation() Fallback]
        │             (Bộ quy tắc tra cứu lịch sử & bảo vệ văn hóa nội bộ)
        │                              │
        ▼                              ▼
[Frontend UI Render]
  ├─ Lookbook Title (Tên phong cách đầy chất thơ, vd: "Sơn Thủy Hữu Tình")
  ├─ Style Score (0 - 100 điểm)
  ├─ Cultural Status Badge:
  │    🟢 SAFE      : Đạt chuẩn lễ nghi truyền thống
  │    🟡 WARNING   : Phối phong cách Gen Z đương đại (nhắc nhở khi vào nơi tôn nghiêm)
  │    🔴 CRITICAL  : Sai lệch quy chuẩn (cảnh báo vi phạm & gợi ý sửa ngay)
  ├─ Weather Advice  : Lời khuyên dựa theo nhiệt độ & chất liệu vải
  └─ Cultural Fact   : Vi kiến thức lịch sử về kiểu áo đang mặc
```

---

### 3.2. Pipeline Hiển Thị 3D & Xoay 360° (Hybrid Canvas: GLB + 360° Turntable)

Hệ thống hỗ trợ 2 chế độ hiển thị đồng bộ:

```
                          [Khởi Động VietPhucCanvas]
                                      │
                                      ▼
                      Kiểm tra tệp mô hình `/models/{id}.glb`
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
           [Tìm thấy GLB]                        [Không có GLB]
                   │                                     │
                   ▼                                     ▼
        Chế độ 3D WebGL (Three.js)            Chế độ 360° Turntable (4 góc)
  - Khởi tạo Scene, Perspective Camera       - Nạp frame_00..03.png từ thư mục
  - Focus Target: Xương Đầu (Head)            hoặc ảnh built-in của trang phục
    hoặc Xương Ngực (Chest)                  - Góc 0°: Chính diện (Front)
  - OrbitControls với giới hạn góc           - Góc 90°: Nghiêng trái (Left)
  - Custom Shader Material đổi màu           - Góc 180°: Phía sau lưng (Back)
    tà áo & quần động theo HSL                - Góc 270°: Nghiêng phải (Right)
  - Bone Masking: che xương dưới             - Điều khiển bằng chuột / Touch /
    khi mặc áo choàng dài                      phím mũi tên / thanh trượt góc
  - Tùy chọn hiệu ứng Physics Cloth
```

---

### 3.3. Pipeline Thay Quần / Hạ Y Chân Thực (Realistic Trouser & Bottom Transfer Engine)

Đây là thuật toán xử lý hình ảnh 2D/360° chuyên sâu tại `src/utils/vstylistStorageAndZip.ts` giúp người dùng thay đổi quần/hạ y mà vẫn đảm bảo tính chân thực tuyệt đối như đời thật:

```
[Người dùng chọn loại Quần / Hạ Y mới]
  (Quần Lụa Trắng, Quần Lĩnh Đen, Quần Jeans, Quần Kaki, Thường Lụa, Short Jeans, Chân Váy Ngắn...)
                         │
                         ▼
        [1. Base Anatomy & Color Scanning]
  - Quét kênh Alpha & độ bão hòa màu để tách biệt:
    + Thân áo trên (Tunic)
    + Tay áo & Bàn tay (Hands)
    + Hạ y gốc (Original Trousers / Skirt)
                         │
                         ▼
        [2. Top-Down Continuity & Side-Slit Scan]
  - Dò đường viền gấu áo (Tunic Hemline) từ trên xuống dưới
  - Tách hai bên khe xẻ tà (Side-Slit) của Áo Dài, Áo Ngũ Thân, Áo Tấc, Áo Bà Ba:
    => Quần bên trong lộ rõ tự nhiên qua khe xẻ tà 2 bên hông và bên dưới gấu áo
    => Không đè lên hoặc che mất tà áo trước/sau
                         │
                         ▼
        [3. Silhouette & Phom Dáng Re-shaping]
  - Nếu chuyển từ Váy xoè (Nhật Bình / Tứ Thân) -> Quần 2 ống:
    + Thu hẹp biên độ xoè ngoài (Skirt Taper)
    + Khoét rãnh giữa tạo 2 ống chân tách biệt (Double-leg Arch Cuff)
  - Nếu chuyển từ Quần 2 ống -> Thường Lụa Xếp Ly:
    + Nối liền khoảng trống giữa 2 chân thành phom chân váy liền mạch
    + Áp hiệu ứng nếp gấp quạt xếp ly dọc
  - Nếu chuyển sang Quần Short / Váy Ngắn:
    + Khớp nối phần ống quần ngắn và vùng da cẳng chân thật từ bộ ảnh donor
                         │
                         ▼
        [4. PBR Shading & Micro-Texture Ingestion]
  - Tính toán độ sáng tương đối (Luminance Ratio) bảo tồn nếp nhăn gốc
  - Mở rộng tương phản nếp gấp (HDR Fold Contrast Expansion):
    + Vùng bóng tối: `pow(ratio, 1.85)` làm sâu đường gấp vải
    + Vùng đón sáng: `1.0 + (ratio - 1.0) * 1.35` tạo ánh sáng nổi bật
  - Áp khối trụ 3D trên từng ống chân (Cylindrical Lighting)
  - Bổ sung vân sợi vi mô theo chất liệu:
    + Quần Jeans: Vân chéo 45° Twill + đường chỉ may vàng + vệt wash gối
    + Quần Kaki: Vân dệt đan thô nhẹ
    + Quần Lụa: Bề mặt láng mịn phản chiếu ánh kim dịu nhẹ
                         │
                         ▼
        [5. Render ra Canvas 360° & Cache Kết Quả]
  - Lưu vào bộ đệm (Garment Cache) theo Hash Key để xoay mượt mà 60fps
                         │
                         ▼
        [6. Procedural Styling Gesture & Visual Transition (~880ms)]
  - Mô hình 3D (GLB):
    + Nhân vật thực hiện động tác phối đồ nhẹ nhàng: hạ gối (-0.022m) kiểm tra gấu quần,
      nghiêng hông nhẹ (+/-0.042 rad) và nghiêng đầu nhẹ (-0.07 rad) ngắm phom hạ y mới.
    + Thân hình và tà áo đàn hồi theo trọng lực rồi trở về tư thế đứng tự nhiên.
  - Chế độ 360° Turntable:
    + Kích hoạt xung lực Cloth Physics (Verlet spring-damper) khiến vạt lụa và ống quần gợn sóng tự nhiên.
    + Hiệu ứng quầng sáng lụa óng (Silk Aura) và Huy hiệu Glassmorphic "Đang chỉnh trang [Tên Quần]..."
      kèm thanh tiến trình chỉ vàng động (Golden Thread).
```

---

### 3.4. Pipeline Sinh Ảnh 360° AI & Thử Đồ Ảo (Virtual Try-On & Multimodal Vision)

```
[Người dùng tải ảnh chân dung lên]
                 │
                 ▼
[Phát hiện mốc cơ thể: /api/detect-person-anchors]
  - Gemini Vision / MediaPipe phân tích:
    + Tọa độ cổ (neckX, neckY)
    + Độ cao cằm (chinY)
    + Độ rộng vai (shoulderWidth)
    + Chiều cao thân (torsoHeight)
    + Độ nghiêng đầu (headTiltDeg)
                 │
                 ▼
[Khớp nối & Thử đồ ảo: /api/virtual-try-on]
  - Đưa ảnh chân dung + thông số cổ phục vào Prompt đặc tả chuyên sâu:
    1. Identity Lock: Giữ nguyên 100% khuôn mặt, ánh mắt, nụ cười và tông da thật
    2. Garment Tailoring: Cắt may trang phục cổ chuẩn xác (hoa văn, cúc kim loại, chất liệu lụa)
    3. Fit Collar: Khớp cổ áo đứng (standing collar) vào đúng mốc cổ người dùng
                 │
                 ▼
[Trả về bức ảnh hoàn chỉnh chất lượng cao]
```

---

## 📡 Bảng Đặc Tả API Server (`server.ts`)

| Phương Thức | Endpoint | Mục Đích | Đầu Vào Chính | Đầu Ra |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/evaluate-outfit` | Giám định văn hóa, tính điểm thẩm mỹ, tư vấn thời tiết & bối cảnh | `selected_items`, `selected_pattern`, `weather_data`, `event_type`, `user_custom_request` | `lookbook_title`, `style_score`, `cultural_status` (SAFE/WARNING/CRITICAL), `cultural_warning_msg`, `cultural_history_fact` |
| **POST** | `/api/generate-3d-illustration` | Tạo ảnh turnaround bằng Gemini khi khả dụng | `prompt`, `outfitSpec`, `referenceImageBase64` | `imageUrl` (Data URL) hoặc `null` để dùng ảnh dựng sẵn |
| **POST** | `/api/generate-realistic-garment` | Tạo ảnh lookbook bằng Gemini khi khả dụng | `outfitSpec` (gender, garment, color, accessories) | `imageUrl` (Data URL) hoặc `null` |
| **POST** | `/api/detect-person-anchors` | Phân tích thị giác tìm mốc cổ, cằm, vai của người dùng | `userPhotoBase64`, `userPhotoMimeType` | `anchors`: `{ neckX, neckY, chinY, shoulderWidth, torsoHeight, headTiltDeg }` |
| **POST** | `/api/virtual-try-on` | Thử đồ ảo bằng Gemini khi khả dụng | `userPhotoBase64`, `outfitSpec`, `tryOnStyle` | `imageUrl` (Data URL) hoặc `null` để chuyển sang ướm thử |
| **POST** | `/api/gemini/generate-image` | Sinh ảnh bằng Gemini 3.1 Flash Image | `prompt`, `aspectRatio`, `referenceImageBase64` | `imageDataUrl`, `text`, `finishReason` |
| **POST** | `/api/models/upload` | Tải tệp mô hình `.glb` từ máy tính lưu vào server/IndexedDB | Binary ArrayBuffer (`limit: 50mb`), `?id={modelId}` | `{ ok: true, path }` |
| **GET** | `/turntable/:modelId/:file` | Lấy frame xoay 360° đã render | `modelId`, `file` (frame_00.png...) | Image file stream |
| **GET** | `/models/:file` | Phục vụ tệp mô hình 3D GLB | `file` ({modelId}.glb) | `model/gltf-binary` stream |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
├── .env.example                      # Mẫu cấu hình môi trường (GEMINI_API_KEY)
├── metadata.json                     # Cấu hình siêu dữ liệu applet AI Studio
├── package.json                      # Dependencies & NPM Scripts
├── server.ts                         # Full-stack Express Server + Vite Middleware + API Routes
├── vite.config.ts                    # Cấu hình build Vite + React + Tailwind
├── public/                           # Tài nguyên tĩnh
│   ├── models/                       # Thư mục chứa các tệp GLB và poster đại diện
│   └── turntable/                    # Thư mục lưu trữ khung hình ảnh xoay 360°
└── src/
    ├── main.tsx                      # Entry point React
    ├── App.tsx                       # Giao diện chính: Sidebar tùy biến, Drawer, Preset, Lịch sử
    ├── index.css                     # Stylesheet toàn cục (@import "tailwindcss")
    ├── state/
    │   └── outfitStore.ts            # Store trạng thái (Zustand-like React hook pattern)
    ├── data/
    │   └── vietPhucData.ts           # Dữ liệu tra cứu: Áo, Quần, Họa tiết, Phụ kiện, Bảng màu cổ
    ├── utils/
    │   └── vstylistStorageAndZip.ts  # Engine xử lý ảnh 360°, Thay quần, Phân tách tà áo, Xuất ZIP
    └── components/
        ├── VietPhucCanvas.tsx        # Canvas 3D WebGL (Three.js) & Stepper 360°
        ├── vietPhucGlbLoader.ts      # Bộ nạp GLB, Custom Shaders, Bone Masks & PBR Fabric
        ├── useGranularSceneAttachments.ts # Quản lý phụ kiện 3D gắn vào xương nhân vật
        └── TurnaroundAiStudioModal.tsx    # Modal tạo ảnh 360° bằng AI & tinh chỉnh góc quay
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18+ (khuyên dùng Node 20 LTS hoặc Node 22).
- **Trình quản lý gói**: `npm` hoặc `bun`.

### 2. Cài Đặt Thư Viện
```bash
npm install
```

### 3. Cấu Hình Biến Môi Trường
Tạo tệp `.env` tại thư mục gốc dự án (tham khảo `.env.example`):
```env
# Google Gemini API Key (Cần thiết cho tính năng AI Giám định & Thử đồ ảo)
GEMINI_API_KEY=your_gemini_api_key_here
```
> *Lưu ý: Nếu chưa cấu hình `GEMINI_API_KEY`, phần tư vấn văn hóa vẫn chạy bằng luật cục bộ; tính năng tạo ảnh AI sẽ báo trạng thái chưa khả dụng. Bộ ảnh turnaround tích hợp và chế độ ướm thử cục bộ vẫn dùng được.*

### 4. Chạy Ứng Dụng (Development)
```bash
npm run dev
```
Ứng dụng sẽ khởi động tại địa chỉ: `http://localhost:3000`.

### 5. Kiểm Tra Lỗi & Build Sản Phẩm
```bash
# Kiểm tra cú pháp TypeScript
npm run lint

# Build bản chạy sản phẩm
npm run build

# Chạy server sản phẩm
npm run start
```

---

## 📜 Quy Chuẩn Văn Hóa & Guardrails

| Trạng Thái | Điều Kiện Kích Hoạt | Ứng Xử Của Hệ Thống |
| :---: | :--- | :--- |
| **🟢 SAFE** | Áo Ngũ Thân / Nhật Bình / Áo Tấc phối cùng Quần Lụa Trắng / Đen, Thường Lụa, Khăn Đóng, Guốc Gỗ, Hài Thêu, Kiềng Bạc. | Chấm điểm cao (90 - 100), tôn vinh tính trang nghiêm và cung cấp vi kiến thức lịch sử. |
| **🟡 WARNING** | Phối phong cách Gen Z đương đại: Đi giày Sneaker, đeo Kính Mát, mặc Quần Jeans/Kaki chụp ảnh kỷ yếu, dạo phố. | Chấm điểm phong cách tốt (75 - 89), khen ngợi sự sáng tạo nhưng nhắc nhở tháo phụ kiện nếu vào chốn tâm linh (đền, chùa, lăng tẩm). |
| **🔴 CRITICAL** | Kết hợp lễ phục cung đình trang trọng (Áo Nhật Bình, Áo Tấc) với Quần Short siêu ngắn, Váy Micro-Miniskirt hoặc đi lễ đền với trang phục hở hang. | Bật cảnh báo vi phạm văn hóa, giảm điểm phong cách và hiển thị nút **"Sửa Về Quy Chuẩn An Toàn"** (tự động chuyển sang Quần Lụa hoặc Thường Lụa). |

---

*Phát triển bởi đội ngũ VAI-Stylist — Giữ gìn và tôn vinh hồn cốt Việt qua công nghệ số.*
