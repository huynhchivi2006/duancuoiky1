# HỆ THỐNG QUẢN LÝ ĐẶT BÀN BI-DA (ROYAL BILLIARDS)
### Đồ Án Môn Học Lập Trình Mã Nguồn Mở - Full-stack Production-Ready Web Application

Hệ thống quản lý đặt bàn bi-da cao cấp, chuyên nghiệp, chạy thực tế với cơ sở dữ liệu thật, chống trùng lịch tuyệt đối bằng **PostgreSQL GiST Exclusion Constraint**, tính tiền tự động theo phút, phân quyền RBAC và xuất báo cáo tài chính.

---

## 1. CÔNG NGHỆ BẮT BUỘC SỬ DỤNG

| Thành phần | Công nghệ | Phiên bản / Chi tiết |
| :--- | :--- | :--- |
| **Backend** | NestJS, TypeScript, RESTful API | NestJS v10, modular domain-driven architecture |
| **ORM** | Prisma ORM | Prisma v5, tương thích PostgreSQL Neon Connection Pooler |
| **Database** | PostgreSQL | Neon Serverless PostgreSQL với `btree_gist` extension |
| **Frontend** | Next.js App Router, TypeScript | Next.js v14+, SSR & Client components, dark luxury theme |
| **UI Design** | Tailwind CSS & shadcn/ui | Dark palette sang trọng, ngọc bích (emerald), vàng kim (amber) |
| **State & API** | TanStack Query v5 | Cache invalidation, live refetching sau mutation |
| **Form & Valid** | React Hook Form & Zod | Form validation chặt chẽ với thông báo lỗi tiếng Việt |
| **Xác thực** | JWT & HttpOnly Cookie | Access token (15m), Refresh token (7d), băm Bcrypt salt 10 |
| **Tài liệu API** | Swagger / OpenAPI | Swagger UI tương tác tại `/api/docs` |
| **Testing** | Jest, ts-jest | 100% Passed (11/11 tests kiểm thử concurrency, auth, pricing) |
| **Triển khai** | Neon, Wispyte Cloud Node, Next.js | Cấu hình và hướng dẫn triển khai production hoàn chỉnh |

---

## 2. CẤU TRÚC THƯ MỤC MONOREPO

```text
billiards-management/
├── apps/
│   ├── api/                           # Backend NestJS RESTful API
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # PostgreSQL Schema (12 models)
│   │   │   ├── seed.ts                # Dữ liệu mẫu demo đầy đủ
│   │   │   └── migrations/
│   │   │       └── custom_constraints.sql # Exclusion Constraint GiST chống trùng lịch
│   │   ├── src/
│   │   │   ├── common/                # Guards, Filters, Interceptors, Roles, Decorators
│   │   │   ├── modules/
│   │   │   │   ├── auth/              # Đăng ký, đăng nhập, JWT HttpOnly Cookie
│   │   │   │   ├── users/             # Quản lý người dùng, phân quyền RBAC
│   │   │   │   ├── table-types/       # Quản lý loại bàn & đơn giá theo giờ
│   │   │   │   ├── tables/            # Danh sách bàn & tìm bàn trống theo slot
│   │   │   │   ├── bookings/          # Đặt bàn, chống trùng lịch [start, end), hủy bàn
│   │   │   │   ├── services/          # Menu đồ uống, thức ăn, phụ kiện
│   │   │   │   ├── invoices/          # Lập hóa đơn, tính tiền phút, chống thanh toán 2 lần
│   │   │   │   ├── dashboard/         # Thống kê tổng hợp, biểu đồ doanh thu 7 ngày
│   │   │   │   ├── reports/           # Báo cáo doanh thu & xuất CSV chuẩn UTF-8 BOM
│   │   │   │   └── health/            # Health check kiểm tra kết nối Neon DB
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── web/                           # Frontend Next.js App Router
│       ├── app/
│       │   ├── page.tsx               # Trang chủ giới thiệu CLB
│       │   ├── tables/                # Bàn & bảng giá trực quan
│       │   ├── book/                  # Đặt bàn trực tuyến, tìm slot khả dụng
│       │   ├── lookup/                # Tra cứu mã đặt bàn
│       │   ├── login/                 # Đăng nhập kèm 1-Click Demo
│       │   ├── register/              # Đăng ký thành viên mới
│       │   ├── customer/              # Cổng khách hàng (lịch đặt, hóa đơn, hồ sơ)
│       │   ├── staff/                 # Cổng thu ngân (sơ đồ bàn, lịch ca, POS thu tiền)
│       │   └── admin/                 # Cổng quản trị (dashboard, bàn, menu, báo cáo CSV)
│       ├── components/                # UI components & Layouts (Navbar, Sidebar, Footer)
│       ├── lib/                       # API client, Auth Context, Query Provider, Utils
│       └── package.json
│
├── docs/                              # Toàn bộ tài liệu đồ án & bảo vệ
│   ├── requirements.md                # Đặc tả yêu cầu phần mềm (SRS)
│   ├── architecture.md                # Kiến trúc hệ thống & sơ đồ Mermaid
│   ├── erd.md                         # Thiết kế database & ERD Mermaid
│   ├── api-documentation.md           # Đặc tả RESTful API v1
│   ├── test-report.md                 # Báo cáo kết quả kiểm thử thực tế (100% Passed)
│   ├── deployment.md                  # Hướng dẫn triển khai Neon, Wispyte, Vercel
│   ├── user-manual.md                 # Hướng dẫn sử dụng cho Khách, Nhân viên, Admin
│   ├── graduation-report.md           # Báo cáo đồ án môn học hoàn chỉnh
│   ├── slides.md                      # Dàn ý Slide PowerPoint 15 trang có lời thuyết trình
│   └── demo-script.md                 # Kịch bản demo 5-10 phút (tình huống đặt thành công & đặt trùng)
│
├── .env.example                       # Biến môi trường mẫu
├── .gitignore
├── package.json                       # Monorepo workspaces cấu hình
└── README.md                          # Tài liệu hướng dẫn này
```

---

## 3. TÀI KHOẢN THỬ NGHIỆM (DEMO ACCOUNTS)

Trên giao diện Đăng nhập có sẵn các nút bấm **1-Click Demo** để tự động điền thông tin:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Quản Trị Viên (Admin)** | `admin@billiards.local` | `Admin@123456` | Toàn quyền quản trị, xem Dashboard doanh thu, quản lý bàn, phân quyền, xuất CSV |
| **Nhân Viên (Staff)** | `staff1@billiards.local` | `Staff@123456` | Xem sơ đồ bàn, check-in khách đến, bật bàn bấm giờ, gọi đồ uống, thu tiền tại quầy |
| **Khách Hàng 1 (Customer)** | `khach1@gmail.com` | `Khach@123456` | Tra cứu bàn trống, đặt bàn trực tuyến, xem lịch sử đặt bàn và hóa đơn |
| **Khách Hàng 2 (Customer)** | `khach2@gmail.com` | `Khach@123456` | Tài khoản khách thứ 2 dùng để demo kịch bản đặt trùng bàn bị từ chối (409 Conflict) |

---

## 4. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN TRÊN MÁY LOCAL

### Bước 1: Yêu cầu môi trường
- **Node.js**: Phiên bản 18+ hoặc 20+ (đã kiểm tra tương thích tốt trên Node v24).
- **Cơ sở dữ liệu**: PostgreSQL (kết nối trực tiếp đến Neon hoặc PostgreSQL local).

### Bước 2: Cài đặt Dependencies
Từ thư mục gốc dự án:
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc (hoặc copy từ `.env.example`):
```bash
cp .env.example .env
```
Cập nhật chuỗi kết nối PostgreSQL Neon:
```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/billiards_db?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:password@ep-sample.ap-southeast-1.aws.neon.tech/billiards_db?sslmode=require"
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:8080
JWT_ACCESS_SECRET="billiards-super-secret-access-token-key-2026"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="billiards-super-secret-refresh-token-key-2026"
JWT_REFRESH_EXPIRES_IN="7d"
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
```

### Bước 4: Khởi tạo Database & Seed Dữ Liệu Demo
```bash
# Sinh Prisma Client
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Đẩy schema lên database Neon
npx prisma db push --schema=apps/api/prisma/schema.prisma

# Nạp dữ liệu demo ban đầu (Bàn, Loại bàn, Dịch vụ, Tài khoản mẫu, Hóa đơn mẫu)
npm run prisma:seed --workspace=apps/api
```

### Bước 5: Chạy Ứng Dụng ở Chế Độ Development

Khởi động Backend (cổng 4000):
```bash
npm run dev:api
```
- RESTful API URL: `http://localhost:4000/api/v1`
- Swagger API Docs: `http://localhost:4000/api/docs`

Khởi động Frontend (cổng 8080):
```bash
npm run dev:web
```
- Web Application: `http://localhost:8080`

---

## 5. KIỂM THỬ TỰ ĐỘNG (TESTING)

Chạy toàn bộ bộ test kiểm thử:
```bash
npm run test:api
```
Kết quả thực tế đã ghi nhận:
```text
PASS src/modules/bookings/bookings.service.spec.ts
PASS src/modules/invoices/invoices.service.spec.ts
PASS src/modules/auth/auth.service.spec.ts

Test Suites: 3 passed, 3 total
Tests:       11 passed, 11 total
Time:        3.739 s
```

---

## 6. BUILD PRODUCTION

Kiểm tra build production cho cả Backend và Frontend:
```bash
# Build Backend NestJS
npm run build:api

# Build Frontend Next.js (tất cả 21 static & dynamic routes)
npm run build:web
```

---

## 7. CHECKLIST NGHIỆM THU ĐỒ ÁN (ACCEPTANCE CRITERIA)

- [x] **Database & ORM**: PostgreSQL Neon, Prisma ORM, 12 bảng thực thể chuẩn hóa, kiểu tiền tệ `DECIMAL(12,2)`.
- [x] **Chống trùng lịch cốt lõi**: Cơ chế PostgreSQL GiST Exclusion Constraint trên khoảng `[start_time, end_time)` kết hợp Pessimistic Lock transaction, loại trừ race condition, trả HTTP 409 khi xung đột.
- [x] **Xác thực & Phân quyền**: Đăng ký, đăng nhập, JWT HttpOnly Cookie, bảo vệ mật khẩu Bcrypt, NestJS RBAC Guards (`ADMIN`, `STAFF`, `CUSTOMER`).
- [x] **Đặt bàn trực tuyến**: Tìm bàn trống theo slot thời gian thực, xem trước chi phí dự kiến, cấp mã đặt bàn, chính sách hủy 60 phút.
- [x] **Vận hành thu ngân (POS)**: Sơ đồ bàn màu sắc theo trạng thái, check-in, bật bàn tính giờ, gọi món nước phát sinh, kết thúc tính tiền theo phút và làm tròn block 5 phút, chống thanh toán 2 lần.
- [x] **Dashboard & Báo cáo**: Tính toán trực tiếp từ database bằng câu lệnh SQL aggregate, biểu đồ doanh thu 7 ngày, xuất báo cáo CSV chuẩn tiếng Việt UTF-8 with BOM.
- [x] **Testing**: 11/11 tests chạy thực tế PASSED.
- [x] **Tài liệu hoàn chỉnh**: SRS, Architecture, ERD, API Specs, Test Report, Deployment Guide, User Manual, Báo cáo đồ án, Slide 15 trang, Kịch bản demo 5-10 phút.

# duancuoiky1

