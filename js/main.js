

// --- ENSPEKTÖR SİSTEMİ FONKSİYONLARI ---
// --- ENSPEKTÖR SİSTEMİ FONKSİYONLARI ---

function getInspectorScore(inspectorName) {
  const ships = inspectorMapping[inspectorName] || [];
  if (ships.length === 0) return { total: 0, base: 0, psc: 0, rs: 0 };

  // 1. Mevcut Gemi Performans Ortalamasını Hesapla (SADECE OPERASYON)
  let totalRate = 0;
  ships.forEach(ship => {
      totalRate += getShipOpsFinalRateForMode(ship, 'haftalik'); // <-- Teknik puanlardan arındırıldı
  });
  let baseScore = totalRate / ships.length;

  // 2. Personel Sistemindeki TÜM PSC ve RIGHTSHIP kayıtlarını tekilleştirerek topla
  let allPsc = [];
  let allRs = [];
  let seenPsc = new Set();
  let seenRs = new Set();
  let pData = perfLoadData(); 
  
  pData.forEach(p => {
      if (p.pscRecords) {
          p.pscRecords.forEach(r => {
              let key = r.vessel + "_" + r.date + "_" + r.country;
              if (!seenPsc.has(key)) { seenPsc.add(key); allPsc.push(r); }
          });
      }
      if (p.rightshipRecords) {
          p.rightshipRecords.forEach(r => {
              let key = r.vessel + "_" + r.date + "_" + r.country;
              if (!seenRs.has(key)) { seenRs.add(key); allRs.push(r); }
          });
      }
  });

  // 3. Enspektörün Gemilerini ve 01.01.2026 Sonrasını Filtrele
  let cutoffDate = new Date(2026, 0, 1);
  
  let inspectorPscRecords = allPsc.filter(r => {
      if (!ships.includes(r.vessel)) return false;
      let rDate = parseTRDate(r.date); 
      return rDate >= cutoffDate;
  });

  let inspectorRsRecords = allRs.filter(r => {
      if (!ships.includes(r.vessel)) return false;
      let rDate = parseTRDate(r.date); 
      return rDate >= cutoffDate;
  });

  // 4. PSC ve Rightship Puanlarını Hesapla
  let pscBonus = calcPSCScore(inspectorPscRecords, 2010); 
  let rsBonus = calcRightshipScore(inspectorRsRecords, 2010);

  // 5. Final Puanı Hesapla (Base + PSC + RS)
  let finalScore = baseScore + pscBonus + rsBonus;

  return {
      total: Math.round(finalScore * 10) / 10,
      base: Math.round(baseScore * 10) / 10,
      psc: Math.round(pscBonus * 10) / 10,
      rs: Math.round(rsBonus * 10) / 10
  };
}

function renderInspectorView() {
    const liveBody = document.getElementById('inspectorLiveBody');
    const histBody = document.getElementById('inspectorHistoryBody');
    if (!liveBody || !histBody) return;

    const scrollStyle = '';

    // 1. Tüm sistemdeki PSC ve Rightship'leri topla ve tekilleştir
    let allPsc = [];
    let allRs = [];
    let seenPsc = new Set();
    let seenRs = new Set();
    let pData = perfLoadData(); 
    
    pData.forEach(p => {
        if (p.pscRecords) {
            p.pscRecords.forEach(r => {
                let key = r.vessel + "_" + r.date + "_" + r.country;
                if (!seenPsc.has(key)) { seenPsc.add(key); allPsc.push(r); }
            });
        }
        if (p.rightshipRecords) {
            p.rightshipRecords.forEach(r => {
                let key = r.vessel + "_" + r.date + "_" + r.country;
                if (!seenRs.has(key)) { seenRs.add(key); allRs.push(r); }
            });
        }
    });

    let cutoffDate = new Date(2026, 0, 1);

    // 2. Canlı Sıralama Hesapla
    let inspectors = Object.keys(inspectorMapping).map(name => {
        let scoreData = getInspectorScore(name);
        return { name: name, ships: inspectorMapping[name], scoreObj: scoreData };
    });
    
    inspectors.sort((a, b) => b.scoreObj.total - a.scoreObj.total);

    liveBody.innerHTML = scrollStyle + inspectors.map((insp, index) => {
        let score = insp.scoreObj.total;
        let base = insp.scoreObj.base;
        let psc = insp.scoreObj.psc;
        let rs = insp.scoreObj.rs;

        let statCls = score >= 70 ? 'ok' : score >= 40 ? 'warn' : 'bad';
        let rankDisplay = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index+1)+'.';
        
        let shipTags = insp.ships.map(s => `<span style="display:inline-block; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; margin:2px; font-family:'DM Mono'; font-size:0.65rem;">${s}</span>`).join('');

        // 3. Bu enspektörün 2026 ve sonrası PSC ve RS kayıtlarını filtrele
        let inspectorPscRecords = allPsc.filter(r => {
            if (!insp.ships.includes(r.vessel)) return false;
            let rDate = parseTRDate(r.date);
            return rDate >= cutoffDate;
        });
        inspectorPscRecords.sort((a, b) => parseTRDate(b.date) - parseTRDate(a.date));

        let inspectorRsRecords = allRs.filter(r => {
            if (!insp.ships.includes(r.vessel)) return false;
            let rDate = parseTRDate(r.date);
            return rDate >= cutoffDate;
        });
        inspectorRsRecords.sort((a, b) => parseTRDate(b.date) - parseTRDate(a.date));

       // Gemi Performansı ve PSC/RS Performansını Ayrı Ayrı Hesapla
       let shipStats = insp.ships.map(ship => {
        let baseScore = getShipFinalRateForMode(ship, 'haftalik'); 
        
        let shipPscs = inspectorPscRecords.filter(r => r.vessel === ship);
        let shipRss = inspectorRsRecords.filter(r => r.vessel === ship);
        
        let buildYear = 2010;
        if (typeof VESSEL_BUILD_YEARS !== 'undefined' && VESSEL_BUILD_YEARS[ship]) {
            buildYear = VESSEL_BUILD_YEARS[ship];
        } else if (shipPscs.length > 0 && shipPscs[0].buildYear) {
            buildYear = shipPscs[0].buildYear;
        }
        
        let pscScore = calcPSCScore(shipPscs, buildYear); 
        let rsScore = calcRightshipScore(shipRss, buildYear); 
        
        return { 
            vessel: ship, 
            base: baseScore, 
            inspectTotal: pscScore + rsScore,
            // Bu geminin hiç denetim geçirip geçirmediğini sayıyoruz
            inspectionCount: shipPscs.length + shipRss.length 
        };
    });

    // 4.1 Ofis (Gemi Performansı) İçin Sıralama (Tüm gemiler dahil)
    let sortedByBase = [...shipStats].sort((a, b) => b.base - a.base);
    let bestBaseShip = sortedByBase.length > 0 ? sortedByBase[0].vessel : "-";
    let worstBaseShip = sortedByBase.length > 0 ? sortedByBase[sortedByBase.length - 1].vessel : "-";

    // 4.2 Dış Denetim (PSC + RS) Performansı İçin Sıralama
    // BUG FIX: SADECE en az 1 denetim geçirmiş gemileri filtreliyoruz!
    let inspectedShips = shipStats.filter(s => s.inspectionCount > 0);
    let sortedByInspect = inspectedShips.sort((a, b) => b.inspectTotal - a.inspectTotal);
    
    let bestInspectShip = "-";
    let worstInspectShip = "-";
    
    if (sortedByInspect.length > 0) {
        bestInspectShip = sortedByInspect[0].vessel;
        worstInspectShip = sortedByInspect[sortedByInspect.length - 1].vessel;
    }

        // 5. PSC Detaylarını Satır İçine Bas
        let pscDetailsHtml = '';
        if (inspectorPscRecords.length > 0) {
            pscDetailsHtml = `<div style="margin-top:16px; background:rgba(0,0,0,0.25); border:1px solid rgba(0,216,200,0.15); border-radius:8px; padding:8px; font-family:'Plus Jakarta Sans', sans-serif;">
                <div style="font-size:0.68rem; color:var(--teal); margin-bottom:8px; font-weight:800; letter-spacing:0.05em;">2026 SONRASI PSC DETAYLARI:</div>
                <div class="psc-scroll-area" style="max-height:140px; overflow-y:auto; padding-right:8px;">`;
            
            inspectorPscRecords.forEach(r => {
                let rScore = calcPSCScore([r], r.buildYear || 2010);
                let scoreColor = rScore > 0 ? 'var(--ok)' : (rScore < 0 ? 'var(--bad)' : 'var(--muted)');
                let scoreSign = rScore > 0 ? '+' : '';
                let resultColor = r.result === 'clear' ? 'var(--ok)' : (r.result === 'remark' ? 'var(--warn)' : 'var(--bad)');
                let rLabel = r.result === 'clear' ? 'CLEAR ✓' : (r.result === 'remark' ? `REMARK (${(r.remarks || []).length})` : `DETENTION (${(r.remarks || []).length})`);
                
                pscDetailsHtml += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding:6px 0;">
                    <div style="font-size:0.72rem; color:var(--text); font-weight:500;">
                        <span style="color:#ffffff; font-weight:800; font-family:'DM Mono';">[${r.vessel}]</span> 
                        <span style="font-family:'DM Mono'; font-size:0.65rem; opacity:0.8; margin-left:4px;">${r.date}</span> 
                        <span style="color:var(--muted); font-size:0.65rem;">(${r.country})</span> 
                        <span style="color:${resultColor}; font-size:0.65rem; font-weight:700; margin-left:6px;">${rLabel}</span>
                    </div>
                    <div style="font-family:'DM Mono'; font-size:0.8rem; font-weight:900; color:${scoreColor};">${scoreSign}${rScore}</div>
                </div>`;
            });
            pscDetailsHtml += `</div>
            <div style="text-align:right; margin-top:6px; font-size:0.75rem; color:var(--text); border-top:1px dashed rgba(255,255,255,0.1); padding-top:8px; font-weight:600;">
                PSC Etkisi: <span style="color:${psc > 0 ? 'var(--ok)' : (psc < 0 ? 'var(--bad)' : 'var(--muted)')}; font-weight:800; font-family:'DM Mono'; font-size:0.8rem;">${psc > 0 ? '+' : ''}${psc} Puan</span>
            </div>
            </div>`;
        } else {
            pscDetailsHtml = `<div style="margin-top:16px; font-family:'Plus Jakarta Sans', sans-serif; font-size:0.7rem; color:var(--muted); padding:8px 12px; background:rgba(0,0,0,0.1); border-radius:6px; border:1px dashed rgba(255,255,255,0.1);">2026 sonrası PSC kaydı yok.</div>`;
        }

        // 6. Rightship Detaylarını Satır İçine Bas
        let rsDetailsHtml = '';
        if (inspectorRsRecords.length > 0) {
            rsDetailsHtml = `<div style="margin-top:10px; background:rgba(0,0,0,0.25); border:1px solid rgba(66,133,244,0.15); border-radius:8px; padding:8px; font-family:'Plus Jakarta Sans', sans-serif;">
                <div style="font-size:0.68rem; color:#4285f4; margin-bottom:8px; font-weight:800; letter-spacing:0.05em;"><img src="assets/icons/rightship_logo.png" style="height:12px; vertical-align:middle; margin-right:4px; margin-top:-2px;">2026 SONRASI RIGHTSHIP DETAYLARI:</div>
                <div class="psc-scroll-area" style="max-height:140px; overflow-y:auto; padding-right:8px;">`;
            
            inspectorRsRecords.forEach(r => {
                let rScore = calcRightshipScore([r], r.buildYear || 2010);
                let scoreColor = rScore > 0 ? 'var(--ok)' : (rScore < 0 ? 'var(--bad)' : 'var(--muted)');
                let scoreSign = rScore > 0 ? '+' : '';
                let resultColor = r.result === 'clear' ? 'var(--ok)' : (r.high > 0 ? 'var(--bad)' : 'var(--warn)');
                let rLabel = r.result === 'clear' ? 'CLEAR ✓' : `REMARK (Total: ${r.totalFindings})`;
                
                rsDetailsHtml += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding:6px 0;">
                    <div style="font-size:0.72rem; color:var(--text); font-weight:500;">
                        <span style="color:#ffffff; font-weight:800; font-family:'DM Mono';">[${r.vessel}]</span> 
                        <span style="font-family:'DM Mono'; font-size:0.65rem; opacity:0.8; margin-left:4px;">${r.date}</span> 
                        <span style="color:var(--muted); font-size:0.65rem;">(${r.port || r.country})</span> 
                        <span style="color:${resultColor}; font-size:0.65rem; font-weight:700; margin-left:6px;">${rLabel}</span>
                    </div>
                    <div style="font-family:'DM Mono'; font-size:0.8rem; font-weight:900; color:${scoreColor};">${scoreSign}${rScore}</div>
                </div>`;
            });
            rsDetailsHtml += `</div>
            <div style="text-align:right; margin-top:6px; font-size:0.75rem; color:var(--text); border-top:1px dashed rgba(255,255,255,0.1); padding-top:8px; font-weight:600;">
                Rightship Etkisi: <span style="color:${rs > 0 ? 'var(--ok)' : (rs < 0 ? 'var(--bad)' : 'var(--muted)')}; font-weight:800; font-family:'DM Mono'; font-size:0.8rem;">${rs > 0 ? '+' : ''}${rs} Puan</span>
            </div>
            </div>`;
        } else {
            rsDetailsHtml = `<div style="margin-top:10px; font-family:'Plus Jakarta Sans', sans-serif; font-size:0.7rem; color:var(--muted); padding:8px 12px; background:rgba(0,0,0,0.1); border-radius:6px; border:1px dashed rgba(255,255,255,0.1);">2026 sonrası Rightship kaydı yok.</div>`;
        }

        // Alt taraftaki metin açıklaması
        let bestWorstHtml = `
        <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:0.7rem; margin-top:16px; line-height:1.6; background:rgba(0,0,0,0.1); padding:10px; border-radius:8px; border-left:3px solid var(--border);">
            <div style="color:var(--muted);"><span style="color:var(--ok); font-weight:600;">▲ Gemi Performansından en çok kazandıran gemi:</span> <b style="color:var(--text); letter-spacing:0.05em;">${bestBaseShip}</b></div>
            <div style="color:var(--muted);"><span style="color:var(--bad); font-weight:600;">▼ Gemi Performansından en çok kaybettiren gemi:</span> <b style="color:var(--text); letter-spacing:0.05em;">${worstBaseShip}</b></div>
            
            <div style="color:var(--muted); margin-top:8px;"><span style="color:var(--ok); font-weight:600;">▲ 2026 sonrası Dış Denetim (PSC+RS) performansıyla kazandıran gemi:</span> <b style="color:var(--text); letter-spacing:0.05em;">${bestInspectShip}</b></div>
            <div style="color:var(--muted);"><span style="color:var(--bad); font-weight:600;">▼ 2026 sonrası Dış Denetim (PSC+RS) performansıyla kaybettiren gemi:</span> <b style="color:var(--text); letter-spacing:0.05em;">${worstInspectShip}</b></div>
        </div>`;

        return `<tr style="border-bottom:1px solid rgba(0,216,200,0.05);">
            <td style="font-size:1.3rem; text-align:center; vertical-align:top; padding-top:1rem;">${rankDisplay}</td>
            <td style="font-weight:700; font-size:0.95rem; color:var(--text); vertical-align:top; padding-top:1rem; line-height:1.1; width:45%;">
                ${insp.name}
                ${pscDetailsHtml}
                ${rsDetailsHtml}
            </td>
            <td style="vertical-align:top; padding-top:1rem;">
                ${shipTags}
                ${bestWorstHtml}
            </td>
            <td style="text-align:center; vertical-align:top; padding-top:1rem;">
                <span style="font-size:1.4rem; font-weight:900; color:var(--${statCls}); text-shadow:0 0 10px rgba(var(--${statCls}), 0.4);">${score}</span>
                <div style="font-family:'DM Mono'; font-size:0.65rem; color:var(--muted); margin-top:4px;">Taban Puan: ${base}</div>
            </td>
        </tr>`;
    }).join('');

    // Geçmiş Kayıtları Çiz
    if (!inspectorHistory || inspectorHistory.length === 0) {
        histBody.innerHTML = '<div style="color:var(--muted); font-family:\'DM Mono\'; font-size:0.75rem;">Henüz kaydedilmiş geçmiş bir hafta bulunmuyor.</div>';
    } else {
        let reversedHistory = [...inspectorHistory].reverse();
        histBody.innerHTML = reversedHistory.map(record => {
            let sortedRecordData = [...record.data].sort((a, b) => b.score - a.score);
            
            let html = `<div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px; padding:1rem; margin-bottom:1rem;">
                <div style="color:var(--gold); font-family:'DM Mono'; font-size:0.8rem; margin-bottom:0.8rem; font-weight:700;">📅 Hafta: ${record.date}</div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">`;
            
            sortedRecordData.forEach((d, idx) => {
                let sCls = d.score >= 70 ? 'ok' : d.score >= 40 ? 'warn' : 'bad';
                let medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                
                // Eskiden sadece psc yazıyordu, onu da kapsayacak şekilde "Dış Denetim Etkisi" yapıyoruz
                let pscDetail = (d.psc !== undefined && d.psc !== 0) 
                    ? `<div style="font-size:0.65rem; color:${d.psc>0?'var(--ok)':'var(--bad)'}; font-family:'Plus Jakarta Sans', sans-serif; font-weight:600; margin-top:4px;">Dış Denetim Etkisi: ${d.psc>0?'+':''}${d.psc}</div>` 
                    : '';

                html += `<div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <div style="display:flex; flex-direction:row; align-items:center; gap:6px; white-space:nowrap;">
                            <div style="font-size:1.1rem; line-height:1;">${medal}</div> 
                            <div style="font-weight:700; font-size:0.85rem; font-family:'Plus Jakarta Sans', sans-serif; color:var(--text); line-height:1;">${d.name}</div>
                        </div>
                        ${pscDetail}
                    </div>
                    <div style="color:var(--${sCls}); font-weight:900; font-family:'DM Mono'; font-size:1.1rem;">${d.score}</div>
                </div>`;
            });
            html += `</div></div>`;
            return html;
        }).join('');
    }
}

function jumpShip(e) {
  const ship = document.getElementById('ship-wrapper-tab');
  if(!ship) return;
  ship.classList.remove('jump-anim-tab');
  void ship.offsetWidth; 
  ship.classList.add('jump-anim-tab');
  setTimeout(() => { ship.classList.remove('jump-anim-tab'); }, 600);
}
function setArrowMode(mode) {
    arrowMode = mode;
    renderManualArrowTable();
    saveData();
    recalcStats();
}

function renderManualArrowTable() {
    var div = document.getElementById('manualArrowTable');
    if (!div) return;
    document.getElementById('arrowModeAutoBtn').style.opacity = arrowMode === 'auto' ? '1' : '0.4';
    document.getElementById('arrowModeManualBtn').style.opacity = arrowMode === 'manual' ? '1' : '0.4';
    
    if (arrowMode === 'auto') {
        div.innerHTML = '<p style="font-family:\'DM Mono\';font-size:0.72rem;color:var(--muted);">Otomatik modda oklar sistem tarafından hesaplanır.</p>';
        return;
    }

    // 1. Gemileri anlık performans puanlarına göre sırala
    const sortedShips = getSortedShips(filo);

    // 2. Sıralanmış gemiler üzerinden döngü oluştur
    var rows = sortedShips.map(function(gemi, index) {
        // Otomatik modda olsaydı okun yönü ne olurdu hesapla
        const currentRank = index + 1;
        const prevRank = previousRanks[gemi] || currentRank;
        
        let autoArrow = 'same';
        if (currentRank < prevRank) autoArrow = 'up';
        else if (currentRank > prevRank) autoArrow = 'down';

        // Daha önce manuel atanmış bir ok varsa onu kullan, yoksa o anki otomatik yönü baz al
        var val = manualArrows[gemi] || autoArrow;

        return `<div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:0.5rem;">
            <span style="font-family:'DM Mono';font-size:0.8rem;color:var(--text);width:80px;">${gemi}</span>
            <button onclick="setManualArrow('${gemi}','up')" style="background:${val==='up'?'var(--ok)':'transparent'};border:1px solid var(--border);color:var(--ok);padding:2px 10px;border-radius:6px;cursor:pointer;">▲</button>
            <button onclick="setManualArrow('${gemi}','same')" style="background:${val==='same'?'var(--muted)':'transparent'};border:1px solid var(--border);color:var(--muted);padding:2px 10px;border-radius:6px;cursor:pointer;">—</button>
            <button onclick="setManualArrow('${gemi}','down')" style="background:${val==='down'?'var(--bad)':'transparent'};border:1px solid var(--border);color:var(--bad);padding:2px 10px;border-radius:6px;cursor:pointer;">▼</button>
        </div>`;
    }).join('');
    
    div.innerHTML = rows;
}
function setManualArrow(gemi, val) {
    manualArrows[gemi] = val;
    renderManualArrowTable();
    saveData();
    recalcStats();
}



// ══════════════════════════════════════════════════════
//  VERİ YÖNETİMİ (GOOGLE SHEETS & BULUT BAĞLANTILI)
// ══════════════════════════════════════════════════════
// YENİ SATIR:


let inspectorHistory = [];
let mailler =[];
let aylikData = {}; 
let techWeeklyData = {};
let techMonthlyData = {};
let gnData = {}; // YENİ: Günlük raporlar için global değişken
let previousRanks = {};
// ...
let fleetHistory = []; // Filonun geçmiş haftalardaki ortalamasını tutacak
let shipRankingHistory = []; // Şampiyonlar Ligi için
let manualArrows = {};
let arrowMode = 'auto'; // 'auto' veya 'manual' 
let isComplianceVisible = localStorage.getItem('isComplianceVisible_v1') !== 'false';
let overdueJobs = JSON.parse(localStorage.getItem('overdueJobs_v1') || '{}');
let complianceBonus = JSON.parse(localStorage.getItem('complianceBonus_v1') || '{}');
let drillBonus = JSON.parse(localStorage.getItem('drillBonus_v1') || '{}');
let overdueSnapshots = { haftalik: null, aylik: null, alltime: null };
let adminOpenedRanks = {}; 
let overdueHistory = []; // Bulutta tutulacak tarihsel overdue verileri
let chartOverdueHistoryRef = null; // Çizgi grafiğinin referansı
let maillerModifiedThisSession = false; 
let chartGemiRef = null;
let chartMailRef = null;
let chartOverdueRef = null;
let defectData = JSON.parse(localStorage.getItem('defectData_v1') || '{}');
let selectedMailIndex = -1;
let currentView = 'ranking';
let rankingMode = 'haftalik'; // 'haftalik' | 'aylik' | 'alltime'
let bagimsizPscRecords = [];
window.gnCurrentFriday = getRecentFridayStr();
window.aylikCurrentMonth = new Date().toISOString().slice(0, 7);
function updateComplianceVisibilityUI() {
    const btn = document.getElementById('btnToggleComplianceVisibility');
    if (btn) {
        if (isComplianceVisible) {
            btn.innerHTML = "👁️ Sütunu Gizle";
            btn.style.background = "linear-gradient(135deg, var(--teal), #008880)";
            btn.style.color = "#000";
            btn.style.border = "none";
        } else {
            btn.innerHTML = "🙈 Sütunu Göster";
            btn.style.background = "rgba(255,90,114,0.15)";
            btn.style.color = "var(--bad)";
            btn.style.border = "1px solid var(--bad)";
        }
    }
}

function toggleComplianceColumn() {
    isComplianceVisible = !isComplianceVisible;
    localStorage.setItem('isComplianceVisible_v1', isComplianceVisible);
    updateComplianceVisibilityUI(); // Buton görünümünü güncelle
    if (currentView === 'ranking') renderRankingView(filo); // Tabloyu anında yeniden çiz
    saveData(); // Değişikliği buluta kaydet
}
function getRecentFridayStr() {
    const today = new Date();
    const dow = today.getDay();
    const diff = -((dow + 2) % 7);
    const fri = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    const yyyy = fri.getFullYear();
    const mm = String(fri.getMonth() + 1).padStart(2, '0');
    const dd = String(fri.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// === Sıralama Puanları Helperları ===
function getShipDailyRate(ship) {
    const gnData = gnLoad();
    const weeks = (window.committedWeeks || []).slice();
    if (!weeks.includes(window.gnCurrentFriday)) weeks.push(window.gnCurrentFriday);
    let expected = 0, responded = 0;
    weeks.forEach(function(week) {
        const gunler = gnGetHaftaGunleri(week);
      gunler.forEach(function(g, idx) {
    if (idx === 2) return; // Sunday'i atla
    expected++;
    if (gnData[g] && gnData[g][ship] === true) responded++;
});
    });
    return expected > 0 ? (responded / expected) * 100 : 0;
}
function getShipMailRate(ship) {
    const aktif = gemiAktifMailSayisi(ship);
    const d = gemiOrani(ship);
    return aktif > 0 ? (d / aktif) * 100 : 100;
}
function getOverdueBonus(ship, mode) {
  // Snapshot (Geçmişe kayıt) mantığı tamamen iptal edildi.
  // Her zaman CANLI (overdueJobs) veritabanını okur.
  const d = overdueJobs[ship] || {critical:0, important:0, other:0};
  
  // JS Metin Birleştirme hatasını önlemek için Sayıya (Number) çeviriyoruz
  const c = Number(d.critical) || 0;
  const i = Number(d.important) || 0;
  const o = Number(d.other) || 0;
  
  const total = c + i + o;
  
  // Matematik formülü: Taban +5, her iş başına -0.05 puan. Maksimum eksi limit: -10
  return Math.max(-10, 5 - (total * 0.05));
}
function getComplianceBonus(ship) {
    return complianceBonus[ship] || 0;
}
function getDrillBonus(ship) {
  return drillBonus[ship] || 0;
}
function getShipFinalRate(ship) {
    return (getShipMailRate(ship) + getShipDailyRate(ship) + getShipAylikRate(ship)) / 3 + getOverdueBonus(ship, rankingMode) + getComplianceBonus(ship);
}

function getShipAylikRate(ship) {
    const mData = aylikData[window.aylikCurrentMonth] || {};
    const shipData = mData[ship] || {};
    let count = 0;
    const currentItems = getAylikItems(window.aylikCurrentMonth);
  currentItems.forEach(item => {
    if(shipData[item] === true || String(shipData[item]).toLowerCase() === 'true') count++;
});
   
    return (count / currentItems.length) * 100;
}
function getShipDailyRateForMode(ship, mode) {
    const gnData = gnLoad();
    let weeks = [];
    
    // Hangi moddaysak, admin panelinden o modun listesini çek
    if (mode === 'haftalik') weeks = window.committedWeeks_haftalik || [];
    else if (mode === 'aylik') weeks = window.committedWeeks_aylik || [];
    else weeks = window.committedWeeks_alltime || [];

    // Eğer o kategoriye henüz hiç hafta eklenmemişse, hata vermemesi için ekrandaki son haftayı baz al
    if (!weeks || weeks.length === 0) weeks = [window.gnCurrentFriday];

    let expected = 0, responded = 0;
    weeks.forEach(function(week) {
        const gunler = gnGetHaftaGunleri(week);
        gunler.forEach(function(g, idx) {
            if (idx === 2) return; // Pazar günlerini atla
            expected++;
            if (gnData[g] && gnData[g][ship] === true) responded++;
        });
    });
    return expected > 0 ? (responded / expected) * 100 : 0;
}

function getShipAylikRateForMode(ship, mode) {
    let months = [];
    if (mode === 'haftalik') months = window.committedMonths_haftalik || [];
    else if (mode === 'aylik') months = window.committedMonths_aylik || [];
    else months = window.committedMonths_alltime || [];

    if (!months || months.length === 0) return getShipAylikRate(ship);

    let total = 0;
    months.forEach(m => {
        const mData = aylikData[m] || {};
        const shipData = mData[ship] || {};
        let count = 0;
        const currentItems = getAylikItems(m);
   currentItems.forEach(item => { if(shipData[item] === true || String(shipData[item]).toLowerCase() === 'true') count++; });
        total += (count / currentItems.length) * 100;
    });
    return total / months.length;
}
// --- TECHNICAL DEPARTMAN HESAPLAMALARI ---
const TECH_WEEKLY_ITEMS = ["Water Test", "On Board Lub Oil"];
const TECH_MONTHLY_ITEMS = ["ME Overhaul", "DG Overhaul", "Purifier Overhaul", "DG Performance", "Monthly Reports", "ME Performance"];

function getShipTechWeeklyRateForMode(ship, mode) {
  let weeks = [];
  if (mode === 'haftalik') weeks = window.committedTechWeeks_haftalik || [];
  else if (mode === 'aylik') weeks = window.committedTechWeeks_aylik || [];
  else weeks = window.committedTechWeeks_alltime || [];
  
  if (!weeks || weeks.length === 0) weeks = [window.gnCurrentFriday];

  let total = 0;
  weeks.forEach(w => {
      const shipData = (techWeeklyData[w] || {})[ship] || {};
      let count = 0, expected = TECH_WEEKLY_ITEMS.length;
      TECH_WEEKLY_ITEMS.forEach(item => { 
          if(shipData[item] === 'yes') count++; 
          else if(shipData[item] === 'muaf') expected--; // Muafsa hesaptan düş
      });
      total += expected > 0 ? (count / expected) * 100 : 100;
  });
  return total / weeks.length;
}

function getShipTechMonthlyRateForMode(ship, mode) {
  let months = [];
  if (mode === 'haftalik') months = window.committedTechMonths_haftalik || [];
  else if (mode === 'aylik') months = window.committedTechMonths_aylik || [];
  else months = window.committedTechMonths_alltime || [];
  
  if (!months || months.length === 0) {
      const shipData = (techMonthlyData[window.aylikCurrentMonth] || {})[ship] || {};
      let count = 0, expected = TECH_MONTHLY_ITEMS.length;
      TECH_MONTHLY_ITEMS.forEach(item => { 
          if(shipData[item] === 'yes') count++; 
          else if(shipData[item] === 'muaf') expected--;
      });
      return expected > 0 ? (count / expected) * 100 : 100;
  }

  let total = 0;
  months.forEach(m => {
      const shipData = (techMonthlyData[m] || {})[ship] || {};
      let count = 0, expected = TECH_MONTHLY_ITEMS.length;
      TECH_MONTHLY_ITEMS.forEach(item => { 
          if(shipData[item] === 'yes') count++; 
          else if(shipData[item] === 'muaf') expected--;
      });
      total += expected > 0 ? (count / expected) * 100 : 100;
  });
  return total / months.length;
}
// --- SADECE OPERASYON DEPARTMANI HESAPLAMASI (ENSPEKTÖRLER İÇİN) ---
// --- SADECE OPERASYON DEPARTMANI HESAPLAMASI (ENSPEKTÖRLER İÇİN) ---
function getShipOpsFinalRateForMode(ship, mode) {
  let opsMail = getShipMailRate(ship);
  let opsDaily = getShipDailyRateForMode(ship, mode);
  let opsMonthly = getShipAylikRateForMode(ship, mode);
  
  let baseScore;
  // Haftalık moddaysa sadece Mail ve Günlük Rapor toplanıp 2'ye bölünür
  if (mode === 'haftalik') {
      baseScore = (opsMail + opsDaily) / 2;
  } else {
      // Diğer modlarda aylık dahil 3'e bölünür
      baseScore = (opsMail + opsDaily + opsMonthly) / 3;
  }
  
  return baseScore + getOverdueBonus(ship, mode) + getComplianceBonus(ship) + getDrillBonus(ship);
}

function getShipFinalRateForMode(ship, mode) {
    let opsMail = getShipMailRate(ship);
    let opsDaily = getShipDailyRateForMode(ship, mode);
    let opsMonthly = getShipAylikRateForMode(ship, mode);
    let techWeekly = getShipTechWeeklyRateForMode(ship, mode);
    let techMonthly = getShipTechMonthlyRateForMode(ship, mode);
    
    let baseScore;
    // Haftalık moddaysa sadece Mail, Günlük Rapor ve Tech Weekly toplanıp 3'e bölünür
    if (mode === 'haftalik') {
        baseScore = (opsMail + opsDaily + techWeekly) / 3;
    } else {
        // Diğer modlarda 5 departman kriteri dahil edilip 5'e bölünür
        baseScore = (opsMail + opsDaily + opsMonthly + techWeekly + techMonthly) / 5;
    }
    
    return baseScore + getOverdueBonus(ship, mode) + getComplianceBonus(ship) + getDrillBonus(ship);
}

function getSortedShips(gemilerListesi, mode) {
    const m = mode || rankingMode;
    return[...(gemilerListesi || filo)].sort((a, b) => {
        const rA = getShipFinalRateForMode(a, m);
        const rB = getShipFinalRateForMode(b, m);
        const diff = rB - rA;
        if (diff !== 0) return diff;
        return a.localeCompare(b);
    });
}

function calculateCurrentRanks(gemilerListesi) {
    const sorted = getSortedShips(gemilerListesi || filo);
    const ranks = {};
    sorted.forEach((g, i) => ranks[g] = i + 1);
    return ranks;
}


// 1. SİLME İŞLEMİ
function removeCommitted(type, target, val) {
    if(!confirm(`⚠️ ${val} tarihini "${target}" istatistiğinden çıkarmak istediğinize emin misiniz?`)) return;
    var key = type === 'week' ? 'committedWeeks_' + target : 'committedMonths_' + target;
    if (window[key]) {
        window[key] = window[key].filter(function(item) { return item !== val; });
        _saveDataActual(); // ANINDA KAYDET
        renderCommittedLists();
        if (currentView === 'ranking') renderRankingView(filo);
    }
}

// 2. HAFTALIK İSTATİSTİK EKLEME
function commitOverdueTo(target) {
    if(!confirm("Güncel overdue verisini '" + target + "' sıralamasına snapshot olarak kaydetmek istiyor musunuz?")) return;
    
    // Veriyi kopyala ve içine tarihi iliştir
    const snapshotData = JSON.parse(JSON.stringify(overdueJobs));
    snapshotData._snapshotDate = new Date().toLocaleDateString('tr-TR'); 
    
    overdueSnapshots[target] = snapshotData;
    
    _saveDataActual(); // ANINDA KAYDET
    renderOverdueCommittedList();
    buildTable();
    alert("✅ Overdue snapshot → " + target + " sıralamasına kaydedildi.");
}
// Overdue Snapshot Silme Fonksiyonu
function removeOverdueSnapshot(target) {
    if(!confirm(`⚠️ '${target}' sıralamasındaki overdue snapshot kaydını silmek istediğinize emin misiniz?`)) return;
    
    overdueSnapshots[target] = null; // Snapshot'ı temizle (canlı veriye geri döner)
    
    _saveDataActual(); // Değişikliği anında buluta kaydet
    renderOverdueCommittedList(); // Listeyi ekranda yenile
    if (currentView === 'ranking') buildTable(); // Sıralamayı anında güncelle
}
function renderOverdueCommittedList() {
    var div = document.getElementById('overdueCommittedList');
    if(!div) return;
    var html = '<div style="display:flex;gap:1rem;margin-top:10px;background:rgba(0,0,0,0.2);padding:15px;border-radius:12px;border:1px solid var(--border);flex-wrap:wrap;">';
    
    ['haftalik','aylik','alltime'].forEach(function(mode) {
        var colors = {haftalik:'#f0a500', aylik:'#9b72cf', alltime:'#00d8c8'};
        var labels = {haftalik:'📅 Haftalık', aylik:'🗓 Aylık', alltime:'🏆 All Time'};
        var snap = overdueSnapshots[mode];
        
        var status = '';
        if (snap) {
            // Eğer tarih etiketi varsa onu yaz, yoksa eski kayıtlar için 'Tarih Yok' yaz
            var dateStr = snap._snapshotDate || "Kayıtlı";
            status = `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.05); padding:4px 8px; border-radius:6px; transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(255,90,114,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                <span style="color:var(--ok); font-family:'DM Mono'; font-size:0.75rem;">✅ ${dateStr}</span>
                <button onclick="removeOverdueSnapshot('${mode}')" style="background:transparent; border:none; color:var(--bad); cursor:pointer; font-size:0.8rem; display:flex; align-items:center; justify-content:center;" title="Bu snapshot'ı kaldır">✕</button>
            </div>`;
        } else {
            status = '<span style="color:var(--muted); font-size:0.7rem; padding-left:4px;">Henüz kaydedilmedi</span>';
        }

        html += '<div style="flex:1;min-width:150px;"><div style="color:'+colors[mode]+';font-weight:700;margin-bottom:8px;border-bottom:1px solid '+colors[mode]+'44;padding-bottom:6px;">'+labels[mode]+'</div>'+status+'</div>';
    });
    
    html += '</div>';
    div.innerHTML = html;
}
function commitWeekTo(target) {
    var w = window.gnCurrentFriday;
    if (!w) { alert("Aktif hafta bulunamadı."); return; }
    var key = 'committedWeeks_' + target;
    if (!window[key]) window[key] = [];
    if (window[key].includes(w)) { alert("Bu hafta zaten eklendi: " + w); return; }
    window[key].push(w);
    _saveDataActual(); // ANINDA KAYDET
    renderCommittedLists();
    alert("✅ " + w + " → " + target + " istatistiğine eklendi.");
}

// 3. AYLIK İSTATİSTİK EKLEME
function commitMonthTo(target) {
    var m = window.aylikCurrentMonth;
    if (!m) { alert("Aktif ay bulunamadı."); return; }
    var key = 'committedMonths_' + target;
    if (!window[key]) window[key] = [];
    if (window[key].includes(m)) { alert("Bu ay zaten eklendi: " + m); return; }
    window[key].push(m);
    _saveDataActual(); // ANINDA KAYDET
    renderCommittedLists();
    alert("✅ " + m + " → " + target + " istatistiğine eklendi.");
}
// 4. LİSTELERİ EKRANA BASMA (SİLME BUTONLU)
function renderCommittedLists() {
    var wDiv = document.getElementById('committedWeeksList');
    var mDiv = document.getElementById('committedMonthsList');
    if (!wDiv || !mDiv) return;

    var renderItems = function(arr, type, target) {
        if (!arr || arr.length === 0) return '<span style="color:var(--muted); font-size:0.7rem; padding-left:4px;">Henüz kayıt yok</span>';
        return arr.map(function(val) {
            return `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.05); padding:4px 8px; border-radius:6px; margin-bottom:5px; transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(255,90,114,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                <span style="color:var(--ok); font-family:'DM Mono'; font-size:0.75rem;">${val}</span>
                <button onclick="removeCommitted('${type}', '${target}', '${val}')" style="background:transparent; border:none; color:var(--bad); cursor:pointer; font-size:0.8rem; display:flex; align-items:center; justify-content:center;" title="Bu kaydı kaldır">✕</button>
            </div>`;
        }).join('');
    };

    var wHaftalik = window.committedWeeks_haftalik || [];
    var wAylik    = window.committedWeeks_aylik || [];
    var wAlltime  = window.committedWeeks_alltime || [];

    wDiv.innerHTML = `
        <div style="display:flex; gap:1rem; margin-top:10px; background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border:1px solid var(--border); flex-wrap:wrap;">
            <div style="flex:1; min-width:150px;">
                <div style="color:#f0a500; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(240,165,0,0.3); padding-bottom:6px;">📅 Haftalık Kategori</div>
                ${renderItems(wHaftalik, 'week', 'haftalik')}
            </div>
            <div style="flex:1; min-width:150px;">
                <div style="color:#9b72cf; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(155,114,207,0.3); padding-bottom:6px;">🗓 Aylık Kategori</div>
                ${renderItems(wAylik, 'week', 'aylik')}
            </div>
            <div style="flex:1; min-width:150px;">
                <div style="color:#00d8c8; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(0,216,200,0.3); padding-bottom:6px;">🏆 All Time Kategori</div>
                ${renderItems(wAlltime, 'week', 'alltime')}
            </div>
        </div>
    `;

    var mHaftalik = window.committedMonths_haftalik || [];
    var mAylik    = window.committedMonths_aylik || [];
    var mAlltime  = window.committedMonths_alltime || [];

    mDiv.innerHTML = `
        <div style="display:flex; gap:1rem; margin-top:10px; background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border:1px solid var(--border); flex-wrap:wrap;">
            <div style="flex:1; min-width:150px;">
                <div style="color:#f0a500; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(240,165,0,0.3); padding-bottom:6px;">📅 Haftalık Kategori</div>
                ${renderItems(mHaftalik, 'month', 'haftalik')}
            </div>
            <div style="flex:1; min-width:150px;">
                <div style="color:#9b72cf; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(155,114,207,0.3); padding-bottom:6px;">🗓 Aylık Kategori</div>
                ${renderItems(mAylik, 'month', 'aylik')}
            </div>
            <div style="flex:1; min-width:150px;">
                <div style="color:#00d8c8; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(0,216,200,0.3); padding-bottom:6px;">🏆 All Time Kategori</div>
                ${renderItems(mAlltime, 'month', 'alltime')}
            </div>
        </div>
    `;
}
// TEKNİK DEPARTMAN İÇİN LİSTEYE EKLEME/ÇIKARMA FONKSİYONLARI
function commitTechWeekTo(target) {
  var w = document.getElementById('adminTechWeeklyDate') ? document.getElementById('adminTechWeeklyDate').value : window.gnCurrentFriday;
  if (!w) { alert("Aktif hafta bulunamadı."); return; }
  var key = 'committedTechWeeks_' + target;
  if (!window[key]) window[key] = [];
  if (window[key].includes(w)) { alert("Bu hafta zaten eklendi: " + w); return; }
  window[key].push(w);
  _saveDataActual();
  renderTechCommittedLists();
  alert("✅ " + w + " → Tech Weekly " + target + " istatistiğine eklendi.");
}

function commitTechMonthTo(target) {
  var m = document.getElementById('adminTechMonthlyDate') ? document.getElementById('adminTechMonthlyDate').value : window.aylikCurrentMonth;
  if (!m) { alert("Aktif ay bulunamadı."); return; }
  var key = 'committedTechMonths_' + target;
  if (!window[key]) window[key] = [];
  if (window[key].includes(m)) { alert("Bu ay zaten eklendi: " + m); return; }
  window[key].push(m);
  _saveDataActual();
  renderTechCommittedLists();
  alert("✅ " + m + " → Tech Monthly " + target + " istatistiğine eklendi.");
}

function removeTechCommitted(type, target, val) {
  if(!confirm(`⚠️ ${val} tarihini "${target}" istatistiğinden çıkarmak istediğinize emin misiniz?`)) return;
  var key = type === 'week' ? 'committedTechWeeks_' + target : 'committedTechMonths_' + target;
  if (window[key]) {
      window[key] = window[key].filter(function(item) { return item !== val; });
      _saveDataActual(); 
      renderTechCommittedLists();
      if (currentView === 'ranking') renderRankingView(filo);
  }
}

function renderTechCommittedLists() {
  var wDiv = document.getElementById('committedTechWeeksList');
  var mDiv = document.getElementById('committedTechMonthsList');
  
  var renderItems = function(arr, type, target) {
      if (!arr || arr.length === 0) return '<span style="color:var(--muted); font-size:0.7rem; padding-left:4px;">Henüz kayıt yok</span>';
      return arr.map(function(val) {
          return `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.05); padding:4px 8px; border-radius:6px; margin-bottom:5px; transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(255,90,114,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
              <span style="color:var(--ok); font-family:'DM Mono'; font-size:0.75rem;">${val}</span>
              <button onclick="removeTechCommitted('${type}', '${target}', '${val}')" style="background:transparent; border:none; color:var(--bad); cursor:pointer; font-size:0.8rem; display:flex; align-items:center; justify-content:center;" title="Bu kaydı kaldır">✕</button>
          </div>`;
      }).join('');
  };

  if(wDiv) {
      wDiv.innerHTML = `
      <div style="display:flex; gap:1rem; margin-top:10px; background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border:1px solid var(--border); flex-wrap:wrap;">
          <div style="flex:1; min-width:150px;">
              <div style="color:#f0a500; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(240,165,0,0.3); padding-bottom:6px;">📅 Haftalık Kategori</div>
              ${renderItems(window.committedTechWeeks_haftalik, 'week', 'haftalik')}
          </div>
          <div style="flex:1; min-width:150px;">
              <div style="color:#9b72cf; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(155,114,207,0.3); padding-bottom:6px;">🗓 Aylık Kategori</div>
              ${renderItems(window.committedTechWeeks_aylik, 'week', 'aylik')}
          </div>
          <div style="flex:1; min-width:150px;">
              <div style="color:#00d8c8; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(0,216,200,0.3); padding-bottom:6px;">🏆 All Time Kategori</div>
              ${renderItems(window.committedTechWeeks_alltime, 'week', 'alltime')}
          </div>
      </div>`;
  }

  if(mDiv) {
      mDiv.innerHTML = `
      <div style="display:flex; gap:1rem; margin-top:10px; background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border:1px solid var(--border); flex-wrap:wrap;">
          <div style="flex:1; min-width:150px;">
              <div style="color:#f0a500; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(240,165,0,0.3); padding-bottom:6px;">📅 Haftalık Kategori</div>
              ${renderItems(window.committedTechMonths_haftalik, 'month', 'haftalik')}
          </div>
          <div style="flex:1; min-width:150px;">
              <div style="color:#9b72cf; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(155,114,207,0.3); padding-bottom:6px;">🗓 Aylık Kategori</div>
              ${renderItems(window.committedTechMonths_aylik, 'month', 'aylik')}
          </div>
          <div style="flex:1; min-width:150px;">
              <div style="color:#00d8c8; font-weight:700; margin-bottom:10px; border-bottom:1px solid rgba(0,216,200,0.3); padding-bottom:6px;">🏆 All Time Kategori</div>
              ${renderItems(window.committedTechMonths_alltime, 'month', 'alltime')}
          </div>
      </div>`;
  }
}




// ══════════════════════════════════════════════════════
//  AYLIK RAPORLAR SİSTEMİ
// ══════════════════════════════════════════════════════

function changeAylikMonth(val) {
    if(!val) return;
    window.aylikCurrentMonth = val;
    // BURAYA EKLE:
    const lbl = document.getElementById('aylikMonthLabel');
    if(lbl) lbl.textContent = new Date(val.split('-')[0], val.split('-')[1]-1, 1).toLocaleDateString('en-US', {month:'long', year:'numeric'});
    // KADAR
    if(currentView === 'aylik') renderAylikView();
    if(currentView === 'ranking') renderRankingView(filo);
}


function renderAylikView() {
    const currentItems = getAylikItems(window.aylikCurrentMonth);
    let head = `<tr><th class="ship-th" style="min-width:100px;">VESSEL</th>`;
    currentItems.forEach(item => {
        head += `<th style="text-align:center;"><span style="display:block;font-family:'Outfit';font-weight:700;font-size:0.65rem;">${item}</span></th>`;
    });
    head += `<th style="text-align:center;min-width:120px;">MONTHLY RATIO</th></tr>`;

    let body = '';
    const mData = aylikData[window.aylikCurrentMonth] || {};
    
    filo.forEach(ship => {
        let cells = ''; let count = 0;
        const shipData = mData[ship] || {};
        currentItems.forEach(item => {
            const reported = shipData[item] === true || String(shipData[item]).toLowerCase() === 'true';
            if(reported) count++;
            cells += reported
                ? `<td style="text-align:center;"><span style="color:var(--ok);font-size:1.1rem;text-shadow:0 0 8px rgba(0,240,184,0.5)">✓</span></td>`
                : `<td style="text-align:center;"><span style="color:rgba(255,90,114,0.35);font-size:1rem;">✗</span></td>`;
        });
        const oran = Math.round(count / currentItems.length * 100);
        const statCls = oran >= 80 ? 'ok' : oran >= 40 ? 'warn' : 'bad';
        body += `<tr data-gemi="${ship}" data-status="${statCls}">
            <td class="ship-col"><span class="ship-tag">${ship}</span></td>
            ${cells}
            <td>
                <div class="rate-pill rate-${statCls}" style="justify-content:center;gap:6px;">
                    <div class="mini-bg" style="flex:1;"><div class="mini-fill" style="width:${oran}%"></div></div>
                    <span class="rate-num">${count}/${currentItems.length}</span>
                </div>
            </td>
        </tr>`;
    });

    document.getElementById('tableHead').innerHTML = head;
    document.getElementById('tableBody').innerHTML = body;

    const rc = document.getElementById('resultCount');
    if(rc) rc.textContent = '';
}
function renderAdminAylik() {
    const val = document.getElementById('adminAylikMonth').value;
    if(!val) return;
    window.aylikCurrentMonth = val; 
    document.getElementById('aylikMonthSelect').value = val;

    const currentItems = getAylikItems(val);
    const mData = aylikData[val] || {};
    let head = `<tr style="border-bottom:1px solid var(--border2);"><th style="text-align:left;padding:0.6rem 1rem;font-family:'DM Mono';font-size:0.6rem;color:var(--muted);">VESSEL</th>`;
    currentItems.forEach(item => {
        head += `<th style="text-align:center;padding:0.6rem 0.5rem;font-family:'DM Mono';font-size:0.55rem;color:var(--muted);">${item}</th>`;
    });
    head += '</tr>';

    let body = '';
    filo.forEach(ship => {
        let cells = '';
        const shipData = mData[ship] || {};
        currentItems.forEach(item => {
            const checked = shipData[item] === true;
            cells += `<td style="text-align:center;padding:0.4rem 0.5rem;"><div class="ship-check ${checked?'checked':''}" style="display:inline-block;width:70px;padding:0.35rem 0.5rem;font-size:0.7rem;" onclick="toggleAdminAylik('${val}','${ship}','${item}',this)">${checked ? '✓ YAPTI' : '✗ YOK'}</div></td>`;
        });
        body += `<tr style="border-bottom:1px solid rgba(0,216,200,0.06);"><td style="padding:0.5rem 1rem;font-family:'DM Mono';font-size:0.8rem;font-weight:500;color:var(--text);">${ship}</td>${cells}</tr>`;
    });

    document.getElementById('adminAylikTableContainer').innerHTML = `<table style="width:100%;border-collapse:collapse;min-width:800px;"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
function toggleAdminAylik(month, ship, item, el) {
    if(!aylikData[month]) aylikData[month] = {};
    if(!aylikData[month][ship]) aylikData[month][ship] = {};
    
    const cur = aylikData[month][ship][item] === true;
    aylikData[month][ship][item] = !cur;
    
    el.className = `ship-check ${!cur ? 'checked' : ''}`;
    el.textContent = !cur ? '✓ YAPTI' : '✗ YOK';
    
    localStorage.setItem('aylikRaporlar_v1', JSON.stringify(aylikData));
    
    // BURADAKİ saveData(); SATIRINI SİLDİK. Artık her tikte bulutu yormayacak.
    
    if(currentView === 'aylik') renderAylikView();
}
function saveAdminAylik() {
    // 1. Bekleme sayacını iptal et
    if (typeof _saveDataTimer !== 'undefined' && _saveDataTimer) {
        clearTimeout(_saveDataTimer);
    }
    
    // 2. Eski dosyadaki (index 6) gibi veriyi HİÇ BEKLEMEDEN Google'a fırlat
    _saveDataActual(); 
    
    // 3. Uyarı mesajını, verinin buluta ulaşması için yeterli süreyi tanıdıktan sonra göster
    setTimeout(() => {
        alert('✓ Aylık raporlar başarıyla kaydedildi.');
    }, 800);
}
// --- TECHNICAL ADMIN FONKSİYONLARI ---

function renderAdminTechWeekly() {
  const w = document.getElementById('adminTechWeeklyDate').value;
  if(!w) return;
  const wData = techWeeklyData[w] || {};
  let head = `<tr style="border-bottom:1px solid var(--border2);"><th style="text-align:left;padding:0.6rem 1rem;font-family:'DM Mono';font-size:0.6rem;color:var(--muted);">VESSEL</th>`;
  TECH_WEEKLY_ITEMS.forEach(item => { head += `<th style="text-align:center;padding:0.6rem 0.5rem;font-family:'DM Mono';font-size:0.55rem;color:var(--muted);">${item}</th>`; });
  head += '</tr>';

  let body = '';
  filo.forEach(ship => {
      let cells = '';
      const shipData = wData[ship] || {};
      TECH_WEEKLY_ITEMS.forEach(item => {
          let val = shipData[item];
          let cls = 'ship-check'; let txt = '✗ YOK';
          if(val === 'yes') { cls = 'ship-check checked'; txt = '✓ YAPTI'; }
          else if(val === 'muaf') { cls = 'ship-check exempt'; txt = '⊘ MUAF'; }
          cells += `<td style="text-align:center;padding:0.4rem 0.5rem;"><div class="${cls}" style="display:inline-block;width:70px;padding:0.35rem 0.5rem;font-size:0.7rem;cursor:pointer;" onclick="toggleTechWeekly('${w}','${ship}','${item}',this)">${txt}</div></td>`;
      });
      body += `<tr style="border-bottom:1px solid rgba(0,216,200,0.06);"><td style="padding:0.5rem 1rem;font-family:'DM Mono';font-size:0.8rem;font-weight:500;color:var(--text);">${ship}</td>${cells}</tr>`;
  });
  document.getElementById('adminTechWeeklyTable').innerHTML = `<table style="width:100%;border-collapse:collapse;min-width:400px;"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function toggleTechWeekly(week, ship, item, el) {
  if(!techWeeklyData[week]) techWeeklyData[week] = {};
  if(!techWeeklyData[week][ship]) techWeeklyData[week][ship] = {};
  
  const cur = techWeeklyData[week][ship][item];
  if(cur === 'yes') {
      techWeeklyData[week][ship][item] = 'muaf';
      el.className = 'ship-check exempt'; el.textContent = '⊘ MUAF';
  } else if(cur === 'muaf') {
      techWeeklyData[week][ship][item] = 'no';
      el.className = 'ship-check'; el.textContent = '✗ YOK';
  } else {
      techWeeklyData[week][ship][item] = 'yes';
      el.className = 'ship-check checked'; el.textContent = '✓ YAPTI';
  }
}

function saveAdminTechWeekly() {
  saveData();
  setTimeout(() => { alert('✓ Technical Weekly Raporları başarıyla kaydedildi.'); }, 500);
}

function renderAdminTechMonthly() {
  const m = document.getElementById('adminTechMonthlyDate').value;
  if(!m) return;
  const mData = techMonthlyData[m] || {};
  let head = `<tr style="border-bottom:1px solid var(--border2);"><th style="text-align:left;padding:0.6rem 1rem;font-family:'DM Mono';font-size:0.6rem;color:var(--muted);">VESSEL</th>`;
  TECH_MONTHLY_ITEMS.forEach(item => { head += `<th style="text-align:center;padding:0.6rem 0.5rem;font-family:'DM Mono';font-size:0.55rem;color:var(--muted);">${item}</th>`; });
  head += '</tr>';

  let body = '';
  filo.forEach(ship => {
      let cells = '';
      const shipData = mData[ship] || {};
      TECH_MONTHLY_ITEMS.forEach(item => {
          let val = shipData[item];
          let cls = 'ship-check'; let txt = '✗ YOK';
          if(val === 'yes') { cls = 'ship-check checked'; txt = '✓ YAPTI'; }
          else if(val === 'muaf') { cls = 'ship-check exempt'; txt = '⊘ MUAF'; }
          cells += `<td style="text-align:center;padding:0.4rem 0.5rem;"><div class="${cls}" style="display:inline-block;width:70px;padding:0.35rem 0.5rem;font-size:0.7rem;cursor:pointer;" onclick="toggleTechMonthly('${m}','${ship}','${item}',this)">${txt}</div></td>`;
      });
      body += `<tr style="border-bottom:1px solid rgba(0,216,200,0.06);"><td style="padding:0.5rem 1rem;font-family:'DM Mono';font-size:0.8rem;font-weight:500;color:var(--text);">${ship}</td>${cells}</tr>`;
  });
  document.getElementById('adminTechMonthlyTable').innerHTML = `<table style="width:100%;border-collapse:collapse;min-width:600px;"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function toggleTechMonthly(month, ship, item, el) {
  if(!techMonthlyData[month]) techMonthlyData[month] = {};
  if(!techMonthlyData[month][ship]) techMonthlyData[month][ship] = {};
  
  const cur = techMonthlyData[month][ship][item];
  if(cur === 'yes') {
      techMonthlyData[month][ship][item] = 'muaf';
      el.className = 'ship-check exempt'; el.textContent = '⊘ MUAF';
  } else if(cur === 'muaf') {
      techMonthlyData[month][ship][item] = 'no';
      el.className = 'ship-check'; el.textContent = '✗ YOK';
  } else {
      techMonthlyData[month][ship][item] = 'yes';
      el.className = 'ship-check checked'; el.textContent = '✓ YAPTI';
  }
}

function saveAdminTechMonthly() {
  saveData();
  setTimeout(() => { alert('✓ Technical Monthly Raporları başarıyla kaydedildi.'); }, 500);
}
// ══════════════════════════════════════════════════════
//  OVERDUE JOBS STATICS SİSTEMİ
// ══════════════════════════════════════════════════════


function renderAdminOverdue() {
    let html = `<table style="width:100%; text-align:left; border-collapse:collapse; min-width: 600px;">
        <thead>
            <tr style="border-bottom:1px solid var(--border2);">
                <th style="padding:10px; color:var(--muted); font-family:'DM Mono'; font-size:0.75rem;">VESSEL</th>
                <th style="padding:10px; color:var(--bad); font-family:'DM Mono'; font-size:0.75rem;">CRITICAL JOB</th>
                <th style="padding:10px; color:var(--warn); font-family:'DM Mono'; font-size:0.75rem;">IMPORTANT JOB</th>
                <th style="padding:10px; color:var(--teal); font-family:'DM Mono'; font-size:0.75rem;">OTHER JOB</th>
            </tr>
        </thead>
        <tbody>`;
    
    filo.forEach(ship => {
        const d = overdueJobs[ship] || {critical:0, important:0, other:0};
        html += `<tr style="border-bottom:1px solid rgba(0,216,200,0.06);">
            <td style="padding:10px; font-weight:700; color:var(--text); font-family:'DM Mono';">${ship}</td>
            <td style="padding:10px;"><input type="number" min="0" id="od_c_${ship}" class="admin-input" style="width:100px; text-align:center;" value="${d.critical}"></td>
            <td style="padding:10px;"><input type="number" min="0" id="od_i_${ship}" class="admin-input" style="width:100px; text-align:center;" value="${d.important}"></td>
            <td style="padding:10px;"><input type="number" min="0" id="od_o_${ship}" class="admin-input" style="width:100px; text-align:center;" value="${d.other}"></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('adminOverdueTableContainer').innerHTML = html;
}
function renderAdminCompliance() {
  let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:0.6rem;">`;
  
  filo.forEach(ship => {
      const val = complianceBonus[ship] || 0;
      
      html += `<div style="background:rgba(0,0,0,0.2); border:1px solid rgba(0,216,200,0.15); padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; transition: border-color 0.2s;" onmouseover="this.style.borderColor='var(--teal)'" onmouseout="this.style.borderColor='rgba(0,216,200,0.15)'">
          <span style="font-family:'DM Mono'; font-size:0.75rem; font-weight:700; color:var(--text);">${ship}</span>
          <input type="number" step="0.1" id="comp_input_${ship}" class="admin-input" style="width:70px; text-align:center; padding:4px;" value="${val}" placeholder="0">
      </div>`;
  });
  
 html += `</div>`;
  
  const container = document.getElementById('adminComplianceTableContainer');
  if(container) container.innerHTML = html;
}
// --- DRILL QUALITY BONUS SİSTEMİ ---

function getDrillTextObj(val) {
  switch(val) {
      case 8: return {text: "EXCELLENT", color: "var(--teal)"};
      case 6: return {text: "VERY GOOD", color: "var(--ok)"};
      case 3: return {text: "ACCEPTABLE", color: "#a5d6a7"};
      case 0: return {text: "NOT ASSESSED", color: "var(--muted)"};
      case -3: return {text: "NOT SATISFACTORY", color: "var(--warn)"};
      case -6: return {text: "POOR", color: "#ff8a65"};
      case -8: return {text: "VERY POOR", color: "var(--bad)"};
      default: return {text: "NOT ASSESSED", color: "var(--muted)"};
  }
}

function renderDrillView() {
  const container = document.getElementById('viewDrillContent');
  if(!container) return;

  const sorted = [...filo].sort((a,b) => {
      const dA = drillBonus[a] || 0;
      const dB = drillBonus[b] || 0;
      if(dB !== dA) return dB - dA;
      return a.localeCompare(b);
  });

  let html = `
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem;">
      <div>
          <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.14em;color:var(--muted);margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span style="display:block;width:14px;height:1px;background:linear-gradient(90deg,var(--teal),var(--gold));"></span>
              Drill Quality Statics
          </div>
          <div style="font-family:'DM Mono';font-size:0.65rem;color:rgba(150,210,200,0.5);">Gemilerin talim kalitesi puanlaması</div>
      </div>
  </div>
  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:1rem;">`;

  sorted.forEach(ship => {
      const val = drillBonus[ship] || 0;
      const info = getDrillTextObj(val);
      const sign = val > 0 ? "+" : "";

      html += `
      <div style="padding:1.5rem; background:var(--glass); border:1px solid var(--border); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <div style="font-family:'DM Mono';font-size:1.1rem;font-weight:700;color:var(--text);">${ship}</div>
          <div style="font-family:'Outfit';font-size:1.1rem;font-weight:900;color:${info.color}; text-shadow:0 0 10px ${info.color}40; margin-top:0.5rem;">${info.text}</div>
          <div style="font-family:'DM Mono';font-size:1.5rem;font-weight:700;color:${info.color};">${sign}${val} <span style="font-size:0.6rem; color:var(--muted);">pts</span></div>
      </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderAdminDrill() {
  let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:0.6rem;">`;
  const options = [
      {val: 8, text: "Excellent (+8)"},
      {val: 6, text: "Very Good (+6)"},
      {val: 3, text: "Acceptable (+3)"},
      {val: 0, text: "Not Assessed (0)"},
      {val: -3, text: "Not Satisfactory (-3)"},
      {val: -6, text: "Poor (-6)"},
      {val: -8, text: "Very Poor (-8)"}
  ];

  filo.forEach(ship => {
      const currentVal = drillBonus[ship] || 0;
      let selectHtml = `<select id="drill_input_${ship}" class="admin-input" style="width:160px; padding:6px; font-size:0.75rem;">`;
      options.forEach(opt => {
          const sel = (currentVal === opt.val) ? "selected" : "";
          selectHtml += `<option value="${opt.val}" ${sel}>${opt.text}</option>`;
      });
      selectHtml += `</select>`;

      html += `<div style="background:rgba(0,0,0,0.2); border:1px solid rgba(0,216,200,0.15); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:'DM Mono'; font-size:0.8rem; font-weight:700; color:var(--text);">${ship}</span>
          ${selectHtml}
      </div>`;
  });
  html += `</div>`;
  
  const container = document.getElementById('adminDrillTableContainer');
  if(container) container.innerHTML = html;
}

function saveAdminDrill() {
  filo.forEach(ship => {
      const inputVal = document.getElementById(`drill_input_${ship}`).value;
      drillBonus[ship] = parseInt(inputVal) || 0;
  });
  localStorage.setItem('drillBonus_v1', JSON.stringify(drillBonus));
  saveData();
  alert('✅ Drill Quality Bonus verileri başarıyla kaydedildi.');
  if (currentView === 'ranking') renderRankingView(filo);
  if (currentView === 'drill') renderDrillView();
}
// toggleCompliancePenalty fonksiyonunu tamamen silebilirsin.

function saveAdminCompliance() {
  filo.forEach(ship => {
      const inputVal = document.getElementById(`comp_input_${ship}`).value;
      complianceBonus[ship] = parseFloat(inputVal) || 0;
  });
  
  localStorage.setItem('complianceBonus_v1', JSON.stringify(complianceBonus));
  saveData();
  alert('✅ Compliance Bonus / Penalty verileri başarıyla kaydedildi.');
  if (currentView === 'ranking') renderRankingView(filo);
}

function saveAdminOverdue() {
    filo.forEach(ship => {
        const c = parseInt(document.getElementById(`od_c_${ship}`).value) || 0;
        const i = parseInt(document.getElementById(`od_i_${ship}`).value) || 0;
        const o = parseInt(document.getElementById(`od_o_${ship}`).value) || 0;
        overdueJobs[ship] = { critical: c, important: i, other: o };
    });
    
    localStorage.setItem('overdueJobs_v1', JSON.stringify(overdueJobs));
    saveData(); 
    alert('🔧 Fleet Overdue Job Statics verileri kaydedildi.');
    
    if(currentView === 'overdue') renderOverdueView();
}
// === YENİ: MANUEL GRAFİK KAYDETME FONKSİYONU ===
// === YENİ: MANUEL GRAFİK KAYDETME FONKSİYONU ===
function manualSaveOverdueHistory() {
    const pass = prompt("Bu işlem o anki toplam overdue sayısını grafiğe işler.\nLütfen yönetici şifresini girin:", "");
    if (pass !== "1234") {
        if (pass !== null) alert("Hatalı şifre!");
        return;
    }
    
    let totalOverdue = 0;
    filo.forEach(ship => {
        const d = overdueJobs[ship] || {critical:0, important:0, other:0};
        totalOverdue += (d.critical + d.important + d.other);
    });

    const dateStr = new Date().toLocaleDateString('tr-TR');
    const existingIndex = overdueHistory.findIndex(item => item.date === dateStr);
    
    if (existingIndex === -1) {
        overdueHistory.push({ date: dateStr, total: totalOverdue });
    } else {
        overdueHistory[existingIndex].total = totalOverdue;
    }
    
    // GARANTİ DÜZELTME: Veriyi bulutun tanıdığı değişkene zorla eşitliyoruz.
    overdueSnapshots.history = overdueHistory; 
    
    renderOverdueView(); 
    
    if (typeof _saveDataTimer !== 'undefined' && _saveDataTimer) {
        clearTimeout(_saveDataTimer);
    }
    _saveDataActual(); 
    
    setTimeout(() => {
        alert("Başarılı! Güncel overdue toplamı grafiğe işlendi ve tüm departman için sisteme kaydedildi.");
    }, 800);
}

// ══════════════════════════════════════════════════════
//  DEFECT LİSTESİ SİSTEMİ
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  DEFECT LİSTESİ SİSTEMİ
// ══════════════════════════════════════════════════════

function renderDefectView() {
    const container = document.getElementById('defectViewContainer');
    if(!container) return;

    const sorted = [...filo].sort((a,b) => {
        const dA = (defectData[a] || {count:0}).count;
        const dB = (defectData[b] || {count:0}).count;
        return dB - dA;
    });

    const maxCount = Math.max(...sorted.map(g => (defectData[g]||{count:0}).count), 1);

    let html = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
        <div>
            <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.14em;color:var(--muted);margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                <span style="display:block;width:14px;height:1px;background:linear-gradient(90deg,var(--teal),var(--gold));"></span>
                Gemi Bazlı Defect Durumu
            </div>
            <div style="font-family:'DM Mono';font-size:0.65rem;color:rgba(150,210,200,0.5);">Son rapor tarihleri ile birlikte · ${sorted.length} gemi</div>
        </div>
    </div>
    <div style="display:flex; flex-direction:column; gap:0.75rem;">`;

    sorted.forEach((ship, idx) => {
        const d = defectData[ship] || { count: 0, date: '', note: '' };
        const pct = maxCount > 0 ? (d.count / maxCount * 100) : 0;
        const color = 'var(--teal)';
const gradColor = 'rgba(0, 216, 200, 0.8)';
const gradEnd = 'rgba(0, 160, 155, 0.4)';
        const noData = d.count === 0 && !d.date;

        html += `
        <div style="display:grid; grid-template-columns:120px 1fr auto; align-items:center; gap:1rem; padding:0.9rem 1.2rem; background:var(--glass); border:1px solid var(--border); border-radius:12px; backdrop-filter:blur(12px); transition:border-color 0.2s;" 
             onmouseover="this.style.borderColor='rgba(0,216,200,0.25)'" onmouseout="this.style.borderColor='var(--border)'">
            
            <div>
                <div style="font-family:'DM Mono';font-size:0.85rem;font-weight:700;color:var(--text);">${ship}</div>
                ${d.date ? `<div style="font-family:'DM Mono';font-size:0.6rem;color:var(--muted);margin-top:2px;">📅 ${d.date}</div>` : `<div style="font-family:'DM Mono';font-size:0.6rem;color:rgba(150,170,165,0.4);margin-top:2px;">Tarih yok</div>`}
                ${d.note ? `<div style="font-family:'DM Mono';font-size:0.58rem;color:var(--gold);margin-top:2px;">📝 ${d.note}</div>` : ''}
            </div>

            <div>
                <div style="height:12px;background:rgba(255,255,255,0.04);border-radius:100px;overflow:hidden;position:relative;">
                    <div style="height:100%;width:${noData?0:pct}%;background:linear-gradient(90deg,${gradColor},${gradEnd});border-radius:100px;transition:width 1s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 0 8px ${gradColor};"></div>
                </div>
                ${d.prevCount !== undefined ? `
                <div style="font-family:'Plus Jakarta Sans', sans-serif; font-size:0.65rem; color:rgba(255,255,255,0.7); margin-top:8px; letter-spacing:0.02em;">
                    Change compared to previous week: 
                    <span style="font-weight:700; color:${(d.count - d.prevCount) > 0 ? 'var(--bad)' : (d.count - d.prevCount) < 0 ? 'var(--ok)' : 'var(--muted)'};">
                        ${(d.count - d.prevCount) > 0 ? '+' + (d.count - d.prevCount) : (d.count - d.prevCount) < 0 ? (d.count - d.prevCount) : 'no change'}
                    </span>
                </div>` : ''}
            </div>

            <div style="text-align:right;min-width:60px;">
                ${noData 
                    ? `<span style="font-family:'DM Mono';font-size:0.65rem;color:rgba(150,170,165,0.4);">Veri yok</span>`
                    : `<span style="font-family:'DM Mono';font-size:1.6rem;font-weight:900;color:${color};line-height:1;text-shadow:0 0 12px ${gradColor};">${d.count}</span>
                       <div style="font-family:'DM Mono';font-size:0.55rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;">defect</div>`
                }
            </div>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderAdminDefect() {
    let html = `<table style="width:100%; text-align:left; border-collapse:collapse; min-width:600px;">
        <thead>
            <tr style="border-bottom:1px solid var(--border2);">
                <th style="padding:10px; color:var(--muted); font-family:'DM Mono'; font-size:0.75rem;">VESSEL</th>
                <th style="padding:10px; color:var(--warn); font-family:'DM Mono'; font-size:0.75rem;">DEFECT SAYISI</th>
                <th style="padding:10px; color:var(--teal); font-family:'DM Mono'; font-size:0.75rem;">SON RAPOR TARİHİ</th>
                <th style="padding:10px; color:var(--gold); font-family:'DM Mono'; font-size:0.75rem;">NOT</th>
            </tr>
        </thead>
        <tbody>`;
    
    filo.forEach(ship => {
        const d = defectData[ship] || { count: 0, date: '', note: '' };
        html += `<tr style="border-bottom:1px solid rgba(0,216,200,0.06);">
            <td style="padding:10px; font-weight:700; color:var(--text); font-family:'DM Mono';">${ship}</td>
            <td style="padding:10px;"><input type="number" min="0" id="df_c_${ship}" class="admin-input" style="width:100px; text-align:center;" value="${d.count}"></td>
            <td style="padding:10px;"><input type="text" id="df_d_${ship}" class="admin-input" placeholder="gg.aa.yyyy" style="width:130px; text-align:center;" value="${d.date}"></td>
            <td style="padding:10px;"><input type="text" id="df_n_${ship}" class="admin-input" placeholder="Not (isteğe bağlı)" style="width:200px;" value="${d.note}"></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('adminDefectTableContainer').innerHTML = html;
}

function saveAdminDefect() {
    filo.forEach(ship => {
        const count = parseInt(document.getElementById(`df_c_${ship}`)?.value) || 0;
        const date  = document.getElementById(`df_d_${ship}`)?.value?.trim() || '';
        const note  = document.getElementById(`df_n_${ship}`)?.value?.trim() || '';
        
        let oldD = defectData[ship] || {};
        let prevC = oldD.prevCount !== undefined ? oldD.prevCount : count;
        if (oldD.count !== undefined && oldD.count !== count) {
            prevC = oldD.count;
        }

        defectData[ship] = { count, prevCount: prevC, date, note };
    });
    localStorage.setItem('defectData_v1', JSON.stringify(defectData));
    saveData(); 
    alert('📋 Defect Listesi verileri kaydedildi.');
    if(currentView === 'defect') renderDefectView();
}



// ══════════════════════════════════════════════════════
//  PDF OLUŞTURMA — FİNAL VERSİYON (LANDSCAPE + DISCLAIMER)
// ══════════════════════════════════════════════════════

async function generatePDF() {
    // 1. PDF Yüklenme Ekranını Aç
    document.getElementById('pdfBtn').classList.add('loading');
    document.getElementById('pdfOverlay').classList.add('show');

    // 2. Kullanıcının O Anki Durumunu Hafızaya Al
    const originalView = currentView;
    const originalRankingMode = rankingMode;

    // 3. Sistemi zorla "All Time Top" moduna alıyoruz.
    rankingMode = 'alltime';

    // --- %100 ÇÖZÜM: RESMİ KODA GÖMMEK ---
    // AŞAĞIDAKİ TIRNAKLARIN İÇİNE KENDİ UZUN BASE64 KODUNU YAPIŞTIR
    const sparkLogoBase64 = "data:image/jpeg;base64,BURAYA_KOPYALADIGIN_UZUN_KODU_YAPISTIR";
    // jsPDF'i yatay (landscape), milimetre cinsinden, A4 boyutunda başlat
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    const pageWidth = 297; 
    const pageHeight = 210;

    // --- FOTOĞRAF ÇEKME VE OTOMATİK SAYFALAMA (PAGINATION) FONKSİYONU ---
    async function takeSnapshot(elementId, title, isFirstPage) {
        document.getElementById('pdfOverlayTab').textContent = title.toUpperCase() + " EKLENIYOR...";
        
        const el = document.getElementById(elementId);
        
        const originalOverflow = el.style.overflow || '';
        const originalMaxWidth = el.style.maxWidth || '';
        el.style.overflow = 'visible';
        el.style.maxWidth = 'none';
        
        // Fotoğraf Çekimi
        const canvas = await html2canvas(el, {
            scale: 1.5, 
            backgroundColor: '#0e1f22',
            useCORS: true,
            windowWidth: 1400,
            logging: false
        });
        
        el.style.overflow = originalOverflow;
        el.style.maxWidth = originalMaxWidth;

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const imgWidth = pageWidth - 20; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // YENİ: SAYFALAMA MATEMATİĞİ
        const topMargin = 22;
        const bottomMargin = 15;
        const maxImgHeight = pageHeight - topMargin - bottomMargin; // Sayfaya sığabilecek max resim boyu

        let heightLeft = imgHeight;
        let position = topMargin;
        let yOffset = 0;
        let firstIteration = true;

        // Resim boyu bitene kadar sayfaları bölerek bas
        while (heightLeft > 0) {
            if (!isFirstPage || !firstIteration) {
                pdf.addPage();
            }
            
            // Arka Plan Rengi
            pdf.setFillColor(14, 31, 34); 
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Başlık
            pdf.setTextColor(255, 255, 255);
            pdf.setFont("helvetica", "bold"); 
            pdf.setFontSize(14);
            let pageTitle = title.toUpperCase();
            if (!firstIteration) pageTitle += " (DEVAMI)"; // İkinci sayfaya taşıyorsa DEVAMI yazar
            pdf.text("FLEET PERFORMANCE REPORT - " + pageTitle, 10, 14);

            // --- SAĞ ÜST KÖŞEYE GÖMÜLÜ LOGO (Büyütülmüş Haliyle) ---
            if (sparkLogoBase64.length > 100) {
                pdf.addImage(sparkLogoBase64, 'JPEG', pageWidth - 50, 6, 40, 10);
            }
            
            // Resmi Ekle (Sadece ilgili kesit sayfada görünür, altı/üstü PDF sınırından kırpılır)
            pdf.addImage(imgData, 'JPEG', 10, position - yOffset, imgWidth, imgHeight);
            
            // Taşan resmin altını temizlemek için footer arkaplanını yeniden çiz
            pdf.setFillColor(14, 31, 34); 
            pdf.rect(0, pageHeight - bottomMargin, pageWidth, bottomMargin, 'F');

            // Alt Bilgi
            pdf.setTextColor(150, 210, 200); 
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "italic");
            const disclaimer = "CONFIDENTIALITY NOTICE: This document is strictly confidential and for internal company use only. It must not be shared with 3rd parties.";
            const textWidth = pdf.getTextWidth(disclaimer);
            pdf.text(disclaimer, (pageWidth - textWidth) / 2, pageHeight - 8);

            // Sonraki sayfa döngüsü için değerleri güncelle
            heightLeft -= maxImgHeight;
            yOffset += maxImgHeight;
            firstIteration = false;
        }
    }

    try {
        switchView('ranking');
        buildTable(filo); 
        await new Promise(r => setTimeout(r, 600)); 
        await takeSnapshot('matrisTable', 'General Ranking (All Time Top)', true);

        switchView('matrix');
        await new Promise(r => setTimeout(r, 600));
        await takeSnapshot('matrisTable', 'Feedback Matrix', false);

        switchView('gunluk');
        await new Promise(r => setTimeout(r, 600));
        await takeSnapshot('matrisTable', 'Daily Work Reports', false);

        switchView('aylik');
        await new Promise(r => setTimeout(r, 600));
        await takeSnapshot('matrisTable', 'Monthly Reports', false);

        switchView('techWeekly');
        await new Promise(r => setTimeout(r, 600));
        await takeSnapshot('matrisTable', 'Tech Weekly Reports', false);

        switchView('techMonthly');
        await new Promise(r => setTimeout(r, 600));
        await takeSnapshot('matrisTable', 'Tech Monthly Reports', false);

        switchView('defect');
        await new Promise(r => setTimeout(r, 600));
        await takeSnapshot('viewDefectContent', 'Defect List', false);
        switchView('drill');
await new Promise(r => setTimeout(r, 600));
await takeSnapshot('viewDrillContent', 'Drill Quality Bonus', false);

        // --- YENİ: OVERDUE TARİHSEL TABLOYU GİZLEME MÜDAHALESİ ---
        switchView('overdue');
        await new Promise(r => setTimeout(r, 800)); 
        
        const overdueContainer = document.getElementById('viewOverdueContent');
        const overdueChildren = Array.from(overdueContainer.children);
        const topChartDiv = overdueChildren[0]; 
        const originalMargin = topChartDiv.style.marginBottom;
        
        // Üst bar grafik hariç altındaki her şeyi (başlık, tarihsel grafik vs) gizle
        for (let i = 1; i < overdueChildren.length; i++) {
            overdueChildren[i].style.display = 'none';
        }
        topChartDiv.style.marginBottom = '0'; // Geriye kalan gereksiz boşluğu sil

        // Sadece temizlenmiş haliyle fotoğrafını çekiyoruz
        await takeSnapshot('viewOverdueContent', 'Overdue Jobs', false);

        // PDF çekimi biter bitmez web sitesindeki görünümü hemen geri getir
        for (let i = 1; i < overdueChildren.length; i++) {
            overdueChildren[i].style.display = '';
        }
        topChartDiv.style.marginBottom = originalMargin;
        // ------------------------------------------------------------

        // İŞLEM BİTTİ: PDF'i İndir
        document.getElementById('pdfOverlayTab').textContent = "PDF INDIRILIYOR...";
        pdf.save("Spark_Fleet_Performance_Report.pdf");

    } catch (error) {
        console.error("PDF Oluşturma Hatası:", error);
        alert("PDF oluşturulurken bir hata oluştu. Sayfayı yenileyip tekrar deneyin.");
    } finally {
        rankingMode = originalRankingMode;
        switchRankingMode(originalRankingMode);
        switchView(originalView);
        
        document.getElementById('pdfBtn').classList.remove('loading');
        document.getElementById('pdfOverlay').classList.remove('show');
    }
}
// SİSTEMİ BAŞLATAN KOMUTLAR
loadData(); 
document.getElementById('footerDate').textContent = new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});


  

function showVesselPscDetails(vesselName, btnEl) {
    document.querySelectorAll('.psc-vessel-btn').forEach(b => b.classList.remove('active'));
    if(btnEl) btnEl.classList.add('active');

    var container = document.getElementById('pscVesselDetailContainer');
    container.style.display = 'block';

    // FİLTRELİ VERİYİ ÇEKİYORUZ
    var vesselRecs = getFilteredPscRecords().filter(r => r.vessel === vesselName);

    var headerHtml = '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,216,200,0.2); padding-bottom:0.5rem; margin-bottom:1rem;">' +
                     '<h4 style="color:var(--teal); font-family:\'Plus Jakarta Sans\', sans-serif; font-size:1.1rem; margin:0;">' + vesselName + ' — PSC Records (' + vesselRecs.length + ')</h4>' +
                     '<button onclick="closeVesselPscDetails()" style="background:rgba(255,90,114,0.1); border:1px solid rgba(255,90,114,0.3); color:var(--bad); padding:4px 12px; border-radius:6px; cursor:pointer; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; font-weight:700; transition:all 0.2s;">Close ✕</button>' +
                     '</div>';

    if(vesselRecs.length === 0) {
        container.innerHTML = headerHtml + '<div style="color:var(--muted); font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.8rem; font-weight:500;">No PSC records found for this vessel in the selected period.</div>';
        return;
    }

    vesselRecs.sort((a, b) => parseTRDate(b.date) - parseTRDate(a.date));
    var detailHtml = headerHtml;

    vesselRecs.forEach(function(r) {
        var resultColor = r.result === 'clear' ? 'var(--ok)' : (r.result === 'remark' ? 'var(--warn)' : 'var(--bad)');
        var resultLabel = r.result.toUpperCase();
        var remCount = (r.remarks && r.remarks.length) ? r.remarks.length : 0;

        var remarksHtml = '';
        var hasRemarksToToggle = false;

        if(remCount > 0) {
            hasRemarksToToggle = true;
            remarksHtml = '<ul style="margin:0; padding-left:20px; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; font-weight:500; color:var(--muted);">';
            r.remarks.forEach(function(rm) {
                var detStr = rm.groundForDetention ? ' <span style="color:var(--bad); font-weight:800;">[Ground for Detention]</span>' : '';
                remarksHtml += '<li style="margin-bottom:6px;">' + rm.desc + detStr + '</li>';
            });
            remarksHtml += '</ul>';
        } else if (r.result !== 'clear') {
            hasRemarksToToggle = true;
            remarksHtml = '<div style="font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; color:rgba(255,255,255,0.4); font-weight:500;">No remark details provided.</div>';
        } else {
            remarksHtml = '<div style="font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; color:var(--ok); font-weight:700;">No Deficiencies (Clear).</div>';
        }

        var remarkInfoBadge = '';
        if (r.result !== 'clear' && remCount > 0) {
            remarkInfoBadge = '<span style="font-size:0.7rem; color:var(--warn); margin-left:10px; background:rgba(232,184,75,0.1); padding:2px 8px; border-radius:10px; border:1px solid rgba(232,184,75,0.2); font-weight:700;">Total Remarks: ' + remCount + ' ▾</span>';
        } else if (r.result !== 'clear' && remCount === 0) {
             remarkInfoBadge = '<span style="font-size:0.7rem; color:var(--muted); margin-left:10px; font-weight:600;">No Details ▾</span>';
        }

        detailHtml += '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(0,216,200,0.1); border-radius:8px; margin-bottom:0.8rem; overflow:hidden;">';
        detailHtml += '  <div ' + (hasRemarksToToggle ? 'onclick="togglePscRemarks(this)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:1rem; border-bottom:1px dashed rgba(255,255,255,0.05); transition:background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.05)\'" onmouseout="this.style.background=\'transparent\'"' : 'style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border-bottom:1px dashed rgba(255,255,255,0.05);"') + '>';
        detailHtml += '    <div style="font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.85rem; color:var(--text); font-weight:700; display:flex; align-items:center; flex-wrap:wrap;">📅 ' + r.date + ' — ' + (r.port||'') + ', <span style="margin-left:4px; display:inline-flex; align-items:center;">' + getCountryFlagImg(r.country) + (r.country||'') + '</span>' + remarkInfoBadge + '</div>';
        detailHtml += '    <div style="font-family:\'Plus Jakarta Sans\', sans-serif; font-weight:800; font-size:0.75rem; color:' + resultColor + '; padding:3px 10px; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid ' + resultColor + ';">' + resultLabel + '</div>';
        detailHtml += '  </div>';
        detailHtml += '  <div class="psc-remark-body" style="display:none; padding:1rem; background:rgba(0,0,0,0.2);">' + remarksHtml + '</div></div>';
    });

    container.innerHTML = detailHtml;
}
function togglePscRemarks(headerEl) {
    // Tıklanan başlığın hemen altındaki remark gövdesini bulur
    var bodyEl = headerEl.nextElementSibling;
    if(bodyEl && bodyEl.classList.contains('psc-remark-body')) {
        // Görünürlüğü aç/kapa yap
        if(bodyEl.style.display === 'none') {
            bodyEl.style.display = 'block';
        } else {
            bodyEl.style.display = 'none';
        }
    }
}

function closeVesselPscDetails() {
    // Detay kartını tamamen gizler ve gemi butonlarındaki aktiflik rengini kaldırır
    document.getElementById('pscVesselDetailContainer').style.display = 'none';
    document.querySelectorAll('.psc-vessel-btn').forEach(b => b.classList.remove('active'));
}
var _selectedPscResult = '';
var _editingPersonelId = null;
var _editingPastShipIndex = null;


// ══════════════════════════════════════════════
//  PSC İSTATİSTİKLERİ SAYFASI
// ══════════════════════════════════════════════

// MoU İkonlarını Global Olarak da Tanımlıyoruz
var mouIconsGlobal = {
    'Paris MoU': 'assets/icons/parismouicon.png',
    'Tokyo MoU': 'assets/icons/tokyomouicon.png',
    'Riyadh MoU': 'assets/icons/riyadhmouicon.png',
    'Abuja MoU': 'assets/icons/abujamou.png',
    'Vina del Mar': 'assets/icons/viladelmaricon.png',
    'USCG': 'assets/icons/uscgicon.png',
    'Mediterranean MoU': 'assets/icons/medittereneanmou.png',
    'Black Sea MoU': 'assets/icons/bsmouicon.png',
'Indian Ocean MoU': 'assets/icons/indianmou.png'
};

function openMouDetails(mouName) {
    // FİLTRELİ VERİYİ ÇEKİYORUZ
    var mouRecs = getFilteredPscRecords().filter(r => pscGetMou(r.country || '') === mouName);

    mouRecs.sort((a, b) => {
        var aRem = (a.remarks && a.remarks.length) ? a.remarks.length : 0;
        var bRem = (b.remarks && b.remarks.length) ? b.remarks.length : 0;
        if(bRem === aRem) return parseTRDate(b.date) - parseTRDate(a.date);
        return bRem - aRem;
    });

    var iconSrc = mouIconsGlobal[mouName] || 'assets/icons/moucard.png';
    document.getElementById('mouDetailTitle').innerHTML = '<img src="' + iconSrc + '" style="width:24px;height:24px;vertical-align:middle;margin-right:10px;object-fit:contain;">' + mouName + ' Inspection History (' + mouRecs.length + ')';

    var listHtml = '';
    if (mouRecs.length === 0) {
        listHtml = '<div style="color:var(--muted); font-family:\'Plus Jakarta Sans\'; font-weight:500;">No records found in this Memorandum for the selected period.</div>';
    } else {
        mouRecs.forEach(function(r) {
            var remCount = (r.remarks && r.remarks.length) ? r.remarks.length : 0;
            var resultColor = r.result === 'clear' ? 'var(--ok)' : (r.result === 'remark' ? 'var(--warn)' : 'var(--bad)');
            var detCount = (r.remarks||[]).filter(x => x.groundForDetention).length;
            var remarkListHtml = '';
            var hasRemarksToToggle = false;

            if (remCount > 0) {
                hasRemarksToToggle = true;
                remarkListHtml = '<ul style="margin:0; padding-left:20px; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.8rem; font-weight:500; color:var(--muted);">';
                r.remarks.forEach(rm => remarkListHtml += '<li style="margin-bottom:6px;">' + rm.desc + (rm.groundForDetention ? ' <span style="color:var(--bad); font-weight:800;">[Ground for Detention]</span>' : '') + '</li>');
                remarkListHtml += '</ul>';
            } else if (r.result !== 'clear') {
                hasRemarksToToggle = true;
                remarkListHtml = '<div style="margin-top:8px; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; color:rgba(255,255,255,0.4); font-weight:500;">No remark details provided.</div>';
            }

            listHtml += '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(0,216,200,0.15); border-radius:10px; margin-bottom:1rem; overflow:hidden;">';
            var headerAttrs = hasRemarksToToggle ? 'onclick="togglePscRemarks(this)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:1.2rem; transition:background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.05)\'" onmouseout="this.style.background=\'transparent\'"' : 'style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:1.2rem;"';
            
            listHtml += '  <div ' + headerAttrs + '><div style="display:flex; align-items:center; flex-wrap:wrap; gap:10px;">';
            listHtml += '       <div style="background:rgba(0,216,200,0.1); color:var(--teal); font-family:\'Plus Jakarta Sans\'; font-weight:800; font-size:0.9rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(0,216,200,0.3);">[' + (r.vessel||'?') + ']</div>';
            listHtml += '       <div style="font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.9rem; color:var(--text); font-weight:700; display:inline-flex; align-items:center;">' + (r.port||'-') + ', <span style="margin-left:4px; margin-right:6px;">' + getCountryFlagImg(r.country) + '</span>' + (r.country||'') + '</div>';
            listHtml += '       <div style="font-family:\'DM Mono\'; font-size:0.8rem; color:var(--muted);">📅 ' + r.date + '</div></div>';
            
            listHtml += '    <div style="display:flex; align-items:center; gap:10px;">';
            if(remCount > 0) listHtml += '       <span style="font-family:\'Plus Jakarta Sans\'; font-size:0.75rem; color:var(--warn); background:rgba(232,184,75,0.1); padding:4px 10px; border-radius:6px; border:1px solid rgba(232,184,75,0.3); font-weight:800;">' + remCount + ' Remarks ▾</span>';
            else if (r.result !== 'clear') listHtml += '       <span style="font-family:\'Plus Jakarta Sans\'; font-size:0.7rem; color:var(--muted); font-weight:600;">No Details ▾</span>';
            if(detCount > 0) listHtml += '       <span style="font-family:\'Plus Jakarta Sans\'; font-size:0.75rem; color:var(--bad); background:rgba(255,90,114,0.1); padding:4px 10px; border-radius:6px; border:1px solid rgba(255,90,114,0.3); font-weight:800;">' + detCount + ' Detentions</span>';
            listHtml += '       <div style="font-family:\'Plus Jakarta Sans\'; font-weight:800; font-size:0.8rem; color:' + resultColor + '; padding:4px 12px; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid ' + resultColor + ';">' + r.result.toUpperCase() + '</div></div></div>';
            
            listHtml += '  <div class="psc-remark-body" style="display:none; padding:1.2rem; padding-top:0; margin-top:0.5rem; border-top:1px dashed rgba(255,255,255,0.05); background:transparent;">' + (hasRemarksToToggle ? remarkListHtml : '') + '</div></div>';
        });
    }
    document.getElementById('mouDetailList').innerHTML = listHtml;
    document.getElementById('mouDetailOverlay').style.display = 'flex';
}
function openCountryDetails(countryName) {
    // FİLTRELİ VERİYİ ÇEKİYORUZ
    var countryRecs = getFilteredPscRecords().filter(r => (r.country || '') === countryName);

    countryRecs.sort((a, b) => {
        var aRem = (a.remarks && a.remarks.length) ? a.remarks.length : 0;
        var bRem = (b.remarks && b.remarks.length) ? b.remarks.length : 0;
        if(bRem === aRem) return parseTRDate(b.date) - parseTRDate(a.date);
        return bRem - aRem;
    });

    document.getElementById('countryDetailTitle').innerHTML = '<span style="margin-right:10px; display:inline-flex; align-items:center;">' + getCountryFlagImg(countryName) + '</span>' + countryName + ' Inspection History (' + countryRecs.length + ')';

    var listHtml = '';
    if (countryRecs.length === 0) {
        listHtml = '<div style="color:var(--muted); font-family:\'Plus Jakarta Sans\'; font-weight:500;">No records found in this country for the selected period.</div>';
    } else {
        // Kart render mantığı MoU Details ile birebir aynı (İngilizce olarak)
        countryRecs.forEach(function(r) {
            var remCount = (r.remarks && r.remarks.length) ? r.remarks.length : 0;
            var resultColor = r.result === 'clear' ? 'var(--ok)' : (r.result === 'remark' ? 'var(--warn)' : 'var(--bad)');
            var detCount = (r.remarks||[]).filter(x => x.groundForDetention).length;
            var remarkListHtml = '';
            var hasRemarksToToggle = false;

            if (remCount > 0) {
                hasRemarksToToggle = true;
                remarkListHtml = '<ul style="margin:0; padding-left:20px; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.8rem; font-weight:500; color:var(--muted);">';
                r.remarks.forEach(rm => remarkListHtml += '<li style="margin-bottom:6px;">' + rm.desc + (rm.groundForDetention ? ' <span style="color:var(--bad); font-weight:800;">[Ground for Detention]</span>' : '') + '</li>');
                remarkListHtml += '</ul>';
            } else if (r.result !== 'clear') {
                hasRemarksToToggle = true;
                remarkListHtml = '<div style="margin-top:8px; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; color:rgba(255,255,255,0.4); font-weight:500;">No remark details provided.</div>';
            }

            listHtml += '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(0,216,200,0.15); border-radius:10px; margin-bottom:1rem; overflow:hidden;">';
            var headerAttrs = hasRemarksToToggle ? 'onclick="togglePscRemarks(this)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:1.2rem; transition:background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.05)\'" onmouseout="this.style.background=\'transparent\'"' : 'style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:1.2rem;"';
            
            listHtml += '  <div ' + headerAttrs + '><div style="display:flex; align-items:center; flex-wrap:wrap; gap:10px;">';
            listHtml += '       <div style="background:rgba(0,216,200,0.1); color:var(--teal); font-family:\'Plus Jakarta Sans\'; font-weight:800; font-size:0.9rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(0,216,200,0.3);">[' + (r.vessel||'?') + ']</div>';
            listHtml += '       <div style="font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.9rem; color:var(--text); font-weight:700; display:inline-flex; align-items:center;">' + (r.port||'-') + ' <span style="font-size:0.7rem; color:var(--muted); margin-left:6px; font-weight:500;">(' + pscGetMou(r.country) + ')</span></div>';
            listHtml += '       <div style="font-family:\'DM Mono\'; font-size:0.8rem; color:var(--muted);">📅 ' + r.date + '</div></div>';
            
            listHtml += '    <div style="display:flex; align-items:center; gap:10px;">';
            if(remCount > 0) listHtml += '       <span style="font-family:\'Plus Jakarta Sans\'; font-size:0.75rem; color:var(--warn); background:rgba(232,184,75,0.1); padding:4px 10px; border-radius:6px; border:1px solid rgba(232,184,75,0.3); font-weight:800;">' + remCount + ' Remarks ▾</span>';
            else if (r.result !== 'clear') listHtml += '       <span style="font-family:\'Plus Jakarta Sans\'; font-size:0.7rem; color:var(--muted); font-weight:600;">No Details ▾</span>';
            if(detCount > 0) listHtml += '       <span style="font-family:\'Plus Jakarta Sans\'; font-size:0.75rem; color:var(--bad); background:rgba(255,90,114,0.1); padding:4px 10px; border-radius:6px; border:1px solid rgba(255,90,114,0.3); font-weight:800;">' + detCount + ' Detentions</span>';
            listHtml += '       <div style="font-family:\'Plus Jakarta Sans\'; font-weight:800; font-size:0.8rem; color:' + resultColor + '; padding:4px 12px; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid ' + resultColor + ';">' + r.result.toUpperCase() + '</div></div></div>';
            
            listHtml += '  <div class="psc-remark-body" style="display:none; padding:1.2rem; padding-top:0; margin-top:0.5rem; border-top:1px dashed rgba(255,255,255,0.05); background:transparent;">' + (hasRemarksToToggle ? remarkListHtml : '') + '</div></div>';
        });
    }
    document.getElementById('countryDetailList').innerHTML = listHtml;
    document.getElementById('countryDetailOverlay').style.display = 'flex';
}

function pscGetMou(country){
  for(var m in PSC_MOU_MAP){
    if(PSC_MOU_MAP[m].indexOf(country) !== -1) return m;
  }
  return 'Diğer';
}





function perfSubTab(tab,btn){
  document.querySelectorAll('.perf-stab').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('perfTabKaptan').style.display=tab==='kaptan'?'':'none';
  document.getElementById('perfTabCarkci').style.display=tab==='carkci'?'':'none';
  document.getElementById('perfTabTatilKaptan').style.display=tab==='tatil_kaptan'?'':'none';
  document.getElementById('perfTabTatilCarkci').style.display=tab==='tatil_carkci'?'':'none';
  if(tab.startsWith('tatil')) perfRenderArchive();
}

function pscSelectResult(result){
  _selectedPscResult = result;
  ['clear','remark','detained'].forEach(function(r){
    var btn=document.getElementById('pscBtn'+r.charAt(0).toUpperCase()+r.slice(1));
    btn.className='psc-result-btn'+(result===r?' active-'+result:'');
  });
  var detailSec=document.getElementById('pscDetailSection');
  var addBtn=document.getElementById('addRemarkBtn');
  if(result==='clear'){
    detailSec.style.display='none';
    document.getElementById('remarkList').innerHTML='';
    updateRemarkCountBadge();
  } else {
    detailSec.style.display='block';
    addBtn.style.display='flex';
    if(document.getElementById('remarkList').children.length===0) addRemarkRow();
  }
}

function addRemarkRow(){
  var list=document.getElementById('remarkList');
  if(list.children.length>=30){ alert('Maksimum 30 remark ekleyebilirsiniz.'); return; }
  var idx=list.children.length+1;
  var div=document.createElement('div');
  div.className='remark-item';
  div.innerHTML='<span class="remark-item-num">#'+idx+'</span>'+
    '<input class="remark-item-desc" placeholder="Remark açıklaması..." type="text">'+
    '<select class="remark-item-det">'+
      '<option value="no">Ground for Detention? Hayır</option>'+
      '<option value="yes">Ground for Detention? Evet</option>'+
    '</select>'+
    '<button class="remark-item-del" onclick="removeRemarkRow(this)">✕</button>';
  list.appendChild(div);
  updateRemarkCountBadge();
}

function removeRemarkRow(btn){
  btn.closest('.remark-item').remove();
  var items=document.getElementById('remarkList').querySelectorAll('.remark-item-num');
  items.forEach(function(el,i){ el.textContent='#'+(i+1); });
  updateRemarkCountBadge();
}

function updateRemarkCountBadge(){
  var n=document.getElementById('remarkList').children.length;
  var badge=document.getElementById('remarkCountBadge');
  if(badge) badge.textContent=n+' remark';
}

function getRemarkListData(){
  var rows=document.getElementById('remarkList').querySelectorAll('.remark-item');
  var result=[];
  rows.forEach(function(row){
    var desc=row.querySelector('.remark-item-desc').value.trim();
    var det=row.querySelector('.remark-item-det').value;
    result.push({desc:desc||'(Açıklama girilmedi)',groundForDetention:det==='yes'});
  });
  return result;
}

// ══════════════════════
//  SKOR ALGORİTMASI & HİZMET SÜRESİ
// ══════════════════════

function getLocCoeff(c){ if(!c) return 1; var u=c.toUpperCase(); for(var t in PSC_TIERS){ var arr=PSC_TIERS[t].countries; for(var i=0;i<arr.length;i++){ if(u.indexOf(arr[i])!==-1) return PSC_TIERS[t].coeff; } } return 1; }
function getTierLabel(c){ if(!c) return 'Tier 3'; var u=c.toUpperCase(); for(var t in PSC_TIERS){ var arr=PSC_TIERS[t].countries; for(var i=0;i<arr.length;i++){ if(u.indexOf(arr[i])!==-1) return t.replace('tier','Tier '); } } return 'Tier 3'; }

function getCountryFlagImg(c){
  if(!c) return '';
  var u=c.toUpperCase();
  for(var k in COUNTRY_CODES){
    if(u.indexOf(k)!==-1){
      var code=COUNTRY_CODES[k];
      return '<img src="https://flagcdn.com/16x12/'+code+'.png" width="16" height="12" style="vertical-align:middle;border-radius:2px;margin-right:4px;box-shadow:0 1px 3px rgba(0,0,0,0.4);" alt="'+c+'">';
    }
  }
  return '';
}
function getAgeCoeff(by){ if(!by) return 1; var a=new Date().getFullYear()-parseInt(by); if(a<=5) return 1; if(a<=10) return 1.10; if(a<=15) return 1.22; if(a<=20) return 1.38; if(a<=25) return 1.55; return 1.70; }
function monthDiff(sd){ if(!sd) return 0; var s=new Date(sd),n=new Date(); return (n.getFullYear()-s.getFullYear())*12+(n.getMonth()-s.getMonth()); }

function getTotalService(p) {
  var total = 0;
  if(p.vesselHistory && p.vesselHistory.length) {
    p.vesselHistory.forEach(function(h) { total += (h.months || 0); });
  }
  if(p.status !== 'tatil' && p.startDate) total += monthDiff(p.startDate);
  return total;
}
function calcPSCScore(recs, currentPersonBuildYear) {
  var total = 0;
  (recs || []).forEach(function(r) {
    if (r.manualScore !== undefined && r.manualScore !== null && r.manualScore !== '') {
      total += parseFloat(r.manualScore);
      return;
  }
    
    var recordAge = r.buildYear || currentPersonBuildYear;
    var ac = getAgeCoeff(recordAge);
    var lc = getLocCoeff(r.country);
    var tier = getTierLabel(r.country); 
    
    // YENİ: Çin Limanı Özel İstisnası (2025'ten sonraki denetimler)
    var isChina = r.country && r.country.toUpperCase().indexOf('CHINA') !== -1;
    var rDate = parseTRDate(r.date);
    var isAfter2025 = rDate.getFullYear() > 2025;

    // Eğer Çin ve 2025 sonrasıysa, döngüyü atla, puana etki etmesin (0 ekler).
    if (isChina && isAfter2025) {
        total += 0;
        return; // Bir sonraki PSC kaydına geç
    }
    
    // 1. Taban Puanı Belirle (Herkes inspectiondan bu puanla başlar)
    var baseHam = 0;
    if (tier === 'Tier 1' || tier === 'Tier 2') baseHam = 10;
    else if (tier === 'Tier 3') baseHam = 6;
    else if (tier === 'Tier 4') baseHam = 4;
    else baseHam = 2; // Tier 5
    
    var ham = baseHam;
    
    if (r.result === 'clear') {
        // Kusursuz geçti, taban puanı aynen kalır. (Sıfır ceza)
    } 
    else if (r.result === 'remark') { 
        var totalRemarks = (r.remarks || []).length;
        // Her remark taban puandan 2.5 puan siler
        ham -= (totalRemarks * 2.5);
    } 
    else if (r.result === 'detained') { 
        var totalRemarks = (r.remarks || []).length;
        var detCount = (r.remarks || []).filter(function(x){ return x.groundForDetention; }).length; 
        
        // Detention yemişse 15 puan kafadan silinir, üstüne remarklar ve detention sebepleri ekstra eksi yazar
        ham -= 15;
        ham -= (totalRemarks * 2.5);
        ham -= (detCount * 5); 
    }
    
    // 2. Yaş ve Zorluk Katsayılarını Uygula
    total += ham >= 0 ? (ham * lc * ac) : (ham * lc / ac);
  });
  
  return Math.round(total * 10) / 10;
}
function calcRightshipScore(recs, currentPersonBuildYear) {
  var total = 0;
  (recs || []).forEach(function(r) {
    var recordAge = r.buildYear || currentPersonBuildYear;
    var ac = getAgeCoeff(recordAge);
    
    var ham = 10; // TABAN PUAN
    var ceza = 0;
    
    if (r.result === 'remark' || r.totalFindings > 0) {
      var highPenalty = r.high * 5;
      var medPenalty = Math.max(0, r.medium - 8) * 1; // İlk 8 medium serbest
      var lowPenalty = Math.max(0, r.low - 10) * 0.5; // İlk 10 low serbest
      ceza = highPenalty + medPenalty + lowPenalty;
    }
    
    var netHam = ham - ceza;
    total += (netHam >= 0) ? (netHam * ac) : (netHam / ac);
  });
  return Math.round(total * 10) / 10;
}
function calcDurBonus(totalMonths){ return Math.min(Math.round(Math.floor(totalMonths/3) * 0.5 * 10) / 10, 10); }

// --- TARİH YARDIMCILARI ---
function parseTRDate(dateStr) {
    if(!dateStr) return new Date(0);
    var parts = dateStr.split('.');
    if(parts.length === 3) return new Date(parts[2], parts[1]-1, parts[0]);
    return new Date(0);
}
function parseISODate(dateStr) {
    if(!dateStr) return new Date(0);
    var parts = dateStr.split('-');
    if(parts.length === 3) return new Date(parts[0], parts[1]-1, parts[2]);
    return new Date(0);
}
function parseAnyDate(d) {
  if(!d) return new Date(0);
  if(d.indexOf('-') > -1) { var p=d.split('-'); return new Date(p[0], p[1]-1, p[2]); }
  if(d.indexOf('.') > -1) { var p=d.split('.'); return new Date(p[2], p[1]-1, p[0]); }
  return new Date(0);
}

// --- PERSONELİN SADECE KENDİ DÖNEMİNDEKİ GEMİ PERFORMANSINI HESAPLAR ---
// --- PERSONELİN SADECE KENDİ DÖNEMİNDEKİ GEMİ PERFORMANSINI HESAPLAR ---
// --- Global Değişken (Sistemin açık/kapalı durumunu hafızada tutar) ---
var avansSistemiAktif = localStorage.getItem('avansSistemiAktif') !== 'false'; // Varsayılan olarak AÇIK gelir.

// --- 1. FONKSİYON ---
function getPersonVesselRate(p) {
    if (!p.vessel || !p.startDate || p.status === 'tatil') return 0; 

    var pStart = parseISODate(p.startDate);
    var expected = 0;   
    var responded = 0;  

    // 1. MAİLLER
    mailler.forEach(function(m, i) {
        var mDate = parseTRDate(m.tarih);
        if (mDate >= pStart && !muafMi(p.vessel, i)) {
            expected++;
            if (cevapVerdiMi(p.vessel, i)) responded++;
        }
    });

    // 2. GÜNLÜK RAPORLAR
    var gnData = gnLoad();
    var weeks = (window.committedWeeks_alltime || []).slice(); 
    if (!weeks.includes(window.gnCurrentFriday)) weeks.push(window.gnCurrentFriday);
    
    weeks.forEach(function(week) {
        var gunler = gnGetHaftaGunleri(week);
        gunler.forEach(function(g) {
            var gDate = parseISODate(g);
            if (gDate >= pStart) {
                expected++;
                if (gnData[g] && gnData[g][p.vessel] === true) responded++;
            }
        });
    });

    // 3. AYLIK RAPORLAR (DİNAMİK SÜTUN)
    var months = (window.committedMonths_alltime || []).slice();
    if (!months.includes(window.aylikCurrentMonth)) months.push(window.aylikCurrentMonth);
    var pMonth = p.startDate.substring(0, 7);
    
    months.forEach(function(month) {
        if (month >= pMonth) {
            var shipData = (aylikData[month] || {})[p.vessel] || {};
            var currentItems = getAylikItems(month);
            currentItems.forEach(function(item) {
                expected++;
                if (shipData[item] === true) responded++;
            });
        }
    });

    // 🛡️ AVANS SİSTEMİ KONTROLÜ
    if (avansSistemiAktif) {
        var isVeteran = (p.pscRecords && p.pscRecords.length > 0);
        var masteryThreshold = 30; 
        if (expected === 0 && isVeteran) return -1; 
        if (isVeteran && expected > 0 && expected < masteryThreshold) {
            var psc = calcPSCScore(p.pscRecords, p.buildYear);
            var sanalOran = (psc >= 10) ? (26/30) : (psc >= 5) ? (22/30) : (psc >= 0) ? (17/30) : (10/30);
            var eksikGorev = masteryThreshold - expected; 
            expected += eksikGorev;
            responded += (eksikGorev * sanalOran);
        }
    }

    if (expected === 0) return 0;
    var successRate = responded / expected; 
    var experience = avansSistemiAktif ? Math.min(expected / 30, 1.0) : 1.0; 
    return (successRate * experience) * 100;
}
// --- 2. FONKSİYON ---
function calcVesselPerf(p){ 

  // 🛡️ TATİLDEKİ PERSONEL İÇİN AVANS SİSTEMİ KONTROLÜ
  // Tatildeki kaptanlar/çarkçılar da PSC geçmişleri varsa Eski Kurt Kalkanı'ndan yararlanır.
  if (p.status === 'tatil') {
    if (avansSistemiAktif && p.pscRecords && p.pscRecords.length > 0) {
      var pscT = calcPSCScore(p.pscRecords, p.buildYear);
      if (pscT >= 10) return 26; // Mükemmel geçmiş
      if (pscT >= 5)  return 22; // İyi geçmiş
      if (pscT >= 0)  return 17; // Standart geçmiş
      return 10;                 // Zayıf geçmiş
    }
    return 0;
  }

  if(!p.vessel) return 0;
  var shipRate = getPersonVesselRate(p); 
  
  // AVANS SİSTEMİ AÇIKKEN DEVREYE GİREN ÖZEL BAŞLANGIÇ PUANI (-1)
  // AVANS SİSTEMİ AÇIKKEN DEVREYE GİREN ÖZEL BAŞLANGIÇ PUANI (-1)
  if (shipRate === -1) {
      if ((p.pscRecords && p.pscRecords.length > 0) || (p.rightshipRecords && p.rightshipRecords.length > 0)) {
          var psc = calcPSCScore(p.pscRecords, p.buildYear);
          var rs = calcRightshipScore(p.rightshipRecords, p.buildYear);
          var totalInspection = psc + rs;
          if (totalInspection >= 10) return 26;
          if (totalInspection >= 5)  return 22;
          if (totalInspection >= 0)  return 17;
          return 10;
      }
      return 0;
  }  
  return Math.round((shipRate / 100) * 30);  
}
  function getBonusScore(kaptanAdi) {
    if (!bonusData || !bonusData.visits || !bonusData.port_avg) return 0;
    var norm = normalizeName(kaptanAdi);
    var visits = bonusData.visits.filter(function(v) {
        return normalizeName(v.kaptan) === norm;
    });
    var total = 0;
    visits.forEach(function(v) {
        var portAvg = bonusData.port_avg[v.liman];
        if (!portAvg) return;
        total += (v.toplam_usd / portAvg) > 1.10 ? -3 : 3;
    });
    return total;
}

function getBonusDetails(kaptanAdi) {
    if (!bonusData || !bonusData.visits || !bonusData.port_avg) return [];
    var norm = normalizeName(kaptanAdi);
    return bonusData.visits
        .filter(function(v) { return normalizeName(v.kaptan) === norm; })
        .map(function(v) {
            var portAvg = bonusData.port_avg[v.liman];
            if (!portAvg) return null;
            var ratio = v.toplam_usd / portAvg;
            return {
                ay: v.ay, liman: v.liman,
                odenen: v.toplam_usd, portAvg: portAvg,
                puan: ratio > 1.10 ? -3 : 3,
                durum: ratio > 1.10 ? 'above' : 'below'
            };
        }).filter(Boolean);
}

function calcTotal(p, all){ 
  var base = 50; 
  var vPerf = calcVesselPerf(p); 
  var psc = calcPSCScore(p.pscRecords, p.buildYear);
  var rs = calcRightshipScore(p.rightshipRecords, p.buildYear); // EKLENDİ
  var dur = calcDurBonus(getTotalService(p)); 
  var bonusRusvet = getBonusScore(p.name);
  return Math.round((base + vPerf + psc + rs + dur + bonusRusvet)*10)/10;
}
// ══════════════════════
//  RENDER
// ══════════════════════
function matBadge(v){ v=parseInt(v)||0; var c,l; if(v<=3){c='mat-green';l='🟢 '+v+' — Normal';}else if(v<=6){c='mat-yellow';l='🟡 '+v+' — Ortalama Sıklık';}else{c='mat-red';l='🔴 '+v+' — Çok Sık';} return '<span class="mat-badge '+c+'"><span class="mat-dot"></span>'+l+'</span>'; }
function scoreCls(s){ return s>=70?'high':s>=40?'mid':'low'; }
function rankBadge(i){ if(i===0) return '<span class="perf-rank perf-rank-1">🥇</span>'; if(i===1) return '<span class="perf-rank perf-rank-2">🥈</span>'; if(i===2) return '<span class="perf-rank perf-rank-3">🥉</span>'; return '<span class="perf-rank">'+(i+1)+'.</span>'; }

function perfRenderTable(role,tbodyId){
  var data=perfLoadData(), persons=data.filter(function(p){ return p.role===role && p.status !== 'tatil'; });
  persons.sort(function(a,b){ return calcTotal(b,data)-calcTotal(a,data); });
  var tb=document.getElementById(tbodyId);
  if(!persons.length){ tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);font-family:\'DM Mono\',monospace;font-size:.7rem;padding:2.5rem;">Kayıt yok.</td></tr>'; return; }
  
  tb.innerHTML=persons.map(function(p,i){ 
    var sc=calcTotal(p,data); 
    
    // YENİ: Master Wolf Kontrolü
    var masterWolf = '';
if(p.role === 'kaptan' && (p.pscRecords && p.pscRecords.length >= 2) && (p.rightshipRecords && p.rightshipRecords.length >= 1)) {
    masterWolf = '<span class="master-wolf-wrapper" data-tooltip="Beybaba: En az iki PSC ve bir Rightship Deneyimi"><img src="assets/icons/masterwolf.png" class="master-wolf-glow" style="height:24px; margin-left:8px; vertical-align:middle;"></span>';
}
    return '<tr><td>'+rankBadge(i)+'</td><td><span class="perf-name-link" onclick="perfOpenDetail(\''+p.id+'\')">'+p.name+masterWolf+'</span><br><span style="font-family:\'DM Mono\',monospace;font-size:.62rem;color:var(--muted);">'+p.vessel+'</span></td><td><span class="perf-score-val '+scoreCls(sc)+'">'+sc+'</span></td><td>'+matBadge(p.matSiklik)+'</td></tr>'; 
  }).join('');
}
function perfRenderAll(){ perfRenderTable('kaptan','perfKaptanBody'); perfRenderTable('carkci','perfCarkciBody'); }

function perfRenderArchive(){
  var data=perfLoadData();
  var tatilKaptanlar = data.filter(function(p){ return p.role==='kaptan' && p.status==='tatil'; })
                           .sort(function(a,b){ return calcTotal(b,data)-calcTotal(a,data); });
  var tatilCarkcilar = data.filter(function(p){ return p.role==='carkci' && p.status==='tatil'; })
                           .sort(function(a,b){ return calcTotal(b,data)-calcTotal(a,data); });

  var renderList = function(arr, tbodyId) {
        var tb = document.getElementById(tbodyId);
        if(!arr.length){ tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);font-family:\'DM Mono\',monospace;font-size:.7rem;padding:2.5rem;">Tatilde personel yok.</td></tr>'; return; }
        tb.innerHTML = arr.map(function(p,i){
          var sc = calcTotal(p,data);
          var sonGemi = p.vesselHistory && p.vesselHistory.length ? p.vesselHistory[p.vesselHistory.length-1].vessel : '-';
          
          // YENİ: Master Wolf Kontrolü (Tatil Listesi İçin)
          // Aktif Personel ve Tatil listesindeki masterWolf satırını şununla değiştir:
// Detay ekranındaki masterWolf satırını şununla değiştir:
var masterWolf = '';
if(p.role === 'kaptan' && (p.pscRecords && p.pscRecords.length >= 2) && (p.rightshipRecords && p.rightshipRecords.length >= 1)) {
    masterWolf = '<span class="master-wolf-wrapper" data-tooltip="Master Wolf"><img src="masterwolf.png" class="master-wolf-glow" style="height:26px; margin-left:12px; vertical-align:middle;"></span>';
}

          return '<tr><td>'+rankBadge(i)+'</td><td><span class="perf-name-link" onclick="perfOpenDetail(\''+p.id+'\')">'+p.name+masterWolf+'</span></td><td style="color:var(--teal);font-family:\'DM Mono\';font-size:.8rem;">'+sonGemi+'</td><td style="color:var(--muted);font-family:\'DM Mono\';font-size:.8rem;">'+getTotalService(p)+' ay</td><td><span class="perf-score-val '+scoreCls(sc)+'">'+sc+'</span></td></tr>';
        }).join('');
      };
  renderList(tatilKaptanlar, 'perfTatilKaptanBody');
  renderList(tatilCarkcilar, 'perfTatilCarkciBody');
}

// ══════════════════════
//  DETAY MODAL (TÜM KULLANICILAR İÇİN)
// ══════════════════════
function perfOpenDetail(id){
  var data=perfLoadData(), p=data.find(function(x){ return x.id===id; }); if(!p) return;
  document.getElementById('pdName').textContent=p.name;
  document.getElementById('pdRole').textContent=(p.role==='kaptan'?'⚓ KAPTAN':'⚙️ ÇARKÇIBAŞI');

  var allPsc = p.pscRecords || [];
  var currentPscs = [];
  var pastPscs = [];
  var pStart = parseAnyDate(p.startDate);

  // Güncel ve Geçmiş PSC'leri Akıllıca Ayırıyoruz
  allPsc.forEach(function(r) {
    if(r.vessel) {
        if(p.status !== 'tatil' && r.vessel === p.vessel) currentPscs.push(r);
        else pastPscs.push(r);
    } else {
        var rDate = parseAnyDate(r.date);
        if(p.status !== 'tatil' && pStart.getTime() !== 0 && rDate >= pStart) currentPscs.push(r);
        else pastPscs.push(r);
    }
  });

  // Ortak Tablo Çizici (showVessel true ise gemi adını da basar)
  function buildPscTable(pscArray, showVessel) {
    if(!pscArray || pscArray.length === 0) return '<div style="font-family:\'DM Mono\';font-size:.65rem;color:var(--muted);padding:.5rem 0;">PSC kaydı yok.</div>';
    var html = '<div style="width:100%; overflow-x:auto; margin-top:0.5rem; border-radius:8px;"><table class="perf-psc-tbl" style="background:rgba(0,0,0,0.2); width:100%; min-width:480px;"><thead><tr><th style="width:70px;">Tarih</th><th>Liman/Ülke</th><th>Sonuç & Findings (H/M/L)</th><th style="width:40px;">Puan</th></tr></thead><tbody>';
    
    pscArray.forEach(function(r) {
      // YENİ: Artık manuel hesaplama yapmıyoruz, doğrudan ana motordan skoru çekiyoruz!
      var sc = calcPSCScore([r], r.buildYear || p.buildYear);
      
      var rCls = r.result==='clear'?'psc-result-clear':r.result==='remark'?'psc-result-remark':'psc-result-detention';
      var detCount = (r.remarks||[]).filter(function(x){return x.groundForDetention;}).length;
      
      var remarkHTML = (r.remarks && r.remarks.length) 
        ? '<ul class="psc-remark-list" style="margin-top:6px; padding-left:12px;">'+r.remarks.map(function(rm){ 
            return '<li'+(rm.groundForDetention?' class="detention-item"':'')+'>'+rm.desc+(rm.groundForDetention?' <strong style="color:#ff0040">[Detention Nedeni]</strong>':'')+'</li>'; 
          }).join('')+'</ul>' 
        : '';
        
      var rLabel = r.result === 'clear' ? 'Clear ✓' : (r.result === 'remark' ? 'Remark (' + (r.remarks || []).length + ')' : 'Detention (' + (r.remarks || []).length + ' remark, ' + detCount + ' detention nedeni)');
      var fDate = r.date || ''; if(fDate && fDate.indexOf('-') > -1) { var dp = fDate.split('-'); fDate = dp[2]+'.'+dp[1]+'.'+dp[0]; }
      
      var vName = (showVessel && r.vessel) ? '<div style="color:var(--teal); font-weight:900; font-size:0.75rem; margin-bottom:2px;">['+r.vessel+']</div>' : '';

      html += '<tr>'+
        '<td style="font-family:\'DM Mono\',monospace;font-size:.7rem;color:var(--muted);">'+fDate+'</td>'+
        '<td>'+vName+r.port+'<br><span style="font-size:0.6rem;color:#ffffff;font-weight:500;display:inline-flex;align-items:center;">'+getCountryFlagImg(r.country)+r.country+'</span> <span style="font-size:0.52rem;color:var(--muted);">('+getTierLabel(r.country)+')</span></td>'+
        '<td><span class="'+rCls+'">'+rLabel+'</span>'+remarkHTML+'</td>'+
        '<td style="font-family:\'DM Mono\',monospace;font-weight:900;font-size:1.05rem;color:'+(sc>=0?'var(--ok)':'var(--bad)')+';">'+(sc>=0?'+':'')+sc+'</td></tr>';
    });
    return html + '</tbody></table></div>';
  }

  var currentHtml = '';
  var currentPscHtml = ''; // PSC tablosunu alt kısma taşımak için yeni değişken
  
  if (p.status === 'tatil') {
    currentHtml = '<div class="pcv-icon">🌴</div><div><div class="pcv-label">Durum</div><div class="pcv-sub" style="color:#ffffff;font-size:1rem;font-weight:700;margin-top:4px;">Personel Tatilde / Arşivde. Şirket İçi Toplam Hizmeti: '+getTotalService(p)+' ay</div></div>';
  } else {
    var shipRate = getPersonVesselRate(p);
    currentHtml = '<div style="width:100%;">'+
      '<div style="display:flex;align-items:center;gap:1rem; background:rgba(0,216,200,0.03); border:1px solid rgba(0,216,200,0.1); padding:1rem; border-radius:10px;">'+
        '<div class="pcv-icon">🚢</div>'+
        '<div style="flex:1;"><div class="pcv-label">Mevcut Gemi</div><div class="pcv-val">'+(p.vessel||'—')+'</div><div class="pcv-sub">Başlama: '+(p.startDate||'—')+' · Toplam Hizmet: '+getTotalService(p)+' ay</div></div>'+
        '<div style="text-align:right; border-left:1px solid rgba(0,216,200,0.1); padding-left:1rem;">'+
          '<div style="font-size:0.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px; margin-bottom:4px;">Gemi Performansı</div>'+
          '<div style="color:var(--teal);font-family:\'DM Mono\';font-size:1.2rem;font-weight:700; background:rgba(0,216,200,0.1); padding:4px 10px; border-radius:6px; display:inline-block;">%'+Math.round(shipRate)+'</div>'+
        '</div>'+
      '</div></div>';

    // Mevcut Gemi PSC kayıtlarını ayrı bir değişkene aldık:
    currentPscHtml = '<div style="margin-bottom:1.5rem;">' +
      '<h4 style="font-family:\'Outfit\',sans-serif; font-size:0.8rem; color:var(--teal); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;"><span style="display:block;width:10px;height:1px;background:var(--teal);"></span> Mevcut Gemiye Ait PSC Kayıtları</h4>'+
      buildPscTable(currentPscs, false)+
    '</div>';
  }
  document.getElementById('pdCurrentVessel').innerHTML = currentHtml;

  var vp=calcVesselPerf(p), psc=calcPSCScore(p.pscRecords,p.buildYear), dur=calcDurBonus(getTotalService(p)), tot=calcTotal(p,data);
  function fmtSign(val) {
    if(val > 0) return { text: '+' + val, color: '#2ecc71' }; 
    if(val < 0) return { text: val, color: 'var(--bad)' };    
    return { text: '0', color: 'var(--muted)' };              
  }
  var vpObj  = p.status === 'tatil' ? { text: '-', color: 'var(--muted)' } : fmtSign(vp);
  var pscObj = fmtSign(psc);
  var durObj = fmtSign(dur);

  var breakdownDiv = document.getElementById('pdScoreBreakdown');
  breakdownDiv.style.gridTemplateColumns = 'repeat(3, 1fr)'; 
breakdownDiv.innerHTML=
    sCard('Taban', 50, 50, 'var(--muted)') +  
    sCard('Gemi Perf.', vpObj.text, 30, vpObj.color) +
    sCard('PSC Puanı', pscObj.text, '∞', pscObj.color);
    
  var te=document.getElementById('pdTotalScore'); te.textContent=tot; te.className='perf-score-val '+scoreCls(tot); te.style.fontSize='1.6rem';
  
  // Alt bölme: Geçmiş PSC ve Rightship Kayıtları Tablosu
  var allRs = p.rightshipRecords || [];
  var pastPscHtml = '';
  pastPscHtml += '<div style="margin-bottom:1.5rem;"><h4 style="font-family:\'Outfit\',sans-serif; font-size:0.8rem; color:var(--warn); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;"><span style="display:block;width:10px;height:1px;background:var(--warn);"></span> Geçmiş PSC Kayıtları</h4>' + buildPscTable(pastPscs, true) + '</div>';
  pastPscHtml += '<div style="margin-bottom:1.5rem;"><h4 style="font-family:\'Outfit\',sans-serif; font-size:0.8rem; color:#4285f4; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;"><span style="display:block;width:10px;height:1px;background:#4285f4;"></span> <img src="assets/icons/rightship_logo.png" style="height:14px; object-fit:contain;" alt="RS"> Geçmiş Rightship Kayıtları</h4>' + buildRightshipTable(allRs, true) + '</div>';
  
  // RÜŞVET BONUSU BÖLÜMÜ
  var bonusDetails = getBonusDetails(p.name);
  var bonusTotal = getBonusScore(p.name);
  var bonusHtml = '';
  if (p.role === 'kaptan') {
    var bonusColor = bonusTotal > 0 ? 'var(--ok)' : bonusTotal < 0 ? 'var(--bad)' : 'var(--muted)';
    var bonusSign  = bonusTotal > 0 ? '+' : '';
    bonusHtml = '<div style="margin-bottom:1.5rem;">' +
      '<h4 style="font-family:\'Outfit\',sans-serif; font-size:0.8rem; color:var(--gold); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">' +
        '<span style="display:block;width:10px;height:1px;background:var(--gold);"></span> 💰 RÜŞVET BONUSU' +
        '<span style="margin-left:auto; font-family:\'DM Mono\'; font-size:1rem; color:' + bonusColor + '; font-weight:900;">' + bonusSign + bonusTotal + ' puan</span>' +
      '</h4>';
    if (!bonusDetails.length) {
      bonusHtml += '<div style="font-family:\'DM Mono\';font-size:.65rem;color:var(--muted);padding:.5rem 0;">Bu kaptana ait kayıt bulunamadı.</div>';
    } else {
      bonusHtml += '<div style="width:100%;overflow-x:auto;margin-top:0.5rem;border-radius:8px;">' +
        '<table class="perf-psc-tbl" style="background:rgba(0,0,0,0.2);width:100%;min-width:480px;">' +
        '<thead><tr><th>Ay</th><th>Liman</th><th>Ödenen</th><th>Liman Ort.</th><th>Durum</th><th>Puan</th></tr></thead><tbody>';
      bonusDetails.forEach(function(d) {
        var pColor = d.puan > 0 ? 'var(--ok)' : 'var(--bad)';
        var pSign  = d.puan > 0 ? '+' : '';
        var durumTxt = d.durum === 'above'
          ? '<span style="color:var(--bad);font-weight:700;">▲ Ortalama Üstü</span>'
          : '<span style="color:var(--ok);font-weight:700;">▼ Ortalama Altı</span>';
        bonusHtml += '<tr>' +
          '<td style="font-family:\'DM Mono\';font-size:.7rem;color:var(--muted);">' + d.ay + '</td>' +
          '<td style="font-weight:600;">' + d.liman + '</td>' +
          '<td style="font-family:\'DM Mono\';">' + d.odenen + ' USD</td>' +
          '<td style="font-family:\'DM Mono\';color:var(--muted);">' + d.portAvg + ' USD</td>' +
          '<td>' + durumTxt + '</td>' +
          '<td style="font-family:\'DM Mono\';font-weight:900;font-size:1.05rem;color:' + pColor + ';">' + pSign + d.puan + '</td>' +
        '</tr>';
      });
      bonusHtml += '</tbody></table></div>';
    }
    bonusHtml += '</div>';
  }

  // ── YENİ: ŞİRKET HİZMET GEÇMİŞİ (Modern Kart Tasarımı) ──────────────────────────────────
  var runningMonths = 0;
  var serviceCards = '';
  var hist = p.vesselHistory || [];

  // Geçmiş gemileri kart formatında döngüye al
  hist.forEach(function(h) {
      runningMonths += (h.months || 0);
      var scoreHtml = h.score
        ? '<span class="perf-score-val '+scoreCls(h.score)+'" style="font-size:.75rem;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.05);" title="Ayrılırkenki Toplam Skor">Ayrılış Skoru: '+h.score+'</span>'
        : '<span style="font-size:.6rem;color:var(--muted);">Skor yok</span>';

      serviceCards += '<div class="perf-vessel-history-row" style="background:rgba(0,0,0,0.15);border:1px solid rgba(0,216,200,0.1);border-radius:8px;padding:0.8rem;margin-bottom:0.5rem; transition:transform 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">'+
        '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;width:100%;">'+
          '<span class="pvh-vessel" style="font-size:0.9rem; color:var(--text);">🚢 '+h.vessel+'</span>'+
          '<span class="pvh-dates" style="color:var(--muted); font-family:\'DM Mono\'; font-size:0.75rem;">'+h.start+' → '+(h.end||'Devam ediyor')+'</span>'+
          '<span class="pvh-dur" style="color:var(--warn); font-family:\'DM Mono\'; font-size:0.75rem;">('+(h.months||'?')+' ay)</span>'+
          '<span style="margin-left:auto;">'+scoreHtml+'</span>'+
        '</div>'+
      '</div>';
  });

  // Eğer personel tatilde değilse, aktif olduğu GÜNCEL GEMİYİ de tasarıma uygun şekilde listenin sonuna ekle
  if (p.status !== 'tatil' && p.vessel && p.startDate) {
      var curM = monthDiff(p.startDate);
      runningMonths += curM;
      serviceCards += '<div class="perf-vessel-history-row" style="background:rgba(0,216,200,0.05);border:1px solid var(--teal);border-radius:8px;padding:0.8rem;margin-bottom:0.5rem; box-shadow:0 0 10px rgba(0,216,200,0.1); transition:transform 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">'+
        '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;width:100%;">'+
          '<span class="pvh-vessel" style="font-size:0.9rem;color:var(--teal);">🚢 '+p.vessel+' <span style="font-size:.6rem;color:var(--muted); font-weight:normal; text-transform:none;">(Güncel Gemisi)</span></span>'+
          '<span class="pvh-dates" style="color:var(--teal); font-family:\'DM Mono\'; font-size:0.75rem;">'+p.startDate+' → Devam Ediyor</span>'+
          '<span class="pvh-dur" style="color:var(--teal); font-family:\'DM Mono\'; font-size:0.75rem;">('+curM+' ay)</span>'+
        '</div>'+
      '</div>';
  }

  var totalDurBonus = calcDurBonus(runningMonths);
  var durSignColor = totalDurBonus > 0 ? 'var(--ok)' : 'var(--muted)';
  var durSign = totalDurBonus > 0 ? '+' : '';

  var serviceHistHtml = '<div style="margin-bottom:1.5rem;">' +
      '<h4 style="font-family:\'Outfit\',sans-serif; font-size:0.8rem; color:var(--teal); margin-bottom:0.8rem; display:flex; align-items:center; gap:0.4rem;">' +
          '<span style="display:block;width:10px;height:1px;background:var(--teal);"></span> 🏢 ŞİRKET HİZMET GEÇMİŞİ' +
          '<span style="margin-left:auto; font-family:\'DM Mono\'; font-size:1rem; color:' + durSignColor + '; font-weight:900;">' + durSign + totalDurBonus + ' puan</span>' +
      '</h4>';

  if (!serviceCards) {
      serviceHistHtml += '<div style="font-family:\'DM Mono\';font-size:.65rem;color:var(--muted);padding:.5rem 0;">Hizmet kaydı bulunamadı.</div>';
  } else {
      serviceHistHtml += serviceCards;
      serviceHistHtml += '<div style="text-align:right; font-family:\'DM Mono\'; font-size:0.75rem; color:var(--warn); margin-top:8px; font-weight:700;">Toplam Hizmet: '+runningMonths+' ay → '+durSign+totalDurBonus+' puan</div>';
  }
  serviceHistHtml += '</div>';

  // HEPSİNİ EKRANA BAS (Yeni sıralama: currentPscHtml ilk sırada yer alacak)
  document.getElementById('pdVesselHistory').innerHTML = currentPscHtml + pastPscHtml + bonusHtml + serviceHistHtml;
  document.getElementById('perfDetailOverlay').classList.add('open');
  
  setTimeout(function(){
      var rsObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(e) {
              if(e.isIntersecting) {
                  e.target.querySelectorAll('.rs-bar-fill').forEach(function(f){ 
                      f.style.width = f.getAttribute('data-w'); 
                  });
                  rsObserver.unobserve(e.target);
              }
          });
      }, { threshold: 0.2 });
      
      document.querySelectorAll('.rs-bars-container').forEach(function(el){ 
          rsObserver.observe(el); 
      });
  }, 100);
}
function buildRightshipTable(rsArray, showVessel) {
   if(!rsArray || rsArray.length === 0) return '<div style="font-family:\'DM Mono\';font-size:.65rem;color:var(--muted);padding:.5rem 0;">Geçmiş Rightship kaydı bulunamadı.</div>';
   var html = '<div style="width:100%; overflow-x:auto; margin-top:0.5rem; border-radius:8px;"><table class="perf-psc-tbl" style="background:rgba(0,0,0,0.2); width:100%; min-width:480px;"><thead><tr><th style="width:70px;">Tarih</th><th>Liman/Ülke</th><th>Sonuç & Remark Nedenleri</th><th style="width:40px;">Puan</th></tr></thead><tbody>';    
    rsArray.forEach(function(r) {
      var ac = getAgeCoeff(r.buildYear || p.buildYear);
      var ham = 10;
      var ceza = 0;
      if (r.result === 'remark' || r.totalFindings > 0) {
          ceza = (r.high * 5) + (Math.max(0, r.medium - 8) * 1) + (Math.max(0, r.low - 10) * 0.5);
      }
      var netHam = ham - ceza;
      var sc = Math.round((netHam >= 0 ? netHam * ac : netHam / ac) * 10) / 10;
      
      var rCls = r.result === 'clear' ? 'psc-result-clear' : (r.high > 0 ? 'psc-result-detention' : 'psc-result-remark');
      var rLabel = r.result === 'clear' ? 'Clear ✓' : 'Remark (Total: ' + r.totalFindings + ')';
      
      var details = '';
if (r.result === 'remark' && r.totalFindings > 0) {
    // Barın %100'ünü belirlemek için en yüksek değeri buluyoruz (Barlar çok kısa kalmasın diye min 5 baz alındı)
    var maxF = Math.max(r.high, r.medium, r.low, 5); 
    var pHigh = (r.high / maxF) * 100;
    var pMed = (r.medium / maxF) * 100;
    var pLow = (r.low / maxF) * 100;

    details = '<div class="rs-bars-container">' +
        '<div class="rs-bar-row"><span class="rs-bar-label" style="color:var(--bad)">High</span><div class="rs-bar-track"><div class="rs-bar-fill" style="background:var(--bad); color:var(--bad);" data-w="'+pHigh+'%"></div></div><span style="color:var(--bad); width:15px; text-align:left;">'+r.high+'</span></div>' +
        '<div class="rs-bar-row"><span class="rs-bar-label" style="color:var(--warn)">Medium</span><div class="rs-bar-track"><div class="rs-bar-fill" style="background:var(--warn); color:var(--warn);" data-w="'+pMed+'%"></div></div><span style="color:var(--warn); width:15px; text-align:left;">'+r.medium+'</span></div>' +
        '<div class="rs-bar-row"><span class="rs-bar-label" style="color:var(--teal)">Low</span><div class="rs-bar-track"><div class="rs-bar-fill" style="background:var(--teal); color:var(--teal);" data-w="'+pLow+'%"></div></div><span style="color:var(--teal); width:15px; text-align:left;">'+r.low+'</span></div>' +
    '</div>';
}
      var fDate = r.date || ''; if(fDate && fDate.indexOf('-') > -1) { var dp = fDate.split('-'); fDate = dp[2]+'.'+dp[1]+'.'+dp[0]; }
      
      var vName = (showVessel && r.vessel) ? '<div style="color:#4285f4; font-weight:900; font-size:0.75rem; margin-bottom:2px;">['+r.vessel+']</div>' : '';

      html += '<tr>'+
        '<td style="font-family:\'DM Mono\',monospace;font-size:.7rem;color:var(--muted);">'+fDate+'</td>'+
        '<td>'+vName+r.port+'<br><span style="font-size:0.6rem;color:#ffffff;font-weight:500;display:inline-flex;align-items:center;">'+getCountryFlagImg(r.country)+r.country+'</span></td>'+
        '<td><span class="'+rCls+'">'+rLabel+'</span>'+details+'</td>'+
        '<td style="font-family:\'DM Mono\',monospace;font-weight:700;color:'+(sc>=0?'var(--ok)':'var(--bad)')+';">'+(sc>=0?'+':'')+sc+'</td></tr>';
    });
   return html + '</tbody></table></div>';
  }
function togglePscDetail(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function sCard(l,v,m,c){ return '<div class="perf-score-card"><div class="perf-score-card-label">'+l+'</div><div class="perf-score-card-val" style="color:'+c+';">'+v+'</div><div style="font-family:\'DM Mono\',monospace;font-size:.55rem;color:var(--muted);">/ ~'+m+'</div></div>'; }

function perfCloseDetail(){ document.getElementById('perfDetailOverlay').classList.remove('open'); }
// ══════════════════════
//  ADMİN ARAÇLARI & OTOMATİK GEMİ YAŞI
// ══════════════════════



// ══════════════════════
//  AD SOYAD AUTOCOMPLETE
// ══════════════════════
function pAdNameFilter() {
  var q = document.getElementById('pAdName').value.toLowerCase().trim();
  var drop = document.getElementById('pAdNameDrop');
  var data = perfLoadData();

  var matches = data.filter(function(p) {
    return p.name.toLowerCase().indexOf(q) !== -1;
  });

  if (!matches.length) { drop.style.display='none'; return; }

  drop.innerHTML = matches.map(function(p) {
    var isTatil = p.status === 'tatil';
    var tag = isTatil
      ? '<span style="font-size:0.6rem;background:rgba(232,184,75,0.15);color:var(--warn);border:1px solid rgba(232,184,75,0.3);border-radius:100px;padding:1px 7px;margin-left:6px;">🌴 Tatilde</span>'
      : '<span style="font-size:0.6rem;background:rgba(0,240,184,0.1);color:var(--ok);border:1px solid rgba(0,240,184,0.25);border-radius:100px;padding:1px 7px;margin-left:6px;">🚢 Aktif</span>';
    var sub = isTatil
      ? 'Son gemi: '+(p.vesselHistory&&p.vesselHistory.length?p.vesselHistory[p.vesselHistory.length-1].vessel:'-')
      : p.vessel||'Gemi yok';
    return '<div onclick="pAdNameSelect(\''+p.id+'\')" style="padding:0.55rem 0.9rem;cursor:pointer;border-bottom:1px solid rgba(0,216,200,0.07);transition:background 0.15s;" onmouseover="this.style.background=\'rgba(0,216,200,0.07)\'" onmouseout="this.style.background=\'\'">'+
      '<div style="display:flex;align-items:center;font-size:0.82rem;font-weight:600;color:var(--text);">'+p.name+tag+'</div>'+
      '<div style="font-family:\'DM Mono\',monospace;font-size:0.62rem;color:var(--muted);margin-top:2px;">'+sub+'</div>'+
    '</div>';
  }).join('');

  drop.style.display = 'block';
}

function pAdNameSelect(id) {
  var data = perfLoadData();
  var p = data.find(function(x){ return x.id===id; });
  var drop = document.getElementById('pAdNameDrop');
  drop.style.display = 'none';

  if (!p) return;

  document.getElementById('pAdName').value = p.name;
  document.getElementById('pAdRole').value = p.role;

  if (p.status === 'aktif') {
    alert('⚠️ ' + p.name + ' zaten aktif olarak sistemde kayıtlı.\n\nDeğişiklik yapmak için "Personel Yönetimi" sekmesini kullanın.');
    document.getElementById('pAdName').value = '';
    return;
  }
  alert('✅ ' + p.name + ' seçildi.\nHalen tatilde. Lütfen gemi ve başlama tarihini seçerek ekleyin.\n\nNot: Bu kişi daha önce sistemde kayıtlıydı — geçmiş verileri korunacak.');
}

function pAdNameClear() {
  document.getElementById('pAdName').value = '';
  document.getElementById('pAdNameDrop').style.display = 'none';
  document.getElementById('pAdName').focus();
}
function pAdVesselToggle() {
  var v = document.getElementById('pAdVessel').value;
  var startContainer = document.getElementById('pAdStartContainer');
  if (v === 'tatilde') {
    startContainer.style.display = 'none';
  } else {
    startContainer.style.display = 'block';
  }
}

function perfAddPersonel(){
  var name=document.getElementById('pAdName').value.trim();
  var role=document.getElementById('pAdRole').value;
  var vessel=document.getElementById('pAdVessel').value;
  var start=document.getElementById('pAdStart').value;
  var mat=document.getElementById('pAdMat').value;
  
  if(!name){alert('Ad Soyad giriniz.');return;}
  if(!vessel){alert('Gemi seçiniz veya Tatilde olarak işaretleyiniz.');return;}
  if(vessel !== 'tatilde' && !start){alert('Göreve başlama tarihi giriniz.');return;}
  
  var by = VESSEL_BUILD_YEARS[vessel] || 2010;
  
  // Tatilde seçildiyse statüyü ayarla ve gemi/tarih verisini boş bırak
  var pStatus = (vessel === 'tatilde') ? 'tatil' : 'aktif';
  var pVessel = (vessel === 'tatilde') ? '' : vessel;
  var pStart = (vessel === 'tatilde') ? '' : start;

  var data=perfLoadData();
  var ex=data.find(function(p){ return p.name.toLowerCase()===name.toLowerCase(); });
  if(ex){ alert(name+' zaten kayıtlı. "Personel Yönetimi" sekmesinden düzenleyiniz.'); return; }
  
  data.push({
    id:'p_'+Date.now(), name:name, role:role, vessel:pVessel, 
    startDate:pStart, status:pStatus, matSiklik:parseInt(mat)||0, 
    buildYear:by, pscRecords:[], rightshipRecords:[], vesselHistory:[]
  });  
  // Arşiv (Tatil) tablolarını da yenilemek için perfRenderArchive() eklendi
  perfSaveData(data); perfRenderAll(); perfRenderArchive(); renderEditPersonList();
  alert('Personel eklendi: '+name);
  
  ['pAdName','pAdStart','pAdMat'].forEach(function(id){ document.getElementById(id).value=''; });
  document.getElementById('pAdVessel').value='';
  document.getElementById('pAdStartContainer').style.display='block'; // Formu sıfırlayınca tarihi geri göster
}

// EKRAN GEÇİŞLERİ İÇİN YARDIMCI FONKSİYONLAR
function goBackToPersonList() {
  document.getElementById('editShipSelectionWrapper').style.display = 'none';
  document.getElementById('editPersonListWrapper').style.display = 'block';
  _editingPersonelId = null;
  renderEditPersonList();
}

function goBackToShipSelection() {
  document.getElementById('editPersonForm').style.display = 'none';
  document.getElementById('editPastShipForm').style.display = 'none';
  document.querySelector('.perf-admin-body').scrollTop = 0;
  loadEditForm(_editingPersonelId); 
}

function loadEditForm(id){
  _editingPersonelId = id;
  var data = perfLoadData(), p = data.find(function(x){ return x.id===id; });
  if(!p) return;
  
  document.getElementById('editPersonListWrapper').style.display = 'none';
  document.getElementById('editPersonForm').style.display = 'none';
  document.getElementById('editPastShipForm').style.display = 'none';
  document.getElementById('editShipSelectionWrapper').style.display = 'block';
  
  document.getElementById('shipSelectionTitle').innerHTML = '👤 ' + p.name + ' <span style="font-size:0.75rem; color:var(--muted)">(' + (p.role==='kaptan'?'Kaptan':'Çarkçıbaşı') + ')</span>';
  
  var curBtn = document.getElementById('currentShipBtn');
  if(p.status === 'tatil') {
      curBtn.innerHTML = '<div class="edit-person-item" onclick="openCurrentShipForm()" style="background:rgba(232,184,75,0.08); border-color:rgba(232,184,75,0.3); cursor:pointer;"><div class="epi-name" style="color:var(--warn)">🌴 Personel Tatilde / Arşivde</div><div class="epi-sub">Ana bilgileri, malzeme sıklığını veya PSC kayıtlarını düzenlemek için tıklayın.</div></div>';
  } else {
      curBtn.innerHTML = '<div class="edit-person-item" onclick="openCurrentShipForm()" style="cursor:pointer; background:rgba(0,216,200,0.08);"><div class="epi-name" style="color:var(--teal)">🚢 ' + (p.vessel||'Gemi Yok') + ' (Güncel)</div><div class="epi-sub">Başlama: ' + (p.startDate||'—') + ' — Tıklayıp düzenleyin.</div></div>';
  }
  
  var pastList = document.getElementById('pastShipsList');
  if(!p.vesselHistory || p.vesselHistory.length === 0) {
      pastList.innerHTML = '<div style="color:var(--muted); font-size:0.75rem; font-family:\'DM Mono\'; padding:1rem 0;">Kayıtlı geçmiş gemisi bulunmuyor.</div>';
  } else {
      pastList.innerHTML = p.vesselHistory.map(function(h, idx) {
          return '<div class="edit-person-item" onclick="openPastShipForm(' + idx + ')" style="margin-bottom:0.5rem; background:rgba(255,255,255,0.02); border-color:rgba(255,255,255,0.1); cursor:pointer;"><div class="epi-name" style="color:var(--text)">🚢 ' + h.vessel + '</div><div class="epi-sub">' + h.start + ' → ' + h.end + ' <span style="color:var(--gold)">(Skor: ' + (h.score||'-') + ')</span></div></div>';
      }).join('');
  }
}

function openCurrentShipForm() {
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;
  
  document.getElementById('editShipSelectionWrapper').style.display = 'none';
  
  document.getElementById('editName').value=p.name;
  document.getElementById('editRole').value=p.role;
  document.getElementById('editVessel').value=p.vessel||'';
  document.getElementById('editStart').value=p.startDate||'';
  document.getElementById('editMat').value=p.matSiklik||0;
  document.getElementById('editBuildYear').value=p.buildYear||2010;
  
  renderPscHistoryList(p.pscRecords);
renderRightshipHistoryList(p.rightshipRecords);
renderServiceHistoryList();
  
  document.getElementById('editPersonForm').style.display = 'block';
  document.querySelector('.perf-admin-body').scrollTop = 0; 
}

function openPastShipForm(index) {
  _editingPastShipIndex = index;
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p || !p.vesselHistory || !p.vesselHistory[index]) return;
  
  var h = p.vesselHistory[index];
  document.getElementById('editShipSelectionWrapper').style.display = 'none';
  
  document.getElementById('editPastVessel').value = h.vessel;
  document.getElementById('editPastScore').value = h.score || '';
  document.getElementById('editPastStart').value = h.start || '';
  document.getElementById('editPastEnd').value = h.end || '';
  
  document.getElementById('editPastShipForm').style.display = 'block';
  document.querySelector('.perf-admin-body').scrollTop = 0;
}

function perfSaveEdit(){
  if(!_editingPersonelId) return;
  var data=perfLoadData(), p=data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;
  
  var newVessel = document.getElementById('editVessel').value;
  var newStart = document.getElementById('editStart').value;

  if(p.status === 'tatil' && newVessel && newStart) {
    p.status = 'aktif'; p.vessel = newVessel; p.startDate = newStart; delete p.savedScore;
  }
  else if(p.status !== 'tatil' && p.vessel && p.vessel !== newVessel && newVessel){
    var currentScore = calcTotal(p, data);
    if(!p.vesselHistory) p.vesselHistory=[];
    p.vesselHistory.push({ vessel: p.vessel, start: p.startDate||'—', end: new Date().toLocaleDateString('tr-TR'), months: monthDiff(p.startDate), score: currentScore });
    p.vessel = newVessel; p.startDate = newStart; delete p.savedScore; 
  }
  else {
    p.vessel = newVessel || p.vessel; p.startDate = newStart || p.startDate;
  }

  p.name=document.getElementById('editName').value.trim()||p.name;
  p.role=document.getElementById('editRole').value;
  p.matSiklik=parseInt(document.getElementById('editMat').value)||0;
  
  perfSaveData(data); perfRenderAll(); perfRenderArchive(); 
  alert('✅ Güncel bilgiler başarıyla kaydedildi!');
  goBackToShipSelection();
}

function perfSavePastShip() {
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p || !p.vesselHistory || !p.vesselHistory[_editingPastShipIndex]) return;
  
  p.vesselHistory[_editingPastShipIndex].vessel = document.getElementById('editPastVessel').value;
  p.vesselHistory[_editingPastShipIndex].score = parseFloat(document.getElementById('editPastScore').value) || 0;
  p.vesselHistory[_editingPastShipIndex].start = document.getElementById('editPastStart').value;
  p.vesselHistory[_editingPastShipIndex].end = document.getElementById('editPastEnd').value;
  
  perfSaveData(data); perfRenderArchive();
  alert('✅ Geçmiş kayıt başarıyla güncellendi!');
  goBackToShipSelection();
}

function perfDeletePastShip() {
  if(!confirm('Bu geçmiş gemi kaydını silmek istediğinize emin misiniz?')) return;
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p || !p.vesselHistory) return;
  
  p.vesselHistory.splice(_editingPastShipIndex, 1);
  perfSaveData(data); perfRenderArchive();
  alert('🗑️ Geçmiş kayıt silindi!');
  goBackToShipSelection();
}

function perfDeletePersonel(){
  if(!_editingPersonelId){alert('Silmek için bir personel seçin.');return;}
  var data=perfLoadData(), p=data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;
  if(!confirm(p.name+' kalıcı olarak silinecek. Emin misiniz?\n(Geçici ayrılışlar için aşağıdaki "Ayrılışı Kaydet" butonunu kullanın.)')) return;
  data=data.filter(function(x){ return x.id!==_editingPersonelId; });
  _editingPersonelId=null;
  perfSaveData(data); perfRenderAll(); perfRenderArchive(); renderEditPersonList();
  document.getElementById('editPersonForm').style.display='none';
  alert('Silindi.');
}

function perfDepartPersonel(){
  if(!_editingPersonelId){alert('Lütfen önce ayrılacak personeli seçin.');return;}
  var data=perfLoadData(), p=data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p){alert('Bulunamadı.');return;}

  if(p.status === 'tatil') { alert("Bu personel zaten tatilde/arşivde!"); return; }

  var depDate=document.getElementById('editDepartDate').value;
  if(!depDate){alert('Ayrılış tarihi giriniz.');return;}
  if(!confirm('Personel tatil listesine alınacak ve gemisi boşaltılacak. Emin misiniz?')) return;
  
  var currentScore = calcTotal(p, data);
  
  if(!p.vesselHistory) p.vesselHistory=[];
  p.vesselHistory.push({
      vessel: p.vessel, 
      start: p.startDate||'—', 
      end: new Date(depDate).toLocaleDateString('tr-TR'), 
      months: monthDiff(p.startDate),
      score: currentScore
  });
  
  p.savedScore = currentScore; 
  p.status = 'tatil';
  p.vessel = '';
  p.startDate = '';
  
  perfSaveData(data); 
  perfRenderAll(); 
  perfRenderArchive(); 
  
  _editingPersonelId=null;
  renderEditPersonList();
  document.getElementById('editPersonForm').style.display='none';
  alert(p.name+' tatil listesine taşındı.'); 
  document.getElementById('editDepartDate').value='';
}
function renderServiceHistoryList() {
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;
  var container = document.getElementById('editServiceHistoryList');
  if(!container) return;
  var hist = p.vesselHistory || [];
  if(!hist.length) {
      container.innerHTML = '<div style="color:var(--muted); font-size:0.75rem; font-family:\'DM Mono\'; padding:0.5rem 0;">Kayıtlı hizmet geçmişi yok.</div>';
      return;
  }
  container.innerHTML = hist.map(function(h, idx) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.2);border:1px solid rgba(0,216,200,0.1);border-radius:8px;padding:0.6rem 0.8rem;margin-bottom:0.4rem;">' +
          '<span style="font-family:\'DM Mono\';font-size:0.8rem;font-weight:700;color:var(--text);">🚢 ' + (h.vessel||'?') + '</span>' +
          '<span style="font-family:\'DM Mono\';font-size:0.75rem;color:var(--warn);">' + (h.months||0) + ' ay</span>' +
          '<button onclick="deleteServiceHistory(' + idx + ')" style="background:rgba(255,90,114,0.1);border:1px solid rgba(255,90,114,0.3);color:var(--bad);padding:3px 8px;border-radius:5px;cursor:pointer;font-size:0.7rem;">🗑 Sil</button>' +
      '</div>';
  }).join('');
}
function calcServiceMonths() {
  var s = document.getElementById('newServiceStart').value;
  var e = document.getElementById('newServiceEnd').value;
  var preview = document.getElementById('newServiceMonthsPreview');
  if(!s || !e) { if(preview) preview.textContent = ''; return 0; }
  var start = new Date(s), end = new Date(e);
  if(end <= start) { if(preview) preview.textContent = '⚠ Bitiş tarihi başlama tarihinden önce olamaz.'; return 0; }
  var months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if(preview) preview.textContent = '→ Hesaplanan süre: ' + months + ' ay';
  return months;
}
function addServiceHistory() {
  var vessel = document.getElementById('newServiceVessel').value;
  var startVal = document.getElementById('newServiceStart').value;
  var endVal = document.getElementById('newServiceEnd').value;
  if(!vessel) { alert('Lütfen bir gemi seçin.'); return; }
  if(!startVal || !endVal) { alert('Başlama ve bitiş tarihlerini girin.'); return; }
  var months = calcServiceMonths();
  if(months <= 0) { alert('Geçerli bir tarih aralığı girin.'); return; }
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;
  if(!p.vesselHistory) p.vesselHistory = [];
  // Tarihleri dd.mm.yyyy formatına çevir
  function fmtDate(d) {
      var dt = new Date(d);
      return dt.toLocaleDateString('tr-TR');
  }
  p.vesselHistory.push({ vessel: vessel, months: months, start: fmtDate(startVal), end: fmtDate(endVal), score: 0 });
  perfSaveData(data);
  document.getElementById('newServiceVessel').value = '';
  document.getElementById('newServiceStart').value = '';
  document.getElementById('newServiceEnd').value = '';
  document.getElementById('newServiceMonthsPreview').textContent = '';
  renderServiceHistoryList();
  perfRenderAll();
  alert('✅ Hizmet kaydı eklendi. (' + months + ' ay)');
}

function deleteServiceHistory(idx) {
  if(!confirm('Bu hizmet kaydını silmek istediğinize emin misiniz?')) return;
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p || !p.vesselHistory) return;
  p.vesselHistory.splice(idx, 1);
  perfSaveData(data);
  renderServiceHistoryList();
  perfRenderAll();
  alert('🗑️ Hizmet kaydı silindi.');
}

// ══════════════════════
//  KAYIT DÜZENLE & YÖNETİM
// ══════════════════════
function renderEditPersonList(){
  var data=perfLoadData();
  var list=document.getElementById('editPersonList');
  if(!list) return;
  if(!data.length){ list.innerHTML='<div style="color:var(--muted);font-family:\'DM Mono\',monospace;font-size:.7rem;padding:.5rem;">Kayıtlı personel yok.</div>'; return; }
  list.innerHTML=data.map(function(p){
    var isTatil = p.status === 'tatil';
    var statLabel = isTatil ? '<span style="color:var(--warn);font-size:0.7rem;">🌴 Tatilde</span>' : '<span style="color:var(--ok);font-size:0.7rem;">🚢 Aktif</span>';
    var subText = isTatil ? 'Son Gemi: ' + (p.vesselHistory&&p.vesselHistory.length ? p.vesselHistory[p.vesselHistory.length-1].vessel : '-') : (p.vessel||'Gemi Yok') + ' · Başlama: ' + (p.startDate||'—');
    return '<div class="edit-person-item'+(p.id===_editingPersonelId?' selected':'')+'" onclick="loadEditForm(\''+p.id+'\')" style="display:flex;align-items:center;justify-content:space-between;">'+
      '<div style="flex:1;min-width:0;">'+
        '<div class="epi-name" style="display:flex;align-items:center;gap:8px;">'+p.name+' '+statLabel+'</div>'+
        '<div class="epi-sub">'+subText+'</div>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'+
        '<span class="epi-role '+p.role+'">'+(p.role==='kaptan'?'Kaptan':'Çarkçıbaşı')+'</span>'+
   '<button onclick="event.stopPropagation();perfQuickDelete(\''+p.id+'\',\''+p.name+'\')" style="background:rgba(255,90,114,0.08);border:1px solid rgba(255,90,114,0.3);color:var(--bad);border-radius:7px;padding:3px 10px;font-size:0.65rem;cursor:pointer;font-family:\'DM Mono\',monospace;white-space:nowrap;">🗑 Personeli Sil</button>'+
(!isTatil ? '<button onclick="event.stopPropagation();perfQuickDepart(\''+p.id+'\',\''+p.name+'\')" style="background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.3);color:var(--warn);border-radius:7px;padding:3px 10px;font-size:0.65rem;cursor:pointer;font-family:\'DM Mono\',monospace;white-space:nowrap;">🌴 Tatile Gönder</button>' : '')+
      '</div>'+
    '</div>';
  }).join('');
}

function perfQuickDelete(id, name) {
  if(!confirm('⚠️ ' + name + '\n\nVeriler kalıcı olarak silinecektir, silmek istediğinize emin misiniz?')) return;
  var data = perfLoadData();
  data = data.filter(function(x){ return x.id !== id; });
  if(_editingPersonelId === id){
    _editingPersonelId = null;
    document.getElementById('editPersonForm').style.display = 'none';
  }
  perfSaveData(data);
  perfRenderAll();
  perfRenderArchive();
  renderEditPersonList();
}

function perfQuickDepart(id, name) {
  var data = perfLoadData();
  var p = data.find(function(x){ return x.id === id; });
  if(!p) return;
  if(p.status === 'tatil') { alert(name + ' zaten tatilde!'); return; }

  var depDate = prompt('🌴 ' + name + ' tatile gönderiliyor.\n\nKontrol bitiş tarihini giriniz (GG.AA.YYYY):');
  if(!depDate) return;

  var dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
  if(!dateRegex.test(depDate)) {
    alert('❌ Geçersiz tarih formatı. Lütfen GG.AA.YYYY formatında giriniz.\nÖrnek: 15.06.2025');
    return;
  }

  if(!confirm('⚠️ ' + name + '\n\nGörev bitiş tarihi: ' + depDate + '\nPersonel tatil listesine alınacak ve gemisi boşaltılacak.\n\nEmin misiniz?')) return;

  var currentScore = calcTotal(p, data);

  if(!p.vesselHistory) p.vesselHistory = [];
  p.vesselHistory.push({
    vessel:  p.vessel,
    start:   p.startDate || '—',
    end:     depDate,
    months:  monthDiff(p.startDate),
    score:   currentScore
  });

  p.savedScore = currentScore;
  p.status     = 'tatil';
  p.vessel     = '';
  p.startDate  = '';

  perfSaveData(data);
  perfRenderAll();
  perfRenderArchive();
  renderEditPersonList();

  if(_editingPersonelId === id) {
    _editingPersonelId = null;
    document.getElementById('editPersonForm').style.display = 'none';
  }

  alert('✅ ' + name + ' tatil listesine taşındı.\nGörev bitiş tarihi: ' + depDate);
}
function renderPscHistoryList(records) {
  var list = document.getElementById('editPscList');
  if(!records || !records.length) {
      list.innerHTML = '<div style="color:var(--muted);font-family:\'DM Mono\';font-size:0.65rem;">Bu personele ait PSC kaydı bulunmuyor.</div>';
      return;
  }
  list.innerHTML = records.map(function(r, i) {
      var vName = r.vessel ? ('<span style="color:var(--teal)">[' + r.vessel + ']</span> ') : '';
      var resultColor = r.result==='clear' ? 'var(--ok)' : r.result==='remark' ? 'var(--warn)' : 'var(--bad)';
      return '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:0.5rem 0.7rem; border:1px solid rgba(0,216,200,0.1); border-radius:6px; margin-bottom:0.3rem;">'+
             '<div style="font-family:\'DM Mono\'; font-size:0.7rem; color:var(--text); flex:1; min-width:0;">' + vName + r.date + ' — ' + r.port + ', ' + r.country + ' <span style="color:'+resultColor+';font-weight:700;">(' + r.result.toUpperCase() + ')</span></div>'+
             '<div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;">'+
               '<button onclick="perfEditPSC(' + i + ')" style="background:rgba(0,216,200,0.08);border:1px solid rgba(0,216,200,0.25);color:var(--teal);border-radius:6px;padding:3px 10px;font-size:0.65rem;cursor:pointer;font-family:\'DM Mono\',monospace;white-space:nowrap;">✏️ Düzenle</button>'+
               '<button onclick="perfDeletePSC(' + i + ')" style="background:transparent;border:none;color:var(--bad);cursor:pointer;font-size:0.8rem;padding:2px 4px;">🗑</button>'+
             '</div>'+
             '</div>';
  }).join('');
}
function perfDeletePSC(idx) {
  if(!confirm('Bu PSC kaydını silmek istediğinize emin misiniz?')) return;
  var data=perfLoadData(), p=data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;
  p.pscRecords.splice(idx, 1);
  perfSaveData(data); perfRenderAll();
  renderPscHistoryList(p.pscRecords);
}

// ── PSC DÜZENLE MODAL ──────────────────────────────────
var _editingPscIdx = -1;
var _eSelectedPscResult = '';

function perfEditPSC(idx) {
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p || !p.pscRecords || !p.pscRecords[idx]) return;
  var r = p.pscRecords[idx];
  _editingPscIdx = idx;

  // Subtitle
  document.getElementById('editPscSubtitle').textContent = (r.vessel ? '['+r.vessel+'] ' : '') + r.date + ' — ' + r.country;

  // Alanları doldur
  document.getElementById('ePscVessel').value  = r.vessel  || '';
  document.getElementById('ePscPort').value    = r.port    || '';
  document.getElementById('ePscCountry').value = r.country || '';

  // Tarihi ISO formatına çevir (GG.AA.YYYY → YYYY-MM-DD)
  var d = r.date || '';
  if(d.indexOf('.') > -1) { var dp=d.split('.'); d=dp[2]+'-'+dp[1]+'-'+dp[0]; }
  document.getElementById('ePscDate').value = d;

  // Sonuç butonunu seç
  ePscSelectResult(r.result || 'clear');

  // Remarkları doldur
  var eList = document.getElementById('eRemarkList');
  eList.innerHTML = '';
  if(r.result !== 'clear' && r.remarks && r.remarks.length) {
    r.remarks.forEach(function(rm) { eAddRemarkRow(rm.desc, rm.groundForDetention); });
  }
  eUpdateRemarkCountBadge();
  // Manuel puan alanlarını doldur
  var mCheck = document.getElementById('ePscManualCheck');
  var mScore = document.getElementById('ePscManualScore');
  if (mCheck && mScore) {
    var hasManual = r.manualScore !== undefined && r.manualScore !== null && r.manualScore !== '';
    mCheck.checked = hasManual;
    mScore.disabled = !hasManual;
    mScore.value = hasManual ? r.manualScore : '';
  }

  // Modali aç
  var ov = document.getElementById('pscEditOverlay');
  ov.style.display = 'flex';
}
// --- RIGHTSHIP ADMIN FONKSİYONLARI ---
function rsSelectResult(result){
  _selectedRsResult = result;
  ['clear','remark'].forEach(function(r){
    var btn = document.getElementById('rsBtn'+r.charAt(0).toUpperCase()+r.slice(1));
    if(btn) btn.className = 'psc-result-btn'+(result===r?' active-'+r:'');
  });
  
  var detailSec = document.getElementById('rsDetailSection');
  if(result === 'clear'){
    detailSec.style.display = 'none';
    document.getElementById('pRsTotal').value = '0';
    document.getElementById('pRsHigh').value = '0';
    document.getElementById('pRsMed').value = '0';
    document.getElementById('pRsLow').value = '0';
  } else {
    detailSec.style.display = 'block';
  }
}

function renderRightshipHistoryList(records) {
  var list = document.getElementById('editRightshipList');
  if(!records || !records.length) {
      list.innerHTML = '<div style="color:var(--muted);font-family:\'DM Mono\';font-size:0.65rem;">Bu personele ait Rightship kaydı bulunmuyor.</div>';
      return;
  }
  list.innerHTML = records.map(function(r, i) {
      var vName = r.vessel ? ('<span style="color:var(--teal)">[' + r.vessel + ']</span> ') : '';
      var riskColor = r.result === 'clear' ? 'var(--ok)' : (r.high > 0 ? 'var(--bad)' : 'var(--warn)');
      var statText = r.result === 'clear' ? 'CLEAR' : (r.totalFindings + ' Findings');
      return '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:0.5rem 0.7rem; border:1px solid rgba(0,216,200,0.1); border-radius:6px; margin-bottom:0.3rem;">'+
             '<div style="font-family:\'DM Mono\'; font-size:0.7rem; color:var(--text); flex:1; min-width:0;">' + vName + r.date + ' — ' + r.port + ', ' + r.country + ' <span style="color:'+riskColor+';font-weight:700;">(' + statText + ')</span></div>'+
             '<div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;">'+
               '<button onclick="perfDeleteRightship(' + i + ')" style="background:transparent;border:none;color:var(--bad);cursor:pointer;font-size:0.8rem;padding:2px 4px;">🗑</button>'+
             '</div>'+
             '</div>';
  }).join('');
}

function perfDeleteRightship(idx) {
  if(!confirm('Bu Rightship kaydını silmek istediğinize emin misiniz?')) return;
  var data=perfLoadData(), p=data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;
  p.rightshipRecords.splice(idx, 1);
  perfSaveData(data); perfRenderAll();
  renderRightshipHistoryList(p.rightshipRecords);
}

function perfAddRightship() {
  if(!_editingPersonelId) { alert('Lütfen bir personel seçin.'); return; }
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;

  var rsVessel = document.getElementById('pRsVessel').value;
  var rsDate = document.getElementById('pRsDate').value;
  var rsPort = document.getElementById('pRsPort').value.trim();
  var rsCountry = document.getElementById('pRsCountry').value.trim();
  
  if(!rsVessel || !rsDate || !rsPort || !rsCountry) { alert('Gemi, Tarih, Liman ve Ülke zorunludur.'); return; }
  if(!_selectedRsResult) { alert('Lütfen sonucu (Clear / Remark) seçin.'); return; }

  var totalF = parseInt(document.getElementById('pRsTotal').value) || 0;
  var highF = parseInt(document.getElementById('pRsHigh').value) || 0;
  var medF = parseInt(document.getElementById('pRsMed').value) || 0;
  var lowF = parseInt(document.getElementById('pRsLow').value) || 0;

  var by = VESSEL_BUILD_YEARS[rsVessel] || 2010;
  if(!p.rightshipRecords) p.rightshipRecords = [];
  
  p.rightshipRecords.push({
    vessel: rsVessel, buildYear: by, result: _selectedRsResult,
    date: new Date(rsDate).toLocaleDateString('tr-TR'), port: rsPort, country: rsCountry, 
    totalFindings: totalF, high: highF, medium: medF, low: lowF
  });

  perfSaveData(data); perfRenderAll(); renderRightshipHistoryList(p.rightshipRecords);
  
  // Inputları temizle
  document.getElementById('pRsVessel').value = ''; document.getElementById('pRsDate').value = ''; 
  document.getElementById('pRsPort').value = ''; document.getElementById('pRsCountry').value = '';
  document.getElementById('pRsTotal').value = '0'; document.getElementById('pRsHigh').value = '0';
  document.getElementById('pRsMed').value = '0'; document.getElementById('pRsLow').value = '0';
  rsSelectResult('clear');
  alert('✅ Rightship Kaydı başarıyla eklendi!');
}

function closePscEditModal() {
  document.getElementById('pscEditOverlay').style.display = 'none';
  _editingPscIdx = -1;
  var mCheck = document.getElementById('ePscManualCheck');
  var mScore = document.getElementById('ePscManualScore');
  if (mCheck) { mCheck.checked = false; }
  if (mScore) { mScore.disabled = true; mScore.value = ''; }
}

function ePscSelectResult(result) {
  _eSelectedPscResult = result;
  ['clear','remark','detained'].forEach(function(r){
    var btn = document.getElementById('ePscBtn'+r.charAt(0).toUpperCase()+r.slice(1));
    if(btn) btn.className = 'psc-result-btn'+(result===r?' active-'+result:'');
  });
  var sec = document.getElementById('ePscDetailSection');
  if(result === 'clear') {
    sec.style.display = 'none';
    document.getElementById('eRemarkList').innerHTML = '';
    eUpdateRemarkCountBadge();
  } else {
    sec.style.display = 'block';
    if(document.getElementById('eRemarkList').children.length === 0) eAddRemarkRow();
  }
}

function eAddRemarkRow(desc, isDetention) {
  var list = document.getElementById('eRemarkList');
  if(list.children.length >= 30) { alert('Maksimum 30 remark ekleyebilirsiniz.'); return; }
  var idx = list.children.length + 1;
  var div = document.createElement('div');
  div.className = 'remark-item';
  div.innerHTML = '<span class="remark-item-num">#'+idx+'</span>'+
    '<input class="remark-item-desc" placeholder="Remark açıklaması..." type="text" value="'+(desc||'')+'">'+
    '<select class="remark-item-det">'+
      '<option value="no"'+(isDetention?'':' selected')+'>Ground for Detention? Hayır</option>'+
      '<option value="yes"'+(isDetention?' selected':'')+'>Ground for Detention? Evet</option>'+
    '</select>'+
    '<button class="remark-item-del" onclick="eRemoveRemarkRow(this)">✕</button>';
  list.appendChild(div);
  eUpdateRemarkCountBadge();
}

function eRemoveRemarkRow(btn) {
  btn.closest('.remark-item').remove();
  var items = document.getElementById('eRemarkList').querySelectorAll('.remark-item-num');
  items.forEach(function(el,i){ el.textContent='#'+(i+1); });
  eUpdateRemarkCountBadge();
}

function eUpdateRemarkCountBadge() {
  var n = document.getElementById('eRemarkList').children.length;
  var badge = document.getElementById('eRemarkCountBadge');
  if(badge) badge.textContent = n + ' remark';
}

function eGetRemarkListData() {
  var rows = document.getElementById('eRemarkList').querySelectorAll('.remark-item');
  var result = [];
  rows.forEach(function(row){
    var desc = row.querySelector('.remark-item-desc').value.trim();
    var det  = row.querySelector('.remark-item-det').value;
    result.push({ desc: desc||'(Açıklama girilmedi)', groundForDetention: det==='yes' });
  });
  return result;
}
function perfSaveEditPSC() {
  if(_editingPscIdx < 0) return;
  var vessel  = document.getElementById('ePscVessel').value;
  var dateVal = document.getElementById('ePscDate').value;
  var port    = document.getElementById('ePscPort').value.trim();
  var country = document.getElementById('ePscCountry').value;

  if(!vessel || !dateVal || !port || !country) { alert('Gemi, Tarih, Liman ve Ülke zorunludur.'); return; }
  if(!_eSelectedPscResult) { alert('Lütfen sonucu seçin.'); return; }

  var remarks = [];
  if(_eSelectedPscResult !== 'clear') {
    remarks = eGetRemarkListData();
    if(remarks.length === 0 && _eSelectedPscResult === 'detained') {
      alert('Detention için en az 1 remark girmelisiniz!'); return;
    }
  }

  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p || !p.pscRecords) return;

  // --- AI KANCASI BURADA DEVREYE GİRİYOR ---
  processRemarksWithAI(remarks, function(finalRemarks) {
      var by = VESSEL_BUILD_YEARS[vessel] || p.pscRecords[_editingPscIdx].buildYear || 2010;
      
      // Manuel Puanı Güvenli Şekilde Al (0 dahil)
      var finalManualScore = null;
      var cb = document.getElementById('ePscManualCheck');
      var v  = document.getElementById('ePscManualScore');
      if (cb && cb.checked && v && v.value !== '') {
          finalManualScore = parseFloat(v.value);
      }

      p.pscRecords[_editingPscIdx] = {
        vessel: vessel, buildYear: by,
        date: new Date(dateVal).toLocaleDateString('tr-TR'),
        port: port, country: country,
        result: _eSelectedPscResult, 
        remarks: finalRemarks,
        manualScore: finalManualScore
      };

      perfSaveData(data); perfRenderAll();
      renderPscHistoryList(p.pscRecords);
      closePscEditModal();
      alert('✅ PSC Kaydı güncellendi!');
  });
}
// ───────────────────────────────────────────────────────
function perfAddPSC() {
  if(!_editingPersonelId) { alert('Lütfen bir personel seçin.'); return; }
  var data = perfLoadData(), p = data.find(function(x){ return x.id===_editingPersonelId; });
  if(!p) return;

  var pscVessel = document.getElementById('pPscVessel').value;
  var pscDate = document.getElementById('pPscDate').value;
  var pscPort = document.getElementById('pPscPort').value.trim();
  var pscCountry = document.getElementById('pPscCountry').value;

  if(!pscVessel || !pscDate || !pscPort || !pscCountry) { alert('Gemi, Tarih, Liman ve Ülke zorunludur.'); return; }
  if(!_selectedPscResult) { alert('Lütfen sonucu (Clear / Remark / Detention) seçin.'); return; }

  var remarks = [];
  if(_selectedPscResult !== 'clear') {
    remarks = getRemarkListData();
    if(remarks.length === 0 && _selectedPscResult === 'detained') {
      alert('Detention için en az 1 remark girmelisiniz!'); return;
    }
  }

  // --- AI KANCASI BURADA DEVREYE GİRİYOR ---
  processRemarksWithAI(remarks, function(finalRemarks) {
      var by = VESSEL_BUILD_YEARS[pscVessel] || 2010;
      if(!p.pscRecords) p.pscRecords = [];
      
      // HTML'deki karışık ID'leri tarayarak Puanı (0 Dahil) al
      var finalManualScore = null;
      var wrap = document.getElementById('pPscManuelInputWrapper');
      var inp1 = document.getElementById('pPscManuelScore');
      var cb = document.getElementById('bPscManualCheck'); // Hatalı HTML kimliği
      var inp2 = document.getElementById('bPscManualScore'); // Hatalı HTML kimliği
      
      if (wrap && wrap.style.display !== 'none' && inp1 && inp1.value !== '') {
          finalManualScore = parseFloat(inp1.value);
      } else if (cb && cb.checked && inp2 && inp2.value !== '') {
          finalManualScore = parseFloat(inp2.value);
      }

      p.pscRecords.push({
        vessel: pscVessel, buildYear: by,
        date: new Date(pscDate).toLocaleDateString('tr-TR'), 
        port: pscPort, country: pscCountry, result: _selectedPscResult, 
        remarks: finalRemarks,
        manualScore: finalManualScore
      });

      // Formları sıfırla
      if(inp1) inp1.value = '';
      if(inp2) { inp2.value = ''; inp2.disabled = true; }
      if(cb) cb.checked = false;
      togglePscManuel_reset('p'); 

      perfSaveData(data); perfRenderAll(); renderPscHistoryList(p.pscRecords);
      
      document.getElementById('pPscVessel').value = ''; document.getElementById('pPscDate').value = ''; document.getElementById('pPscPort').value = ''; document.getElementById('pPscCountry').value = ''; pscSelectResult('clear');
      alert('✅ PSC Kaydı AI analizi ile başarıyla eklendi!');
  });
}
function bSelectResult(result) {
  _bSelectedPscResult = result;
  ['clear','remark','detained'].forEach(function(r){
    var btn = document.getElementById('bPscBtn'+r.charAt(0).toUpperCase()+r.slice(1));
    if(btn) btn.className = 'psc-result-btn'+(result===r?' active-'+result:'');
  });
  var sec = document.getElementById('bPscDetailSection');
  if(result === 'clear') {
    sec.style.display = 'none';
    document.getElementById('bRemarkList').innerHTML = '';
    bUpdateRemarkCountBadge();
  } else {
    sec.style.display = 'block';
    if(document.getElementById('bRemarkList').children.length === 0) bAddRemarkRow();
  }
}
function togglePscManuel(prefix) {
  var wrapper = document.getElementById(prefix + 'PscManuelInputWrapper');
  var btn = document.getElementById(prefix + 'PscManuelToggleBtn');
  if (!wrapper) return;
  var isOpen = wrapper.style.display !== 'none';
  wrapper.style.display = isOpen ? 'none' : 'block';
  btn.style.background = isOpen ? 'rgba(232,184,75,0.12)' : 'rgba(232,184,75,0.25)';
  btn.textContent = isOpen ? '🔧 Puanı Manuel Gir' : '✅ Manuel Mod Aktif';
  
}
function togglePscManuel_reset(prefix) {
  var wrapper = document.getElementById(prefix + 'PscManuelInputWrapper');
  var btn = document.getElementById(prefix + 'PscManuelToggleBtn');
  if (wrapper) wrapper.style.display = 'none';
  if (btn) { 
      btn.style.background = 'rgba(232,184,75,0.12)'; 
      btn.textContent = '🔧 Puanı Manuel Gir'; 
  }
}

function bAddRemarkRow(desc, isDetention) {
  var list = document.getElementById('bRemarkList');
  if(list.children.length >= 30) { alert('Maksimum 30 remark ekleyebilirsiniz.'); return; }
  var idx = list.children.length + 1;
  var div = document.createElement('div');
  div.className = 'remark-item';
  div.innerHTML = '<span class="remark-item-num">#'+idx+'</span>'+
    '<input class="remark-item-desc" placeholder="Remark açıklaması..." type="text" value="'+(desc||'')+'" style="font-family: \'Plus Jakarta Sans\', sans-serif;">'+
    '<select class="remark-item-det" style="font-family: \'Plus Jakarta Sans\', sans-serif;">'+
      '<option value="no"'+(isDetention?'':' selected')+'>Ground for Detention? Hayır</option>'+
      '<option value="yes"'+(isDetention?' selected':'')+'>Ground for Detention? Evet</option>'+
    '</select>'+
    '<button class="remark-item-del" onclick="bRemoveRemarkRow(this)">✕</button>';
  list.appendChild(div);
  bUpdateRemarkCountBadge();
}

function bRemoveRemarkRow(btn) {
  btn.closest('.remark-item').remove();
  var items = document.getElementById('bRemarkList').querySelectorAll('.remark-item-num');
  items.forEach(function(el,i){ el.textContent='#'+(i+1); });
  bUpdateRemarkCountBadge();
}

function bUpdateRemarkCountBadge() {
  var n = document.getElementById('bRemarkList').children.length;
  var badge = document.getElementById('bRemarkCountBadge');
  if(badge) badge.textContent = n + ' remark';
}

function bGetRemarkListData() {
  var rows = document.getElementById('bRemarkList').querySelectorAll('.remark-item');
  var result = [];
  rows.forEach(function(row){
    var desc = row.querySelector('.remark-item-desc').value.trim();
    var det  = row.querySelector('.remark-item-det').value;
    result.push({ desc: desc||'(Açıklama girilmedi)', groundForDetention: det==='yes' });
  });
  return result;
}

function saveBagimsizPsc() {
  var vessel  = document.getElementById('bPscVessel').value;
  var dateVal = document.getElementById('bPscDate').value;
  var port    = document.getElementById('bPscPort').value.trim();
  var country = document.getElementById('bPscCountry').value;

  if(!vessel || !dateVal || !port || !country) { alert('Gemi, Tarih, Liman ve Ülke zorunludur.'); return; }
  if(!_bSelectedPscResult) { alert('Lütfen sonucu (Clear / Remark / Detention) seçin.'); return; }

  var remarks = [];
  if(_bSelectedPscResult !== 'clear') {
    remarks = bGetRemarkListData();
    if(remarks.length === 0 && _bSelectedPscResult === 'detained') {
      alert('Detention için en az 1 remark girmelisiniz!'); return;
    }
  }

  // --- AI KANCASI BURADA DEVREYE GİRİYOR ---
  processRemarksWithAI(remarks, function(finalRemarks) {
      var by = VESSEL_BUILD_YEARS[vessel] || 2010;

      // Olası tüm manuel puanlama kutularını kontrol et (0 dahil)
      var finalManualScore = null;
      var wrap = document.getElementById('bPscManuelInputWrapper');
      var inp1 = document.getElementById('bPscManuelScore');
      var cb2 = document.getElementById('bPsc_ManualToggle');
      var inp2 = document.getElementById('bPsc_ManualScore');
      
      var tab = document.getElementById('admTabBagimsizPsc');
      var cb3 = tab ? tab.querySelector('#pPscManualCheck') : null;
      var inp3 = tab ? tab.querySelector('#pPscManualScore') : null;

      if(wrap && wrap.style.display !== 'none' && inp1 && inp1.value !== '') {
          finalManualScore = parseFloat(inp1.value);
      } else if(cb2 && cb2.checked && inp2 && inp2.value !== '') {
          finalManualScore = parseFloat(inp2.value);
      } else if(cb3 && cb3.checked && inp3 && inp3.value !== '') {
          finalManualScore = parseFloat(inp3.value);
      }

      bagimsizPscRecords.push({
        id: 'bpsc_' + Date.now(),
        vessel: vessel, buildYear: by,
        date: new Date(dateVal).toLocaleDateString('tr-TR'), 
        port: port, country: country, result: _bSelectedPscResult, 
        remarks: finalRemarks,
        manualScore: finalManualScore
      });

      // Alanları Sıfırla
      if(inp1) inp1.value = '';
      if(inp2) inp2.value = '';
      if(inp3) { inp3.value = ''; inp3.disabled = true; }
      if(cb2) cb2.checked = false;
      if(cb3) cb3.checked = false;
      togglePscManuel_reset('b');
      
      saveData(); 

      document.getElementById('bPscVessel').value = ''; 
      document.getElementById('bPscDate').value = ''; 
      document.getElementById('bPscPort').value = ''; 
      document.getElementById('bPscCountry').value = ''; 
      bSelectResult('clear');
      
      alert('✅ Bağımsız PSC Kaydı AI analizi ile şirket arşiv havuzuna eklendi!');
  });
}


function toggleComingSoon() {
    isComingSoonActive = !isComingSoonActive;
    localStorage.setItem('isComingSoonActive_v1', isComingSoonActive); // Anında lokale de kaydet
    updateComingSoonUI();
    saveData(); 
}
document.addEventListener('DOMContentLoaded', function() {
    updateComingSoonUI();
});
updateComingSoonUI();



// --- AI KATEGORİ SİSTEMİ ---


let pendingRemarksForAi = [];
let pendingSaveCallback = null;



function buildAiReviewTable(aiCategories) {
    let tbody = document.getElementById('aiReviewTableBody');
    let html = '';

    pendingRemarksForAi.forEach((r, idx) => {
        let suggestedCat = aiCategories[idx] || "99 - Other";
        let selectHtml = `<select class="perf-select" id="aiSelect_${idx}" style="font-size:0.7rem; padding:4px;">`;
        IMO_CATEGORIES.forEach(cat => {
            let selected = (cat === suggestedCat) ? "selected" : "";
            selectHtml += `<option value="${cat}" ${selected}>${cat}</option>`;
        });
        selectHtml += `</select>`;

        html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:10px 8px; color:var(--text); line-height:1.4;">${r.desc}</td>
            <td style="padding:10px 8px;">${selectHtml}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
    
    document.getElementById('aiLoadingState').style.display = 'none';
    document.getElementById('aiReviewState').style.display = 'block';
    document.getElementById('aiReviewFooter').style.display = 'block';

    document.getElementById('btnAiConfirm').onclick = function() {
        pendingRemarksForAi.forEach((r, idx) => {
            r.category = document.getElementById(`aiSelect_${idx}`).value;
        });
        document.getElementById('aiCategoryOverlay').style.display = 'none';
        pendingSaveCallback(pendingRemarksForAi); 
    };
}
flatRemarkMap.forEach(mapItem => {
  let selectEl = document.getElementById(`sel_${mapItem.refId}`);
  if (!selectEl) return;
  let newCat = selectEl.value;

  // Personel Verisi ise:
  if (mapItem.source === 'personel') {
      let person = pData.find(p => p.id === mapItem.personId);
      if (person && person.pscRecords[mapItem.pscIdx] && person.pscRecords[mapItem.pscIdx].remarks[mapItem.rmIdx]) {
          if (person.pscRecords[mapItem.pscIdx].remarks[mapItem.rmIdx].category !== newCat) {
              person.pscRecords[mapItem.pscIdx].remarks[mapItem.rmIdx].category = newCat;
              changedCount++;
          }
      }
  } 
  // Bağımsız (Şirket) PSC Verisi ise:
  else if (mapItem.source === 'bagimsiz') {
      if (bagimsizPscRecords[mapItem.bIdx] && bagimsizPscRecords[mapItem.bIdx].remarks[mapItem.rmIdx]) {
          if (bagimsizPscRecords[mapItem.bIdx].remarks[mapItem.rmIdx].category !== newCat) {
              bagimsizPscRecords[mapItem.bIdx].remarks[mapItem.rmIdx].category = newCat;
              changedCount++;
          }
      }
  }
});

if (changedCount > 0) {
  // Personel listesini günceller, ardından "saveData()" fonksiyonunu çağırıp bağımsız PSC'leri de buluta gömer
  perfSaveData(pData); 
  alert(`Başarılı! Toplam ${changedCount} remark kategorisi güncellendi.`);
} else {
  alert("Herhangi bir değişiklik yapılmadı.");
}

document.getElementById('remarkCatAdminOverlay').style.display = 'none';

// İşlem bitince verileri tazelemek için istatistik sekmesini yeniden çizdir
renderPscIstatView();
// ========================================================
//  GÜNDÜZ/GECE MODU (TOGGLE SWITCH) SİSTEMİ
// ========================================================
// ========================================================
//  GÜNDÜZ/GECE MODU (TOGGLE SWITCH) SİSTEMİ
// ========================================================

function toggleTheme() {
  const checkbox = document.getElementById('themeToggleCheckbox');
  const textLabel = document.getElementById('themeToggleText');
  const isLight = checkbox.checked; // Switch sağda mı (açık mı) kontrol et
  
  if (isLight) {
      document.body.classList.add('light-mode');
      localStorage.setItem('spark_theme_v1', 'light');
      if (textLabel) textLabel.innerText = 'Theme: Light';
  } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('spark_theme_v1', 'dark');
      if (textLabel) textLabel.innerText = 'Theme: Dark';
  }
}

// Sayfa ilk yüklendiğinde hafızaya bak ve anahtarı ona göre ayarla
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('spark_theme_v1');
  const checkbox = document.getElementById('themeToggleCheckbox');
  const textLabel = document.getElementById('themeToggleText');
  
  if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      if (checkbox) checkbox.checked = true; // Switch'i otomatik sağa çek
      if (textLabel) textLabel.innerText = 'Theme: Light';
  }
});
function renderHallOfFameCards() {
  const container = document.getElementById('hallOfFameContainer');
  const scrollArea = document.getElementById('hallOfFameScrollArea');
  if (!container || !scrollArea) return;

  // Eğer henüz hiç cuma günü geçmemişse ve kayıt yoksa alanı tamamen gizle
  if (!shipRankingHistory || shipRankingHistory.length === 0) {
      container.style.display = 'none';
      return;
  }

  container.style.display = 'block';
  container.classList.add('active');

  const reversedHistory = [...shipRankingHistory].reverse();

  let cardsHtml = '';
  reversedHistory.forEach(record => {
      cardsHtml += `
      <div class="hof-card">
          <div class="hof-date">📅 ${record.date}</div>
          <div class="hof-row" style="color: #FFD700; background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.2);">
              <span>🥇 1.</span> 
              <span style="letter-spacing: 0.05em;">${record.first || '-'}</span>
          </div>
          <div class="hof-row" style="color: #E0E0E0; background: rgba(224,224,224,0.08); border: 1px solid rgba(224,224,224,0.2);">
              <span>🥈 2.</span> 
              <span style="letter-spacing: 0.05em;">${record.second || '-'}</span>
          </div>
          <div class="hof-row" style="color: #CD7F32; background: rgba(205,127,50,0.08); border: 1px solid rgba(205,127,50,0.2);">
              <span>🥉 3.</span> 
              <span style="letter-spacing: 0.05em;">${record.third || '-'}</span>
          </div>
      </div>
      `;
  });

  scrollArea.innerHTML = cardsHtml;
}
// ══════════════════════════════════════════════════════
//  ENSPEKTÖR GEÇMİŞİ ARŞİVLEME SİSTEMİ
// ══════════════════════════════════════════════════════

function saveInspectorHistory() {
  // 1. Admin panelinden seçilen tarihi al
  const dateInput = document.getElementById('adminInspDate').value;
  if (!dateInput) {
      alert("⚠️ Lütfen kaydetmek istediğiniz haftanın tarihini seçin.");
      return;
  }

  // 2. Tarihi (YYYY-MM-DD) formatından (GG.AA.YYYY) formatına çevir
  const parts = dateInput.split('-');
  const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;

  // 3. Bu tarihte zaten bir kayıt var mı kontrol et
  const existingIndex = inspectorHistory.findIndex(h => h.date === formattedDate);
  if (existingIndex !== -1) {
      if (!confirm(`Bu tarihe (${formattedDate}) ait bir kayıt zaten var. Üzerine yazıp güncellensin mi?`)) {
          return;
      }
  }

  // 4. O anki güncel (canlı) enspektör puanlarını hesapla
  let currentData = [];
  Object.keys(inspectorMapping).forEach(name => {
      let scoreData = getInspectorScore(name); // { total, base, psc, rs } döndürür
      
      // Geçmiş ekranda "Dış Denetim Etkisi" olarak gösterilecek değer (PSC + Rightship Puanı Toplamı)
      let totalDisDenetimPuan = Math.round((scoreData.psc + scoreData.rs) * 10) / 10;

      currentData.push({
          name: name,
          score: scoreData.total,
          psc: totalDisDenetimPuan
      });
  });

  // 5. Kayıt paketini oluştur
  const newRecord = {
      date: formattedDate,
      data: currentData
  };

  // 6. Listeye Ekle veya Güncelle
  if (existingIndex !== -1) {
      inspectorHistory[existingIndex] = newRecord;
  } else {
      inspectorHistory.push(newRecord);
  }

  // 7. Buluta Kaydet ve Ekranı Yenile
  saveData(); 
  
  // Eğer arka planda Enspektör sekmesi açıksa anında çizdir
  if (typeof renderInspectorView === 'function') {
      renderInspectorView();
  }

  alert(`✅ ${formattedDate} tarihli enspektör sıralaması başarıyla arşive kaydedildi!`);
}
