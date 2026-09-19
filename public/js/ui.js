import { upcomingArrivals } from './trainState.js';

function fmtClock(seconds) {
  const s = Math.floor(((seconds % 86400) + 86400) % 86400);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

function fmtEta(seconds) {
  if (seconds <= 15) return 'сейчас';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m} мин ${String(s).padStart(2, '0')} с` : `${s} с`;
}

export class UI {
  constructor({ linesModel, onSpeedChange, onLineToggle, onStopFollow }) {
    this.linesModel = linesModel;
    this.hiddenLines = new Set();
    this.onSpeedChange = onSpeedChange;
    this.onLineToggle = onLineToggle;
    this.onStopFollow = onStopFollow;

    this.clockEl = document.getElementById('clock');
    this.trainCountEl = document.getElementById('train-count');
    this.legendList = document.getElementById('legend-list');
    this.legendTitle = document.getElementById('legend-title');
    this.legendPanel = document.getElementById('legend-panel');
    this.infoPanel = document.getElementById('info-panel');
    this.infoContent = document.getElementById('info-content');
    this.followBanner = document.getElementById('follow-banner');
    this.followText = document.getElementById('follow-text');
    this.loadingEl = document.getElementById('loading');
    this.loadingFill = document.getElementById('loading-fill');

    this._buildLegend();
    this._bindSpeedControls();

    document.getElementById('info-close').addEventListener('click', () => this.hideInfo());
    document.getElementById('follow-stop').addEventListener('click', () => this.onStopFollow?.());

    this.legendTitle.addEventListener('click', () => {
      this.legendList.classList.toggle('collapsed-hidden');
      this.legendList.style.display = this.legendList.style.display === 'none' ? '' : 'none';
    });
  }

  _buildLegend() {
    this.legendList.innerHTML = '';
    for (const line of this.linesModel) {
      const row = document.createElement('div');
      row.className = 'legend-item';
      row.innerHTML = `<span class="legend-swatch" style="background:${line.color}"></span><span>${line.num}. ${line.name}</span>`;
      row.addEventListener('click', () => {
        if (this.hiddenLines.has(line.id)) {
          this.hiddenLines.delete(line.id);
          row.classList.remove('dim');
        } else {
          this.hiddenLines.add(line.id);
          row.classList.add('dim');
        }
        this.onLineToggle?.(this.hiddenLines);
      });
      this.legendList.appendChild(row);
    }
  }

  _bindSpeedControls() {
    const buttons = document.querySelectorAll('#speed-controls button');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.onSpeedChange?.(Number(btn.dataset.speed));
      });
    });
    buttons[0]?.classList.add('active');
  }

  setLoadingProgress(frac, label) {
    if (!this.loadingEl) return;
    this.loadingFill.style.width = `${Math.round(frac * 100)}%`;
    if (label) this.loadingEl.querySelector('.loading-title').textContent = label;
    if (frac >= 1) {
      setTimeout(() => this.loadingEl.classList.add('hidden'), 250);
    }
  }

  updateClock(simSeconds) {
    this.clockEl.textContent = fmtClock(simSeconds);
  }

  updateTrainCount(n) {
    this.trainCountEl.textContent = n;
  }

  showStationInfo(lineModel, stationIndex, stationName, simSeconds, interchangeLines, onWatch) {
    const arrivals = upcomingArrivals(lineModel, stationIndex, simSeconds, 5);
    const rows = arrivals
      .map((a) => `<div class="arrival-row"><span>${a.dir === lineModel.directions[0] ? '→ прямое' : '← обратное'}</span><span>${fmtEta(a.etaSeconds)}</span></div>`)
      .join('') || '<div class="arrival-row"><span>Поездов нет (ночной перерыв)</span></div>';

    const interchangeHtml = interchangeLines && interchangeLines.length > 1
      ? `<div style="margin:6px 0;font-size:12px;color:#9fb0c0;">Пересадка: ${interchangeLines.map((l) => `<span style="color:${l.color}">${l.name}</span>`).join(', ')}</div>`
      : '';

    this.infoContent.innerHTML = `
      <h3>${stationName}</h3>
      <div style="font-size:12px;color:${lineModel.color};font-weight:700;margin-bottom:4px;">${lineModel.name}</div>
      ${interchangeHtml}
      <button id="watch-station-btn" class="watch-btn">🎥 Смотреть с платформы</button>
      <div style="margin-top:8px;font-size:12px;color:#9fb0c0;">Ближайшие поезда:</div>
      ${rows}
    `;
    this.infoPanel.classList.remove('hidden');
    const btn = document.getElementById('watch-station-btn');
    if (btn && onWatch) btn.addEventListener('click', onWatch);
  }

  showTrainInfo(train, lineModel) {
    const statusLabel = { moving: 'В движении', dwell: 'На станции', terminus: 'Разворот на конечной' }[train.status] || train.status;
    this.infoContent.innerHTML = `
      <h3>Поезд, линия ${lineModel.num}</h3>
      <div style="font-size:12px;color:${lineModel.color};font-weight:700;margin-bottom:4px;">${lineModel.name}</div>
      <div class="arrival-row"><span>Статус</span><span>${statusLabel}</span></div>
      <div class="arrival-row"><span>Скорость</span><span>${Math.round(train.speedFrac * 100)}%</span></div>
      <div class="arrival-row"><span>Направление</span><span>${train.dir}</span></div>
    `;
    this.infoPanel.classList.remove('hidden');
  }

  hideInfo() {
    this.infoPanel.classList.add('hidden');
  }

  setFollowing(label) {
    if (!label) {
      this.followBanner.classList.add('hidden');
      return;
    }
    this.followText.textContent = `Слежение: ${label}`;
    this.followBanner.classList.remove('hidden');
  }
}
