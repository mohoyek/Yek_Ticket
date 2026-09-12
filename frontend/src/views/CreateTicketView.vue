<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTicketStore } from '@/stores/tickets';
import { useAuthStore } from '@/stores/auth';
import FileUpload from '@/components/common/FileUpload.vue';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const ticketStore = useTicketStore();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(false);

// Form fields
const title = ref('');
const description = ref('');
const categoryId = ref<number | null>(null);
const priority = ref('medium');
const contactPhone = ref('');
const employeeName = ref('');
const selectedFile = ref<File | null>(null);

const isCompanyCustomer = computed(() => authStore.user?.customer_type === 'company');

onMounted(() => {
  ticketStore.fetchCategories();
});

async function handleSubmit() {
  if (!title.value.trim()) {
    toast.error('عنوان تیکت الزامی است');
    return;
  }

  if (isCompanyCustomer.value && !employeeName.value.trim()) {
    toast.error('برای تیکت شرکتی، نام کارمند الزامی است');
    return;
  }

  loading.value = true;

  try {
    const ticket = await ticketStore.createTicket({
      title: title.value,
      description: description.value,
      category_id: categoryId.value || undefined,
      priority: priority.value,
      contact_phone: contactPhone.value || undefined,
      employee_name: employeeName.value || undefined,
    });

    // Upload file if selected
    if (selectedFile.value && ticket) {
      await ticketStore.uploadAttachment(ticket.id, selectedFile.value);
    }

    toast.success('تیکت با موفقیت ایجاد شد');
    setTimeout(() => {
      router.push(`/tickets/${ticket.id}`);
    }, 1200);
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در ایجاد تیکت');
  } finally {
    loading.value = false;
  }
}

const priorityOptions = [
  { value: 'low', label: 'کم', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'medium', label: 'متوسط', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200' },
  { value: 'high', label: 'زیاد', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-200' },
  { value: 'urgent', label: 'فوری', color: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200' },
];
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Back button -->
    <button
      @click="router.push('/')"
      class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      بازگشت به داشبورد
    </button>

    <div class="card">
      <h1 class="text-xl font-bold text-gray-900 mb-6 dark:text-gray-100">ایجاد تیکت جدید</h1>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            عنوان <span class="text-red-500">*</span>
          </label>
          <input
            v-model="title"
            type="text"
            required
            class="input-field"
            placeholder="عنوان تیکت را وارد کنید"
          />
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            دسته‌بندی
          </label>
          <select v-model="categoryId" class="input-field">
            <option :value="null">انتخاب دسته‌بندی</option>
            <option v-for="cat in ticketStore.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Priority -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            اولویت
          </label>
          <div class="flex gap-2">
            <button
              v-for="opt in priorityOptions"
              :key="opt.value"
              type="button"
              @click="priority = opt.value"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="
                priority === opt.value
                  ? opt.color
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              "
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Contact phone -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            شماره تماس
          </label>
          <input
            v-model="contactPhone"
            type="tel"
            class="input-field"
            dir="ltr"
            placeholder="مثلاً 0912xxxxxxx"
          />
        </div>

        <!-- Employee name (company customers only) -->
        <div v-if="isCompanyCustomer">
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            نام کارمند <span class="text-red-500">*</span>
          </label>
          <input
            v-model="employeeName"
            type="text"
            :required="isCompanyCustomer"
            class="input-field"
            placeholder="نام کارمندی که مشکل را گزارش می‌کند"
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            توضیحات
          </label>
          <textarea
            v-model="description"
            class="input-field"
            rows="5"
            placeholder="توضیحات تیکت را بنویسید..."
          ></textarea>
        </div>

        <!-- File Upload -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            فایل پیوست
          </label>
          <FileUpload
            @select="(file: File) => selectedFile = file"
            @error="(msg: string) => toast.error(msg)"
            :disabled="loading"
          />
        </div>

        <!-- Submit -->
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="loading || !title.trim()"
            class="btn-primary"
          >
            <span v-if="loading" class="ml-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            ایجاد تیکت
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
