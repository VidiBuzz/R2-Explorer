<template>
  <!-- MINIMIZED STATUS BAR -->
  <div v-if="Object.keys(mainStore.uploadingFiles).length > 0 && isMinimized" class="upload-status-minimized" @click="isMinimized = false">
    <div class="minimized-content">
      <i class="bi bi-cloud-upload"></i>
      <span>{{ activeUploadsCount }} uploading • {{ completedCount }} completed</span>
      <div class="minimized-progress">
        <div class="mini-progress-bar" :style="{ width: overallProgress + '%' }"></div>
      </div>
      <span class="minimized-speed">{{ totalSpeed }} KB/s</span>
    </div>
    <button class="btn-close-mini" @click.stop="close">
      <i class="bi bi-x"></i>
    </button>
  </div>

  <!-- FULL UPLOAD PANEL -->
  <div v-if="Object.keys(mainStore.uploadingFiles).length > 0 && !isMinimized" class="upload-panel-bottom">
    <div class="panel-header">
      <div class="header-left">
        <i class="bi bi-cloud-upload"></i>
        <span class="upload-title">Uploading {{ Object.keys(mainStore.uploadingFiles).length }} file(s)</span>
      </div>
      <div class="header-right">
        <button class="btn-cancel-all" @click="cancelAll" v-if="hasActiveUploads">
          <i class="bi bi-x-circle"></i> Cancel All
        </button>
        <button class="btn-minimize" @click="isMinimized = true">
          <i class="bi bi-chevron-down"></i>
        </button>
        <button class="btn-close" @click="close">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>
    <div class="panel-body">
      <div class="upload-row" v-for="(data, filename) in mainStore.uploadingFiles" :key="filename">
        <div class="file-info">
          <i class="bi bi-file-earmark"></i>
          <div class="file-details">
            <div class="filename">{{ filename }}</div>
            <div class="file-size" v-if="data.fileSize">{{ formatFileSize(data.fileSize) }}</div>
          </div>
        </div>

        <div class="progress-section">
          <div v-if="data.progress === 100" class="upload-complete">
            <i class="bi bi-check-circle-fill"></i> Complete
            <span v-if="data.duration" class="duration">({{ formatDuration(data.duration) }})</span>
          </div>
          <div v-else class="progress-container">
            <div class="progress-stats">
              <span class="percentage">{{ Math.round(data.progress || 0) }}%</span>
              <span v-if="data.timeRemaining" class="time-speed">
                {{ formatTimeRemaining(data.timeRemaining) }}
                ({{ Math.round(data.speed || 0) }} KB/s)
              </span>
              <span v-if="data.totalParts > 1" class="parts">
                Part {{ data.completedParts || 0 }}/{{ data.totalParts }}
              </span>
            </div>
            <div class="progress-bar-wrapper">
              <div class="progress-bar-fill" :style="{ 'width': `${data.progress || 0}%` }"></div>
            </div>
          </div>
        </div>

        <div class="actions" v-if="data.progress < 100">
          <button class="btn-cancel" @click="cancelUpload(filename)" title="Cancel upload">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
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
	data() {
		return {
			isMinimized: false
		};
	},
	computed: {
		hasActiveUploads() {
			return Object.values(this.mainStore.uploadingFiles).some(file => file.progress < 100);
		},
		activeUploadsCount() {
			return Object.values(this.mainStore.uploadingFiles).filter(file => file.progress < 100).length;
		},
		completedCount() {
			return Object.values(this.mainStore.uploadingFiles).filter(file => file.progress === 100).length;
		},
		overallProgress() {
			const files = Object.values(this.mainStore.uploadingFiles);
			if (files.length === 0) return 0;
			const total = files.reduce((sum, file) => sum + (file.progress || 0), 0);
			return Math.round(total / files.length);
		},
		totalSpeed() {
			const files = Object.values(this.mainStore.uploadingFiles);
			const speed = files.reduce((sum, file) => sum + (file.speed || 0), 0);
			return Math.round(speed);
		}
	},
	methods: {
		close: function () {
			this.mainStore.clearUploadingFiles();
			this.isMinimized = false;
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
		},
		formatTimeRemaining(ms) {
			if (!ms || ms < 0) return '';

			const seconds = Math.floor(ms / 1000);
			const minutes = Math.floor(seconds / 60);
			const hours = Math.floor(minutes / 60);

			if (hours > 0) {
				return `${hours}h ${minutes % 60}m ${seconds % 60}s left`;
			} else if (minutes > 0) {
				return `${minutes}m ${seconds % 60}s left`;
			} else {
				return `${seconds}s left`;
			}
		}
	},
};
</script>

<style scoped lang="scss">
// FILEZILLA-STYLE FULL-WIDTH BOTTOM PANEL
.upload-panel-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  max-height: 50vh;

  // TRUE GLASSMORPHISM
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);

  // 3D DEPTH
  box-shadow:
    0 -8px 32px rgba(0, 0, 0, 0.15),
    0 -4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-top: 2px solid rgba(30, 60, 114, 0.3);

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(30, 60, 114, 0.3);

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.05em;

      i {
        font-size: 1.3em;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }
    }

    .header-right {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    button {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9em;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      &.btn-minimize {
        padding: 8px 12px;
      }

      i {
        font-size: 1.1em;
      }
    }
  }

  .panel-body {
    padding: 16px 24px;
    max-height: calc(50vh - 50px);
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.8);
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    margin-bottom: 3px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 6px;
    border: 1px solid rgba(30, 60, 114, 0.1);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    min-height: 22px;

    &:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(30, 60, 114, 0.12);
      border-color: rgba(30, 60, 114, 0.25);
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 150px;
      flex-shrink: 0;

      i {
        font-size: 1em;
        color: #1e3c72;
        filter: drop-shadow(0 1px 2px rgba(30, 60, 114, 0.3));
      }

      .file-details {
        .filename {
          font-weight: 600;
          color: #2d3748;
          font-size: 0.75em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 125px;
        }

        .file-size {
          font-size: 0.7em;
          color: #718096;
          margin-top: 1px;
        }
      }
    }

    .progress-section {
      flex-grow: 1;
      min-width: 300px;

      .progress-container {
        .progress-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 0.9em;

          .percentage {
            font-weight: 700;
            font-size: 1.1em;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .parts {
            color: #718096;
            font-weight: 500;
          }

          .time-speed {
            color: #4facfe;
            font-weight: 600;
            font-size: 0.95em;
          }
        }

        .progress-bar-wrapper {
          height: 5px;
          background: linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 100%);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
          position: relative;

          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg,
              #1e3c72 0%,
              #2a5298 25%,
              #4facfe 50%,
              #00f2fe 75%,
              #4facfe 100%
            );
            background-size: 200% 100%;
            border-radius: 8px;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow:
              0 0 20px rgba(30, 60, 114, 0.5),
              0 0 10px rgba(0, 242, 254, 0.3);
            position: relative;
            animation: shimmer 2s infinite linear;

            &::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 50%;
              background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%);
              border-radius: 8px 8px 0 0;
            }
          }
        }

        @keyframes shimmer {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 0%;
          }
        }
      }

      .upload-complete {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 1.05em;
        color: #38ef7d;

        i {
          font-size: 1.3em;
          filter: drop-shadow(0 2px 4px rgba(56, 239, 125, 0.4));
        }

        .duration {
          font-size: 0.85em;
          color: #718096;
          font-weight: 500;
          margin-left: 6px;
        }
      }
    }

    .actions {
      flex-shrink: 0;

      .btn-cancel {
        background: #ef4444;
        border: none;
        border-radius: 4px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(239, 68, 68, 0.3);

        i {
          color: white;
          font-size: 0.65em;
          font-weight: bold;
        }

        &:hover {
          transform: scale(1.1);
          background: #dc2626;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
}

// MINIMIZED STATUS BAR
.upload-status-minimized {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: rgba(30, 60, 114, 0.95);
  backdrop-filter: blur(20px);
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);

  &:hover {
    background: rgba(42, 82, 152, 0.95);
  }

  .minimized-content {
    display: flex;
    align-items: center;
    gap: 16px;
    color: white;
    font-size: 0.9em;
    font-weight: 600;

    i {
      font-size: 1.2em;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
    }

    .minimized-progress {
      width: 200px;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;

      .mini-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
        transition: width 0.3s ease;
        box-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
      }
    }

    .minimized-speed {
      color: #4facfe;
      font-weight: 700;
    }
  }

  .btn-close-mini {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.1);
    }
  }
}

// CLOSE BUTTON (X) in header
.btn-close {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}
</style>
