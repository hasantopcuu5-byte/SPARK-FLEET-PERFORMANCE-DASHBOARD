// ══════════════════════════════════════════════════════════════════════
//  SUPERINTENDENT VISIT SUMMARY — Firebase Entegrasyonlu Modül
//  Node: /superintendent_data
//  Ay Key Formatı: "YYYY-MM" → görünüm "TEMMUZ 2026"
// ══════════════════════════════════════════════════════════════════════

const SUPT_FB_URL = "https://spark-filo-panel-default-rtdb.europe-west1.firebasedatabase.app/superintendent_data.json";

const SUPT_MONTHS_TR = ["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"];

const SUPT_SHIPS = [
  'GIFT','KRONOS','DREAM','FAUN','FLAT','LAKER','JUST','IDON',
  'BEAM','CANAL','DALI','APRIL','COMET','ARES','DODO',
  'ZEYNEP','EMINE','GALATA','ORFA'
];

const SUPT_DEPTS = ['op','tek','hseq'];
const SUPT_DEPT_LABEL = { op:'OPERASYON', tek:'TEKNİK', hseq:'HSEQ' };
const SUPT_DEPT_COLOR = { op:'#2e5fa3', tek:'#1a7a4a', hseq:'#7b3fa0' };
const SUPT_DEPT_BG    = { op:'#dce8f8', tek:'#d5edd9', hseq:'#ecdff4' };
const SUPT_STATUS_OPTS = ['Seyir','Liman','Demir','Tersane'];

// Durum renkleri
const SUPT_STATUS_CLS = {
  'Seyir':   { bg:'#d5edd9', color:'#1a7a4a', border:'#c2e2c8' },
  'Liman':   { bg:'#fef4d1', color:'#b87a11', border:'#fae8a4' },
  'Demir':   { bg:'#dce8f8', color:'#2e5fa3', border:'#c5d7f0' },
  'Tersane': { bg:'#f8d7da', color:'#842029', border:'#f1aeb5' }
};

// Global state
let suptState = {
  ships: { op:[...SUPT_SHIPS], tek:[...SUPT_SHIPS], hseq:[...SUPT_SHIPS] },
  entries: { op:{}, tek:{}, hseq:{} }
};

let suptCurrentTab = 'p-toplam';   // Aktif sekme
let suptModalCtx   = null;          // { dept, ship, monthKey } — modal context
let suptSaving     = false;

// ─── YARDIMCI FONKSİYONLAR ──────────────────────────────────────────

function suptMonthKey(year, monthIdx) {
  // monthIdx: 0-11
  return `${year}-${String(monthIdx + 1).padStart(2,'0')}`;
}

function suptMonthLabel(key) {
  // "2025-08" → "AĞUSTOS 2025"
  if (!key) return '';
  const [y, m] = key.split('-');
  return `${SUPT_MONTHS_TR[parseInt(m,10)-1]} ${y}`;
}

function suptSortedMonthKeys(entries) {
  // entries: { "2025-08": [...], "2026-01": [...] }
  return Object.keys(entries || {}).sort();
}

function suptDaysBetween(start, end) {
  const s = new Date(start), e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function suptFmtDate(isoDate) {
  if (!isoDate) return '';
  const [y,m,d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function suptToast(msg, dur=2500) {
  let t = document.getElementById('suptToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'suptToast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0d1b2a;color:#fff;padding:12px 20px;border-radius:6px;font-size:13px;z-index:9999;opacity:0;transform:translateY(10px);transition:all .3s;pointer-events:none;font-family:inherit;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(t._to);
  t._to = setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(10px)'; }, dur);
}

// ─── FIREBASE OKUMA / YAZMA ──────────────────────────────────────────

async function suptLoadFromFirebase() {
  const wrap = document.getElementById('suptLoadingWrap');
  if (wrap) wrap.style.display = 'flex';
  try {
    const res = await fetch(SUPT_FB_URL);
    const raw = await res.json();
    if (raw && raw.ships && raw.entries) {
      suptState.ships   = raw.ships;
      suptState.entries = raw.entries;
    }
  } catch(e) {
    console.error('Superintendent Firebase yükleme hatası:', e);
    suptToast('⚠️ Veriler yüklenemedi, internet bağlantısını kontrol edin.', 4000);
  } finally {
    if (wrap) wrap.style.display = 'none';
    suptRenderCurrentTab();
  }
}

async function suptSaveToFirebase() {
  if (suptSaving) return;
  suptSaving = true;
  try {
    await fetch(SUPT_FB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suptState)
    });
    console.log('Superintendent verisi Firebase\'e kaydedildi.');
  } catch(e) {
    console.error('Superintendent kaydetme hatası:', e);
    suptToast('⚠️ Kaydetme başarısız!', 3500);
  } finally {
    suptSaving = false;
  }
}

// ─── SEKME YÖNETİMİ ─────────────────────────────────────────────────

function suptTabSwitch(panelId) {
  suptCurrentTab = panelId;
  document.querySelectorAll('#superintendentPanel .supt-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.panel === panelId);
  });
  document.querySelectorAll('#superintendentPanel .supt-panel').forEach(p => {
    p.classList.toggle('active', p.id === panelId);
  });
  suptRenderCurrentTab();
}

function suptRenderCurrentTab() {
  switch(suptCurrentTab) {
    case 'p-toplam':  suptRenderToplam();  break;
    case 'p-calisan': suptRenderCalisan(); break;
    case 'p-bulk':    suptRenderBulk();    break;
    case 'p-op':      suptRenderDept('op');   break;
    case 'p-tek':     suptRenderDept('tek');  break;
    case 'p-hseq':    suptRenderDept('hseq'); break;
  }
}

// ─── GENEL ÖZET ─────────────────────────────────────────────────────

function suptRenderToplam() {
  const allEntries = suptGetAllEntries();
  const totalVisits = allEntries.length;
  const totalDays   = allEntries.reduce((s, e) => s + (e.days || 0), 0);
  const uniqueNames = new Set(allEntries.map(e => e.name)).size;

  document.getElementById('suptCardVisits').textContent = totalVisits;
  document.getElementById('suptCardDays').textContent   = totalDays;
  document.getElementById('suptCardPeople').textContent = uniqueNames;

  // Tablo — aylara göre grupla
  const byMonth = {};
  allEntries.forEach(e => {
    if (!byMonth[e.monthKey]) byMonth[e.monthKey] = [];
    byMonth[e.monthKey].push(e);
  });

  const sortedKeys = Object.keys(byMonth).sort().reverse();
  let html = '';
  sortedKeys.forEach(mk => {
    html += `<tr><td colspan="7" style="background:#2c4a6e;color:#fff;font-weight:700;font-size:12px;letter-spacing:1px;padding:8px 12px;">▼ ${suptMonthLabel(mk)}</td></tr>`;
    byMonth[mk].forEach(e => {
      const dCls = SUPT_DEPT_COLOR[e.dept] || '#888';
      const dLabel = SUPT_DEPT_LABEL[e.dept] || e.dept;
      html += `<tr>
        <td style="padding:8px 12px;">${suptMonthLabel(mk)}</td>
        <td style="padding:8px 12px;">${e.name}</td>
        <td style="padding:8px 12px;font-weight:700;">${e.ship}</td>
        <td style="padding:8px 12px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dCls};margin-right:5px;"></span>${dLabel}
        </td>
        <td style="padding:8px 12px;font-weight:600;">${e.days}</td>
        <td style="padding:8px 12px;">${suptFmtDate(e.start)}</td>
        <td style="padding:8px 12px;">${suptFmtDate(e.end)}</td>
      </tr>`;
    });
  });
  document.getElementById('suptToplamBody').innerHTML = html || '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#6b8aaa;">Henüz kayıt yok.</td></tr>';
}

// ─── ÇALIŞAN BAZLI ──────────────────────────────────────────────────

function suptRenderCalisan() {
  const allEntries = suptGetAllEntries();
  const byPerson = {};
  allEntries.forEach(e => {
    if (!byPerson[e.name]) byPerson[e.name] = { visits:0, days:0, ships:new Set(), depts:new Set() };
    byPerson[e.name].visits++;
    byPerson[e.name].days += (e.days || 0);
    byPerson[e.name].ships.add(e.ship);
    byPerson[e.name].depts.add(e.dept);
  });

  const sorted = Object.entries(byPerson).sort((a,b) => b[1].days - a[1].days);
  let html = '';
  sorted.forEach(([name, d]) => {
    const deptBadges = [...d.depts].map(dep => `<span style="background:${SUPT_DEPT_BG[dep]};color:${SUPT_DEPT_COLOR[dep]};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-right:3px;">${SUPT_DEPT_LABEL[dep]}</span>`).join('');
    html += `<tr>
      <td style="padding:9px 12px;font-weight:700;">${name}</td>
      <td style="padding:9px 12px;">${deptBadges}</td>
      <td style="padding:9px 12px;font-weight:700;color:#1a7a4a;">${d.days}</td>
      <td style="padding:9px 12px;">${d.visits}</td>
      <td style="padding:9px 12px;">${[...d.ships].join(', ')}</td>
    </tr>`;
  });
  document.getElementById('suptCalisanBody').innerHTML = html || '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#6b8aaa;">Henüz kayıt yok.</td></tr>';
}

// ─── ZİYARET TABLOSU (BULK OVERVIEW) ────────────────────────────────

function suptRenderBulk() {
  const allEntries = suptGetAllEntries();
  const allMonths = [...new Set(allEntries.map(e => e.monthKey))].sort();
  const allShips  = suptGetAllShips();

  // Başlık: Ay sütunları
  let thHtml = '<th style="text-align:left;padding:10px;background:#0d1b2a;color:#fff;position:sticky;left:0;min-width:130px;">GEMİ</th>';
  allMonths.forEach(mk => {
    thHtml += `<th style="padding:10px;background:#0d1b2a;color:#fff;text-align:center;white-space:nowrap;">${suptMonthLabel(mk)}</th>`;
  });

  let tbodyHtml = '';
  allShips.forEach(ship => {
    let row = `<td style="padding:7px 10px;font-weight:700;background:#f0f4f8;position:sticky;left:0;border-right:2px solid #c8d8ea;">${ship}</td>`;
    allMonths.forEach(mk => {
      let chips = '';
      SUPT_DEPTS.forEach(dept => {
        const entries = (suptState.entries[dept]?.[ship]?.[mk] || []);
        entries.forEach(e => {
          const col = SUPT_DEPT_COLOR[dept];
          const bg  = SUPT_DEPT_BG[dept];
          chips += `<span style="display:inline-block;background:${bg};color:${col};padding:2px 5px;border-radius:3px;font-size:10px;font-weight:700;margin:1px;">${e.name.split('.')[0]}.${e.name.split('.')[1]||''} (${e.days}g)</span>`;
        });
      });
      row += `<td style="padding:6px 8px;text-align:center;border-bottom:1px solid #e8f0f8;vertical-align:top;">${chips || '<span style="color:#ccc;font-size:11px;">—</span>'}</td>`;
    });
    tbodyHtml += `<tr>${row}</tr>`;
  });

  document.getElementById('suptBulkTable').innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr>${thHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
    </table>`;
}

// ─── DEPARTMAN GİRİŞ TABLOSU ────────────────────────────────────────

function suptRenderDept(dept) {
  const ships = suptState.ships[dept] || [...SUPT_SHIPS];
  const allEntries = suptGetAllEntries();

  // Tüm ay keylerini bul — geçmiş + aktif ay + 3 ay ilerisi
  const allMonthKeys = suptGetExtendedMonthKeys(allEntries);

  const dColor = SUPT_DEPT_COLOR[dept];
  const dBg    = SUPT_DEPT_BG[dept];

  // Başlık
  let thHtml = `<th style="background:#0d1b2a;color:#fff;padding:9px 12px;text-align:left;position:sticky;left:0;min-width:130px;">GEMİ</th>`;
  allMonthKeys.forEach(mk => {
    const isPresent = mk === new Date().toISOString().slice(0,7);
    thHtml += `<th style="background:#0d1b2a;color:${isPresent?'#e8a020':'#fff'};padding:9px 8px;text-align:center;min-width:160px;white-space:nowrap;${isPresent?'border-bottom:2px solid #e8a020;':''}">${suptMonthLabel(mk)}</th>`;
  });

  // Satırlar
  let tbodyHtml = '';
  ships.forEach(ship => {
    let row = `<td style="padding:8px 12px;font-weight:700;font-size:13px;background:#f0f4f8;position:sticky;left:0;z-index:1;border-right:2px solid #c8d8ea;">${ship}</td>`;
    allMonthKeys.forEach(mk => {
      const entries = suptState.entries[dept]?.[ship]?.[mk] || [];
      let cellInner = '';
      entries.forEach((e, idx) => {
        const stStyle = SUPT_STATUS_CLS[e.status] || {};
        const stHtml = e.status ? `<span style="display:inline-block;background:${stStyle.bg||'#eee'};color:${stStyle.color||'#333'};border:1px solid ${stStyle.border||'#ccc'};border-radius:4px;font-size:10px;padding:2px 6px;font-weight:700;margin-top:4px;">${e.status}</span>` : '';
        cellInner += `
          <div style="background:#fff;border:1px solid #c8d8ea;border-radius:5px;padding:5px 8px;margin-bottom:4px;position:relative;">
            <div style="font-weight:700;color:#1a2e45;font-size:13px;">${e.name}</div>
            <div style="color:#6b8aaa;font-size:11px;">${suptFmtDate(e.start)} → ${suptFmtDate(e.end)}</div>
            ${stHtml}
            <span style="background:#e8a020;color:#0d1b2a;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:700;position:absolute;top:5px;right:5px;">${e.days}g</span>
            <span onclick="suptDeleteEntry('${dept}','${ship}','${mk}',${idx})" style="position:absolute;bottom:4px;right:5px;font-size:12px;color:#bbb;cursor:pointer;" title="Sil">✕</span>
          </div>`;
      });
      const isFuture = mk >= new Date().toISOString().slice(0,7);
      const cellBg = isFuture && mk > new Date().toISOString().slice(0,7) ? 'rgba(232,160,32,0.04)' : (entries.length ? '#f8fdff' : '');
      row += `<td onclick="suptOpenModal('${dept}','${ship}','${mk}')" style="min-height:56px;padding:5px;cursor:pointer;vertical-align:top;border-bottom:1px solid #e8f0f8;border-right:1px solid #e8f0f8;background:${cellBg};transition:background .1s;" onmouseover="this.style.background='#f0f7ff'" onmouseout="this.style.background='${cellBg}'">
        ${cellInner}
        <div style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:18px;height:24px;margin-top:2px;">+</div>
      </td>`;
    });
    tbodyHtml += `<tr>${row}</tr>`;
  });

  const containerId = `suptDeptTable_${dept}`;
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div style="overflow:auto;background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(13,27,42,.12);">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr>${thHtml}</tr></thead>
          <tbody>${tbodyHtml}</tbody>
        </table>
      </div>`;
  }
}

// ─── AY KEY LİSTESİ (Sonsuz Takvim) ────────────────────────────────

function suptGetExtendedMonthKeys(allEntries) {
  const existing = new Set(allEntries.map(e => e.monthKey));
  // En eski kayıt veya 2025-08 başlangıç
  let minKey = '2025-08';
  existing.forEach(k => { if (k < minKey) minKey = k; });

  // 3 ay sonrasına kadar uzat
  const now = new Date();
  const futureEnd = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const futureKey = `${futureEnd.getFullYear()}-${String(futureEnd.getMonth()+1).padStart(2,'0')}`;

  const maxKey = futureKey > minKey ? futureKey : minKey;

  const keys = [];
  let [y, m] = minKey.split('-').map(Number);
  const [ey, em] = maxKey.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2,'0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return keys;
}

// ─── ENTRY YARDIMCILARI ──────────────────────────────────────────────

function suptGetAllEntries() {
  const result = [];
  SUPT_DEPTS.forEach(dept => {
    const deptEntries = suptState.entries[dept] || {};
    Object.entries(deptEntries).forEach(([ship, monthMap]) => {
      Object.entries(monthMap).forEach(([mk, arr]) => {
        (arr || []).forEach(e => {
          result.push({ ...e, dept, ship, monthKey: mk });
        });
      });
    });
  });
  return result;
}

function suptGetAllShips() {
  const s = new Set([...SUPT_SHIPS]);
  SUPT_DEPTS.forEach(dept => {
    (suptState.ships[dept] || []).forEach(sh => s.add(sh));
  });
  return [...s];
}

// ─── MODAL: GİRİŞ EKLE ───────────────────────────────────────────────

function suptOpenModal(dept, ship, monthKey) {
  suptModalCtx = { dept, ship, monthKey };
  document.getElementById('suptModalTitle').textContent = `${ship} — ${suptMonthLabel(monthKey)}`;
  document.getElementById('suptModalDeptBadge').textContent = SUPT_DEPT_LABEL[dept];
  document.getElementById('suptModalDeptBadge').style.cssText = `padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${SUPT_DEPT_BG[dept]};color:${SUPT_DEPT_COLOR[dept]}`;

  // Formu temizle
  document.getElementById('suptInpName').value = '';
  document.getElementById('suptInpStart').value = '';
  document.getElementById('suptInpEnd').value = '';
  document.getElementById('suptInpStatus').value = '';
  document.getElementById('suptDaysPreview').textContent = '';

  // Mevcut kayıtları çiz
  suptRenderModalList();

  document.getElementById('suptModalOverlay').style.display = 'flex';
}

function suptCloseModal() {
  document.getElementById('suptModalOverlay').style.display = 'none';
  suptModalCtx = null;
}

function suptRenderModalList() {
  if (!suptModalCtx) return;
  const { dept, ship, monthKey } = suptModalCtx;
  const entries = suptState.entries[dept]?.[ship]?.[monthKey] || [];
  let html = '';
  entries.forEach((e, idx) => {
    html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f7f9fc;border-radius:4px;margin-bottom:6px;font-size:12px;">
      <div>
        <span style="font-weight:600;color:#1a2e45;">${e.name}</span>
        <span style="color:#6b8aaa;font-size:11px;margin-left:8px;">${suptFmtDate(e.start)} → ${suptFmtDate(e.end)}</span>
        ${e.status ? `<span style="margin-left:6px;font-size:11px;font-weight:700;color:${(SUPT_STATUS_CLS[e.status]||{}).color||'#333'};">${e.status}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="background:#e8a020;color:#0d1b2a;border-radius:3px;padding:2px 7px;font-size:11px;font-weight:700;">${e.days}g</span>
        <span onclick="suptDeleteEntry('${dept}','${ship}','${monthKey}',${idx});suptRenderModalList();" style="cursor:pointer;color:#bbb;font-size:14px;padding:0 4px;" title="Sil">✕</span>
      </div>
    </div>`;
  });
  document.getElementById('suptModalList').innerHTML = html || '<div style="color:#6b8aaa;font-size:12px;padding:8px 0;">Henüz kayıt yok.</div>';
}

function suptUpdateDaysPreview() {
  const s = document.getElementById('suptInpStart').value;
  const e = document.getElementById('suptInpEnd').value;
  if (s && e) {
    const d = suptDaysBetween(s, e);
    document.getElementById('suptDaysPreview').textContent = d > 0 ? `${d} gün` : '';
  }
}

function suptSaveEntry() {
  if (!suptModalCtx) return;
  const { dept, ship, monthKey } = suptModalCtx;

  const name   = document.getElementById('suptInpName').value.trim();
  const start  = document.getElementById('suptInpStart').value;
  const end    = document.getElementById('suptInpEnd').value;
  const status = document.getElementById('suptInpStatus').value;

  if (!name || !start || !end) { suptToast('⚠️ Ad, gidiş ve dönüş tarihi zorunlu!'); return; }
  if (end < start) { suptToast('⚠️ Dönüş tarihi gidiş tarihinden önce olamaz!'); return; }

  const days = suptDaysBetween(start, end);

  // Nested path oluştur
  if (!suptState.entries[dept]) suptState.entries[dept] = {};
  if (!suptState.entries[dept][ship]) suptState.entries[dept][ship] = {};
  if (!suptState.entries[dept][ship][monthKey]) suptState.entries[dept][ship][monthKey] = [];
  if (!suptState.ships[dept].includes(ship)) suptState.ships[dept].push(ship);

  suptState.entries[dept][ship][monthKey].push({ name, start, end, days, status });

  suptRenderModalList();
  suptSaveToFirebase();
  suptToast('✓ Kayıt eklendi');

  // Formu sıfırla
  document.getElementById('suptInpName').value = '';
  document.getElementById('suptInpStart').value = '';
  document.getElementById('suptInpEnd').value = '';
  document.getElementById('suptInpStatus').value = '';
  document.getElementById('suptDaysPreview').textContent = '';

  // Arka planda tabloyu güncelle
  suptRenderCurrentTab();
}

function suptDeleteEntry(dept, ship, monthKey, idx) {
  if (!suptState.entries[dept]?.[ship]?.[monthKey]) return;
  suptState.entries[dept][ship][monthKey].splice(idx, 1);
  suptSaveToFirebase();
  suptToast('Kayıt silindi');
  suptRenderCurrentTab();
}

// ─── İLK YÜKLEME ────────────────────────────────────────────────────

function initSuperintendent() {
  // Sekme click handler'larını bağla
  document.querySelectorAll('#superintendentPanel .supt-tab').forEach(btn => {
    btn.addEventListener('click', () => suptTabSwitch(btn.dataset.panel));
  });
  suptLoadFromFirebase();
}
