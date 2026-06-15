// --- GEÇMİŞ GRAFİK KODLARI ---
let avgChartRef = null;

function openHistoryChart() {
  document.getElementById('historyModalOverlay').style.display = 'flex';
  
  if (typeof fleetHistory === 'undefined' || fleetHistory.length === 0) {
    alert("Henüz geçmişe dönük bir cuma kaydı bulunmuyor. İlk kayıt bu Cuma eklenecek.");
    return;
  }

  const labels = fleetHistory.map(item => item.date);
  const dataPoints = fleetHistory.map(item => item.avg);

  if (avgChartRef) avgChartRef.destroy();

  avgChartRef = new Chart(document.getElementById('historyChartCanvas'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Filo Ort. Oranı (%)',
        data: dataPoints,
        borderColor: '#d4a030',
        backgroundColor: 'rgba(212,160,48,0.2)',
        borderWidth: 3,
        pointBackgroundColor: '#00d8c8',
        pointBorderColor: '#fff',
        pointRadius: 5,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return ' Ortalama: %' + context.parsed.y; } } } },
      scales: {
        y: { min: 0, max: 100, ticks: { color: 'rgba(150,210,200,0.7)', callback: v => '%' + v }, grid: { color: 'rgba(0,216,200,0.05)' } },
        x: { ticks: { color: 'rgba(150,210,200,0.7)', font: { family: 'DM Mono' } }, grid: { display: false } }
      }
    }
  });
}

function openCategoryDetails(categoryName) {
    // FİLTRELİ VERİYİ ÇEKİYORUZ
    var categoryRemarks = [];
    getFilteredPscRecords().forEach(function(r) {
        if(r.remarks && r.remarks.length > 0) {
            r.remarks.forEach(function(rm) {
                if (rm.category === categoryName) {
                    categoryRemarks.push({
                        vessel: r.vessel || 'Unknown', date: r.date, port: r.port, country: r.country, desc: rm.desc, detention: rm.groundForDetention
                    });
                }
            });
        }
    });

    categoryRemarks.sort((a,b) => parseTRDate(b.date) - parseTRDate(a.date));
    document.getElementById('categoryDetailTitle').innerHTML = '📌 ' + categoryName + ' <span style="color:var(--teal); font-size:0.9rem;">(' + categoryRemarks.length + ' Records)</span>';
    
    var html = '';
    if(categoryRemarks.length === 0) {
        html = '<div style="color:var(--muted); font-family:\'Plus Jakarta Sans\'; font-weight:500;">No records found for this category in the selected period.</div>';
    } else {
        categoryRemarks.forEach(function(rm) {
            var detBadge = rm.detention ? '<span style="background:rgba(255,90,114,0.15); color:var(--bad); padding:2px 8px; border-radius:6px; font-size:0.65rem; border:1px solid var(--bad); margin-left:10px; font-weight:800;">Detention Cause!</span>' : '';
            html += '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(66,133,244,0.15); padding:1rem; border-radius:8px; margin-bottom:1rem; transition:background 0.2s;" onmouseover="this.style.background=\'rgba(66,133,244,0.05)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.02)\'">';
            html += '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px dashed rgba(255,255,255,0.05); padding-bottom:8px;">';
            html += '      <div style="font-family:\'DM Mono\'; font-size:0.8rem; color:var(--text); font-weight:700;"><span style="color:#4285f4;">[' + rm.vessel + ']</span> 📅 ' + rm.date + ' — ' + rm.port + ', ' + rm.country + '</div>';
            html += '  </div>';
            html += '  <div style="font-family:\'Plus Jakarta Sans\'; font-size:0.8rem; color:var(--muted); line-height:1.5;">' + rm.desc + detBadge + '</div></div>';
        });
    }
    document.getElementById('categoryDetailList').innerHTML = html;
    document.getElementById('categoryDetailOverlay').style.display = 'flex';
}

let _pscCharts = {};
// --- PSC FİLTRELEME GLOBAL DEĞİŞKENLERİ ---
let currentPscFilterMode = 'all'; 
let currentPscStartDate = null;
let currentPscEndDate = null;

function setPscFilter(mode) {
    currentPscFilterMode = mode;
    
    // Buton aktiflik sınıflarını ayarla
    document.querySelectorAll('.psc-filter-btn').forEach(b => b.classList.remove('active'));
    let activeBtn = document.getElementById('btnPscFilter_' + mode);
    if(activeBtn) activeBtn.classList.add('active');

    if (mode === 'custom') {
        let startVal = document.getElementById('pscCustomStart').value;
        let endVal = document.getElementById('pscCustomEnd').value;
        if (!startVal || !endVal) {
            alert("Please select both start and end dates.");
            return;
        }
        currentPscStartDate = new Date(startVal);
        currentPscEndDate = new Date(endVal);
        currentPscEndDate.setHours(23, 59, 59, 999); 
    }
    
    // Tüm ekranı yeniden çiz
    renderPscIstatView();
}

// TÜM SİSTEMİN VERİ ÇEKECEĞİ ANA FİLTRE FONKSİYONU
function getFilteredPscRecords() {
    var allRecs = [];
    var personelList = perfLoadData();
    personelList.forEach(function(p){
        if(p.pscRecords) {
            p.pscRecords.forEach(function(r){ allRecs.push(r); });
        }
    });
    if(typeof bagimsizPscRecords !== 'undefined' && bagimsizPscRecords) {
        bagimsizPscRecords.forEach(function(r){ allRecs.push(r); });
    }

    // 1 Mart 2024 eşiği
    const sparkDateThreshold = new Date(2024, 2, 1); 

    return allRecs.filter(function(r) {
        if(!r.date) return false; // Hata veren boş tarihleri engelle
        let rDate = parseTRDate(r.date); // parseAnyDate yerine daha stabil olan TRDate kullanıyoruz
        if (!rDate || isNaN(rDate.getTime())) return false; // Geçersiz tarihleri atla

        if (currentPscFilterMode === 'beks') return rDate < sparkDateThreshold;
        if (currentPscFilterMode === 'spark') return rDate >= sparkDateThreshold;
        if (currentPscFilterMode === 'custom') {
            return rDate >= currentPscStartDate && rDate <= currentPscEndDate;
        }
        return true; 
    });
}
// ------------------------------------------
function pscDestroyCharts(){
  for(var k in _pscCharts){
    try{ _pscCharts[k].destroy(); }catch(e){}
  }
  _pscCharts = {};
}
// ══════════════════════════════════════════════
//  PSC RİSK KARTI — YARDIMCI FONKSİYONLAR
// ══════════════════════════════════════════════

function pscRiskParseDate(str) {
  // "DD.MM.YYYY" veya "DD/MM/YYYY" formatını parse eder
  if (!str) return null;
  var parts = str.replace(/\//g, '.').split('.');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}
function calcPscRisk(sheetRow, vesselPscRecs) {
  var vessel  = sheetRow.vessel;
  var country = sheetRow.country;
  var port    = sheetRow.port;
  var etaRaw  = sheetRow.etaRaw;

  var mou = pscGetMou(country); 
  
  var threshold = (MOU_THRESHOLDS[mou] && MOU_THRESHOLDS[mou].STANDARD) ? MOU_THRESHOLDS[mou].STANDARD : 6;

  var mouSpecificRecs = (vesselPscRecs || []).filter(function(r) {
    return pscGetMou(r.country || '') === mou;
  });

  var sortedRecs = mouSpecificRecs.sort(function(a, b) {
    var da = pscRiskParseDate(a.date), db = pscRiskParseDate(b.date);
    return (da||0) - (db||0);
  });

  var lastRec  = sortedRecs[sortedRecs.length - 1];
  var lastDate = lastRec ? pscRiskParseDate(lastRec.date) : null;
  
  var monthsSince = lastDate
    ? (new Date() - lastDate) / (1000 * 60 * 60 * 24 * 30.44)
    : threshold; 

  var ratio = monthsSince / threshold;

  var riskLabel, riskColor, riskBg;
  if (ratio >= 1.0 || !lastDate) {
    riskLabel = '🚨 PSC ZİYARET RİSKİ VAR';    riskColor = '#ff3366'; riskBg = 'rgba(255,51,102,0.08)';
  } else if (ratio >= 0.80) {
    riskLabel = '🟡 PERİYOT YAKLAŞIYOR';     riskColor = '#f0c040'; riskBg = 'rgba(240,192,64,0.06)';
  } else {
    riskLabel = '🟢 PSC ZİYARET RİSKİ AZ';      riskColor = '#00f0b8'; riskBg = 'rgba(0,240,184,0.04)';
  }

  var lastInspText = lastRec ? lastRec.date + ' (' + (lastRec.port || '—') + ', ' + (lastRec.country || '—') + ')' : 'Kayıt Yok';
  var monthsText = lastRec ? '(' + monthsSince.toFixed(1) + ' ay önce)' : '(Bölgede İlk İnspeksiyon)';

  return {
    vessel: vessel, port: port, country: country, etaRaw: etaRaw,
    mou: mou, threshold: threshold,
    monthsSince: lastRec ? monthsSince.toFixed(1) : 0,
    lastInspDate: lastInspText,
    monthsText: monthsText,
    ratio: Math.min(ratio, 1),
    riskLabel: riskLabel, riskColor: riskColor, riskBg: riskBg
  };
}

function renderPscRiskSection() {
  var wrap = document.getElementById('pscRiskSectionWrap');
  if (!wrap) return;

  wrap.innerHTML = '<div style="color:var(--warn);font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.75rem;font-weight:600;padding:1rem; display:flex; align-items:center; gap:8px;"><div class="spinner" style="width:16px;height:16px;margin:0;border-top-color:var(--warn);"></div> ⏳ Varış verileri aranıyor...</div>';

  var pscByVessel = {};
  var personelList = perfLoadData();
  personelList.forEach(function(p) {
    (p.pscRecords || []).forEach(function(r) {
      var v = r.vessel || p.name;
      if (!pscByVessel[v]) pscByVessel[v] = [];
      pscByVessel[v].push(r);
    });
  });
  (bagimsizPscRecords || []).forEach(function(r) {
    var v = r.vessel || '?';
    if (!pscByVessel[v]) pscByVessel[v] = [];
    pscByVessel[v].push(r);
  });

  function drawCards(csvText) {
    try {
      var lines = csvText.split(/\r?\n/).filter(function(l) { return l.trim(); });
      if (lines.length < 2) throw new Error("Yetersiz satır");

      var hdrs = pscRiskSplitCSV(lines[0]);
      var rows = lines.slice(1).map(function(l) {
        var v = pscRiskSplitCSV(l), o = {};
        hdrs.forEach(function(h, i) { o[h.trim()] = (v[i] || '').trim(); });
        return o;
      });

      var vesselNextPort = {};
      rows.forEach(function(r) {
        var vals = Object.values(r);
        var vessel  = (vals[0] || '').trim().toUpperCase();
        var status  = (r['STATUS'] || '').trim().toUpperCase();
        if (status !== 'I' || !vessel) return;
        var port    = (vals[3] || '').trim();
        var country = (vals[4] || '').trim();
        var etaRaw  = (vals[5] || '').trim();
        
        if (!etaRaw || !country) return;
        var etaDate = pscRiskParseDate(etaRaw);
        if (!etaDate) return;

        if (!vesselNextPort[vessel] || etaDate < vesselNextPort[vessel].eta) {
          vesselNextPort[vessel] = { vessel: vessel, port: port, country: country, etaRaw: etaRaw, eta: etaDate };
        }
      });

      var cards = Object.values(vesselNextPort).map(function(row) {
        return calcPscRisk(row, pscByVessel[row.vessel] || []);
      }).filter(Boolean).sort(function(a, b) {
        return b.ratio - a.ratio;
      });

      if (!cards.length) {
        wrap.innerHTML = '<div style="color:var(--muted);font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.8rem;padding:1rem;">Aktif gemi bulunamadı.</div>';
        return;
      }

      // --- KARTLARI ÇİZME DÖNGÜSÜ ---
      var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.5rem; padding-top: 1.5rem;">';
      
      cards.forEach(function(c, idx) {
        var safeId = c.vessel.replace(/\s+/g, '_') + '_' + idx;
        var cleanRiskLabel = c.riskLabel.replace(/🚨|🟡|🟢/g, '').trim();
        
        var glassBg = '';
        var glassBorder = '';
        var tabActiveColor = '';

        if (c.ratio >= 1.0 || !c.lastInspDate || c.lastInspDate === 'Kayıt Yok') {
            glassBg = 'rgba(175, 51, 38, 0.44)';
            glassBorder = '1px solid rgba(175, 51, 38, 0.5)';
            tabActiveColor = '#ff6b6b';
        } else if (c.ratio >= 0.80) {
            glassBg = 'rgba(212, 160, 48, 0.44)';
            glassBorder = '1px solid rgba(212, 160, 48, 0.5)';
            tabActiveColor = '#feca57';
        } else {
            glassBg = 'rgba(0, 216, 200, 0.35)';
            glassBorder = '1px solid rgba(0, 216, 200, 0.4)';
            tabActiveColor = '#48dbfb';
        }

        var imagePath = 'assets/images/' + c.vessel.toUpperCase() + '.png';

        // O MoU'daki Son Kaydı ve Remarkları Bulma
        var mouSpecificRecs = (pscByVessel[c.vessel] || []).filter(function(r) {
            return pscGetMou(r.country || '') === c.mou;
        });
        var sortedRecs = mouSpecificRecs.sort(function(a, b) {
            var da = pscRiskParseDate(a.date), db = pscRiskParseDate(b.date);
            return (da||0) - (db||0);
        });
        var lastRec = sortedRecs[sortedRecs.length - 1]; 

        var lastPscText = '<span style="color:rgba(255,255,255,0.5); font-style:italic;">Bu bölgede geçmiş kayıt yok.</span>';
        var remarksHtml = '<div style="color:rgba(255,255,255,0.5); font-size:0.7rem; text-align:center; padding-top:10px;">Kayıt bulunmuyor.</div>';

        if (lastRec) {
            var remCount = (lastRec.remarks && lastRec.remarks.length) ? lastRec.remarks.length : 0;
            var portName = lastRec.port || 'Bilinmiyor';
            
            // Ön Yüz İçin Metin (Risk Barının Yerine Gelen)
            lastPscText = `<span class="vpc-highlight">${lastRec.date}</span> tarihinde <span class="vpc-highlight">${portName}</span> limanında gerçekleşti ve <span class="vpc-highlight">${remCount} remark</span> yendi.`;

            if (remCount > 0) {
              remarksHtml = '<ul style="margin:0; padding-left:15px; font-size:0.7rem; color:rgba(255,255,255,0.9); line-height:1.4;">';
              lastRec.remarks.forEach(function(rm) {
                  var detBadge = rm.groundForDetention ? '<span style="color:#ff6b6b; font-weight:bold;"> [Detention!]</span>' : '';
                  remarksHtml += '<li style="margin-bottom:6px;">' + rm.desc + detBadge + '</li>';
              });
              remarksHtml += '</ul>';
          } else {
              // Emoji kaldırıldı ve stil "Kayıt bulunmuyor" ile birebir aynı yapıldı
              remarksHtml = '<div style="color:rgba(255,255,255,0.5); font-size:0.7rem; text-align:center; padding-top:10px;">Bu denetim 0 remark (CLEAR) ile geçilmiştir.</div>';
          }
        }

        html += `
        <!-- 3D SAHNE VE FLIPPER -->
        <div class="vpc-scene">
            <div class="vpc-flipper" id="vpc-flipper-${safeId}">
                
                <!-- ÖN YÜZ (FRONT) -->
                <div class="vessel-profile-card vpc-front" style="background: ${glassBg}; border: ${glassBorder};">
                    <div class="vpc-avatar-container">
                        <img src="${imagePath}" onerror="this.src='assets/images/spark_logo2.jpg'" class="vpc-avatar" alt="${c.vessel}">
                    </div>
                    <div class="vpc-body">
                        <div class="vpc-name">${c.vessel}</div>
                        <div class="vpc-role">${cleanRiskLabel}</div>

                        <div class="vpc-section-title">NEXT PORT:</div>
                        <div class="vpc-text" style="margin-bottom:0;">
                            <span class="vpc-highlight">${c.port || '—'}, ${c.country || '—'}</span><br>
                            ETA: <span class="vpc-highlight">${c.etaRaw}</span><br>
                            MoU: <span class="vpc-highlight">${c.mou}</span>
                        </div>

                        <div style="margin-top:12px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.2);">
                            <div style="font-size:0.6rem; color:rgba(255,255,255,0.7); font-weight:700; text-transform:uppercase; margin-bottom:4px; text-align:left;">İlgili MoU Son PSC Kaydı:</div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.9); line-height:1.4; text-align:left;">${lastPscText}</div>
                        </div>
                    </div>
                    <div class="vpc-tabs">
                        <div class="vpc-tab active" style="box-shadow: inset 0 -3px 0 0 ${tabActiveColor};">VESSEL</div>
                        <div class="vpc-tab" onclick="switchVpcTab('${safeId}', true)">DETAILS</div>
                    </div>
                </div>

                <!-- ARKA YÜZ (BACK) -->
                <div class="vessel-profile-card vpc-back" style="background: ${glassBg}; border: ${glassBorder};">
                    <div class="vpc-avatar-container">
                        <img src="${imagePath}" onerror="this.src='assets/images/spark_logo2.jpg'" class="vpc-avatar" alt="${c.vessel}">
                    </div>
                    <div class="vpc-body">
                        <div class="vpc-name">${c.vessel}</div>
                        <div class="vpc-role">${cleanRiskLabel}</div>
                        
                        <div class="vpc-section-title" style="margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:4px;">YENİLEN REMARKLAR</div>
                        <div class="vpc-scrollbar" style="max-height:115px; overflow-y:auto; padding-right:5px; text-align:left;">
                            ${remarksHtml}
                        </div>
                    </div>
                    <div class="vpc-tabs">
                        <div class="vpc-tab" onclick="switchVpcTab('${safeId}', false)">VESSEL</div>
                        <div class="vpc-tab active" style="box-shadow: inset 0 -3px 0 0 ${tabActiveColor};">DETAILS</div>
                    </div>
                </div>

            </div>
        </div>
        `;
      });
      html += '</div>';

      wrap.innerHTML = html;
    } catch (err) {
      wrap.innerHTML = '<div style="color:var(--bad);font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.8rem;font-weight:600;padding:1rem;">⚠️ Veri İşleme Hatası: ' + err.message + '</div>';
    }
  }

  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 2500);

  fetch('http://localhost:8765/csv', { signal: controller.signal })
    .then(function(res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
    })
    .then(function(csvText) {
        if (window.globalEtaCsv !== csvText) {
            window.globalEtaCsv = csvText;
            if (typeof _saveDataActual === 'function') {
                _saveDataActual(); 
            }
        }
        drawCards(csvText);
    })
    .catch(function(err) {
        if (window.globalEtaCsv && window.globalEtaCsv.trim().length > 0) {
            drawCards(window.globalEtaCsv);
        } else {
            wrap.innerHTML = '<div style="color:var(--muted);font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.8rem;font-weight:600;padding:1rem;">⚠️ Sistemin ana bilgisayarından giriş yapılıp varış verilerinin senkronize edilmesi bekleniyor...</div>';
        }
    });
}

// 3D KART ÇEVİRME (FLIP) FONKSİYONU
window.switchVpcTab = function(cardId, flipToBack) {
  var flipper = document.getElementById('vpc-flipper-' + cardId);
  if (flipper) {
      if (flipToBack) {
          flipper.classList.add('is-flipped'); // Details'a tıklandı, arkaya dön
      } else {
          flipper.classList.remove('is-flipped'); // Vessel'a tıklandı, öne dön
      }
  }
};
function pscRiskSplitCSV(line) {
  var r = [], c = '', q = false;
  for (var i = 0; i < line.length; i++) {
    if (line[i] === '"') { q = !q; }
    else if (line[i] === ',' && !q) { r.push(c); c = ''; }
    else c += line[i];
  }
  r.push(c);
  return r;
}
function renderPscIstatView(){
  pscDestroyCharts();

  // FİLTRELİ VERİYİ ÇAĞIR
  var allRecs = getFilteredPscRecords();

  var total = allRecs.length;
  var clearN = allRecs.filter(r => r.result==='clear').length;
  var remarkN = allRecs.filter(r => r.result==='remark').length;
  var detainN = allRecs.filter(r => r.result==='detained').length;

  var mouStats = {};
  allRecs.forEach(function(r){
    var m = pscGetMou(r.country||'');
    if(!mouStats[m]) mouStats[m]={total:0,clear:0,remark:0,detained:0,def:0};
    mouStats[m].total++;
    mouStats[m][r.result||'clear']++;
    mouStats[m].def += (r.remarks||[]).length;
  });

  var cntryStats = {};
  allRecs.forEach(function(r){
    var c = r.country||'Unknown';
    if(!cntryStats[c]) cntryStats[c]={total:0,bad:0,def:0};
    cntryStats[c].total++;
    if(r.result==='remark'||r.result==='detained') cntryStats[c].bad++;
    cntryStats[c].def += (r.remarks||[]).length;
  });

  var shipStats = {};
  allRecs.forEach(function(r){
    var v = r.vessel||'?';
    if(!shipStats[v]) shipStats[v]={total:0,clear:0,remark:0,detained:0,def:0};
    shipStats[v].total++;
    shipStats[v][r.result||'clear']++;
    shipStats[v].def += (r.remarks||[]).length;
  });

  var yearStats = {};
  allRecs.forEach(function(r){
    var d = r.date||'';
    var yr = d.includes('.') ? d.split('.').pop() : (d.split('-')[0]||'?');
    if(yr.length===4){
      if(!yearStats[yr]) yearStats[yr]={total:0,bad:0,def:0};
      yearStats[yr].total++;
      if(r.result==='remark'||r.result==='detained') yearStats[yr].bad++;
      yearStats[yr].def += (r.remarks||[]).length;
    }
  });

  var detentions = allRecs.filter(r => r.result==='detained');

  var ageBuckets = {};
  allRecs.forEach(function(r){
    if(!r.buildYear) return;
    var age = new Date().getFullYear() - parseInt(r.buildYear);
    var bucket = Math.floor(age/5)*5;
    var label = bucket + '–' + (bucket+4) + ' Years';
    if(!ageBuckets[label]) ageBuckets[label]={total:0,bad:0,_min:bucket};
    ageBuckets[label].total++;
    if(r.result==='remark'||r.result==='detained') ageBuckets[label].bad++;
  });

  var html = '';

  // --- YENİ EKLENEN: FİLTRELEME ÇUBUĞU ---
  var btnAll = currentPscFilterMode === 'all' ? 'active' : '';
  var btnBeks = currentPscFilterMode === 'beks' ? 'active' : '';
  var btnSpark = currentPscFilterMode === 'spark' ? 'active' : '';
  var btnCustom = currentPscFilterMode === 'custom' ? 'active' : '';

  html += `<div style="background:var(--glass); border:1px solid var(--border); border-radius:12px; padding:1rem 1.5rem; margin-bottom:2rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap; backdrop-filter:blur(20px);">
    <div style="font-family:'Outfit', sans-serif; font-weight:700; color:var(--teal); margin-right:1rem;"> Filter Period:</div>
    
    <button id="btnPscFilter_all" class="psc-filter-btn ${btnAll}" onclick="setPscFilter('all')">All Time</button>
    <button id="btnPscFilter_beks" class="psc-filter-btn ${btnBeks}" onclick="setPscFilter('beks')">Beks Period <small>(Pre-Mar 2024)</small></button>
    <button id="btnPscFilter_spark" class="psc-filter-btn ${btnSpark}" onclick="setPscFilter('spark')">Spark Period <small>(Post-Mar 2024)</small></button>
    
    <div style="width:1px; height:24px; background:rgba(255,255,255,0.1); margin:0 0.5rem;"></div>
    
    <div style="display:flex; align-items:center; gap:0.5rem;">
        <input type="date" id="pscCustomStart" class="perf-input" style="width:auto; padding:4px 8px; font-size:0.75rem;" title="Start Date">
        <span style="color:var(--muted)">to</span>
        <input type="date" id="pscCustomEnd" class="perf-input" style="width:auto; padding:4px 8px; font-size:0.75rem;" title="End Date">
        <button id="btnPscFilter_custom" class="psc-filter-btn ${btnCustom}" onclick="setPscFilter('custom')" style="padding:6px 12px; background:rgba(212,160,48,0.1); color:var(--gold); border-color:rgba(212,160,48,0.3);">Apply</button>
    </div>
  </div>`;


  var totalRemarksCount = 0;
  var uniqueCountriesSet = new Set();
  
  allRecs.forEach(function(r) {
      totalRemarksCount += (r.remarks && r.remarks.length) ? r.remarks.length : 0;
      if (r.country) uniqueCountriesSet.add(r.country);
  });
  
  html += '<div class="summary" style="margin-bottom: 2.5rem;">';
  
  html +='<div class="s-card ai-glow-card gh-reveal">';
  html += '<div class="gh-reveal" style="color:#4285f4; font-weight:800; letter-spacing:0.05em;">📁 TOTAL PSC INSPECTIONS IN DATABASE</div>';
  html += '<div class="gh-reveal" style="color:#fff; font-size:2.4rem;">' + allRecs.length + '</div>';
  html += '<div class="s-sub">Based on Selected Period</div>';
  html += '</div>';

  html += '<div class="s-card ai-glow-card gh-reveal">';
  html += '<div class="s-label" style="color:#d96570; font-weight:800; letter-spacing:0.05em;">⚠️ TOTAL DEFICIENCIES (REMARKS)</div>';
  html += '<div class="s-val" style="color:#fff; font-size:2.4rem;">' + totalRemarksCount + '</div>';
  html += '<div class="s-sub">Total Unique Deficiencies Found</div>';
  html += '</div>';

  html +='<div class="s-card ai-glow-card gh-reveal">';
  html += '<div class="s-label" style="color:#f0a500; font-weight:800; letter-spacing:0.05em;">🌍 TOTAL COUNTRIES VISITED</div>';
  html += '<div class="s-val" style="color:#fff; font-size:2.4rem;">' + uniqueCountriesSet.size + '</div>';
  html += '<div class="s-sub">Distinct Countries in Selected Period</div>';
  html += '</div>';

  html += '</div>';

  // ── BÖLÜM 1: Filo Gemi Listesi ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.2rem;border-left:3px solid var(--teal);padding-left:0.75rem;"> Fleet Vessel List & Vessel-Based PSC History</div>';
  
  var sortedFilo = [...filo].sort((a,b) => a.localeCompare(b));
  html += '<div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:1.5rem;" id="pscVesselButtons">';
  sortedFilo.forEach(function(v) {
      html += '<button class="psc-vessel-btn" onclick="showVesselPscDetails(\'' + v + '\', this)">' + v + '</button>';
  });
  html += '</div>';
  html += '<div id="pscVesselDetailContainer" style="display:none; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:1.2rem;"></div>';
  html += '</div>';

  // ── BÖLÜM 2: MoU Bazlı ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.5rem;border-left:3px solid var(--teal);padding-left:0.75rem;display:flex;align-items:center;gap:8px;"><img src="assets/icons/moucard.png" style="width:20px;height:20px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 3px rgba(0,216,200,0.5));"> MoU-Based Performance</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">';
  
  html += '<div style="display:flex; flex-direction:column;">';
  html += '  <div style="text-align:center; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; color:var(--muted); margin-bottom:1rem; padding:0 1rem; line-height:1.4;">The chart below shows the percentage of inspections that resulted in remarks for each Memorandum.</div>';
  html += '  <div style="position:relative; flex:1; min-height:280px;"><canvas id="pscChartMou"></canvas></div>';
  html += '</div>';
  
  html += '<div class="psc-table-scroll" style="overflow:auto; padding-bottom: 8px;">';
  html += '<table style="width:100%;border-collapse:collapse;font-family:\'DM Mono\',monospace;font-size:0.72rem;">';
  html += '<thead><tr style="color:var(--muted);">';
  html += '<th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">MoU</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Inspections</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Remark</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Detained</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Deficiencies</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Def. Ratio</th>';
  html += '</tr></thead><tbody>';
  
  var mouIcons = {
    'Paris MoU': 'assets/icons/parismouicon.png', 'Tokyo MoU': 'assets/icons/tokyomouicon.png',
    'Riyadh MoU': 'assets/icons/riyadhmouicon.png', 'Abuja MoU': 'assets/icons/abujamou.png',
    'Vina del Mar': 'assets/icons/viladelmaricon.png', 'USCG': 'assets/icons/uscgicon.png',
    'Mediterranean MoU': 'assets/icons/medittereneanmou.png', 'Black Sea MoU': 'assets/icons/bsmouicon.png',
    'Indian Ocean MoU': 'assets/icons/indianmou.png'
  };

  var mouArr = Object.keys(mouStats).sort((a,b) => mouStats[b].total - mouStats[a].total);
  mouArr.forEach(function(m){
    var s = mouStats[m];
    var rate = s.total ? Math.round((s.remark+s.detained)/s.total*100) : 0;
    var rateColor = rate>=70?'#ff4d4d':rate>=45?'#ffaa00':'#00d8c8';
    var iconHtml = mouIcons[m] ? '<img src="' + mouIcons[m] + '" style="width:24px;height:24px;vertical-align:middle;margin-right:8px;object-fit:contain;">' : '';
    html += '<tr onclick="openMouDetails(\'' + m + '\')" style="border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background=\'rgba(0,216,200,0.08)\'" onmouseout="this.style.background=\'transparent\'" title="Click to view details for this region">';
    html += '<td style="padding:5px 8px;color:var(--text);">' + iconHtml + m + '</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:var(--text);">'+s.total+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:#ffaa00;">'+s.remark+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:#ff4d4d;">'+s.detained+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:var(--muted);">'+s.def+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;font-weight:700;color:'+rateColor+';">%'+rate+'</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div></div>';

  // ── BÖLÜM 3: Ülke İstatistikleri ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.5rem;border-left:3px solid var(--warn);padding-left:0.75rem;display:flex;align-items:center;gap:8px;">🌍 Top Countries by Deficiency (Ratio & Count)</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">';
  
  html += '<div style="display:flex; flex-direction:column;">';
  html += '  <div style="text-align:center; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:0.75rem; color:var(--muted); margin-bottom:1rem; padding:0 1rem; line-height:1.4;">Chart shows the average number of remarks per inspection for countries with at least 2 inspections.</div>';
  html += '  <div style="position:relative; flex:1; min-height:280px;"><canvas id="pscChartCountry"></canvas></div>';
  html += '</div>';

  html += '<div class="psc-table-scroll" style="overflow:auto; padding-bottom: 8px;">';
  html += '<table style="width:100%;border-collapse:collapse;font-family:\'DM Mono\',monospace;font-size:0.72rem;">';
  html += '<thead><tr style="color:var(--muted);">';
  html += '<th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">Country</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Insp.</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Deficient Insp.</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Avg. Def. / Insp.</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Def. Ratio</th>';
  html += '</tr></thead><tbody>';
  
  var cntryArr = Object.keys(cntryStats).filter(c => cntryStats[c].total >= 2)
    .sort((a, b) => {
        var rateA = cntryStats[a].bad / cntryStats[a].total;
        var rateB = cntryStats[b].bad / cntryStats[b].total;
        if (rateB !== rateA) return rateB - rateA; 
        return cntryStats[b].def - cntryStats[a].def;
    }).slice(0, 10);

  cntryArr.forEach(function(c){
    var s = cntryStats[c];
    var rate = Math.round(s.bad/s.total*100);
    var avgDef = s.total ? (s.def / s.total).toFixed(1) : '0.0';
    var rateColor = rate>=70?'#ff4d4d':rate>=45?'#ffaa00':'#00d8c8';
    html += '<tr onclick="openCountryDetails(\'' + c + '\')" style="border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background=\'rgba(0,216,200,0.08)\'" onmouseout="this.style.background=\'transparent\'" title="Click for details">';
    html += '<td style="padding:5px 8px;color:var(--text);">' + getCountryFlagImg(c) + c + '</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:var(--text);">'+s.total+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:#ffaa00;">'+s.bad+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:var(--muted);font-weight:700;">'+avgDef+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;font-weight:700;color:'+rateColor+';">%'+rate+'</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div>'; 

  html += '<div style="margin-top:2.5rem; border-top:1px dashed rgba(255,255,255,0.1); padding-top:1.5rem;">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.95rem;font-weight:700;color:var(--teal);margin-bottom:1rem;display:flex;align-items:center;gap:8px;"> Fleet Inspection History by All Countries</div>';
  
  html += '<div class="psc-table-scroll" style="overflow:auto; max-height: 400px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">';
  html += '<table style="width:100%;border-collapse:collapse;font-family:\'DM Mono\',monospace;font-size:0.75rem;">';
  html += '<thead style="position:sticky; top:0; background:rgba(10,22,26,0.98); z-index:1; box-shadow:0 2px 10px rgba(0,0,0,0.5);"><tr style="color:var(--muted);">';
  html += '<th style="text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);">Country</th>';
  html += '<th style="text-align:center;padding:10px 12px;border-bottom:1px solid var(--border);">Total Insp.</th>';
  html += '<th style="text-align:center;padding:10px 12px;border-bottom:1px solid var(--border);">Zero Def. (Clear)</th>';
  html += '<th style="text-align:center;padding:10px 12px;border-bottom:1px solid var(--border);">Remark / Detained</th>';
  html += '<th style="text-align:center;padding:10px 12px;border-bottom:1px solid var(--border);">Total Deficiencies</th>';
  html += '<th style="text-align:center;padding:10px 12px;border-bottom:1px solid var(--border);">Deficiency Ratio</th>';
  html += '</tr></thead><tbody>';

  var allCntryArr = Object.keys(cntryStats).sort((a,b) => { 
      if(cntryStats[b].total !== cntryStats[a].total) return cntryStats[b].total - cntryStats[a].total; 
      return cntryStats[b].bad - cntryStats[a].bad;
  });

  allCntryArr.forEach(function(c){
      var s = cntryStats[c];
      var rate = Math.round(s.bad/s.total*100);
      var rateColor = rate>=70?'#ff4d4d':rate>=45?'#ffaa00':'#00d8c8';
      var clearN = s.total - s.bad;
      
      html += '<tr onclick="openCountryDetails(\'' + c + '\')" style="border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background=\'rgba(0,216,200,0.08)\'" onmouseout="this.style.background=\'transparent\'" title="Click for details">';
      html += '<td style="padding:10px 12px;color:var(--text);">' + getCountryFlagImg(c) + c + '</td>';
      html += '<td style="text-align:center;padding:10px 12px;color:var(--text); font-weight:700;">'+s.total+'</td>';
      html += '<td style="text-align:center;padding:10px 12px;color:var(--ok);">'+clearN+'</td>';
      html += '<td style="text-align:center;padding:10px 12px;color:#ffaa00;">'+s.bad+'</td>';
      html += '<td style="text-align:center;padding:10px 12px;color:var(--muted);">'+s.def+'</td>';
      html += '<td style="text-align:center;padding:10px 12px;font-weight:700;color:'+rateColor+';">%'+rate+'</td>';
      html += '</tr>';
  });

  html += '</tbody></table></div></div></div>'; 

  // ── BÖLÜM 4: KATEGORİ BAZLI ──
  var catStats = {};
  allRecs.forEach(function(r){
      if(r.remarks && r.remarks.length > 0) {
          r.remarks.forEach(function(rm){
              var catName = rm.category || "99 - Other";
              if(!catStats[catName]) catStats[catName] = { count: 0, detentions: 0 };
              
              catStats[catName].count++;
              if(rm.groundForDetention) catStats[catName].detentions++;
          });
      }
  });

  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.5rem;border-left:3px solid #4285f4;padding-left:0.75rem;display:flex;align-items:center;gap:8px;">📌 Distribution by IMO Deficiency Categories</div>';
  
  html += '<div class="psc-table-scroll" style="overflow:auto; max-height:400px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">';
  html += '<table style="width:100%;border-collapse:collapse;font-family:\'DM Mono\',monospace;font-size:0.72rem;">';
  html += '<thead style="position:sticky; top:0; background:rgba(10,22,26,0.98); z-index:1; box-shadow:0 2px 10px rgba(0,0,0,0.5);"><tr style="color:var(--muted);">';
  html += '<th style="text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);">PSC Category</th>';
  html += '<th style="text-align:center;padding:10px 12px;border-bottom:1px solid var(--border);">Total Remarks</th>';
  html += '<th style="text-align:center;padding:10px 12px;border-bottom:1px solid var(--border);">Ground for Detention</th>';
  html += '</tr></thead><tbody>';

  var catArr = Object.keys(catStats).sort((a,b) => catStats[b].count - catStats[a].count);
  
  catArr.forEach(function(c){
      var s = catStats[c];
      html += '<tr onclick="openCategoryDetails(\'' + c + '\')" style="border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background=\'rgba(66,133,244,0.1)\'" onmouseout="this.style.background=\'transparent\'" title="Click to view all remarks">';
      html += '<td style="padding:10px 12px;color:#4285f4;font-weight:700; font-family:\'Plus Jakarta Sans\';">' + c + '</td>';
      html += '<td style="text-align:center;padding:10px 12px;color:var(--warn);font-size:0.9rem;font-weight:700;">' + s.count + '</td>';
      html += '<td style="text-align:center;padding:10px 12px;color:' + (s.detentions > 0 ? 'var(--bad)' : 'var(--muted)') + '; font-weight:700;">' + s.detentions + '</td>';
      html += '</tr>';
  });
  html += '</tbody></table></div>';
  html += '<div style="text-align:right; margin-top:12px;"><button onclick="authAndOpenRemarkAdmin()" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:var(--muted);font-family:\'Plus Jakarta Sans\', sans-serif;font-size:0.7rem;font-weight:600;padding:6px 14px;border-radius:6px;cursor:pointer;transition:all 0.2s;">Admin Access</button></div>';
  html += '</div>';
  
  // ── BÖLÜM 5: Yıllık Trend ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.2rem;border-left:3px solid var(--teal);padding-left:0.75rem;display:flex;align-items:center;gap:8px;"><img src="assets/icons/yıllıktrendicon.png" style="width:20px;height:20px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 3px rgba(0,216,200,0.5));"> Average Deficiencies per Inspection by Year</div>';
  html += '<div style="position:relative;height:280px;"><canvas id="pscChartYear"></canvas></div>';
  html += '</div>';

  // ── BÖLÜM 6: Gemi Bazlı ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.2rem;border-left:3px solid var(--teal);padding-left:0.75rem;display:flex;align-items:center;gap:8px;"><img src="assets/icons/gemiyasi.png" style="width:20px;height:20px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 3px rgba(0,216,200,0.5));"> Vessel-Based PSC Performance</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">';
  html += '<div style="position:relative;height:340px;"><canvas id="pscChartShip"></canvas></div>';

  html += '<div class="psc-table-scroll" style="overflow:auto; padding-bottom: 8px; display:flex; flex-direction:column;">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.85rem;color:#ffffff;margin-bottom:0.8rem;font-weight:600;line-height:1.4;">Vessels sorted by average remarks per inspection: <br><span style="font-weight:400;color:var(--muted);font-size:0.75rem;">(Sorted from highest risk to lowest)</span></div>';

  html += '<table style="width:100%;border-collapse:collapse;font-family:\'DM Mono\',monospace;font-size:0.72rem;">';
  html += '<thead><tr style="color:var(--muted);">';
  html += '<th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);">Vessel</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Insp.</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Clear</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Remark</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Detained</th>';
  html += '<th style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);">Avg. Def.</th>';
  html += '</tr></thead><tbody>';

  var shipArr = Object.keys(shipStats).sort((a,b) => shipStats[b].total-shipStats[a].total);
  var shipTableArr = Object.keys(shipStats).sort((a,b) => {
      var avgA = shipStats[a].total ? (shipStats[a].def / shipStats[a].total) : 0;
      var avgB = shipStats[b].total ? (shipStats[b].def / shipStats[b].total) : 0;
      if (avgB !== avgA) return avgB - avgA;
      return shipStats[b].total - shipStats[a].total; 
  });

  shipTableArr.forEach(function(v){
    var s = shipStats[v];
    var avgDef = s.total ? (s.def/s.total).toFixed(1) : '0.0';
    var avgColor = parseFloat(avgDef)>=3?'#ff4d4d':parseFloat(avgDef)>=1.5?'#ffaa00':'#00d8c8';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">';
    html += '<td style="padding:5px 8px;color:var(--text);font-weight:700;">'+v+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:var(--text);">'+s.total+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:#00d8c8;">'+s.clear+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:#ffaa00;">'+s.remark+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;color:#ff4d4d;">'+s.detained+'</td>';
    html += '<td style="text-align:center;padding:5px 8px;font-weight:700;color:'+avgColor+';">'+avgDef+'</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div></div>';

  // ── BÖLÜM 7: Detention Detayları ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.2rem;border-left:3px solid #ff4d4d;padding-left:0.75rem;display:flex;align-items:center;gap:8px;"><img src="assets/icons/detentionicon.png" style="width:20px;height:20px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 3px rgba(255,77,77,0.5));"> Detention Records ('+detainN+')</div>';
  if(detentions.length===0){
    html += '<div style="color:var(--muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">No detention records found in the selected period.</div>';
  } else {
    html += '<table style="width:100%;border-collapse:collapse;font-family:\'DM Mono\',monospace;font-size:0.72rem;">';
    html += '<thead><tr style="color:var(--muted);">';
    html += '<th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);">Date</th>';
    html += '<th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);">Vessel</th>';
    html += '<th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);">Country</th>';
    html += '<th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);">Port</th>';
    html += '<th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);">MoU</th>';
    html += '<th style="text-align:center;padding:6px 10px;border-bottom:1px solid var(--border);">Def.</th>';
    html += '</tr></thead><tbody>';
    detentions.forEach(function(r){
      var defCount = (r.remarks||[]).length;
      html += '<tr style="border-bottom:1px solid rgba(255,77,77,0.12);background:rgba(255,77,77,0.04);">';
      html += '<td style="padding:6px 10px;color:var(--text);">'+r.date+'</td>';
      html += '<td style="padding:6px 10px;color:var(--teal);font-weight:700;">'+(r.vessel||'?')+'</td>';
      html += '<td style="padding:6px 10px;color:var(--text);">'+(r.country||'?')+'</td>';
      html += '<td style="padding:6px 10px;color:var(--muted);">'+(r.port||'?')+'</td>';
      html += '<td style="padding:6px 10px;color:var(--muted);">'+pscGetMou(r.country||'')+'</td>';
      html += '<td style="text-align:center;padding:6px 10px;color:#ff4d4d;font-weight:700;">'+defCount+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
  }
  html += '</div>';

  // ── BÖLÜM 8: Gemi Yaşı vs PSC ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.2rem;border-left:3px solid var(--teal);padding-left:0.75rem;display:flex;align-items:center;gap:8px;"><img src="assets/icons/gemiyasi.png" style="width:20px;height:20px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 3px rgba(0,216,200,0.5));"> Vessel Age vs. PSC Deficiency Ratio</div>';
  html += '<div style="position:relative;height:280px;"><canvas id="pscChartAge"></canvas></div>';
  html += '</div>';

  // ── PSC RİSK KARTI ──
  html += '<div class="gh-reveal" style="background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.8rem;backdrop-filter:blur(24px);">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1rem;font-weight:700;color:#ffffff;margin-bottom:1.2rem;border-left:3px solid #ff5a72;padding-left:0.75rem;display:flex;align-items:center;gap:8px;"><img src="assets/icons/risk.png" style="width:22px;height:22px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 6px rgba(255,255,255,0.8));"> PSC Inspection Probability for Next Port</div>';
  html += '<div id="pscRiskSectionWrap"></div>';
  html += '</div>';

  document.getElementById('pscIstatContent').innerHTML = html;
  renderPscRiskSection();

  // Scroll Reveal Efekti
  setTimeout(() => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    const revealElements = document.getElementById('pscIstatContent').querySelectorAll('.gh-reveal');
    revealElements.forEach((el, index) => {
        el.style.transitionDelay = (index * 0.06) + 's';
        observer.observe(el);
        setTimeout(() => { el.style.transitionDelay = '0s'; }, 1000 + (index * 60)); 
    });
  }, 50);

  // ═══════════════ CHARTLAR (İngilizce Güncellemeleri) ═══════════════
  var isDark = true;
  var gridColor = 'rgba(255,255,255,0.06)';
  var labelColor = '#8a9aac';
  var baseOpts = {
    plugins:{legend:{labels:{color:labelColor,font:{family:'DM Mono',size:11}}}},
    scales:{
      x:{ticks:{color:labelColor,font:{family:'DM Mono',size:10}},grid:{color:gridColor}},
      y:{ticks:{color:labelColor,font:{family:'DM Mono',size:10}},grid:{color:gridColor}}
    }
  };

  // Chart 2 — MoU Horizontal Bar
  var mouLabels = mouArr;
  var mouRates = mouArr.map(m => { var s=mouStats[m]; return s.total?Math.round((s.remark+s.detained)/s.total*100):0; });
  var mouColors = mouRates.map(r => r>=70?'rgba(255,77,77,0.75)':r>=45?'rgba(255,170,0,0.75)':'rgba(0,216,200,0.6)');
  _pscCharts.mou = new Chart(document.getElementById('pscChartMou'), {
    type:'bar',
    data:{labels:mouLabels, datasets:[{label:'Deficiency Ratio (%)', data:mouRates, backgroundColor:mouColors, borderRadius:6}]},
    options:{indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:c => ' ' + c.raw + '% with remarks'}}},
      scales:{
        x:{max:100, ticks:{color:labelColor,font:{family:'DM Mono',size:10},callback:v=>'%'+v}, grid:{color:gridColor}},
        y:{ticks:{color:labelColor,font:{family:'DM Mono',size:10}}, grid:{color:gridColor}}
      }
    }
  });

  // Chart 3 — Ülke Bar
  var top10Labels = cntryArr;
  var top10AvgDefs = cntryArr.map(c => cntryStats[c].total ? (cntryStats[c].def / cntryStats[c].total).toFixed(1) : 0);
  var top10Colors = top10AvgDefs.map(val => { 
      var v = parseFloat(val);
      return v>=3.0 ? 'rgba(255,77,77,0.75)' : v>=1.5 ? 'rgba(255,170,0,0.75)' : 'rgba(0,216,200,0.6)'; 
  });
  
  _pscCharts.country = new Chart(document.getElementById('pscChartCountry'), {
    type:'bar',
    data:{labels:top10Labels, datasets:[{label:'Avg. Deficiencies', data:top10AvgDefs, backgroundColor:top10Colors, borderRadius:4}]},
    options:{indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c => ' ' + c.raw + ' avg. def/insp'}}},
      scales:{ x:{ticks:{color:labelColor,font:{family:'DM Mono',size:10}}, grid:{color:gridColor}}, y:{ticks:{color:labelColor,font:{family:'DM Mono',size:10}}, grid:{color:gridColor}} }
    }
  });

  // Chart 4 — Gemi Stacked Bar
  var shipLabels = shipArr;
  var shipClear = shipArr.map(v => shipStats[v].clear);
  var shipRemark = shipArr.map(v => shipStats[v].remark);
  var shipDetain = shipArr.map(v => shipStats[v].detained);
  _pscCharts.ship = new Chart(document.getElementById('pscChartShip'), {
    type:'bar',
    data:{labels:shipLabels, datasets:[
      {label:'Clear', data:shipClear, backgroundColor:'rgba(0,216,200,0.65)', borderRadius:4},
      {label:'Remark', data:shipRemark, backgroundColor:'rgba(255,170,0,0.75)', borderRadius:4},
      {label:'Detained', data:shipDetain, backgroundColor:'rgba(255,77,77,0.8)', borderRadius:4}
    ]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:labelColor,font:{family:'DM Mono',size:11}}}}, scales:{ x:{stacked:true, ticks:{color:labelColor,font:{family:'DM Mono',size:10}}, grid:{color:gridColor}}, y:{stacked:true, ticks:{color:labelColor,font:{family:'DM Mono',size:10}}, grid:{color:gridColor}} } }
  });

  // Chart 5 — Yıllık Trend
  var yrKeys = Object.keys(yearStats).sort();
  var yrAvgDefs = yrKeys.map(y => yearStats[y].total ? parseFloat((yearStats[y].def / yearStats[y].total).toFixed(1)) : 0);

  _pscCharts.year = new Chart(document.getElementById('pscChartYear'), {
    type: 'line',
    data: {
      labels: yrKeys, 
      datasets: [{
        label: 'Avg. Deficiencies per Inspection', 
        data: yrAvgDefs, 
        borderColor: '#00d8c8', 
        backgroundColor: 'rgba(0, 216, 200, 0.15)', 
        borderWidth: 3, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#ffaa00', pointBorderColor: '#fff', fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
          legend: { display: false }, 
          tooltip: {
              backgroundColor: 'rgba(10,24,28,0.95)', titleColor: '#e4f5f2', bodyColor: 'rgba(150,210,200,0.8)', borderColor: 'rgba(0,216,200,0.3)', borderWidth: 1, padding: 12,
              callbacks: {
                  label: function(context) {
                      var year = context.label;
                      var totalDenetim = yearStats[year] ? yearStats[year].total : 0;
                      return [' Avg: ' + context.parsed.y + ' Remarks', ' Total Insp: ' + totalDenetim];
                  }
              }
          }
      },
      scales: { y: { min: 0, ticks: { color: labelColor, font: { family: 'DM Mono', size: 10 } }, grid: { color: gridColor } }, x: { ticks: { color: labelColor, font: { family: 'DM Mono', size: 10 } }, grid: { display: false } } }
    }
  });

  // Chart 8 — Yaş Buckets Bar
  var ageSorted = Object.keys(ageBuckets).sort((a,b) => ageBuckets[a]._min - ageBuckets[b]._min);
  var ageLabels = ageSorted;
  var ageRates = ageSorted.map(k => ageBuckets[k].total ? Math.round(ageBuckets[k].bad/ageBuckets[k].total*100) : 0);
  var ageColors = ageRates.map(r => r>=70?'rgba(255,77,77,0.75)':r>=45?'rgba(255,170,0,0.75)':'rgba(0,216,200,0.65)');
  _pscCharts.age = new Chart(document.getElementById('pscChartAge'), {
    type:'bar',
    data:{labels:ageLabels, datasets:[{label:'Deficiency Ratio (%)', data:ageRates, backgroundColor:ageColors, borderRadius:6}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c => ' ' + c.raw + '%'}}}, scales:{ x:{ticks:{color:labelColor,font:{family:'DM Mono',size:10}},grid:{color:gridColor}}, y:{max:100, ticks:{color:labelColor,font:{family:'DM Mono',size:10},callback:v=>'%'+v},grid:{color:gridColor}} } }
  });
}
function buildCharts() {
    const td = {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{
        backgroundColor:'rgba(10,24,28,0.95)', titleColor:'#e4f5f2',
        bodyColor:'rgba(150,210,200,0.8)', borderColor:'rgba(0,216,200,0.2)',
        borderWidth:1, padding:10, cornerRadius:10
      }}
    };
    
   const gO = filo.map(g => { const t = gemiAktifMailSayisi(g); return t > 0 ? Math.round(gemiOrani(g)/t*100) : 100; });
    const gR = gO.map(v => v>=80?'rgba(0,240,184,0.75)':v>=40?'rgba(232,184,75,0.75)':'rgba(255,90,114,0.75)');
    
    if(chartGemiRef) chartGemiRef.destroy();
    chartGemiRef = new Chart(document.getElementById('chartGemi'), {
      type:'bar', data:{labels:filo, datasets:[{data:gO,backgroundColor:gR,borderRadius:6,borderSkipped:false}]},
      options:{...td, plugins:{...td.plugins, tooltip:{...td.plugins.tooltip, callbacks:{label:c=>{const t=gemiAktifMailSayisi(filo[c.dataIndex]); return ` %${c.parsed.y}  —  ${Math.round(c.parsed.y*t/100)}/${t} mail`;}}}},
        scales:{
          x:{ticks:{color:'rgba(150,210,200,0.5)',font:{family:'DM Mono',size:8}},grid:{color:'rgba(0,216,200,0.04)'}},
          y:{min:0,max:100,ticks:{color:'rgba(150,210,200,0.5)',font:{family:'DM Mono',size:8},callback:v=>'%'+v},grid:{color:'rgba(0,216,200,0.05)'}}
        }
      }
    });
  
    const mL = mailler.map(m => m.konu.length>16?m.konu.substring(0,14)+'…':m.konu);
    const mO = mailler.map(m => m.toplam > 0 ? Math.round(m.cevap/m.toplam*100) : 0);
    const mR = mO.map(v => v>=80?'rgba(0,212,200,0.7)':v>=50?'rgba(212,160,48,0.7)':'rgba(255,90,114,0.7)');
  
    if(chartMailRef) chartMailRef.destroy();
    chartMailRef = new Chart(document.getElementById('chartMail'), {
      type:'bar', data:{labels:mL, datasets:[{data:mO,backgroundColor:mR,borderRadius:5,borderSkipped:false}]},
      options:{indexAxis:'y',...td, plugins:{...td.plugins, tooltip:{...td.plugins.tooltip, callbacks:{
        title:items=>mailler[items[0].dataIndex].konu,
        label:c=>` %${c.parsed.x}  —  ${mailler[c.dataIndex].cevap}/${mailler[c.dataIndex].toplam} gemi`
      }}},
        scales:{
          x:{min:0,max:100,ticks:{color:'rgba(150,210,200,0.5)',font:{family:'DM Mono',size:8},callback:v=>'%'+v},grid:{color:'rgba(0,216,200,0.05)'}},
          y:{ticks:{color:'rgba(200,235,230,0.7)',font:{family:'DM Mono',size:9}},grid:{display:false}}
        }
      }
    });
  }
  function renderOverdueView() {
    const sortedShips = [...filo].sort((a, b) => {
        const dataA = overdueJobs[a] || {critical:0, important:0, other:0};
        const dataB = overdueJobs[b] || {critical:0, important:0, other:0};
        const totA = dataA.critical + dataA.important + dataA.other;
        const totB = dataB.critical + dataB.important + dataB.other;
        return totB - totA;
    });

    const labels = [];
    const dataTotals = [];

    sortedShips.forEach(ship => {
        labels.push(ship);
        const d = overdueJobs[ship] || {critical:0, important:0, other:0};
        const tot = d.critical + d.important + d.other;
        dataTotals.push(tot);
    });

    if (chartOverdueRef) chartOverdueRef.destroy();
    
    const countUpLabelPlugin = {
        id: 'countUpLabels',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            const dataset = chart.data.datasets[0];
            const xScale = chart.scales.x;
            const zeroX = xScale.getPixelForValue(0);

            meta.data.forEach((bar, index) => {
                const finalValue = dataset.data[index];
                if (finalValue === 0) return;
                const maxX = xScale.getPixelForValue(finalValue);
                const progress = maxX > zeroX ? Math.min((bar.x - zeroX) / (maxX - zeroX), 1) : 1;
                const displayValue = Math.round(finalValue * progress);

                ctx.save();
                
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = 'rgba(0, 216, 200, 0.15)';
                ctx.beginPath();
                ctx.roundRect(bar.x + 5, bar.y - 10, 145, 20, 4);
                ctx.fill();
                
                ctx.globalAlpha = 1;
                ctx.fillStyle = "#ffffff"; 
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.font = '600 11.5px "Inter", -apple-system, sans-serif'; 
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`Total Overdue: ${displayValue}`, bar.x + 10, bar.y);
                
                ctx.restore();
            });
        }
    };

    const ctx = document.getElementById('chartOverdue');
    chartOverdueRef = new Chart(ctx, {
        type: 'bar',
        plugins: [countUpLabelPlugin],
        data: {
            labels: labels,
            datasets:[{
                label: 'Total Overdue Jobs',
                data: dataTotals,
                backgroundColor: 'rgba(0, 216, 200, 0.75)',
                borderColor: 'rgba(0, 240, 220, 0.9)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
 devicePixelRatio: window.devicePixelRatio || 2, 
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: { right: 130 }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10,24,28,0.95)',
                    titleColor: '#e4f5f2',
                    titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
                    bodyColor: 'rgba(150,210,200,0.8)',
                    bodyFont: { family: 'DM Mono', size: 12 },
                    borderColor: 'rgba(0,216,200,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const ship = context.label;
                            const d = overdueJobs[ship] || {critical:0, important:0, other:0};
                            const tot = d.critical + d.important + d.other;
                            return[
                                `Total Overdue: ${tot}`,
                                `----------------------`,
                                `Critical Job : ${d.critical}`,
                                `Important Job: ${d.important}`,
                                `Other Job    : ${d.other}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,216,200,0.05)' },
                    ticks: { color: 'rgba(150,210,200,0.7)', font: { family: 'DM Mono' } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'rgba(200,235,230,0.9)', font: { family: 'DM Mono', size: 11, weight: 'bold' } }
                }
            }
        }
    });

    // === YENİ: TARİHSEL ÇİZGİ GRAFİĞİNİ ÇİZ ===
    const histLabels = overdueHistory.map(h => h.date);
    const histData = overdueHistory.map(h => h.total);

    if (chartOverdueHistoryRef) chartOverdueHistoryRef.destroy();
    
    chartOverdueHistoryRef = new Chart(document.getElementById('chartOverdueHistory'), {
        type: 'line',
        data: {
            labels: histLabels,
            datasets: [{
                label: 'Filo Toplam Overdue',
                data: histData,
                borderColor: '#00d8c8', // Tema rengi Teal
                backgroundColor: 'rgba(0, 216, 200, 0.15)',
                borderWidth: 3,
                pointBackgroundColor: '#d4a030', // Noktalar Gold
                pointBorderColor: '#fff',
                pointRadius: 5,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10,24,28,0.95)',
                    titleColor: '#e4f5f2',
                    bodyColor: 'rgba(150,210,200,0.8)',
                    borderColor: 'rgba(0,216,200,0.3)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) { return ' Toplam Overdue: ' + context.parsed.y; }
                    }
                }
            },
            scales: {
                x: { 
                    ticks: { color: 'rgba(150,210,200,0.7)', font: { family: 'DM Mono' } },
                    grid: { display: false }
                },
                y: {
                    min: 0,
                    ticks: { color: 'rgba(150,210,200,0.7)', font: { family: 'DM Mono', weight: 'bold' } },
                    grid: { color: 'rgba(0,216,200,0.05)' }
                }
            }
        }
    });
}
// =========================================================
//  REMARK KATEGORİ YÖNETİM (ADMIN) SİSTEMİ
// =========================================================

// Her bir remarkın sistemde nereden geldiğini bilebilmek için harita oluşturuyoruz
let flatRemarkMap = [];

function authAndOpenRemarkAdmin() {
    let pass = prompt("Kategori Yönetimi Paneli\nLütfen Admin şifresini girin:");
    if (pass !== "admin123") { 
        if (pass !== null) alert("Hatalı şifre!");
        return;
    }
    openRemarkCategoryAdmin();
}

function openRemarkCategoryAdmin() {
    flatRemarkMap = [];
    let pData = perfLoadData();
    let tbody = document.getElementById('remarkCatAdminTbody');
    let trHtml = '';

    // 1. Personellerin (Aktif Kaptan ve Çarkçı) altındaki PSC kayıtlarını tara
    pData.forEach(p => {
        if (p.pscRecords) {
            p.pscRecords.forEach((r, pscIdx) => {
                if (r.remarks) {
                    r.remarks.forEach((rm, rmIdx) => {
                        let refId = `p_${p.id}_${pscIdx}_${rmIdx}`;
                        flatRemarkMap.push({ refId, source: 'personel', personId: p.id, pscIdx, rmIdx });
                        trHtml += buildRemarkAdminRow(refId, r.vessel, r.date, rm.desc, rm.category);
                    });
                }
            });
        }
    });

    // 2. Bağımsız PSC Kayıtlarını (Şirket İçi Havuz) tara
    bagimsizPscRecords.forEach((r, bIdx) => {
        if (r.remarks) {
            r.remarks.forEach((rm, rmIdx) => {
                let refId = `b_${bIdx}_${rmIdx}`;
                flatRemarkMap.push({ refId, source: 'bagimsiz', bIdx, rmIdx });
                trHtml += buildRemarkAdminRow(refId, r.vessel, r.date, rm.desc, rm.category);
            });
        }
    });

    if (trHtml === '') {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--muted); font-family:\'Plus Jakarta Sans\';">Veritabanında hiç remark bulunmuyor.</td></tr>';
    } else {
        tbody.innerHTML = trHtml;
    }

    document.getElementById('remarkCatAdminOverlay').style.display = 'flex';
}

function buildRemarkAdminRow(refId, vessel, date, desc, currentCategory) {
    let catOptions = IMO_CATEGORIES.map(cat => {
        // Eğer kategori girilmemişse veya eşleşiyorsa seçili yap
        let selected = (cat === currentCategory || (!currentCategory && cat === '99 - Other')) ? 'selected' : '';
        return `<option value="${cat}" ${selected}>${cat}</option>`;
    }).join('');

    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
        <td style="padding:15px; color:var(--teal); font-weight:700;">[${vessel || 'Bilinmiyor'}]<br><span style="font-family:'DM Mono'; font-size:0.7rem; color:var(--muted); font-weight:normal;">${date}</span></td>
        <td style="padding:15px; color:var(--text); line-height:1.5;">${desc}</td>
        <td style="padding:15px;"><select id="sel_${refId}" class="perf-select" style="font-family:'Plus Jakarta Sans'; font-size:0.75rem; padding:8px; width:100%; border:1px solid rgba(66,133,244,0.3);">${catOptions}</select></td>
    </tr>`;
}

function saveRemarkCategories() {
    let pData = perfLoadData();
    let changedCount = 0;

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
        perfSaveData(pData); 
        alert(`Başarılı! Toplam ${changedCount} remark kategorisi güncellendi.`);
    } else {
        alert("Herhangi bir değişiklik yapılmadı.");
    }

    document.getElementById('remarkCatAdminOverlay').style.display = 'none';
    
    // İşlem bitince verileri tazelemek için istatistik sekmesini yeniden çizdir
    renderPscIstatView(); 
}
