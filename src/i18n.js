const translations = {
  en: {
    locating: 'Locating…', timeline: 'TIMELINE', tidalLock: 'TIDAL LOCK', satellite: 'SATELLITE', today: 'TODAY', on: 'on', off: 'off',
    returnToday: 'Return to today', collapseTimeline: 'Collapse lunar timeline', expandTimeline: 'Expand lunar timeline',
    lunarRuler: 'Lunar date ruler. Swipe to travel through dates', moonZoom: 'Moon zoom', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    age: 'AGE', distance: 'DISTANCE', angle: 'ANGLE', view: 'VIEW', equatorial: 'Equatorial', northern: 'Northern', southern: 'Southern',
    phases: ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'],
    events: ['Mid-Autumn Full Moon', 'Total Lunar Eclipse', 'Partial Lunar Eclipse', 'Penumbral Lunar Eclipse'],
  },
  zh: {
    locating: '正在定位…', timeline: '月相时间轴', tidalLock: '潮汐锁定', satellite: '卫星', today: '今天', on: '开启', off: '关闭',
    returnToday: '返回今天', collapseTimeline: '收起月相时间轴', expandTimeline: '展开月相时间轴',
    lunarRuler: '月相日期刻度。滑动以浏览日期', moonZoom: '月球缩放', zoomIn: '放大', zoomOut: '缩小',
    age: '月龄', distance: '距离', angle: '角度', view: '半球', equatorial: '赤道地区', northern: '北半球', southern: '南半球',
    phases: ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'],
    events: ['中秋满月', '月全食', '月偏食', '半影月食'],
  },
  ko: {
    locating: '위치 확인 중…', timeline: '달 타임라인', tidalLock: '조석 고정', satellite: '위성', today: '오늘', on: '켜짐', off: '꺼짐',
    returnToday: '오늘로 돌아가기', collapseTimeline: '달 타임라인 접기', expandTimeline: '달 타임라인 펼치기',
    lunarRuler: '달 날짜 눈금. 스와이프하여 날짜 이동', moonZoom: '달 확대/축소', zoomIn: '확대', zoomOut: '축소',
    age: '월령', distance: '거리', angle: '각도', view: '반구', equatorial: '적도', northern: '북반구', southern: '남반구',
    phases: ['삭', '초승달', '상현달', '차오르는 볼록달', '보름달', '기우는 볼록달', '하현달', '그믐달'],
    events: ['추석 보름달', '개기 월식', '부분 월식', '반영 월식'],
  },
  ja: {
    locating: '位置を確認中…', timeline: '月のタイムライン', tidalLock: '潮汐固定', satellite: '衛星', today: '今日', on: 'オン', off: 'オフ',
    returnToday: '今日に戻る', collapseTimeline: '月のタイムラインを閉じる', expandTimeline: '月のタイムラインを開く',
    lunarRuler: '月の日付目盛り。スワイプして日付を移動', moonZoom: '月の拡大率', zoomIn: '拡大', zoomOut: '縮小',
    age: '月齢', distance: '距離', angle: '角度', view: '半球', equatorial: '赤道付近', northern: '北半球', southern: '南半球',
    phases: ['新月', '三日月', '上弦の月', '十三夜月', '満月', '寝待月', '下弦の月', '有明月'],
    events: ['中秋の名月', '皆既月食', '部分月食', '半影月食'],
  },
  vi: {
    locating: 'Đang xác định vị trí…', timeline: 'LỘ TRÌNH', tidalLock: 'KH. THỦY TRIỀU', satellite: 'VỆ TINH', today: 'HÔM NAY', on: 'bật', off: 'tắt',
    returnToday: 'Quay về hôm nay', collapseTimeline: 'Thu gọn dòng thời gian Mặt Trăng', expandTimeline: 'Mở dòng thời gian Mặt Trăng',
    lunarRuler: 'Thước ngày âm lịch. Vuốt để chuyển ngày', moonZoom: 'Thu phóng Mặt Trăng', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ',
    age: 'TUỔI', distance: 'KH. CÁCH', angle: 'GÓC', view: 'BÁN CẦU', equatorial: 'Xích đạo', northern: 'Bắc', southern: 'Nam',
    phases: ['Trăng non', 'Trăng lưỡi liềm đầu tháng', 'Thượng huyền', 'Trăng khuyết đầu tháng', 'Trăng tròn', 'Trăng khuyết cuối tháng', 'Hạ huyền', 'Trăng lưỡi liềm cuối tháng'],
    events: ['Trăng rằm Trung thu', 'Nguyệt thực toàn phần', 'Nguyệt thực một phần', 'Nguyệt thực nửa tối'],
  },
  th: {
    locating: 'กำลังระบุตำแหน่ง…', timeline: 'ลำดับเวลาข้างขึ้นข้างแรม', tidalLock: 'ล็อกการหมุน', satellite: 'ดาวเทียม', today: 'วันนี้', on: 'เปิด', off: 'ปิด',
    returnToday: 'กลับไปวันนี้', collapseTimeline: 'ย่อไทม์ไลน์ดวงจันทร์', expandTimeline: 'ขยายไทม์ไลน์ดวงจันทร์',
    lunarRuler: 'แถบวันที่จันทรคติ ปัดเพื่อเลื่อนดูวันที่', moonZoom: 'ซูมดวงจันทร์', zoomIn: 'ขยาย', zoomOut: 'ย่อ',
    age: 'อายุดวงจันทร์', distance: 'ระยะห่าง', angle: 'มุม', view: 'ซีกโลก', equatorial: 'ใกล้เส้นศูนย์สูตร', northern: 'ซีกโลกเหนือ', southern: 'ซีกโลกใต้',
    phases: ['เดือนดับ', 'เสี้ยวข้างขึ้น', 'ครึ่งดวงข้างขึ้น', 'เกือบเต็มดวงข้างขึ้น', 'วันเพ็ญ', 'เกือบเต็มดวงข้างแรม', 'ครึ่งดวงข้างแรม', 'เสี้ยวข้างแรม'],
    events: ['พระจันทร์เต็มดวงเทศกาลไหว้พระจันทร์', 'จันทรุปราคาเต็มดวง', 'จันทรุปราคาบางส่วน', 'จันทรุปราคาเงามัว'],
  },
};

const localeTags = { en: 'en', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP', vi: 'vi-VN', th: 'th-TH' };

export function getPreferredLanguage(locales = []) {
  if (!Array.isArray(locales)) return 'en';
  const codes = locales.map(({ languageCode, languageTag }) => (languageCode || languageTag || '').toLowerCase().split(/[-_]/)[0]);
  // Expo returns locales in the order selected in system settings. Respect
  // that order so changing the primary device language changes the app too.
  return codes.find((language) => translations[language]) || 'en';
}

export function getLocaleTag(language) {
  return localeTags[language] || localeTags.en;
}

export function translate(language, key) {
  return (translations[language] || translations.en)[key] || translations.en[key] || key;
}

export function translatePhase(language, phaseName) {
  const englishPhases = translations.en.phases;
  const phaseIndex = englishPhases.indexOf(phaseName);
  if (phaseIndex >= 0) return translations[language]?.phases[phaseIndex] || phaseName;

  const eventIndex = translations.en.events.indexOf(phaseName);
  if (eventIndex >= 0) return translations[language]?.events[eventIndex] || phaseName;
  return phaseName;
}

export function getTidalLockHint(language) {
  const hints = {
    zh: '暂停月球自转，同时光源仍随所选日期移动',
    ko: '달의 자전을 멈추고 광원은 선택한 날짜를 계속 따릅니다',
    ja: '月の自転を止め、光源は選択した日付に合わせて動きます',
    vi: 'Dừng vòng quay của Mặt Trăng, còn nguồn sáng vẫn theo ngày đã chọn',
    th: 'หยุดการหมุนของดวงจันทร์ โดยแหล่งกำเนิดแสงยังคงเคลื่อนตามวันที่เลือก',
  };
  return hints[language] || "Stops the Moon's rotation while the light source continues to follow the selected date";
}
