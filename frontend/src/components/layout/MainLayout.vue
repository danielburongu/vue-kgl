<template>
  <div class="layout">
    <!-- Sidebar -->
    <Sidebar :is-open="isSidebarOpen" @close="closeSidebar" />

    <!-- Mobile Header -->
    <header class="mobile-header">
      <button
        class="hamburger"
        :class="{ active: isSidebarOpen }"
        @click="toggleSidebar"
        aria-label="Toggle navigation menu"
        :aria-expanded="isSidebarOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="mobile-brand">
        <span class="mobile-logo">KGL</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <router-view />
      </div>
    </main>

    <!-- Mobile Backdrop -->
    <div
      v-if="isSidebarOpen"
      class="mobile-backdrop"
      @click="closeSidebar"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import Sidebar from "./Sidebar.vue";

const isSidebarOpen = ref(false);

/* Toggle sidebar */
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

/* Close sidebar */
const closeSidebar = () => {
  isSidebarOpen.value = false;
};

/* Escape key support */
const handleKeydown = (e) => {
  if (e.key === "Escape" && isSidebarOpen.value) {
    closeSidebar();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>

/* Layout Root */
.layout {
  display: flex;
  height: 100vh;              
  overflow: hidden;           /* Prevent scroll conflicts */
  background: #f8fafc;
}


/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc;
}

.content-wrapper {
  flex: 1;
  padding: 2rem 2.5rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}


/* Mobile Header */

.mobile-header {
  height: 64px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  position: sticky;
  top: 0;
  z-index: 950;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

/* Hide on desktop */
@media (min-width: 1025px) {
  .mobile-header {
    display: none;
  }
}

/* Mobile brand */
.mobile-brand {
  font-weight: 700;
  color: #111827;
  font-size: 1.25rem;
  letter-spacing: -0.5px;
}

.mobile-logo {
  background: linear-gradient(135deg, hsl(152, 90%, 24%));
  -webkit-text-fill-color: transparent;
}


/* Hamburger */
.hamburger {
  width: 32px;
  height: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1000;
}

.hamburger span {
  display: block;
  height: 3px;
  width: 100%;
  background: #374151;
  border-radius: 3px;
  transition: all 0.35s ease;
}

.hamburger.active span:nth-child(1) {
  transform: translateY(10px) rotate(45deg);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: translateY(-10px) rotate(-45deg);
}


/* Mobile Backdrop */
.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 900;
}

/* Responsive Padding */
@media (min-width: 1025px) {
  .content-wrapper {
    padding: 2.5rem 3rem;
  }
}

@media (max-width: 1024px) {
  .content-wrapper {
    padding: 1.5rem 1.75rem;
  }
}

@media (max-width: 640px) {
  .content-wrapper {
    padding: 1.25rem;
  }
}
</style>