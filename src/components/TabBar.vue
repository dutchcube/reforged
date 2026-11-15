<script setup lang="ts">
import { RouterLink } from 'vue-router'

/** Iconen als SVG-pad (24×24, lijnstijl) zodat er geen icon-pakket nodig is. */
const tabs = [
  { name: 'home', label: 'Start', icon: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10' },
  { name: 'programs', label: "Programma's", icon: 'M3 12h2m14 0h2M6 7v10M18 7v10M9 9.5v5M15 9.5v5M9 12h6' },
  { name: 'history', label: 'Historie', icon: 'M4 6.5h16v13H4zM4 10.5h16M8 4v4M16 4v4' },
  { name: 'progress', label: 'Voortgang', icon: 'M4 18.5 9.5 12l4 3.5L20 7M15.5 7H20v4.5' },
  {
    name: 'settings',
    label: 'Instellingen',
    icon: 'M4 7.5h9m4 0h3M4 16.5h3m4 0h9M15 5v5M9 14v5',
  },
] as const
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-[430px] grid-cols-5 border-t border-ink-600/60
           bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    aria-label="Hoofdnavigatie"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="flex min-w-0 flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-ink-400 transition hover:text-ink-100"
      exact-active-class="!text-volt-500"
    >
      <svg
        class="size-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="tab.icon" />
      </svg>
      <span class="max-w-full truncate text-[10px] font-semibold tracking-wide">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>
