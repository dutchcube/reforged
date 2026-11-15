import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Toegankelijk zonder inloggen. */
    public?: boolean
    /** Toon de tabbalk onderin. */
    tabs?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // De vijf tabs
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { tabs: true } },
    {
      path: '/programs',
      name: 'programs',
      component: () => import('@/views/ProgramsView.vue'),
      meta: { tabs: true },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { tabs: true },
    },
    {
      path: '/progress',
      name: 'progress',
      component: () => import('@/views/ProgressView.vue'),
      meta: { tabs: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { tabs: true },
    },

    // Schermvullend, zonder tabbalk
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    { path: '/run/:workoutId', name: 'run', component: () => import('@/views/WorkoutRunView.vue') },
    { path: '/edit/:workoutId?', name: 'edit', component: () => import('@/views/WorkoutEditView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init() // wacht op de eerste getSession(), anders flitst /login op refresh

  if (!to.meta.public && !auth.user) return { name: 'login' }
  if (to.name === 'login' && auth.user) return { name: 'home' }
  return true
})

export default router
