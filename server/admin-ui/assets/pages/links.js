import { api, guard, bindLogout, toast, esc, remainText, formatLocal } from '../admin.js';

export default function () {
  guard();
  bindLogout();
  const list = document.getElementById('list');
  const createTpl = document.getElementById('createTpl');

  function bindPickMask(mask) {
    // 传入的就是 .sheet-mask 元素本身，点击遮罩空白处直接关闭
    mask.querySelector('[data-cancel]').addEventListener('click', () => mask.remove());
    mask.addEventListener('click', (e) => {
      if (e.target.classList.contains('sheet-mask')) mask.remove();
    });
    // 用 checkbox 的 change 事件驱动选中态，避免与 label 原生激活行为冲突
    mask.querySelectorAll('.pick input').forEach((input) => {
      input.addEventListener('change', () => {
        input.closest('.pick').classList.toggle('checked', input.checked);
      });
    });
  }

  async function openCreate() {
    let meta;
    try {
      meta = await api('/links/meta');
    } catch (err) {
      toast(err.message, true);
      return;
    }
    const node = createTpl.content.cloneNode(true);
    const mask = node.querySelector('.sheet-mask'); // 取元素引用（片段追加后无法再从片段查询）
    const videoBox = node.querySelector('[data-pick-videos]');
    const imageBox = node.querySelector('[data-pick-images]');

    if (meta.videos.length) {
      videoBox.innerHTML = meta.videos
        .map(
          (v) => `
        <label class="pick">
          <input type="checkbox" value="${v.id}">
          <img src="${esc(v.cover || '')}" alt="" onerror="this.style.opacity=0.25">
          <span class="pick-name">${esc(v.title)}</span>
        </label>`
        )
        .join('');
    }
    if (meta.images.length) {
      imageBox.innerHTML = meta.images
        .map(
          (img) => `
        <label class="pick">
          <input type="checkbox" value="${img.id}">
          <img src="${esc(img.src)}" alt="" onerror="this.style.opacity=0.25">
          <span class="pick-name">${esc(img.alt || '图片')}</span>
        </label>`
        )
        .join('');
    }
    bindPickMask(mask);

    mask.querySelector('[data-save]').addEventListener('click', async (e) => {
      const videoIds = [...mask.querySelectorAll('[data-pick-videos] input:checked')].map((i) => Number(i.value));
      const imageIds = [...mask.querySelectorAll('[data-pick-images] input:checked')].map((i) => Number(i.value));
      const body = {
        title: mask.querySelector('[name=title]').value,
        note: mask.querySelector('[name=note]').value,
        hours: Number(mask.querySelector('[name=hours]').value),
        videoIds,
        imageIds
      };
      try {
        e.target.disabled = true;
        const link = await api('/links', { method: 'POST', body });
        mask.remove();
        load();
        showCreated(link.fullUrl);
      } catch (err) {
        toast(err.message, true);
        e.target.disabled = false;
      }
    });

    document.body.appendChild(mask);
  }

  /** 生成成功后弹层展示完整链接，一键复制 / 系统分享 */
  function showCreated(url) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="sheet-mask">
        <div class="sheet">
          <h2>✅ 链接已生成</h2>
          <div class="link-url">${esc(url)}</div>
          <div class="sheet-actions">
            <button class="btn" data-copy>复制链接</button>
            <button class="btn primary" data-share>直接分享</button>
          </div>
        </div>
      </div>`;
    const node = wrap.firstElementChild;
    node.querySelector('[data-copy]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast('已复制到剪贴板');
      } catch {
        toast('复制失败，请长按链接手动复制', true);
      }
    });
    node.querySelector('[data-share]').addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: '审片链接', url });
          node.remove();
          return;
        } catch { /* 用户取消则保留弹层 */ }
      }
      toast('当前环境不支持系统分享，请复制链接', true);
    });
    node.addEventListener('click', (e) => {
      if (e.target.classList.contains('sheet-mask')) node.remove();
    });
    document.body.appendChild(node);
  }

  async function load() {
    try {
      const rows = await api('/links');
      if (!rows.length) {
        list.innerHTML = '<div class="empty">还没有限时链接，点击「新建链接」为客户生成一条</div>';
        return;
      }
      list.innerHTML = rows
        .map((r) => {
          const st = remainText(r.expires_at, r.disabled);
          return `
          <div class="card" data-id="${r.id}">
            <div class="row">
              <div class="grow">
                <div class="title">${esc(r.title)} <span class="tag ${st.cls}">${st.text}</span></div>
                <div class="meta">访问 ${r.visits} 次${r.first_visit_at ? ` · 首次 ${esc(formatLocal(r.first_visit_at))}` : ' · 未访问'} · 到期 ${esc(formatLocal(r.expires_at))}</div>
              </div>
              <label class="switch" title="禁用 / 启用">
                <input type="checkbox" data-disabled ${r.disabled ? '' : 'checked'}>
                <span class="track"></span>
              </label>
            </div>
            ${r.note ? `<div class="meta" style="margin-top:8px;">${esc(r.note)}</div>` : ''}
            <div class="link-url">${esc(r.fullUrl)}</div>
            <div class="actions">
              <button class="btn" data-copy>复制</button>
              <button class="btn" data-extend data-hours="1">续 1 小时</button>
              <button class="btn" data-extend data-hours="24">续 1 天</button>
              <button class="btn danger" data-del>删除</button>
            </div>
          </div>`;
        })
        .join('');

      list.querySelectorAll('.card').forEach((card) => {
        const id = Number(card.dataset.id);
        const row = rows.find((r) => r.id === id);
        card.querySelector('[data-copy]').addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(row.fullUrl);
            toast('已复制');
          } catch {
            toast('复制失败，请长按链接手动复制', true);
          }
        });
        card.querySelectorAll('[data-extend]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            try {
              await api(`/links/${id}`, {
                method: 'PATCH',
                body: { extendHours: Number(btn.dataset.hours), disabled: false }
              });
              toast(`已续期 ${btn.dataset.hours} 小时并启用`);
              load();
            } catch (err) {
              toast(err.message, true);
            }
          });
        });
        card.querySelector('[data-del]').addEventListener('click', async () => {
          if (!confirm('确定删除该限时链接？删除后立即失效。')) return;
          await api(`/links/${id}`, { method: 'DELETE' });
          toast('已删除');
          load();
        });
        card.querySelector('[data-disabled]').addEventListener('change', async (e) => {
          const disabled = !e.target.checked;
          try {
            await api(`/links/${id}`, { method: 'PATCH', body: { disabled } });
            toast(disabled ? '已禁用' : '已启用');
            load();
          } catch (err) {
            toast(err.message, true);
            e.target.checked = !disabled;
          }
        });
      });
    } catch (err) {
      toast(err.message, true);
    }
  }

  document.getElementById('addBtn').addEventListener('click', openCreate);
  load();
}
