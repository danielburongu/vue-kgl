<!-- Sales.vue -->
<template>
  <div class="sales-page">
    <header class="page-header">
      <div>
        <h1>Sales</h1>
        <p class="subtitle">Record cash & credit sales | Branch: {{ branchName }}</p>
      </div>
      <button class="btn primary add-btn" @click="openForm" :disabled="submitting || loadingSales">
        Add New Sale
      </button>
    </header>

    <!-- Filters & Search -->
    <div class="controls">
      <div class="search-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by receipt, produce, customer..."
          class="search-input"
        />
      </div>

      <div class="filter-group">
        <select v-model="filterType" class="select">
          <option value="all">All Sales</option>
          <option value="cash">Cash</option>
          <option value="credit">Credit</option>
          <option value="paid">Paid Credit</option>
          <option value="unpaid">Unpaid Credit</option>
        </select>

        <select v-model.number="pageSize" class="select small">
          <option :value="5">5 per page</option>
          <option :value="10">10 per page</option>
          <option :value="20">20 per page</option>
          <option :value="50">50 per page</option>
        </select>
      </div>
    </div>

    <!-- New Sale Form (modal overlay) -->
    <div v-if="showForm" class="form-overlay" @click.self="closeForm">
      <div class="form-container">
        <div class="form-header">
          <h2>New Sale Record</h2>
          <button class="close-icon" @click="closeForm">×</button>
        </div>

        <div class="form-body">
          <div class="form-row">
            <div class="form-field">
              <label>Produce Name *</label>
              <select v-model="form.produceName" @change="onProduceChange" required>
                <option value="" disabled>Select produce...</option>
                <option v-for="p in produceOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>

            <div class="form-field">
              <label>Produce Type *</label>
              <input
                v-model="form.produceType"
                placeholder="e.g. Matooke, Irish Potatoes, Beans..."
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Quantity (kg) *</label>
              <input
                v-model.number="form.quantity"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="0.0"
                required
              />
            </div>

            <div class="form-field">
              <label>Price per kg</label>
              <div class="readonly-field">
                {{ form.pricePerKg ? 'UGX ' + form.pricePerKg.toLocaleString() : '-' }}
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Payment Type *</label>
              <select v-model="form.saleType" required>
                <option value="cash">Cash (Immediate)</option>
                <option value="credit">Credit / Deferred</option>
              </select>
            </div>

            <div class="form-field">
              <label>Sales Agent *</label>
              <input
                v-model="form.agentName"
                placeholder="Agent's full name"
                required
                readonly
              />
            </div>
          </div>

          <!-- Customer Name – ALWAYS required (matches backend) -->
          <div class="form-row">
            <div class="form-field">
              <label>Customer Name *</label>
              <input v-model="form.customerName" required />
            </div>
            <div v-if="form.saleType === 'cash'" class="hint" style="font-size:0.9rem; color:#6b7280; margin-top:0.5rem;">
              For cash sales you can use "Walk-in", "Cash Customer", or actual name if known
            </div>
          </div>

          <!-- Credit-specific fields (only shown for credit) -->
          <div v-if="form.saleType === 'credit'" class="credit-section">
            <div class="form-row">
              <div class="form-field">
                <label>Location *</label>
                <input v-model="form.customerLocation" placeholder="e.g. Kawempe, Entebbe..." required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Phone Contact *</label>
                <input
                  v-model="form.customerContact"
                  placeholder="077xxxxxxx or +256..."
                  required
                />
              </div>

              <div class="form-field">
                <label>National ID (NIN) *</label>
                <input
                  v-model="form.customerNIN"
                  placeholder="CMxxxxxxxxxxxxxx"
                  required
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field full">
                <label>Due Date *</label>
                <input v-model="form.dueDate" type="date" required />
              </div>
            </div>
          </div>

          <!-- Summary / Status -->
          <div class="summary-bar">
            <div class="stock-info" :class="stockStatusClass">
              Stock: {{ selectedStock !== null ? selectedStock.toLocaleString() + ' kg' : '-' }}
            </div>

            <div class="total-info" v-if="form.quantity && form.pricePerKg">
              Total Due: <strong>UGX {{ (form.quantity * form.pricePerKg).toLocaleString() }}</strong>
            </div>
          </div>

          <div v-if="formError" class="error-box" :class="{ success: formError.includes('successfully') }">
            {{ formError }}
          </div>

          <div class="form-actions">
            <button class="btn secondary" @click="closeForm" :disabled="submitting">Cancel</button>
            <button
              class="btn primary"
              :disabled="submitting || !formIsValid"
              @click="submitSale"
            >
              {{ submitting ? 'Saving...' : 'Save & Print Receipt' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sales Table -->
    <div class="table-container">
      <div v-if="loadingSales" class="table-loading">
        <div class="spinner"></div>
        <p>Loading sales records...</p>
      </div>

      <div v-else>
        <table class="sales-table">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Produce</th>
              <th>Type</th>
              <th>Qty (kg)</th>
              <th>Amount (UGX)</th>
              <th>Customer</th>
              <th>Agent</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in paginatedSales" :key="sale._id">
              <td class="receipt-cell mono">{{ sale.receiptNumber || '-' }}</td>
              <td>{{ sale.produceName }}</td>
              <td>{{ sale.produceType || '-' }}</td>
              <td class="numeric">{{ sale.quantity?.toFixed(1) || '0.0' }}</td>
              <td class="numeric">{{ sale.totalAmount?.toLocaleString() || '0' }}</td>
              <td>{{ sale.customerName || '-' }}</td>
              <td>{{ sale.agentName || '-' }}</td>
              <td>
                <span class="badge" :class="sale.saleType">{{ sale.saleType }}</span>
              </td>
              <td>
                <span
                  v-if="sale.saleType === 'credit'"
                  class="badge"
                  :class="sale.isPaid ? 'paid' : 'unpaid'"
                >
                  {{ sale.isPaid ? 'PAID' : 'UNPAID' }}
                </span>
                <span v-else class="badge cash">PAID</span>
              </td>
              <td class="date-cell mono">{{ formatDate(sale.createdAt) }}</td>
              <td class="actions-cell">
                <button
                  v-if="sale.saleType === 'credit' && !sale.isPaid"
                  class="btn small success"
                  @click="markPaid(sale._id)"
                  :disabled="markingPaid"
                >
                  Mark Paid
                </button>
                <button class="btn small" @click="printReceipt(sale)">Print</button>
              </td>
            </tr>

            <tr v-if="paginatedSales.length === 0">
              <td colspan="11" class="empty-message">
                No sales records found{{ searchQuery || filterType !== 'all' ? ' matching filters' : '' }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination" v-if="totalPages > 1">
          <button :disabled="currentPage === 1" @click="currentPage--">Prev</button>
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <button :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()

const branchName = ref(auth.user?.branch || 'Main Branch')

const sales = ref([])
const produceOptions = ref([])
const selectedStock = ref(null)

const loadingSales = ref(true)
const showForm = ref(false)
const formError = ref('')
const submitting = ref(false)
const markingPaid = ref(false)

const searchQuery = ref('')
const filterType = ref('all')
const pageSize = ref(10)
const currentPage = ref(1)

const form = ref({
  produceName: '',
  produceType: '',
  quantity: null,
  pricePerKg: 0,
  saleType: 'cash',
  agentName: auth.user?.name || 'Unknown Agent',
  customerName: '',           // now always used
  customerLocation: '',
  customerContact: '',
  customerNIN: '',
  dueDate: '',
})

const formIsValid = computed(() => {
  const f = form.value

  // Required for ALL sales
  if (!f.produceName) return false
  if (!f.produceType?.trim()) return false
  if (!f.quantity || f.quantity <= 0) return false
  if (!f.agentName?.trim()) return false
  if (!f.customerName?.trim() || f.customerName.trim().length < 2) return false

  // Additional credit requirements
  if (f.saleType === 'credit') {
    return (
      f.customerLocation?.trim().length >= 2 &&
      f.customerContact?.trim().length >= 9 &&
      f.customerNIN?.trim().length >= 10 &&
      !!f.dueDate
    )
  }

  return true
})

const stockStatusClass = computed(() => {
  if (selectedStock.value === null) return ''
  if (selectedStock.value <= 0) return 'danger'
  if (selectedStock.value < 10) return 'warning'
  return 'success'
})

const filteredSales = computed(() => {
  let list = [...sales.value]

  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(s =>
      [s.receiptNumber, s.produceName, s.customerName, s.agentName]
        .some(v => v?.toLowerCase().includes(q))
    )
  }

  if (filterType.value !== 'all') {
    if (filterType.value === 'cash') list = list.filter(s => s.saleType === 'cash')
    else if (filterType.value === 'credit') list = list.filter(s => s.saleType === 'credit')
    else if (filterType.value === 'paid') list = list.filter(s => s.saleType === 'credit' && s.isPaid)
    else if (filterType.value === 'unpaid') list = list.filter(s => s.saleType === 'credit' && !s.isPaid)
  }

  return list
})

const totalPages = computed(() => Math.ceil(filteredSales.value.length / pageSize.value))

const paginatedSales = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSales.value.slice(start, start + pageSize.value)
})

watch([searchQuery, filterType, pageSize], () => {
  currentPage.value = 1
})

watch(showForm, val => {
  if (!val) resetForm()
})

async function loadData() {
  loadingSales.value = true
  try {
    const [salesRes, produceRes] = await Promise.all([
      api.get('/sales'),
      api.get('/procurement'),
    ])

    sales.value = salesRes.data?.data || salesRes.data || []
    produceOptions.value = [...new Set(
      (produceRes.data?.data || produceRes.data || []).map(p => p.produceName)
    )].sort()
  } catch (err) {
    console.error('Failed to load sales/produce:', err)
    formError.value = 'Failed to load sales data. Please refresh.'
  } finally {
    loadingSales.value = false
  }
}

async function onProduceChange() {
  if (!form.value.produceName) {
    selectedStock.value = null
    form.value.pricePerKg = 0
    return
  }

  try {
    const res = await api.get('/procurement', {
      params: { produceName: form.value.produceName },
    })

    const procs = res.data?.data || res.data || []
    if (procs.length === 0) {
      selectedStock.value = 0
      form.value.pricePerKg = 0
      formError.value = 'No procurement data found for this produce'
      return
    }

    const latest = procs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    form.value.pricePerKg = latest.sellingPrice || 0

    const procured = procs.reduce((sum, p) => sum + (Number(p.tonnage) || 0), 0)
    const salesForProduce = sales.value.filter(s => s.produceName === form.value.produceName)
    const sold = salesForProduce.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)

    selectedStock.value = Math.max(0, procured - sold)
  } catch (err) {
    console.error('Stock check failed:', err)
    formError.value = 'Could not verify stock availability'
    selectedStock.value = null
    form.value.pricePerKg = 0
  }
}

async function submitSale() {
  if (!formIsValid.value) {
    formError.value = 'Please complete all required fields (including Customer Name)'
    return
  }

  if (form.value.quantity > (selectedStock.value ?? Infinity)) {
    formError.value = 'Not enough stock available'
    return
  }

  submitting.value = true
  formError.value = ''

  try {
    const payload = {
      ...form.value,
      totalAmount: Number(form.value.quantity) * Number(form.value.pricePerKg),
      branch: branchName.value,
    }

    const res = await api.post('/sales', payload)

    await loadData()

    printReceipt(res.data?.data || res.data)

    closeForm()
    formError.value = 'Sale recorded successfully!'
    setTimeout(() => formError.value = '', 5000)
  } catch (err) {
    formError.value = err.response?.data?.message || 'Failed to record sale. Try again.'
    console.error('Sale submission failed:', err)
  } finally {
    submitting.value = false
  }
}

async function markPaid(id) {
  if (!confirm('Mark this credit sale as paid?')) return

  markingPaid.value = true

  try {
    await api.put(`/sales/${id}/pay`)

    await loadData()

    formError.value = 'Sale marked as paid successfully!'
    setTimeout(() => formError.value = '', 5000)
  } catch (err) {
    formError.value = err.response?.data?.message || 'Failed to mark sale as paid'
    console.error('Mark paid error:', err)
  } finally {
    markingPaid.value = false
  }
}

function printReceipt(sale) {
  const w = window.open('', '_blank')
  if (!w) {
    alert('Popup blocked! Please allow popups to print receipts.')
    return
  }

  w.document.write(`
    <html>
    <head><title>Receipt ${sale.receiptNumber || ''}</title></head>
    <body style="font-family:Arial; padding:30px; max-width:600px; margin:auto;">
      <h2 style="text-align:center">Karibu Groceries Ltd</h2>
      <p style="text-align:center">Sales Receipt</p>
      <hr>
      <p><strong>Receipt #:</strong> ${sale.receiptNumber || '-'}</p>
      <p><strong>Date:</strong> ${formatDate(sale.createdAt)}</p>
      <p><strong>Agent:</strong> ${sale.agentName}</p>
      <hr>
      <p><strong>Produce:</strong> ${sale.produceName} (${sale.produceType || '-'})</p>
      <p><strong>Quantity:</strong> ${sale.quantity} kg</p>
      <p><strong>Price/kg:</strong> UGX ${sale.pricePerKg?.toLocaleString() || '-'}</p>
      <p><strong>Total:</strong> UGX ${sale.totalAmount.toLocaleString()}</p>
      <p><strong>Payment:</strong> ${sale.saleType.toUpperCase()}</p>
      <p><strong>Customer:</strong> ${sale.customerName || '-'}</p>
      ${
        sale.saleType === 'credit' ? `
          <p><strong>Location:</strong> ${sale.customerLocation}</p>
          <p><strong>Contact:</strong> ${sale.customerContact}</p>
          <p><strong>NIN:</strong> ${sale.customerNIN}</p>
          <p><strong>Due Date:</strong> ${new Date(sale.dueDate).toLocaleDateString()}</p>
        ` : ''
      }
      <hr>
      <p style="text-align:center; color:#555; font-size:0.9em">Thank you for your business!</p>
    </body>
    </html>
  `)
  w.document.close()
  setTimeout(() => w.print(), 500)
}

function openForm() {
  form.value.agentName = auth.user?.name || 'Unknown Agent'
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function resetForm() {
  form.value = {
    produceName: '',
    produceType: '',
    quantity: null,
    pricePerKg: 0,
    saleType: 'cash',
    agentName: auth.user?.name || 'Unknown Agent',
    customerName: '',
    customerLocation: '',
    customerContact: '',
    customerNIN: '',
    dueDate: '',
  }
  selectedStock.value = null
  formError.value = ''
}

function formatDate(date) {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

onMounted(async () => {
  await loadData()
})
</script>

<!-- Keep your existing <style scoped> – no major changes needed there -->

<style scoped>
/* ─────────────────────────────────────────────── */
/* Global page layout */
/* ─────────────────────────────────────────────── */
.sales-page {
  padding: 2rem 2.5rem;
  max-width: 1440px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f8fafc;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.page-header h1 {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 1.05rem;
}

/* Add New Sale button */
.add-btn {
  padding: 0.85rem 1.75rem;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, hsl(152, 90%, 24%));
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px hsl(152, 90%, 24%);
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Controls (search + filters) */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.search-wrapper {
  flex: 1;
  min-width: 320px;
}

.search-input {
  width: 100%;
  padding: 0.85rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: hsl(152, 90%, 24%);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.filter-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.select {
  padding: 0.85rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 0.95rem;
  min-width: 140px;
  cursor: pointer;
}

.select.small {
  min-width: 120px;
}

/* ── Form Modal ─── */
.form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 1rem;
}

.form-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.25);
}

.form-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.form-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.close-icon {
  font-size: 2rem;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.close-icon:hover {
  color: #374151;
}

.form-body {
  padding: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-row .full {
  grid-column: 1 / -1;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 1.05rem;
}

.form-field input,
.form-field select {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: hsl(152, 90%, 24%);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.readonly-field {
  padding: 0.75rem 1rem;
  background: #f3f4f6;
  border-radius: 8px;
  color: #4b5563;
  min-height: 42px;
  display: flex;
  align-items: center;
  font-size: 1rem;
}

.credit-section {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
  margin: 1.5rem 0;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: #f9fafb;
  border-radius: 10px;
  margin: 1.5rem 0;
  font-size: 1.1rem;
}

.stock-info {
  font-weight: 600;
}

.stock-info.danger  { color: #dc2626; }
.stock-info.warning { color: #d97706; }
.stock-info.success { color: #15803d; }

.total-info {
  font-weight: 700;
  color: hsl(152, 90%, 24%);
}

.error-box {
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  font-weight: 500;
}

.error-box:not(.success) {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.error-box.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

/* ── Table ─── */
.table-container {
  background: white;
  border-radius: 12px;
  overflow-x: auto;   /* allow horizontal scroll */
  overflow-y: hidden;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
}

.sales-table {
  min-width: 1300px;
}

.sales-table th,
.sales-table td {
  padding: 1rem 1.5rem;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.sales-table th {
  background: #f9fafb;
  font-weight: 800;
  color: #1f2937;
  font-size: 1.1rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  white-space: nowrap;
  padding-top: 1.1rem;
  padding-bottom: 1.1rem;
}

.sales-table td {
  font-size: 1.2rem;
  color: #111827;
}
.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
   font-size: 1.1rem;
}

.badge {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 700;
}

.badge.cash    { background: #d1fae5; color: #065f46; }
.badge.credit  { background: #dbeafe; color: #1e40af; }
.badge.paid    { background: #d1fae5; color: #065f46; }
.badge.unpaid  { background: #fee2e2; color: #991b1b; }

.actions-cell {
  white-space: nowrap;
  text-align: right;
}

.btn.small {
  padding: 0.45rem 0.95rem;
  font-size: 0.9rem;
  border-radius: 6px;
}

.empty-message {
  padding: 4rem 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 1.15rem;
  font-style: italic;
}

.pagination {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  color: #4b5563;
}

.pagination button {
  padding: 0.6rem 1.2rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
/* Prevent receipt & date wrapping */
.receipt-cell {
  min-width: 190px;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-cell {
  min-width: 210px;
  white-space: nowrap;
}

.mono {
  font-family: Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 1.05rem;
}
/* Responsive */
@media (max-width: 1024px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .sales-page {
    padding: 1.5rem 1.5rem;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .add-btn {
    width: 100%;
  }

  .filter-group {
    flex-direction: column;
  }

  .select {
    width: 100%;
  }
}
</style>