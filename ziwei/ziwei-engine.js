/**
 * 紫微斗数排盘引擎 v1.0
 * 基于 iztro@2.5.8 + 倪海厦《天纪》体系
 * 纯浏览器 JavaScript，零 npm 依赖
 * 
 * CDN 依赖：<script src="https://cdn.jsdelivr.net/npm/iztro@2.5.8/dist/iztro.min.js"></script>
 * 暴露全局：window.Ziwei
 */
(function() {
  'use strict';

  if (typeof iztro === 'undefined') {
    console.error('[Ziwei] iztro 未加载。请先引入：<script src="https://cdn.jsdelivr.net/npm/iztro@2.5.8/dist/iztro.min.js"></script>');
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // 一、常量表（来自 constants.ts）
  // ══════════════════════════════════════════════════════════════

  var STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  var SHICHEN = [
    { branch: 0,  name: '子时', range: '23:00-01:00' },
    { branch: 1,  name: '丑时', range: '01:00-03:00' },
    { branch: 2,  name: '寅时', range: '03:00-05:00' },
    { branch: 3,  name: '卯时', range: '05:00-07:00' },
    { branch: 4,  name: '辰时', range: '07:00-09:00' },
    { branch: 5,  name: '巳时', range: '09:00-11:00' },
    { branch: 6,  name: '午时', range: '11:00-13:00' },
    { branch: 7,  name: '未时', range: '13:00-15:00' },
    { branch: 8,  name: '申时', range: '15:00-17:00' },
    { branch: 9,  name: '酉时', range: '17:00-19:00' },
    { branch: 10, name: '戌时', range: '19:00-21:00' },
    { branch: 11, name: '亥时', range: '21:00-23:00' }
  ];

  var PALACE_NAMES_ORDER = [
    '命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫',
    '迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫'
  ];

  var SI_HUA_TABLE = {
    0: ['廉贞','破军','武曲','太阳'],   // 甲
    1: ['天机','天梁','紫微','太阴'],   // 乙
    2: ['天同','天机','文昌','廉贞'],   // 丙
    3: ['太阴','天同','天机','巨门'],   // 丁
    4: ['贪狼','太阴','右弼','天机'],   // 戊
    5: ['武曲','贪狼','天梁','文曲'],   // 己
    6: ['太阳','武曲','太阴','天同'],   // 庚
    7: ['巨门','太阳','文曲','文昌'],   // 辛
    8: ['天梁','紫微','左辅','武曲'],   // 壬
    9: ['破军','巨门','太阴','贪狼']    // 癸
  };

  var STAR_DESCRIPTIONS = {
    '紫微': { keywords: '帝王·尊贵·独立', nature: '中性偏吉', element: '土' },
    '天机': { keywords: '智慧·机变·谋略', nature: '吉星', element: '木' },
    '太阳': { keywords: '阳刚·官贵·慷慨', nature: '吉星', element: '火' },
    '武曲': { keywords: '财富·刚毅·果断', nature: '中性', element: '金' },
    '天同': { keywords: '温和·享福·随缘', nature: '吉星', element: '水' },
    '廉贞': { keywords: '才艺·刑囚·桃花', nature: '凶中带吉', element: '火' },
    '天府': { keywords: '财库·稳重·保守', nature: '吉星', element: '土' },
    '太阴': { keywords: '柔美·财富·阴柔', nature: '吉星', element: '水' },
    '贪狼': { keywords: '欲望·桃花·多才', nature: '中性', element: '木' },
    '巨门': { keywords: '口舌·是非·善辩', nature: '凶中带吉', element: '水' },
    '天相': { keywords: '辅佐·行政·印绶', nature: '吉星', element: '水' },
    '天梁': { keywords: '荫护·医药·长辈', nature: '吉星', element: '土' },
    '七杀': { keywords: '将星·果决·孤克', nature: '凶星', element: '金' },
    '破军': { keywords: '开创·变动·破坏', nature: '凶星', element: '水' }
  };

  var SHA_STARS_SET = {};
  ['擎羊','陀罗','火星','铃星','地空','地劫','天空','旬空','截路','大耗','天使','天伤']
    .forEach(function(s) { SHA_STARS_SET[s] = true; });

  var LUCKY_STARS_SET = {};
  ['文昌','文曲','左辅','右弼','天魁','天钺','禄存','天马','天官','天福','天才','天寿',
   '三台','八座','恩光','天贵','台辅','龙池','凤阁','红鸾','天喜','孤辰','寡宿']
    .forEach(function(s) { LUCKY_STARS_SET[s] = true; });

  // ══════════════════════════════════════════════════════════════
  // 二、辅助函数
  // ══════════════════════════════════════════════════════════════

  function mapBrightness(b) {
    if (!b) return 'normal';
    if (b === '庙' || b === '旺') return 'bright';
    if (b === '陷' || b === '不') return 'dim';
    return 'normal';
  }

  function mapStarType(starName, iztroType) {
    if (SHA_STARS_SET[starName]) return 'sha';
    if (LUCKY_STARS_SET[starName]) return 'lucky';
    var t = (iztroType || '').toLowerCase();
    if (t === '主星' || t === 'major') return 'major';
    if (t === '煞星' || t === 'tough') return 'sha';
    if (t === '吉星' || t === 'soft' || t === '禄存' || t === '天马') return 'lucky';
    return 'minor';
  }

  function parseWuxingJu(name) {
    if (!name) return 3;
    if (name.indexOf('二') !== -1) return 2;
    if (name.indexOf('三') !== -1) return 3;
    if (name.indexOf('四') !== -1) return 4;
    if (name.indexOf('五') !== -1) return 5;
    if (name.indexOf('六') !== -1) return 6;
    return 3;
  }

  function getYearStemIndex(year) {
    return ((year - 4) % 10 + 10) % 10;
  }

  function getYearBranchIndex(year) {
    return ((year - 4) % 12 + 12) % 12;
  }

  function hourToShiChen(hour) {
    if (hour === 23 || hour === 0) return 0;
    return Math.floor((hour + 1) / 2);
  }

  // ══════════════════════════════════════════════════════════════
  // 三、四化系统（来自 sihua.ts）
  // ══════════════════════════════════════════════════════════════

  function getSiHuaByStem(stemIndex) {
    var arr = SI_HUA_TABLE[stemIndex];
    if (!arr) return { '禄':'', '权':'', '科':'', '忌':'' };
    return { '禄': arr[0], '权': arr[1], '科': arr[2], '忌': arr[3] };
  }

  function buildStarSiHuaMap(stemIndex) {
    var arr = SI_HUA_TABLE[stemIndex];
    if (!arr) return {};
    var map = {};
    map[arr[0]] = '禄';
    map[arr[1]] = '权';
    map[arr[2]] = '科';
    map[arr[3]] = '忌';
    return map;
  }

  function getDaXianSiHua(chart, dxIndex) {
    var dx = chart.daXians[dxIndex];
    if (!dx) return null;
    var dxPalace = null;
    for (var i = 0; i < chart.palaces.length; i++) {
      if (chart.palaces[i].branch === dx.palaceBranch) { dxPalace = chart.palaces[i]; break; }
    }
    if (!dxPalace) return null;
    var stemIndex = dxPalace.stem;
    return {
      stemIndex: stemIndex,
      stemName: STEMS[stemIndex] || '',
      transforms: getSiHuaByStem(stemIndex)
    };
  }

  function getLiuNianSiHua(year) {
    var stemIndex = getYearStemIndex(year);
    return {
      stemIndex: stemIndex,
      stemName: STEMS[stemIndex] || '',
      transforms: getSiHuaByStem(stemIndex)
    };
  }

  // 五虎遁：月柱天干
  var WU_HU_DUN = { 0:2, 5:2, 1:4, 6:4, 2:6, 7:6, 3:8, 8:8, 4:0, 9:0 };

  function getLiuYueStemIndex(yearStem, month) {
    var yinStem = WU_HU_DUN[yearStem] != null ? WU_HU_DUN[yearStem] : 0;
    return (yinStem + ((month - 1) % 12) + 10) % 10;
  }

  function getLiuYueSiHua(yearStem, month) {
    var stemIndex = getLiuYueStemIndex(yearStem, month);
    return {
      stemIndex: stemIndex,
      stemName: STEMS[stemIndex] || '',
      transforms: getSiHuaByStem(stemIndex)
    };
  }

  function detectSelfSihua(palace) {
    var transforms = getSiHuaByStem(palace.stem);
    var found = [];
    var starNames = {};
    for (var i = 0; i < palace.stars.length; i++) {
      starNames[palace.stars[i].name] = true;
    }
    ['禄','权','科','忌'].forEach(function(sh) {
      var starName = transforms[sh];
      if (starName && starNames[starName]) {
        found.push({ siHua: sh, starName: starName });
      }
    });
    return found;
  }

  // ══════════════════════════════════════════════════════════════
  // 四、主排盘函数（来自 algorithm.ts）
  // ══════════════════════════════════════════════════════════════

  /**
   * 生成紫微斗数命盘
   * @param {Object} opts
   * @param {number} opts.year   - 公历年
   * @param {number} opts.month  - 公历月 (1-12)
   * @param {number} opts.day    - 公历日
   * @param {number} opts.hour   - 时辰地支索引 (0=子, 1=丑...11=亥)。传 -1 则自动由公历小时推算
   * @param {string} opts.gender - 'male' | 'female'
   * @param {number} [opts.birthHour] - 公历小时 (0-23)，当 opts.hour=-1 时用于自动推算时辰
   * @returns {Object} ZiweiChart
   */
  function generateChart(opts) {
    var year = opts.year, month = opts.month, day = opts.day;
    var hour = opts.hour;
    var gender = opts.gender;

    // 自动推算时辰
    if (hour === -1 && opts.birthHour != null) {
      hour = hourToShiChen(opts.birthHour);
    }
    if (hour == null || hour < 0 || hour > 11) {
      throw new Error('时辰无效：' + hour + '。请传入 birthHour (0-23) 或 hour (0-11)');
    }

    var solarDate = year + '-' + month + '-' + day;
    var iztroGender = gender === 'male' ? '男' : '女';

    // 调用 iztro 核心排盘
    var astrolabe = iztro.astro.bySolar(solarDate, hour, iztroGender, true, 'zh-CN');

    // 组装十二宫
    var palaces = astrolabe.palaces.map(function(p) {
      var branch = BRANCHES.indexOf(p.earthlyBranch);
      var stem = STEMS.indexOf(p.heavenlyStem);

      var allStars = [];

      // 主星
      (p.majorStars || []).forEach(function(s) {
        allStars.push({
          name: s.name,
          type: 'major',
          brightness: mapBrightness(s.brightness),
          siHua: s.mutagen || undefined
        });
      });

      // 辅星
      (p.minorStars || []).forEach(function(s) {
        allStars.push({
          name: s.name,
          type: mapStarType(s.name, s.type),
          siHua: s.mutagen || undefined
        });
      });

      // 杂耀
      (p.adjectiveStars || []).forEach(function(s) {
        allStars.push({
          name: s.name,
          type: 'minor',
          siHua: s.mutagen || undefined
        });
      });

      var range = p.decadal ? p.decadal.range : null;

      return {
        branch: branch >= 0 ? branch : 0,
        stem: stem >= 0 ? stem : 0,
        name: p.name || '',
        stars: allStars,
        daXianAge: range ? [range[0], range[1]] : undefined,
        isMingGong: p.name === '命宫',
        isShenGong: p.isBodyPalace || false,
        isCurrentDaXian: false
      };
    });

    // 当前年龄 & 大限
    var currentYear = new Date().getFullYear();
    var currentAge = currentYear - year;

    palaces.forEach(function(p) {
      if (p.daXianAge && currentAge >= p.daXianAge[0] && currentAge <= p.daXianAge[1]) {
        p.isCurrentDaXian = true;
      }
    });

    // 借对宫结构化字段
    palaces.forEach(function(p) {
      p.oppositeBranch = (p.branch + 6) % 12;
      var mainStars = p.stars.filter(function(s) { return s.type === 'major'; });
      p.isEmpty = mainStars.length === 0;
      if (p.isEmpty) {
        var oppPalace = null;
        for (var i = 0; i < palaces.length; i++) {
          if (palaces[i].branch === p.oppositeBranch) { oppPalace = palaces[i]; break; }
        }
        if (oppPalace) {
          p.borrowedFromBranch = oppPalace.branch;
          p.borrowedFromName = oppPalace.name;
          p.borrowedStars = oppPalace.stars
            .filter(function(s) { return s.type === 'major'; })
            .map(function(s) { return s.name; });
        }
      }
    });

    // 命宫、身宫、五行局
    var mingGongBranch = BRANCHES.indexOf(astrolabe.earthlyBranchOfSoulPalace);
    var shenGongBranch = BRANCHES.indexOf(astrolabe.earthlyBranchOfBodyPalace);
    var wuxingJuName = astrolabe.fiveElementsClass || '';
    var wuxingJu = parseWuxingJu(wuxingJuName);

    // 紫微位置
    var ziweiPalace = null;
    for (var i = 0; i < palaces.length; i++) {
      for (var j = 0; j < palaces[i].stars.length; j++) {
        if (palaces[i].stars[j].name === '紫微' && palaces[i].stars[j].type === 'major') {
          ziweiPalace = palaces[i];
          break;
        }
      }
      if (ziweiPalace) break;
    }
    var ziweiPos = ziweiPalace ? ziweiPalace.branch : 0;

    // 大限数组
    var daXians = palaces
      .filter(function(p) { return p.daXianAge; })
      .sort(function(a, b) { return a.daXianAge[0] - b.daXianAge[0]; })
      .map(function(p) {
        return {
          startAge: p.daXianAge[0],
          endAge: p.daXianAge[1],
          palaceBranch: p.branch,
          palaceName: p.name
        };
      });

    var currentDaXianIndex = -1;
    for (var k = 0; k < daXians.length; k++) {
      if (currentAge >= daXians[k].startAge && currentAge <= daXians[k].endAge) {
        currentDaXianIndex = k;
        break;
      }
    }

    // 农历信息（简化版：年柱干支由公式推算）
    var yearStem = getYearStemIndex(year);
    var yearBranch = getYearBranchIndex(year);

    return {
      birthInfo: opts,
      lunarInfo: {
        lunarYear: year,
        lunarMonth: month,
        lunarDay: day,
        yearStem: yearStem,
        yearBranch: yearBranch,
        isLeapMonth: false,
        _note: '农历月日为公历近似值，精确转换需加载农历库'
      },
      mingGongBranch: mingGongBranch >= 0 ? mingGongBranch : 0,
      shenGongBranch: shenGongBranch >= 0 ? shenGongBranch : 0,
      wuxingJu: wuxingJu,
      wuxingJuName: wuxingJuName,
      ziweiPos: ziweiPos,
      palaces: palaces,
      daXians: daXians,
      currentAge: currentAge,
      currentDaXianIndex: currentDaXianIndex
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 五、导出全局命名空间
  // ══════════════════════════════════════════════════════════════

  window.Ziwei = {
    // 常量
    STEMS: STEMS,
    BRANCHES: BRANCHES,
    SHICHEN: SHICHEN,
    PALACE_NAMES_ORDER: PALACE_NAMES_ORDER,
    SI_HUA_TABLE: SI_HUA_TABLE,
    STAR_DESCRIPTIONS: STAR_DESCRIPTIONS,

    // 核心函数
    generateChart: generateChart,
    hourToShiChen: hourToShiChen,
    getYearStemIndex: getYearStemIndex,
    getYearBranchIndex: getYearBranchIndex,

    // 四化
    getSiHuaByStem: getSiHuaByStem,
    buildStarSiHuaMap: buildStarSiHuaMap,
    getDaXianSiHua: getDaXianSiHua,
    getLiuNianSiHua: getLiuNianSiHua,
    getLiuYueStemIndex: getLiuYueStemIndex,
    getLiuYueSiHua: getLiuYueSiHua,
    detectSelfSihua: detectSelfSihua
  };

  console.log('[Ziwei] 紫微斗数排盘引擎已就绪 v1.0');
  console.log('[Ziwei] 用法: Ziwei.generateChart({ year:1990, month:5, day:15, hour:-1, birthHour:9, gender:"male" })');
})();
