# Assumptions & Technical Decisions (AI Arena Vietnam 2026 - V-Stylist 3D)

This document records all architectural decisions, assumptions, and constraints established for the "V-Stylist 3D - Việt Phục Remix" application.

## 1. Cultural Integrity & Data Grounding (N1, N3)
- **Zero Hallucination Policy**: Historical and cultural statements are never synthesized by LLMs from scratch. All historical facts, garment lore, warnings, and source citations originate strictly from the verified local repository (`data/` directory).
- **Verification Badging**: A card or badge only displays "Đã đối chiếu nguồn" when `verified === true` AND `sources.length > 0`. Items without verified academic citations carry "Chưa đối chiếu nguồn" (muted) or have the badge hidden, and are cataloged in `docs/TODO_VERIFY.md`.
- **Deterministic Cultural Guard**: The Cultural Guard Engine operates 100% deterministically in TypeScript. Gemini is utilized solely to phrase advice with respectful Gen Z warmth without ever deciding or altering cultural status (SAFE, WARNING, CRITICAL).

## 2. Privacy & User Data Protection (N4, N5)
- **In-Memory Image Processing**: User photos uploaded for virtual try-on or scanning are kept strictly in transient memory (client-side blobs / base64) and are NEVER saved to local databases, IndexedDB, or server disks.
- **Explicit Purge**: A visible "Xóa ảnh" action allows immediate memory disposal.
- **Zero Commentary on Physical Appearance**: Prompts and rule engines are explicitly barred from commenting on the user's face, body shape, skin color, or attractiveness.

## 3. Rendering Pipeline & Asset Integrity (N6)
- **Local / Generated Assets Only**: The application never downloads 3D models or images from arbitrary external URLs. Assets are either:
  1. Built-in bundled assets (`/public/models/`, `/public/turntable/`, `assets/images/`),
  2. Procedural canvas/WebGL textures created on device,
  3. User-supplied GLB files loaded from local disk.
- **Offline / Free-Tier Resilience**: If Gemini image generation is unavailable (e.g. Free Tier limit: 0, HTTP 429), the application gracefully falls back to local high-resolution canvas Hue-Key recoloring and the "Ướm thử" interactive overlay without throwing errors or breaking the UI.

## 4. Color Science
- **OKLCH Harmony**: Color harmony is calculated using OKLCH color space for perceptually uniform lightness, chroma, and hue angles. Contrast between garment and trousers is checked against a 1.3 luminance ratio threshold.
