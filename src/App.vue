<script setup lang="ts">
import { isSupabaseConfigured } from '@/lib/supabase'
</script>

<template>
  <!-- Mobile-first: ontworpen op ~390px, gecentreerd met max-width op desktop. -->
  <div class="mx-auto min-h-dvh w-full max-w-[430px] bg-ink-900">
    <p
      v-if="!isSupabaseConfigured"
      class="bg-danger-500/15 px-4 py-2 text-center text-xs text-danger-500"
    >
      Supabase niet geconfigureerd — vul <code>.env.local</code> (zie SETUP.md).
    </p>
    <RouterView />
  </div>
</template>
