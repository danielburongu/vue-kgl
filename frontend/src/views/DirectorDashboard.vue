<template>
  <div class="director-dashboard">
    <!-- Header -->
    <div class="header">
      <h1>Director Dashboard</h1>
      <p class="subtitle">Company-wide overview • All branches • {{ currentDate }}</p>
    </div>

    <!-- Date Range Selector -->
    <div class="date-filter">
      <label>Period:</label>
      <select v-model="dateRange" @change="loadDashboard">
        <option value="all">All Time</option>
        <option value="30days">Last 30 Days</option>
        <option value="thisMonth">This Month</option>
      </select>
    </div>

    <!-- Error State with Retry -->
    <div v-if="error" class="error-banner">
      <p>{{ error }}</p>
      <button class="btn retry-btn" @click="loadDashboard" :disabled="loading">
        {{ loading ? "Retrying..." : "Retry" }}
      </button>
    </div>

    <!-- KPI Cards -->
    <div v-if="loading" class="stats-grid loading-grid">
      <div class="stat-card skeleton" v-for="n in 4" :key="n"></div>
    </div>

    <div v-else class="stats-grid">
      <div class="stat-card">
        <h3>Total Sales</h3>
        <p class="stat-value">UGX {{ formatMoney(totalSales) }}</p>
        <p class="stat-label">{{ dateRangeLabel }}</p>
      </div>

      <div class="stat-card">
        <h3>Total Procurement</h3>
        <p class="stat-value">{{ totalProcurement.toLocaleString() }} kg</p>
        <p class="stat-label">{{ dateRangeLabel }}</p>
      </div>

      <div class="stat-card">
        <h3>Outstanding Credit</h3>
        <p class="stat-value">UGX {{ formatMoney(totalCredit) }}</p>
        <p class="stat-label">{{ dateRangeLabel }}</p>
      </div>

      <div class="stat-card">
        <h3>Active Branches</h3>
        <p class="stat-value">{{ activeBranches.length }}</p>
        <p class="stat-label">With activity in period</p>
      </div>
    </div>

    <!-- Branch Performance Table -->
    <div class="table-card">
      <div class="table-header">
        <h2>Branch Performance Summary</h2>
        <p class="table-subtitle">{{ dateRangeLabel }}</p>
      </div>

      <div v-if="loading" class="table-loading">
        <div class="spinner"></div>
        <p>Loading branch data...</p>
      </div>

      <div v-else-if="branchPerformance.length === 0" class="empty-state">
        <p>No performance data found for the selected period.</p>
      </div>

      <div v-else class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th class="numeric">Total Sales (UGX)</th>
              <th class="numeric">Procurement (kg)</th>
              <th class="numeric">Credit Exposure (UGX)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="branch in branchPerformance" :key="branch.name">
              <td>{{ branch.name }}</td>
              <td class="numeric">{{ formatMoney(branch.sales) }}</td>
              <td class="numeric">{{ branch.procurement.toLocaleString() }}</td>
              <td class="numeric">{{ formatMoney(branch.credit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/services/api";

const loading = ref(true);
const error = ref(null);

const totalSales = ref(0);
const totalProcurement = ref(0);
const totalCredit = ref(0);
const branchPerformance = ref([]);

const dateRange = ref("all"); // all | 30days | thisMonth

const dateRangeLabel = computed(() => {
  if (dateRange.value === "30days") return "Last 30 Days";
  if (dateRange.value === "thisMonth") return "This Month";
  return "All Time";
});

const currentDate = computed(() => {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

const activeBranches = computed(() => branchPerformance.value.map(b => b.name));

// Money formatter
const formatMoney = (value) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

const getDateFilter = () => {
  const now = new Date();
  let start;

  if (dateRange.value === "30days") {
    start = new Date(now);
    start.setDate(now.getDate() - 30);
  } else if (dateRange.value === "thisMonth") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    return null; // all time
  }

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: now.toISOString().split("T")[0],
  };
};

const loadDashboard = async () => {
  loading.value = true;
  error.value = null;

  try {
    const dateFilter = getDateFilter();
    const params = dateFilter ? { startDate: dateFilter.startDate, endDate: dateFilter.endDate } : {};

    const [salesRes, procurementRes] = await Promise.all([
      api.get("/sales", { params }),
      api.get("/procurement", { params }),
    ]);

    // Critical fix: safely extract array from API response
    // Handles both { data: [...] } and flat array [...]

    const sales = Array.isArray(salesRes.data)
      ? salesRes.data
      : Array.isArray(salesRes.data?.data)
      ? salesRes.data.data
      : [];

    const procurement = Array.isArray(procurementRes.data)
      ? procurementRes.data
      : Array.isArray(procurementRes.data?.data)
      ? procurementRes.data.data
      : [];

    // Debug log
    console.log("Sales data:", sales);
    console.log("Procurement data:", procurement);

    // Company-wide totals
    totalSales.value = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    totalProcurement.value = procurement.reduce((sum, p) => sum + (Number(p.tonnage) || 0), 0);
    totalCredit.value = sales
      .filter(s => s.saleType === "credit" && !s.isPaid)
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    // Branch performance aggregation
    const branchMap = {};

    // Collect branches
    [...sales, ...procurement].forEach(item => {
      const b = item.branch;
      if (b && !branchMap[b]) {
        branchMap[b] = { name: b, sales: 0, procurement: 0, credit: 0 };
      }
    });

    // Aggregate sales
    sales.forEach(s => {
      const b = s.branch;
      if (b && branchMap[b]) branchMap[b].sales += Number(s.totalAmount) || 0;
    });

    // Aggregate procurement
    procurement.forEach(p => {
      const b = p.branch;
      if (b && branchMap[b]) branchMap[b].procurement += Number(p.tonnage) || 0;
    });

    // Aggregate credit
    sales.forEach(s => {
      const b = s.branch;
      if (b && s.saleType === "credit" && !s.isPaid && branchMap[b]) {
        branchMap[b].credit += Number(s.totalAmount) || 0;
      }
    });

    branchPerformance.value = Object.values(branchMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  } catch (err) {
    console.error("Director dashboard load error:", err);
    error.value =
      err.response?.data?.message ||
      err.message ||
      "Failed to load dashboard data. Please check your connection or try again later.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadDashboard);
</script>

<style scoped>
/* ─────────────────────────────────────────────── */
/*  styles */
/* ─────────────────────────────────────────────── */

.director-dashboard {
  max-width: 1440px;
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
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 1.1rem;
}

/* Date Filter */
.date-filter {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.date-filter label {
  font-weight: 500;
  color: #374151;
}

.date-filter select {
  padding: 0.6rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.95rem;
  min-width: 160px;
}

/* Error Banner */
.error-banner {
  background: #fee2e2;
  color: #991b1b;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #fecaca;
  text-align: center;
  font-weight: 500;
  margin-bottom: 2rem;
}

.retry-btn {
  margin-top: 0.75rem;
  padding: 0.6rem 1.25rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #b91c1c;
}

.retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Stats Grid */
.stats-grid,
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.75rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem 1.75rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
  text-align: center;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.stat-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #4b5563;
}

.stat-value {
  margin: 0;
  font-size: 2.6rem;
  font-weight: 800;
  color: #111827;
  line-height: 1;
}

.stat-label {
  margin-top: 0.8rem;
  font-size: 0.92rem;
  color: #6b7280;
}

/* Table Section */
.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.07);
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.table-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.table-header h2 {
  margin: 0 0 0.6rem;
  font-size: 2.4rem;
  font-weight: 800;
  color: #0f172a;      /* darker */
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.table-header {
  padding: 2rem 2rem 1.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.table-header h2::after {
  content: "";
  display: block;
  width: 60px;
  height: 4px;
  background: #6366f1;
  border-radius: 4px;
  margin-top: 10px;
}

.table-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: max-content;
}

tbody tr:nth-child(even) {
  background: #fafafa;
}

th,
td {
  padding: 0.85rem 1.5rem;
  text-align: left;
  font-size: 1.08rem;
}

thead {
  background: #f9fafb;
}

th {
  font-weight: 700;
  color: #4b5563;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  font-size: 1.08rem;
}

tbody tr {
  border-bottom: 1px solid #f3f4f6;
}

tbody tr:hover {
  background: #f9fafb;
  transition: background 0.15s ease;
}

.empty-state {
  padding: 4rem 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 1.15rem;
}

/* Loading Spinner in Table */
.table-loading {
  padding: 4rem 2rem;
  text-align: center;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}


.retry-btn:hover {
  background: #b91c1c;
}

.retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Skeleton */
.skeleton {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
  height: 160px;
}

/* Responsive */
@media (max-width: 1024px) {
  .director-dashboard {
    padding: 1.5rem 1rem;
  }
  .stats-grid {
    gap: 1.25rem;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .header h1 {
    font-size: 2rem;
  }
  .date-filter {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>