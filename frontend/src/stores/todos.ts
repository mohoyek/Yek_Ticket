import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/client';
import type { Todo, TodoStats } from '@/api/client';

export const useTodoStore = defineStore('todos', () => {
  const items = ref<Todo[]>([]);
  const stats = ref<TodoStats>({ total: 0, done: 0, pending: 0 });
  const loading = ref(false);
  const filter = ref<'all' | 'pending' | 'done'>('all');

  async function fetchTodos() {
    loading.value = true;
    try {
      const params: Record<string, string> = {};
      if (filter.value === 'pending') params.is_done = '0';
      if (filter.value === 'done') params.is_done = '1';

      const response = await api.get('/todos', { params });
      items.value = response.data.data.items;
      stats.value = response.data.data.stats;
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      loading.value = false;
    }
  }

  async function addTodo(title: string, dueDate?: string | null) {
    await api.post('/todos', {
      title,
      due_date: dueDate || null,
    });
    await fetchTodos();
  }

  async function toggleTodo(todo: Todo) {
    const response = await api.put(`/todos/${todo.id}`, {
      is_done: !todo.is_done,
    });
    const idx = items.value.findIndex((t) => t.id === todo.id);
    if (idx >= 0) items.value[idx] = response.data.data;
    // refresh lightweight stats
    await fetchTodos();
  }

  async function updateTodo(id: number, data: { title?: string; due_date?: string | null }) {
    await api.put(`/todos/${id}`, data);
    await fetchTodos();
  }

  async function deleteTodo(id: number) {
    const todo = items.value.find((t) => t.id === id);
    if (!todo) return;
    await api.delete(`/todos/${id}`);
    items.value = items.value.filter((t) => t.id !== id);
    stats.value = {
      ...stats.value,
      total: stats.value.total - 1,
      pending: stats.value.pending - (!todo.is_done ? 1 : 0),
      done: stats.value.done - (todo.is_done ? 1 : 0),
    };
  }

  function setFilter(f: 'all' | 'pending' | 'done') {
    filter.value = f;
  }

  return {
    items,
    stats,
    loading,
    filter,
    fetchTodos,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    setFilter,
  };
});
