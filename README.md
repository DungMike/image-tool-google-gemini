# AI Content Generator - Images & Voices

Một ứng dụng web chạy local để tạo hàng loạt ảnh và voice từ danh sách prompts/texts sử dụng Google AI APIs. Ứng dụng hỗ trợ xử lý song song, xoay vòng API keys để tránh rate limit, và các tính năng nâng cao như regenerate content và export ZIP.

## 🎯 Hai chế độ chính:
- **Image Generation**: Tạo ảnh từ prompts bằng Google Imagen API
- **Voice Generation**: Tạo voice từ texts bằng Google Gemini TTS API

## ✨ Tính năng chính

### 🎯 Input linh hoạt
- **Textarea**: Nhập trực tiếp prompts (mỗi dòng một prompt)
- **File Upload**: Hỗ trợ CSV, JSON, TXT với drag & drop
- **Template files**: Download mẫu file để sử dụng
- **Example prompts**: Load sẵn các prompt mẫu chất lượng cao

### 🚀 Generation mạnh mẽ
#### Image Generation
- **Imagen Models**: Hỗ trợ 4 models Imagen (3.0, 4.0 Standard, Ultra, Fast)
- **Model Selection**: Lựa chọn model phù hợp với nhu cầu (tốc độ vs chất lượng)

#### Voice Generation  
- **TTS Models**: Gemini 2.5 Flash TTS (100/day) và Pro TTS (50/day)
- **30+ Voices**: Đa dạng giọng đọc với đặc tính khác nhau (bright, warm, smooth, etc.)
- **Custom Prompts**: Thêm cảm xúc và phong cách đọc ("cheerfully", "slowly", etc.)

#### Chung
- **Batch processing**: Tạo nhiều content cùng lúc với xử lý song song
- **API key rotation**: Tự động xoay vòng nhiều API keys để tránh rate limit
- **Rate limit handling**: Thông minh xử lý giới hạn per minute và per day
- **Retry logic**: Tự động retry với exponential backoff
- **Progress tracking**: Theo dõi tiến độ chi tiết real-time

### 🖼️ Content Management
#### Image Gallery
- **Responsive gallery**: Hiển thị ảnh dạng grid responsive
- **Image preview**: Xem ảnh full size trong tab mới
- **Individual download**: Tải từng ảnh riêng lẻ
- **Regenerate**: Modal để chỉnh sửa prompt và model, tạo lại ảnh

#### Voice Gallery
- **Audio player**: Play/pause voice trực tiếp trong gallery
- **Voice info**: Hiển thị voice name, custom prompt
- **Individual download**: Tải từng file audio riêng lẻ
- **Regenerate**: Modal để chỉnh sửa text, voice, model và custom prompt

#### Chung
- **Filter & stats**: Lọc content theo trạng thái, xem thống kê
- **Batch operations**: Xử lý nhiều items cùng lúc

### 📦 Export & Download
- **ZIP export**: Tải tất cả images/voices thành công dưới dạng ZIP
- **Metadata included**: File manifest.json và README.txt trong ZIP  
- **Progress tracking**: Theo dõi tiến độ export
- **Size estimation**: Ước tính kích thước file trước khi export
- **Individual exports**: Tải từng item với metadata riêng biệt

### 🔧 Monitoring & Control
- **API key status**: Dashboard theo dõi usage của từng key
- **Real-time stats**: Thống kê daily usage, available keys
- **Reset functionality**: Reset usage counters khi cần
- **Rate limit warnings**: Cảnh báo khi gần đạt giới hạn

## 🛠️ Cài đặt

### Yêu cầu hệ thống
- Node.js 18+ 
- npm hoặc yarn
- Google AI Studio API keys (có quyền truy cập Imagen API)

### Bước 1: Clone và cài đặt
```bash
# Clone repository (hoặc tạo từ code đã cung cấp)
cd batch-image-generator

# Cài đặt dependencies
npm install
```

### Bước 2: Cấu hình API Keys
```bash
# Copy file env example
cp env.example .env

# Chỉnh sửa .env và thêm API keys
nano .env
```

Thêm API keys vào file `.env`:
```env
# Google AI Studio API Keys - Thêm nhiều keys để tránh rate limit
VITE_GEMINI_API_KEY_1=your_google_ai_studio_api_key_1_here
VITE_GEMINI_API_KEY_2=your_google_ai_studio_api_key_2_here
VITE_GEMINI_API_KEY_3=your_google_ai_studio_api_key_3_here
VITE_GEMINI_API_KEY_4=your_google_ai_studio_api_key_4_here

# Cấu hình rate limit (tùy chọn)
VITE_RATE_LIMIT_PER_MINUTE=10
VITE_RATE_LIMIT_PER_DAY=70
VITE_CONCURRENT_REQUESTS=5
```

### Bước 3: Chạy ứng dụng
```bash
# Development mode
npm run dev

# Build cho production
npm run build

# Preview production build
npm run preview
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## 🎯 Hướng dẫn sử dụng

### 1. Chuẩn bị prompts

#### Cách 1: Nhập trực tiếp
- Mở ứng dụng và nhập prompts vào textarea
- Mỗi dòng một prompt
- Ví dụ:
  ```
  A serene mountain landscape at sunset
  A futuristic city with flying cars
  A cozy coffee shop with warm lighting
  ```

#### Cách 2: Upload file
- **CSV**: Cột đầu tiên chứa prompts
- **JSON**: Array of strings hoặc object với property `prompts`
- **TXT**: Mỗi dòng một prompt

Ví dụ file JSON:
```json
[
  "A serene mountain landscape at sunset",
  "A futuristic city with flying cars", 
  "A cozy coffee shop with warm lighting"
]
```

### 2. Cấu hình generation
- **Model Selection**: Chọn Imagen model phù hợp:
  - **Imagen 3.0**: Cân bằng tốc độ và chất lượng (mặc định)
  - **Imagen 4.0 Standard**: Chất lượng cao hơn
  - **Imagen 4.0 Ultra**: Chất lượng tốt nhất, chậm hơn
  - **Imagen 4.0 Fast**: Nhanh nhất, chất lượng tốt
- **Images per prompt**: Chọn số lượng ảnh tạo cho mỗi prompt (1-4)
- **Concurrent requests**: Được tự động tối ưu (5 requests đồng thời)

### 3. Tạo ảnh
- Click "Generate Images" để bắt đầu
- Theo dõi progress bar và thống kê real-time
- Ảnh sẽ xuất hiện trong gallery khi hoàn thành

### 4. Quản lý kết quả
- **View**: Click vào ảnh để xem full size
- **Download**: Tải từng ảnh riêng lẻ
- **Regenerate**: Click nút regenerate để tạo lại với prompt mới
- **Export All**: Tải tất cả ảnh thành công dưới dạng ZIP

## 🔧 Cấu trúc dự án

```
src/
├── components/           # React components
│   ├── PromptInput.tsx      # Form nhập prompts với model selection
│   ├── ImageGallery.tsx     # Gallery hiển thị ảnh
│   ├── RegenerateModal.tsx  # Modal regenerate ảnh với model selection
│   ├── ModelSelector.tsx    # Component chọn Imagen model
│   ├── ApiKeyStatus.tsx     # Dashboard API keys
│   └── BatchProgress.tsx    # Progress tracker
├── pages/               # Pages
│   └── Home.tsx            # Trang chính
├── utils/               # Utilities
│   ├── apiKeyRotation.ts   # Logic xoay vòng API keys
│   ├── promptParser.ts     # Parse prompts từ nhiều nguồn
│   ├── imageGeneration.ts  # Logic tạo ảnh với Gemini
│   └── zipExport.ts        # Export ZIP functionality
├── types/               # TypeScript types
│   └── index.ts
├── styles/              # CSS styles
│   └── global.css          # Tailwind + custom styles
└── test/                # Test setup
    └── setup.ts
```

## ⚙️ API Key Management

### Lấy Google AI Studio API Keys
1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Tạo API key mới (cần có quyền truy cập Imagen API)
3. Copy và thêm vào file `.env`

### Khuyến nghị
- **Sử dụng nhiều keys**: 3-4 keys để tránh rate limit
- **Monitor usage**: Theo dõi dashboard trong ứng dụng
- **Reset counters**: Reset khi cần thiết

### Rate Limits
- **Per minute**: 10 requests per key
- **Per day**: 70 requests per key
- **Automatic rotation**: Ứng dụng tự động chuyển key khi cần

## 🎨 Prompt Engineering Tips

### Cấu trúc prompt tốt
```
[Subject] + [Style] + [Composition] + [Lighting] + [Quality]
```

### Ví dụ prompts chất lượng cao
- "A red cat in a futuristic city, cyberpunk style, wide angle view, neon lighting, high quality, detailed"
- "Mountain landscape at sunset, watercolor painting style, panoramic view, golden hour lighting, 8K resolution"
- "Coffee shop interior, cozy atmosphere, close-up view, warm lighting, photorealistic, highly detailed"

### Các từ khóa hữu ích
- **Style**: photorealistic, watercolor, oil painting, digital art, cyberpunk, minimalist
- **Composition**: close-up, wide angle, aerial view, portrait, landscape
- **Lighting**: golden hour, soft lighting, dramatic lighting, neon lights
- **Quality**: high quality, detailed, 8K resolution, professional

## 🚨 Xử lý sự cố

### Lỗi thường gặp

#### "No available API keys"
- **Nguyên nhân**: Tất cả keys đã đạt daily limit
- **Giải pháp**: Đợi đến ngày mới hoặc thêm keys mới

#### "Generation failed"
- **Nguyên nhân**: API key không hợp lệ hoặc prompt vi phạm policy
- **Giải pháp**: Kiểm tra API key và chỉnh sửa prompt

#### "Rate limit exceeded"
- **Nguyên nhân**: Vượt quá 10 requests/phút
- **Giải pháp**: Ứng dụng tự động retry, không cần can thiệp

### Debug mode
```bash
# Chạy với debug logs
npm run dev -- --debug
```

### Reset dữ liệu
```bash
# Xóa localStorage (rate limit counters)
# Vào Developer Tools > Application > Local Storage > Clear
```

## 📊 Performance Tips

### Tối ưu tốc độ
- **Batch size**: Giới hạn 20-30 prompts per batch
- **Concurrent requests**: Mặc định 5, có thể tăng lên 8-10
- **Multiple keys**: Sử dụng 4+ keys để tối đa throughput

### Tiết kiệm API quota
- **Images per prompt**: Sử dụng 1 thay vì 4
- **Quality prompts**: Prompt tốt = ít cần regenerate
- **Monitor usage**: Theo dõi daily usage

## 🧪 Testing

```bash
# Chạy unit tests
npm run test

# Test coverage
npm run test -- --coverage

# Test specific file
npm run test src/utils/promptParser.test.ts
```

## 🤝 Đóng góp

### Development setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linter
npm run lint

# Run tests
npm run test
```

### Code style
- TypeScript strict mode
- ESLint + Prettier
- Functional components với hooks
- Tailwind CSS cho styling

## 📝 License

MIT License - Tự do sử dụng cho mục đích cá nhân và thương mại.

## 🔗 Links

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

**Lưu ý**: Đây là ứng dụng local, không triển khai public. API keys được lưu trữ client-side nên chỉ sử dụng cho mục đích cá nhân.
