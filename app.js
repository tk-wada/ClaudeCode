/**
 * EmotionLens - 感情分析ウィジェット
 * カメラ / 動画アップロードから表情を解析してリアルタイムで感情を表示
 */

// ===== 定数 =====
const API_URL = '/analyze';

const EMOTION_CONFIG = {
  happy:     { label: '喜び',   emoji: '😊', color: '#facc15' },
  sad:       { label: '悲しみ', emoji: '😢', color: '#60a5fa' },
  angry:     { label: '怒り',   emoji: '😠', color: '#f87171' },
  surprised: { label: '驚き',   emoji: '😲', color: '#fb923c' },
  fearful:   { label: '恐怖',   emoji: '😨', color: '#a78bfa' },
  disgusted: { label: '嫌悪',   emoji: '🤢', color: '#4ade80' },
  neutral:   { label: '中立',   emoji: '😐', color: '#94a3b8' },
};

const EMOTION_NAMES_JA = {
  happy: '喜び', sad: '悲しみ', angry: '怒り',
  surprised: '驚き', fearful: '恐怖', disgusted: '嫌悪', neutral: '中立',
};

// ===== 状態管理 =====
let currentMode = 'camera';
let cameraStream = null;
let analysisInterval = null;
let intervalMs = 2000;
let analysisCount = 0;
let isAnalyzing = false;

// 履歴データ（グラフ用）
const MAX_HISTORY = 20;
const emotionHistory = {
  labels: [],
  datasets: Object.keys(EMOTION_CONFIG).map(key => ({
    key,
    color: EMOTION_CONFIG[key].color,
    data: [],
  })),
};

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  setupDragAndDrop();
});

// ===== モード切替 =====
function setMode(mode) {
  currentMode = mode;

  document.getElementById('btn-camera').classList.toggle('active', mode === 'camera');
  document.getElementById('btn-upload').classList.toggle('active', mode === 'upload');
  document.getElementById('camera-section').style.display = mode === 'camera' ? '' : 'none';
  document.getElementById('upload-section').style.display = mode === 'upload' ? '' : 'none';

  if (mode === 'camera') {
    stopCamera();
  } else {
    stopCamera();
  }
}

// ===== カメラ制御 =====
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });

    const video = document.getElementById('camera-video');
    video.srcObject = cameraStream;

    document.getElementById('camera-overlay').classList.add('hidden');
    document.getElementById('start-camera-btn').style.display = 'none';
    document.getElementById('stop-camera-btn').style.display = '';

    setStatus('active', 'カメラ起動中');

    // 自動解析開始
    startCameraAnalysis();
  } catch (err) {
    alert(`カメラの起動に失敗しました: ${err.message}\nブラウザの設定でカメラアクセスを許可してください。`);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  if (analysisInterval) {
    clearInterval(analysisInterval);
    analysisInterval = null;
  }

  const video = document.getElementById('camera-video');
  video.srcObject = null;
  document.getElementById('camera-overlay').classList.remove('hidden');
  document.getElementById('start-camera-btn').style.display = '';
  document.getElementById('stop-camera-btn').style.display = 'none';

  setStatus('', '待機中');
}

function startCameraAnalysis() {
  if (analysisInterval) clearInterval(analysisInterval);
  analysisInterval = setInterval(analyzeFromCamera, intervalMs);
  analyzeFromCamera(); // 即時実行
}

function updateInterval() {
  intervalMs = parseInt(document.getElementById('interval-select').value);
  if (cameraStream && analysisInterval) {
    startCameraAnalysis();
  }
}

async function analyzeFromCamera() {
  if (isAnalyzing || !cameraStream) return;

  const video = document.getElementById('camera-video');
  if (video.readyState < 2) return;

  const canvas = document.getElementById('camera-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const base64 = canvas.toDataURL('image/jpeg', 0.85);
  await sendForAnalysis(base64);
}

// ===== 動画アップロード =====
function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const video = document.getElementById('upload-video');
  video.src = url;

  document.getElementById('upload-area').style.display = 'none';
  document.getElementById('upload-video-wrapper').style.display = '';
  document.getElementById('upload-controls').style.display = '';
}

function resetUpload() {
  document.getElementById('upload-area').style.display = '';
  document.getElementById('upload-video-wrapper').style.display = 'none';
  document.getElementById('upload-controls').style.display = 'none';
  document.getElementById('video-progress-wrapper').style.display = 'none';
  document.getElementById('video-input').value = '';
  setStatus('', '待機中');
}

async function analyzeVideo() {
  const video = document.getElementById('upload-video');
  if (!video.src) return;

  const canvas = document.getElementById('upload-canvas');
  const ctx = canvas.getContext('2d');
  const duration = video.duration;

  // 動画の長さに応じてサンプリング数を決定（最大15フレーム）
  const sampleCount = Math.min(15, Math.max(3, Math.floor(duration / 2)));
  const timestamps = [];
  for (let i = 0; i < sampleCount; i++) {
    timestamps.push((duration * i) / (sampleCount - 1 || 1));
  }

  document.getElementById('analyze-video-btn').disabled = true;
  document.getElementById('video-progress-wrapper').style.display = '';
  setStatus('analyzing', '動画解析中');

  // 時系列リセット
  resetHistory();

  for (let i = 0; i < timestamps.length; i++) {
    const pct = Math.round(((i + 1) / timestamps.length) * 100);
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-text').textContent = `${pct}%`;

    // フレームをシーク
    await seekVideo(video, timestamps[i]);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    await sendForAnalysis(base64, `${formatTime(timestamps[i])}`);

    // APIレート制限を考慮して待機
    if (i < timestamps.length - 1) {
      await sleep(500);
    }
  }

  document.getElementById('analyze-video-btn').disabled = false;
  document.getElementById('video-progress-wrapper').style.display = 'none';
  setStatus('active', '解析完了');
  setTimeout(() => setStatus('', '待機中'), 3000);
}

function seekVideo(video, time) {
  return new Promise(resolve => {
    video.currentTime = time;
    video.onseeked = () => resolve();
  });
}

// ===== API呼び出し =====
async function sendForAnalysis(base64, label = null) {
  if (isAnalyzing) return;
  isAnalyzing = true;
  setStatus('analyzing', '解析中...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, media_type: 'image/jpeg' }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const result = await response.json();
    analysisCount++;
    displayResult(result, label);
    setStatus('active', 'カメラ起動中');
  } catch (err) {
    console.error('解析エラー:', err);
    document.getElementById('description-text').textContent = `解析エラー: ${err.message}`;
    setStatus('', 'エラー');
  } finally {
    isAnalyzing = false;
  }
}

// ===== 結果表示 =====
function displayResult(result, label = null) {
  if (!result.face_detected) {
    document.getElementById('description-text').textContent = '顔が検出できませんでした。カメラに顔を向けてください。';
    document.getElementById('dominant-name').textContent = '未検出';
    document.getElementById('dominant-emoji').textContent = '🔍';
    return;
  }

  const { emotions, dominant_emotion, description, confidence } = result;

  // 主要感情
  const cfg = EMOTION_CONFIG[dominant_emotion] || EMOTION_CONFIG.neutral;
  document.getElementById('dominant-emoji').textContent = cfg.emoji;
  document.getElementById('dominant-name').textContent = EMOTION_NAMES_JA[dominant_emotion] || dominant_emotion;
  document.getElementById('dominant-confidence').textContent =
    `確信度: ${Math.round((confidence || 0) * 100)}%`;

  const card = document.getElementById('dominant-card');
  card.setAttribute('data-emotion', dominant_emotion);

  // 感情バー更新
  Object.entries(emotions).forEach(([key, val]) => {
    const pct = Math.round(val * 100);
    const bar = document.getElementById(`bar-${key}`);
    const valEl = document.getElementById(`val-${key}`);
    if (bar) bar.style.width = `${pct}%`;
    if (valEl) valEl.textContent = `${pct}%`;
  });

  // 説明テキスト
  document.getElementById('description-text').textContent = description || '解析完了';

  // メタ情報
  const metaEl = document.getElementById('analysis-meta');
  metaEl.style.display = 'flex';
  document.getElementById('meta-time').textContent = label
    ? `時刻: ${label}` : `${new Date().toLocaleTimeString()}`;
  document.getElementById('meta-count').textContent = `解析回数: ${analysisCount}`;
  document.getElementById('analysis-count').textContent = `解析回数: ${analysisCount}`;

  // 履歴グラフ更新
  updateHistory(emotions, label || new Date().toLocaleTimeString('ja', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
}

// ===== ステータス =====
function setStatus(type, text) {
  const badge = document.getElementById('status-badge');
  badge.className = `status-badge ${type}`;
  document.getElementById('status-text').textContent = text;
}

// ===== 時系列グラフ =====
let chartCtx = null;
let chartData = null;

function initChart() {
  const canvas = document.getElementById('history-chart');
  chartCtx = canvas.getContext('2d');

  // シンプルなラインチャートを手動描画
  chartData = {
    labels: [],
    series: Object.fromEntries(
      Object.keys(EMOTION_CONFIG).map(k => [k, []])
    ),
  };

  renderChart();
  buildLegend();
}

function resetHistory() {
  chartData.labels = [];
  Object.keys(EMOTION_CONFIG).forEach(k => { chartData.series[k] = []; });
  renderChart();
}

function updateHistory(emotions, label) {
  chartData.labels.push(label);
  Object.entries(emotions).forEach(([key, val]) => {
    if (chartData.series[key] !== undefined) {
      chartData.series[key].push(val);
    }
  });

  // 最大件数超過時は古いデータを削除
  if (chartData.labels.length > MAX_HISTORY) {
    chartData.labels.shift();
    Object.keys(chartData.series).forEach(k => chartData.series[k].shift());
  }

  renderChart();
}

function renderChart() {
  const canvas = document.getElementById('history-chart');
  const w = canvas.offsetWidth;
  const h = 120;
  canvas.width = w;
  canvas.height = h;
  const ctx = chartCtx;

  ctx.clearRect(0, 0, w, h);

  const n = chartData.labels.length;
  if (n < 2) {
    ctx.fillStyle = '#ffffff18';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('解析データが蓄積されるとグラフが表示されます', w / 2, h / 2);
    return;
  }

  // グリッド線
  ctx.strokeStyle = '#ffffff10';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const padL = 4, padR = 4, padT = 8, padB = 4;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // 感情ごとに折れ線を描画
  Object.entries(EMOTION_CONFIG).forEach(([key, cfg]) => {
    const vals = chartData.series[key];
    if (!vals || vals.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    vals.forEach((v, i) => {
      const x = padL + (i / (n - 1)) * plotW;
      const y = padT + (1 - v) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });

    ctx.stroke();
  });
}

function buildLegend() {
  const el = document.getElementById('chart-legend');
  el.innerHTML = Object.entries(EMOTION_CONFIG).map(([key, cfg]) =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${cfg.color}"></div>
      ${cfg.emoji} ${cfg.label}
    </div>`
  ).join('');
}

// ===== ドラッグ&ドロップ =====
function setupDragAndDrop() {
  const area = document.getElementById('upload-area');
  if (!area) return;

  area.addEventListener('dragover', e => {
    e.preventDefault();
    area.style.borderColor = 'var(--accent)';
    area.style.background = '#a855f710';
  });

  area.addEventListener('dragleave', () => {
    area.style.borderColor = '';
    area.style.background = '';
  });

  area.addEventListener('drop', e => {
    e.preventDefault();
    area.style.borderColor = '';
    area.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      const input = document.getElementById('video-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleVideoUpload({ target: input });
    }
  });
}

// ===== ユーティリティ =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ウィンドウリサイズ時にグラフを再描画
window.addEventListener('resize', () => {
  if (chartData) renderChart();
});
