import { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function successResponse(c: Context, data: unknown, status: ContentfulStatusCode = 200) {
  return c.json({ success: true, data }, status);
}

export function errorResponse(c: Context, message: string, status: ContentfulStatusCode = 400) {
  return c.json({ success: false, error: message }, status);
}

export function createdResponse(c: Context, data: unknown) {
  return successResponse(c, data, 201);
}

// Persian error messages
export const MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'ورود موفقیت‌آمیز',
  REGISTER_SUCCESS: 'ثبت‌نام موفقیت‌آمیز',
  INVALID_CREDENTIALS: 'نام کاربری یا رمز عبور اشتباه است',
  UNAUTHORIZED: 'برای دسترسی به این بخش باید وارد شوید',
  FORBIDDEN: 'شما اجازه دسترسی به این بخش را ندارید',
  USER_EXISTS: 'نام کاربری قبلاً استفاده شده است',
  WRONG_CURRENT_PASSWORD: 'رمز عبور فعلی صحیح نیست',
  PROFILE_UPDATED: 'پروفایل با موفقیت به‌روزرسانی شد',
  NO_CHANGES: 'برای به‌روزرسانی، حداقل یکی از فیلدها را پر کنید',

  // Users
  USER_CREATED: 'کاربر با موفقیت ایجاد شد',
  USER_UPDATED: 'کاربر با موفقیت به‌روزرسانی شد',
  USER_DELETED: 'کاربر با موفقیت حذف شد',
  USER_NOT_FOUND: 'کاربر یافت نشد',
  CANNOT_DELETE_SELF: 'نمی‌توانید حساب خود را حذف کنید',
  CANNOT_DELETE_ADMIN: 'نمی‌توانید حساب ادمین را حذف کنید',

  // Tickets
  TICKET_CREATED: 'تیکت با موفقیت ایجاد شد',
  TICKET_UPDATED: 'تیکت با موفقیت به‌روزرسانی شد',
  TICKET_DELETED: 'تیکت با موفقیت حذف شد',
  TICKET_NOT_FOUND: 'تیکت یافت نشد',
  TICKET_ASSIGNED: 'تیکت با موفقیت منتسب شد',
  TICKET_REFERRED: 'تیکت با موفقیت به همکار ارجاع شد',
  UNAUTHORIZED_TICKET: 'شما فقط به تیکت‌های خود دسترسی دارید',

  // Todos
  TODO_CREATED: 'کار با موفقیت اضافه شد',
  TODO_UPDATED: 'کار با موفقیت به‌روزرسانی شد',
  TODO_DELETED: 'کار با موفقیت حذف شد',
  TODO_NOT_FOUND: 'کار یافت نشد',

  // Knowledge Base (پایگاه دانش)
  KB_ARTICLE_CREATED: 'مقاله با موفقیت ایجاد شد',
  KB_ARTICLE_UPDATED: 'مقاله با موفقیت به‌روزرسانی شد',
  KB_ARTICLE_DELETED: 'مقاله با موفقیت حذف شد',
  KB_ARTICLE_NOT_FOUND: 'مقاله یافت نشد',

  // Categories
  CATEGORY_CREATED: 'دسته‌بندی با موفقیت ایجاد شد',
  CATEGORY_UPDATED: 'دسته‌بندی با موفقیت به‌روزرسانی شد',
  CATEGORY_DELETED: 'دسته‌بندی با موفقیت حذف شد',
  CATEGORY_NOT_FOUND: 'دسته‌بندی یافت نشد',

  // Comments
  COMMENT_CREATED: 'کامنت با موفقیت اضافه شد',
  COMMENT_NOT_FOUND: 'کامنت یافت نشد',

  // Attachments
  ATTACHMENT_UPLOADED: 'فایل با موفقیت آپلود شد',
  ATTACHMENT_NOT_FOUND: 'فایل یافت نشد',
  FILE_TOO_LARGE: 'حجم فایل بیش از حد مجاز است (حداکثر ۱۰ مگابایت)',
  INVALID_FILE_TYPE: 'فرمت فایل پشتیبانی نمی‌شود',

  // Notifications
  NOTIFICATION_READ: 'اعلان به‌عنوان خوانده‌شده علامت‌گذاری شد',
  NOTIFICATION_NOT_FOUND: 'اعلان یافت نشد',

  // General
  VALIDATION_ERROR: 'خطا در اعتبارسنجی اطلاعات',
  INTERNAL_ERROR: 'خطای داخلی سرور',
  SUCCESS: 'عملیات با موفقیت انجام شد',
} as const;