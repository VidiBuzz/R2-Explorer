<template>
  <q-layout view="hHh LpR lFr" class="modern-layout">

    <q-header reveal class="modern-header">
      <q-toolbar class="modern-toolbar">

        <top-bar @toggle="toggleLeftDrawer"/>

      </q-toolbar>
    </q-header>

    <q-drawer :width="100" show-if-above v-model="leftDrawerOpen" side="left" class="modern-drawer">
      <left-sidebar/>
    </q-drawer>

<!--    <q-drawer show-if-above v-model="rightDrawerOpen" side="right" bordered>-->
<!--      <right-sidebar @updateDrawer="updateRightDrawer" />-->
<!--    </q-drawer>-->

    <q-page-container class="modern-page-container">
      <router-view />
    </q-page-container>

  <uploadingPopup />
  <downloadingPopup />

  </q-layout>
</template>

<script>
import uploadingPopup from "components/utils/uploadingPopup.vue";
import downloadingPopup from "components/utils/downloadingPopup.vue";
import LeftSidebar from "components/main/LeftSidebar.vue";
import RightSidebar from "components/main/RightSidebar.vue";
import TopBar from "components/main/Topbar.vue";
import { ref } from "vue";

export default {
	name: "MainLayout",
	components: { TopBar, RightSidebar, LeftSidebar, uploadingPopup, downloadingPopup },
	setup() {
		const leftDrawerOpen = ref(false);
		const rightDrawerOpen = ref(false);

		return {
			leftDrawerOpen,
			toggleLeftDrawer() {
				leftDrawerOpen.value = !leftDrawerOpen.value;
			},

			rightDrawerOpen,
			updateRightDrawer(state) {
				rightDrawerOpen.value = state;
			},
		};
	},
	mounted() {
		this.updateRightDrawer(false);
	},
};
</script>

<style scoped lang="scss">
.modern-layout {
  // BEAUTIFUL GRADIENT BACKGROUND - BLUE THEME
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #4facfe 50%, #00f2fe 75%, #43e97b 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.modern-header {
  // TRUE 3D HEADER - BLUE THEME
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%) !important;
  box-shadow:
    0 8px 32px rgba(30, 60, 114, 0.4),
    0 4px 16px rgba(42, 82, 152, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.modern-toolbar {
  min-height: 68px;
  padding: 0 24px;
}

.modern-drawer {
  // GLASSMORPHIC SIDEBAR
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  border-right: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    8px 0 32px rgba(0, 0, 0, 0.12),
    inset -1px 0 0 rgba(255, 255, 255, 0.8);

  // SPACING
  padding: 10px;
}

.modern-page-container {
  background: transparent;
  padding: 0;
}
</style>
