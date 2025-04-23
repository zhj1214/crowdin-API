<template>
  <div class="footer-container">
    Crowdin 翻译工具 &copy; {{ currentYear }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<style scoped>
.footer-container {
  font-size: 12px;
  color: #909399;
}
</style> 