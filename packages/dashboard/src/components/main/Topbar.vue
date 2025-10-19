<template>
  <q-btn dense flat round icon="menu" @click="$emit('toggle')" />

  <q-toolbar-title style="overflow: unset" class="text-bold">
    <q-avatar>
      <img src="/logo-white.svg">
    </q-avatar>
    Candid Cloud SmartChannel
  </q-toolbar-title>
  <q-space />
  <div v-if="mainStore.buckets.length > 1">
    <bucket-picker/>
  </div>

  <q-btn flat dense round icon="info" @click="showAbout = true">
    <q-tooltip>About</q-tooltip>
  </q-btn>

  <q-dialog v-model="showAbout">
    <q-card style="min-width: 350px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">About</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="text-center">
          <q-avatar size="80px">
            <img src="/logo-white.svg">
          </q-avatar>
          <h5 class="q-mt-md q-mb-xs">Candid Cloud SmartChannel</h5>
          <p class="text-grey-7 q-mb-none">Version 2.8</p>
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="text-caption text-grey-7">
          <p>A powerful cloud storage management interface.</p>

          <p class="text-weight-medium q-mt-md q-mb-xs">Built with:</p>
          <ul class="q-pl-md q-mb-md">
            <li>Vue.js 3.4</li>
            <li>Quasar 2.18.5</li>
            <li>Vite 2.9.18</li>
            <li>Pinia (State Management)</li>
            <li>Cloudflare Workers + R2</li>
          </ul>

          <p class="text-weight-medium q-mb-xs">Features:</p>
          <ul class="q-pl-md">
            <li>Parallel uploads (4 concurrent files)</li>
            <li>Real-time speed and time tracking</li>
            <li>Upload cancellation</li>
            <li>Multipart upload support (95MB chunks)</li>
            <li>Drag-and-drop file management</li>
            <li>Shift+click range selection</li>
            <li>Bulk file operations (Delete/Move/Download)</li>
          </ul>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import BucketPicker from "components/main/BucketPicker.vue";
import { useMainStore } from "stores/main-store";
import { defineComponent, ref } from "vue";

export default defineComponent({
	name: "TopBar",
	emits: ["toggle"],
	components: { BucketPicker },
	setup() {
		const mainStore = useMainStore();
		const showAbout = ref(false);
		return { mainStore, showAbout };
	},
});
</script>
