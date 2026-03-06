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

        <!-- Message -->
        <div class="message-container">
          <h2>Forgot Password?</h2>
          <p>
            Your account is managed by the system director. <br>
            If you forgot your password, please contact the director 
            to reset your account.
          </p>
          <router-link to="/" class="btn primary">
            Back to Login
          </router-link>
        </div>

        <!-- Footer -->
        <div class="form-footer">
          <p>© {{ currentYear }} Karibu Groceries Ltd</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const currentYear = computed(() => new Date().getFullYear());
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
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
  padding: 2.5rem 2rem;
  border: 1px solid #e5e7eb;
}

.brand {
  text-align: center;
  margin-bottom: 2.8rem;
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1.4rem;
}

.brand-logo {
  width: 110px;
  transition: transform .3s;
}

.brand-logo:hover {
  transform: scale(1.05);
}

.brand-title {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
}

.tagline {
  color: #64748b;
  font-size: small;
}

.message-container {
  text-align: center;
  margin-bottom: 1.5rem;
}

.message-container h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #0f172a;
}

.message-container p {
  color: #64748b;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.btn {
  padding: 0.95rem;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: white;
  background: hsl(152,90%,24%);
}

.btn:hover {
  transform: translateY(-2px);
}

.form-footer {
  margin-top: 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.85rem;
}
</style>