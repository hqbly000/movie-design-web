/**
 * 限时审片页 HTML 模板（服务端直出，移动优先）。
 */

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const PAGE_CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #0b0b0f; color: #f2f2f5; min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 64px; }
  header.page-head { padding: 28px 0 18px; border-bottom: 1px solid rgba(255,255,255,.08); }
  .brand { font-size: 12px; letter-spacing: .3em; text-transform: uppercase; color: #8a8a95; margin-bottom: 10px; }
  h1 { font-size: 22px; font-weight: 600; line-height: 1.35; }
  .note { margin-top: 10px; font-size: 14px; line-height: 1.7; color: #b9b9c2; white-space: pre-wrap; }
  .countdown {
    margin-top: 16px; display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px; border-radius: 999px; font-size: 13px;
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  }
  .countdown b { font-variant-numeric: tabular-nums; color: #ffd166; }
  .countdown.is-expired b { color: #ff6b6b; }
  .item { margin-top: 28px; }
  .item-label { font-size: 13px; color: #8a8a95; margin-bottom: 10px; letter-spacing: .08em; }
  .video-card { background: #121218; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; }
  .video-poster {
    position: relative; width: 100%; aspect-ratio: 16 / 9; border: 0; padding: 0;
    background: #000; cursor: pointer; display: block; width: 100%;
  }
  .video-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .video-poster .play {
    position: absolute; inset: 0; display: grid; place-items: center;
  }
  .video-poster .play span {
    width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
    background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.4);
    color: #fff; font-size: 22px; padding-left: 4px; backdrop-filter: blur(4px);
  }
  .video-frame { width: 100%; aspect-ratio: 16 / 9; border: 0; display: block; }
  .video-title { padding: 12px 14px; font-size: 14px; color: #d8d8de; }
  .photo img { width: 100%; border-radius: 14px; display: block; border: 1px solid rgba(255,255,255,.08); }
  .photo figcaption { font-size: 13px; color: #8a8a95; margin-top: 8px; }
  footer.page-foot { margin-top: 56px; font-size: 12px; color: #55555e; text-align: center; }
  .expired {
    min-height: 100vh; display: grid; place-items: center; text-align: center; padding: 24px;
  }
  .expired .box { max-width: 380px; }
  .expired .mark { font-size: 44px; margin-bottom: 16px; }
  .expired h1 { font-size: 20px; margin-bottom: 12px; }
  .expired p { font-size: 14px; color: #8a8a95; line-height: 1.7; }
  @media (min-width: 640px) {
    h1 { font-size: 26px; }
  }
`;

export function renderExpiredPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>链接已失效</title>
<style>${PAGE_CSS}</style>
</head>
<body>
  <div class="expired">
    <div class="box">
      <div class="mark">⏳</div>
      <h1>链接已失效</h1>
      <p>该链接不存在、已被禁用或已超过有效期。<br>如有需要，请联系我们重新获取访问链接。</p>
    </div>
  </div>
</body>
</html>`;
}

export function renderReviewPage({ link, items, embedBase }) {
  const videoItems = items.filter((i) => i.video_id);
  const imageItems = items.filter((i) => i.image_id);

  const videoHtml = videoItems
    .map(
      (item, index) => `
      <div class="item">
        <div class="item-label">VIDEO ${String(index + 1).padStart(2, '0')}</div>
        <div class="video-card">
          <button class="video-poster" data-bvid="${esc(item.video_bvid)}" data-embed="${esc(`${embedBase}${item.video_bvid}`)}" aria-label="播放 ${esc(item.video_title)}">
            <img src="${esc(item.video_cover || '')}" alt="" loading="lazy"
                 onerror="this.style.display='none'">
            <span class="play"><span>▶</span></span>
          </button>
          <div class="video-title">${esc(item.video_title || '未命名视频')}</div>
        </div>
      </div>`
    )
    .join('');

  const imageHtml = imageItems
    .map(
      (item, index) => `
      <div class="item">
        <div class="item-label">PHOTO ${String(index + 1).padStart(2, '0')}</div>
        <figure class="photo">
          <img src="${esc(item.image_src || '')}" alt="${esc(item.image_alt || '')}" loading="lazy">
          ${item.image_alt ? `<figcaption>${esc(item.image_alt)}</figcaption>` : ''}
        </figure>
      </div>`
    )
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(link.title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
  <div class="wrap">
    <header class="page-head">
      <div class="brand">Private Review · 审片预览</div>
      <h1>${esc(link.title)}</h1>
      ${link.note ? `<p class="note">${esc(link.note)}</p>` : ''}
      <div class="countdown" id="countdown">剩余有效时间 <b id="countdownValue">--:--:--</b></div>
    </header>
${videoHtml}${imageHtml}
    <footer class="page-foot">此页面为限时预览链接，请勿外传</footer>
  </div>
  <script>
    (function () {
      var expiresAt = ${Number(new Date(link.expires_at).getTime())};
      var el = document.getElementById('countdownValue');
      var box = document.getElementById('countdown');
      function pad(n) { return n < 10 ? '0' + n : '' + n; }
      function tick() {
        var left = expiresAt - Date.now();
        if (left <= 0) {
          box.classList.add('is-expired');
          el.textContent = '已过期，请刷新或联系获取新链接';
          clearInterval(timer);
          return;
        }
        var s = Math.floor(left / 1000);
        el.textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
      }
      tick();
      var timer = setInterval(tick, 1000);

      document.querySelectorAll('.video-poster').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var iframe = document.createElement('iframe');
          iframe.className = 'video-frame';
          iframe.src = btn.dataset.embed;
          iframe.allowfullscreen = true;
          iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
          btn.replaceWith(iframe);
        });
      });
    })();
  </script>
</body>
</html>`;
}
