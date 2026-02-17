/**
 * ペルソナ生成エンジン
 * 1億人の日本人ペルソナをコホート（集団）として統計的に生成・管理
 */
const PersonaEngine = (() => {
  let cohorts = [];
  let generated = false;
  const TARGET_POPULATION = 100_000_000; // 1億人

  /**
   * コホートを生成
   * 47都道府県 × 9年齢層 × 2性別 = 846コホート
   */
  function generate() {
    cohorts = [];
    const { prefectures, ageGroups, genders } = Demographics;

    // 都道府県人口の合計（千人単位）
    const totalPrefPop = prefectures.reduce((s, p) => s + p.pop, 0);

    for (const pref of prefectures) {
      const prefRatio = pref.pop / totalPrefPop;

      for (const age of ageGroups) {
        for (const gender of genders) {
          // このコホートの人口 = 1億 × 都道府県比率 × 年齢比率 × 性別比率
          const population = Math.round(
            TARGET_POPULATION * prefRatio * (age.ratio / 100) * (gender.ratio / 100)
          );

          const urbanRate = Demographics.getUrbanizationRate(pref.id);

          cohorts.push({
            id: `${pref.id}-${age.id}-${gender.id}`,
            prefectureId: pref.id,
            prefectureName: pref.name,
            region: pref.region,
            ageGroupId: age.id,
            ageLabel: age.label,
            genderId: gender.id,
            genderLabel: gender.label,
            population,
            // 流行パラメータ
            snsUsage: age.sns * (urbanRate * 0.3 + 0.7),
            trendSensitivity: age.trendSensitivity * gender.trendModifier * (urbanRate * 0.4 + 0.6),
            mediaExposure: age.mediaExposure,
            urbanRate,
            // シミュレーション状態 (SAIDR)
            states: {
              S: population,  // 未認知 (Susceptible)
              A: 0,           // 認知 (Aware)
              I: 0,           // 関心 (Interested)
              D: 0,           // 採用 (aDopter)
              R: 0,           // 離脱 (Retired)
            },
          });
        }
      }
    }

    generated = true;
    return getStats();
  }

  /**
   * シミュレーション状態をリセット
   */
  function resetStates() {
    for (const c of cohorts) {
      c.states = { S: c.population, A: 0, I: 0, D: 0, R: 0 };
    }
  }

  /**
   * 全体統計を取得
   */
  function getStats() {
    const stats = {
      totalPopulation: 0,
      totalCohorts: cohorts.length,
      byPrefecture: {},
      byAge: {},
      byGender: {},
      byRegion: {},
      states: { S: 0, A: 0, I: 0, D: 0, R: 0 },
    };

    for (const c of cohorts) {
      stats.totalPopulation += c.population;

      // 都道府県別
      if (!stats.byPrefecture[c.prefectureId]) {
        stats.byPrefecture[c.prefectureId] = { name: c.prefectureName, population: 0, states: { S: 0, A: 0, I: 0, D: 0, R: 0 } };
      }
      stats.byPrefecture[c.prefectureId].population += c.population;
      for (const s of ['S', 'A', 'I', 'D', 'R']) {
        stats.byPrefecture[c.prefectureId].states[s] += c.states[s];
      }

      // 年齢別
      if (!stats.byAge[c.ageGroupId]) {
        stats.byAge[c.ageGroupId] = { label: c.ageLabel, population: 0, states: { S: 0, A: 0, I: 0, D: 0, R: 0 } };
      }
      stats.byAge[c.ageGroupId].population += c.population;
      for (const s of ['S', 'A', 'I', 'D', 'R']) {
        stats.byAge[c.ageGroupId].states[s] += c.states[s];
      }

      // 性別
      if (!stats.byGender[c.genderId]) {
        stats.byGender[c.genderId] = { label: c.genderLabel, population: 0, states: { S: 0, A: 0, I: 0, D: 0, R: 0 } };
      }
      stats.byGender[c.genderId].population += c.population;
      for (const s of ['S', 'A', 'I', 'D', 'R']) {
        stats.byGender[c.genderId].states[s] += c.states[s];
      }

      // 地方別
      if (!stats.byRegion[c.region]) {
        stats.byRegion[c.region] = { population: 0, states: { S: 0, A: 0, I: 0, D: 0, R: 0 } };
      }
      stats.byRegion[c.region].population += c.population;
      for (const s of ['S', 'A', 'I', 'D', 'R']) {
        stats.byRegion[c.region].states[s] += c.states[s];
      }

      // 全体状態
      for (const s of ['S', 'A', 'I', 'D', 'R']) {
        stats.states[s] += c.states[s];
      }
    }

    return stats;
  }

  /**
   * 都道府県別の流行浸透率を取得
   */
  function getPrefectureAdoption() {
    const result = [];
    const prefMap = {};

    for (const c of cohorts) {
      if (!prefMap[c.prefectureId]) {
        prefMap[c.prefectureId] = { pop: 0, adopted: 0, interested: 0, aware: 0 };
      }
      prefMap[c.prefectureId].pop += c.population;
      prefMap[c.prefectureId].adopted += c.states.D;
      prefMap[c.prefectureId].interested += c.states.I;
      prefMap[c.prefectureId].aware += c.states.A;
    }

    for (let i = 0; i < 47; i++) {
      const d = prefMap[i] || { pop: 1, adopted: 0, interested: 0, aware: 0 };
      result.push({
        id: i,
        adoptionRate: d.adopted / d.pop,
        interestRate: d.interested / d.pop,
        awarenessRate: d.aware / d.pop,
        totalEngaged: (d.adopted + d.interested + d.aware) / d.pop,
      });
    }

    return result;
  }

  /**
   * サンプルペルソナを生成（表示用）
   */
  function samplePersonas(count = 10) {
    const { prefectures, ageGroups, genders, occupations } = Demographics;
    const personas = [];
    const lastNames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤',
      '吉田', '山田', '佐々木', '松本', '井上', '木村', '林', '斎藤', '清水', '山口',
      '森', '池田', '橋本', '阿部', '石川', '前田', '藤田', '小川', '岡田', '後藤'];
    const maleNames = ['太郎', '一郎', '健太', '大輝', '翔太', '拓海', '蓮', '悠斗', '陽翔', '颯太',
      '大和', '隼人', '翼', '直樹', '誠', '剛', '浩二', '正義', '和夫', '清'];
    const femaleNames = ['花子', '陽菜', '結衣', '美咲', '凛', '葵', '楓', '莉子', '彩花', '心春',
      'さくら', '愛', '真由美', '恵子', '京子', '洋子', '節子', '幸子', '智子', '美穂'];

    for (let i = 0; i < count; i++) {
      const prefIdx = Math.floor(Math.random() * prefectures.length);
      const ageIdx = weightedRandom(ageGroups.map(a => a.ratio));
      const genderIdx = Math.random() < 0.487 ? 0 : 1;

      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const firstName = genderIdx === 0
        ? maleNames[Math.floor(Math.random() * maleNames.length)]
        : femaleNames[Math.floor(Math.random() * femaleNames.length)];

      // 年齢グループ内のランダムな年齢
      const ageBase = ageIdx * 10;
      const age = ageIdx === 8
        ? 80 + Math.floor(Math.random() * 20)
        : ageBase + Math.floor(Math.random() * 10);

      // 職業の決定
      const validOccs = occupations.filter(o => ageIdx >= o.ageRange[0] && ageIdx <= o.ageRange[1]);
      const occ = validOccs.length > 0
        ? validOccs[Math.floor(Math.random() * validOccs.length)]
        : occupations[occupations.length - 1];

      personas.push({
        name: `${lastName} ${firstName}`,
        age,
        gender: genders[genderIdx].label,
        prefecture: prefectures[prefIdx].name,
        occupation: occ.label,
        snsUsage: ageGroups[ageIdx].sns > Math.random() ? 'あり' : 'なし',
      });
    }

    return personas;
  }

  function weightedRandom(weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  return {
    generate,
    resetStates,
    getStats,
    getPrefectureAdoption,
    samplePersonas,
    getCohorts: () => cohorts,
    isGenerated: () => generated,
    TARGET_POPULATION,
  };
})();
