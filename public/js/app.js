/* ═══════════════════════════════════════════════════════════
   ENEISOFT XVI – Frontend JavaScript (vanilla, sin dependencias)
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────
  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  function formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function relativeTime(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
  }

  // ── Cargar info del despliegue ─────────────────────────
  async function loadDeployInfo() {
    const grid = document.getElementById('info-grid');
    try {
      const data = await fetchJSON('/api/info');

      const items = [
        { label: 'Version (SHA)', value: data.build.shortSha, style: 'lime' },
        { label: 'Build #', value: `#${data.build.buildNumber}`, style: 'cyan' },
        { label: 'Fecha de Build', value: new Date(data.build.buildDate).toLocaleString('es-PE'), style: '' },
        { label: 'Repositorio', value: data.build.repository, style: '' },
        { label: 'Entorno', value: data.runtime.environment, style: 'lime' },
        { label: 'Pod', value: data.kubernetes.pod, style: 'cyan' },
        { label: 'Nodo', value: data.kubernetes.node, style: '' },
        { label: 'Namespace', value: data.kubernetes.namespace, style: '' },
        { label: 'Node.js', value: data.runtime.nodeVersion, style: '' },
        { label: 'Uptime', value: formatUptime(data.runtime.uptime), style: 'lime' },
      ];

      grid.innerHTML = items.map(function (item) {
        const cls = item.style ? ` info-card__value--${item.style}` : '';
        return `
          <div class="info-card">
            <div class="info-card__label">${escapeHTML(item.label)}</div>
            <div class="info-card__value${cls}">${escapeHTML(item.value)}</div>
          </div>`;
      }).join('');

      // Actualizar sección de mensaje actual
      var msgEl = document.getElementById('current-message');
      var subEl = document.getElementById('current-subtitle');
      if (msgEl) msgEl.textContent = data.content.message;
      if (subEl) subEl.textContent = data.content.subtitle;

      // Actualizar preview del código
      var preview = document.getElementById('content-preview');
      if (preview) {
        preview.textContent =
          "// src/content.js\n" +
          "module.exports = {\n" +
          "  message: '" + data.content.message + "',\n" +
          "  subtitle: '" + data.content.subtitle + "',\n" +
          "};";
      }
    } catch (err) {
      grid.innerHTML = '<div class="info-grid__loading">Error al cargar datos: ' + escapeHTML(err.message) + '</div>';
    }
  }

  // ── Cargar estado del pipeline ─────────────────────────
  async function loadPipelineStatus() {
    var container = document.getElementById('pipeline-status');
    try {
      var data = await fetchJSON('/api/pipeline/latest');

      var conclusionClass = 'pill--pending';
      var conclusionText = data.conclusion || data.status || 'desconocido';
      if (data.conclusion === 'success') conclusionClass = 'pill--success';
      else if (data.conclusion === 'failure') conclusionClass = 'pill--failure';

      var html = '<div class="pipeline-status__grid">';
      html += statusItem('Estado', '<span class="pill ' + conclusionClass + '">' + escapeHTML(conclusionText) + '</span>');
      html += statusItem('Run #', escapeHTML(String(data.run_number)));
      html += statusItem('Commit', '<code>' + escapeHTML(data.short_sha || data.head_sha.substring(0, 7)) + '</code>');
      html += statusItem('Rama', escapeHTML(data.head_branch || 'main'));
      html += statusItem('Autor', escapeHTML(data.actor));
      html += statusItem('Duración', formatDuration(data.duration_seconds || 0));
      html += statusItem('Hace', relativeTime(data.updated_at || data.created_at));
      html += '</div>';

      if (data.html_url && data.html_url !== '#') {
        html += '<a href="' + escapeHTML(data.html_url) + '" target="_blank" rel="noopener noreferrer" class="pipeline-status__link">Ver en GitHub &rarr;</a>';
      }

      if (data.demo || data.message) {
        html += '<p style="margin-top:12px;font-size:0.8rem;color:var(--gray);">' + escapeHTML(data.message || 'Datos simulados') + '</p>';
      }

      container.innerHTML = html;

      // Animar las etapas del pipeline
      animatePipelineStages(data);
    } catch (err) {
      container.innerHTML = '<div class="pipeline-status__loading">No se pudo cargar el estado: ' + escapeHTML(err.message) + '</div>';
    }
  }

  function statusItem(label, valueHTML) {
    return '<div class="pipeline-status__item">' +
      '<span class="pipeline-status__label">' + escapeHTML(label) + '</span>' +
      '<span class="pipeline-status__value">' + valueHTML + '</span>' +
      '</div>';
  }

  function animatePipelineStages(data) {
    var stages = document.querySelectorAll('.pipeline__stage');
    stages.forEach(function (s) {
      s.removeAttribute('data-active');
      s.removeAttribute('data-complete');
    });

    if (data.conclusion === 'success') {
      stages.forEach(function (s) { s.setAttribute('data-complete', 'true'); });
    } else if (data.status === 'in_progress') {
      stages.forEach(function (s, i) {
        if (i < stages.length - 1) {
          s.setAttribute('data-active', 'true');
          s.style.animationDelay = (i * 0.3) + 's';
        }
      });
    }
  }

  // ── Balanceo entre pods ────────────────────────────────
  function setupLoadBalancing() {
    var btn = document.getElementById('lb-btn');
    var results = document.getElementById('lb-results');
    if (!btn || !results) return;

    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Consultando...';
      results.innerHTML = '';

      var pods = [];
      var podColors = {};
      var colorIndex = 0;
      var colors = ['a', 'b'];

      for (var i = 0; i < 6; i++) {
        try {
          var data = await fetchJSON('/api/info');
          var podName = data.kubernetes.pod;
          if (!(podName in podColors)) {
            podColors[podName] = colors[colorIndex % colors.length];
            colorIndex++;
          }
          pods.push({
            request: i + 1,
            pod: podName,
            color: podColors[podName],
            uptime: formatUptime(data.runtime.uptime),
          });
        } catch (err) {
          pods.push({ request: i + 1, pod: 'error', color: 'a', uptime: '-' });
        }
      }

      var html = '<table class="lb-results__table">';
      html += '<thead><tr><th>#</th><th>Pod</th><th>Uptime</th></tr></thead>';
      html += '<tbody>';
      pods.forEach(function (p) {
        html += '<tr>' +
          '<td>' + p.request + '</td>' +
          '<td><span class="lb-pod"><span class="lb-pod__dot lb-pod__dot--' + p.color + '"></span>' + escapeHTML(p.pod) + '</span></td>' +
          '<td>' + escapeHTML(p.uptime) + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';

      // Resumen
      var uniquePods = Object.keys(podColors);
      if (uniquePods.length > 1) {
        html += '<p style="margin-top:16px;color:var(--lime);font-weight:600;">Se observaron ' + uniquePods.length + ' pods distintos respondiendo.</p>';
      } else {
        html += '<p style="margin-top:16px;color:var(--gray);font-size:0.85rem;">Solo un pod respondió. En producción con 2+ réplicas verás diferentes pods.</p>';
      }

      results.innerHTML = html;
      btn.disabled = false;
      btn.textContent = 'Consultar de nuevo';
    });
  }

  // ── Init ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    loadDeployInfo();
    loadPipelineStatus();
    setupLoadBalancing();

    // Refrescar cada 30s
    setInterval(loadDeployInfo, 30000);
    setInterval(loadPipelineStatus, 30000);
  });
})();
