import { api } from "boot/axios";
import { useMainStore } from "stores/main-store";

export const ROOT_FOLDER = "IA=="; // IA== is a space

function mapFile(obj, prefix) {
	const date = new Date(obj.uploaded);

	return {
		...obj,
		hash: encode(obj.key),
		nameHash: encode(obj.key.replace(prefix, "")),
		name: obj.key.replace(prefix, ""),
		lastModified: timeSince(date),
		timestamp: date.getTime(),
		size: bytesToSize(obj.size),
		sizeRaw: obj.size,
		type: "file",
		icon: "article",
		color: "grey",
	};
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff(
	operation,
	maxAttempts = 3,
	initialDelay = 1000,
	maxDelay = 10000,
	backoffFactor = 2,
) {
	let lastError = null;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Don't retry if upload was cancelled by user
			if (error.name === 'AbortError' || error.name === 'CanceledError') {
				throw lastError;
			}

			if (attempt === maxAttempts) {
				throw lastError;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(
				initialDelay * Math.pow(backoffFactor, attempt - 1),
				maxDelay,
			);

			// Wait before next attempt
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// This line should never be reached due to the throw above
	throw lastError || new Error("Unexpected error in retryWithBackoff");
}

export const timeSince = (date) => {
	// Return compact date and time stamp (e.g., "8/23/25 10:30a")
	return date.toLocaleString('en-US', {
		month: 'numeric',
		day: 'numeric',
		year: '2-digit',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).replace(' AM', 'a').replace(' PM', 'p');
};
export const bytesToSize = (bytes) => {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "0 Byte";
	const i = Number.parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return `${Math.round(bytes / 1024 ** i, 2)} ${sizes[i]}`;
};

export const bytesToMegabytes = (bytes) => {
	return Math.round(bytes / 1024 ** 2);
};

export const encode = (key) => {
	if (key && key !== "/" && key.startsWith("/")) {
		// File keys should never start with /
		key = key.slice(1);
	}
	return btoa(unescape(encodeURIComponent(key)));
};

export const decode = (key) => {
	return decodeURIComponent(escape(atob(key)));
};

export const apiHandler = {
	createFolder: (key, bucket) => {
		return api.post(`/buckets/${bucket}/folder`, {
			key: encode(key),
		});
	},
	deleteObject: (key, bucket) => {
		return api.post(`/buckets/${bucket}/delete`, {
			key: encode(key),
		});
	},
	downloadFile: (
		bucket,
		key,
		previewConfig,
		onDownloadProgress,
		abortControl,
	) => {
		const extra = {};
		if (
			previewConfig.downloadType === "objectUrl" ||
			previewConfig.downloadType === "blob"
		) {
			extra.responseType = "arraybuffer";
		}
		if (abortControl) {
			extra.signal = abortControl.signal;
		}
		if (onDownloadProgress) {
			extra.onDownloadProgress = onDownloadProgress;
		}

		return api.get(`/buckets/${bucket}/${encode(key)}`, extra);
	},
	headFile: async (bucket, key) => {
		let prefix = "";
		if (key.includes("/")) {
			prefix = key.replace(key.split("/").pop(), "");
		}

		const resp = await api.get(`/buckets/${bucket}/${encode(key)}/head`);

		if (resp.status === 200) {
			return mapFile(resp.data, prefix);
		}
	},
	renameObject: (bucket, oldKey, newKey) => {
		return api.post(`/buckets/${bucket}/move`, {
			oldKey: encode(oldKey),
			newKey: encode(newKey),
		});
	},
	updateMetadata: async (bucket, key, customMetadata, httpMetadata = {}) => {
		let prefix = "";
		if (key.includes("/")) {
			prefix = key.replace(key.split("/").pop(), "");
		}

		const resp = await api.post(`/buckets/${bucket}/${encode(key)}`, {
			customMetadata: customMetadata,
			httpMetadata: httpMetadata,
		});

		if (resp.status === 200) {
			return mapFile(resp.data, prefix);
		}
	},
	multipartCreate: (file, key, bucket) => {
		return api.post(`/buckets/${bucket}/multipart/create`, null, {
			params: {
				key: encode(key),
				httpMetadata: encode(
					JSON.stringify({
						contentType: file.type,
					}),
				),
			},
		});
	},
	multipartComplete: (file, key, bucket, parts, uploadId) => {
		return api.post(`/buckets/${bucket}/multipart/complete`, {
			key: encode(key),
			uploadId,
			parts,
		});
	},
	multipartAbort: (key, bucket, uploadId) => {
		return api.post(`/buckets/${bucket}/multipart/abort`, {
			key: encode(key),
			uploadId,
		});
	},
	multipartUpload: (uploadId, partNumber, bucket, key, chunk, callback, signal) => {
		return api.post(`/buckets/${bucket}/multipart/upload`, chunk, {
			params: {
				key: encode(key),
				uploadId,
				partNumber,
			},
			onUploadProgress: callback,
			signal: signal,
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});
	},
	uploadObjects: async (file, key, bucket, callback, signal) => {
		return await retryWithBackoff(
			async () => {
				return await api.post(`/buckets/${bucket}/upload`, file, {
					params: {
						key: encode(key),
						httpMetadata: encode(
							JSON.stringify({
								contentType: file.type,
							}),
						),
					},
					headers: {
						"Content-Type": "multipart/form-data",
					},
					onUploadProgress: callback,
					signal: signal,
				});
			},
			5,
			1000,
			10000,
			2,
		);
	},
	listObjects: async (bucket, prefix, delimiter = "/", cursor = null) => {
		return await api.get(
			`/buckets/${bucket}?include=customMetadata&include=httpMetadata`,
			{
				params: {
					delimiter: delimiter,
					prefix: prefix && prefix !== "/" ? encode(prefix) : "",
					cursor: cursor,
				},
			},
		);
	},
	fetchFile: async (bucket, prefix, delimiter = "/") => {
		const mainStore = useMainStore();
		let truncated = true;
		let cursor = null;
		const contentFiles = [];
		const contentFolders = [];

		while (truncated) {
			const response = await apiHandler.listObjects(
				bucket,
				prefix,
				delimiter,
				cursor,
			);

			truncated = response.data.truncated;
			cursor = response.data.cursor;

			if (response.data.objects) {
				const files = response.data.objects
					.filter((obj) => {
						return (
							!(obj.key.endsWith("/") && delimiter !== "") && obj.key !== prefix
						); // Remove selected folder when delimiter is defined
					})
					.map((obj) => mapFile(obj, prefix))
					.filter((obj) => {
						// Remove hidden files
						return !(
							mainStore.showHiddenFiles !== true && obj.name.startsWith(".")
						);
					});

				for (const f of files) {
					contentFiles.push(f);
				}
			}

			if (response.data.delimitedPrefixes) {
				const folders = response.data.delimitedPrefixes
					.map((obj) => ({
						name: obj.replace(prefix, ""),
						hash: encode(obj.key),
						key: obj,
						lastModified: "--",
						timestamp: 0,
						size: "--",
						sizeRaw: 0,
						type: "folder",
						icon: "folder",
						color: "orange",
					}))
					.filter((obj) => {
						// Remove hidden files
						return !(
							mainStore.showHiddenFiles !== true && obj.name.startsWith(".")
						);
					});

				for (const f of folders) {
					contentFolders.push(f);
				}
			}
		}

		return [...contentFolders, ...contentFiles];
	},
};
