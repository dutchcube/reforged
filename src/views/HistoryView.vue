<script setup lang="ts">
import { onMounted } from 'vue'
import SessionCard from '@/components/SessionCard.vue'
import { formatDay } from '@/lib/format'
import { useHistoryStore } from '@/stores/history'
import type { Session } from '@/lib/types'

const history = useHistoryStore()

onMounted(() => history.fetchSessions())

async function remove(session: Session) {
  const label = `${session.workout_name} van ${formatDay(session.completed_at).toLowerCase()}`
  if (!confirm(`Sessie "${label}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
  await history.deleteSession(session.id)
}
</script>

<template>
  <main class="px-4 pt-6 pb-28">
    <header class="mb-6">
      <h1 class="text-2xl font-bold">Historie</h1>
      <p v-if="history.loaded" class="tabular text-xs text-ink-400">
        {{ history.sessions.length }}
        {{ history.sessions.length === 1 ? 'voltooide sessie' : 'voltooide sessies' }}
      </p>
    </header>

    <p v-if="history.error" class="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-500">
      {{ history.error }}
    </p>

    <div v-if="history.loading && !history.loaded" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card h-32 animate-pulse opacity-50" />
    </div>

    <div v-else-if="history.sessions.length" class="space-y-3">
      <SessionCard
        v-for="s in history.sessions"
        :key="s.id"
        :session="s"
        detailed
        @remove="remove(s)"
      />
    </div>

    <div v-else class="card p-8 text-center">
      <p class="font-display text-lg font-semibold">Nog geen sessies</p>
      <p class="mt-1 text-sm text-ink-400">Rond je eerste workout af, dan staat hij hier.</p>
    </div>
  </main>
</template>
