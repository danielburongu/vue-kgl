<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <!-- Brand / Logo -->
        <div class="brand">
  <div class="logo-wrapper">
    <img
      src="@/assets/images/Karibu.svg"
      alt="Karibu Groceries Logo"
      class="brand-logo"
    />
  </div>

  <h1 class="brand-title">Karibu Groceries</h1>
  <p class="tagline">Internal Retail Management System</p>
</div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="your@email.com"
              required
              autocomplete="email"
              :class="{ 'input-error': error }"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
              autocomplete="current-password"
              :class="{ 'input-error': error }"
            />
          </div>

          <div class="forgot-link">
            <router-link to="/forgot-password">
  Forgot password?
</router-link>
          </div>

          <button
            type="submit"
            class="btn primary"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner-small"></span>
            {{ loading ? "Signing in..." : "Sign In" }}
          </button>

          <div v-if="error" class="error-message shake">
            {{ error }}
          </div>
        </form>

        <!-- Footer -->
        <div class="form-footer">
          <p>© {{ currentYear }} Karibu Groceries Ltd</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

const currentYear = computed(() => new Date().getFullYear());

const handleLogin = async () => {
  error.value = "";
  loading.value = true;

  try {
    await auth.login({
      email: email.value.trim(),
      password: password.value,
    });

    // Role-based redirect
    if (auth.user?.role === "director") {
      router.push("/director");
    } else {
      router.push("/dashboard");
    }
  } catch (err) {
    error.value = err.response?.data?.message || "Invalid email or password";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-container {
  width: 100%;
  max-width: 420px;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  padding: 2.5rem 2rem;
  border: 1px solid #e5e7eb;
  transition: transform 0.3s ease;
}

.login-card:hover {
  transform: translateY(-4px);
}

.brand {
  text-align: center;
  margin-bottom: 2.5rem;
}

/* Brand */
.brand {
  text-align: center;
  margin-bottom: 2.8rem;
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.4rem;
}

.brand-logo {
  width: 110px;
  height: auto;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.brand-logo:hover {
  transform: scale(1.05);
}

.brand-title {
  margin: 0.6rem 0 0.4rem;
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
}

.tagline {
  margin: 0;
  font-size: 1.05rem;
  color: #64748b;
  font-weight: 500;
}

.brand h1 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.8rem;
  font-weight: 700;
  color: #111827;
}

.tagline {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
}

input {
  padding: 0.9rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #10da7b;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.input-error {
  border-color: #ef4444 !important;
  animation: shake 0.4s ease;
}

.btn {
  padding: 0.95rem;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.primary {
  background: linear-gradient(135deg, hsl(152, 90%, 24%));
  color: white;
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.error-message {
  margin-top: 0.5rem;
  padding: 0.9rem 1.25rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 10px;
  font-size: 0.95rem;
  text-align: center;
  border: 1px solid #fecaca;
}

.forgot-link {
  text-align: right;
  margin-top: -0.5rem;
}

.forgot-link a {
  color: hsl(152, 90%, 24%);
  font-size: 0.9rem;
  text-decoration: none;
}

.forgot-link a:hover {
  text-decoration: underline;
}

.form-footer {
  margin-top: 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
}

/* Spinner */
.spinner-small {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
  margin-right: 0.5rem;
}

/* Shake animation for error */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-6px); }
}

/* Responsive */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem;
  }

  .brand h1 {
    font-size: 1.6rem;
  }

  .logo-circle {
    width: 70px;
    height: 70px;
  }

  .logo-text {
    font-size: 2rem;
  }
}
</style>