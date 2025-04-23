import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/views/Dashboard.vue';
import ProjectView from '@/views/ProjectView.vue';
import TranslationView from '@/views/TranslationView.vue';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
  },
  {
    path: '/project/:id',
    name: 'Project',
    component: ProjectView,
    props: true,
  },
  {
    path: '/translation',
    name: 'Translation',
    component: TranslationView,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router; 