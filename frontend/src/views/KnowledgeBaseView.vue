<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import api, { getApiErrorMessage, type KbArticle, type KbStats, type Category } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { useRole } from '@/composables/useRole';

const toast = useToast();
const role = useRole();

const items = ref<KbArticle[]>([]);
const categories = ref<Category[]>([]);
const stats = ref<KbStats>({ total: 0, published: 0, drafts: 0, views: 0 });
const loading = ref(true);

// Filters
const search = ref('');
const categoryFilter = ref('');
const tagFilter = ref('');
const includeDrafts = ref(false);

// Detail panel
const selected = ref<KbArticle | null>(null);
const loadingDetail = ref(false);

// Editor modal
const showEditor = ref(false);
const editing = ref<KbArticle | null>(null);
const saving = ref(false);
const form = ref({
  title: '',
  body: '',
  category_id: '',
  tags: '',
  is_published: true,
});

const canManageKb = computed(() => role.canManageKb());

let searchTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  await Promise.all([fetchArticles(), fetchCategories()]);
});

// جستجوی زنده با تأخیر کوتاه
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchArticles(), 300);
});

async function fetchArticles() {
  loading.value = true;
  try {
    const response = await api.get('/kb', {
      params: {
        search: search.value.trim() || undefined,
        category: categoryFilter.value || undefined,
        tag: tagFilter.value || undefined,
        include_unpublished: includeDrafts.value ? '1' : undefined,
      },
    });
    items.value = response.data.data.items;
    stats.value = response.data.data.stats;
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, 'خطا در بارگذاری مقالات'));
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const response = await api.get('/categories');
    categories.value = response.data.data;
  } catch {
    // فیلتر دسته‌بندی اختیاری است؛ در صورت خطا نادیده گرفته می‌شود
  }
}

async function openArticle(article: KbArticle) {
  loadingDetail.value = true;
  selected.value = article;
  try {
    const response = await api.get(`/kb/${article.id}`);
    selected.value = response.data.data;
    // شمارنده بازدید در سرور افزایش یافته است
    const inList = items.value.find((a) => a.id === article.id);
    if (inList) inList.views = response.data.data.views;
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, 'خطا در بارگذاری مقاله'));
    selected.value = null;
  } finally {
    loadingDetail.value = false;
  }
}

function closeArticle() {
  selected.value = null;
}

function filterByTag(tag: string) {
  tagFilter.value = tag;
  selected.value = null;
  fetchArticles();
}

function clearFilters() {
  search.value = '';
  categoryFilter.value = '';
  tagFilter.value = '';
  includeDrafts.value = false;
  fetchArticles();
}

const hasFilters = computed(
  () =>
    !!search.value.trim() ||
    !!categoryFilter.value ||
    !!tagFilter.value ||
    includeDrafts.value
);

function openCreateModal() {
  editing.value = null;
  form.value = { title: '', body: '', category_id: '', tags: '', is_published: true };
  showEditor.value = true;
}

function openEditModal(article: KbArticle) {
  editing.value = article;
  form.value = {
    title: article.title,
    body: article.body,
    category_id: article.category_id ? String(article.category_id) : '',
    tags: article.tags || '',
    is_published: !!article.is_published,
  };
  showEditor.value = true;
}

async function handleSave() {
  if (form.value.title.trim().length < 3) {
    toast.error('عنوان مقاله باید حداقل ۳ کاراکتر باشد');
    return;
  }
  if (!form.value.body.trim()) {
    toast.error('متن مقاله را وارد کنید');
    return;
  }

  saving.value = true;
  const payload = {
    title: form.value.title.trim(),
    body: form.value.body,
    category_id: form.value.category_id ? Number(form.value.category_id) : null,
    tags: form.value.tags.trim() || null,
    is_published: form.value.is_published,
  };

  try {
    if (editing.value) {
      await api.put(`/kb/${editing.value.id}`, payload);
      toast.success('مقاله با موفقیت به‌روزرسانی شد');
    } else {
      await api.post('/kb', payload);
      toast.success('مقاله با موفقیت ایجاد شد');
    }
    showEditor.value = false;
    await fetchArticles();

    // اگر مقاله باز همان مقاله ویرایش‌شده بود، دوباره بارگذاری شود
    if (editing.value && selected.value?.id === editing.value.id) {
      const response = await api.get(`/kb/${editing.value.id}`);
      selected.value = response.data.data;
    }
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, 'خطا در ذخیره مقاله'));
  } finally {
    saving.value = false;
  }
}

async function handleDelete(article: KbArticle) {
  if (!confirm(`آیا از حذف مقاله «${article.title}» اطمینان دارید؟`)) return;

  try {
    await api.delete(`/kb/${article.id}`);
    toast.success('مقاله با موفقیت حذف شد');
    if (selected.value?.id === article.id) selected.value = null;
    await fetchArticles();
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, 'خطا در حذف مقاله'));
  }
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function excerpt(body: string): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? `${clean.slice(0, 160)}…` : clean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-start justify-between mb-6 gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">پایگاه دانش</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          راهنماها و پاسخ پرسش‌های پرتکرار — {{ stats.published }} مقاله منتشرشده
        </p>
      </div>
      <button v-if="canManageKb" @click="openCreateModal" class="btn-primary whitespace-nowrap">
        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        مقاله جدید
      </button>
    </div>

    <!-- Stats (برای مدیران پایگاه دانش) -->
    <div v-if="canManageKb" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="card !p-4 text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ stats.total }}</p>
        <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">کل مقالات</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-2xl font-bold text-green-500">{{ stats.published }}</p>
        <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">منتشرشده</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-2xl font-bold text-orange-500">{{ stats.drafts }}</p>
        <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">پیش‌نویس</p>
      </div>
      <div class="card !p-4 text-center">
        <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ stats.views }}</p>
        <p class="text-xs text-gray-500 mt-1 dark:text-gray-400">بازدید کل</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <input
            v-model="search"
            type="text"
            class="input-field pr-10"
            placeholder="جستجو در عنوان، متن و برچسب‌ها..."
          />
          <svg
            class="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <select v-model="categoryFilter" @change="fetchArticles()" class="input-field sm:w-56">
          <option value="">همه دسته‌بندی‌ها</option>
          <option v-for="category in categories" :key="category.id" :value="String(category.id)">
            {{ category.name }}
          </option>
        </select>
        <label
          v-if="canManageKb"
          class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap px-1"
        >
          <input v-model="includeDrafts" @change="fetchArticles()" type="checkbox" class="rounded" />
          نمایش پیش‌نویس‌ها
        </label>
      </div>

      <div v-if="hasFilters" class="flex flex-wrap items-center gap-2 mt-3">
        <span v-if="tagFilter" class="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          برچسب: {{ tagFilter }}
        </span>
        <button @click="clearFilters" class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          پاک کردن فیلترها
        </button>
      </div>
    </div>

    <!-- Detail view -->
    <div v-if="selected" class="card">
      <div class="flex items-start justify-between gap-3 mb-4">
        <button @click="closeArticle" class="btn-secondary text-sm whitespace-nowrap">
          ← بازگشت به فهرست
        </button>
        <div v-if="canManageKb" class="flex items-center gap-2">
          <button @click="openEditModal(selected)" class="text-primary-600 hover:text-primary-700 text-sm">
            ویرایش
          </button>
          <button @click="handleDelete(selected)" class="text-red-600 hover:text-red-700 text-sm">
            حذف
          </button>
        </div>
      </div>

      <div v-if="loadingDetail" class="text-center py-8">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <template v-else>
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span
            v-if="!selected.is_published"
            class="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
          >
            پیش‌نویس
          </span>
          <span
            v-if="selected.category_name"
            class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            {{ selected.category_name }}
          </span>
        </div>

        <h2 class="text-xl font-bold text-gray-900 mb-2 dark:text-gray-100">{{ selected.title }}</h2>
        <div class="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mb-4">
          <span v-if="selected.created_by_name">✍️ {{ selected.created_by_name }}</span>
          <span>آخرین به‌روزرسانی: {{ formatDate(selected.updated_at) }}</span>
          <span>👁 {{ selected.views }} بازدید</span>
        </div>

        <div class="text-sm leading-7 text-gray-700 whitespace-pre-wrap dark:text-gray-200">{{ selected.body }}</div>

        <div v-if="parseTags(selected.tags).length" class="flex flex-wrap gap-2 mt-6">
          <button
            v-for="tag in parseTags(selected.tags)"
            :key="tag"
            @click="filterByTag(tag)"
            class="text-[11px] px-2 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300"
          >
            #{{ tag }}
          </button>
        </div>
      </template>
    </div>

    <!-- Article list -->
    <div v-else>
      <div v-if="loading" class="text-center py-12">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else-if="items.length === 0" class="card text-center py-12">
        <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {{ hasFilters ? 'مقاله‌ای با این فیلترها یافت نشد' : 'هنوز مقاله‌ای در پایگاه دانش ثبت نشده است' }}
        </p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article
          v-for="article in items"
          :key="article.id"
          class="card cursor-pointer hover:shadow-md transition-shadow"
          @click="openArticle(article)"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              v-if="!article.is_published"
              class="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
            >
              پیش‌نویس
            </span>
            <span
              v-if="article.category_name"
              class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {{ article.category_name }}
            </span>
          </div>

          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ article.title }}</h3>
          <p class="text-sm text-gray-500 mt-2 dark:text-gray-400">{{ excerpt(article.body) }}</p>

          <div class="flex flex-wrap items-center justify-between gap-2 mt-4">
            <div class="flex flex-wrap gap-1">
              <span
                v-for="tag in parseTags(article.tags).slice(0, 3)"
                :key="tag"
                @click.stop="filterByTag(tag)"
                class="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300"
              >
                #{{ tag }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span>👁 {{ article.views }}</span>
              <span>{{ formatDate(article.updated_at) }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <div
      v-if="showEditor"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">
          {{ editing ? 'ویرایش مقاله' : 'مقاله جدید' }}
        </h3>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">عنوان</label>
            <input v-model="form.title" type="text" required maxlength="200" class="input-field" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">دسته‌بندی</label>
              <select v-model="form.category_id" class="input-field">
                <option value="">بدون دسته‌بندی</option>
                <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                برچسب‌ها (با کاما جدا کنید)
              </label>
              <input v-model="form.tags" type="text" maxlength="300" class="input-field" placeholder="نصب,شبکه" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">متن مقاله</label>
            <textarea v-model="form.body" rows="12" required class="input-field" placeholder="متن کامل راهنما..."></textarea>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="form.is_published" type="checkbox" class="rounded" />
            انتشار برای کاربران (در صورت غیرفعال بودن، فقط برای مدیران پایگاه دانش نمایش داده می‌شود)
          </label>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showEditor = false" class="btn-secondary">لغو</button>
            <button type="submit" :disabled="saving" class="btn-primary">
              {{ saving ? 'در حال ذخیره...' : 'ذخیره' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
