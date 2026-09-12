<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import api, { getApiErrorMessage, type User, type Role } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { useRole } from '@/composables/useRole';
import AssignTodoModal from '@/components/AssignTodoModal.vue';

const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const loading = ref(true);
const toast = useToast();
const { canAssignTodo } = useRole();

// Filters (server-side)
const search = ref('');
const roleFilter = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const assignableRoles = computed(() => roles.value.filter((r) => r.name !== 'customer'));
const isFiltering = computed(() => !!search.value.trim() || !!roleFilter.value);

// Assign-task modal
const showAssignModal = ref(false);
const assignTarget = ref<User | null>(null);

// Modal state
const showModal = ref(false);
const editingUser = ref<User | null>(null);
const formData = ref({
  full_name: '',
  username: '',
  password: '',
  role: 'support' as string,
  telegram_chat_id: '',
});
const saving = ref(false);

onMounted(() => {
  fetchUsers();
  fetchRoles();
});

async function fetchRoles() {
  try {
    const response = await api.get('/roles');
    roles.value = response.data.data;
  } catch {
    // roles load is not critical
  }
}

async function fetchUsers() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (search.value.trim()) params.search = search.value.trim();
    if (roleFilter.value) params.role = roleFilter.value;

    const response = await api.get('/users', { params });
    users.value = response.data.data;
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'خطا در بارگذاری کاربران'));
  } finally {
    loading.value = false;
  }
}

// جستجو با تأخیر کوتاه تا با هر تایپ یک درخواست ارسال نشود
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchUsers(), 300);
});

watch(roleFilter, () => fetchUsers());

function clearFilters() {
  search.value = '';
  roleFilter.value = '';
}

function openAssignModal(user: User) {
  assignTarget.value = user;
  showAssignModal.value = true;
}

function handleAssigned(payload: { user: User | null; title: string }) {
  toast.success(`وظیفه «${payload.title}» به ${payload.user?.full_name ?? 'کارمند'} واگذار شد`);
}

function openCreateModal() {
  editingUser.value = null;
  formData.value = {
    full_name: '',
    username: '',
    password: '',
    role: 'support',
    telegram_chat_id: '',
  };
  showModal.value = true;
}

function openEditModal(user: User) {
  editingUser.value = user;
  formData.value = {
    full_name: user.full_name,
    username: user.username,
    password: '',
    role: user.role,
    telegram_chat_id: user.telegram_chat_id || '',
  };
  showModal.value = true;
}

async function handleSave() {
  saving.value = true;

  try {
    if (editingUser.value) {
      const data: Record<string, unknown> = {
        full_name: formData.value.full_name,
        role: formData.value.role,
      };
      if (formData.value.password) {
        data.password = formData.value.password;
      }
      await api.put(`/users/${editingUser.value.id}`, data);
      toast.success('کاربر با موفقیت به‌روزرسانی شد');
    } else {
      await api.post('/users', {
        full_name: formData.value.full_name,
        username: formData.value.username,
        password: formData.value.password,
        role: formData.value.role,
        telegram_chat_id: formData.value.telegram_chat_id || undefined,
      });
      toast.success('کاربر با موفقیت ایجاد شد');
    }
    showModal.value = false;
    await fetchUsers();
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در ذخیره کاربر');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(user: User) {
  if (!confirm(`آیا از حذف کاربر «${user.full_name}» اطمینان دارید؟`)) return;

  try {
    await api.delete(`/users/${user.id}`);
    toast.success('کاربر با موفقیت حذف شد');
    await fetchUsers();
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در حذف کاربر');
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const roleLabels: Record<string, string> = {
  admin: 'مدیر سیستم',
  manager: 'مدیر',
  support: 'پشتیبان',
  customer: 'مشتری',
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200',
  support: 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-200',
  customer: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">مدیریت کاربران</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          {{ users.length }} کاربر{{ isFiltering ? ' (نتیجه فیلتر)' : '' }}
        </p>
      </div>
      <button @click="openCreateModal" class="btn-primary">
        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        کاربر جدید
      </button>
    </div>

    <!-- Users Table -->
    <div class="card">
      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-2 mb-5">
        <div class="relative flex-1">
          <svg
            class="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="search"
            type="text"
            class="input-field pr-9"
            placeholder="جستجوی نام یا نام کاربری..."
          />
        </div>
        <select v-model="roleFilter" class="input-field sm:w-44">
          <option value="">همه نقش‌ها</option>
          <option v-for="r in roles" :key="r.id" :value="r.name">{{ r.label }}</option>
        </select>
        <button v-if="isFiltering" @click="clearFilters" class="btn-secondary whitespace-nowrap">
          حذف فیلتر
        </button>
      </div>

      <div v-if="loading" class="text-center py-12">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[560px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">نام</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">نام کاربری</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">نقش</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">تاریخ ایجاد</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
              class="border-b border-gray-100 dark:border-gray-700/60"
            >
              <td class="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">{{ user.full_name }}</td>
              <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{{ user.username }}</td>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="roleColors[user.role]"
                >
                  {{ roleLabels[user.role] }}
                </span>
              </td>
              <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(user.created_at) }}</td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <button
                    v-if="canAssignTodo() && user.role !== 'customer'"
                    @click="openAssignModal(user)"
                    class="text-green-600 hover:text-green-700 text-sm dark:text-green-400 dark:hover:text-green-300"
                  >
                    وظیفه
                  </button>
                  <button
                    @click="openEditModal(user)"
                    class="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    ویرایش
                  </button>
                  <button
                    @click="handleDelete(user)"
                    class="text-red-600 hover:text-red-700 text-sm"
                  >
                    حذف
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="5" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                کاربری با این مشخصات یافت نشد
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
          {{ editingUser ? 'ویرایش کاربر' : 'ایجاد کاربر جدید' }}
        </h3>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">نام و نام خانوادگی</label>
            <input v-model="formData.full_name" type="text" required class="input-field" />
          </div>

          <div v-if="!editingUser">
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">نام کاربری</label>
            <input v-model="formData.username" type="text" required class="input-field" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              {{ editingUser ? 'رمز عبور (خالی برای عدم تغییر)' : 'رمز عبور' }}
            </label>
            <input
              v-model="formData.password"
              type="password"
              :required="!editingUser"
              class="input-field"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">نقش</label>
            <select v-model="formData.role" class="input-field">
              <option v-for="r in assignableRoles" :key="r.id" :value="r.name">
                {{ r.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">شناسه چت تلگرام (اختیاری)</label>
            <input v-model="formData.telegram_chat_id" type="text" class="input-field" />
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

    <!-- Assign a to-do task to this user -->
    <AssignTodoModal
      :show="showAssignModal"
      :target-user="assignTarget"
      @close="showAssignModal = false"
      @assigned="handleAssigned"
    />
  </div>
</template>
