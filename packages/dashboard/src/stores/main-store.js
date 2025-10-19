import { api } from "boot/axios";
import { defineStore } from "pinia";

export const useMainStore = defineStore("main", {
	state: () => ({
		// Config
		apiReadonly: true,
		auth: {},
		config: {},
		version: "",
		showHiddenFiles: false,

		// Frontend data
		buckets: [],

		// Upload tracking
		uploadingFiles: {},
		uploadControllers: {},

		// Download tracking
		downloadingFiles: {},
		downloadControllers: {},
	}),
	getters: {
		serverUrl() {
			if (process.env.NODE_ENV === "development") {
				return process.env.VUE_APP_SERVER_URL || "http://localhost:8787";
			}
			return window.location.origin;
		},
	},
	actions: {
		async loadServerConfigs(router, q, handleError = false) {
			// This is the initial requests to server, that also checks if user needs auth

			try {
				const response = await api.get("/server/config", {
					validateStatus: (status) => status >= 200 && status < 300,
				});

				this.apiReadonly = response.data.config.readonly;
				this.config = response.data.config;
				this.auth = response.data.auth;
				this.version = response.data.version;
				this.showHiddenFiles = response.data.config.showHiddenFiles;
				this.buckets = response.data.buckets;

				const url = new URL(window.location.href);
				if (url.searchParams.get("next")) {
					await router.replace(url.searchParams.get("next"));
				} else if (url.pathname === "/" || url.pathname === "/auth/login") {
					await router.push({
						name: "files-home",
						params: { bucket: this.buckets[0].name },
					});
				}

				return true;
			} catch (error) {
				console.log(error);
				if (error.response.status === 302) {
					// Handle cloudflare access login page
					const nextUrl = error.response.headers.Location;
					if (nextUrl) {
						window.location.replace(nextUrl);
					}
				}

				if (handleError) {
					const respText = await error.response.data;
					if (respText === "Authentication error: Basic Auth required") {
						await router.push({
							name: "login",
							query: { next: router.currentRoute.value.fullPath },
						});
						return;
					}

					q.notify({
						type: "negative",
						message: respText,
						timeout: 10000, // we will timeout it in 10s
					});
				} else {
					throw error;
				}
			}

			return false;
		},
		addUploadingFiles(files) {
			files.forEach((file) => {
				const filename = file.name || file;
				const fileSize = file.size || 0;
				this.uploadingFiles[filename] = {
					progress: 0,
					totalParts: 0,
					completedParts: 0,
					fileSize: fileSize,
					startTime: Date.now(),
					endTime: null,
					duration: null,
					uploadedBytes: 0,
					speed: 0,
					timeRemaining: null,
				};
			});
		},
	setUploadProgress({ filename, progress, partNumber, totalParts, uploadedBytes }) {
		if (this.uploadingFiles[filename]) {
			const elapsed = Date.now() - this.uploadingFiles[filename].startTime;
			const uploaded = uploadedBytes || (this.uploadingFiles[filename].fileSize * progress / 100);

			// Calculate speed in KB/s
			const speed = elapsed > 0 ? uploaded / elapsed : 0; // bytes per ms
			const speedKBs = (speed * 1000) / 1024; // KB/s

			// Calculate time remaining
			const remaining = this.uploadingFiles[filename].fileSize - uploaded;
			const timeRemaining = speed > 0 ? remaining / speed : null; // milliseconds

			// Create new object to trigger Vue reactivity
			this.uploadingFiles[filename] = {
				...this.uploadingFiles[filename],
				progress: progress,
				completedParts: partNumber !== undefined ? partNumber : this.uploadingFiles[filename].completedParts,
				totalParts: totalParts !== undefined ? totalParts : this.uploadingFiles[filename].totalParts,
				uploadedBytes: uploaded,
				speed: speedKBs,
				timeRemaining: timeRemaining,
			};
		}
	},
	clearUploadingFiles() {
		this.uploadingFiles = {};
	},
	removeUploadingFile(filename) {
		// Use reactive deletion to ensure UI updates immediately
		const newFiles = { ...this.uploadingFiles };
		delete newFiles[filename];
		this.uploadingFiles = newFiles;
	},
	completeUpload(filename) {
		if (this.uploadingFiles[filename]) {
			const endTime = Date.now();
			this.uploadingFiles[filename] = {
				...this.uploadingFiles[filename],
				progress: 100,
				endTime: endTime,
				duration: endTime - this.uploadingFiles[filename].startTime,
			};
		}
	},
		setUploadController(filename, controller) {
			this.uploadControllers[filename] = controller;
		},
		cancelUpload(filename) {
			if (this.uploadControllers[filename]) {
				this.uploadControllers[filename].abort();
				delete this.uploadControllers[filename];
			}
			this.removeUploadingFile(filename);
		},
		cancelAllUploads() {
			Object.keys(this.uploadingFiles).forEach(filename => {
				if (this.uploadingFiles[filename].progress < 100) {
					this.cancelUpload(filename);
				}
			});
		},
		// Download tracking actions
		addDownloadingFile(filename, fileSize) {
			this.downloadingFiles[filename] = {
				progress: 0,
				fileSize: fileSize,
				startTime: Date.now(),
				endTime: null,
				duration: null,
			};
		},
		setDownloadProgress({ filename, progress }) {
			if (this.downloadingFiles[filename]) {
				this.downloadingFiles[filename].progress = progress;
			}
		},
		completeDownload(filename) {
			if (this.downloadingFiles[filename]) {
				this.downloadingFiles[filename].progress = 100;
				this.downloadingFiles[filename].endTime = Date.now();
				this.downloadingFiles[filename].duration =
					this.downloadingFiles[filename].endTime - this.downloadingFiles[filename].startTime;
			}
		},
		removeDownloadingFile(filename) {
			delete this.downloadingFiles[filename];
		},
		clearDownloadingFiles() {
			this.downloadingFiles = {};
		},
	},
});
