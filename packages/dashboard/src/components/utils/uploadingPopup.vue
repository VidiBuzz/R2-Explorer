<template>
  <div v-if="Object.keys(mainStore.uploadingFiles).length > 0" class="uploading-popup">
    <div class="card">
      <div class="card-header d-flex flex-row">
        Uploading {{ Object.keys(mainStore.uploadingFiles).length }} files
        <button class="btn btn-primary btn-xs btn-close" @click="close"></button>
      </div>
      <div class="card-body">
        <table class="upload-table">
          <tbody>
          <tr class="table-active" v-for="(data, filename) in mainStore.uploadingFiles" :key="filename">
            <td class="progress-filename">
              <div class="filename-text">{{ filename }}</div>
              <div class="file-size-text" v-if="data.fileSize">{{ formatFileSize(data.fileSize) }}</div>
            </td>
            <td class="progress-cell">
              <div v-if="data.progress === 100" class="upload-complete">
                <i class="bi bi-check-circle-fill"></i> Complete
              </div>
              <div v-else>
                <div class="progress-info">
                  <span class="progress-percent">{{ Math.round(data.progress || 0) }}%</span>
                  <span v-if="data.totalParts > 1" class="progress-parts">
                    (Part {{ data.completedParts || 0 }}/{{ data.totalParts }})
                  </span>
                </div>
                <div class="progress">
                  <div class="progress-bar bg-success progress-bar-striped progress-bar-animated" role="progressbar"
                       :aria-valuenow="data.progress || 0" aria-valuemin="0" aria-valuemax="100"
                       :style="{ 'width': `${data.progress || 0}%` }"></div>
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { useMainStore } from "stores/main-store";

export default {
	setup() {
		const mainStore = useMainStore();
		return { mainStore };
	},
	methods: {
		close: function () {
			this.mainStore.clearUploadingFiles();
		},
		formatFileSize(bytes) {
			if (bytes === 0) return '0 Bytes';
			const k = 1024;
			const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
		}
	},
};
</script>

<style scoped lang="scss">
.uploading-popup {
  position: fixed;
  bottom: 0;
  right: 1em;
  // width: 25vw;
  z-index: 10;

  .card {
    overflow: auto;
    display: block;
    max-height: 30vh;
    margin-bottom: 0;
  }

  .card-body {
    border-left: 1px solid #F3F4F6;
  }

  .card-header {
    background-color: #38414A;
    color: #fff;
  }

  .upload-table {
    width: 100%;
    margin: 0;
  }

  .progress {
    height: 20px;
    margin-top: 4px;
  }

  .progress-filename {
    padding: 8px;
    min-width: 200px;
  }

  .filename-text {
    font-weight: 500;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .file-size-text {
    font-size: 0.85em;
    color: #6c757d;
    margin-top: 2px;
  }

  .progress-cell {
    padding: 8px;
    min-width: 180px;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 0.9em;
  }

  .progress-percent {
    font-weight: 600;
    color: #28a745;
  }

  .progress-parts {
    color: #6c757d;
    font-size: 0.85em;
  }

  .btn-close {
    margin-right: 0;
    margin-left: auto;
  }

  .upload-complete {
    text-align: center;
    color: #28a745;
    font-weight: 500;
  }
}
</style>
