<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api, { type Role, type PermissionDef } from '@/api/client';
import { useToast } from '@/composables/useToast';

const roles = ref<Role[]>([]);
const permissionsDefs = ref<PermissionDef[]>([]);
const loading = ref(true);
const toast = useToast();

// Modal state
const showModal = ref(false);
const editingRole = ref<Role | null>(null);
const formData = ref({
  name: '',
  label: '',
  permissions: [] as string[],
});
const saving = ref(false);

onMounted(async () => {
  try {
    const [rolesRes, permsRes] = await Promise.all([
      api.get('/roles'),
      api.get('/roles/permissions'),
    ]);
    roles.value = rolesRes.data.data;
    permissionsDefs.value = permsRes.data.data;
  } catch {
    toast.error('خطا در بارگذاری نقش‌ها');
  } finally {
    loading.value = false;
  }
});

function openCreateModal() {
  editingRole.value = null;
  formData.value = { name: '', label: '', permissions: [] };
  showModal.value = true;
}

function openEditModal(role: Role) {
  editingRole.value = role;
  formData.value = {
    name: role.name,
    label: role.label,
    permissions: [...role.permissions],
  };
  showModal.value = true;
}

function togglePermission(key: string) {
  const idx = formData.value.permissions.indexOf(key);
  if (idx >= 0) {
    formData.value.permissions.splice(idx, 1);
  } else {
    formData.value.permissions.push(key);
  }
}

async function handleSave() {
  if (!formData.value.name.trim() || !formData.value.label.trim()) {
    toast.error('نام و عنوان نقش الزامی است');
    return;
  }

  saving.value = true;
  try {
    if (editingRole.value) {
      await api.put(`/roles/${editingRole.value.id}`, {
        name: formData.value.name,
        label: formData.value.label,
        permissions: formData.value.permissions,
      });
      toast.success('نقش با موفقیت به‌روزرسانی شد');
    } else {
      await api.post('/roles', {
        name: formData.value.name,
        label: formData.value.label,
        permissions: formData.value.permissions,
      });
      toast.success('نقش با موفقیت ایجاد شد');
    }
    showModal.value = false;
    await fetchRoles();
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در ذخیره نقش');
  } finally {
    saving.value = false;
  }
}

async function fetchRoles() {
  const res = await api.get('/roles');
  roles.value = res.data.data;
}

async function handleDelete(role: Role) {
  if (role.is_system) {
    toast.error('نقش‌های سیستمی قابل حذف نیستند');
    return;
  }
  if (!confirm(`آیا از حذف نقش «${role.label}» اطمینان دارید؟`)) return;

  try {
    await api.delete(`/roles/${role.id}`);
    toast.success('نقش با موفقیت حذف شد');
    await fetchRoles();
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { error?: string } } };
    toast.error(apiError.response?.data?.error || 'خطا در حذف نقش');
  }
}

const permissionLabels: Record<string, string> = Object.fromEntries(
  permissionsDefs.value.map((p) => [p.key, p.label])
);
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">نقش‌ها و دسترسی‌ها</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          {{ roles.length }} نقش — تعیین دسترسی‌ها و ایجاد نقش‌های سفارشی
        </p>
      </div>
      <button @click="openCreateModal" class="btn-primary">
        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        نقش جدید
      </button>
    </div>

    <!-- Roles List -->
    <div class="card">
      <div v-if="loading" class="text-center py-12">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="role in roles"
          :key="role.id"
          class="p-4 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ role.label }}</h3>
                <code class="text-xs text-gray-400 dark:text-gray-500">{{ role.name }}</code>
                <span
                  v-if="role.is_system"
                  class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300"
                >
                  سیستمی
                </span>
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="perm in role.permissions"
                  :key="perm"
                  class="text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full dark:bg-primary-900/40 dark:text-primary-300"
                >
                  {{ permissionLabels[perm] || perm }}
                </span>
                <span v-if="role.permissions.length === 0" class="text-xs text-gray-400 dark:text-gray-500">
                  بدون دسترسی
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                @click="openEditModal(role)"
                class="text-primary-600 hover:text-primary-700 text-sm dark:text-primary-400 dark:hover:text-primary-300"
              >
                ویرایش
              </button>
              <button
                @click="handleDelete(role)"
                class="text-red-600 hover:text-red-700 text-sm dark:text-red-400 dark:hover:text-red-300"
                :class="{ 'opacity-40 cursor-not-allowed': !!role.is_system }"
                :disabled="!!role.is_system"
                :title="role.is_system ? 'نقش سیستمی قابل حذف نیست' : ''"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-lg dark:bg-gray-800">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
          {{ editingRole ? 'ویرایش نقش' : 'ایجاد نقش جدید' }}
        </h3>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">عنوان نقش</label>
            <input
              v-model="formData.label"
              type="text"
              required
              class="input-field"
              placeholder="مثلاً: مدیر فروش"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">نام داخلی نقش</label>
            <input
              v-model="formData.name"
              type="text"
              required
              :disabled="!!editingRole"
              class="input-field"
              placeholder="مثلاً: sales_manager"
            />
            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              فقط حروف انگلیسی کوچک، عدد و زیرخط — بعد از ایجاد قابل تغییر نیست
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">دسترسی‌ها</label>
            <div class="space-y-1.5 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 dark:border-gray-700">
              <label
                v-for="perm in permissionsDefs"
                :key="perm.key"
                class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  :checked="formData.permissions.includes(perm.key)"
                  @change="togglePermission(perm.key)"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {{ perm.label }}
                <code class="text-xs text-gray-400 dark:text-gray-500">{{ perm.key }}</code>
              </label>
            </div>
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