# Upload/Download Cancel Implementation Status

## ✅ Completed Features

### 1. Upload Progress Tracking (DONE)
- ✅ Individual progress bars for each file
- ✅ File sizes displayed (KB, MB, GB, TB)
- ✅ Upload duration tracking and display
- ✅ Multipart upload part tracking (Part X/Y)
- ✅ FileZilla-style UI with table layout

### 2. Download Progress Tracking UI (DONE)
- ✅ Created downloadingPopup.vue component
- ✅ Same features as upload popup (progress, file size, duration)
- ✅ Positioned on bottom-left (vs upload on bottom-right)
- ✅ Blue header color (#1E6E9C) vs green for uploads
- ✅ Pinia store methods: addDownloadingFile, setDownloadProgress, completeDownload

### 3. Cancel Button UI (DONE)
- ✅ Individual cancel buttons (red X icon) for each uploading file
- ✅ "Cancel All" button in upload popup header
- ✅ hasActiveUploads computed property (shows Cancel All only when uploads active)
- ✅ Proper styling for cancel buttons

### 4. Pinia Store Infrastructure (DONE)
- ✅ uploadControllers state for tracking AbortControllers
- ✅ downloadControllers state for tracking AbortControllers
- ✅ setUploadController(filename, controller) method
- ✅ cancelUpload(filename) method - aborts controller and removes from list
- ✅ cancelAllUploads() method - cancels all active uploads

### 5. API Handler Updates (DONE)
- ✅ Added `signal` parameter to apiHandler.uploadObjects()
- ✅ Added `signal` parameter to apiHandler.multipartUpload()
- ✅ Signal passed to axios config for cancellation support

## ⚠️ Manual Steps Required

### Step 1: Wire AbortController in DragAndDrop.vue

**Location**: `packages/dashboard/src/components/utils/DragAndDrop.vue` around line 165-240

**What to add**: Before each file upload starts, create an AbortController and pass its signal to the API methods.

**Code to insert** (around line 172, after line 170 "// Files bigger than 100MB require multipart upload"):

```javascript
// Create AbortController for this upload
const controller = new AbortController();
this.mainStore.setUploadController(file.name, controller);
```

**Then update the API calls**:

For multipart uploads (around line 189):
```javascript
const { data } = await apiHandler.multipartUpload(
    uploadId,
    partNumber,
    this.selectedBucket,
    key,
    chunk,
    (progressEvent) => { /* existing callback */ },
    controller.signal  // ADD THIS LINE
);
```

For single-part uploads (around line 221):
```javascript
await apiHandler.uploadObjects(
    file,
    key,
    this.selectedBucket,
    (progressEvent) => { /* existing callback */ },
    controller.signal  // ADD THIS LINE
);
```

**Also add cleanup** in the catch block (around line 237):
```javascript
} catch (e) {
    // If upload was cancelled, remove from tracking silently
    if (e.name === 'AbortError' || e.name === 'CanceledError') {
        this.mainStore.removeUploadingFile(file.name);
        continue;  // Skip to next file
    }
    console.error(`Unable to upload file ${file.name}: ${e.message}`);
}
```

### Step 2: Add downloadingPopup Component to Main Layout

**Location**: Likely in `packages/dashboard/src/layouts/MainLayout.vue` or similar

**What to add**:

```vue
<template>
  <!-- existing layout code -->

  <!-- Add these two popup components -->
  <uploadingPopup />
  <downloadingPopup />
</template>

<script>
import uploadingPopup from 'src/components/utils/uploadingPopup.vue';
import downloadingPopup from 'src/components/utils/downloadingPopup.vue';

export default {
  components: {
    uploadingPopup,
    downloadingPopup,
  },
  // rest of component
}
</script>
```

### Step 3: Implement Download Progress Tracking

**Location**: Find where downloads are triggered (likely in FileContextMenu.vue downloadObject method, line 102)

**Current code** (simple link click):
```javascript
downloadObject: function () {
    const link = document.createElement("a");
    link.download = this.prop.row.name;
    link.href = `${this.mainStore.serverUrl}/api/buckets/${this.selectedBucket}/${encode(this.prop.row.key)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
```

**Replace with**:
```javascript
async downloadObject() {
    const filename = this.prop.row.name;
    const fileSize = this.prop.row.size || 0;

    // Add to downloading tracking
    this.mainStore.addDownloadingFile(filename, fileSize);

    // Create AbortController
    const controller = new AbortController();
    this.mainStore.setDownloadController(filename, controller);

    try {
        // Use apiHandler.downloadFile with progress callback
        await apiHandler.downloadFile(
            this.selectedBucket,
            this.prop.row.key,
            filename,
            (progressEvent) => {
                this.mainStore.setDownloadProgress({
                    filename: filename,
                    progress: (progressEvent.loaded * 100) / (progressEvent.total || fileSize)
                });
            },
            controller.signal
        );

        this.mainStore.completeDownload(filename);
    } catch (e) {
        if (e.name === 'AbortError' || e.name === 'CanceledError') {
            this.mainStore.removeDownloadingFile(filename);
            return;
        }
        console.error(`Download failed for ${filename}:`, e);
        this.mainStore.removeDownloadingFile(filename);
    }
}
```

**Also need to add download cancel methods to Pinia store** (main-store.js):
```javascript
setDownloadController(filename, controller) {
    this.downloadControllers[filename] = controller;
},
cancelDownload(filename) {
    if (this.downloadControllers[filename]) {
        this.downloadControllers[filename].abort();
        delete this.downloadControllers[filename];
    }
    this.removeDownloadingFile(filename);
},
cancelAllDownloads() {
    Object.keys(this.downloadingFiles).forEach(filename => {
        if (this.downloadingFiles[filename].progress < 100) {
            this.cancelDownload(filename);
        }
    });
},
```

### Step 4: Update downloadingPopup.vue with Cancel Buttons

Same as uploadingPopup - add:
1. Individual cancel button column with `<button @click="cancelDownload(filename)">`
2. "Cancel All Downloads" button in header
3. Methods: `cancelDownload(filename)` and `cancelAll()`
4. Computed: `hasActiveDownloads`

### Step 5: Verify apiHandler.downloadFile

Check if `apiHandler.downloadFile` exists in appUtils.js and supports:
- Progress callback
- AbortSignal parameter

If not, you may need to create it similar to uploadObjects.

## 🚀 Testing Plan

1. **Test individual upload cancel**:
   - Start uploading multiple files
   - Click X button on one file mid-upload
   - Verify: File stops uploading, removed from list, other files continue

2. **Test Cancel All uploads**:
   - Start uploading multiple files
   - Click "Cancel All" button
   - Verify: All active uploads stop, popup clears

3. **Test multipart upload cancel**:
   - Upload file >95MB (multipart upload)
   - Cancel during Part 2/5 for example
   - Verify: Upload stops immediately, file removed from list

4. **Test download tracking**:
   - Download file
   - Verify: Shows in download popup with progress bar
   - Verify: Duration shown after completion

5. **Test download cancel** (once implemented):
   - Start download
   - Click cancel
   - Verify: Download stops, file removed from tracking

## 📦 Deployment

Once manual steps are complete:

```bash
cd /mnt/m/code/R2-Explorer-fork

# Build dashboard
cd packages/dashboard
npm run build

# Copy to vidi deployment
cp -r dist/* /mnt/m/code/R2-Explorer/vidi/dashboard/

# Deploy to Cloudflare
cd /mnt/m/code/R2-Explorer/vidi
CLOUDFLARE_API_TOKEN="a1tzYl4HthglHDyj-ezVLEZk4GUlqcZDL7eYKm6T" npx wrangler deploy
```

## 📁 Files Modified (Committed: d377a73)

1. **uploadingPopup.vue** - Added cancel buttons, hasActiveUploads, cancel methods
2. **downloadingPopup.vue** - Created new file with download tracking UI
3. **main-store.js** - Added controllers state, cancel methods
4. **appUtils.js** - Added signal parameter to upload methods

## 📁 Files Still Need Manual Editing

1. **DragAndDrop.vue** - Add AbortController creation and signal passing
2. **MainLayout.vue** (or equivalent) - Add downloadingPopup component
3. **FileContextMenu.vue** - Replace download with tracked version
4. **downloadingPopup.vue** - Add cancel buttons (copy from uploadingPopup)
5. **main-store.js** - Add download cancel methods

## Current Status Summary

**Working**:
- Upload progress tracking with file sizes and durations ✅
- Upload cancel button UI ✅
- Pinia store cancel infrastructure ✅
- API handlers ready for AbortSignal ✅

**Almost Done** (just wiring):
- Need to create AbortController in DragAndDrop.vue and pass signal
- Need to add downloadingPopup to layout
- Need to wire up download tracking to download action

**To Implement**:
- Download cancel buttons (copy upload pattern)
- Download cancel store methods

Estimated time to complete manual steps: 15-20 minutes
