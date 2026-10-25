// Top status bar and the per-agent log panel (plain DOM).

const STATUS_VI = { working: 'Đang làm', waiting: 'Chờ duyệt', error: 'Lỗi', done: 'Xong', idle: 'Rảnh' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = (t) => new Date(t).toLocaleTimeString('vi-VN', { hour12: false });

function duration(ms) {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  return m ? `${m} phút ${sec % 60} giây` : `${sec} giây`;
}

export function renderTopBar(el, { hooksOn, connected, totals, working }) {
  el.innerHTML = `
    <span class="pill ${hooksOn ? 'on' : 'off'}">Hook: ${hooksOn ? 'BẬT' : 'TẮT'}</span>
    <span class="pill ${connected ? 'on' : 'off'}">${connected ? 'Đã kết nối' : 'Mất kết nối…'}</span>
    <span>Tool call: <b>${totals.tools}</b></span>
    <span>Đang làm: <b>${working}</b></span>
    <span>Hoàn thành: <b>${totals.done}/${totals.started}</b></span>`;
}

export function openPanel(el, agent, now) {
  const running = agent.startedAt ? duration((agent.endedAt ?? now) - agent.startedAt) : '—';
  const log = [...agent.log].reverse().map((l) => `
    <li class="${l.ok === false ? 'bad' : ''}">
      <time>${clock(l.t)}</time>
      <span class="mark">${l.ok === true ? '✓' : l.ok === false ? '✗' : '…'}</span>
      <b>${esc(l.tool)}</b> ${esc(l.detail)}
    </li>`).join('');
  el.innerHTML = `
    <button class="close" aria-label="Đóng">×</button>
    <h2>${esc(agent.name)}</h2>
    <p class="role">${esc(agent.role)}</p>
    <dl>
      <dt>Trạng thái</dt><dd class="st-${agent.status}">${STATUS_VI[agent.status] ?? agent.status}${agent.instances > 1 ? ` ×${agent.instances}` : ''}</dd>
      <dt>Thời gian chạy</dt><dd>${running}</dd>
      <dt>Tool call</dt><dd>${agent.toolCount}</dd>
    </dl>
    <h3>Các bước gần nhất</h3>
    ${log ? `<ol class="log">${log}</ol>` : '<p class="muted">Chưa có bước nào.</p>'}
    <h3>Báo cáo cuối</h3>
    ${agent.finalReport ? `<pre>${esc(agent.finalReport)}</pre>` : '<p class="muted">Chưa có.</p>'}`;
  el.dataset.key = agent.key;
  el.hidden = false;
}

export function closePanel(el) {
  el.hidden = true;
  delete el.dataset.key;
}
