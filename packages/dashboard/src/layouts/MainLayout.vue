<template>
  <q-layout view="hHh LpR lFr">

    <q-header reveal class="bg-green text-white">
      <q-toolbar>

        <top-bar @toggle="toggleLeftDrawer"/>

      </q-toolbar>
    </q-header>

    <q-drawer :width="100" show-if-above v-model="leftDrawerOpen" side="left" bordered>
      <left-sidebar/>
    </q-drawer>

<!--    <q-drawer show-if-above v-model="rightDrawerOpen" side="right" bordered>-->
<!--      <right-sidebar @updateDrawer="updateRightDrawer" />-->
<!--    </q-drawer>-->

    <q-page-container>
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
