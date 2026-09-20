import { api, guard, bindLogout, toast, esc } from '../admin.js';

export default function () {
  guard();
  bindLogout();
  const list = document.getElementById('list');
  const editTpl = document.getElementById('editTpl');

  function openEdit(row) {
    const node = editTpl.content.cloneNode(true);
    const sheet = node.querySelector('.sheet');
    sheet.querySelector('[data-title]').textContent = row ? '编辑视频' : '新增视频';
    if (row) {
      sheet.querySelector('[name=title]').value = row.title;
      sheet.querySelector('[name=bilibiliUrl]').value = row.bilibili_url;
      sheet.querySelector('[name=cover]').value = row.cover || '';
      sheet.querySelector('[name=sort]').value = row.sort;
    }
    node.querySelector('[data-cancel]').addEventListener('click', () => node.remove());
    node.querySelector('.sheet-mask').addEventListener('click', (e) => {
      if (e.target.classList.contains('sheet-mask')) node.remove();
    });
    node.querySelector('[data-save]').addEventListener('click', async (e) => {
      const body = {
        title: sheet.querySelector('[name=title]').value,
        bilibiliUrl: sheet.querySelector('[name=bilibiliUrl]').value.trim(),
        cover: sheet.querySelector('[name=cover]').value.trim(),
        sort: Number(sheet.querySelector('[name=sort]').value) || 0
      };
      try {
        e.target.disabled = true;
        if (row) await api(`/videos/${row.id}`, { method: 'PUT', body });
        else await api('/videos', { method: 'POST', body });
        toast('已保存');
        node.remove();
        load();
      } catch (err) {
        toast(err.message, true);
        e.target.disabled = false;
      }
    });
    document.body.appendChild(node);
    sheet.querySelector('[name=bilibiliUrl]').focus();
  }

  async function load() {
    try {
      const rows = await api('/videos');
      if (!rows.length) {
        list.innerHTML = '<div class="empty">还没有视频，点击「新增视频」添加 B 站链接</div>';
        return;
      }
      list.innerHTML = rows
        .map(
          (r) => `
        <div class="card" data-id="${r.id}">
          <div class="row">
            <img class="thumb" src="${esc(r.cover || '')}" alt=""
                 onerror="this.style.visibility='hidden'">
            <div class="grow">
              <div class="title">${esc(r.title)}</div>
              <div class="meta">${esc(r.bvid)} · 排序 ${r.sort}</div>
            </div>
            <label class="switch" title="官网是否显示">
              <input type="checkbox" data-visible ${r.visible ? 'checked' : ''}>
              <span class="track"></span>
            </label>
          </div>
          <div class="actions">
            <button class="btn" data-edit>编辑</button>
            <button class="btn danger" data-del>删除</button>
          </div>
        </div>`
        )
        .join('');

      list.querySelectorAll('.card').forEach((card) => {
        const id = Number(card.dataset.id);
        const row = rows.find((r) => r.id === id);
        card.querySelector('[data-edit]').addEventListener('click', () => openEdit(row));
        card.querySelector('[data-del]').addEventListener('click', async () => {
          if (!confirm(`确定删除「${row.title}」？`)) return;
          await api(`/videos/${id}`, { method: 'DELETE' });
          toast('已删除');
          load();
        });
        card.querySelector('[data-visible]').addEventListener('change', async (e) => {
          try {
            await api(`/videos/${id}`, { method: 'PUT', body: { visible: e.target.checked } });
            toast(e.target.checked ? '已在官网显示' : '已在官网隐藏');
          } catch (err) {
            toast(err.message, true);
            e.target.checked = !e.target.checked;
          }
        });
      });
    } catch (err) {
      toast(err.message, true);
    }
  }

  document.getElementById('addBtn').addEventListener('click', () => openEdit(null));
  load();
}
