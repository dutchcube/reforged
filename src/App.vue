<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useHistoryStore } from '@/stores/history'
import { useSessionStore } from '@/stores/session'
import { useWorkoutsStore } from '@/stores/workouts'

const route = useRoute()
const auth = useAuthStore()
const session = useSessionStore()
const workouts = useWorkoutsStore()
const history = useHistoryStore()

/** Weer online: verstuur wat offline is afgerond en haal de nieuwe stand op. */
async function onOnline() {
  if (!auth.user) return
  const sent = await session.flushPending()
  if (sent || workouts.offline || history.offline) {
    await Promise.all([workouts.fetchWorkouts(), history.fetchSessions()])
  }
}

onMounted(() => window.addEventListener('online', onOnline))
onBeforeUnmount(() => window.removeEventListener('online', onOnline))
</script>

<template>
  <!-- Mobile-first: ontworpen op ~390px, gecentreerd met max-width op desktop. -->
  <div class="mx-auto min-h-dvh w-full max-w-[430px] bg-ink-900 pt-[env(safe-area-inset-top)]">
    <p
      v-if="!isSupabaseConfigured"
      class="bg-danger-500/15 px-4 py-2 text-center text-xs text-danger-500"
    >
      Supabase niet geconfigureerd — vul <code>.env.local</code> (zie SETUP.md).
    </p>
    <!-- key: /run/a -> /run/b moet het scherm opnieuw opbouwen, niet hergebruiken -->
    <RouterView :key="route.path" />
    <TabBar v-if="route.meta.tabs" />
  </div>
</template>
