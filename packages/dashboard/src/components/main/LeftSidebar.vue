<template>
  <div class="q-pa-md" style="height: 100%">
    <div class="flex column" style="height: 100%">
      <q-btn v-if="mainStore.apiReadonly" color="red" stack class="q-mb-lg" label="Read only" />
      <q-btn v-else color="green" icon="add" stack class="q-mb-lg" label="New">
        <q-menu>
          <q-list>
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
    </div>
  </div>

  <create-folder ref="createFolder" />
</template>

<script>
import CreateFolder from "components/files/CreateFolder.vue";
import { useMainStore } from "stores/main-store";
import { defineComponent } from "vue";

export default defineComponent({
	name: "LeftSidebar",
	components: { CreateFolder },
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
	},
	computed: {
		selectedBucket: function () {
			return this.$route.params.bucket;
		},
		selectedApp: function () {
			return this.$route.name.split("-")[0];
		},
	},
	setup() {
		const mainStore = useMainStore();
		return {
			mainStore,
		};
	},
});
</script>

<style scoped lang="scss">
.q-btn {
  max-width: 100%;
  padding: 6px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.6em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  :deep(.q-icon) {
    font-size: 1.2em;
  }

  :deep(.q-btn__content) {
    font-size: 0.9em;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  }

  &:active {
    transform: translateY(0);
  }
}

.q-menu {
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);

  .q-list {
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border-radius: 12px;
  }

  .q-item {
    border-radius: 8px;
    margin: 4px 8px;
    transition: all 0.2s ease;

    &:hover {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      transform: translateX(4px);
    }
  }
}
</style>
