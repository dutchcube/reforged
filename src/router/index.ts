import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
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
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init() // wacht op de eerste getSession(), anders flitst /login op refresh

  if (!to.meta.public && !auth.user) return { name: 'login' }
  if (to.name === 'login' && auth.user) return { name: 'home' }
  return true
})

export default router
