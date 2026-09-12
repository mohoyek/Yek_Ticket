<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import api from '@/api/client';

const authStore = useAuthStore();
const toast = useToast();

// اطلاعات شخصی
const fullName = ref(authStore.user?.full_name || '');
const savingName = ref(false);

// تغییر رمز
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const savingPassword = ref(false);

function roleLabel(role?: string) {
  if (authStore.user?.role_label) return authStore.user.role_label;
  switch (role) {
    case 'admin':
      return 'مدیر سیستم';
    case 'manager':
      return 'مدیر';
    case 'support':
      return 'پشتیبان';
    case 'customer':
      return 'مشتری';
    default:
      return role || '—';
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function saveName() {
  if (fullName.value.trim().length < 2) {
    toast.error('نام باید حداقل ۲ کاراکتر باشد');
    return;
  }
  savingName.value = true;
  try {
    await api.put('/auth/me', { full_name: fullName.value.trim() });
    await authStore.fetchMe();
    toast.success('نام با موفقیت به‌روزرسانی شد');
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطایی رخ داد. لطفاً دوباره تلاش کنید.');
  } finally {
    savingName.value = false;
  }
}

async function savePassword() {
  if (!currentPassword.value) {
    toast.error('رمز عبور فعلی را وارد کنید');
    return;
  }
  if (newPassword.value.length < 6) {
    toast.error('رمز عبور جدید باید حداقل ۶ کاراکتر باشد');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error('تکرار رمز عبور جدید مطابقت ندارد');
    return;
  }
  savingPassword.value = true;
  try {
    await api.put('/auth/me', {
      current_password: currentPassword.value,
      new_password: newPassword.value,
    });
    toast.success('رمز عبور با موفقیت تغییر کرد');
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطایی رخ داد. لطفاً دوباره تلاش کنید.');
  } finally {
    savingPassword.value = false;
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">پروفایل</h1>
      <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">اطلاعات شخصی و رمز عبور خود را مدیریت کنید</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Personal Info Card -->
      <div class="card">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-primary-900/60">
            <span class="text-2xl font-bold text-primary-700 dark:text-primary-300">
              {{ authStore.user?.full_name?.charAt(0) || 'ک' }}
            </span>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">اطلاعات شخصی</h2>
            <span class="inline-block mt-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full dark:bg-primary-900/60 dark:text-primary-300">
              {{ roleLabel(authStore.user?.role) }}
            </span>
          </div>
        </div>

        <form @submit.prevent="saveName" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">نام و نام خانوادگی</label>
            <input v-model="fullName" type="text" class="input-field" placeholder="نام و نام خانوادگی" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">نام کاربری</label>
            <input
              :value="authStore.user?.username"
              type="text"
              disabled
              class="input-field bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
            />
            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">نام کاربری قابل تغییر نیست</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">تاریخ عضویت</label>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ formatDate(authStore.user?.created_at) }}</p>
          </div>

          <button type="submit" :disabled="savingName" class="btn-primary w-full sm:w-auto">
            <span v-if="savingName" class="ml-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            ذخیره تغییرات
          </button>
        </form>
      </div>

      <!-- Password Card -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-6 dark:text-gray-100">تغییر رمز عبور</h2>

        <form @submit.prevent="savePassword" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">رمز عبور فعلی</label>
            <input
              v-model="currentPassword"
              type="password"
              class="input-field"
              placeholder="رمز عبور فعلی را وارد کنید"
              autocomplete="current-password"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">رمز عبور جدید</label>
            <input
              v-model="newPassword"
              type="password"
              class="input-field"
              placeholder="حداقل ۶ کاراکتر"
              autocomplete="new-password"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">تکرار رمز عبور جدید</label>
            <input
              v-model="confirmPassword"
              type="password"
              class="input-field"
              placeholder="تکرار رمز عبور جدید"
              autocomplete="new-password"
            />
          </div>

          <button type="submit" :disabled="savingPassword" class="btn-primary w-full sm:w-auto">
            <span v-if="savingPassword" class="ml-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            تغییر رمز عبور
          </button>
        </form>
      </div>
    </div>
  </div>
</template>