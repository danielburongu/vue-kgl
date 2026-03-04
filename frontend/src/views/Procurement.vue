<template>
  <div class="procurement-dashboard">
    <!-- Top Bar -->
    <div class="top-bar">
      <div>
        <h1>Procurement</h1>
        <p class="subtitle">Manage stock purchases, suppliers & pricing • {{ procurements.length }} records</p>
      </div>
      <button
  type="button"
  class="btn primary"
  @click="toggleForm"
  :disabled="loading"
>
  <span v-if="!showForm">Add Procurement</span>
  <span v-else>Cancel</span>
</button>
    </div>

    <!-- Add/Edit Form -->
    <transition name="slide-fade">
      <div v-if="showForm" class="form-card">
        <div class="form-header">
          <h3>{{ editing ? 'Edit Procurement Record' : 'New Procurement Record' }}</h3>
          <button class="close-btn" @click="closeForm">×</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="produceName">Produce Name *</label>
            <input
              id="produceName"
              v-model="form.produceName"
              placeholder="e.g. Matooke, Irish Potatoes"
              :class="{ 'input-error': formErrors.produceName }"
            />
            <span v-if="formErrors.produceName" class="error-text">{{ formErrors.produceName }}</span>
          </div>

          <div class="form-group">
            <label for="produceType">Produce Type *</label>
            <input
              id="produceType"
              v-model="form.produceType"
              placeholder="e.g. Fresh, Dried, Processed"
              :class="{ 'input-error': formErrors.produceType }"
            />
            <span v-if="formErrors.produceType" class="error-text">{{ formErrors.produceType }}</span>
          </div>

          <div class="form-group">
            <label for="tonnage">Tonnage (KG) *</label>
            <input
              id="tonnage"
              v-model.number="form.tonnage"
              type="number"
              min="1000"
              step="100"
              placeholder="Minimum 1000 KG"
              :class="{ 'input-error': formErrors.tonnage }"
            />
            <span v-if="formErrors.tonnage" class="error-text">{{ formErrors.tonnage }}</span>
          </div>

          <div class="form-group">
            <label for="cost">Total Cost (UGX) *</label>
            <input
              id="cost"
              v-model.number="form.cost"
              type="number"
              min="10000"
              step="1000"
              placeholder="Minimum 10,000 UGX"
              :class="{ 'input-error': formErrors.cost }"
            />
            <span v-if="formErrors.cost" class="error-text">{{ formErrors.cost }}</span>
          </div>

          <div class="form-group">
            <label for="sellingPrice">Selling Price per KG *</label>
            <input
              id="sellingPrice"
              v-model.number="form.sellingPrice"
              type="number"
              min="0"
              step="100"
              placeholder="Price per KG"
              :class="{ 'input-error': formErrors.sellingPrice }"
            />
            <span v-if="formErrors.sellingPrice" class="error-text">{{ formErrors.sellingPrice }}</span>
          </div>

          <div class="form-group">
            <label for="dealerName">Dealer / Supplier Name *</label>
            <input
              id="dealerName"
              v-model="form.dealerName"
              placeholder="Supplier name"
              :class="{ 'input-error': formErrors.dealerName }"
            />
            <span v-if="formErrors.dealerName" class="error-text">{{ formErrors.dealerName }}</span>
          </div>

          <div class="form-group">
            <label for="dealerContact">Dealer Contact *</label>
            <input
              id="dealerContact"
              v-model="form.dealerContact"
              placeholder="07XXXXXXXX or +2567XXXXXXXX"
              :class="{ 'input-error': formErrors.dealerContact }"
            />
            <span v-if="formErrors.dealerContact" class="error-text">{{ formErrors.dealerContact }}</span>
          </div>
        </div>

        <!-- Real-time Summary -->
        <div v-if="form.tonnage && form.cost && form.sellingPrice" class="summary-box">
          <div class="summary-row">
            <span>Cost per KG:</span>
            <strong>UGX {{ costPerKg.toLocaleString() }}</strong>
          </div>
          <div class="summary-row">
            <span>Profit per KG:</span>
            <strong :class="profitPerKg > 0 ? 'profit' : profitPerKg < 0 ? 'loss' : 'neutral'">
              UGX {{ Math.abs(profitPerKg).toLocaleString() }}
              {{ profitPerKg > 0 ? '(profit)' : profitPerKg < 0 ? '(loss)' : '(break-even)' }}
            </strong>
          </div>
        </div>

        <div class="form-footer">
          <button type="button" class="btn secondary" @click="closeForm">
  Cancel
</button>
          <button
            class="btn primary"
            :disabled="loading || !isFormValid"
            @click="saveProcurement"
          >
            {{ loading ? 'Saving...' : (editing ? 'Update Record' : 'Save Record') }}
          </button>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
    </transition>

    <!-- Procurement Table -->
    <div class="table-card">
      <div class="table-header">
        <h2>Procurement Records</h2>
        <p class="table-count">{{ procurements.length }} entries</p>
      </div>

      <div v-if="loading" class="table-loading">
        <div class="skeleton-row" v-for="n in 5" :key="n"></div>
      </div>

      <div v-else class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Produce</th>
              <th>Type</th>
              <th class="numeric">KG</th>
              <th class="numeric">Cost (UGX)</th>
              <th class="numeric">Selling/KG</th>
              <th>Dealer</th>
              <th>Date</th>
              <th class="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in procurements" :key="p._id">
              <td><strong>{{ p.produceName }}</strong></td>
              <td>
                <span class="badge type-badge">{{ p.produceType }}</span>
              </td>
              <td class="numeric">{{ p.tonnage.toLocaleString() }}</td>
              <td class="numeric">UGX {{ formatMoney(p.cost) }}</td>
              <td class="numeric">UGX {{ formatMoney(p.sellingPrice) }}</td>
              <td class="dealer-cell">
                <div class="dealer-name">{{ p.dealerName }}</div>
                <div class="dealer-contact">{{ p.dealerContact }}</div>
              </td>
              <td class="date-cell">{{ formatDate(p.createdAt) }}</td>
              <td class="actions">
                <button class="btn small edit-btn" @click="editRecord(p)">
                  Edit
                </button>
                <button class="btn small delete-btn" @click="deleteRecord(p._id)">
                  Delete
                </button>
              </td>
            </tr>

            <tr v-if="procurements.length === 0" class="empty-row">
              <td colspan="8" class="text-center text-muted">
                No procurement records found. Add your first entry above.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/services/api";

const procurements = ref([]);
const showForm = ref(false);
const editing = ref(false);
const loading = ref(false);
const errorMessage = ref("");
const toastMessage = ref("");
const toastType = ref("success");

const form = ref({
  _id: null,
  produceName: "",
  produceType: "",
  tonnage: null,
  cost: null,
  sellingPrice: null,
  dealerName: "",
  dealerContact: "",
});

const formErrors = ref({});

const costPerKg = computed(() => {
  if (!form.value.tonnage || !form.value.cost || form.value.tonnage <= 0) return 0;
  return Math.round((form.value.cost / form.value.tonnage) * 100) / 100;
});

const profitPerKg = computed(() => {
  if (!form.value.sellingPrice) return 0;
  return Math.round((form.value.sellingPrice - costPerKg.value) * 100) / 100;
});

const isFormValid = computed(() => {
  return (
    form.value.produceName?.trim() &&
    form.value.produceType?.trim() &&
    form.value.tonnage >= 1000 &&
    form.value.cost >= 10000 &&
    form.value.sellingPrice > costPerKg.value &&
    form.value.dealerName?.trim() &&
    form.value.dealerContact?.trim()
  );
});

const fetchProcurement = async () => {
  loading.value = true;
  try {
    const res = await api.get("/procurement");
    procurements.value = res.data?.data || res.data || [];
  } catch (err) {
    console.error("Fetch error:", err);
    showToast("Failed to load procurement records", "error");
  } finally {
    loading.value = false;
  }
};

const openAddForm = () => {
  resetForm();
  showForm.value = true;
};

const editRecord = (record) => {
  form.value = { ...record };
  editing.value = true;
  showForm.value = true;
};

const deleteRecord = async (id) => {
  if (!confirm("Delete this record? This cannot be undone.")) return;

  try {
    await api.delete(`/procurement/${id}`);
    await fetchProcurement();
    showToast("Record deleted successfully");
  } catch (err) {
    showToast(err.response?.data?.message || "Failed to delete record", "error");
  }
};

const saveProcurement = async () => {
  formErrors.value = {};

  // Client-side validation
  if (!form.value.produceName?.trim()) formErrors.value.produceName = "Produce name required";
  if (!form.value.produceType?.trim()) formErrors.value.produceType = "Produce type required";
  if (!form.value.tonnage || form.value.tonnage < 1000) formErrors.value.tonnage = "Minimum 1000 KG";
  if (!form.value.cost || form.value.cost < 10000) formErrors.value.cost = "Minimum 10,000 UGX";
  if (!form.value.sellingPrice || form.value.sellingPrice <= costPerKg.value) {
    formErrors.value.sellingPrice = "Selling price must be higher than cost per KG";
  }
  if (!form.value.dealerName?.trim()) formErrors.value.dealerName = "Dealer name required";
  if (!/^(?:\+256|0)7[0-9]{8}$/.test(form.value.dealerContact?.trim())) {
    formErrors.value.dealerContact = "Invalid Ugandan phone number";
  }

  if (Object.keys(formErrors.value).length > 0) {
    showToast("Please correct the errors above", "error");
    return;
  }

  loading.value = true;

  try {
    const payload = { ...form.value };

    if (editing.value) {
      await api.put(`/procurement/${form.value._id}`, payload);
      showToast("Record updated successfully");
    } else {
      await api.post("/procurement", payload);
      showToast("Procurement recorded successfully");
    }

    resetForm();
    await fetchProcurement();
  } catch (err) {
    showToast(err.response?.data?.message || "Failed to save record", "error");
  } finally {
    loading.value = false;
  }
};

const toggleForm = () => {
  if (showForm.value) {
    closeForm();
  } else {
    openAddForm();
  }
};

const closeForm = () => {
  showForm.value = false;
  editing.value = false;

  form.value = {
    _id: null,
    produceName: "",
    produceType: "",
    tonnage: null,
    cost: null,
    sellingPrice: null,
    dealerName: "",
    dealerContact: "",
  };

  formErrors.value = {};
  errorMessage.value = "";
};


const resetForm = () => {
  form.value = {
    _id: null,
    produceName: "",
    produceType: "",
    tonnage: null,
    cost: null,
    sellingPrice: null,
    dealerName: "",
    dealerContact: "",
  };

  formErrors.value = {};
  errorMessage.value = "";
};

const showToast = (msg, type = "success") => {
  toastMessage.value = msg;
  toastType.value = type;
  setTimeout(() => toastMessage.value = "", 4500);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};


onMounted(() => {
  fetchProcurement();
});
</script>

<style scoped>
.procurement-dashboard {
  max-width: 1440px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.procurement-dashboard {
  font-size: 1.05rem;
}

/* Top Bar */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.top-bar h1 {
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

/* Form Card */
.form-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  padding: 2rem;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.form-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #374151;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.75rem 2.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.form-group label {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 0.3px;
}

.form-group input {
  padding: 1rem 1.4rem;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: hsl(152, 90%, 24%);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.input-error {
  border-color: #ef4444 !important;
}

.error-text {
  color: #ef4444;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f3f4f6;
}

/* Summary Box */
.summary-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 1.25rem;
  margin: 1.5rem 0;
  font-size: 1.05rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
}

.profit { color: #15803d; font-weight: 700; }
.loss   { color: #b91c1c; font-weight: 700; }
.neutral { color: #6b7280; font-weight: 600; }

/* Buttons */
.btn {
  cursor: pointer;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  transition: all 0.2s ease;
}

.btn.primary {
  background: #16a34a;
  color: white;
  padding: 0.9rem 1.8rem;
  font-size: 1.05rem;
}

.btn.primary:hover {
  background: #15803d;
}

.btn.primary:disabled {
  background: hsl(152, 90%, 24%);
  cursor: not-allowed;
  opacity: 0.7;
}

.btn.secondary {
  background: #f3f4f6;
  color: #374151;
  padding: 0.9rem 1.8rem;
}

.btn.secondary:hover {
  background: #e5e7eb;
}

/* Table */
.table-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.75rem 2.25rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.table-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.table-count {
  color: #6b7280;
  font-size: 1.1rem;
  font-weight: 600;
}

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1150px;
}

th,
td {
  padding: 1.25rem 1.75rem;
  text-align: left;
}


thead {
  background: #f9fafb;
}

th {
  font-weight: 800;
  color: #1f2937;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  white-space: nowrap;
  padding-top: 1.4rem;
  padding-bottom: 1.4rem;
}

td {
  font-size: 1.08rem;
  color: #111827;
}

.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
   font-size: 1.1rem; /* made stronger for numbers */
}

tr {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

tr:hover {
  background: #f9fafb;
}

.dealer-cell {
  max-width: 240px;
}

.dealer-name {
  font-weight: 500;
  color: #111827;
}

.dealer-contact {
  font-size: 0.95rem;
  color: #6b7280;
  word-break: break-all;
}

.date-cell {
  white-space: nowrap;
}

.actions .btn {
  margin-left: 0.5rem;
}

.btn.small {
  padding: 0.5rem 1rem;
  font-size: 1.08rem;
  border-radius: 8px;
}

.btn.edit-btn {
  background: hsl(152, 90%, 24%);
  color: white;
}

.btn.edit-btn:hover {
  background: hsl(152, 90%, 24%);
}

.btn.delete-btn {
  background: #ef4444;
  color: white;
}

.btn.delete-btn:hover {
  background: #dc2626;
}

.empty-row td {
  padding: 5rem 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 1.15rem;
  font-style: italic;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  z-index: 2000;
  color: white;
  font-weight: 500;
  animation: slideIn 0.4s ease-out;
}

.toast.success {
  background: hsl(152, 90%, 24%);
}

.toast.error {
  background: #ef4444;
}

@keyframes slideIn {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* Transitions */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.35s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

/* Responsive */
@media (max-width: 1024px) {
  .procurement-dashboard {
    padding: 1.5rem 1rem;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .top-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.25rem;
  }

  .btn.primary {
    width: 100%;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>