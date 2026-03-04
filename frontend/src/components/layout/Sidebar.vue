<template>
  <aside class="sidebar" :class="{ open: isOpen }">

    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="logo-wrapper">
        <img
          src="@/assets/images/Karibu.svg"
          alt="Karibu Groceries Ltd Logo"
          class="brand-logo-img"
        />
      </div>
      <div class="brand-text">
        <h2>Karibu Groceries</h2>
        <p class="brand-subtitle">Management System</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">

      <!-- DIRECTOR -->
      <template v-if="user?.role === 'director'">
        <div class="nav-section">
          <h3 class="nav-section-title">Director Controls</h3>

          <router-link to="/director" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12l2-2 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3" />
            </svg>
            <span>Dashboard</span>
          </router-link>

          <router-link to="/users" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-8 0v2M12 3a4 4 0 110 8 4 4 0 010-8z" />
            </svg>
            <span>User Management</span>
          </router-link>

        </div>
      </template>


      <!-- MANAGER -->
      <template v-if="user?.role === 'manager'">
        <div class="nav-section">
          <h3 class="nav-section-title">Operations</h3>

          <router-link to="/dashboard" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12l2-2 7-7 7 7M5 10v10a1 1 0 001 1h3" />
            </svg>
            <span>Dashboard</span>
          </router-link>

          <router-link to="/procurement" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4" />
            </svg>
            <span>Procurement</span>
          </router-link>

          <router-link to="/sales" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Sales</span>
          </router-link>

        </div>
      </template>


      <!-- AGENT -->
      <template v-if="user?.role === 'agent'">
        <div class="nav-section">
          <h3 class="nav-section-title">Sales Operations</h3>

          <router-link to="/dashboard" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12l2-2 7-7 7 7M5 10v10a1 1 0 001 1h3" />
            </svg>
            <span>Dashboard</span>
          </router-link>

          <router-link to="/sales" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Sales</span>
          </router-link>

        </div>
      </template>

    </nav>

    <!-- Footer -->
    <div class="sidebar-footer" v-if="user">
      <div class="user-profile">
        <div class="user-avatar">
          {{ user.name?.charAt(0)?.toUpperCase() || 'U' }}
        </div>
        <div class="user-details">
          <span class="user-name">{{ user.name }}</span>
          <span class="user-role">{{ formatRole(user.role) }}</span>
        </div>
      </div>

      <button
        class="logout-btn"
        @click="handleLogout"
        :disabled="isLoggingOut"
      >
        {{ isLoggingOut ? "Logging out..." : "Logout" }}
      </button>
    </div>

  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from "@/stores/authStore"
import { useRouter } from 'vue-router'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const auth = useAuthStore()
const router = useRouter()
const user = auth.user
const isLoggingOut = ref(false)

// Close on Escape key
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleLogout = async () => {
  isLoggingOut.value = true
  try {
    await auth.logout()
    router.push("/")
    emit('close')
  } catch (err) {
    console.error('Logout failed:', err)
  } finally {
    isLoggingOut.value = false
  }
}

const formatRole = (role) => {
  if (!role) return 'User'
  return role.charAt(0).toUpperCase() + role.slice(1)
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  flex-shrink: 0;      /* Prevent collapse */
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #1f2937;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 16px rgba(0,0,0,0.06);
  position: relative;
  z-index: 900;
  font-family: "Inter", system-ui, sans-serif;
  transition: transform 0.35s ease;
}

/* Brand / Logo */
.sidebar-brand {
  padding: 2rem 1.5rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.logo-wrapper {
  flex-shrink: 0;
}

/* logo */
.brand-logo-img {
  width: 56px;                            
  height: 56px;
  object-fit: contain;
}


/* brand name */
.brand-text h2 {
  margin: 0;
  font-size: 1.75rem;                     
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.8px;
}

/* subtitle */
.brand-subtitle {
  margin: 0;
  font-size: 1rem;         
  color: #6b7280;
  font-weight: 500;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 2.5rem;
}


/* Larger section titles */
.nav-section-title {
  font-size: 1.1rem;                      
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6b7280;
  padding: 0 1.25rem 1rem;
  margin: 0;
}


/* Much larger nav text */
.nav-item {
  display: flex;
  align-items: center;
  padding: 1.2rem 1.5rem;
  margin: 0.5rem 0;
  border-radius: 12px;
  font-size: 1.15rem;    
  font-weight: 500;
  color: #374151;
  text-decoration: none;
  transition: all 0.25s ease;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #111827;
  transform: translateX(6px);
}

.nav-item.active {
  background: #eef2ff;
  color: hsl(152, 90%, 24%);
  font-weight: 600;
  position: relative;
}

/* active bar */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;                           
  height: 70%;
  background: hsl(152, 90%, 24%);
  border-radius: 0 8px 8px 0;
}

/* Larger icons */
.nav-icon {
  width: 26px;                          
  height: 26px;
  margin-right: 1.25rem;
  opacity: 0.75;
  transition: opacity 0.2s;
}

.nav-item.active .nav-icon,
.nav-item:hover .nav-icon {
  opacity: 1;
}

/* Footer / User Profile */
.sidebar-footer {
  padding: 2rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.user-avatar {
  width: 56px;       /* user avatar */
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, hsl(152, 78%, 42%));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.6rem;                      
  box-shadow: 0 6px 16px hsl(152, 90%, 24%);
}

.user-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem; /* vertical spacing */
}

.user-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 1.05rem;
  color: #6b7280;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.1rem;
  font-size: 1.15rem;                     /* Larger logout text */
  font-weight: 600;
  color: #ef4444;
  background: #fef2f2;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.logout-btn:hover:not(:disabled) {
  background: #fee2e2;
  transform: translateY(-2px);
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logout-icon {
  width: 24px;
  height: 24px;
}

/* Mobile Drawer */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    transform: translateX(-100%);
    z-index: 1200;
    box-shadow: 8px 0 40px rgba(0,0,0,0.22);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}


/* Small screens */
@media (max-width: 640px) {
  .sidebar {
    width: 300px;
  }

  .brand-logo-img {
    width: 52px;
    height: 52px;
  }
}
</style>