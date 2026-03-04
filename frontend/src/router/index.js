import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "@/stores/authStore"

import Login from "@/views/Login.vue"
import MainLayout from "@/components/layout/MainLayout.vue"
import Dashboard from "@/views/Dashboard.vue"
import DirectorDashboard from "@/views/DirectorDashboard.vue"

const routes = [
  {
    path: "/",
    component: Login,
  },
  {
    path: "/",
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        component: Dashboard,
        meta: { roles: ["manager", "agent"] },
      },
      {
        path: "director",
        component: DirectorDashboard,
        meta: { roles: ["director"] },
      },
      {
        path: "users",
        component: () => import("@/views/UserManagement.vue"),
        meta: { roles: ["director"] },
      },
      {
        path: "procurement",
        component: () => import("@/views/Procurement.vue"),
        meta: { roles: ["manager"] },
      },
      {
        path: "sales",
        component: () => import("@/views/Sales.vue"),
        meta: { roles: ["manager", "agent"] },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Not logged in
  if (to.meta.requiresAuth && !auth.token) {
    return "/"
  }

  // Role-based access
  if (to.meta.roles) {
    const userRole = auth.user?.role

    if (!to.meta.roles.includes(userRole)) {
      // Redirect based on role
      if (userRole === "director") return "/director"
      if (userRole === "manager") return "/dashboard"
      if (userRole === "agent") return "/dashboard"
      return "/"
    }
  }

  return true
})

export default router