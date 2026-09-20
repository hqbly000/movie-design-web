/**
 * 后台公共脚本：请求封装、登录守卫、toast、页面分发。
 */
const API = '/api/admin';

/** 统一请求封装：非 2xx 抛错并携带后端消息 */
export async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && location.pathname !== '/admin/' && location.pathname !== '/admin/index.html') {
      location.href = '/admin/';
      throw new Error('请先登录');
    }
    throw new Error(data.error || `请求失败（${res.status}）`);
  }
  return data;
}

let toastTimer;
export function toast(message, isError = false) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/** 登录守卫：未登录跳回登录页 */
export async function guard() {
  try {
    const me = await api('/me');
    const userEl = document.querySelector('[data-user]');
    if (userEl) userEl.textContent = me.username;
  } catch {
    location.href = '/admin/';
  }
}

export function bindLogout() {
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api('/logout', { method: 'POST' });
      location.href = '/admin/';
    });
  });
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/** ISO 时间转本地时间显示（YYYY-MM-DD HH:mm） */
export function formatLocal(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 时间剩余文案 */
export function remainText(expiresAt, disabled) {
  if (disabled) return { cls: 'dead', text: '已禁用' };
  const left = new Date(expiresAt).getTime() - Date.now();
  if (left <= 0) return { cls: 'dead', text: '已过期' };
  const h = left / 3600000;
  if (h >= 48) return { cls: 'live', text: `剩余 ${Math.floor(h / 24)} 天` };
  return { cls: 'live', text: `剩余 ${Math.floor(h)} 小时 ${Math.floor((left % 3600000) / 60000)} 分` };
}
