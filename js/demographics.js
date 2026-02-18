/**
 * 日本の人口統計データモジュール
 * 国勢調査ベースの統計データを使用して1億人のペルソナコホートを構成
 */
var Demographics = (() => {
  // 47都道府県データ: [名前, 人口(千人), 緯度的位置, 経度的位置, 地方区分, 隣接都道府県インデックス]
  const prefectures = [
    { id: 0,  name: '北海道',   pop: 5224,  region: '北海道', lat: 43.06, lng: 141.35, neighbors: [1] },
    { id: 1,  name: '青森県',   pop: 1238,  region: '東北',   lat: 40.82, lng: 140.74, neighbors: [0, 2, 3] },
    { id: 2,  name: '岩手県',   pop: 1211,  region: '東北',   lat: 39.70, lng: 141.15, neighbors: [1, 3, 4] },
    { id: 3,  name: '宮城県',   pop: 2302,  region: '東北',   lat: 38.27, lng: 140.87, neighbors: [1, 2, 4, 5, 6] },
    { id: 4,  name: '秋田県',   pop: 960,   region: '東北',   lat: 39.72, lng: 140.10, neighbors: [1, 2, 3, 5] },
    { id: 5,  name: '山形県',   pop: 1068,  region: '東北',   lat: 38.24, lng: 140.34, neighbors: [3, 4, 6, 14] },
    { id: 6,  name: '福島県',   pop: 1834,  region: '東北',   lat: 37.75, lng: 140.47, neighbors: [3, 5, 7, 8, 9, 14] },
    { id: 7,  name: '茨城県',   pop: 2860,  region: '関東',   lat: 36.34, lng: 140.45, neighbors: [6, 8, 9, 11] },
    { id: 8,  name: '栃木県',   pop: 1934,  region: '関東',   lat: 36.57, lng: 139.88, neighbors: [6, 7, 9, 10] },
    { id: 9,  name: '群馬県',   pop: 1940,  region: '関東',   lat: 36.39, lng: 139.06, neighbors: [6, 8, 10, 11, 14, 19] },
    { id: 10, name: '埼玉県',   pop: 7345,  region: '関東',   lat: 35.86, lng: 139.65, neighbors: [8, 9, 11, 12, 19] },
    { id: 11, name: '千葉県',   pop: 6284,  region: '関東',   lat: 35.60, lng: 140.12, neighbors: [7, 10, 12] },
    { id: 12, name: '東京都',   pop: 14048, region: '関東',   lat: 35.68, lng: 139.69, neighbors: [10, 11, 13, 19] },
    { id: 13, name: '神奈川県', pop: 9238,  region: '関東',   lat: 35.45, lng: 139.64, neighbors: [12, 21] },
    { id: 14, name: '新潟県',   pop: 2202,  region: '中部',   lat: 37.90, lng: 139.02, neighbors: [5, 6, 9, 15, 19] },
    { id: 15, name: '富山県',   pop: 1035,  region: '中部',   lat: 36.70, lng: 137.21, neighbors: [14, 16, 19, 20] },
    { id: 16, name: '石川県',   pop: 1133,  region: '中部',   lat: 36.59, lng: 136.63, neighbors: [15, 17, 20] },
    { id: 17, name: '福井県',   pop: 767,   region: '中部',   lat: 36.07, lng: 136.22, neighbors: [16, 20, 24, 25] },
    { id: 18, name: '山梨県',   pop: 810,   region: '中部',   lat: 35.66, lng: 138.57, neighbors: [12, 19, 20, 21] },
    { id: 19, name: '長野県',   pop: 2049,  region: '中部',   lat: 36.23, lng: 138.18, neighbors: [9, 10, 14, 15, 18, 20, 21, 22] },
    { id: 20, name: '岐阜県',   pop: 1979,  region: '中部',   lat: 35.39, lng: 136.72, neighbors: [15, 16, 17, 19, 21, 23, 24] },
    { id: 21, name: '静岡県',   pop: 3633,  region: '中部',   lat: 34.98, lng: 138.38, neighbors: [13, 18, 19, 20, 22] },
    { id: 22, name: '愛知県',   pop: 7543,  region: '中部',   lat: 35.18, lng: 136.91, neighbors: [19, 20, 21, 23] },
    { id: 23, name: '三重県',   pop: 1771,  region: '近畿',   lat: 34.73, lng: 136.51, neighbors: [20, 22, 24, 25, 28] },
    { id: 24, name: '滋賀県',   pop: 1414,  region: '近畿',   lat: 35.00, lng: 135.87, neighbors: [17, 20, 23, 25] },
    { id: 25, name: '京都府',   pop: 2578,  region: '近畿',   lat: 35.02, lng: 135.76, neighbors: [17, 23, 24, 26, 27, 28] },
    { id: 26, name: '大阪府',   pop: 8838,  region: '近畿',   lat: 34.69, lng: 135.52, neighbors: [25, 27, 28] },
    { id: 27, name: '兵庫県',   pop: 5465,  region: '近畿',   lat: 34.69, lng: 135.18, neighbors: [25, 26, 29, 30, 32] },
    { id: 28, name: '奈良県',   pop: 1325,  region: '近畿',   lat: 34.69, lng: 135.83, neighbors: [23, 25, 26, 29] },
    { id: 29, name: '和歌山県', pop: 923,   region: '近畿',   lat: 34.23, lng: 135.17, neighbors: [26, 27, 28] },
    { id: 30, name: '鳥取県',   pop: 553,   region: '中国',   lat: 35.50, lng: 134.24, neighbors: [27, 31, 32] },
    { id: 31, name: '島根県',   pop: 671,   region: '中国',   lat: 35.47, lng: 133.05, neighbors: [30, 34] },
    { id: 32, name: '岡山県',   pop: 1890,  region: '中国',   lat: 34.66, lng: 133.93, neighbors: [27, 30, 33, 34] },
    { id: 33, name: '広島県',   pop: 2800,  region: '中国',   lat: 34.40, lng: 132.46, neighbors: [31, 32, 34, 35] },
    { id: 34, name: '山口県',   pop: 1342,  region: '中国',   lat: 34.19, lng: 131.47, neighbors: [31, 33, 39] },
    { id: 35, name: '徳島県',   pop: 720,   region: '四国',   lat: 34.07, lng: 134.56, neighbors: [27, 36, 38] },
    { id: 36, name: '香川県',   pop: 951,   region: '四国',   lat: 34.34, lng: 134.04, neighbors: [32, 35, 37] },
    { id: 37, name: '愛媛県',   pop: 1335,  region: '四国',   lat: 33.84, lng: 132.77, neighbors: [33, 36, 38] },
    { id: 38, name: '高知県',   pop: 692,   region: '四国',   lat: 33.56, lng: 133.53, neighbors: [35, 37] },
    { id: 39, name: '福岡県',   pop: 5135,  region: '九州',   lat: 33.61, lng: 130.42, neighbors: [34, 40, 43] },
    { id: 40, name: '佐賀県',   pop: 812,   region: '九州',   lat: 33.25, lng: 130.30, neighbors: [39, 41] },
    { id: 41, name: '長崎県',   pop: 1312,  region: '九州',   lat: 32.74, lng: 129.87, neighbors: [40] },
    { id: 42, name: '熊本県',   pop: 1739,  region: '九州',   lat: 32.79, lng: 130.74, neighbors: [39, 40, 43, 44, 45] },
    { id: 43, name: '大分県',   pop: 1124,  region: '九州',   lat: 33.24, lng: 131.61, neighbors: [39, 42, 44] },
    { id: 44, name: '宮崎県',   pop: 1070,  region: '九州',   lat: 31.91, lng: 131.42, neighbors: [42, 43, 45] },
    { id: 45, name: '鹿児島県', pop: 1589,  region: '九州',   lat: 31.56, lng: 130.56, neighbors: [42, 44, 46] },
    { id: 46, name: '沖縄県',   pop: 1468,  region: '沖縄',   lat: 26.34, lng: 127.80, neighbors: [45] },
  ];

  // 年齢グループ: [ラベル, 人口比率(%), SNS利用率, 流行感度, メディア接触率]
  const ageGroups = [
    { id: 0, label: '0-9歳',   ratio: 7.7,  sns: 0.05, trendSensitivity: 0.1,  mediaExposure: 0.2 },
    { id: 1, label: '10-19歳', ratio: 8.8,  sns: 0.75, trendSensitivity: 0.95, mediaExposure: 0.7 },
    { id: 2, label: '20-29歳', ratio: 9.8,  sns: 0.90, trendSensitivity: 0.90, mediaExposure: 0.85 },
    { id: 3, label: '30-39歳', ratio: 11.0, sns: 0.82, trendSensitivity: 0.70, mediaExposure: 0.80 },
    { id: 4, label: '40-49歳', ratio: 14.5, sns: 0.70, trendSensitivity: 0.50, mediaExposure: 0.75 },
    { id: 5, label: '50-59歳', ratio: 13.2, sns: 0.50, trendSensitivity: 0.35, mediaExposure: 0.70 },
    { id: 6, label: '60-69歳', ratio: 13.0, sns: 0.30, trendSensitivity: 0.20, mediaExposure: 0.65 },
    { id: 7, label: '70-79歳', ratio: 12.5, sns: 0.15, trendSensitivity: 0.10, mediaExposure: 0.50 },
    { id: 8, label: '80歳以上', ratio: 9.5,  sns: 0.05, trendSensitivity: 0.05, mediaExposure: 0.35 },
  ];

  // 性別データ
  const genders = [
    { id: 0, label: '男性', ratio: 48.7, trendModifier: 0.85 },
    { id: 1, label: '女性', ratio: 51.3, trendModifier: 1.15 },
  ];

  // 地方の都市化率 (流行伝播速度に影響)
  const regionUrbanization = {
    '北海道': 0.70,
    '東北':   0.55,
    '関東':   0.92,
    '中部':   0.72,
    '近畿':   0.88,
    '中国':   0.65,
    '四国':   0.55,
    '九州':   0.65,
    '沖縄':   0.60,
  };

  // 職業カテゴリと年齢別分布
  const occupations = [
    { label: '学生',       ageRange: [0, 2], trendFactor: 1.3 },
    { label: '会社員',     ageRange: [2, 6], trendFactor: 0.8 },
    { label: '自営業',     ageRange: [3, 7], trendFactor: 0.7 },
    { label: '公務員',     ageRange: [2, 6], trendFactor: 0.5 },
    { label: 'フリーランス', ageRange: [2, 5], trendFactor: 1.1 },
    { label: '主婦/主夫',   ageRange: [3, 7], trendFactor: 0.9 },
    { label: '無職/退職',   ageRange: [6, 8], trendFactor: 0.3 },
  ];

  // 流行カテゴリプリセット
  const trendPresets = [
    {
      name: 'SNSバズ (TikTok発)',
      description: 'TikTokから始まる若者中心のバイラルトレンド',
      params: {
        mediaInfluence: 0.3,
        snsSpread: 0.8,
        wordOfMouth: 0.4,
        ageAffinity: [0.1, 0.95, 0.85, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01],
        geographicSpread: 0.9,
        decayRate: 0.15,
        startPrefecture: 12, // 東京
      }
    },
    {
      name: 'テレビ発の流行',
      description: 'テレビ番組きっかけで全年齢層に広がる流行',
      params: {
        mediaInfluence: 0.9,
        snsSpread: 0.4,
        wordOfMouth: 0.6,
        ageAffinity: [0.3, 0.6, 0.7, 0.8, 0.8, 0.7, 0.7, 0.5, 0.3],
        geographicSpread: 0.7,
        decayRate: 0.08,
        startPrefecture: 12,
      }
    },
    {
      name: 'ご当地グルメブーム',
      description: '地方発のグルメが全国に広がるパターン',
      params: {
        mediaInfluence: 0.5,
        snsSpread: 0.6,
        wordOfMouth: 0.8,
        ageAffinity: [0.1, 0.5, 0.7, 0.8, 0.7, 0.6, 0.5, 0.3, 0.2],
        geographicSpread: 0.4,
        decayRate: 0.05,
        startPrefecture: 26, // 大阪
      }
    },
    {
      name: 'ファッショントレンド',
      description: '都市部から広がるファッションの流行',
      params: {
        mediaInfluence: 0.6,
        snsSpread: 0.7,
        wordOfMouth: 0.5,
        ageAffinity: [0.05, 0.8, 0.9, 0.6, 0.3, 0.1, 0.05, 0.02, 0.01],
        geographicSpread: 0.5,
        decayRate: 0.10,
        startPrefecture: 12,
      }
    },
    {
      name: '健康ブーム',
      description: '健康番組やSNSで広がる健康法・食品ブーム',
      params: {
        mediaInfluence: 0.7,
        snsSpread: 0.5,
        wordOfMouth: 0.7,
        ageAffinity: [0.05, 0.2, 0.4, 0.5, 0.7, 0.8, 0.8, 0.6, 0.4],
        geographicSpread: 0.6,
        decayRate: 0.04,
        startPrefecture: 12,
      }
    },
    {
      name: 'ゲーム・アニメブーム',
      description: '新作ゲームやアニメの社会現象化',
      params: {
        mediaInfluence: 0.5,
        snsSpread: 0.85,
        wordOfMouth: 0.7,
        ageAffinity: [0.3, 0.9, 0.85, 0.6, 0.4, 0.2, 0.1, 0.05, 0.02],
        geographicSpread: 0.85,
        decayRate: 0.07,
        startPrefecture: 12,
      }
    },
  ];

  // 総人口を計算
  const totalPopulation = prefectures.reduce((sum, p) => sum + p.pop, 0) * 1000;

  return {
    prefectures,
    ageGroups,
    genders,
    regionUrbanization,
    occupations,
    trendPresets,
    totalPopulation,

    getPrefecture(id) {
      return prefectures[id];
    },

    getRegionPrefectures(region) {
      return prefectures.filter(p => p.region === region);
    },

    getUrbanizationRate(prefId) {
      return regionUrbanization[prefectures[prefId].region] || 0.5;
    },
  };
})();
