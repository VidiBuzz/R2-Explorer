<template>
  <div v-if="Object.keys(mainStore.uploadingFiles).length > 0" class="uploading-popup">
    <div class="card">
      <div class="card-header d-flex flex-row">
        Uploading {{ Object.keys(mainStore.uploadingFiles).length }} files
        <button class="btn btn-warning btn-xs ms-2" @click="cancelAll" v-if="hasActiveUploads">Cancel All</button>
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
                <span v-if="data.duration" class="upload-duration">
                  ({{ formatDuration(data.duration) }})
                </span>
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
            <td class="cancel-cell" v-if="data.progress < 100">
              <button class="btn btn-danger btn-xs" @click="cancelUpload(filename)">
                <i class="bi bi-x-circle"></i>
              </button>
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
	computed: {
		hasActiveUploads() {
			return Object.values(this.mainStore.uploadingFiles).some(file => file.progress < 100);
		}
	},
	methods: {
		close: function () {
			this.mainStore.clearUploadingFiles();
		},
		cancelUpload(filename) {
			this.mainStore.cancelUpload(filename);
		},
		cancelAll() {
			this.mainStore.cancelAllUploads();
		},
		formatFileSize(bytes) {
			if (bytes === 0) return '0 Bytes';
			const k = 1024;
			const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
		},
		formatDuration(ms) {
			const seconds = Math.floor(ms / 1000);
			const minutes = Math.floor(seconds / 60);
			const hours = Math.floor(minutes / 60);

			if (hours > 0) {
				return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
			} else if (minutes > 0) {
				return `${minutes}m ${seconds % 60}s`;
			} else {
				return `${seconds}s`;
			}
		}
	},
};
</script>

<style scoped lang="scss">
.uploading-popup {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  min-width: 450px;
  max-width: 600px;

  .card {
    overflow: auto;
    display: block;
    max-height: 50vh;
    margin-bottom: 0;

    // Modern glassmorphism design with 3D depth
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.1),
      0 2px 8px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);

    // 3D transform effect
    transform: translateZ(0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-2px) translateZ(0);
      box-shadow:
        0 15px 50px rgba(0, 0, 0, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
  }

  .card-body {
    background: white;
    border-radius: 0 0 20px 20px;
    padding: 12px;
  }

  .card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border-radius: 20px 20px 0 0;
    padding: 16px 20px;
    font-weight: 600;
    font-size: 1.05em;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

    .btn {
      border-radius: 10px;
      padding: 6px 14px;
      font-weight: 500;
      font-size: 0.85em;
      transition: all 0.2s ease;
      border: none;

      &.btn-warning {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
        }
      }

      &.btn-primary {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        box-shadow: 0 2px 8px rgba(79, 172, 254, 0.3);

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
        }
      }
    }
  }

  .upload-table {
    width: 100%;
    margin: 0;
    border-collapse: separate;
    border-spacing: 0 8px;
  }

  .table-active {
    background: linear-gradient(135deg, #fdfbfb 0%, #f7f9fc 100%);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;

    &:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  }

  .progress {
    height: 24px;
    margin-top: 6px;
    border-radius: 12px;
    background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%);
      border-radius: 12px 12px 0 0;
    }
  }

  .progress-bar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    border-radius: 12px;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%);
      border-radius: 12px 12px 0 0;
    }
  }

  .progress-filename {
    padding: 12px 16px;
    min-width: 200px;
  }

  .filename-text {
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    color: #2d3748;
    font-size: 0.95em;
  }

  .file-size-text {
    font-size: 0.8em;
    color: #718096;
    margin-top: 4px;
    font-weight: 500;
  }

  .progress-cell {
    padding: 12px 16px;
    min-width: 200px;
  }

  .cancel-cell {
    padding: 12px;
    text-align: center;
    width: 60px;

    .btn-danger {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border: none;
      border-radius: 10px;
      padding: 8px 12px;
      box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
      }
    }
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 0.9em;
  }

  .progress-percent {
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 1.05em;
  }

  .progress-parts {
    color: #718096;
    font-size: 0.85em;
    font-weight: 500;
  }

  .btn-close {
    margin-right: 0;
    margin-left: auto;
  }

  .upload-complete {
    text-align: center;
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
    font-size: 1.05em;

    i {
      color: #38ef7d;
      filter: drop-shadow(0 2px 4px rgba(56, 239, 125, 0.3));
    }
  }

  .upload-duration {
    display: block;
    font-size: 0.85em;
    color: #718096;
    font-weight: 500;
    margin-top: 4px;
  }
}
</style>
