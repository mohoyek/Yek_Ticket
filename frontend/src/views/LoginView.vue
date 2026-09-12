<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const openFaq = ref<number | null>(null);

const faqs = [
  {
    q: 'چگونه در سیستم ثبت‌نام کنم؟',
    a: 'روی دکمه «حساب کاربری ندارید؟ ثبت‌نام کنید» بزنید، نوع مشتری (فروشگاهی یا شرکتی) را انتخاب کرده و اطلاعات خواسته‌شده را وارد کنید. ثبت‌نام فوری است و می‌توانید بلافاصله تیکت ثبت کنید.'
  },
  {
    q: 'چطور تیکت جدید ثبت کنم؟',
    a: 'بعد از ورود، از منوی کناری گزینه «تیکت جدید» را انتخاب کنید. عنوان، دسته، توضیحات و شماره تماس را وارد کرده و در صورت نیاز فایل پیوست اضافه کنید. برای مشتریان شرکتی، وارد کردن نام کارمند الزامی است.'
  },
  {
    q: 'از کجا وضعیت تیکتم را ببینم؟',
    a: 'در داشبورد، لیست همه تیکت‌های شما با وضعیت فعلی (باز، در حال بررسی، در انتظار مشتری، بسته‌شده) نمایش داده می‌شود. با کلیک روی هر تیکت می‌توانید جزئیات، پاسخ‌ها و تاریخچه را ببینید.'
  },
  {
    q: 'فایل‌های مجاز برای پیوست کدام‌اند؟',
    a: 'می‌توانید تصاویر (JPG، PNG)، PDF، فایل‌های Word و Excel و فایل‌های ZIP تا حداکثر ۱۰ مگابایت برای هر فایل پیوست کنید (حداکثر ۵ فایل برای هر تیکت).'
  },
  {
    q: 'چطور از پاسخ پشتیبان باخبر شوم؟',
    a: 'هر زمان پشتیبان به تیکت شما پاسخ دهد یا وضعیت آن تغییر کند، اعلانی با آیکون زنگوله در بالای صفحه برای شما ارسال می‌شود و با کلیک روی آن به تیکت مربوطه هدایت می‌شوید.'
  }
];

function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index;
}

const isRegistering = ref(false);
const loading = ref(false);

// Form fields
const customerType = ref<'shop' | 'company'>('shop');
const fullName = ref('');
const companyName = ref('');
const username = ref('');
const password = ref('');

async function handleSubmit() {
  loading.value = true;

  try {
    if (isRegistering.value) {
      await authStore.register(
        username.value,
        password.value,
        customerType.value,
        fullName.value,
        companyName.value
      );
      toast.success('ثبت‌نام با موفقیت انجام شد');
    } else {
      await authStore.login(username.value, password.value);
      toast.success('ورود موفقیت‌آمیز');
    }
    router.push('/');
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطایی رخ داد. لطفاً دوباره تلاش کنید.');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4 dark:bg-gray-900">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">فریباف</h1>
        <p class="text-gray-500 mt-1 dark:text-gray-400">سیستم تیکتینگ و پشتیبانی</p>
      </div>

      <!-- Login Card -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-6 dark:text-gray-100">
          {{ isRegistering ? 'ثبت‌نام مشتری' : 'ورود به سیستم' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Customer type (register only) -->
          <div v-if="isRegistering">
            <label class="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              نوع مشتری
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="customerType = 'shop'"
                class="px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors"
                :class="
                  customerType === 'shop'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'
                "
              >
                فروشگاهی
              </button>
              <button
                type="button"
                @click="customerType = 'company'"
                class="px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors"
                :class="
                  customerType === 'company'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'
                "
              >
                شرکتی
              </button>
            </div>
          </div>

          <!-- Shop name (register only) -->
          <div v-if="isRegistering && customerType === 'shop'">
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              نام و نام خانوادگی
            </label>
            <input
              v-model="fullName"
              type="text"
              required
              class="input-field"
              placeholder="نام و نام خانوادگی خود را وارد کنید"
            />
          </div>

          <!-- Company name (register only) -->
          <div v-if="isRegistering && customerType === 'company'">
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              نام شرکت
            </label>
            <input
              v-model="companyName"
              type="text"
              required
              class="input-field"
              placeholder="نام شرکت را وارد کنید"
            />
          </div>

          <!-- Username -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              نام کاربری
            </label>
            <input
              v-model="username"
              type="text"
              required
              class="input-field"
              placeholder="نام کاربری خود را وارد کنید"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              رمز عبور
            </label>
            <input
              v-model="password"
              type="password"
              required
              class="input-field"
              placeholder="رمز عبور خود را وارد کنید"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full"
          >
            <span v-if="loading" class="ml-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ isRegistering ? 'ثبت‌نام' : 'ورود' }}
          </button>
        </form>

        <!-- Toggle register/login -->
        <div class="mt-4 text-center">
          <button
            @click="isRegistering = !isRegistering"
            class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {{ isRegistering ? 'حساب کاربری دارید؟ وارد شوید' : 'حساب کاربری ندارید؟ ثبت‌نام کنید' }}
          </button>
        </div>
      </div>

      <!-- FAQ -->
      <div class="mt-8">
        <button
          @click="openFaq = openFaq === null ? -1 : null"
          class="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600"
        >
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            سوالات متداول
          </span>
          <svg
            class="w-4 h-4 transition-transform"
            :class="openFaq !== null ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="openFaq !== null" class="mt-2 space-y-2">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="rounded-lg border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800"
          >
            <button
              @click="toggleFaq(index)"
              class="w-full flex items-center justify-between px-4 py-3 text-right text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {{ faq.q }}
              <svg
                class="w-4 h-4 shrink-0 text-gray-400 transition-transform"
                :class="openFaq === index ? 'rotate-180' : ''"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <p
              v-if="openFaq === index"
              class="px-4 pb-3 text-sm text-gray-600 leading-relaxed dark:text-gray-300"
            >
              {{ faq.a }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
