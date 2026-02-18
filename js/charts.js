/**
 * チャート描画モジュール
 * Canvas 2Dを使った自前チャート描画
 */
var Charts = (() => {
  const COLORS = {
    S: '#94a3b8', // 未認知 - グレー
    A: '#60a5fa', // 認知 - 青
    I: '#fbbf24', // 関心 - 黄
    D: '#f97316', // 採用 - オレンジ
    R: '#a78bfa', // 離脱 - 紫
  };

  const STATE_LABELS = {
    S: '未認知',
    A: '認知',
    I: '関心',
    D: '採用',
    R: '離脱',
  };

  /**
   * 時系列エリアチャート (スタック)
   */
  function drawTimeSeries(canvasId, history, totalPop) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight || 250;
    if (w <= 0) return; // 非表示タブではスキップ
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);

    if (!history || history.length < 2) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('シミュレーションを実行してください', w / 2, h / 2);
      return;
    }

    const margin = { top: 20, right: 20, bottom: 35, left: 55 };
    const chartW = w - margin.left - margin.right;
    const chartH = h - margin.top - margin.bottom;

    const stateOrder = ['R', 'D', 'I', 'A', 'S'];
    const maxDay = history[history.length - 1].day;

    // スケール
    const xScale = (day) => margin.left + (day / maxDay) * chartW;
    const yScale = (val) => margin.top + chartH - (val / totalPop) * chartH;

    // スタックエリア描画
    for (let si = 0; si < stateOrder.length; si++) {
      const state = stateOrder[si];
      ctx.beginPath();

      // 上辺
      for (let i = 0; i < history.length; i++) {
        let cumulative = 0;
        for (let j = 0; j <= si; j++) {
          cumulative += history[i].states[stateOrder[j]];
        }
        const x = xScale(history[i].day);
        const y = yScale(cumulative);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // 下辺（前のスタック or ベースライン）
      for (let i = history.length - 1; i >= 0; i--) {
        let cumulative = 0;
        for (let j = 0; j < si; j++) {
          cumulative += history[i].states[stateOrder[j]];
        }
        const x = xScale(history[i].day);
        const y = yScale(cumulative);
        ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.fillStyle = COLORS[state] + 'cc';
      ctx.fill();
    }

    // 軸描画
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    // X軸
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartH);
    ctx.lineTo(margin.left + chartW, margin.top + chartH);
    ctx.stroke();

    // Y軸
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartH);
    ctx.stroke();

    // X軸ラベル
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const xTicks = Math.min(6, maxDay);
    for (let i = 0; i <= xTicks; i++) {
      const day = Math.round((maxDay / xTicks) * i);
      const x = xScale(day);
      ctx.fillText(`${day}日`, x, margin.top + chartH + 18);

      // グリッド線
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartH);
      ctx.stroke();
    }

    // Y軸ラベル
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = (totalPop / 4) * i;
      const y = yScale(val);
      ctx.fillStyle = '#666';
      ctx.fillText(formatPopShort(val), margin.left - 5, y + 3);

      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartW, y);
      ctx.stroke();
    }

    // 凡例
    const legendX = margin.left + 10;
    const legendY = margin.top + 5;
    const legendStates = ['S', 'A', 'I', 'D', 'R'];
    ctx.font = '10px sans-serif';
    let lx = legendX;
    for (const s of legendStates) {
      ctx.fillStyle = COLORS[s];
      ctx.fillRect(lx, legendY, 10, 10);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText(STATE_LABELS[s], lx + 13, legendY + 9);
      lx += ctx.measureText(STATE_LABELS[s]).width + 22;
    }
  }

  /**
   * 年齢別棒グラフ
   */
  function drawAgeDistribution(canvasId, byAge, mode = 'adoption') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight || 220;
    if (w <= 0) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);

    if (!byAge) return;

    const margin = { top: 15, right: 15, bottom: 40, left: 50 };
    const chartW = w - margin.left - margin.right;
    const chartH = h - margin.top - margin.bottom;

    const ageKeys = Object.keys(byAge).sort((a, b) => Number(a) - Number(b));
    const barWidth = chartW / ageKeys.length * 0.7;
    const gap = chartW / ageKeys.length * 0.3;

    // 最大値を計算
    let maxVal = 0;
    for (const k of ageKeys) {
      const ag = byAge[k];
      if (mode === 'adoption') {
        const rate = ag.population > 0 ? (ag.states.D / ag.population) : 0;
        maxVal = Math.max(maxVal, rate);
      } else {
        maxVal = Math.max(maxVal, ag.population);
      }
    }
    maxVal = maxVal || 1;

    // 棒描画
    ageKeys.forEach((k, i) => {
      const ag = byAge[k];
      const x = margin.left + i * (barWidth + gap) + gap / 2;

      if (mode === 'adoption') {
        // スタックバー（各状態）
        const states = ['D', 'I', 'A'];
        let cumY = 0;
        for (const s of states) {
          const rate = ag.population > 0 ? ag.states[s] / ag.population : 0;
          const barH = (rate / Math.max(maxVal * 1.2, 0.01)) * chartH;
          ctx.fillStyle = COLORS[s] + 'dd';
          ctx.fillRect(x, margin.top + chartH - cumY - barH, barWidth, barH);
          cumY += barH;
        }
      } else {
        const barH = (ag.population / maxVal) * chartH * 0.9;
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(x, margin.top + chartH - barH, barWidth, barH);

        // 人口数ラベル
        ctx.fillStyle = '#666';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatPopShort(ag.population), x + barWidth / 2, margin.top + chartH - barH - 4);
      }

      // ラベル
      ctx.fillStyle = '#555';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x + barWidth / 2, margin.top + chartH + 8);
      ctx.rotate(-0.3);
      ctx.fillText(ag.label, 0, 0);
      ctx.restore();
    });

    // Y軸
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#999';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal * 1.2 / 4) * i;
      const y = margin.top + chartH - (val / (maxVal * 1.2 || 1)) * chartH;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartW, y);
      ctx.stroke();
      if (mode === 'adoption') {
        ctx.fillText((val * 100).toFixed(0) + '%', margin.left - 5, y + 3);
      } else {
        ctx.fillText(formatPopShort(val), margin.left - 5, y + 3);
      }
    }
  }

  /**
   * 地方別ドーナツチャート
   */
  function drawRegionDonut(canvasId, byRegion) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight || 220;
    if (w <= 0) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);

    if (!byRegion) return;

    const regions = Object.entries(byRegion);
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2 - 30;
    const innerR = outerR * 0.55;

    const regionColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    ];

    let totalPop = 0;
    let totalAdopted = 0;
    for (const [, data] of regions) {
      totalPop += data.population;
      totalAdopted += data.states.D;
    }

    // 各地方のアーク
    let startAngle = -Math.PI / 2;
    regions.forEach(([name, data], i) => {
      const slice = (data.population / totalPop) * Math.PI * 2;
      const adoptionRate = data.population > 0 ? data.states.D / data.population : 0;

      // 外側: 人口比率
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
      ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = regionColors[i % regionColors.length] + 'cc';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 内側: 採用率
      const innerSlice = slice * Math.min(1, adoptionRate * 5);
      if (innerSlice > 0.01) {
        ctx.beginPath();
        ctx.arc(cx, cy, innerR - 2, startAngle, startAngle + innerSlice);
        ctx.arc(cx, cy, innerR * 0.3, startAngle + innerSlice, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = regionColors[i % regionColors.length] + '66';
        ctx.fill();
      }

      // ラベル
      const midAngle = startAngle + slice / 2;
      const labelR = outerR + 15;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);

      ctx.fillStyle = '#444';
      ctx.font = '10px sans-serif';
      ctx.textAlign = midAngle > Math.PI / 2 && midAngle < Math.PI * 1.5 ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      if (slice > 0.15) {
        ctx.fillText(`${name} ${(adoptionRate * 100).toFixed(1)}%`, lx, ly);
      }

      startAngle += slice;
    });

    // 中央テキスト
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(totalAdopted / totalPop * 100).toFixed(1)}%`, cx, cy - 8);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('全国採用率', cx, cy + 10);
  }

  /**
   * 流行曲線（認知・関心・採用の推移線）
   */
  function drawTrendLines(canvasId, history, totalPop) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight || 200;
    if (w <= 0) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);
    if (!history || history.length < 2) return;

    const margin = { top: 20, right: 15, bottom: 30, left: 50 };
    const chartW = w - margin.left - margin.right;
    const chartH = h - margin.top - margin.bottom;
    const maxDay = history[history.length - 1].day;

    // 各状態の最大値を求める
    let maxRate = 0;
    for (const h2 of history) {
      for (const s of ['A', 'I', 'D']) {
        maxRate = Math.max(maxRate, h2.states[s] / totalPop);
      }
    }
    maxRate = maxRate || 0.01;

    const xScale = (day) => margin.left + (day / maxDay) * chartW;
    const yScale = (rate) => margin.top + chartH - (rate / (maxRate * 1.2)) * chartH;

    // グリッド
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartW, y);
      ctx.stroke();
    }

    // 線描画
    const lines = [
      { state: 'A', color: COLORS.A, label: '認知' },
      { state: 'I', color: COLORS.I, label: '関心' },
      { state: 'D', color: COLORS.D, label: '採用' },
    ];

    for (const line of lines) {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';

      for (let i = 0; i < history.length; i++) {
        const rate = history[i].states[line.state] / totalPop;
        const x = xScale(history[i].day);
        const y = yScale(rate);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 末端にラベル
      const lastRate = history[history.length - 1].states[line.state] / totalPop;
      const lx = xScale(maxDay) + 3;
      const ly = yScale(lastRate);
      ctx.fillStyle = line.color;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(line.label, lx, ly);
    }

    // Y軸ラベル
    ctx.fillStyle = '#999';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const rate = (maxRate * 1.2 / 4) * i;
      const y = yScale(rate);
      ctx.fillText((rate * 100).toFixed(1) + '%', margin.left - 5, y + 3);
    }

    // X軸ラベル
    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const day = Math.round((maxDay / 6) * i);
      ctx.fillText(`${day}日`, xScale(day), margin.top + chartH + 18);
    }
  }

  function formatPopShort(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '億';
    if (n >= 10000) return Math.round(n / 10000) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + '千';
    return Math.round(n).toString();
  }

  return {
    drawTimeSeries,
    drawAgeDistribution,
    drawRegionDonut,
    drawTrendLines,
    COLORS,
    STATE_LABELS,
  };
})();
