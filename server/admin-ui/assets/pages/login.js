import { api, toast } from '../admin.js';

export default function () {
  // 已登录直接进入
  fetch('/api/admin/me', { credentials: 'same-origin' })
    .then((r) => {
      if (r.ok) location.href = '/admin/videos.html';
    })
    .catch(() => {});

  const form = document.getElementById('loginForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    try {
      await api('/login', {
        method: 'POST',
        body: {
          username: form.username.value.trim(),
          password: form.password.value
        }
      });
      location.href = '/admin/videos.html';
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
    }
  });
}
