/**
 * 日本地図ビジュアライゼーション
 * Canvas上にヘックスグリッド風の都道府県マップを描画
 */
const JapanMap = (() => {
  let canvas, ctx;
  let width, height;
  let tooltip = null;
  let selectedPref = -1;
  let onPrefClick = null;

  // 都道府県のヘックスマップ座標 (col, row) — 日本の形を模した配置
  const hexPositions = [
    { id: 0,  col: 8,  row: 0  }, // 北海道
    { id: 1,  col: 8,  row: 2  }, // 青森
    { id: 2,  col: 9,  row: 3  }, // 岩手
    { id: 3,  col: 8,  row: 4  }, // 宮城
    { id: 4,  col: 8,  row: 3  }, // 秋田
    { id: 5,  col: 7,  row: 4  }, // 山形
    { id: 6,  col: 8,  row: 5  }, // 福島
    { id: 7,  col: 8,  row: 7  }, // 茨城
    { id: 8,  col: 8,  row: 6  }, // 栃木
    { id: 9,  col: 7,  row: 6  }, // 群馬
    { id: 10, col: 7,  row: 7  }, // 埼玉
    { id: 11, col: 8,  row: 8  }, // 千葉
    { id: 12, col: 7,  row: 8  }, // 東京
    { id: 13, col: 7,  row: 9  }, // 神奈川
    { id: 14, col: 6,  row: 5  }, // 新潟
    { id: 15, col: 5,  row: 6  }, // 富山
    { id: 16, col: 4,  row: 6  }, // 石川
    { id: 17, col: 4,  row: 7  }, // 福井
    { id: 18, col: 6,  row: 8  }, // 山梨
    { id: 19, col: 6,  row: 7  }, // 長野
    { id: 20, col: 5,  row: 7  }, // 岐阜
    { id: 21, col: 6,  row: 9  }, // 静岡
    { id: 22, col: 5,  row: 8  }, // 愛知
    { id: 23, col: 5,  row: 9  }, // 三重
    { id: 24, col: 4,  row: 8  }, // 滋賀
    { id: 25, col: 4,  row: 9  }, // 京都
    { id: 26, col: 3,  row: 9  }, // 大阪
    { id: 27, col: 3,  row: 8  }, // 兵庫
    { id: 28, col: 4,  row: 10 }, // 奈良
    { id: 29, col: 3,  row: 10 }, // 和歌山
    { id: 30, col: 2,  row: 7  }, // 鳥取
    { id: 31, col: 1,  row: 7  }, // 島根
    { id: 32, col: 2,  row: 8  }, // 岡山
    { id: 33, col: 1,  row: 8  }, // 広島
    { id: 34, col: 0,  row: 8  }, // 山口
    { id: 35, col: 3,  row: 11 }, // 徳島
    { id: 36, col: 2,  row: 10 }, // 香川
    { id: 37, col: 1,  row: 10 }, // 愛媛
    { id: 38, col: 2,  row: 11 }, // 高知
    { id: 39, col: 0,  row: 10 }, // 福岡
    { id: 40, col: -1, row: 10 }, // 佐賀
    { id: 41, col: -1, row: 11 }, // 長崎
    { id: 42, col: 0,  row: 11 }, // 熊本
    { id: 43, col: 1,  row: 9  }, // 大分
    { id: 44, col: 1,  row: 11 }, // 宮崎
    { id: 45, col: 0,  row: 12 }, // 鹿児島
    { id: 46, col: -2, row: 13 }, // 沖縄
  ];

  const HEX_SIZE = 28;
  const PADDING = 40;

  /**
   * 初期化
   */
  function init(canvasId, clickCallback) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    onPrefClick = clickCallback;

    resize();

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mouseleave', () => {
      tooltip = null;
      draw();
    });
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    width = container.clientWidth || 600;
    height = container.clientHeight || 500;
    if (width <= 0) return;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  /**
   * ヘックス座標をピクセル座標に変換
   */
  function hexToPixel(col, row) {
    // グリッド範囲: col=-2~9 (12列), row=0~13 (14行) + オフセット分
    const colRange = 12; // 9 - (-2) + 1
    const rowRange = 15; // 14行 + offset分
    const size = Math.min(HEX_SIZE, (width - PADDING * 2) / (colRange * 1.8), (height - PADDING * 2) / (rowRange * 1.6));
    const offsetX = width / 2 - 3 * size * 1.8;
    const offsetY = PADDING + size * 0.5;
    const x = offsetX + col * size * 1.8;
    const y = offsetY + row * size * 1.6 + (col % 2 === 0 ? 0 : size * 0.8);
    return { x, y, size };
  }

  /**
   * ヘックスを描画
   */
  function drawHex(x, y, size, fillColor, strokeColor, label, isSelected) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = x + size * 0.9 * Math.cos(angle);
      const hy = y + size * 0.9 * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#ffffff' : strokeColor;
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.stroke();

    // ラベル
    const fontSize = Math.max(7, size * 0.32);
    ctx.fillStyle = getLuminance(fillColor) > 0.5 ? '#333' : '#fff';
    ctx.font = `bold ${fontSize}px "Hiragino Sans", "Yu Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 2文字以上なら短縮
    const shortLabel = label.replace(/県|府|都/, '').substring(0, 3);
    ctx.fillText(shortLabel, x, y);
  }

  /**
   * 採用率からカラーを取得 (グラデーション)
   */
  function getHeatColor(rate) {
    if (rate <= 0) return '#e8edf3';

    // 0 → 青 → 緑 → 黄 → オレンジ → 赤
    const stops = [
      { pos: 0.00, r: 220, g: 230, b: 245 },
      { pos: 0.05, r: 100, g: 180, b: 255 },
      { pos: 0.15, r: 50,  g: 200, b: 150 },
      { pos: 0.30, r: 150, g: 220, b: 50  },
      { pos: 0.50, r: 255, g: 200, b: 0   },
      { pos: 0.70, r: 255, g: 120, b: 0   },
      { pos: 1.00, r: 230, g: 40,  b: 40  },
    ];

    const clampedRate = Math.min(1, rate);

    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (clampedRate >= stops[i].pos && clampedRate <= stops[i + 1].pos) {
        lower = stops[i];
        upper = stops[i + 1];
        break;
      }
    }

    const t = (clampedRate - lower.pos) / (upper.pos - lower.pos || 1);
    const r = Math.round(lower.r + (upper.r - lower.r) * t);
    const g = Math.round(lower.g + (upper.g - lower.g) * t);
    const b = Math.round(lower.b + (upper.b - lower.b) * t);

    return `rgb(${r},${g},${b})`;
  }

  function getLuminance(color) {
    let r, g, b;
    if (color.startsWith('#')) {
      // hex色をパース
      const hex = color.slice(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      const m = color.match(/\d+/g);
      if (!m || m.length < 3) return 0.5;
      [r, g, b] = m.map(Number);
    }
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  /**
   * 描画
   */
  function draw(adoptionData) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const prefectures = Demographics.prefectures;
    const adoption = adoptionData || PersonaEngine.getPrefectureAdoption();

    // ヘックスを描画
    for (const hex of hexPositions) {
      const { x, y, size } = hexToPixel(hex.col, hex.row);
      const pref = prefectures[hex.id];
      const ad = adoption[hex.id];
      const rate = ad ? ad.totalEngaged : 0;

      const fillColor = getHeatColor(rate);
      const isSelected = selectedPref === hex.id;

      drawHex(x, y, size, fillColor, '#aab5c5', pref.name, isSelected);
    }

    // ツールチップ描画
    if (tooltip) {
      drawTooltip(tooltip);
    }

    // 凡例描画
    drawLegend();
  }

  /**
   * 凡例を描画
   */
  function drawLegend() {
    const legendX = 10;
    const legendY = height - 30;
    const legendWidth = 200;
    const legendHeight = 12;

    // グラデーションバー
    const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
    gradient.addColorStop(0, '#e8edf3');
    gradient.addColorStop(0.1, 'rgb(100,180,255)');
    gradient.addColorStop(0.3, 'rgb(50,200,150)');
    gradient.addColorStop(0.5, 'rgb(255,200,0)');
    gradient.addColorStop(0.7, 'rgb(255,120,0)');
    gradient.addColorStop(1.0, 'rgb(230,40,40)');

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0%', legendX, legendY - 3);
    ctx.textAlign = 'center';
    ctx.fillText('浸透率', legendX + legendWidth / 2, legendY - 3);
    ctx.textAlign = 'right';
    ctx.fillText('100%', legendX + legendWidth, legendY - 3);
  }

  /**
   * ツールチップ描画
   */
  function drawTooltip(info) {
    const pad = 10;
    const lineHeight = 18;
    const lines = info.lines;
    const w = 180;
    const h = lines.length * lineHeight + pad * 2;

    let tx = info.x + 15;
    let ty = info.y - h / 2;
    if (tx + w > width) tx = info.x - w - 15;
    if (ty < 0) ty = 5;
    if (ty + h > height) ty = height - h - 5;

    // 背景
    ctx.fillStyle = 'rgba(30, 35, 50, 0.92)';
    ctx.beginPath();
    roundRect(ctx, tx, ty, w, h, 6);
    ctx.fill();

    // テキスト
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      if (i === 0) {
        ctx.font = 'bold 13px "Hiragino Sans", "Yu Gothic", sans-serif';
      } else {
        ctx.font = '11px "Hiragino Sans", "Yu Gothic", sans-serif';
      }
      ctx.fillText(line, tx + pad, ty + pad + lineHeight * (i + 0.7));
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  /**
   * マウス位置からヘックスを特定
   */
  function findHexAt(mx, my) {
    for (const hex of hexPositions) {
      const { x, y, size } = hexToPixel(hex.col, hex.row);
      const dx = mx - x;
      const dy = my - y;
      if (Math.sqrt(dx * dx + dy * dy) < size * 0.85) {
        return hex;
      }
    }
    return null;
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hex = findHexAt(mx, my);
    if (hex) {
      const pref = Demographics.prefectures[hex.id];
      const adoption = PersonaEngine.getPrefectureAdoption()[hex.id];
      const stats = PersonaEngine.getStats();
      const prefStats = stats.byPrefecture[hex.id];

      const pop = prefStats ? prefStats.population : 0;
      const adopted = prefStats ? prefStats.states.D : 0;
      const interested = prefStats ? prefStats.states.I : 0;
      const aware = prefStats ? prefStats.states.A : 0;

      tooltip = {
        x: mx,
        y: my,
        lines: [
          pref.name,
          `人口: ${formatNum(pop)}人`,
          `認知: ${formatNum(aware)} (${(adoption.awarenessRate * 100).toFixed(1)}%)`,
          `関心: ${formatNum(interested)} (${(adoption.interestRate * 100).toFixed(1)}%)`,
          `採用: ${formatNum(adopted)} (${(adoption.adoptionRate * 100).toFixed(1)}%)`,
          `浸透率: ${(adoption.totalEngaged * 100).toFixed(1)}%`,
        ],
      };
      canvas.style.cursor = 'pointer';
    } else {
      tooltip = null;
      canvas.style.cursor = 'default';
    }
    draw();
  }

  function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hex = findHexAt(mx, my);
    if (hex) {
      selectedPref = selectedPref === hex.id ? -1 : hex.id;
      if (onPrefClick) onPrefClick(selectedPref);
      draw();
    }
  }

  function formatNum(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '億';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString();
  }

  return {
    init,
    draw,
    resize,
    getSelectedPref: () => selectedPref,
  };
})();
