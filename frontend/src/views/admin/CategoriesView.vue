<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api, { type Category } from '@/api/client';
import { useToast } from '@/composables/useToast';

const categories = ref<Category[]>([]);
const loading = ref(true);
const toast = useToast();

// Modal state
const showModal = ref(false);
const editingCategory = ref<Category | null>(null);
const formData = ref({
  name: '',
  description: '',
});
const saving = ref(false);

onMounted(() => {
  fetchCategories();
});

async function fetchCategories() {
  loading.value = true;
  try {
    const response = await api.get('/categories');
    categories.value = response.data.data;
  } catch {
    toast.error('خطا در بارگذاری دسته‌بندی‌ها');
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  editingCategory.value = null;
  formData.value = { name: '', description: '' };
  showModal.value = true;
}

function openEditModal(category: Category) {
  editingCategory.value = category;
  formData.value = {
    name: category.name,
    description: category.description || '',
  };
  showModal.value = true;
}

async function handleSave() {
  saving.value = true;

  try {
    if (editingCategory.value) {
      await api.put(`/categories/${editingCategory.value.id}`, {
        name: formData.value.name,
        description: formData.value.description || undefined,
      });
      toast.success('دسته‌بندی با موفقیت به‌روزرسانی شد');
    } else {
      await api.post('/categories', {
        name: formData.value.name,
        description: formData.value.description || undefined,
      });
      toast.success('دسته‌بندی با موفقیت ایجاد شد');
    }
    showModal.value = false;
    await fetchCategories();
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در ذخیره دسته‌بندی');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(category: Category) {
  if (!confirm(`آیا از حذف دسته‌بندی «${category.name}» اطمینان دارید؟`)) return;

  try {
    await api.delete(`/categories/${category.id}`);
    toast.success('دسته‌بندی با موفقیت حذف شد');
    await fetchCategories();
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در حذف دسته‌بندی');
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">مدیریت دسته‌بندی‌ها</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">{{ categories.length }} دسته‌بندی</p>
      </div>
      <button @click="openCreateModal" class="btn-primary">
        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        دسته‌بندی جدید
      </button>
    </div>

    <!-- Categories Table -->
    <div class="card">
      <div v-if="loading" class="text-center py-12">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[480px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">نام</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">توضیحات</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="category in categories"
              :key="category.id"
              class="border-b border-gray-100 dark:border-gray-700/60"
            >
              <td class="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">{{ category.name }}</td>
              <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{{ category.description || '-' }}</td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <button
                    @click="openEditModal(category)"
                    class="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    ویرایش
                  </button>
                  <button
                    @click="handleDelete(category)"
                    class="text-red-600 hover:text-red-700 text-sm"
                  >
                    حذف
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-md dark:bg-gray-800">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
          {{ editingCategory ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی جدید' }}
        </h3>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">نام</label>
            <input v-model="formData.name" type="text" required class="input-field" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">توضیحات</label>
            <textarea v-model="formData.description" class="input-field" rows="3"></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showModal = false" class="btn-secondary">لغو</button>
            <button type="submit" :disabled="saving" class="btn-primary">
              {{ saving ? 'در حال ذخیره...' : 'ذخیره' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
