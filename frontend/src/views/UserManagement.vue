<template>
  <div class="users-dashboard">
    <!-- Top Bar -->
    <div class="top-bar">
      <div>
        <h1>User Management</h1>
        <p class="subtitle">Manage team members, roles, and branch assignments • {{ users.length }} users</p>
      </div>
      <button class="btn primary" @click="openAddForm" :disabled="loading">
        <span v-if="!showForm">Add User</span>
        <span v-else>Cancel</span>
      </button>
    </div>

    <!-- Add/Edit Form -->
    <transition name="slide-fade">
      <div v-if="showForm" class="form-card">
        <div class="form-header">
          <h3>{{ form._id ? 'Edit User' : 'Add New User' }}</h3>
          <button class="close-btn" @click="closeForm" aria-label="Close form">×</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="name">Full Name *</label>
            <input
              id="name"
              v-model="form.name"
              placeholder="Enter full name"
              required
              :class="{ 'input-error': formErrors.name }"
            />
            <span v-if="formErrors.name" class="error-text">{{ formErrors.name }}</span>
          </div>

          <div class="form-group">
            <label for="email">Email Address *</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="user@example.com"
              required
              :class="{ 'input-error': formErrors.email }"
            />
            <span v-if="formErrors.email" class="error-text">{{ formErrors.email }}</span>
          </div>

          <div class="form-group">
            <label for="password">
              {{ form._id ? 'New Password (optional)' : 'Password *' }}
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              :placeholder="form._id ? 'Leave blank to keep current' : 'Enter secure password'"
              :required="!form._id"
              :class="{ 'input-error': formErrors.password }"
            />
            <span v-if="formErrors.password" class="error-text">{{ formErrors.password }}</span>
          </div>

          <div class="form-group">
            <label for="role">Role *</label>
            <select id="role" v-model="form.role" required>
              <option value="" disabled>Select role</option>
              <option value="manager">Manager</option>
              <option value="agent">Sales Agent</option>
            </select>
          </div>

          <div class="form-group">
            <label for="branch">Branch Assignment</label>
            <select id="branch" v-model="form.branch">
              <option value="">No branch (Director only)</option>
              <option value="Maganjo">Maganjo</option>
              <option value="Matugga">Matugga</option>
            </select>
          </div>
        </div>

        <div class="form-footer">
          <button class="btn secondary" @click="closeForm">Cancel</button>
          <button
            class="btn primary"
            :disabled="loading || !isFormValid"
            @click="saveUser"
          >
            {{ loading ? 'Saving...' : (form._id ? 'Update User' : 'Create User') }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Users Table -->
    <div class="table-card">
      <div class="table-header">
        <h2>Team Members</h2>
        <p class="table-count">{{ users.length }} active users</p>
      </div>

      <div v-if="loading" class="table-loading">
        <div class="skeleton-row" v-for="n in 5" :key="n"></div>
      </div>

      <div v-else class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branch</th>
              <th class="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u._id">
              <td class="name-cell">{{ u.name }}</td>
              <td class="email-cell">{{ u.email }}</td>
              <td>
                <span class="badge" :class="u.role">
                  {{ u.role === 'manager' ? 'Manager' : 'Sales Agent' }}
                </span>
              </td>
              <td>{{ u.branch || '—' }}</td>
              <td class="actions">
                <button class="btn small edit-btn" @click="editUser(u)">
                  Edit
                </button>
                <button class="btn small delete-btn" @click="deleteUser(u._id)">
                  Delete
                </button>
              </td>
            </tr>

            <tr v-if="users.length === 0" class="empty-row">
              <td colspan="5" class="text-center text-muted">
                No users found. Add your first team member above.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Success/Error Toast (inline) -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/services/api";

const users = ref([]);
const showForm = ref(false);
const loading = ref(false);
const toastMessage = ref("");
const toastType = ref("success");

const form = ref({
  _id: null,
  name: "",
  email: "",
  password: "",
  role: "",
  branch: "",
});

const formErrors = ref({});

const isFormValid = computed(() => {
  const f = form.value;
  return (
    f.name?.trim() &&
    f.email?.trim() &&
    (f._id || f.password?.trim()) &&
    f.role
  );
});

/* ─────────────────────────────
   FETCH USERS
────────────────────────────── */
const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await api.get("/users");
    users.value = res.data?.data || res.data || [];
  } catch (err) {
    console.error("Fetch users error:", err);
    showToast("Failed to load users", "error");
  } finally {
    loading.value = false;
  }
};

/* ─────────────────────────────
   OPEN / CLOSE FORM
────────────────────────────── */
const openAddForm = () => {
  if (showForm.value) {
    closeForm();
  } else {
    resetForm();
    showForm.value = true;
  }
};

const closeForm = () => {
  showForm.value = false;
  resetForm();
};

const resetForm = () => {
  form.value = {
    _id: null,
    name: "",
    email: "",
    password: "",
    role: "",
    branch: "",
  };
  formErrors.value = {};
};

/* ─────────────────────────────
   EDIT USER
────────────────────────────── */
const editUser = (user) => {
  form.value = {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    password: "",
    role: user.role || "",
    branch: user.branch || "",
  };
  showForm.value = true;
};

/* ─────────────────────────────
   DELETE USER
────────────────────────────── */
const deleteUser = async (id) => {
  if (!confirm("Delete this user? This cannot be undone.")) return;

  try {
    await api.delete(`/users/${id}`);
    await fetchUsers();
    showToast("User deleted successfully");
  } catch (err) {
    console.error("Delete error:", err);
    showToast(
      err.response?.data?.message || "Failed to delete user",
      "error"
    );
  }
};

/* ─────────────────────────────
   SAVE USER
────────────────────────────── */
const saveUser = async () => {
  formErrors.value = {};

  if (!form.value.name?.trim())
    formErrors.value.name = "Name is required";

  if (!form.value.email?.trim())
    formErrors.value.email = "Email is required";

  if (!form.value._id && !form.value.password?.trim()) {
    formErrors.value.password =
      "Password is required for new users";
  }

  if (!form.value.role)
    formErrors.value.role = "Role is required";

  if (Object.keys(formErrors.value).length > 0) {
    showToast("Please fill all required fields", "error");
    return;
  }

  loading.value = true;

  try {
    const payload = { ...form.value };
    if (!payload.password) delete payload.password;

    if (form.value._id) {
      await api.put(`/users/${form.value._id}`, payload);
      showToast("User updated successfully");
    } else {
      await api.post("/users", payload);
      showToast("User created successfully");
    }

    closeForm();
    await fetchUsers();
  } catch (err) {
    console.error("Save user error:", err);
    showToast(
      err.response?.data?.message || "Failed to save user",
      "error"
    );
  } finally {
    loading.value = false;
  }
};

/* ─────────────────────────────
   TOAST
────────────────────────────── */
const showToast = (msg, type = "success") => {
  toastMessage.value = msg;
  toastType.value = type;
  setTimeout(() => {
    toastMessage.value = "";
  }, 4000);
};

onMounted(fetchUsers);
</script>

<style scoped>
/* ─────────────────────────────
   PAGE LAYOUT
────────────────────────────── */
.users-dashboard {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

/* ─────────────────────────────
   TOP BAR
────────────────────────────── */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.top-bar h1 {
  margin: 0;
  font-size: 2.6rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 0.4rem 0 0;
  color: #6b7280;
  font-size: 1.15rem;
}

/* ─────────────────────────────
   MODAL OVERLAY
────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 2rem;
}

.modal-card {
  background: white;
  width: 100%;
  max-width: 720px;
  border-radius: 18px;
  padding: 2rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
  animation: modalSlide 0.3s ease;
}

@keyframes modalSlide {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* ─────────────────────────────
   FORM
────────────────────────────── */
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
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: #111827;
  transform: rotate(90deg);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.75rem 2.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group select {
  padding: 0.85rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
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
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f3f4f6;
}

/* ─────────────────────────────
   TABLE
────────────────────────────── */
.table-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
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
  font-size: 1rem;
  font-weight: 500;
}

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.8rem 1.4rem;
  text-align: left;
}

thead {
  background: #f9fafb;
}

th {
  font-weight: 700;
  color: #1f2937;
  font-size: 1.15rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  font-size: 1.12rem;
  color: #111827;
}

tr {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

tr:hover {
  background: #f3f4f6;
}

tbody tr:nth-child(even) {
  background: #fafafa;
}

.name-cell {
  font-weight: 700;
  font-size: 1.18rem;
}

.email-cell {
  color: #4b5563;
}

/* Badges */
.badge {
  padding: 0.45rem 1.2rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
}

.badge.manager {
  background: #dbeafe;
  color: #1e40af;
}

.badge.agent {
  background: #d1fae5;
  color: #065f46;
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn.small {
  padding: 0.45rem 0.9rem;
  font-size: 1rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn.edit-btn {
  background: hsl(152, 90%, 24%);
  color: white;
}

.btn.edit-btn:hover {
  background: hsl(152, 66%, 47%);
}

.btn.delete-btn {
  background: #ef4444;
  color: white;
}

.btn.delete-btn:hover {
  background: #dc2626;
}

.empty-row td {
  padding: 4rem 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 1.1rem;
  font-style: italic;
}

/* ─────────────────────────────
   TOAST
────────────────────────────── */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  z-index: 4000;
  color: white;
  font-weight: 500;
  animation: slideIn 0.4s ease-out;
}

.toast.success {
  background: #10b981;
}

.toast.error {
  background: #ef4444;
}

@keyframes slideIn {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* ─────────────────────────────
   RESPONSIVE
────────────────────────────── */
@media (max-width: 1024px) {
  .users-dashboard {
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