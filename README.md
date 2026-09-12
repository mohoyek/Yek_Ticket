# 🎫 فریباف - سیستم تیکتینگ و پشتیبانی

سیستم مدیریت تیکت‌های پشتیبانی و کارهای داخلی با قابلیت ثبت‌نام مشتری از وب‌سایت یا ربات تلگرام.

## 📋 ویژگی‌ها

- **تیکتینگ**: ایجاد، مدیریت و پیگیری تیکت‌های پشتیبانی
- **نقش‌ها و دسترسی‌ها**: ادمین می‌تواند نقش‌های سفارشی بسازد و دسترسی هر نقش را تعیین کند
- **نقش‌های پیش‌فرض**: ادمین، مدیر، پشتیبان، مشتری
- **ثبت‌نام مشتری**: دو نوع مشتری «فروشگاهی» و «شرکتی» (شرکتی در تیکت، نام کارمند الزامی است)
- **شماره تماس**: ثبت شماره تماس هنگام ایجاد تیکت
- **دسته‌بندی**: ۱۱ دسته‌بندی پیش‌فرض (خطا و ارور، نصب نرم‌افزار، طراحی گزارش و...)
- **کامنت‌گذاری**: امکان ارسال پاسخ و بحث روی تیکت‌ها
- **آپلود فایل**: پیوست فایل به تیکت‌ها و کامنت‌ها
- **اعلان‌ها**: سیستم اعلان با polling خودکار هر ۳۰ ثانیه
- **اعلان فوری مرورگر (Web Push)**: دریافت اعلان حتی با بسته بودن تب/مرورگر — با VAPID و رمزنگاری RFC 8291 (بدون وابستگی خارجی، مخصوص Workers)
- **تلگرام**: ثبت تیکت از طریق ربات تلگرام
- **پایگاه دانش**: مقالات راهنما با جستجو، دسته‌بندی، برچسب و پیش‌نویس — مطالعه برای همه کاربران و مدیریت توسط تیم پشتیبانی
- **مدیریت کاربران**: جستجو روی نام/نام کاربری و فیلتر بر اساس نقش
- **واگذاری وظیفه**: مدیر می‌تواند یک کار را به لیست «کارهای روزانه» کارمند یا پشتیبان اضافه کند (با اعلان برای مقصد)
- **حالت شب**: تم تاریک/روشن با ذخیره تنظیمات
- **RTL**: رابط کاربری فارسی و راست‌چین
- **واکنش‌گرا**: طراحی مناسب برای موبایل و دسکتاپ

## 🛠️ تکنولوژی‌ها

### بک‌اند
- **Cloudflare Workers**: سرور edge
- **Hono**: فریمورک وب سبک و سریع
- **D1**: دیتابیس SQLite مدیریت‌شده
- **R2**: ذخیره‌سازی فایل‌ها
- **JWT**: احراز هویت
- **Zod**: اعتبارسنجی ورودی‌ها

### فرانت‌اند
- **Vue 3**: فریمورک با Composition API
- **Vite**: ابزار build سریع
- **TailwindCSS**: استایل‌دهی با پشتیبانی RTL
- **Pinia**: مدیریت state
- **Vue Router**: مسیریابی
- **Axios**: HTTP client

## 📁 ساختار پروژه

```
freebuff-tickets/
├── backend/                    # بک‌اند Cloudflare Worker
│   ├── src/
│   │   ├── index.ts           # نقطه ورود اصلی
│   │   ├── env.ts             # تایپ‌های environment
│   │   ├── db/
│   │   │   ├── schema.sql     # ساختار دیتابیس
│   │   │   └── seed.sql       # داده‌های اولیه
│   │   ├── middleware/
│   │   │   ├── auth.ts        # احراز هویت JWT
│   │   │   ├── role.ts        # کنترل دسترسی نقش‌ها
│   │   │   └── error-handler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts        # مسیرهای احراز هویت
│   │   │   ├── users.ts       # مدیریت کاربران
│   │   │   ├── categories.ts  # مدیریت دسته‌بندی‌ها
│   │   │   ├── tickets.ts     # مدیریت تیکت‌ها
│   │   │   ├── roles.ts       # مدیریت نقش‌ها و دسترسی‌ها
│   │   │   ├── knowledge.ts   # پایگاه دانش (مقالات راهنما)
│   │   │   ├── notifications.ts
│   │   │   └── telegram.ts    # وب‌هوک تلگرام
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── role.service.ts
│   │   │   ├── ticket.service.ts
│   │   │   ├── knowledge.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── upload.service.ts
│   │   │   └── telegram.service.ts
│   │   ├── schemas/
│   │   │   └── index.ts       # اعتبارسنجی Zod
│   │   └── utils/
│   │       ├── password.ts    # هش رمز عبور
│   │       ├── jwt.ts         # کمک‌کننده JWT
│   │       └── response.ts    # پاسخ‌های استاندارد
│   ├── wrangler.toml          # تنظیمات Cloudflare Workers
│   └── package.json
├── frontend/                  # فرانت‌اند Vue 3
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── api/
│   │   │   └── client.ts      # Axios client + تایپ‌ها
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   ├── tickets.ts
│   │   │   ├── notifications.ts
│   │   │   ├── toast.ts
│   │   │   └── theme.ts
│   │   ├── composables/
│   │   │   ├── useAuth.ts
│   │   │   └── useRole.ts
│   │   ├── components/
│   │   │   ├── layout/        # کامپوننت‌های لایوت
│   │   │   └── common/        # کامپوننت‌های مشترک
│   │   ├── views/
│   │   │   ├── LoginView.vue
│   │   │   ├── DashboardView.vue
│   │   │   ├── KnowledgeBaseView.vue
│   │   │   ├── TicketDetailView.vue
│   │   │   ├── CreateTicketView.vue
│   │   │   ├── NotificationsView.vue
│   │   │   └── admin/
│   │   │       ├── UsersView.vue
│   │   │       ├── CategoriesView.vue
│   │   │       └── RolesView.vue
│   │   └── styles/
│   │       └── main.css
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## 🚀 نصب و اجرا

### پیش‌نیازها
- Node.js 18+
- npm یا pnpm
- حساب Cloudflare (برای استقرار)
- Wrangler CLI

### ۱. نصب وابستگی‌ها

```bash
# نصب Wrangler CLI (اگر نصب ندارید)
npm install -g wrangler

# بک‌اند
cd backend
npm install

# فرانت‌اند
cd ../frontend
npm install
```

### ۲. راه‌اندازی دیتابیس

```bash
cd backend

# ایجاد دیتابیس D1
wrangler d1 create freebuff-tickets-db

# شناسه دیتابیس را در wrangler.toml قرار دهید

# ایجاد جداول
wrangler d1 execute freebuff-tickets-db --file=./src/db/schema.sql

# درج داده‌های اولیه
wrangler d1 execute freebuff-tickets-db --file=./src/db/seed.sql
```

> ⚠️ دستورهای بالا **بدون** `--local` هستند، یعنی روی دیتابیس remote (اصلی) اجرا می‌شوند.
> اگر می‌خواهید روی دیتابیس توسعه محلی کار کنید، به هر دستور `--local` را اضافه کنید یا از اسکریپت‌های آماده استفاده کنید.

#### به‌روزرسانی دیتابیس موجود (migration ها)

ویژگی‌های جدید در پوشه `src/db/migrations` فایل جداگانه دارند و باید یک‌بار اجرا شوند. همه آن‌ها idempotent هستند و اجرای دوباره‌شان بی‌خطر است:

```bash
cd backend

# دیتابیس توسعه محلی
npm run db:migrate:local

# دیتابیس remote (اصلی) — پیش از اجرا مطمئن شوید
npm run db:migrate
```

> اگر migration جدیدی را فراموش کنید، صفحه مربوطه در فرانت‌اند خطای `no such table` می‌دهد (مثلاً «خطا در ذخیره مقاله» برای پایگاه دانش).

### ۳. تنظیم متغیرهای محیطی

```bash
cd backend

# ایجاد فایل .dev.vars برای توسعه محلی
cat > .dev.vars << 'EOF'
JWT_SECRET=your-super-secret-jwt-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
CORS_ORIGIN=http://localhost:5173
EOF
```

### ۴. اجرای توسعه محلی

```bash
# ترمینال ۱: بک‌اند
cd backend
npm run dev

# ترمینال ۲: فرانت‌اند
cd frontend
npm run dev
```

بک‌اند روی `http://localhost:8787` و فرانت‌اند روی `http://localhost:5173` اجرا می‌شوند.

### ۵. ورود به سیستم

- **ادمین**: نام کاربری `admin`، رمز `admin123`
- **مشتری**: از صفحه لاگین ثبت‌نام کنید

## 🚢 استقرار روی Cloudflare

### بک‌اند

```bash
cd backend

# تنظیم متغیرهای رمزگذاری‌شده
wrangler secret put JWT_SECRET
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_WEBHOOK_SECRET

# استقرار
npm run deploy
```

### فرانت‌اند

```bash
cd frontend

# ساخت
npm run build

# استقرار روی Cloudflare Pages
npx wrangler pages deploy dist
```

### اعلان فوری مرورگر (Web Push)

```bash
cd backend

# تولید کلیدهای VAPID (یک بار)
npm run push:keys

# توسعه محلی: مقدارها را در backend/.dev.vars بگذارید
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:support@yourdomain.com"

# تولید: این مقادیر را به‌صورت secret ثبت کنید
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT

# تست صحت پیاده‌سازی رمزنگاری (VAPID + aes128gcm)
npm run test:webpush
npm run test:ecpoint
```

سپس کاربران می‌توانند از آیکون 🔔 در هدر، اعلان فوری مرورگر را فعال کنند. اگر کلیدهای VAPID تنظیم نشده باشند، سرویس 503 برمی‌گرداند و اعلان‌ها به حالت polling (هر ۳۰ ثانیه) برمی‌گردند.

### تنظیم وب‌هوک تلگرام

```bash
# تنظیم webhook برای ربات تلگرام
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -d "url=https://your-worker.your-subdomain.workers.dev/api/telegram/webhook" \
  -d "secret_token=your-webhook-secret"
```

## 📚 API Endpoints

### احراز هویت
| متد | مسیر | توضیحات |
|------|------|---------|
| POST | `/api/auth/register` | ثبت‌نام مشتری (فروشگاهی/شرکتی) |
| POST | `/api/auth/login` | ورود |
| GET | `/api/auth/me` | اطلاعات کاربر جاری + دسترسی‌ها |
| PUT | `/api/auth/me` | به‌روزرسانی پروفایل (نام/رمز) |

### کاربران (فقط admin)
| متد | مسیر | توضیحات |
|------|------|---------|
| GET | `/api/users` | لیست کاربران (با `search` روی نام/نام کاربری و `role`) |
| POST | `/api/users` | ایجاد کاربر |
| PUT | `/api/users/:id` | ویرایش کاربر |
| DELETE | `/api/users/:id` | حذف کاربر |

### دسته‌بندی‌ها
| متد | مسیر | توضیحات |
|------|------|---------|
| GET | `/api/categories` | لیست دسته‌بندی‌ها |
| POST | `/api/categories` | ایجاد (admin) |
| PUT | `/api/categories/:id` | ویرایش (admin) |
| DELETE | `/api/categories/:id` | حذف (admin) |

### نقش‌ها (نیازمند دسترسی مدیریت نقش‌ها)
| متد | مسیر | توضیحات |
|------|------|---------|
| GET | `/api/roles` | لیست نقش‌ها |
| GET | `/api/roles/permissions` | لیست دسترسی‌های موجود |
| POST | `/api/roles` | ایجاد نقش جدید |
| PUT | `/api/roles/:id` | ویرایش نقش |
| DELETE | `/api/roles/:id` | حذف نقش سفارشی |

### تیکت‌ها
| متد | مسیر | توضیحات |
|------|------|---------|
| GET | `/api/tickets` | لیست تیکت‌ها با فیلتر |
| POST | `/api/tickets` | ایجاد تیکت (با شماره تماس و نام کارمند) |
| GET | `/api/tickets/:id` | جزئیات تیکت |
| PUT | `/api/tickets/:id` | به‌روزرسانی تیکت |
| DELETE | `/api/tickets/:id` | حذف تیکت (admin) |
| POST | `/api/tickets/:id/comments` | افزودن کامنت |
| GET | `/api/tickets/:id/comments` | لیست کامنت‌ها |
| POST | `/api/tickets/:id/attachments` | آپلود فایل |
| PUT | `/api/tickets/:id/assign` | انتساب تیکت |
| PUT | `/api/tickets/:id/refer` | ارجاع تیکت به همکار (نیازمند `tickets.refer`) |

### کارهای روزانه (To-Do شخصی)
| متد | مسیر | توضیحات |
|------|------|---------|
| GET | `/api/todos` | لیست کارهای کاربر جاری (+ آمار) |
| POST | `/api/todos` | افزودن کار جدید (با سررسید اختیاری) |
| PUT | `/api/todos/:id` | ویرایش/تغییر وضعیت کار |
| DELETE | `/api/todos/:id` | حذف کار |
| GET | `/api/todos/assignable-users` | کارکنان داخلی قابل واگذاری (دسترسی `todos.assign`) |
| POST | `/api/todos/assign` | واگذاری وظیفه به کارمند/پشتیبان (دسترسی `todos.assign`) |

### پایگاه دانش
| متد | مسیر | توضیحات |
|------|------|---------|
| GET | `/api/kb` | لیست/جستجوی مقالات (`search`، `category`، `tag`، `include_unpublished`) |
| GET | `/api/kb/stats` | آمار مقالات (کل/منتشرشده/پیش‌نویس/بازدید) |
| GET | `/api/kb/:id` | جزئیات مقاله + ثبت بازدید |
| POST | `/api/kb` | ایجاد مقاله (نیازمند `kb.manage`) |
| PUT | `/api/kb/:id` | ویرایش مقاله (نیازمند `kb.manage`) |
| DELETE | `/api/kb/:id` | حذف مقاله (نیازمند `kb.manage`) |

### اعلان‌ها
| متد | مسیر | توضیحات |
|------|------|---------|
| GET | `/api/notifications` | لیست اعلان‌ها |
| PUT | `/api/notifications/:id/read` | خواندن اعلان |
| PUT | `/api/notifications/read-all` | خواندن همه |
| GET | `/api/push/public-key` | کلید عمومی VAPID |
| POST | `/api/push/subscribe` | ثبت اشتراک push مرورگر |
| POST | `/api/push/unsubscribe` | لغو اشتراک push |
| POST | `/api/push/test` | ارسال اعلان تستی به دستگاه‌های کاربر |

### تلگرام
| متد | مسیر | توضیحات |
|------|------|---------|
| POST | `/api/telegram/webhook` | وب‌هوک تلگرام |

## 🔐 نقش‌ها و دسترسی‌ها

دسترسی‌های هر نقش در جدول `roles` (ستون `permissions`) ذخیره می‌شود. ادمین می‌تواند از پنل «نقش‌ها و دسترسی‌ها» نقش‌های سفارشی بسازد یا دسترسی نقش‌های موجود را تغییر دهد. دسترسی‌های موجود:

- `tickets.view`، `tickets.view_all`، `tickets.view_unassigned`
- `tickets.create`، `tickets.comment`، `tickets.upload`
- `tickets.update_status`، `tickets.change_priority`، `tickets.assign`، `tickets.refer`، `tickets.delete`
- `todos.manage` (کارهای روزانه شخصی)، `todos.assign` (واگذاری وظیفه به کارکنان)
- `kb.view` (مشاهده پایگاه دانش)، `kb.manage` (ایجاد/ویرایش/حذف مقالات)
- `users.manage`، `categories.manage`، `roles.manage`

### دسترسی نقش‌های پیش‌فرض

| عملیات | admin | manager | support | customer |
|--------|-------|---------|---------|----------|
| مشاهده همه تیکت‌ها | ✅ | ✅ | ❌ | ❌ |
| مشاهده تیکت‌های بدون انتساب | ✅ | ✅ | ✅ | ❌ |
| مشاهده تیکت‌های خود | ✅ | ✅ | ✅ | ✅ |
| ایجاد تیکت | ✅ | ✅ | ✅ | ✅ |
| تغییر وضعیت | ✅ | ✅ | ✅ | ❌ |
| تغییر اولویت | ✅ | ✅ | ❌ | ❌ |
| انتساب تیکت | ✅ | ✅ | ❌ | ❌ |
| ارجاع تیکت به همکار | ✅ | ✅ | ✅ | ❌ |
| کارهای روزانه (To-Do) | ✅ | ✅ | ✅ | ❌ |
| واگذاری وظیفه به کارکنان | ✅ | ✅ | ❌ | ❌ |
| مشاهده پایگاه دانش | ✅ | ✅ | ✅ | ✅ |
| مدیریت مقالات پایگاه دانش | ✅ | ✅ | ✅ | ❌ |
| حذف تیکت | ✅ | ❌ | ❌ | ❌ |
| مدیریت کاربران | ✅ | ❌ | ❌ | ❌ |
| مدیریت دسته‌بندی‌ها | ✅ | ❌ | ❌ | ❌ |
| مدیریت نقش‌ها | ✅ | ❌ | ❌ | ❌ |

> نکته: کاربرانی که با نقش‌های قدیمی (پیش از این نسخه) ساخته شده‌اند، باید دوباره با نقش صحیح ساخته شوند تا دسترسی‌ها اعمال شود.

## 📌 ارجاع تیکت به همکار

کاربران دارای دسترسی `tickets.refer` (مدیر، پشتیبان و...) می‌توانند از صفحه تیکت، آن را به همکار دیگر ارجاع دهند:

- ارجاع **انتساب اصلی تیکت را تغییر نمی‌دهد** — فقط برای پیگیری است
- یادداشت اختیاری ارجاع به‌صورت کامنت در تیکت ثبت می‌شود (قابل ردیابی)
- همکار مقصد اعلان دریافت می‌کند (درون‌برنامه‌ای + Web Push)
- با گزینه «افزودن کار به لیست کارهای روزانه همکار» یک آیتم to-do در لیست شخصی او ساخته می‌شود

## ✅ کارهای روزانه (To-Do شخصی)

هر کاربر داخلی (ادمین/مدیر/پشتیبان با دسترسی `todos.manage`) لیست کارهای شخصی خود را در منوی «کارهای روزانه من» دارد:

- افزودن کار با عنوان و **سررسید اختیاری** (سررسیدهای گذشته با رنگ قرمز مشخص می‌شوند)
- علامت‌گذاری انجام‌شده/انجام‌نشده، ویرایش و حذف
- اتصال کار به یک تیکت (لینک مستقیم به تیکت)
- فیلتر «همه / انجام‌نشده / انجام‌شده» + آمار
- هر کاربر فقط لیست خودش را می‌بیند (جداسازی کامل در بک‌اند)

### واگذاری وظیفه به کارکنان

کاربران دارای دسترسی `todos.assign` (ادمین و مدیر) می‌توانند یک وظیفه را به لیست کارهای روزانه یک کارمند یا پشتیبان اضافه کنند:

- دکمه «واگذاری وظیفه» در صفحه «کارهای روزانه من» → انتخاب کارمند، عنوان و سررسید اختیاری
- همچنین از پنل «مدیریت کاربران»، ستون عملیات هر کارمند → «وظیفه» (مقصد از پیش انتخاب شده)
- مقصد باید کاربر داخلی باشد (واگذاری به مشتری و به خودتان رد می‌شود)
- مقصد یک **اعلان** دریافت می‌کند که نام واگذارکننده و متن وظیفه در آن ذکر شده است
- وظیفه در لیست مقصد مثل بقیه کارهای او قابل انجام‌دادن/ویرایش/حذف است

> نصب روی دیتابیس موجود: `npm run db:migrate:local` (توسعه) یا `npm run db:migrate` (remote) — که شامل `002_todos.sql`, `003_refer_todo_permissions.sql`, `004_knowledge_base.sql` و `005_todo_assign_permission.sql` است.

## 📚 پایگاه دانش

بخش «پایگاه دانش» (منوی کناری → پایگاه دانش) مکانی برای راهنماها و پاسخ پرسش‌های پرتکرار است:

- **همه کاربران** (با دسترسی `kb.view`) می‌توانند مقالات منتشرشده را ببینند، جستجو کنند و بر اساس دسته‌بندی یا برچسب فیلتر کنند
- **تیم پشتیبانی** (با دسترسی `kb.manage`) می‌تواند مقاله بسازد، ویرایش یا حذف کند
- مقاله می‌تواند **پیش‌نویس** باشد؛ پیش‌نویس‌ها فقط برای دارندگان `kb.manage` نمایش داده می‌شوند
- هر بازدید از جزئیات مقاله شمارش می‌شود و آمار کل/منتشرشده/پیش‌نویس/بازدید در بالای صفحه دیده می‌شود
- متن مقالات به‌صورت متن ساده با حفظ خطوط جدید ذخیره می‌شود

> نصب روی دیتابیس موجود: `npm run db:migrate:local` (توسعه محلی) یا `npm run db:migrate` (remote)
> (این migration جدول `kb_articles` را می‌سازد و دسترسی‌های `kb.view` و `kb.manage` را به نقش‌های پیش‌فرض اضافه می‌کند. روی دیتابیس تازه، `schema.sql` و `seed.sql` همین موارد را شامل می‌شوند و ۳ مقاله نمونه هم درج می‌شود.)

## 👥 ثبت‌نام مشتری (فروشگاهی / شرکتی)

- **فروشگاهی**: نام و نام خانوادگی + نام کاربری + رمز عبور
- **شرکتی**: نام شرکت + نام کاربری + رمز عبور — هنگام ایجاد تیکت، **نام کارمند** به‌صورت اجباری خواسته می‌شود
- همه مشتریان می‌توانند هنگام ایجاد تیکت **شماره تماس** ثبت کنند

## 📝 نکات

- تمام پیام‌های خطا و موفقیت به فارسی هستند
- اعلان فوری مرورگر (Web Push) کاملاً با WebCrypto پیاده‌سازی شده (RFC 8291 + RFC 8292) و روی Cloudflare Workers بدون وابستگی Node اجرا می‌شود
- رابط کاربری کاملاً راست‌چین (RTL) است
- حالت شب (dark mode) از دکمه 🌙 در هدر قابل تغییر است و در localStorage ذخیره می‌شود
- اعلان‌ها هر ۳۰ ثانیه به‌صورت خودکار بررسی می‌شوند
- فایل‌های پیوست حداکثر ۱۰ مگابایت حجم دارند
- فرمت‌های پشتیبانی‌شده: تصاویر، PDF، Word، Excel، ZIP
- حداکثر ۵ فایل برای هر تیکت مجاز است

## 📄 مجوز

MIT License
