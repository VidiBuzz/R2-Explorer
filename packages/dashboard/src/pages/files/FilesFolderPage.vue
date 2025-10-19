<template>
  <q-page class="modern-files-page">
    <div class="q-pa-md modern-content">
      <div class="header-controls">
        <q-breadcrumbs class="modern-breadcrumbs">
          <q-breadcrumbs-el style="cursor: pointer" v-for="obj in breadcrumbs" :key="obj.name" :label="obj.name" @click="breadcrumbsClick(obj)" />
        </q-breadcrumbs>

        <div class="view-toggle">
          <q-btn
            :flat="viewMode !== 'grid'"
            :unelevated="viewMode === 'grid'"
            round
            icon="grid_view"
            @click="viewMode = 'grid'"
            :color="viewMode === 'grid' ? 'primary' : 'grey-7'"
            size="md"
          >
            <q-tooltip>Grid View</q-tooltip>
          </q-btn>
          <q-btn
            :flat="viewMode !== 'table'"
            :unelevated="viewMode === 'table'"
            round
            icon="view_list"
            @click="viewMode = 'table'"
            :color="viewMode === 'table' ? 'primary' : 'grey-7'"
            size="md"
          >
            <q-tooltip>Table View</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- FILE OPERATIONS TOOLBAR -->
      <q-toolbar v-if="selected.length > 0" class="file-operations-toolbar">
        <q-toolbar-title>
          <span class="selection-count">{{ selected.length }} file(s) selected</span>
        </q-toolbar-title>

        <q-btn flat round dense icon="close" @click="clearSelection">
          <q-tooltip>Clear Selection</q-tooltip>
        </q-btn>

        <q-separator vertical inset spaced />

        <q-btn flat icon="delete" label="Delete" @click="deleteSelected" color="negative">
          <q-tooltip>Delete selected files</q-tooltip>
        </q-btn>

        <q-btn flat icon="drive_file_move" label="Move" @click="moveSelected">
          <q-tooltip>Move to another folder</q-tooltip>
        </q-btn>

        <q-btn flat icon="content_copy" label="Copy" @click="copySelected">
          <q-tooltip>Copy selected files</q-tooltip>
        </q-btn>

        <q-btn flat icon="download" label="Download" @click="downloadSelected">
          <q-tooltip>Download selected files</q-tooltip>
        </q-btn>
      </q-toolbar>

      <drag-and-drop ref="uploader">

        <!-- GRID VIEW -->
        <div v-if="viewMode === 'grid'" class="files-grid">
          <div v-if="loading" class="grid-loading">
            <q-spinner color="primary" size="xl" />
          </div>

          <div v-else-if="rows.length === 0" class="grid-empty">
            <q-icon name="folder" color="orange" size="80px" />
            <p>This folder is empty</p>
          </div>

          <div v-else class="grid-container">
            <div
              v-for="row in paginatedRows"
              :key="row.name"
              class="file-card"
              @dblclick="openObject(row)"
              @click="$bus.emit('openFileDetails', row)"
            >
              <q-menu touch-position context-menu>
                <FileContextMenu :prop="{row}" @openObject="openObject" @deleteObject="$refs.options.deleteObject" @renameObject="$refs.options.renameObject" @updateMetadataObject="$refs.options.updateMetadataObject" />
              </q-menu>

              <div class="card-icon-wrapper">
                <q-icon :name="row.icon" :color="row.color" class="card-icon" />
              </div>

              <div class="card-info">
                <div class="card-name">{{ row.name }}</div>
                <div class="card-meta">
                  <span class="card-size">{{ row.size }}</span>
                  <span class="card-date">{{ row.lastModified }}</span>
                </div>
              </div>

              <q-btn
                round
                flat
                icon="more_vert"
                size="sm"
                class="card-menu-btn"
                @click.stop
              >
                <q-menu>
                  <FileContextMenu :prop="{row}" @openObject="openObject" @deleteObject="$refs.options.deleteObject" @renameObject="$refs.options.renameObject" @updateMetadataObject="$refs.options.updateMetadataObject" />
                </q-menu>
              </q-btn>
            </div>
          </div>

          <!-- GRID PAGINATION -->
          <div v-if="rows.length > gridItemsPerPage" class="grid-pagination">
            <q-btn
              flat
              round
              dense
              icon="chevron_left"
              :disable="gridPage === 1"
              @click="gridPage--"
            />
            <span class="pagination-info">
              Page {{ gridPage }} of {{ gridMaxPage }} ({{ rows.length }} total files)
            </span>
            <q-btn
              flat
              round
              dense
              icon="chevron_right"
              :disable="gridPage === gridMaxPage"
              @click="gridPage++"
            />
          </div>
        </div>

        <!-- TABLE VIEW -->
        <q-table
          v-else
          ref="table"
          :rows="rows"
          :columns="columns"
          row-key="name"
          :loading="loading"
          :hide-pagination="true"
          :rows-per-page-options="[0]"
          column-sort-order="da"
          :flat="false"
          table-class="modern-file-table"
          selection="multiple"
          v-model:selected="selected"
          @row-dblclick="openRowClick"
          @row-click="handleRowClick"
        >

          <template v-slot:loading>
              <div class="full-width q-my-lg">
                  <h6 class="flex items-center justify-center">
                      <q-spinner
                              color="primary"
                              size="xl"
                      />
                  </h6>
              </div>
          </template>

          <template v-slot:no-data>
            <div class="full-width q-my-lg" v-if="!loading">
              <h6 class="flex items-center justify-center"><q-icon name="folder" color="orange" size="lg" />This folder is empty</h6>
            </div>
          </template>

          <template v-slot:body-cell-name="prop">
            <td class="flex" style="align-items: center">
              <q-icon :name="prop.row.icon" size="sm" :color="prop.row.color" class="q-mr-xs" />
              <span class="file-name-text" :title="prop.row.name">{{prop.row.name}}</span>
            </td>
          </template>

          <template v-slot:body-cell="prop">
            <q-td :props="prop">
              {{prop.value}}
            </q-td>
            <q-menu
              touch-position
              context-menu
            >
              <FileContextMenu :prop="prop" @openObject="openObject" @deleteObject="$refs.options.deleteObject" @renameObject="$refs.options.renameObject" @updateMetadataObject="$refs.options.updateMetadataObject"  />
            </q-menu>
          </template>

          <template v-slot:body-cell-options="prop">
            <td class="text-right">
              <q-btn round flat icon="more_vert" size="sm">
                <q-menu>
                  <FileContextMenu :prop="prop" @openObject="openObject" @deleteObject="$refs.options.deleteObject" @renameObject="$refs.options.renameObject" @updateMetadataObject="$refs.options.updateMetadataObject" />
                </q-menu>
              </q-btn>
            </td>
          </template>
        </q-table>

        <!-- STATUS BAR (Windows Explorer Style) -->
        <div class="status-bar">
          <div class="status-left">
            <span v-if="selected.length > 0" class="status-item selected-info">
              <q-icon name="check_circle" size="xs" />
              {{ selected.length }} item(s) selected
              <span v-if="selectedSize" class="size-info">({{ selectedSize }})</span>
            </span>
            <span v-else class="status-item">
              <q-icon name="folder" size="xs" />
              {{ totalFolders }} folder(s)
            </span>
            <q-separator vertical inset />
            <span class="status-item">
              <q-icon name="insert_drive_file" size="xs" />
              {{ totalFiles }} file(s)
            </span>
          </div>
          <div class="status-right">
            <span class="status-item total-size">
              <q-icon name="storage" size="xs" />
              Total: {{ totalSize }}
            </span>
          </div>
        </div>

      </drag-and-drop>

    </div>
  </q-page>

  <file-preview ref="preview"/>
  <file-options ref="options" />
</template>

<script>
import FileOptions from "components/files/FileOptions.vue";
import FilePreview from "components/preview/FilePreview.vue";
import DragAndDrop from "components/utils/DragAndDrop.vue";
import FileContextMenu from "pages/files/FileContextMenu.vue";
import { useQuasar } from "quasar";
import { useMainStore } from "stores/main-store";
import { defineComponent } from "vue";
import { ROOT_FOLDER, apiHandler, decode, encode } from "../../appUtils";

export default defineComponent({
	name: "FilesIndexPage",
	components: { FileContextMenu, FileOptions, DragAndDrop, FilePreview },
	data: () => ({
		loading: false,
		viewMode: 'grid',
		rows: [],
		selected: [],
		lastSelectedIndex: -1,  // Track last selected index for shift+click range selection
		gridPage: 1,  // Current page for grid view
		gridItemsPerPage: 50,  // Items per page in grid view
		columns: [
			{
				name: "name",
				required: true,
				label: "Name",
				align: "left",
				field: "name",
				sortable: true,
				sort: (a, b, rowA, rowB) => {
					if (rowA.type === "folder") {
						if (rowB.type === "folder") {
							// both are folders
							return a.localeCompare(b);
						}
						// only first is folder
						return 1;
					}
					if (rowB.type === "folder") {
						// only second is folder
						return -1;
					}
					// none is folder
					return a.localeCompare(b);
				},
			},
			{
				name: "lastModified",
				required: true,
				label: "Last Modified",
				align: "left",
				field: "lastModified",
				sortable: true,
				sort: (a, b, rowA, rowB) => {
					return rowA.timestamp - rowB.timestamp;
				},
			},
			{
				name: "size",
				required: true,
				label: "Size",
				align: "right",
				field: "size",
				sortable: true,
				sort: (a, b, rowA, rowB) => {
					return rowA.sizeRaw - rowB.sizeRaw;
				},
			},
			{
				name: "options",
				label: "",
				align: "center",
				sortable: false,
			},
		],
	}),
	computed: {
		selectedBucket: function () {
			return this.$route.params.bucket;
		},
		selectedFolder: function () {
			if (
				this.$route.params.folder &&
				this.$route.params.folder !== ROOT_FOLDER
			) {
				return decode(this.$route.params.folder);
			}
			return "";
		},
		breadcrumbs: function () {
			if (this.selectedFolder) {
				return [
					{
						name: this.selectedBucket,
						path: "/",
					},
					...this.selectedFolder
						.split("/")
						.filter((obj) => obj !== "")
						.map((item, index, arr) => {
							return {
								name: item,
								path: `${arr
									.slice(0, index + 1)
									.join("/")
									.replace("Home/", "")}/`,
							};
						}),
				];
			}
			return [
				{
					name: this.selectedBucket,
					path: "/",
				},
			];
		},
		paginatedRows: function () {
			const start = (this.gridPage - 1) * this.gridItemsPerPage;
			const end = start + this.gridItemsPerPage;
			return this.rows.slice(start, end);
		},
		gridMaxPage: function () {
			return Math.ceil(this.rows.length / this.gridItemsPerPage);
		},
		totalFiles: function () {
			return this.rows.filter(r => r.type !== 'folder').length;
		},
		totalFolders: function () {
			return this.rows.filter(r => r.type === 'folder').length;
		},
		totalSize: function () {
			const bytes = this.rows
				.filter(r => r.type !== 'folder')
				.reduce((sum, file) => sum + (file.sizeRaw || 0), 0);
			return this.formatBytes(bytes);
		},
		selectedSize: function () {
			if (this.selected.length === 0) return '';
			const bytes = this.selected
				.filter(r => r.type !== 'folder')
				.reduce((sum, file) => sum + (file.sizeRaw || 0), 0);
			return this.formatBytes(bytes);
		},
	},
	watch: {
		selectedBucket(newVal) {
			this.fetchFiles();
		},
		selectedFolder(newVal) {
			this.fetchFiles();
		},
	},
	methods: {
		openRowClick: function (evt, row, index) {
			evt.preventDefault();
			this.openObject(row);
		},
		handleRowClick: function (evt, row, index) {
			evt.preventDefault();

			// If shift key is held and we have a previous selection
			if (evt.shiftKey && this.lastSelectedIndex !== -1) {
				const start = Math.min(this.lastSelectedIndex, index);
				const end = Math.max(this.lastSelectedIndex, index);

				// Select all rows between last clicked and current
				const rangeSelection = this.rows.slice(start, end + 1);

				// Merge with existing selections (remove duplicates)
				const selectedNames = new Set(this.selected.map(s => s.name));
				rangeSelection.forEach(row => {
					if (!selectedNames.has(row.name)) {
						this.selected.push(row);
					}
				});
			} else {
				// Normal click - update last selected index
				this.lastSelectedIndex = index;
			}

			// Still emit the detail event for single click
			this.$bus.emit("openFileDetails", row);
		},
		breadcrumbsClick: function (obj) {
			this.$router.push({
				name: "files-folder",
				params: { bucket: this.selectedBucket, folder: encode(obj.path) },
			});
		},
		rowClick: function (evt, row) {
			if (row.type === "folder") {
				this.$router.push({
					name: "files-folder",
					params: { bucket: this.selectedBucket, folder: encode(row.key) },
				});
			} else {
				// console.log(row)
				this.$refs.preview.openFile(row);
			}
		},
		openObject: function (row) {
			if (row.type === "folder") {
				this.$router.push({
					name: "files-folder",
					params: { bucket: this.selectedBucket, folder: encode(row.key) },
				});
			} else {
				// console.log(row)
				this.$refs.preview.openFile(row);
			}
		},
		renameObject: function (row) {
			if (row.type === "folder") {
				this.$router.push({
					name: "files-folder",
					params: { bucket: this.selectedBucket, folder: encode(row.key) },
				});
			} else {
				// console.log(row)
				this.$refs.preview.openFile(row);
			}
		},
		clearSelection: function () {
			this.selected = [];
			this.lastSelectedIndex = -1;
		},
		deleteSelected: function () {
			this.q.dialog({
				title: 'Confirm Delete',
				message: `Are you sure you want to delete ${this.selected.length} file(s)?`,
				cancel: true,
				persistent: true
			}).onOk(async () => {
				// Store selected file names before deletion
				const filesToDelete = [...this.selected];

				// Immediately remove from view for instant feedback
				filesToDelete.forEach(file => {
					const index = this.rows.findIndex(r => r.name === file.name);
					if (index !== -1) {
						this.rows.splice(index, 1);
					}
				});

				this.clearSelection();

				// Delete files in background
				for (const file of filesToDelete) {
					try {
						await this.$refs.options.deleteObject(file);
					} catch (e) {
						console.error(`Failed to delete ${file.name}:`, e);
					}
				}

				// Refresh to ensure consistency
				await this.fetchFiles();

				this.q.notify({
					type: 'positive',
					message: 'Files deleted successfully',
					timeout: 2000
				});
			});
		},
		moveSelected: function () {
			this.q.notify({
				type: 'info',
				message: 'Move functionality coming soon',
				timeout: 2000
			});
		},
		copySelected: function () {
			this.q.notify({
				type: 'info',
				message: 'Copy functionality coming soon',
				timeout: 2000
			});
		},
		downloadSelected: function () {
			this.selected.forEach(file => {
				if (file.type !== 'folder') {
					window.open(`${this.mainStore.serverUrl}/api/buckets/${this.selectedBucket}/${file.key}`, '_blank');
				}
			});
			this.q.notify({
				type: 'positive',
				message: `Downloading ${this.selected.length} file(s)`,
				timeout: 2000
			});
		},
		formatBytes: function (bytes) {
			if (bytes === 0) return '0 Bytes';
			const k = 1024;
			const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
		},
		fetchFiles: async function () {
			this.loading = true;
			this.gridPage = 1;  // Reset to page 1 when fetching new folder

			this.rows = await apiHandler.fetchFile(
				this.selectedBucket,
				this.selectedFolder,
				"/",
			);
			this.loading = false;
		},
		openPreviewFromKey: async function () {
			let key = `${decode(this.$route.params.file)}`;
			if (this.selectedFolder && this.selectedFolder !== ROOT_FOLDER) {
				key = `${this.selectedFolder}${decode(this.$route.params.file)}`;
			}

			const file = await apiHandler.headFile(this.selectedBucket, key);
			this.$refs.preview.openFile(file);
		},
	},
	created() {
		this.fetchFiles();
	},
	mounted() {
		this.$refs.table.sort("name");

		this.$bus.on("fetchFiles", this.fetchFiles);

		if (this.$route.params.file) {
			this.openPreviewFromKey();
		}
	},
	beforeUnmount() {
		this.$bus.off("fetchFiles");
	},
	setup() {
		return {
			mainStore: useMainStore(),
			q: useQuasar(),
		};
	},
});
</script>

<style scoped lang="scss">
.modern-files-page {
  background: transparent;
  padding: 20px;
}

.modern-content {
  // TRUE GLASSMORPHISM
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  // REAL 3D DEPTH
  border-radius: 24px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 8px 24px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.5);

  // PROPER SPACING
  padding: 32px;
  margin: 10px;
  max-width: 1400px;

  // 3D TRANSFORM
  transform: translateZ(0);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow:
      0 24px 70px rgba(0, 0, 0, 0.18),
      0 10px 28px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }
}

// HEADER WITH BREADCRUMBS AND VIEW TOGGLE
.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.view-toggle {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.6);
  padding: 6px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(30, 60, 114, 0.15);
}

.modern-breadcrumbs {
  flex: 1;
  padding: 16px 20px;

  // GLASSMORPHISM
  background: rgba(30, 60, 114, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  // 3D DEPTH
  border-radius: 16px;
  box-shadow:
    0 4px 16px rgba(30, 60, 114, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(30, 60, 114, 0.2);
  font-weight: 600;
  font-size: 1.05em;

  :deep(.q-breadcrumbs__el) {
    color: #1e3c72;
    transition: all 0.2s ease;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

    &:hover {
      color: #2a5298;
      transform: translateY(-2px);
      text-shadow: 0 2px 4px rgba(42, 82, 152, 0.3);
    }
  }
}

// GRID VIEW STYLES
.files-grid {
  min-height: 400px;
}

.grid-loading,
.grid-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;

  p {
    font-size: 1.2em;
    font-weight: 600;
    color: #718096;
    margin: 0;
  }
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(55px, 1fr));
  gap: 6px;
  padding: 5px 0;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px 5px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 6px;
  border: 1px solid rgba(30, 60, 114, 0.15);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 65px;

  // BEAUTIFUL CARD SHADOW
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);

  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(30, 60, 114, 0.4);
    background: rgba(255, 255, 255, 1);

    // ENHANCED HOVER SHADOW
    box-shadow:
      0 20px 50px rgba(30, 60, 114, 0.25),
      0 10px 30px rgba(30, 60, 114, 0.15),
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 1);

    .card-icon-wrapper {
      transform: scale(1.1);
      box-shadow:
        0 12px 35px rgba(30, 60, 114, 0.35),
        0 6px 18px rgba(30, 60, 114, 0.25);
    }

    .card-menu-btn {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(-4px) scale(1.01);
  }
}

.card-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  margin-bottom: 4px;
  background: linear-gradient(135deg, rgba(30, 60, 114, 0.1) 0%, rgba(42, 82, 152, 0.08) 100%);
  border-radius: 5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  // ICON SHADOW - THE KEY FEATURE
  box-shadow:
    0 2px 6px rgba(30, 60, 114, 0.2),
    0 1px 3px rgba(30, 60, 114, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.card-icon {
  font-size: 14px !important;

  // BEAUTIFUL ICON DROP SHADOW
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.card-info {
  width: 100%;
  text-align: center;
}

.card-name {
  font-size: 0.6em;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 2px;
  line-height: 1.2;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 0.5em;
  color: #718096;
  font-weight: 500;
}

.card-size {
  font-weight: 600;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-date {
  font-size: 0.9em;
}

.card-menu-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    background: white !important;
    box-shadow: 0 6px 18px rgba(30, 60, 114, 0.2);
  }
}

// TABLE VIEW STYLES
.modern-file-table {
  border-radius: 20px;
  overflow: hidden;

  // TRUE 3D ELEVATION
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);

  // SPACING
  margin: 10px 0;

  // GLASSMORPHIC BACKGROUND
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);

  :deep(thead) {
    // TOP-TO-BOTTOM GRADIENT: darker edges, highlighted center
    background: linear-gradient(180deg,
      #909090 0%,              // 20% darker top
      #c8c8c8 15%,             // Lighter
      #e0e0e0 50%,             // Bright center highlight
      #c8c8c8 85%,             // Lighter
      #909090 100%             // 20% darker bottom
    );
    border: 1px solid #707070;
    border-bottom: 3px solid #505050;

    // ULTRA 3D DEPTH - REALLY POPPING OUT
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.35),
      0 6px 16px rgba(0, 0, 0, 0.25),
      0 3px 8px rgba(0, 0, 0, 0.15),
      inset 0 2px 0 rgba(255, 255, 255, 0.6),
      inset 0 -2px 0 rgba(0, 0, 0, 0.25);

    // Extra pop with transform
    transform: translateZ(20px);

    tr {
      height: 60px;

      th {
        color: #1a1a1a;
        font-weight: 800;
        font-size: 0.95em;
        letter-spacing: 0.5px;
        padding: 16px 24px;
        vertical-align: middle;
        text-shadow:
          0 1px 1px rgba(255, 255, 255, 0.6),
          0 -1px 1px rgba(0, 0, 0, 0.2);
        position: relative;

        // Resizable handle for column headers
        &::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          opacity: 0;
          transition: opacity 0.2s;
          background: rgba(30, 60, 114, 0.3);
        }

        &:hover::after {
          opacity: 1;
        }

        // Match body column widths for perfect alignment
        &:nth-child(1) { width: auto; min-width: 250px; flex: 1 1 auto; max-width: 600px; } // Name
        &:nth-child(2) { width: 180px; min-width: 180px; flex: 0 0 180px; resize: horizontal; } // Last Modified
        &:nth-child(3) { width: 120px; min-width: 120px; flex: 0 0 120px; text-align: right; resize: horizontal; } // Size
        &:nth-child(4) { width: 60px; min-width: 60px; flex: 0 0 60px; text-align: center; } // Options
      }
    }
  }

  :deep(tbody) {
    tr {
      height: 60px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.5);

      &:hover {
        background: linear-gradient(135deg, rgba(30, 60, 114, 0.08) 0%, rgba(42, 82, 152, 0.05) 100%);
        transform: translateX(8px) translateZ(10px);
        box-shadow:
          -4px 0 12px rgba(30, 60, 114, 0.2),
          0 4px 16px rgba(30, 60, 114, 0.15);
      }

      td {
        padding: 16px 24px;
        border-bottom: 1px solid rgba(30, 60, 114, 0.08);
        backdrop-filter: blur(5px);
        vertical-align: middle;
        max-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        position: relative;

        // Flex-based column widths with proper spacing
        &:nth-child(1) {
          width: auto;
          min-width: 250px;
          flex: 1 1 auto;
          max-width: 600px; // Prevent extremely long names from breaking layout
        }
        &:nth-child(2) {
          width: 180px;
          min-width: 180px;
          flex: 0 0 180px;
          resize: horizontal; // Allow horizontal resizing
        }
        &:nth-child(3) {
          width: 120px;
          min-width: 120px;
          flex: 0 0 120px;
          text-align: right;
          resize: horizontal;
        }
        &:nth-child(4) {
          width: 60px;
          min-width: 60px;
          flex: 0 0 60px;
          text-align: center;
          overflow: visible; // Allow menu to show
        }
      }
    }
  }

  :deep(.q-icon) {
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
  }
}

// Truncate long file names with ellipsis
.file-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}

.modern-file-table table {
  width: 100%;
  table-layout: fixed;
  border-spacing: 0;
  border-collapse: collapse;
  display: table;
}

.modern-file-table thead {
  display: table-header-group;
}

.modern-file-table tbody {
  display: table-row-group;
}

.modern-file-table tr {
  display: table-row;
}

.modern-file-table th,
.modern-file-table td {
  display: table-cell;
}

.modern-file-table td:first-of-type,
.modern-file-table th:first-of-type {
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

// FILE OPERATIONS TOOLBAR
.file-operations-toolbar {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  border-radius: 12px;
  margin: 10px 0;
  padding: 8px 16px;
  box-shadow:
    0 4px 16px rgba(30, 60, 114, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  .selection-count {
    font-size: 0.95em;
    font-weight: 600;
  }

  :deep(.q-btn) {
    color: white;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
  }

  :deep(.q-separator) {
    background: rgba(255, 255, 255, 0.3);
  }
}

// GRID PAGINATION
.grid-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(30, 60, 114, 0.15);

  .pagination-info {
    font-size: 0.9em;
    font-weight: 600;
    color: #2d3748;
  }

  :deep(.q-btn) {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    color: white;
    transition: all 0.2s ease;

    &:hover:not(.disabled) {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(30, 60, 114, 0.3);
    }

    &.disabled {
      opacity: 0.3;
    }
  }
}

// STATUS BAR (Windows Explorer Style)
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  border-radius: 12px;
  border: 1px solid rgba(30, 60, 114, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-size: 0.85em;
  color: #2d3748;

  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;

    .q-icon {
      color: #1e3c72;
      filter: drop-shadow(0 1px 2px rgba(30, 60, 114, 0.2));
    }

    &.selected-info {
      color: #1e3c72;
      font-weight: 600;

      .size-info {
        color: #2a5298;
        font-weight: 500;
      }
    }

    &.total-size {
      font-weight: 600;
      color: #2a5298;
    }
  }

  :deep(.q-separator) {
    height: 16px;
    background: rgba(30, 60, 114, 0.2);
  }
}
</style>
