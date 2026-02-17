/**
 * TrendSim Japan - メインアプリケーション
 * 全モジュールの統合と UI 制御
 */
document.addEventListener('DOMContentLoaded', () => {
  // === DOM要素の取得 ===
  const $ = (id) => document.getElementById(id);

  const popCount = $('pop-count');
  const cohortCount = $('cohort-count');
  const btnGenerate = $('btn-generate');
  const btnStart = $('btn-start');
  const btnPause = $('btn-pause');
  const btnReset = $('btn-reset');
  const btnResample = $('btn-resample');
  const simDay = $('sim-day');
  const simState = $('sim-state');
  const presetList = $('preset-list');
  const personaGrid = $('persona-grid');
  const rankingList = $('ranking-list');

  // パラメータ入力
  const paramMedia = $('param-media');
  const paramSns = $('param-sns');
  const paramWom = $('param-wom');
  const paramGeo = $('param-geo');
  const paramDecay = $('param-decay');
  const paramSeed = $('param-seed');
  const paramStartPref = $('param-startpref');
  const paramDays = $('param-days');
  const simSpeed = $('sim-speed');

  // 統計表示
  const statTotal = $('stat-total');
  const statAware = $('stat-aware');
  const statInterested = $('stat-interested');
  const statAdopted = $('stat-adopted');
  const statRetired = $('stat-retired');

  let selectedPreset = -1;

  // === 初期化 ===
  initPresets();
  initPrefectureSelect();
  initParamListeners();
  initTabs();

  // ページ読み込み時にペルソナを自動生成
  setTimeout(() => generatePersonas(), 100);

  // === プリセットの初期化 ===
  function initPresets() {
    const presets = Demographics.trendPresets;
    presetList.innerHTML = '';

    presets.forEach((preset, i) => {
      const div = document.createElement('div');
      div.className = 'preset-item';
      div.innerHTML = `
        <div class="preset-name">${preset.name}</div>
        <div class="preset-desc">${preset.description}</div>
      `;
      div.addEventListener('click', () => selectPreset(i));
      presetList.appendChild(div);
    });
  }

  function selectPreset(index) {
    selectedPreset = index;
    const preset = Demographics.trendPresets[index];

    // プリセット表示を更新
    document.querySelectorAll('.preset-item').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });

    // パラメータを反映
    const p = preset.params;
    paramMedia.value = Math.round(p.mediaInfluence * 100);
    paramSns.value = Math.round(p.snsSpread * 100);
    paramWom.value = Math.round(p.wordOfMouth * 100);
    paramGeo.value = Math.round(p.geographicSpread * 100);
    paramDecay.value = Math.round(p.decayRate * 100);
    paramStartPref.value = p.startPrefecture;

    updateParamDisplay();
  }

  // === 都道府県セレクト初期化 ===
  function initPrefectureSelect() {
    paramStartPref.innerHTML = '';
    Demographics.prefectures.forEach(pref => {
      const opt = document.createElement('option');
      opt.value = pref.id;
      opt.textContent = pref.name;
      paramStartPref.appendChild(opt);
    });
    paramStartPref.value = 12; // デフォルト: 東京
  }

  // === パラメータリスナー ===
  function initParamListeners() {
    const sliders = [
      { el: paramMedia, valEl: $('val-media'), format: v => (v / 100).toFixed(2) },
      { el: paramSns, valEl: $('val-sns'), format: v => (v / 100).toFixed(2) },
      { el: paramWom, valEl: $('val-wom'), format: v => (v / 100).toFixed(2) },
      { el: paramGeo, valEl: $('val-geo'), format: v => (v / 100).toFixed(2) },
      { el: paramDecay, valEl: $('val-decay'), format: v => (v / 100).toFixed(2) },
      { el: paramSeed, valEl: $('val-seed'), format: v => Number(v).toLocaleString() },
      { el: paramDays, valEl: $('val-days'), format: v => v },
    ];

    sliders.forEach(({ el, valEl, format }) => {
      el.addEventListener('input', () => {
        valEl.textContent = format(el.value);
      });
    });
  }

  function updateParamDisplay() {
    $('val-media').textContent = (paramMedia.value / 100).toFixed(2);
    $('val-sns').textContent = (paramSns.value / 100).toFixed(2);
    $('val-wom').textContent = (paramWom.value / 100).toFixed(2);
    $('val-geo').textContent = (paramGeo.value / 100).toFixed(2);
    $('val-decay').textContent = (paramDecay.value / 100).toFixed(2);
    $('val-seed').textContent = Number(paramSeed.value).toLocaleString();
    $('val-days').textContent = paramDays.value;
  }

  // === タブ制御 ===
  function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        $('tab-' + tab.dataset.tab).classList.add('active');

        // タブ切り替え時にチャートを再描画
        setTimeout(refreshCharts, 50);
      });
    });
  }

  // === ボタンイベント ===
  btnGenerate.addEventListener('click', generatePersonas);
  btnStart.addEventListener('click', startSimulation);
  btnPause.addEventListener('click', pauseSimulation);
  btnReset.addEventListener('click', resetSimulation);
  btnResample.addEventListener('click', showSamplePersonas);

  // === ペルソナ生成 ===
  function generatePersonas() {
    btnGenerate.textContent = '生成中...';
    btnGenerate.disabled = true;

    // 少し遅延を入れてUI更新を反映
    setTimeout(() => {
      const stats = PersonaEngine.generate();

      // UI更新
      popCount.textContent = formatPop(stats.totalPopulation);
      cohortCount.textContent = stats.totalCohorts.toLocaleString();
      statTotal.textContent = formatPop(stats.totalPopulation);

      // 日本地図初期化
      JapanMap.init('japan-map', (prefId) => {
        // 都道府県クリック時の処理
      });

      // 年齢別人口チャート
      Charts.drawAgeDistribution('chart-age-pop', stats.byAge, 'population');

      // ボタン状態更新
      btnGenerate.textContent = '再生成';
      btnGenerate.disabled = false;
      btnStart.disabled = false;
      btnReset.disabled = false;
      btnResample.disabled = false;

      // サンプルペルソナ表示
      showSamplePersonas();

      updateStatsDisplay(stats);
    }, 50);
  }

  // === シミュレーション開始 ===
  function startSimulation() {
    if (SimulationEngine.isPaused()) {
      // 一時停止からの再開
      const speed = parseInt(simSpeed.value);
      SimulationEngine.run(onSimStep, speed);
      setSimState('running', '実行中');
      btnStart.disabled = true;
      btnPause.disabled = false;
      return;
    }

    // パラメータ取得
    const preset = selectedPreset >= 0 ? Demographics.trendPresets[selectedPreset] : null;
    const customParams = {
      mediaInfluence: paramMedia.value / 100,
      snsSpread: paramSns.value / 100,
      wordOfMouth: paramWom.value / 100,
      geographicSpread: paramGeo.value / 100,
      decayRate: paramDecay.value / 100,
      initialSeed: parseInt(paramSeed.value),
      startPrefecture: parseInt(paramStartPref.value),
      maxSteps: parseInt(paramDays.value),
      ageAffinity: preset ? preset.params.ageAffinity : [0.3, 0.8, 0.9, 0.7, 0.5, 0.4, 0.3, 0.2, 0.1],
    };

    SimulationEngine.init(customParams);

    const speed = parseInt(simSpeed.value);
    SimulationEngine.run(onSimStep, speed);

    setSimState('running', '実行中');
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnGenerate.disabled = true;

    // シミュレーションタブに自動切り替え
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="simulation"]').classList.add('active');
    $('tab-simulation').classList.add('active');
  }

  // === シミュレーションステップコールバック ===
  function onSimStep(step, isFinished) {
    simDay.textContent = `Day ${step}`;

    // 統計更新
    const stats = PersonaEngine.getStats();
    updateStatsDisplay(stats);

    // チャート更新（毎フレーム）
    refreshCharts();

    if (isFinished) {
      setSimState('done', '完了');
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnGenerate.disabled = false;
    }
  }

  // === 一時停止 ===
  function pauseSimulation() {
    SimulationEngine.pause();
    setSimState('paused', '一時停止');
    btnStart.disabled = false;
    btnPause.disabled = true;
  }

  // === リセット ===
  function resetSimulation() {
    SimulationEngine.stop();
    PersonaEngine.resetStates();

    simDay.textContent = 'Day 0';
    setSimState('idle', '待機中');

    btnStart.disabled = false;
    btnPause.disabled = true;
    btnGenerate.disabled = false;

    const stats = PersonaEngine.getStats();
    updateStatsDisplay(stats);
    refreshCharts();
  }

  // === 統計表示更新 ===
  function updateStatsDisplay(stats) {
    statTotal.textContent = formatPop(stats.totalPopulation);
    statAware.textContent = formatPop(stats.states.A);
    statInterested.textContent = formatPop(stats.states.I);
    statAdopted.textContent = formatPop(stats.states.D);
    statRetired.textContent = formatPop(stats.states.R);
  }

  // === チャート更新 ===
  function refreshCharts() {
    if (!PersonaEngine.isGenerated()) return;

    const stats = PersonaEngine.getStats();
    const history = SimulationEngine.getHistory();
    const totalPop = stats.totalPopulation;

    // 概要タブのチャート
    JapanMap.draw();
    Charts.drawAgeDistribution('chart-age-pop', stats.byAge, 'population');

    // シミュレーションタブのチャート
    if (history.length > 0) {
      Charts.drawTimeSeries('chart-timeseries', history, totalPop);
      Charts.drawTrendLines('chart-trendlines', history, totalPop);
      Charts.drawAgeDistribution('chart-age-adoption', stats.byAge, 'adoption');
      Charts.drawRegionDonut('chart-region', stats.byRegion);
      updateRanking();
    }
  }

  // === ランキング更新 ===
  function updateRanking() {
    const adoption = PersonaEngine.getPrefectureAdoption();
    const prefectures = Demographics.prefectures;

    const ranked = adoption
      .map((a, i) => ({ ...a, name: prefectures[i].name }))
      .sort((a, b) => b.totalEngaged - a.totalEngaged);

    const maxRate = ranked[0] ? ranked[0].totalEngaged : 1;

    rankingList.innerHTML = '';
    ranked.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'ranking-item';

      const barWidth = maxRate > 0 ? (item.totalEngaged / maxRate * 100) : 0;
      const hue = 220 - (item.totalEngaged * 180); // 青→赤

      div.innerHTML = `
        <span class="ranking-rank">${i + 1}</span>
        <span class="ranking-name">${item.name}</span>
        <div class="ranking-bar-bg">
          <div class="ranking-bar" style="width:${barWidth}%; background: hsl(${Math.max(0, hue)}, 80%, 55%)"></div>
        </div>
        <span class="ranking-value">${(item.totalEngaged * 100).toFixed(1)}%</span>
      `;
      rankingList.appendChild(div);
    });
  }

  // === サンプルペルソナ表示 ===
  function showSamplePersonas() {
    const personas = PersonaEngine.samplePersonas(20);
    personaGrid.innerHTML = '';

    personas.forEach(p => {
      const card = document.createElement('div');
      card.className = 'persona-card';
      card.innerHTML = `
        <div class="persona-name">${escapeHtml(p.name)}</div>
        <div class="persona-detail">
          <span>${p.age}歳</span>
          <span>${escapeHtml(p.gender)}</span>
          <span>${escapeHtml(p.prefecture)}</span>
          <span>${escapeHtml(p.occupation)}</span>
          <span>SNS: ${p.snsUsage}</span>
        </div>
      `;
      personaGrid.appendChild(card);
    });
  }

  // === ユーティリティ ===
  function setSimState(stateClass, label) {
    simState.className = `status-badge status-${stateClass}`;
    simState.textContent = label;
  }

  function formatPop(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '億';
    if (n >= 10000000) return (n / 10000).toFixed(0) + '万';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
