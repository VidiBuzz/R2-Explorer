<template>
  <!-- ACTIVE TRANSFERS PANEL - SLIDES UP FROM BOTTOM -->
  <div v-if="hasActiveTransfers" class="active-transfers-wrapper">
    <!-- MINIMIZED STATE - Compact bar at bottom -->
    <div v-if="isMinimized" class="transfers-minimized" @click="togglePanel">
      <div class="minimized-content">
        <i class="bi bi-arrow-down-up"></i>
        <span class="transfer-status">
          <strong>{{ activeCount }}</strong> active transfer{{ activeCount !== 1 ? 's' : '' }}
        </span>
        <div class="mini-progress-wrapper">
          <div class="mini-progress-fill" :style="{ width: overallProgress + '%' }"></div>
        </div>
        <span class="mini-stats">{{ formatSpeed(totalSpeed) }} • {{ formatSize(transferredBytes) }}/{{ formatSize(totalBytes) }}</span>
      </div>
      <button class="btn-expand" @click.stop="togglePanel" title="Expand transfers panel">
        <i class="bi bi-chevron-up"></i>
      </button>
    </div>

    <!-- EXPANDED STATE - Full panel with transfer details -->
    <div v-else class="transfers-panel" :class="{ 'fully-expanded': isFullyExpanded }">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <i class="bi bi-arrow-down-up"></i>
          <span class="panel-title">Active Transfers</span>
          <span class="transfer-count">{{ activeCount }} in progress</span>
        </div>
        <div class="header-right">
          <button
            v-if="hasPausedTransfers"
            class="btn-resume-all"
            @click="resumeAll"
            title="Resume all paused transfers"
          >
            <i class="bi bi-play-fill"></i>
            Resume All
          </button>
          <button class="btn-expand" @click="toggleExpanded" :title="isFullyExpanded ? 'Restore panel size' : 'Maximize panel'">
            <i class="bi" :class="isFullyExpanded ? 'bi-chevron-bar-down' : 'bi-chevron-bar-up'"></i>
          </button>
          <button class="btn-minimize" @click="togglePanel" title="Minimize panel">
            <i class="bi bi-chevron-down"></i>
          </button>
          <button class="btn-close" @click="closePanel" title="Close panel">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <!-- Transfer Items List -->
      <div class="panel-body">
        <div
          v-for="transfer in activeTransfers"
          :key="transfer.id"
          class="transfer-item"
          :class="{ 'paused': transfer.isPaused, 'completed': transfer.progress === 100 }"
        >
          <!-- File Info -->
          <div class="transfer-info">
            <i
              class="bi"
              :class="getTransferIcon(transfer)"
            ></i>
            <div class="transfer-details">
              <div class="transfer-name-row">
                <span class="transfer-name">{{ transfer.filename }}</span>
                <span
                  class="status-badge"
                  :class="{
                    'badge-uploading': transfer.type === 'upload' && !transfer.isPaused && transfer.progress < 100,
                    'badge-downloading': transfer.type === 'download' && !transfer.isPaused && transfer.progress < 100,
                    'badge-paused': transfer.isPaused,
                    'badge-complete': transfer.progress === 100
                  }"
                >
                  {{ getStatusText(transfer) }}
                </span>
              </div>
              <div class="transfer-meta">
                <span class="file-size">{{ formatSize(transfer.fileSize) }}</span>
                <span v-if="transfer.destination" class="destination">→ {{ transfer.destination }}</span>
              </div>
            </div>
          </div>

          <!-- Progress Section -->
          <div class="transfer-progress">
            <!-- Completed State -->
            <div v-if="transfer.progress === 100" class="transfer-complete">
              <i class="bi bi-check-circle-fill"></i>
              <span>Complete</span>
              <span v-if="transfer.duration" class="duration">({{ formatDuration(transfer.duration) }})</span>
            </div>

            <!-- Paused State -->
            <div v-else-if="transfer.isPaused" class="transfer-paused">
              <i class="bi bi-pause-circle-fill"></i>
              <span>Paused at {{ Math.round(transfer.progress) }}%</span>
            </div>

            <!-- Active Transfer -->
            <div v-else class="progress-container">
              <div class="progress-stats">
                <span class="percentage">{{ Math.round(transfer.progress) }}%</span>
                <span class="speed-time">
                  {{ formatSpeed(transfer.speed) }}
                  <span v-if="transfer.timeRemaining" class="time-remaining">
                    • {{ formatTimeRemaining(transfer.timeRemaining) }}
                  </span>
                </span>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar-fill" :style="{ width: transfer.progress + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="transfer-actions">
            <button
              v-if="transfer.progress < 100 && !transfer.isPaused"
              class="btn-action btn-pause"
              @click="pauseTransfer(transfer.id)"
              title="Pause transfer"
            >
              <i class="bi bi-pause-fill"></i>
            </button>
            <button
              v-if="transfer.isPaused"
              class="btn-action btn-resume"
              @click="resumeTransfer(transfer.id)"
              title="Resume transfer"
            >
              <i class="bi bi-play-fill"></i>
            </button>
            <button
              v-if="transfer.progress < 100"
              class="btn-action btn-cancel"
              @click="cancelTransfer(transfer.id)"
              title="Cancel transfer"
            >
              <i class="bi bi-x-lg"></i>
            </button>
            <button
              v-if="transfer.progress === 100"
              class="btn-action btn-remove"
              @click="removeTransfer(transfer.id)"
              title="Remove from list"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>

        <!-- Empty State (shown if all transfers complete but panel still open) -->
        <div v-if="activeTransfers.length === 0" class="empty-state">
          <i class="bi bi-check-circle"></i>
          <p>All transfers complete</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';
import { useTransfersStore } from 'stores/transfers-store';
import { useMainStore } from 'stores/main-store';

export default defineComponent({
  name: 'ActiveTransfersPanel',

  setup() {
    const instance = getCurrentInstance();
    const $bus = instance?.appContext.config.globalProperties.$bus;

    // Use real transfers store
    const transfersStore = useTransfersStore();
    const mainStore = useMainStore();

    // State - Start minimized, expand when user clicks
    const isMinimized = ref(true);
    const isFullyExpanded = ref(false);

    // Use REAL transfers from store
    const activeTransfers = computed(() => transfersStore.activeTransfers);

    // Computed properties
    const hasActiveTransfers = computed(() => activeTransfers.value.length > 0);

    const activeCount = computed(() => {
      return activeTransfers.value.filter(t => t.progress < 100 && !t.isPaused).length;
    });

    const hasPausedTransfers = computed(() => {
      return activeTransfers.value.some(t => t.isPaused);
    });

    const totalSpeed = computed(() => {
      return activeTransfers.value
        .filter(t => t.progress < 100 && !t.isPaused)
        .reduce((sum, t) => sum + (t.speed || 0), 0);
    });

    const totalBytes = computed(() => {
      return activeTransfers.value.reduce((sum, t) => sum + t.fileSize, 0);
    });

    const transferredBytes = computed(() => {
      return activeTransfers.value.reduce((sum, t) => {
        return sum + (t.fileSize * (t.progress / 100));
      }, 0);
    });

    const overallProgress = computed(() => {
      if (activeTransfers.value.length === 0) return 0;
      const total = activeTransfers.value.reduce((sum, t) => sum + t.progress, 0);
      return Math.round(total / activeTransfers.value.length);
    });

    // Methods
    const togglePanel = () => {
      isMinimized.value = !isMinimized.value;
    };

    const toggleExpanded = () => {
      isFullyExpanded.value = !isFullyExpanded.value;
    };

    const closePanel = () => {
      // Use REAL store method
      if (activeCount.value > 0) {
        if (!confirm('There are active transfers. Are you sure you want to close?')) {
          return;
        }
      }
      transfersStore.clearAllTransfers();
      isMinimized.value = true;
    };

    const pauseTransfer = (id) => {
      // Pause by updating status (real implementation would pause actual upload/download)
      transfersStore.updateTransfer(id, { isPaused: true, speed: 0 });
      // TODO: Call actual upload/download abort function
    };

    const resumeTransfer = (id) => {
      // Resume by updating status (real implementation would restart upload/download)
      transfersStore.updateTransfer(id, { isPaused: false });
      // TODO: Call actual upload/download resume function
    };

    const resumeAll = () => {
      activeTransfers.value.forEach(transfer => {
        if (transfer.isPaused && transfer.progress < 100) {
          resumeTransfer(transfer.id);
        }
      });
    };

    const cancelTransfer = (id) => {
      if (confirm('Are you sure you want to cancel this transfer?')) {
        const transfer = transfersStore.getTransfer(id);
        if (transfer) {
          // Cancel the actual upload/download by aborting the controller
          if (transfer.type === 'upload') {
            mainStore.cancelUpload(transfer.filename);
          }
          // Update transfers store to mark as cancelled
          transfersStore.removeTransfer(id);
        }
      }
    };

    const removeTransfer = (id) => {
      // Use REAL store method
      transfersStore.removeTransfer(id);
    };

    const getTransferIcon = (transfer) => {
      if (transfer.progress === 100) return 'bi-check-circle-fill';
      if (transfer.isPaused) return 'bi-pause-circle-fill';
      return transfer.type === 'upload' ? 'bi-cloud-upload' : 'bi-cloud-download';
    };

    const getStatusText = (transfer) => {
      if (transfer.progress === 100) return 'Complete';
      if (transfer.isPaused) return 'Paused';
      return transfer.type === 'upload' ? 'Uploading' : 'Downloading';
    };

    const formatSize = (bytes) => {
      if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond) => {
      if (!bytesPerSecond || isNaN(bytesPerSecond) || bytesPerSecond === 0) return '0 KB/s';
      return formatSize(bytesPerSecond) + '/s';
    };

    const formatDuration = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    };

    const formatTimeRemaining = (ms) => {
      if (!ms || ms <= 0) return '';

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
    };

    // Event handler for opening the panel
    const handleOpenActiveTransfers = () => {
      isMinimized.value = false; // Expand the panel when event is received
    };

    // Setup event listeners
    onMounted(() => {
      if ($bus) {
        $bus.on('openActiveTransfers', handleOpenActiveTransfers);
      }
    });

    onBeforeUnmount(() => {
      if ($bus) {
        $bus.off('openActiveTransfers', handleOpenActiveTransfers);
      }
    });

    return {
      isMinimized,
      isFullyExpanded,
      activeTransfers,
      hasActiveTransfers,
      activeCount,
      hasPausedTransfers,
      totalSpeed,
      totalBytes,
      transferredBytes,
      overallProgress,
      togglePanel,
      toggleExpanded,
      closePanel,
      pauseTransfer,
      resumeTransfer,
      resumeAll,
      cancelTransfer,
      removeTransfer,
      getTransferIcon,
      getStatusText,
      formatSize,
      formatSpeed,
      formatDuration,
      formatTimeRemaining
    };
  }
});
</script>

<style scoped lang="scss">
// ACTIVE TRANSFERS PANEL - BOTTOM SLIDE-UP COMPONENT
.active-transfers-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

// MINIMIZED STATE - Compact status bar
.transfers-minimized {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  backdrop-filter: blur(20px);
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: linear-gradient(135deg, #2a5298 0%, #3a62b8 100%);
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.25);
  }

  .minimized-content {
    display: flex;
    align-items: center;
    gap: 16px;
    color: white;
    font-size: 0.95em;
    flex: 1;

    i {
      font-size: 1.4em;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .transfer-status {
      font-weight: 600;
      white-space: nowrap;

      strong {
        font-size: 1.1em;
        color: #4facfe;
      }
    }

    .mini-progress-wrapper {
      flex: 1;
      max-width: 300px;
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);

      .mini-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
        transition: width 0.4s ease;
        box-shadow: 0 0 12px rgba(0, 242, 254, 0.6);
        border-radius: 4px;
      }
    }

    .mini-stats {
      color: #4facfe;
      font-weight: 600;
      font-size: 0.9em;
      white-space: nowrap;
    }
  }

  .btn-expand {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;

    i {
      font-size: 1.2em;
      font-weight: bold;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
}

// EXPANDED STATE - Full panel
.transfers-panel {
  max-height: 60vh;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(30px);
  box-shadow:
    0 -8px 32px rgba(0, 0, 0, 0.15),
    0 -4px 16px rgba(0, 0, 0, 0.1);
  border-top: 2px solid rgba(30, 60, 114, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.fully-expanded {
    max-height: 90vh;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  // Header
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 24px;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(30, 60, 114, 0.3);

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      i {
        font-size: 1.4em;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }

      .panel-title {
        font-size: 1.1em;
        font-weight: 700;
        letter-spacing: 0.3px;
      }

      .transfer-count {
        background: rgba(255, 255, 255, 0.2);
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85em;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
    }

    .header-right {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    button {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 10px;
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

      &.btn-resume-all {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        border: 1px solid rgba(255, 255, 255, 0.4);

        &:hover {
          background: linear-gradient(135deg, #0f8a7d 0%, #30d96d 100%);
        }
      }

      &.btn-expand,
      &.btn-minimize,
      &.btn-close {
        padding: 8px 12px;
      }

      &.btn-expand {
        background: rgba(255, 255, 255, 0.15);

        &:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      }

      i {
        font-size: 1.1em;
      }
    }
  }

  // Body with transfer items
  .panel-body {
    padding: 16px 24px;
    max-height: calc(60vh - 56px);
    overflow-y: auto;
    background: rgba(248, 250, 252, 0.95);
    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &.fully-expanded .panel-body {
    max-height: calc(90vh - 56px);

    // Custom scrollbar
    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      border-radius: 4px;

      &:hover {
        background: linear-gradient(135deg, #2a5298 0%, #3a62b8 100%);
      }
    }
  }

  // Individual transfer item
  .transfer-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    margin-bottom: 8px;
    background: white;
    border-radius: 12px;
    border: 1px solid rgba(30, 60, 114, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;

    &:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 16px rgba(30, 60, 114, 0.12);
      border-color: rgba(30, 60, 114, 0.25);
    }

    &.paused {
      background: rgba(255, 193, 7, 0.05);
      border-color: rgba(255, 193, 7, 0.3);
    }

    &.completed {
      background: rgba(56, 239, 125, 0.05);
      border-color: rgba(56, 239, 125, 0.3);
    }

    .transfer-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 220px;
      flex-shrink: 0;

      > i {
        font-size: 1.6em;
        color: #1e3c72;
        filter: drop-shadow(0 2px 4px rgba(30, 60, 114, 0.3));
      }

      .transfer-details {
        .transfer-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;

          .transfer-name {
            font-weight: 600;
            color: #2d3748;
            font-size: 0.95em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;

            &.badge-uploading {
              background: rgba(79, 172, 254, 0.15);
              color: #1e88e5;
              border: 1px solid rgba(79, 172, 254, 0.3);
            }

            &.badge-downloading {
              background: rgba(156, 39, 176, 0.15);
              color: #7b1fa2;
              border: 1px solid rgba(156, 39, 176, 0.3);
            }

            &.badge-paused {
              background: rgba(255, 193, 7, 0.15);
              color: #f57c00;
              border: 1px solid rgba(255, 193, 7, 0.3);
            }

            &.badge-complete {
              background: rgba(76, 175, 80, 0.15);
              color: #388e3c;
              border: 1px solid rgba(76, 175, 80, 0.3);
            }
          }
        }

        .transfer-meta {
          display: flex;
          gap: 8px;
          font-size: 0.8em;
          color: #718096;

          .file-size {
            font-weight: 500;
          }

          .destination {
            color: #4facfe;
            font-weight: 500;
          }
        }
      }
    }

    .transfer-progress {
      flex: 1;
      min-width: 250px;

      .transfer-complete {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #38ef7d;
        font-weight: 700;
        font-size: 1em;

        i {
          font-size: 1.3em;
          filter: drop-shadow(0 2px 4px rgba(56, 239, 125, 0.4));
        }

        .duration {
          margin-left: 8px;
          color: #718096;
          font-weight: 500;
          font-size: 0.9em;
        }
      }

      .transfer-paused {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ffc107;
        font-weight: 700;
        font-size: 1em;

        i {
          font-size: 1.3em;
          filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.4));
        }
      }

      .progress-container {
        .progress-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 0.9em;

          .percentage {
            font-weight: 700;
            font-size: 1.2em;
            background: linear-gradient(135deg, #1e3c72 0%, #4facfe 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .speed-time {
            color: #4facfe;
            font-weight: 600;

            .time-remaining {
              color: #718096;
              margin-left: 4px;
            }
          }
        }

        .progress-bar-wrapper {
          height: 8px;
          background: linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 100%);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
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
              0 0 16px rgba(30, 60, 114, 0.4),
              0 0 8px rgba(0, 242, 254, 0.3);
            animation: shimmer 2s infinite linear;

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
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
          }
        }
      }
    }

    .transfer-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;

      .btn-action {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 1em;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);

        i {
          color: white;
          font-weight: 600;
          font-size: 1em;
          line-height: 1;
        }

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        }

        &:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        &.btn-pause {
          background: rgba(255, 193, 7, 0.9);

          &:hover {
            background: rgba(255, 179, 0, 1);
          }
        }

        &.btn-resume {
          background: rgba(76, 175, 80, 0.9);

          &:hover {
            background: rgba(67, 160, 71, 1);
          }
        }

        &.btn-cancel {
          background: rgba(244, 67, 54, 0.9);

          &:hover {
            background: rgba(229, 57, 53, 1);
          }
        }

        &.btn-remove {
          background: rgba(158, 158, 158, 0.9);

          &:hover {
            background: rgba(117, 117, 117, 1);
          }
        }
      }
    }
  }

  // Empty state
  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: #718096;

    i {
      font-size: 4em;
      color: #38ef7d;
      margin-bottom: 16px;
      filter: drop-shadow(0 4px 8px rgba(56, 239, 125, 0.3));
    }

    p {
      font-size: 1.1em;
      font-weight: 600;
      margin: 0;
    }
  }
}
</style>
