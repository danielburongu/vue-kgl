<template>
  <div class="dashboard">
    
    <!-- Dynamic Header -->
    <div class="header">
      <h1>{{ dashboardTitle }}</h1>
      <p class="subtitle">
        Overview of sales, stock levels, and credit status
      </p>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">

      <!-- Manager Only -->
      <button
        v-if="user?.role === 'manager'"
        class="btn primary"
        @click="goToProcurement"
      >
        <span>Add New Procurement</span>
      </button>

      <!-- Manager + Agent -->
      <button
        v-if="['manager','agent'].includes(user?.role)"
        class="btn secondary"
        @click="goToSales"
      >
        <span>Add New Sale</span>
      </button>

    </div>

    <!-- Stats -->
    <div v-if="loading" class="loading-grid">
      <div class="stat-card skeleton"></div>
      <div class="stat-card skeleton"></div>
      <div class="stat-card skeleton"></div>
    </div>

    <div v-else class="stats-grid">
      <div class="stat-card">
        <h3>Today's Sales</h3>
        <p class="stat-value">UGX {{ formatMoney(todaysSales) }}</p>
      </div>

      <div class="stat-card">
        <h3>Total Stock Available</h3>
        <p class="stat-value">{{ totalStock.toLocaleString() }} kg</p>
      </div>

      <div class="stat-card">
        <h3>Outstanding Credit</h3>
        <p class="stat-value">UGX {{ formatMoney(totalCredit) }}</p>
      </div>
    </div>

    <!-- Low Stock -->
    <section class="low-stock-section">
      <h2>Low Stock Alerts</h2>

      <div v-if="loading" class="low-stock-skeleton">
        <div class="low-stock-card skeleton"></div>
        <div class="low-stock-card skeleton"></div>
      </div>

      <div v-else-if="lowStockItems.length" class="low-stock-grid">
        <div
          v-for="item in lowStockItems"
          :key="item.produceName"
          class="low-stock-card"
        >
          <h4>{{ item.produceName }}</h4>
          <p class="low-stock-value">
            {{ item.remaining.toLocaleString() }} kg remaining
          </p>
        </div>
      </div>

      <div v-else class="no-alert">
        <p>All items are above minimum stock threshold.</p>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/authStore"
import api from "@/services/api"

const router = useRouter()
const auth = useAuthStore()
const user = auth.user

const loading = ref(true)
const todaysSales = ref(0)
const totalStock = ref(0)
const totalCredit = ref(0)
const lowStockItems = ref([])

const LOW_STOCK_THRESHOLD = 100

/* Dashboard Title */
const dashboardTitle = computed(() => {
  if (user?.role === "manager") return "Manager Dashboard"
  if (user?.role === "agent") return "Sales Dashboard"
  return "Dashboard"
})

const loadDashboard = async () => {
  loading.value = true

  try {
    const [salesRes, procurementRes] = await Promise.all([
      api.get("/sales"),
      api.get("/procurement"),
    ])

    const sales = Array.isArray(salesRes.data?.data)
      ? salesRes.data.data
      : []

    const procurement = Array.isArray(procurementRes.data?.data)
      ? procurementRes.data.data
      : []

    const today = new Date().toDateString()

    todaysSales.value = sales
      .filter((s) => new Date(s.createdAt).toDateString() === today)
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0)

    totalCredit.value = sales
      .filter((s) => s.saleType === "credit" && !s.isPaid)
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0)

    const stockMap = {}

    procurement.forEach((p) => {
      stockMap[p.produceName] =
        (stockMap[p.produceName] || 0) + (Number(p.tonnage) || 0)
    })

    sales.forEach((s) => {
      if (stockMap[s.produceName] !== undefined) {
        stockMap[s.produceName] -= Number(s.quantity) || 0
      }
    })

    Object.keys(stockMap).forEach((key) => {
      stockMap[key] = Math.max(0, stockMap[key])
    })

    totalStock.value = Object.values(stockMap)
      .reduce((sum, qty) => sum + qty, 0)

    lowStockItems.value = Object.entries(stockMap)
      .filter(([_, qty]) => qty > 0 && qty <= LOW_STOCK_THRESHOLD)
      .map(([produceName, remaining]) => ({ produceName, remaining }))
      .sort((a, b) => a.remaining - b.remaining)

  } catch (err) {
    console.error("Dashboard load error:", err)
  } finally {
    loading.value = false
  }
}

const goToProcurement = () => router.push("/procurement")
const goToSales = () => router.push("/sales")

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

onMounted(loadDashboard)
</script>

<style scoped>
.dashboard {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.header {
  text-align: left;
}

.header h1 {
  margin: 0 0 0.5rem;
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 1.05rem;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.btn {
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.btn.primary {
  background: linear-gradient(135deg, #2f855a, #276749);
  color: white;
}

.btn.secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn.secondary:hover {
  background: #e5e7eb;
}

/* Stats Grid */
.stats-grid,
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
  text-align: center;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  color: #4b5563;
}

.stat-value {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
}

/* Low Stock Section */
.low-stock-section h2 {
  margin: 0 0 1.25rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.low-stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.low-stock-card {
  background: linear-gradient(135deg, #fff5f5, #fef2f2);
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.2s ease;
}

.low-stock-card:hover {
  border-color: #f87171;
  box-shadow: 0 6px 16px rgba(248, 113, 113, 0.15);
}

.low-stock-card h4 {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  color: #991b1b;
}

.low-stock-value {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #b91c1c;
}

.no-alert {
  text-align: center;
  padding: 2.5rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 1.15rem;
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
  height: 140px;
}

.low-stock-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.low-stock-skeleton .skeleton {
  height: 120px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard {
    padding: 1.5rem 1rem;
  }
}

@media (max-width: 768px) {
  .stats-grid,
  .loading-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    padding: 0.9rem;
  }

  .header h1 {
    font-size: 1.9rem;
  }
}
</style>