<template>
  <div class="translation-view-container">
    <h1 class="text-2xl font-bold mb-6">翻译下载</h1>

    <el-card class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">翻译配置</h2>
        </div>
      </template>

      <el-form label-width="100px" label-position="left">
        <el-form-item label="项目">
          <el-select
            v-model="selectedProjectId"
            placeholder="请选择项目"
            filterable
            @change="handleProjectChange"
            style="width: 100%"
          >
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="语言">
          <el-select
            v-model="selectedLanguageId"
            placeholder="请选择语言"
            filterable
            :disabled="!selectedProjectId"
            @change="handleLanguageChange"
            style="width: 100%"
          >
            <el-option
              v-for="language in targetLanguagesArray"
              :key="language.id"
              :label="`${language.name} (${language.id})`"
              :value="language.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="文件">
          <el-select
            v-model="selectedFileId"
            placeholder="请选择文件（可选）"
            filterable
            clearable
            :disabled="!selectedProjectId"
            @change="handleFileChange"
            style="width: 100%"
          >
            <el-option
              v-for="file in filesArray"
              :key="file.id"
              :label="`${file.name} (${file.type})`"
              :value="file.id"
            />
          </el-select>
          <div class="mt-2 text-gray-500 text-sm">
            选择文件将下载单个文件翻译，不选择将下载整个项目翻译
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :disabled="!canDownload"
            :loading="loading"
            @click="handleDownload"
          >
            获取翻译
          </el-button>
          <el-button @click="handleSaveTranslation"
            >加工并保存JSON文件</el-button
          >
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="error" class="mb-6 error-card">
      <template #header>
        <div class="card-header text-red-500">
          <h2 class="text-lg font-medium">错误信息</h2>
        </div>
      </template>
      <div class="error-message">{{ error }}</div>
    </el-card>

    <!-- 下载链接卡片 -->
    <el-card v-if="downloadUrl" class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">项目翻译下载链接</h2>
        </div>
      </template>
      <div class="download-link-container">
        <p class="mb-3">项目翻译文件已准备就绪，请点击下面的链接下载：</p>
        <el-link type="primary" :href="downloadUrl" target="_blank">
          下载翻译文件 <el-icon><Download /></el-icon>
        </el-link>
        <div class="mt-3 text-gray-500">
          <el-alert type="warning" :closable="false">
            注意：此下载链接有有效期限制，请尽快下载
          </el-alert>
        </div>
      </div>
    </el-card>

    <!-- 翻译内容预览卡片 -->
    <el-card v-if="translation" class="mb-6">
      <template #header>
        <div class="card-header">
          <h2 class="text-lg font-medium">翻译内容预览</h2>
          <el-button type="primary" @click="handleSaveJson" size="small">
            保存原始JSON数据
          </el-button>
        </div>
      </template>
      <div class="translation-preview">
        <el-tabs>
          <el-tab-pane label="元数据">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="下载时间">
                {{ formatDate(translation.metadata.downloadedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="语言代码">
                {{ translation.metadata.languageCode }}
              </el-descriptions-item>
              <el-descriptions-item label="项目ID">
                {{ translation.metadata.projectId }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="translation.metadata.fileId"
                label="文件ID"
              >
                {{ translation.metadata.fileId }}
              </el-descriptions-item>
              <el-descriptions-item label="版本">
                {{ translation.metadata.version }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="内容">
            <pre class="json-preview">{{
              formatJson(translation.content)
            }}</pre>
          </el-tab-pane>

          <el-tab-pane label="原始数据">
            <pre class="json-preview">{{
              formatJson(translation.original)
            }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { Download } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useCrowdinStore } from "@/stores/crowdin";
import type { FileInfo, LanguageInfo } from "@/types";

const crowdinStore = useCrowdinStore();

const {
  projects,
  selectedProject,
  files,
  languages,
  selectedFile,
  selectedLanguage,
  translation,
  downloadUrl,
  loading,
  error,
  targetLanguages,
  fetchProjects,
  selectProject,
  selectFile,
  selectLanguage,
  downloadFileTranslation,
  downloadProjectTranslation,
  reset,
} = crowdinStore;

// 本地状态
const selectedProjectId = ref<number | null>(null);
const selectedLanguageId = ref<string | null>(null);
const selectedFileId = ref<number | null>(null);

// 计算属性
const canDownload = computed(() => {
  return selectedProjectId.value && selectedLanguageId.value;
});

const targetLanguagesArray = computed(() => {
  return crowdinStore.targetLanguages;
});

const filesArray = computed(() => {
  return crowdinStore.files;
});

// 方法
async function init() {
  if (projects.length === 0) {
    await fetchProjects();
  }

  // 如果已经选择了项目，更新本地状态
  if (selectedProject && selectedProject.value) {
    selectedProjectId.value = selectedProject.value.id;
  }

  // 如果已经选择了语言，更新本地状态
  if (selectedLanguage && selectedLanguage.value) {
    selectedLanguageId.value = selectedLanguage.value.id;
  }

  // 如果已经选择了文件，更新本地状态
  if (selectedFile && selectedFile.value) {
    selectedFileId.value = selectedFile.value.id;
  }
}

function handleProjectChange(projectId: number) {
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    selectProject(project);
    selectedLanguageId.value = null;
    selectedFileId.value = null;
  }
}

function handleLanguageChange(languageId: string) {
  const language = languages.find((l) => l.id === languageId);
  if (language) {
    selectLanguage(language);
  }
}

function handleFileChange(fileId: number | null) {
  if (fileId) {
    const file = filesArray.value.find((f) => f.id === fileId);
    if (file) {
      selectFile(file);
    }
  } else {
    // 清除文件选择
    selectedFile.value = null;
  }
}

async function handleDownload() {
  if (!selectedProjectId.value || !selectedLanguageId.value) {
    ElMessage.warning("请选择项目和语言");
    return;
  }

  if (selectedFileId.value) {
    // 下载文件翻译
    await downloadFileTranslation();
    console.log("downloadFileTranslation 完成");
  } else {
    // 下载项目翻译
    await downloadProjectTranslation();
  }

  if (error && error.value) {
    ElMessage.error(error.value);
  } else if (
    (translation && translation.value) ||
    (downloadUrl && downloadUrl.value)
  ) {
    ElMessage.success("翻译下载成功");
  }
}

function resetForm() {
  selectedProjectId.value = null;
  selectedLanguageId.value = null;
  selectedFileId.value = null;
  reset();
}

function handleSaveTranslation() {
  // 如果翻译成功，创建下载链接
  if (crowdinStore.translation) {
    const { content } = crowdinStore.translation;
    if (content && content.length > 0) {
      const translate = {};
      content.forEach((item) => {
        translate[item.key] = item.value;
      });
      const jsonString = JSON.stringify(translate, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // 创建下载元素
      const a = document.createElement("a");
      a.href = url;
      a.download = `translation_${selectedLanguage.value?.id}_file_${selectedFile.value?.id}.json`;
      document.body.appendChild(a);
      a.click();

      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("zh-CN");
}

function formatJson(json: Record<string, any>): string {
  return JSON.stringify(json, null, 2);
}

function handleSaveJson() {
  if (!crowdinStore.translation) return;
  if (!crowdinStore.translation.original) return;
  const jsonString = JSON.stringify(crowdinStore.translation.original, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // 创建下载元素
  const a = document.createElement("a");
  a.href = url;
  a.download = `original_${selectedLanguage.value?.id}_file_${selectedFile.value?.id}.json`;
  document.body.appendChild(a);
  a.click();

  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  ElMessage.success("JSON文件已保存");
}

// 初始化
onMounted(() => {
  init();
});
</script>

<style scoped>
.translation-view-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.json-preview {
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
  font-family: "Courier New", Courier, monospace;
  white-space: pre-wrap;
}

.error-card {
  border-color: #f56c6c;
}

.error-message {
  color: #f56c6c;
  font-weight: bold;
}

.download-link-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}
</style>
