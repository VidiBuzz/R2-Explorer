<template>
  <div
    ref="dragContainer"
    class="upload-box"
    :class="{ 'active': isHover }"
    @dragover.prevent="dragover"
    @dragleave.prevent="dragleave"
    @drop.prevent="drop"
  >
    <slot></slot>
    <div class="drop-files">
      <div class="box">
        <h3>Drop files to upload</h3>
        <span class="font-28"><i class="bi bi-cloud-upload-fill"></i></span>
      </div>
    </div>
  </div>

  <!--  <input style="display: none" @change="inputFiles" type="file" name="files[]" ref="uploader" multiple directory="" webkitdirectory="" moxdirectory=""/>-->
  <input style="display: none" @change="inputFiles" type="file" name="files[]" ref="filesUploader" multiple/>
  <input style="display: none" @change="inputFolders" type="file" webkitdirectory name="files[]" ref="foldersUploader"
         multiple/>
</template>

<script>
import { useQuasar } from "quasar";
import { ROOT_FOLDER, apiHandler, decode, sleep } from "src/appUtils";
import { useMainStore } from "stores/main-store";
import { uploadResumeManager } from "src/utils/upload-resume-manager";

export default {
	data: () => ({
		isHover: false,
		filelist: [], // Store our uploaded files
		dragContainer: {
			top: 0,
			bottom: 0,
			left: 0,
			right: 0,
		},
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
	},
	methods: {
		openFilesUploader() {
			this.$refs.filesUploader.click();
		},
		openFoldersUploader() {
			this.$refs.foldersUploader.click();
		},
		dragover(event) {
			if (this.mainStore.apiReadonly || this.isHover === true) {
				return;
			}

			const coordinates = this.$refs.dragContainer.getBoundingClientRect();
			this.dragContainer = {
				top: coordinates.top,
				bottom: coordinates.bottom,
				left: coordinates.left,
				right: coordinates.right,
			};

			this.isHover = true;
		},
		dragleave(event) {
			if (this.isHover === false) {
				return;
			}

			if (
				event.clientX < this.dragContainer.left ||
				event.clientX > this.dragContainer.right ||
				event.clientY > this.dragContainer.bottom ||
				event.clientY < this.dragContainer.top
			) {
				this.isHover = false;
			}
		},
		inputFiles(event) {
			this.uploadFiles({
				"": event.target.files,
			});
		},
		inputFolders(event) {
			const folders = {};
			for (const file of event.target.files) {
				const lastIndex = file.webkitRelativePath.lastIndexOf("/");
				const path = file.webkitRelativePath.slice(0, lastIndex);

				if (folders[path] === undefined) {
					folders[path] = [];
				}

				folders[path].push(file);
			}

			this.uploadFiles(folders);
		},
		async uploadFiles(folders) {
			let totalFiles = 0;
			let totalSize = 0;
			const allFiles = [];

			// Create folders and count files
			for (const [folder, files] of Object.entries(folders)) {
				// if (folder.slice(-1) === '/') {
				//   folder = folder.slice(0, -1)
				// }

				if (folder !== "") {
					const folderKey = `${this.selectedFolder + folder}/`;

					await apiHandler.createFolder(folderKey, this.selectedBucket);
				}

				totalFiles += files.length;

				for (const file of files) {
					allFiles.push(file);
					totalSize += file.size;
				}
			}

			this.$bus.emit("fetchFiles");
			this.mainStore.addUploadingFiles(allFiles);

			// Track uploads in transfers panel
			const { useTransfersStore } = await import('stores/transfers-store');
			const transfersStore = useTransfersStore();
			for (const file of allFiles) {
				transfersStore.addTransfer({
					id: file.webkitRelativePath || file.name,
					filename: file.name,
					type: 'upload',
					fileSize: file.size,
					progress: 0
				});
			}

			const notif = this.q.notify({
				group: false,
				spinner: true,
				message: `Uploading files 1/${allFiles.length}...`,
				caption: "0%",
				timeout: 0,
			});

			// Upload files with concurrency limit of 4
			const CONCURRENT_UPLOADS = 4;
			const uploadQueue = [];

			// Build upload queue
			for (const [folder, files] of Object.entries(folders)) {
				let targetFolder = this.selectedFolder + folder;
				if (targetFolder.length > 0 && targetFolder.slice(-1) !== "/") {
					targetFolder += "/";
				}
				if (targetFolder === "/" || targetFolder === ROOT_FOLDER) {
					targetFolder = "";
				}

				for (const file of files) {
					uploadQueue.push({ file, folder: targetFolder });
				}
			}

			// Upload function for a single file
			const uploadFile = async ({ file, folder }) => {
				const key = folder + file.name;
				const chunkSize = 95 * 1024 * 1024;
				const controller = new AbortController();
				this.mainStore.setUploadController(file.name, controller);

				try {
					let uploadedBytes = 0;

					if (file.size > chunkSize) {
						const totalParts = Math.ceil(file.size / chunkSize);

						// Check for existing resume state
						let uploadId;
						let parts = [];
						let startPartNumber = 1;

						const canResume = uploadResumeManager.canResume(this.selectedBucket, key, file.size, chunkSize);

						if (canResume) {
							// Resume existing upload
							const resumeState = uploadResumeManager.getUploadState(this.selectedBucket, key, file.size);
							uploadId = resumeState.uploadId;
							parts = resumeState.completedParts;
							startPartNumber = uploadResumeManager.getNextPartNumber(this.selectedBucket, key, file.size);

							// Calculate uploaded bytes from completed parts
							uploadedBytes = (startPartNumber - 1) * chunkSize;

							console.log(`Resuming upload for ${file.name} from part ${startPartNumber}/${totalParts}`);
						} else {
							// Create new multipart upload
							const response = await apiHandler.multipartCreate(file, key, this.selectedBucket);
							uploadId = response.data.uploadId;

							// Start tracking this upload
							uploadResumeManager.startUpload(this.selectedBucket, key, file.size, uploadId, chunkSize);
						}

						// Upload parts (skip already completed parts)
						for (let partNumber = startPartNumber; partNumber <= totalParts; partNumber++) {
							const start = (partNumber - 1) * chunkSize;
							const end = Math.min(start + chunkSize, file.size);
							const chunk = file.slice(start, end);

							const { data } = await apiHandler.multipartUpload(
								uploadId, partNumber, this.selectedBucket, key, chunk,
								(progressEvent) => {
									uploadedBytes = start + progressEvent.loaded;
									const progress = (uploadedBytes * 100) / file.size;
									this.mainStore.setUploadProgress({
										filename: file.name,
										progress: progress,
										partNumber: partNumber,
										totalParts: totalParts,
										uploadedBytes: uploadedBytes
									});
									// Update transfers panel
									transfersStore.updateTransfer(file.webkitRelativePath || file.name, {
										progress: progress,
										uploadedBytes: uploadedBytes
									});
								},
								controller.signal
							);

							// Save this part to resume manager
							uploadResumeManager.recordPart(this.selectedBucket, key, file.size, partNumber, data.etag);
							parts.push(data);
						}

						// Complete multipart upload
						await apiHandler.multipartComplete(file, key, this.selectedBucket, parts, uploadId);

						// Clear resume state after successful completion
						uploadResumeManager.clearUpload(this.selectedBucket, key, file.size);
					} else {
						await apiHandler.uploadObjects(file, key, this.selectedBucket,
							(progressEvent) => {
								uploadedBytes = progressEvent.loaded;
								const progress = (uploadedBytes * 100) / file.size;
								this.mainStore.setUploadProgress({
									filename: file.name,
									progress: progress,
									uploadedBytes: uploadedBytes
								});
								// Update transfers panel
								transfersStore.updateTransfer(file.webkitRelativePath || file.name, {
									progress: progress,
									uploadedBytes: uploadedBytes
								});
							},
							controller.signal
						);
					}
					this.mainStore.completeUpload(file.name);
					// Mark transfer as complete
					transfersStore.completeTransfer(file.webkitRelativePath || file.name);
				} catch (e) {
					if (e.name === 'AbortError' || e.name === 'CanceledError') {
						// Check if this was a multipart upload that needs aborting
						const resumeState = uploadResumeManager.getUploadState(this.selectedBucket, key, file.size);
						if (resumeState && resumeState.uploadId) {
							// Abort the multipart upload on the server
							try {
								await apiHandler.multipartAbort(key, this.selectedBucket, resumeState.uploadId);
								console.log(`Aborted multipart upload for ${file.name}`);
							} catch (abortError) {
								console.error(`Failed to abort multipart upload: ${abortError.message}`);
							}
							// Clear resume state
							uploadResumeManager.clearUpload(this.selectedBucket, key, file.size);
						}

						this.mainStore.removeUploadingFile(file.name);
						// Transfer already removed by cancel button
					} else {
						console.error(`Unable to upload file ${file.name}: ${e.message}`);
						// Mark transfer as failed
						transfersStore.failTransfer(file.webkitRelativePath || file.name, e.message);

						// Don't clear resume state on failure - allow resuming later
					}
				}
			};

			// Upload with concurrency control
			const uploadWithConcurrency = async (queue, concurrency) => {
				const executing = [];
				let completed = 0;

				for (const item of queue) {
					const promise = uploadFile(item).then(() => {
						executing.splice(executing.indexOf(promise), 1);
						completed++;
						notif({
							message: `Uploading files ${completed}/${queue.length}...`,
							caption: `${Math.round((completed * 100) / queue.length)}%`,
						});
					});
					executing.push(promise);

					if (executing.length >= concurrency) {
						await Promise.race(executing);
					}
				}
				await Promise.all(executing);
			};

			await uploadWithConcurrency(uploadQueue, CONCURRENT_UPLOADS);

			notif({
				icon: "done", // we add an icon
				spinner: false, // we reset the spinner setting so the icon can be displayed
				caption: "100%",
				message: "Files Uploaded!",
				timeout: 5000, // we will timeout it in 5s
			});

			// Clean up old upload resume states (>7 days)
			uploadResumeManager.cleanupOldUploads();

			// Refresh file list to show newly uploaded files
			this.$bus.emit("fetchFiles");
		},
		async traverseFileTree(item, path, folders, depth) {
			path = path || "";

			// Root files are handled outside
			if (item.isFile && depth > 0) {
				const filePromise = new Promise((resolve, reject) => {
					item.file((file) => {
						folders[path].push(file);

						resolve();
					});
				});

				await filePromise;
			} else if (item.isDirectory) {
				const newPath = path ? `${path}/${item.name}` : item.name;
				if (folders[newPath] === undefined) {
					folders[newPath] = [];
				}

				// Get folder contents
				const dirReader = item.createReader();

				const promise = new Promise((resolve, reject) => {
					dirReader.readEntries(async (entries) => {
						for (let i = 0; i < entries.length; i++) {
							await this.traverseFileTree(
								entries[i],
								newPath,
								folders,
								depth + 1,
							);
						}
						resolve();
					});
				});

				await promise;
			}
		},
		async drop(event) {
			if (!this.isHover) {
				return;
			}

			// files uploaded on root
			const rootFiles = event.dataTransfer.files;

			// folders and files
			const items = await event.dataTransfer.items;
			const folders = {};

			for (const item of items) {
				// webkitGetAsEntry is where the magic happens
				const entry = item.webkitGetAsEntry();
				if (entry) {
					await this.traverseFileTree(entry, "", folders, 0);
				}
			}

			// Root files also include the root folders
			const cleanedRootFiles = [];
			for (const rootFile of rootFiles) {
				if (folders[rootFile.name] === undefined) {
					cleanedRootFiles.push(rootFile);
				}
			}

			folders[""] = cleanedRootFiles;

			// console.log(cleanedRootFiles)
			// console.log(folders)

			this.uploadFiles(folders);

			this.isHover = false;
		},
	},
	mounted() {
		this.$bus.on("openFilesUploader", this.openFilesUploader);
		this.$bus.on("openFoldersUploader", this.openFoldersUploader);
	},
	beforeUnmount() {
		this.$bus.off("openFilesUploader");
		this.$bus.off("openFoldersUploader");
	},
	setup() {
		return {
			mainStore: useMainStore(),
			q: useQuasar(),
		};
	},
};
</script>

<style lang="scss" scoped>
.upload-box {
  //outline: 2px dashed black;
  .box {
    display: none;
  }

  .drop-files {
    align-items: center;
    justify-content: center;
    z-index: -1;
    display: flex;
    position: absolute;
    right: 0;
    left: 0;
    bottom: 0;
    top: 0;
    flex-direction: column;
  }

  &.active {
    outline: 2px dashed black;
    border-radius: 5px;
    height: 100%;

    .box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 50px;
      border-radius: 5px;
      background: rgb(255 255 255 / 85%);
    }

    .drop-files {
      background: rgb(0 0 0 / 10%);
      z-index: 10;
    }

  }

}
</style>
