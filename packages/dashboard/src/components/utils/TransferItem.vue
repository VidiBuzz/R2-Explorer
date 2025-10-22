<template>
  <div class="transfer-item" :class="{ 'completed': status === 'completed' }">
    <div class="file-info">
      <i :class="getFileIcon(fileName)" class="file-icon"></i>
      <div class="file-details">
        <div class="filename" :title="fileName">{{ fileName }}</div>
        <div class="file-meta">
          <span class="file-size">{{ formatFileSize(fileSize) }}</span>
          <span v-if="speed && status !== 'completed'" class="separator">•</span>
          <span v-if="speed && status !== 'completed'" class="transfer-speed">{{ formatSpeed(speed) }}</span>
        </div>
      </div>
    </div>

    <div class="status-section">
      <span class="status-badge" :class="'status-' + status">
        {{ getStatusLabel(status) }}
      </span>
    </div>

    <div class="progress-section">
      <div class="progress-stats">
        <span class="percentage">{{ Math.round(progress) }}%</span>
        <span v-if="timeRemaining && status === 'uploading'" class="time-remaining">
          {{ formatTimeRemaining(timeRemaining) }}
        </span>
      </div>
      <div class="progress-bar-wrapper">
        <div
          class="progress-bar-fill"
          :class="{ 'paused': status === 'paused', 'completed': status === 'completed' }"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
    </div>

    <div class="actions">
      <button
        v-if="status !== 'completed'"
        class="btn-action btn-pause-resume"
        @click="togglePauseResume"
        :title="status === 'paused' ? 'Resume' : 'Pause'"
      >
        <i :class="status === 'paused' ? 'bi bi-play-fill' : 'bi bi-pause-fill'"></i>
      </button>
      <button
        v-if="status !== 'completed'"
        class="btn-action btn-cancel"
        @click="$emit('cancel')"
        title="Cancel transfer"
      >
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TransferItem',
  props: {
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    speed: {
      type: Number,
      default: 0
    },
    progress: {
      type: Number,
      default: 0,
      validator: (value) => value >= 0 && value <= 100
    },
    status: {
      type: String,
      default: 'uploading',
      validator: (value) => ['uploading', 'downloading', 'paused', 'completed'].includes(value)
    },
    type: {
      type: String,
      default: 'upload',
      validator: (value) => ['upload', 'download'].includes(value)
    },
    timeRemaining: {
      type: Number,
      default: null
    }
  },
  emits: ['pause', 'resume', 'cancel'],
  methods: {
    togglePauseResume() {
      if (this.status === 'paused') {
        this.$emit('resume');
      } else {
        this.$emit('pause');
      }
    },
    getFileIcon(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      const iconMap = {
        // Images
        'jpg': 'bi bi-file-earmark-image',
        'jpeg': 'bi bi-file-earmark-image',
        'png': 'bi bi-file-earmark-image',
        'gif': 'bi bi-file-earmark-image',
        'svg': 'bi bi-file-earmark-image',
        'webp': 'bi bi-file-earmark-image',
        // Videos
        'mp4': 'bi bi-file-earmark-play',
        'avi': 'bi bi-file-earmark-play',
        'mov': 'bi bi-file-earmark-play',
        'wmv': 'bi bi-file-earmark-play',
        'webm': 'bi bi-file-earmark-play',
        // Documents
        'pdf': 'bi bi-file-earmark-pdf',
        'doc': 'bi bi-file-earmark-word',
        'docx': 'bi bi-file-earmark-word',
        'xls': 'bi bi-file-earmark-excel',
        'xlsx': 'bi bi-file-earmark-excel',
        'ppt': 'bi bi-file-earmark-ppt',
        'pptx': 'bi bi-file-earmark-ppt',
        // Archives
        'zip': 'bi bi-file-earmark-zip',
        'rar': 'bi bi-file-earmark-zip',
        '7z': 'bi bi-file-earmark-zip',
        'tar': 'bi bi-file-earmark-zip',
        'gz': 'bi bi-file-earmark-zip',
        // Code
        'js': 'bi bi-file-earmark-code',
        'jsx': 'bi bi-file-earmark-code',
        'ts': 'bi bi-file-earmark-code',
        'tsx': 'bi bi-file-earmark-code',
        'html': 'bi bi-file-earmark-code',
        'css': 'bi bi-file-earmark-code',
        'scss': 'bi bi-file-earmark-code',
        'vue': 'bi bi-file-earmark-code',
        'py': 'bi bi-file-earmark-code',
        'java': 'bi bi-file-earmark-code',
        // Text
        'txt': 'bi bi-file-earmark-text',
        'md': 'bi bi-file-earmark-text',
        'json': 'bi bi-file-earmark-text',
        'xml': 'bi bi-file-earmark-text',
        'csv': 'bi bi-file-earmark-text',
        // Audio
        'mp3': 'bi bi-file-earmark-music',
        'wav': 'bi bi-file-earmark-music',
        'flac': 'bi bi-file-earmark-music',
        'aac': 'bi bi-file-earmark-music',
      };
      return iconMap[ext] || 'bi bi-file-earmark';
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    },
    formatSpeed(bytesPerSecond) {
      if (!bytesPerSecond || bytesPerSecond === 0) return '0 KB/s';
      const k = 1024;
      const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
      const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
      return (bytesPerSecond / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    },
    formatTimeRemaining(ms) {
      if (!ms || ms < 0) return '';
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m left`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s left`;
      } else {
        return `${seconds}s left`;
      }
    },
    getStatusLabel(status) {
      const labels = {
        uploading: 'Uploading',
        downloading: 'Downloading',
        paused: 'Paused',
        completed: 'Completed'
      };
      return labels[status] || status;
    }
  }
};
</script>

<style scoped lang="scss">
.transfer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(30, 60, 114, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(30, 60, 114, 0.15);
    border-color: rgba(30, 60, 114, 0.25);
  }

  &.completed {
    background: rgba(56, 239, 125, 0.05);
    border-color: rgba(56, 239, 125, 0.3);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 220px;
    flex-shrink: 0;

    .file-icon {
      font-size: 1.8em;
      color: #1e3c72;
      filter: drop-shadow(0 2px 4px rgba(30, 60, 114, 0.2));
      flex-shrink: 0;
    }

    .file-details {
      overflow: hidden;

      .filename {
        font-weight: 600;
        color: #2d3748;
        font-size: 0.95em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
        line-height: 1.3;
      }

      .file-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        font-size: 0.85em;
        color: #718096;

        .separator {
          color: #cbd5e0;
          font-weight: 300;
        }

        .transfer-speed {
          color: #4facfe;
          font-weight: 600;
        }
      }
    }
  }

  .status-section {
    flex-shrink: 0;

    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;

      &.status-uploading {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      &.status-downloading {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white;
      }

      &.status-paused {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
      }

      &.status-completed {
        background: linear-gradient(135deg, #38ef7d 0%, #11998e 100%);
        color: white;
      }
    }
  }

  .progress-section {
    flex-grow: 1;
    min-width: 200px;

    .progress-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.9em;

      .percentage {
        font-weight: 700;
        font-size: 1.1em;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .time-remaining {
        color: #4facfe;
        font-weight: 600;
        font-size: 0.9em;
      }
    }

    .progress-bar-wrapper {
      height: 8px;
      background: linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 100%);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
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
        border-radius: 6px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow:
          0 0 20px rgba(30, 60, 114, 0.4),
          0 0 10px rgba(0, 242, 254, 0.3);
        position: relative;
        animation: shimmer 2s infinite linear;

        &.paused {
          background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
          animation: none;
        }

        &.completed {
          background: linear-gradient(90deg, #38ef7d 0%, #11998e 100%);
          animation: none;
        }

        &::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%);
          border-radius: 6px 6px 0 0;
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
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;

    .btn-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9em;

      i {
        color: white;
        font-size: 0.95em;
        font-weight: bold;
      }

      &:hover {
        transform: scale(1.1);
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .btn-pause-resume {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);

      &:hover {
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
      }
    }

    .btn-cancel {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);

      &:hover {
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
      }
    }
  }
}
</style>
