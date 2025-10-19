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
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.modern-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.modern-toolbar {
  min-height: 64px;
}

.modern-drawer {
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  border-right: 1px solid rgba(102, 126, 234, 0.1);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.05);
}

.modern-page-container {
  background: transparent;
  padding: 20px;
}
</style>
