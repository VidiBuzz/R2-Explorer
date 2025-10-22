import { defineStore } from "pinia";

export const useTransfersStore = defineStore("transfers", {
	state: () => ({
		// Panel state: 'expanded', 'collapsed', 'minimized'
		panelState: "collapsed",

		// Active transfers tracking
		activeTransfers: [],

		// Transfer metadata
		transferMetadata: {},
	}),

	getters: {
		/**
		 * Get count of active transfers (uploads + downloads)
		 */
		activeTransfersCount: (state) => {
			return state.activeTransfers.length;
		},

		/**
		 * Check if there are any active transfers
		 */
		hasActiveTransfers: (state) => {
			return state.activeTransfers.length > 0;
		},

		/**
		 * Calculate total progress across all transfers
		 * Returns average progress percentage (0-100)
		 */
		totalProgress: (state) => {
			if (state.activeTransfers.length === 0) {
				return 0;
			}

			const totalProgress = state.activeTransfers.reduce((sum, transfer) => {
				return sum + (transfer.progress || 0);
			}, 0);

			return Math.round(totalProgress / state.activeTransfers.length);
		},

		/**
		 * Get transfers grouped by type (upload/download)
		 */
		transfersByType: (state) => {
			return {
				uploads: state.activeTransfers.filter(t => t.type === "upload"),
				downloads: state.activeTransfers.filter(t => t.type === "download"),
			};
		},

		/**
		 * Get count of completed transfers
		 */
		completedTransfersCount: (state) => {
			return state.activeTransfers.filter(t => t.progress >= 100).length;
		},

		/**
		 * Get count of in-progress transfers
		 */
		inProgressTransfersCount: (state) => {
			return state.activeTransfers.filter(t => t.progress < 100).length;
		},

		/**
		 * Check if panel is expanded
		 */
		isPanelExpanded: (state) => {
			return state.panelState === "expanded";
		},

		/**
		 * Check if panel is collapsed
		 */
		isPanelCollapsed: (state) => {
			return state.panelState === "collapsed";
		},

		/**
		 * Check if panel is minimized
		 */
		isPanelMinimized: (state) => {
			return state.panelState === "minimized";
		},
	},

	actions: {
		/**
		 * Toggle panel between expanded and collapsed
		 */
		togglePanel() {
			if (this.panelState === "expanded") {
				this.panelState = "collapsed";
			} else if (this.panelState === "collapsed") {
				this.panelState = "expanded";
			} else if (this.panelState === "minimized") {
				this.panelState = "expanded";
			}
		},

		/**
		 * Minimize the panel (show only icon/indicator)
		 */
		minimizePanel() {
			this.panelState = "minimized";
		},

		/**
		 * Maximize/expand the panel
		 */
		maximizePanel() {
			this.panelState = "expanded";
		},

		/**
		 * Collapse the panel (show header only)
		 */
		collapsePanel() {
			this.panelState = "collapsed";
		},

		/**
		 * Set panel state explicitly
		 * @param {string} state - 'expanded', 'collapsed', or 'minimized'
		 */
		setPanelState(state) {
			if (["expanded", "collapsed", "minimized"].includes(state)) {
				this.panelState = state;
			}
		},

		/**
		 * Add a new transfer to tracking
		 * @param {Object} transfer - Transfer object
		 * @param {string} transfer.id - Unique identifier
		 * @param {string} transfer.filename - File name
		 * @param {string} transfer.type - 'upload' or 'download'
		 * @param {number} transfer.fileSize - File size in bytes
		 * @param {number} transfer.progress - Progress percentage (0-100)
		 */
		addTransfer(transfer) {
			const newTransfer = {
				id: transfer.id || transfer.filename,
				filename: transfer.filename,
				type: transfer.type,
				fileSize: transfer.fileSize || 0,
				progress: transfer.progress || 0,
				startTime: Date.now(),
				endTime: null,
				duration: null,
				uploadedBytes: 0,
				speed: 0,
				timeRemaining: null,
				status: "active", // 'active', 'completed', 'failed', 'cancelled'
				error: null,
			};

			// Add transfer to array
			this.activeTransfers.push(newTransfer);

			// Store metadata
			this.transferMetadata[newTransfer.id] = {
				startTime: newTransfer.startTime,
			};

			// Auto-expand panel when first transfer is added
			if (this.activeTransfers.length === 1 && this.panelState === "collapsed") {
				this.panelState = "expanded";
			}
		},

		/**
		 * Update an existing transfer
		 * @param {string} transferId - Transfer identifier
		 * @param {Object} updates - Fields to update
		 */
		updateTransfer(transferId, updates) {
			const index = this.activeTransfers.findIndex(t => t.id === transferId);

			if (index !== -1) {
				const transfer = this.activeTransfers[index];
				const elapsed = Date.now() - transfer.startTime;

				// Calculate speed and time remaining if progress is updated
				if (updates.progress !== undefined || updates.uploadedBytes !== undefined) {
					const uploaded = updates.uploadedBytes || (transfer.fileSize * updates.progress / 100);
					const speed = elapsed > 0 ? uploaded / elapsed : 0; // bytes per ms
					const speedKBs = (speed * 1000) / 1024; // KB/s
					const remaining = transfer.fileSize - uploaded;
					const timeRemaining = speed > 0 ? remaining / speed : null; // milliseconds

					updates.uploadedBytes = uploaded;
					updates.speed = speedKBs;
					updates.timeRemaining = timeRemaining;
				}

				// Update transfer with new data
				this.activeTransfers[index] = {
					...transfer,
					...updates,
				};

				// Mark as completed if progress reaches 100%
				if (updates.progress >= 100 && transfer.status === "active") {
					this.completeTransfer(transferId);
				}
			}
		},

		/**
		 * Mark a transfer as completed
		 * @param {string} transferId - Transfer identifier
		 */
		completeTransfer(transferId) {
			const index = this.activeTransfers.findIndex(t => t.id === transferId);

			if (index !== -1) {
				const endTime = Date.now();
				this.activeTransfers[index] = {
					...this.activeTransfers[index],
					progress: 100,
					status: "completed",
					endTime: endTime,
					duration: endTime - this.activeTransfers[index].startTime,
				};
			}
		},

		/**
		 * Mark a transfer as failed
		 * @param {string} transferId - Transfer identifier
		 * @param {string} error - Error message
		 */
		failTransfer(transferId, error) {
			const index = this.activeTransfers.findIndex(t => t.id === transferId);

			if (index !== -1) {
				this.activeTransfers[index] = {
					...this.activeTransfers[index],
					status: "failed",
					error: error,
					endTime: Date.now(),
				};
			}
		},

		/**
		 * Cancel a transfer
		 * @param {string} transferId - Transfer identifier
		 */
		cancelTransfer(transferId) {
			const index = this.activeTransfers.findIndex(t => t.id === transferId);

			if (index !== -1) {
				this.activeTransfers[index] = {
					...this.activeTransfers[index],
					status: "cancelled",
					endTime: Date.now(),
				};
			}
		},

		/**
		 * Remove a transfer from tracking
		 * @param {string} transferId - Transfer identifier
		 */
		removeTransfer(transferId) {
			const index = this.activeTransfers.findIndex(t => t.id === transferId);

			if (index !== -1) {
				this.activeTransfers.splice(index, 1);
				delete this.transferMetadata[transferId];
			}

			// Auto-collapse panel when all transfers are removed
			if (this.activeTransfers.length === 0 && this.panelState === "expanded") {
				this.panelState = "collapsed";
			}
		},

		/**
		 * Clear all completed transfers
		 */
		clearCompletedTransfers() {
			const completedIds = this.activeTransfers
				.filter(t => t.status === "completed")
				.map(t => t.id);

			completedIds.forEach(id => this.removeTransfer(id));
		},

		/**
		 * Clear all transfers (including active ones)
		 */
		clearAllTransfers() {
			this.activeTransfers = [];
			this.transferMetadata = {};
			this.panelState = "collapsed";
		},

		/**
		 * Get a specific transfer by ID
		 * @param {string} transferId - Transfer identifier
		 * @returns {Object|null} Transfer object or null if not found
		 */
		getTransfer(transferId) {
			return this.activeTransfers.find(t => t.id === transferId) || null;
		},

		/**
		 * Retry a failed transfer
		 * @param {string} transferId - Transfer identifier
		 */
		retryTransfer(transferId) {
			const index = this.activeTransfers.findIndex(t => t.id === transferId);

			if (index !== -1 && this.activeTransfers[index].status === "failed") {
				this.activeTransfers[index] = {
					...this.activeTransfers[index],
					status: "active",
					progress: 0,
					error: null,
					startTime: Date.now(),
					endTime: null,
					uploadedBytes: 0,
					speed: 0,
					timeRemaining: null,
				};
			}
		},
	},
});
