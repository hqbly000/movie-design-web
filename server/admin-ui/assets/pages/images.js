import { api, guard, bindLogout, toast, esc } from '../admin.js';

const SECTION_LABEL = { hero: 'Hero 主图', showcase_poster: '视频区封面' };

export default function () {
  guard();
  bindLogout();
  const list = document.getElementById('list');
  const editTpl = document.getElementById('editTpl');

  function openEdit(row) {
    const node = editTpl.content.cloneNode(true);
    const sheet = node.querySelector('.sheet');
    sheet.querySelector('[data-title]').textContent = row ? '编辑图片' : '新增图片';
    const fileInput = sheet.querySelector('[name=file]');
    const srcInput = sheet.querySelector('[name=src]');
    if (row) {
      sheet.querySelector('[name=section]').value = row.section;
      srcInput.value = row.src;
      sheet.querySelector('[name=alt]').value = row.alt || '';
      sheet.querySelector('[name=sort]').value = row.sort;
    }
    // 选择文件后立即上传并回填 URL
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      toast('上传中…');
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '上传失败');
        srcInput.value = data.url;
        toast('上传成功');
      } catch (err) {
        toast(err.message, true);
      }
    });
    node.querySelector('[data-cancel]').addEventListener('click', () => node.remove());
    node.querySelector('.sheet-mask').addEventListener('click', (e) => {
      if (e.target.classList.contains('sheet-mask')) node.remove();
    });
    node.querySelector('[data-save]').addEventListener('click', async (e) => {
      const body = {
        section: sheet.querySelector('[name=section]').value,
        src: srcInput.value.trim(),
        alt: sheet.querySelector('[name=alt]').value,
        sort: Number(sheet.querySelector('[name=sort]').value) || 0
      };
      try {
        e.target.disabled = true;
        if (row) await api(`/images/${row.id}`, { method: 'PUT', body });
        else await api('/images', { method: 'POST', body });
        toast('已保存');
        node.remove();
        load();
      } catch (err) {
        toast(err.message, true);
        e.target.disabled = false;
      }
    });
    document.body.appendChild(node);
  }

  async function load() {
    try {
      const rows = await api('/images');
      if (!rows.length) {
        list.innerHTML = '<div class="empty">还没有图片，点击「新增图片」上传或粘贴 URL</div>';
        return;
      }
      list.innerHTML = rows
        .map(
          (r) => `
        <div class="card" data-id="${r.id}">
          <div class="row">
            <img class="thumb" src="${esc(r.src)}" alt="" onerror="this.style.visibility='hidden'">
            <div class="grow">
              <div class="title">${SECTION_LABEL[r.section] || r.section}</div>
              <div class="meta">${esc(r.alt || r.src)}</div>
            </div>
            <label class="switch" title="是否启用">
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
          if (!confirm('确定删除这张图片？')) return;
          await api(`/images/${id}`, { method: 'DELETE' });
          toast('已删除');
          load();
        });
        card.querySelector('[data-visible]').addEventListener('change', async (e) => {
          try {
            await api(`/images/${id}`, { method: 'PUT', body: { visible: e.target.checked } });
            toast(e.target.checked ? '已启用' : '已停用');
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
