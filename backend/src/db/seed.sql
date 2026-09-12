-- Seed Data
-- Admin user: username = admin / password = admin123 (PBKDF2-SHA256, 100k iterations)
INSERT OR IGNORE INTO users (full_name, username, password_hash, role) VALUES
    ('مدیر سیستم', 'admin', '6a34185112462802c0e065f9ed0f4c49:d25d8b7c298d3ac32df2257b12ab9db54826502de5aae64c170641b913720fd761783510682147f8f00ce31ffb02e7a96b1eaa2a1d85d6beb5b0c94bcfcfcc8e', 'admin');

-- سیستم نقش‌ها و دسترسی‌ها
INSERT OR IGNORE INTO roles (name, label, permissions, is_system) VALUES
    ('admin', 'مدیر سیستم', '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","tickets.delete","todos.manage","todos.assign","kb.view","kb.manage","users.manage","categories.manage","roles.manage"]', 1),
    ('manager', 'مدیر', '["tickets.view","tickets.view_all","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.change_priority","tickets.assign","tickets.refer","todos.manage","todos.assign","kb.view","kb.manage"]', 1),
    ('support', 'پشتیبان', '["tickets.view","tickets.view_unassigned","tickets.create","tickets.comment","tickets.upload","tickets.update_status","tickets.refer","todos.manage","kb.view","kb.manage"]', 1),
    ('customer', 'مشتری', '["tickets.view","tickets.create","tickets.comment","tickets.upload","kb.view"]', 1);

-- Default Categories
INSERT OR IGNORE INTO categories (name, description) VALUES
    ('خطا و ارور', 'مشکلات و خطاهای نرم‌افزاری'),
    ('نصب نرم افزار', 'نصب و راه‌اندازی نرم‌افزار'),
    ('طراحی گزارش', 'طراحی و سفارشی‌سازی گزارش‌ها'),
    ('مودیان', ' مربوط به مودیان و مالیات'),
    ('شبکه', 'مشکلات شبکه و اتصال'),
    ('حقوق و دستمزد', 'محاسبات حقوق و دستمزد'),
    ('سوالات حسابداری', 'سوالات مربوط به حسابداری'),
    ('خرید و فروش', 'عملیات خرید و فروش'),
    ('تولید', 'فرآیندهای تولید'),
    ('بهای تمام شده', 'محاسبه بهای تمام شده'),
    ('دفاتر تجاری', 'مدیریت دفاتر تجاری');

-- مقالات نمونه پایگاه دانش (فقط اگر پایگاه دانش خالی باشد درج می‌شوند)
INSERT INTO kb_articles (title, body, tags, is_published, created_by)
SELECT title, body, tags, 1,
       COALESCE((SELECT id FROM users WHERE username = 'admin'), (SELECT id FROM users ORDER BY id LIMIT 1))
FROM (
    SELECT 'چطور یک تیکت ثبت کنم؟' AS title,
           'برای ثبت تیکت جدید، از منوی کناری گزینه «تیکت جدید» را انتخاب کنید.' || char(10) || char(10) ||
           '۱. عنوان کوتاه و گویا بنویسید.' || char(10) ||
           '۲. دسته‌بندی مناسب را انتخاب کنید.' || char(10) ||
           '۳. در صورت نیاز فایل پیوست کنید (حداکثر ۱۰ مگابایت).' || char(10) || char(10) ||
           'پس از ثبت، وضعیت تیکت را می‌توانید از صفحه داشبورد پیگیری کنید.' AS body,
           'شروع,راهنما,تیکت' AS tags
    UNION ALL
    SELECT 'اعلان‌های مرورگر (Web Push) را چطور فعال کنم؟',
           'روی آیکون زنگ 🔔 در نوار بالای صفحه کلیک کنید و اجازه نمایش اعلان را بدهید.' || char(10) || char(10) ||
           'با فعال بودن این گزینه، حتی وقتی تب سایت بسته است اعلان‌های تیکت را دریافت می‌کنید. اگر کلیدهای VAPID روی سرور تنظیم نشده باشند، اعلان‌ها به‌صورت خودکار به حالت بررسی هر ۳۰ ثانیه برمی‌گردند.',
           'اعلان,مرورگر'
    UNION ALL
    SELECT 'ارجاع تیکت به همکار یعنی چه؟',
           'کاربران دارای دسترسی «ارجاع تیکت به همکار» می‌توانند تیکت را برای پیگیری به همکار دیگری بسپارند.' || char(10) || char(10) ||
           'ارجاع، انتساب اصلی تیکت را تغییر نمی‌دهد؛ فقط یک یادداشت در تیکت ثبت می‌شود، همکار مقصد اعلان می‌گیرد و در صورت تمایل یک مورد به لیست کارهای روزانه او اضافه می‌شود.',
           'ارجاع,همکار'
) AS seed_articles
WHERE (SELECT COUNT(*) FROM users) > 0
  AND NOT EXISTS (SELECT 1 FROM kb_articles);
