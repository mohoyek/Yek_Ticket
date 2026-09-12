import { z } from 'zod';

// Auth schemas
export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد').optional(),
    company_name: z.string().min(2, 'نام شرکت باید حداقل ۲ کاراکتر باشد').optional(),
    username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد').max(50),
    password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
    customer_type: z.enum(['shop', 'company']).default('shop'),
  })
  .refine((data) => {
    if (data.customer_type === 'company') {
      return !!data.company_name;
    }
    return !!data.full_name;
  }, {
    message: 'برای ثبت‌نام، نام شخص یا نام شرکت الزامی است',
    path: ['customer_type'],
  });

export const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

// User schemas
export const createUserSchema = z.object({
  full_name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد').max(50),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
  role: z.string().min(1, 'نقش الزامی است'),
  telegram_chat_id: z.string().optional(),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.string().min(1).optional(),
  telegram_chat_id: z.string().optional(),
});

// Role schemas
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'نام نقش باید حداقل ۲ کاراکتر باشد')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'نام نقش فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و زیرخط باشد'),
  label: z.string().min(2, 'عنوان نقش باید حداقل ۲ کاراکتر باشد'),
  permissions: z.array(z.string()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/).optional(),
  label: z.string().min(2).optional(),
  permissions: z.array(z.string()).optional(),
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'نام دسته‌بندی الزامی است'),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// Ticket schemas
export const createTicketSchema = z.object({
  title: z.string().min(3, 'عنوان باید حداقل ۳ کاراکتر باشد'),
  description: z.string().optional(),
  category_id: z.number().int().positive().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  contact_phone: z
    .string()
    .max(20, 'شماره تماس نامعتبر است')
    .optional()
    .or(z.literal('')),
  employee_name: z
    .string()
    .max(100, 'نام کارمند نامعتبر است')
    .optional()
    .or(z.literal('')),
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'closed', 'waiting_customer']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
});

// Comment schema
export const createCommentSchema = z.object({
  body: z.string().min(1, 'متن کامنت الزامی است'),
});

// Assign schema
export const assignTicketSchema = z.object({
  assigned_to: z.number().int().positive().nullable(),
});

// Refer schema (ارجاع تیکت به همکار)
export const referTicketSchema = z.object({
  to_user_id: z.number().int().positive('کاربر مقصد نامعتبر است'),
  note: z.string().max(1000, 'یادداشت حداکثر ۱۰۰۰ کاراکتر است').optional(),
  create_todo: z.boolean().optional().default(true),
});

// Todo schemas (کارهای روزانه)
export const createTodoSchema = z.object({
  title: z.string().min(1, 'عنوان کار الزامی است').max(500, 'عنوان حداکثر ۵۰۰ کاراکتر است'),
  ticket_id: z.number().int().positive().nullable().optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ باید به فرمت YYYY-MM-DD باشد')
    .nullable()
    .optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  is_done: z.boolean().optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

// Assign a to-do item to another staff member (مدیر → کارمند/پشتیبان)
export const assignTodoSchema = createTodoSchema.extend({
  user_id: z.number().int().positive('کارمند مقصد نامعتبر است'),
});

// Knowledge base schemas (پایگاه دانش)
export const createKbArticleSchema = z.object({
  title: z
    .string()
    .min(3, 'عنوان مقاله باید حداقل ۳ کاراکتر باشد')
    .max(200, 'عنوان مقاله حداکثر ۲۰۰ کاراکتر است'),
  body: z
    .string()
    .min(1, 'متن مقاله الزامی است')
    .max(20000, 'متن مقاله بسیار طولانی است'),
  category_id: z.number().int().positive().nullable().optional(),
  tags: z.string().max(300, 'برچسب‌ها حداکثر ۳۰۰ کاراکتر است').nullable().optional(),
  is_published: z.boolean().optional().default(true),
});

export const updateKbArticleSchema = z.object({
  title: z.string().min(3).max(200, 'عنوان مقاله حداکثر ۲۰۰ کاراکتر است').optional(),
  body: z.string().min(1).max(20000, 'متن مقاله بسیار طولانی است').optional(),
  category_id: z.number().int().positive().nullable().optional(),
  tags: z.string().max(300, 'برچسب‌ها حداکثر ۳۰۰ کاراکتر است').nullable().optional(),
  is_published: z.boolean().optional(),
});

// Ticket query params
export const ticketQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed', 'waiting_customer']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.coerce.number().int().positive().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Profile update schema (change name / password)
export const updateProfileSchema = z
  .object({
    full_name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد').optional(),
    current_password: z.string().min(1, 'رمز عبور فعلی الزامی است').optional(),
    new_password: z.string().min(6, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد').optional(),
  })
  .refine((data) => !!data.full_name || !!data.new_password, {
    message: 'برای به‌روزرسانی، حداقل یکی از فیلدها را پر کنید',
    path: ['full_name'],
  })
  .refine((data) => !data.new_password || !!data.current_password, {
    message: 'برای تغییر رمز عبور، رمز فعلی را وارد کنید',
    path: ['current_password'],
  });
