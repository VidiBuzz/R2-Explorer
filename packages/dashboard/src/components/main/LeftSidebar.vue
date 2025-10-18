<template>
  <div class="q-pa-md" style="height: 100%">
    <div class="flex column" style="height: 100%">
      <q-btn v-if="mainStore.apiReadonly" color="red" stack class="q-mb-lg" label="Read only" />
      <q-btn v-else color="green" icon="add" stack class="q-mb-lg" label="New">
        <q-menu>
          <q-list>
            <q-item clickable v-close-popup @click="$refs.createFile.open()">
              <q-item-section>
                <q-item-label>
                  <q-icon name="note_add" size="sm" />
                  New File
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="$refs.createFolder.open()">
              <q-item-section>
                <q-item-label>
                  <q-icon name="create_new_folder" size="sm" />
                  New Folder
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-close-popup @click="$bus.emit('openFilesUploader')">
              <q-item-section>
                <q-item-label>
                  <q-icon name="upload_file" size="sm" />
                  Upload Files
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-close-popup @click="$bus.emit('openFoldersUploader')">
              <q-item-section>
                <q-item-label>
                  <q-icon name="folder" size="sm" />
                  Upload Folders
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <q-btn class="q-mb-sm" @click="gotoFiles" color="blue" icon="folder_copy" label="Files" stack />
      <q-btn v-if="mainStore.config && mainStore.config.emailRouting !== false" class="q-mb-sm" @click="gotoEmail" color="blue" icon="email" label="Email" stack />


  <create-folder ref="createFolder" />
  <create-file ref="createFile" />
</template>

<script>
import CreateFile from "components/files/CreateFile.vue";
import CreateFolder from "components/files/CreateFolder.vue";
import { useMainStore } from "stores/main-store";
import { defineComponent } from "vue";

export default defineComponent({
	name: "LeftSidebar",
	}),
	components: { CreateFolder, CreateFile },
	methods: {
		gotoEmail: function () {
			if (this.selectedApp !== "email") this.changeApp("email");
		},
		gotoFiles: function () {
			if (this.selectedApp !== "files") this.changeApp("files");
		},
		changeApp: function (app) {
			this.$router.push({
				name: `${app}-home`,
				params: { bucket: this.selectedBucket },
			});
		},
		isUpdateAvailable: (currentVersion, latestVersion) => {
			// Split versions into parts and convert to numbers
			const current = currentVersion.split(".").map(Number);
			const latest = latestVersion.split(".").map(Number);

			// Compare major version
			if (latest[0] > current[0]) return true;
			if (latest[0] < current[0]) return false;

			// Compare minor version
			if (latest[1] > current[1]) return true;
			if (latest[1] < current[1]) return false;

			// Compare patch version
			if (latest[2] > current[2]) return true;

			return false;
		},
	},
	computed: {
		selectedBucket: function () {
			return this.$route.params.bucket;
		},
		selectedApp: function () {
			return this.$route.name.split("-")[0];
		},
	},
	async mounted() {
		const resp = await fetch(
			"https://api.github.com/repos/G4brym/R2-Explorer/releases/latest",
		return {
			mainStore,
		};
	},
});
</script>

<style scoped>
.q-btn {
  max-width: 100%;
  padding: 4px;
}
</style>
