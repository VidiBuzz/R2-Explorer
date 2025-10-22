<template>
  <q-btn dense flat round icon="menu" @click="$emit('toggle')" />

  <q-toolbar-title style="overflow: unset" class="text-bold">
    <q-avatar>
      <img src="/logo-white.svg">
    </q-avatar>
    <span class="title-lato">R2</span> <span class="title-kumbh">SmartChannel</span>
  </q-toolbar-title>
  <q-space />

  <!-- Search Bar -->
  <q-input
    v-model="mainStore.searchQuery"
    dense
    standout
    placeholder="Search files..."
    class="topbar-search"
    style="width: 300px; max-width: 300px;"
  >
    <template v-slot:prepend>
      <q-icon name="search" />
    </template>
    <template v-slot:append v-if="mainStore.searchQuery">
      <q-icon name="close" @click="mainStore.searchQuery = ''" class="cursor-pointer" />
    </template>
  </q-input>

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
          <h5 class="q-mt-md q-mb-xs"><span class="title-lato">R2</span> <span class="title-kumbh">SmartChannel</span></h5>
          <p class="text-grey-7 q-mb-none">Version 4.4.1 - File Search</p>
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="text-caption text-grey-7">
          <p>A powerful cloud storage management interface for Candid Studios.</p>

          <p class="text-weight-medium q-mt-md q-mb-xs">✅ All Features:</p>
          <ul class="q-pl-md text-caption">
            <li>✅ Real-time file search (NEW in v4.4)</li>
            <li>✅ Upload resume after crashes (v4.3)</li>
            <li>✅ File list auto-refresh (v4.3)</li>
            <li>✅ Multipart upload abort (v4.3)</li>
            <li>✅ Download progress tracking with cancel (v4.2)</li>
            <li>✅ Upload progress tracking with cancel (v4.2)</li>
            <li>✅ Admin permission controls (v4.2)</li>
            <li>✅ Keycloak OIDC + Google SSO authentication (v4.1)</li>
            <li>✅ 4 R2 buckets accessible (scx, candid-studios, candidclients, vidir2)</li>
          </ul>

          <p class="text-weight-medium q-mt-md q-mb-xs">Built with:</p>
          <ul class="q-pl-md q-mb-md">
            <li>Vue.js 3.4 + Quasar 2.18.5</li>
            <li>Cloudflare Workers + R2</li>
            <li>Keycloak 26.0.7 (Railway)</li>
            <li>Pinia State Management</li>
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

<style lang="scss">
// Font styles for split title - moved here to prevent tree-shaking
.title-lato {
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  font-weight: 700 !important;
}

.title-kumbh {
  font-family: 'Kumbh Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  font-weight: 600 !important;
}
</style>
