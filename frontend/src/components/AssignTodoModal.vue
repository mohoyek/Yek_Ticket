<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import api, { getApiErrorMessage, type User } from '@/api/client';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  show: boolean;
  /** وقتی مقدار داشته باشد، مقصد قفل می‌شود (مثلاً «واگذاری وظیفه» از ستون عملیات کاربران) */
  targetUser?: User | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'assigned', payload: { user: User | null; title: string }): void;
}>();

const toast = useToast();

const staff = ref<User[]>([]);
const loadingStaff = ref(false);
const saving = ref(false);

const form = ref<{ user_id: number | ''; title: string; due_date: string }>({
  user_id: '',
  title: '',
  due_date: '',
});

const options = computed<User[]>(() => {
  if (props.targetUser && !staff.value.some((s) => s.id === props.targetUser!.id)) {
    return [props.targetUser, ...staff.value];
  }
  return staff.value;
});

watch(
  () => props.show,
  async (visible) => {
    if (!visible) return;
    form.value = {
      user_id: props.targetUser?.id ?? '',
      title: '',
      due_date: '',
    };
    if (staff.value.length === 0) {
      await fetchStaff();
    }
  }
);

async function fetchStaff() {
  loadingStaff.value = true;
  try {
    const response = await api.get('/todos/assignable-users');
    staff.value = response.data.data;
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'خطا در بارگذاری کارکنان'));
  } finally {
    loadingStaff.value = false;
  }
}

async function handleSubmit() {
  const userId = Number(form.value.user_id);
  if (!userId) {
    toast.error('کارمند مقصد را انتخاب کنید');
    return;
  }
  const title = form.value.title.trim();
  if (!title) {
    toast.error('عنوان وظیفه الزامی است');
    return;
  }

  saving.value = true;
  try {
    await api.post('/todos/assign', {
      user_id: userId,
      title,
      due_date: form.value.due_date || null,
    });
    const target = options.value.find((s) => s.id === userId) ?? null;
    emit('assigned', { user: target, title });
    emit('close');
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'خطا در واگذاری وظیفه'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-xl p-6 w-full max-w-md dark:bg-gray-800">
      <h3 class="text-lg font-semibold text-gray-900 mb-1 dark:text-gray-100">واگذاری وظیفه</h3>
      <p class="text-xs text-gray-500 mb-4 dark:text-gray-400">
        وظیفه به «کارهای روزانه» کارمند انتخابی اضافه می‌شود و برای او اعلان ارسال می‌گردد.
      </p>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">کارمند</label>
          <select
            v-model="form.user_id"
            class="input-field"
            :disabled="!!targetUser || loadingStaff"
          >
            <option value="" disabled>{{ loadingStaff ? 'در حال بارگذاری...' : 'انتخاب کنید' }}</option>
            <option v-for="s in options" :key="s.id" :value="s.id">
              {{ s.full_name }} ({{ s.role === 'support' ? 'پشتیبان' : s.role === 'manager' ? 'مدیر' : 'مدیر سیستم' }})
            </option>
          </select>
          <p v-if="loadingStaff" class="text-xs text-gray-400 mt-1 dark:text-gray-500">
            در حال بارگذاری کارکنان...
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">عنوان وظیفه</label>
          <input
            v-model="form.title"
            type="text"
            required
            maxlength="500"
            class="input-field"
            placeholder="مثلاً: بررسی تیکت‌های باز مشتریان کلیدی"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">سررسید (اختیاری)</label>
          <input v-model="form.due_date" type="date" class="input-field" />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" @click="emit('close')" class="btn-secondary">لغو</button>
          <button type="submit" :disabled="saving" class="btn-primary">
            {{ saving ? 'در حال واگذاری...' : 'واگذاری' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
