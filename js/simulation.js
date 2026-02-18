/**
 * 流行シミュレーションエンジン
 * SAIDRモデル: Susceptible → Aware → Interested → aDopter → Retired
 */
const SimulationEngine = (() => {
  let running = false;
  let paused = false;
  let step = 0;
  let history = [];
  let params = {};
  let animationId = null;
  let onStepCallback = null;
  let speed = 1; // 1ステップ = 1日

  const DEFAULT_PARAMS = {
    mediaInfluence: 0.5,    // メディア露出の影響力 (0-1)
    snsSpread: 0.5,         // SNS拡散力 (0-1)
    wordOfMouth: 0.5,       // 口コミ伝播力 (0-1)
    geographicSpread: 0.5,  // 地理的伝播速度 (0-1)
    decayRate: 0.08,        // 飽き率 (D→R の確率)
    initialSeed: 1000,      // 初期認知人数
    startPrefecture: 12,    // 発生地点 (東京=12)
    ageAffinity: [0.3, 0.8, 0.9, 0.7, 0.5, 0.4, 0.3, 0.2, 0.1], // 年齢別親和性
    maxSteps: 180,          // 最大シミュレーション日数
  };

  /**
   * シミュレーション初期化
   */
  function init(customParams = {}) {
    params = { ...DEFAULT_PARAMS, ...customParams };
    step = 0;
    history = [];
    running = false;
    paused = false;

    // ペルソナ状態リセット
    PersonaEngine.resetStates();

    // 初期感染（認知）を設定
    seedInitialAwareness();

    // 初期状態を記録
    recordHistory();
  }

  /**
   * 初期認知者を設定
   */
  function seedInitialAwareness() {
    const cohorts = PersonaEngine.getCohorts();
    const startPref = params.startPrefecture;
    let remaining = params.initialSeed;

    // 開始都道府県のコホートを感度順にソート
    const prefCohorts = cohorts
      .filter(c => c.prefectureId === startPref)
      .sort((a, b) => b.trendSensitivity - a.trendSensitivity);

    for (const cohort of prefCohorts) {
      if (remaining <= 0) break;
      const toAware = Math.min(remaining, Math.floor(cohort.population * 0.01));
      cohort.states.S -= toAware;
      cohort.states.A += toAware;
      remaining -= toAware;
    }
  }

  /**
   * 1ステップ（1日）を実行
   */
  function executeStep() {
    const cohorts = PersonaEngine.getCohorts();
    const prefectures = Demographics.prefectures;

    // 都道府県別の現在の認知率を計算（地理的伝播用）
    const prefAdoption = PersonaEngine.getPrefectureAdoption();

    for (const cohort of cohorts) {
      const { states, population } = cohort;
      if (population === 0) continue;

      const ageAffinity = params.ageAffinity[cohort.ageGroupId] || 0.5;
      const pref = prefectures[cohort.prefectureId];

      // 隣接都道府県からの影響
      let neighborInfluence = 0;
      for (const nId of pref.neighbors) {
        neighborInfluence += prefAdoption[nId].totalEngaged;
      }
      neighborInfluence = pref.neighbors.length > 0
        ? neighborInfluence / pref.neighbors.length
        : 0;

      // 自県の認知率
      const selfAdoption = prefAdoption[cohort.prefectureId].totalEngaged;

      // === 遷移確率の計算 ===

      // S → A (未認知 → 認知): メディア + SNS + 口コミ + 地理的伝播
      const mediaForce = params.mediaInfluence * cohort.mediaExposure * 0.02;
      const snsForce = params.snsSpread * cohort.snsUsage * selfAdoption * 0.15;
      const womForce = params.wordOfMouth * selfAdoption * 0.08;
      const geoForce = params.geographicSpread * neighborInfluence * 0.05;
      const sToA = Math.min(0.15, (mediaForce + snsForce + womForce + geoForce) * ageAffinity);

      // A → I (認知 → 関心): 感度 + 社会的圧力
      const socialPressure = selfAdoption * 0.3;
      const aToI = Math.min(0.2, cohort.trendSensitivity * 0.08 + socialPressure * ageAffinity);

      // I → D (関心 → 採用): 強い関心からの転換
      const iToD = Math.min(0.15, cohort.trendSensitivity * 0.06 * ageAffinity);

      // D → R (採用 → 離脱): 飽き
      const dToR = params.decayRate * 0.02 * (1 + step * 0.005);

      // A → S (認知 → 忘却): 再び忘れる
      const aToS = 0.01 * (1 - ageAffinity);

      // === 状態遷移を実行 ===
      const newA = Math.floor(states.S * sToA);
      const newI = Math.floor(states.A * aToI);
      const newD = Math.floor(states.I * iToD);
      const newR = Math.floor(states.D * dToR);
      const backS = Math.floor(states.A * aToS);

      states.S = Math.max(0, states.S - newA + backS);
      states.A = Math.max(0, states.A + newA - newI - backS);
      states.I = Math.max(0, states.I + newI - newD);
      states.D = Math.max(0, states.D + newD - newR);
      states.R = Math.max(0, states.R + newR);

      // 端数誤差の修正（人口保存）
      const total = states.S + states.A + states.I + states.D + states.R;
      if (total !== population) {
        states.S += (population - total);
      }
    }

    step++;
    recordHistory();
  }

  /**
   * 履歴を記録
   */
  function recordHistory() {
    const stats = PersonaEngine.getStats();
    history.push({
      step,
      day: step,
      states: { ...stats.states },
      byPrefecture: { ...stats.byPrefecture },
      byAge: { ...stats.byAge },
      byGender: { ...stats.byGender },
      byRegion: { ...stats.byRegion },
    });
  }

  /**
   * アニメーション実行
   */
  function run(callback, stepsPerFrame = 1) {
    if (running && !paused) return;
    running = true;
    paused = false;
    onStepCallback = callback;

    function frame() {
      if (!running || paused) return;

      for (let i = 0; i < stepsPerFrame; i++) {
        if (step >= params.maxSteps) {
          running = false;
          if (onStepCallback) onStepCallback(step, true);
          return;
        }
        executeStep();
      }

      if (onStepCallback) onStepCallback(step, false);
      animationId = requestAnimationFrame(frame);
    }

    animationId = requestAnimationFrame(frame);
  }

  /**
   * 一時停止
   */
  function pause() {
    paused = true;
    if (animationId) cancelAnimationFrame(animationId);
  }

  /**
   * 停止
   */
  function stop() {
    running = false;
    paused = false;
    if (animationId) cancelAnimationFrame(animationId);
  }

  /**
   * 一括実行（アニメーションなし）
   */
  function runAll() {
    while (step < params.maxSteps) {
      executeStep();
    }
    return history;
  }

  return {
    init,
    run,
    pause,
    stop,
    runAll,
    executeStep,
    getHistory: () => history,
    getStep: () => step,
    getParams: () => params,
    isRunning: () => running,
    isPaused: () => paused,
    DEFAULT_PARAMS,
  };
})();
