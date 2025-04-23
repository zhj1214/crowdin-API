<template>
  <div class="dashboard-container">
    <h1 class="text-2xl font-bold mb-6">Crowdin 翻译工具</h1>
    
    <el-card class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">功能介绍</h2>
        </div>
      </template>
      <div class="card-content">
        <p class="mb-3">本工具可以帮助您方便地下载和管理 Crowdin 平台上的翻译内容。</p>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card shadow="hover" class="feature-card">
              <h3 class="text-md font-bold mb-2">项目管理</h3>
              <p>浏览和管理您的 Crowdin 项目列表</p>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="feature-card">
              <h3 class="text-md font-bold mb-2">文件翻译</h3>
              <p>下载特定文件的翻译内容并以 JSON 格式保存</p>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="feature-card">
              <h3 class="text-md font-bold mb-2">项目翻译</h3>
              <p>下载整个项目的翻译内容打包文件</p>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <el-card>
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">项目列表</h2>
          <el-button type="primary" @click="loadProjects" :loading="loading">刷新列表</el-button>
        </div>
      </template>
      <div class="card-content">
        <el-table
          v-if="projects.length > 0"
          :data="projects"
          style="width: 100%"
          stripe
          border
          v-loading="loading"
        >
          <el-table-column prop="id" label="项目 ID" width="100" />
          <el-table-column prop="name" label="项目名称" />
          <el-table-column prop="identifier" label="标识符" width="150" />
          <el-table-column prop="sourceLanguageId" label="源语言" width="120" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewProject(row)">查看</el-button>
              <el-button type="success" size="small" @click="goToTranslation(row)">翻译</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else-if="!loading" description="暂无项目数据" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useCrowdinStore } from '@/stores/crowdin';
import type { ProjectInfo } from '@/types';

const router = useRouter();
const crowdinStore = useCrowdinStore();

const { 
  projects, 
  loading, 
  error, 
  fetchProjects, 
  selectProject 
} = crowdinStore;

// 加载项目列表
async function loadProjects() {
  await fetchProjects();
  
  if (error) {
    ElMessage.error(error);
  }
}

// 查看项目详情
function viewProject(project: ProjectInfo) {
  router.push({ 
    name: 'Project', 
    params: { id: project.id } 
  });
}

// 前往翻译页面
function goToTranslation(project: ProjectInfo) {
  selectProject(project);
  router.push({ name: 'Translation' });
}

// 组件挂载时加载项目列表
onMounted(() => {
  loadProjects();
});
</script>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-card {
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style> 