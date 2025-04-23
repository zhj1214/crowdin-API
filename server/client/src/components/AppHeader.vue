<template>
  <div class="header-container">
    <div class="header-logo" @click="goHome">
      <img src="@/assets/logo.svg" alt="Logo" class="h-8 w-auto" />
      <span class="ml-2 text-xl font-bold">Crowdin 翻译工具</span>
    </div>
    <div class="header-nav">
      <el-button type="text" @click="goHome" :class="{ active: isHome }">主页</el-button>
      <el-button type="text" @click="goTranslation" :class="{ active: isTranslation }">翻译下载</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// 计算当前路由
const isHome = computed(() => route.name === 'Dashboard');
const isTranslation = computed(() => route.name === 'Translation');

// 导航方法
function goHome() {
  router.push({ name: 'Dashboard' });
}

function goTranslation() {
  router.push({ name: 'Translation' });
}
</script>

<style scoped>
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 20px;
}

.header-logo {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.header-nav {
  display: flex;
  gap: 16px;
}

.el-button.active {
  font-weight: bold;
  border-bottom: 2px solid white;
}

.el-button--text {
  color: white;
}
</style> 