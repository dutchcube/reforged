<script setup lang="ts">
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import { isSupabaseConfigured } from '@/lib/supabase'

const route = useRoute()
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
