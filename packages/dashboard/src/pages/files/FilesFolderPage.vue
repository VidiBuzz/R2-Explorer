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
              v-for="row in rows"
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
          @row-click="openRowDlbClick"
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
              {{prop.row.name}}
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
				align: "left",
				field: "size",
				sortable: true,
				sort: (a, b, rowA, rowB) => {
					return rowA.sizeRaw - rowB.sizeRaw;
				},
			},
			{
				name: "options",
				label: "",
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
		openRowDlbClick: function (evt, row, index) {
			evt.preventDefault();
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
		fetchFiles: async function () {
			this.loading = true;

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
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  padding: 10px 0;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px 10px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 12px;
  border: 1px solid rgba(30, 60, 114, 0.15);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 130px;

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
  width: 50px;
  height: 50px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(30, 60, 114, 0.1) 0%, rgba(42, 82, 152, 0.08) 100%);
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  // ICON SHADOW - THE KEY FEATURE
  box-shadow:
    0 4px 12px rgba(30, 60, 114, 0.2),
    0 2px 6px rgba(30, 60, 114, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.card-icon {
  font-size: 28px !important;

  // BEAUTIFUL ICON DROP SHADOW
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))
          drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1));
}

.card-info {
  width: 100%;
  text-align: center;
}

.card-name {
  font-size: 0.75em;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
  line-height: 1.3;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.65em;
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
    // 3D GRADIENT HEADER
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    box-shadow:
      0 4px 12px rgba(30, 60, 114, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);

    tr {
      th {
        color: white;
        font-weight: 700;
        font-size: 0.95em;
        letter-spacing: 0.5px;
        padding: 18px 20px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    }
  }

  :deep(tbody) {
    tr {
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
        padding: 16px 20px;
        border-bottom: 1px solid rgba(30, 60, 114, 0.08);
        backdrop-filter: blur(5px);
      }
    }
  }

  :deep(.q-icon) {
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
  }
}

.modern-file-table table,
.modern-file-table tbody,
.modern-file-table thead {
  width: 100%;
  display: block;
}

.modern-file-table td:first-of-type,
.modern-file-table th:first-of-type {
  overflow-x: hidden;
  white-space: nowrap;
  flex-grow: 1;
  text-overflow: ellipsis;
}

.modern-file-table tr {
  display: flex;
  width: 100%;
  justify-content: center;
}
</style>
