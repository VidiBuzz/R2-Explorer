/**
 * Upload Resume Manager
 * Handles persistence of multipart upload state to localStorage
 * Enables resuming uploads after crashes or interruptions
 */

const STORAGE_KEY = 'smartchannel_upload_resume';
const STORAGE_VERSION = 1;

export class UploadResumeManager {
	constructor() {
		this.storage = this._loadStorage();
	}

	/**
	 * Load all upload states from localStorage
	 */
	_loadStorage() {
		try {
			const data = localStorage.getItem(STORAGE_KEY);
			if (!data) return { version: STORAGE_VERSION, uploads: {} };

			const parsed = JSON.parse(data);

			// Validate version
			if (parsed.version !== STORAGE_VERSION) {
				console.warn('Upload resume storage version mismatch, clearing old data');
				return { version: STORAGE_VERSION, uploads: {} };
			}

			return parsed;
		} catch (e) {
			console.error('Failed to load upload resume data:', e);
			return { version: STORAGE_VERSION, uploads: {} };
		}
	}

	/**
	 * Save storage to localStorage
	 */
	_saveStorage() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
		} catch (e) {
			console.error('Failed to save upload resume data:', e);
		}
	}

	/**
	 * Generate unique key for upload (bucket + key + fileSize)
	 */
	_getUploadKey(bucket, key, fileSize) {
		return `${bucket}:${key}:${fileSize}`;
	}

	/**
	 * Start tracking a new multipart upload
	 */
	startUpload(bucket, key, fileSize, uploadId, chunkSize) {
		const uploadKey = this._getUploadKey(bucket, key, fileSize);

		this.storage.uploads[uploadKey] = {
			bucket,
			key,
			fileSize,
			uploadId,
			chunkSize,
			completedParts: [],
			startTime: Date.now(),
			lastUpdate: Date.now()
		};

		this._saveStorage();
	}

	/**
	 * Record a successfully uploaded part
	 */
	recordPart(bucket, key, fileSize, partNumber, etag) {
		const uploadKey = this._getUploadKey(bucket, key, fileSize);
		const upload = this.storage.uploads[uploadKey];

		if (!upload) {
			console.warn(`Upload not found: ${uploadKey}`);
			return;
		}

		// Add part if not already recorded
		const existingPart = upload.completedParts.find(p => p.partNumber === partNumber);
		if (!existingPart) {
			upload.completedParts.push({ partNumber, etag });
			upload.completedParts.sort((a, b) => a.partNumber - b.partNumber);
		}

		upload.lastUpdate = Date.now();
		this._saveStorage();
	}

	/**
	 * Get saved upload state for resuming
	 */
	getUploadState(bucket, key, fileSize) {
		const uploadKey = this._getUploadKey(bucket, key, fileSize);
		return this.storage.uploads[uploadKey] || null;
	}

	/**
	 * Check if upload can be resumed
	 */
	canResume(bucket, key, fileSize, chunkSize) {
		const state = this.getUploadState(bucket, key, fileSize);

		if (!state) return false;

		// Check if chunk size matches
		if (state.chunkSize !== chunkSize) {
			console.warn('Chunk size mismatch, cannot resume upload');
			return false;
		}

		// Check if upload is recent (within 7 days)
		const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
		if (state.lastUpdate < sevenDaysAgo) {
			console.warn('Upload state is too old, clearing');
			this.clearUpload(bucket, key, fileSize);
			return false;
		}

		return true;
	}

	/**
	 * Get next part number to upload
	 */
	getNextPartNumber(bucket, key, fileSize) {
		const state = this.getUploadState(bucket, key, fileSize);

		if (!state || state.completedParts.length === 0) {
			return 1;
		}

		// Find highest completed part number
		const maxPart = Math.max(...state.completedParts.map(p => p.partNumber));
		return maxPart + 1;
	}

	/**
	 * Get completed parts for multipart complete
	 */
	getCompletedParts(bucket, key, fileSize) {
		const state = this.getUploadState(bucket, key, fileSize);
		return state ? state.completedParts : [];
	}

	/**
	 * Clear upload state after successful completion
	 */
	clearUpload(bucket, key, fileSize) {
		const uploadKey = this._getUploadKey(bucket, key, fileSize);
		delete this.storage.uploads[uploadKey];
		this._saveStorage();
	}

	/**
	 * Get all uploads
	 */
	getAllUploads() {
		return this.storage.uploads;
	}

	/**
	 * Clear all upload states (for testing/cleanup)
	 */
	clearAll() {
		this.storage = { version: STORAGE_VERSION, uploads: {} };
		this._saveStorage();
	}

	/**
	 * Get upload progress percentage based on completed parts
	 */
	getProgress(bucket, key, fileSize, totalParts) {
		const state = this.getUploadState(bucket, key, fileSize);

		if (!state || totalParts === 0) return 0;

		return (state.completedParts.length / totalParts) * 100;
	}

	/**
	 * Clean up old/stale uploads (>7 days)
	 */
	cleanupOldUploads() {
		const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
		let cleaned = 0;

		for (const [key, upload] of Object.entries(this.storage.uploads)) {
			if (upload.lastUpdate < sevenDaysAgo) {
				delete this.storage.uploads[key];
				cleaned++;
			}
		}

		if (cleaned > 0) {
			console.log(`Cleaned up ${cleaned} old upload states`);
			this._saveStorage();
		}
	}
}

// Export singleton instance
export const uploadResumeManager = new UploadResumeManager();
