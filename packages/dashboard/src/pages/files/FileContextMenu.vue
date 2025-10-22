<template>
  <q-list style="min-width: 100px">
    <q-item clickable v-close-popup @click="openObject">
      <q-item-section>Open</q-item-section>
    </q-item>
    <q-item clickable v-close-popup @click="downloadObject" v-if="prop.row.type === 'file'">
      <q-item-section>Download</q-item-section>
    </q-item>
    <q-item clickable v-close-popup @click="renameObject" v-if="prop.row.type === 'file'">
      <q-item-section>Rename</q-item-section>
    </q-item>
    <q-item clickable v-close-popup @click="updateMetadataObject" v-if="prop.row.type === 'file'">
      <q-item-section>Update Metadata</q-item-section>
    </q-item>
    <q-item clickable v-close-popup @click="shareObject">
      <q-item-section>Get sharable link</q-item-section>
    </q-item>
    <q-item clickable v-close-popup @click="deleteObject">
      <q-item-section>Delete</q-item-section>
    </q-item>
  </q-list>
</template>
<script>
import { useQuasar } from "quasar";
import { ROOT_FOLDER, decode, encode, apiHandler } from "src/appUtils";
import { useMainStore } from "stores/main-store";

export default {
	name: "FileContextMenu",
	props: {
		prop: {},
	},
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
	},
	methods: {
		renameObject: function () {
			this.q.notify({
				message: "Rename requires admin approval",
				timeout: 3000,
				type: "warning",
				icon: "lock"
			});
		},
		updateMetadataObject: function () {
			this.q.notify({
				message: "Update metadata requires admin approval",
				timeout: 3000,
				type: "warning",
				icon: "lock"
			});
		},
		openObject: function () {
			this.$emit("openObject", this.prop.row);
		},
		deleteObject: function () {
			this.q.notify({
				message: "Delete requires admin approval",
				timeout: 3000,
				type: "warning",
				icon: "lock"
			});
		},
		shareObject: async function () {
			let url;
			if (this.prop.row.type === "folder") {
				url =
					window.location.origin +
					this.$router.resolve({
						name: "files-folder",
						params: {
							bucket: this.selectedBucket,
							folder: encode(this.prop.row.key),
						},
					}).href;
			} else {
				url =
					window.location.origin +
					this.$router.resolve({
						name: "files-file",
						params: {
							bucket: this.selectedBucket,
							folder: this.selectedFolder
								? encode(this.selectedFolder)
								: ROOT_FOLDER,
							file: this.prop.row.nameHash,
						},
					}).href;
			}

			try {
				await navigator.clipboard.writeText(url);
				this.q.notify({
					message: "Link to file copied to clipboard!",
					timeout: 5000,
					type: "positive",
				});
			} catch (err) {
				this.q.notify({
					message: `Failed to copy: ${err}`,
					timeout: 5000,
					type: "negative",
				});
			}
		},
		downloadObject: async function () {
			const filename = this.prop.row.name;
			const fileSize = this.prop.row.size || 0;
			const fileKey = this.prop.row.key;

			// Add to downloading tracking
			this.mainStore.addDownloadingFile(filename, fileSize);

			// Create AbortController
			const controller = new AbortController();
			this.mainStore.setDownloadController(filename, controller);

			try {
				// Use apiHandler.downloadFile with progress callback
				const response = await apiHandler.downloadFile(
					this.selectedBucket,
					fileKey,
					{ downloadType: "blob" },
					(progressEvent) => {
						const progress = (progressEvent.loaded * 100) / (progressEvent.total || fileSize);
						this.mainStore.setDownloadProgress({
							filename: filename,
							progress: progress
						});
					},
					controller
				);

				// Create download link from response
				const blob = new Blob([response.data]);
				const url = window.URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = filename;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(url);

				this.mainStore.completeDownload(filename);
			} catch (e) {
				if (e.name === 'AbortError' || e.name === 'CanceledError') {
					this.mainStore.removeDownloadingFile(filename);
					return;
				}
				console.error(`Download failed for ${filename}:`, e);
				this.mainStore.removeDownloadingFile(filename);
				this.q.notify({
					message: `Download failed: ${e.message}`,
					timeout: 5000,
					type: "negative",
				});
			}
		},
	},
	setup() {
		return {
			mainStore: useMainStore(),
			q: useQuasar(),
		};
	},
};
</script>
