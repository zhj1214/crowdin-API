<template>
  <div class="project-view-container">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>
    
    <template v-else-if="hasProject">
      <div class="project-header">
        <el-page-header @back="goBack" :title="selectedProject?.name">
          <template #content>
            <span class="text-lg font-medium">项目详情</span>
          </template>
        </el-page-header>
      </div>
      
      <el-divider />
      
      <el-descriptions title="项目信息" :column="2" border>
        <el-descriptions-item label="项目 ID">{{ selectedProject?.id }}</el-descriptions-item>
        <el-descriptions-item label="标识符">{{ selectedProject?.identifier }}</el-descriptions-item>
        <el-descriptions-item label="源语言">{{ selectedProject?.sourceLanguageId }}</el-descriptions-item>
        <el-descriptions-item label="目标语言">
          {{ selectedProject?.targetLanguageIds.join(', ') }}
        </el-descriptions-item>
        <el-descriptions-item label="公开状态">
          <el-tag :type="selectedProject?.public ? 'success' : 'info'">
            {{ selectedProject?.public ? '公开' : '私有' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ selectedProject?.description || '无描述' }}
        </el-descriptions-item>
      </el-descriptions>
      
      <div class="mt-6">
        <el-tabs>
          <el-tab-pane label="文件列表">
            <el-table 
              :data="files" 
              style="width: 100%" 
              v-loading="loading"
              border
            >
              <el-table-column prop="id" label="ID" width="100" />
              <el-table-column prop="name" label="文件名" />
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column prop="path" label="路径" />
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="goToFileTranslation(row)"
                  >
                    翻译
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="语言列表">
            <el-table 
              :data="languages" 
              style="width: 100%" 
              v-loading="loading"
              border
            >
              <el-table-column prop="id" label="语言 ID" width="150" />
              <el-table-column prop="name" label="语言名称" />
              <el-table-column prop="localeCode" label="区域代码" width="120" />
              <el-table-column prop="isSource" label="源语言" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.isSource ? 'success' : 'info'">
                    {{ row.isSource ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
    
    <el-result 
      v-else
      icon="error"
      title="未找到项目"
      sub-title="无法加载项目信息，请返回首页重试"
    >
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCrowdinStore } from '@/stores/crowdin';
import type { FileInfo } from '@/types';

const router = useRouter();
const route = useRoute();
const crowdinStore = useCrowdinStore();

const { 
  projects, 
  selectedProject, 
  files, 
  languages, 
  loading, 
  hasProject,
  fetchProjects, 
  fetchProjectFiles, 
  fetchProjectLanguages,
  selectProject,
  selectFile
} = crowdinStore;

// 获取路由中的项目ID
const projectId = Number(route.params.id);

// 加载项目详情
async function loadProjectDetails() {
  // 如果没有项目列表，先获取项目列表
  if (projects.length === 0) {
    await fetchProjects();
  }
  
  // 查找当前项目
  const project = projects.find(p => p.id === projectId);
  
  if (project) {
    selectProject(project);
  }
}

// 跳转到文件翻译页面
function goToFileTranslation(file: FileInfo) {
  selectFile(file);
  router.push({ name: 'Translation' });
}

// 返回上一页
function goBack() {
  router.go(-1);
}

// 返回首页
function goHome() {
  router.push({ name: 'Dashboard' });
}

// 监听路由参数变化
watch(() => route.params.id, (newId) => {
  if (newId && Number(newId) !== selectedProject?.id) {
    loadProjectDetails();
  }
});

// 组件挂载时加载项目详情
onMounted(() => {
  loadProjectDetails();
});
</script>

<style scoped>
.project-view-container {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  padding: 20px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style> 