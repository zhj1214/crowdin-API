import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/services/api";
import type {
  ProjectInfo,
  FileInfo,
  LanguageInfo,
  EnhancedTranslation,
} from "@/types";

export const useCrowdinStore = defineStore("crowdin", () => {
  // 状态
  const projects = ref<ProjectInfo[]>([]);
  const selectedProject = ref<ProjectInfo | null>(null);
  const files = ref<FileInfo[]>([]);
  const languages = ref<LanguageInfo[]>([]);
  const selectedFile = ref<FileInfo | null>(null);
  const selectedLanguage = ref<LanguageInfo | null>(null);
  const translation = ref<EnhancedTranslation | null>(null);
  const downloadUrl = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // getter
  const hasProject = computed(() => selectedProject.value !== null);
  const hasFile = computed(() => selectedFile.value !== null);
  const hasLanguage = computed(() => selectedLanguage.value !== null);
  const hasTranslation = computed(() => translation.value !== null);
  const hasDownloadUrl = computed(() => downloadUrl.value !== null);
  const targetLanguages = computed(() =>
    languages.value.filter((lang) => !lang.isSource)
  );

  // 动作
  async function fetchProjects() {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.getProjects();

      if (response.success && response.data) {
        projects.value = response.data;
      } else {
        error.value = response.error || "获取项目列表失败";
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      console.log("fetchProjects 完成");

      loading.value = false;
    }
  }

  async function fetchProjectFiles(projectId: number) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.getProjectFiles(projectId);

      if (response.success && response.data) {
        files.value = response.data.map((e: any) => e.data);
      } else {
        error.value = response.error || "获取项目文件列表失败";
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      console.log("fetchProjectFiles 完成");
      loading.value = false;
    }
  }

  async function fetchProjectLanguages(projectId: number) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.getProjectLanguages(projectId);

      if (response.success && response.data) {
        languages.value = response.data;
      } else {
        error.value = response.error || "获取项目语言列表失败";
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      console.log("fetchProjectLanguages 完成");  
      loading.value = false;
    }
  }

  async function downloadFileTranslation() {
    if (
      !selectedProject.value ||
      !selectedFile.value ||
      !selectedLanguage.value
    ) {
      error.value = "请选择项目、文件和语言";
      console.error("downloadFileTranslation 失败,请选择项目、文件和语言");
      return;
    }

    loading.value = true;
    error.value = null;
    downloadUrl.value = null;
    translation.value = null;

    try {
      const response = await api.downloadFileTranslation({
        projectId: selectedProject.value.id,
        fileId: selectedFile.value.id,
        languageId: selectedLanguage.value.id,
      });

      if (response.success && response.data) {
        translation.value = response.data;
      } else {
        error.value = response.error || "下载文件翻译失败";
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      console.log("downloadFileTranslation 完成");
      loading.value = false;
    }
  }

  async function downloadProjectTranslation() {
    if (!selectedProject.value || !selectedLanguage.value) {
      error.value = "请选择项目和语言";
      return;
    }

    loading.value = true;
    error.value = null;
    downloadUrl.value = null;
    translation.value = null;

    try {
      const response = await api.downloadProjectTranslation({
        projectId: selectedProject.value.id,
        languageId: selectedLanguage.value.id,
      });

      if (response.success && response.data) {
        downloadUrl.value = response.data.downloadUrl;
      } else {
        error.value = response.error || "下载项目翻译失败";
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      console.log("downloadFileTranslation 完成");
      loading.value = false;
    }
  }

  function selectProject(project: ProjectInfo) {
    selectedProject.value = project;
    selectedFile.value = null;
    files.value = [];
    languages.value = [];
    translation.value = null;
    downloadUrl.value = null;

    // 加载项目文件和语言
    fetchProjectFiles(project.id);
    fetchProjectLanguages(project.id);
  }

  function selectFile(file: FileInfo) {
    selectedFile.value = file;
    translation.value = null;
  }

  function selectLanguage(language: LanguageInfo) {
    selectedLanguage.value = language;
    translation.value = null;
    downloadUrl.value = null;
  }

  function reset() {
    selectedProject.value = null;
    selectedFile.value = null;
    selectedLanguage.value = null;
    files.value = [];
    languages.value = [];
    translation.value = null;
    downloadUrl.value = null;
    error.value = null;
  }

  return {
    // 状态
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

    // getters
    hasProject,
    hasFile,
    hasLanguage,
    hasTranslation,
    hasDownloadUrl,
    targetLanguages,

    // 动作
    fetchProjects,
    fetchProjectFiles,
    fetchProjectLanguages,
    downloadFileTranslation,
    downloadProjectTranslation,
    selectProject,
    selectFile,
    selectLanguage,
    reset,
  };
});
