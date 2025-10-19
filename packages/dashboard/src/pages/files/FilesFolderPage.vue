<template>
  <q-page class="modern-files-page">
    <div class="q-pa-md modern-content">
      <q-breadcrumbs class="modern-breadcrumbs">
        <q-breadcrumbs-el style="cursor: pointer" v-for="obj in breadcrumbs" :key="obj.name" :label="obj.name" @click="breadcrumbsClick(obj)" />
      </q-breadcrumbs>

      <drag-and-drop ref="uploader">

        <q-table
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
		rows: [],
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

.modern-breadcrumbs {
  margin-bottom: 24px;
  padding: 16px 20px;

  // GLASSMORPHISM
  background: rgba(102, 126, 234, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  // 3D DEPTH
  border-radius: 16px;
  box-shadow:
    0 4px 16px rgba(102, 126, 234, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(102, 126, 234, 0.2);
  font-weight: 600;

  :deep(.q-breadcrumbs__el) {
    color: #667eea;
    transition: all 0.2s ease;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

    &:hover {
      color: #764ba2;
      transform: translateY(-2px);
      text-shadow: 0 2px 4px rgba(118, 75, 162, 0.3);
    }
  }
}

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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow:
      0 4px 12px rgba(102, 126, 234, 0.4),
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
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.05) 100%);
        transform: translateX(8px) translateZ(10px);
        box-shadow:
          -4px 0 12px rgba(102, 126, 234, 0.2),
          0 4px 16px rgba(102, 126, 234, 0.15);
      }

      td {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(102, 126, 234, 0.08);
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
