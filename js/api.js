var bonusData = null;
async function loadBonusData() {
    try {
        const res = await fetch("https://spark-filo-panel-default-rtdb.europe-west1.firebasedatabase.app/bonus_data.json");
        bonusData = await res.json();
        console.log("Bonus data yüklendi:", bonusData ? bonusData.visits.length + " ziyaret" : "boş");
    } catch(e) {
        console.error("Bonus data yüklenemedi:", e);
        bonusData = null;
    }
}
// --- YENİ VERİ YÜKLEME SİSTEMİ (JSONP) ---
function loadData() {
    console.log("Firebase veritabanına bağlanılıyor...");
    document.getElementById('userPage').style.cursor = 'wait';
  
    fetch(API_URL)
      .then(response => response.json())
      .then(data => {
        // Eğer veritabanı yepyeni/boşsa Firebase null döner, bu durumda hata almamak için boş obje atıyoruz
        if (!data) data = {}; 
        processGoogleData(data);
      })
      .catch(err => {
        console.error("Bağlantı hatası:", err);
        alert("Veriler Firebase'den yüklenemedi! İnternetinizi kontrol edin.");
        document.getElementById('userPage').style.cursor = 'default';
        buildSummary(); buildTable(); buildCharts();
      });
  }
  // --- GOOGLE'DAN GELEN VERİYİ KARŞILAYAN FONKSİYON ---
  function processGoogleData(data) {
    console.log("Veri başarıyla alındı:", data);
  
    // EKLENEN KOD: Firebase JSON import sarmalamasını çözer
    if (data && data.data && data.data.filo) {
        data = data.data;
        console.log("Veriler 'data' alt düğümünden başarıyla çıkartıldı.");
    }
    if (data.isComplianceVisible !== undefined) {
        isComplianceVisible = data.isComplianceVisible;
        localStorage.setItem('isComplianceVisible_v1', isComplianceVisible);
    }
  
    // 1. Filo Listesini Ayarla
    if (data.filo && data.filo.length > 0) {
      filo = data.filo;
    } else {
      filo = JSON.parse(JSON.stringify(defaultFilo));
    }
  
    // 2. Zorunlu gemi kontrolü (Zeynep)
    if (!filo.includes("ZEYNEP")) filo.push("ZEYNEP");
    if (!filo.includes("EMINE")) filo.push("EMINE");
  
    
  // 3. Verileri değişkenlere dağıt
  // 3. Verileri değişkenlere dağıt
    if (data.mailler) mailler = data.mailler;
    if (data.aylik)   aylikData = data.aylik;
    if (data.techWeekly) techWeeklyData = data.techWeekly;
if (data.techMonthly) techMonthlyData = data.techMonthly;
    if (data.overdue) overdueJobs = data.overdue;
    if (data.defect)  defectData = data.defect;
    if (data.complianceBonus) complianceBonus = data.complianceBonus;
    if (data.drillBonus) drillBonus = data.drillBonus;
    if (data.previousRanks) previousRanks = data.previousRanks;
    if (data.fleetHistory) fleetHistory = data.fleetHistory;
    if (data.inspectorHistory) inspectorHistory = data.inspectorHistory;
    if (data.bagimsizPscRecords) bagimsizPscRecords = data.bagimsizPscRecords;
    if (data.etaCsvData) window.globalEtaCsv = data.etaCsvData;
    if (data.shipRankingHistory) shipRankingHistory = data.shipRankingHistory;
    
    // YENİ EKLENEN SATIR: Firebase'den gelen personeli tarayıcıya kaydet
    if (data.personel) localStorage.setItem(PERF_KEY, JSON.stringify(data.personel));
  
    
    // YENİ EKLENEN KISIM: Buluttan aktif haftayı ve ayı okur
    if (data.activeWeek) {
        window.gnCurrentFriday = data.activeWeek;
    }
    if (data.activeMonth) {
        window.aylikCurrentMonth = data.activeMonth;
    }
    
    // --- BULUTTAN EKRANA YANSITILMAYAN EKSİK VERİLER EKLENDİ ---
    if (data.arrowMode) arrowMode = data.arrowMode;
    if (data.manualArrows) manualArrows = data.manualArrows;
    if (data.overdueSnapshots) overdueSnapshots = data.overdueSnapshots;
  if (data.activeWeek) window.gnCurrentFriday = data.activeWeek;
    
    if (data.committedWeeks) {
        window.committedWeeks_haftalik = data.committedWeeks.haftalik || [];
        window.committedWeeks_aylik    = data.committedWeeks.aylik || [];
        window.committedWeeks_alltime  = data.committedWeeks.alltime || [];
    }
    if (data.committedMonths) {
        window.committedMonths_haftalik = data.committedMonths.haftalik || [];
        window.committedMonths_aylik    = data.committedMonths.aylik || [];
        window.committedMonths_alltime  = data.committedMonths.alltime || [];
    }
    // TEKNİK DEPARTMAN BAĞIMSIZ LİSTELERİ
    if (data.committedTechWeeks) {
      window.committedTechWeeks_haftalik = data.committedTechWeeks.haftalik || [];
      window.committedTechWeeks_aylik    = data.committedTechWeeks.aylik || [];
      window.committedTechWeeks_alltime  = data.committedTechWeeks.alltime || [];
  } else {
      window.committedTechWeeks_haftalik = []; window.committedTechWeeks_aylik = []; window.committedTechWeeks_alltime = [];
  }
  
  if (data.committedTechMonths) {
      window.committedTechMonths_haftalik = data.committedTechMonths.haftalik || [];
      window.committedTechMonths_aylik    = data.committedTechMonths.aylik || [];
      window.committedTechMonths_alltime  = data.committedTechMonths.alltime || [];
  } else {
      window.committedTechMonths_haftalik = []; window.committedTechMonths_aylik = []; window.committedTechMonths_alltime = [];
  }
    // 4. Günlük raporları LocalStorage'a mühürle
    if (data.gunluk) {
      localStorage.setItem('gnRaporlar_v1', JSON.stringify(data.gunluk));
    }
  
    // 5. Coming Soon ve Diğer Durumlar
    if (data.isComingSoonActive !== undefined) {
      isComingSoonActive = data.isComingSoonActive;
      localStorage.setItem('isComingSoonActive_v1', isComingSoonActive);
      updateComingSoonUI();
    }
  
    // 6. Arayüzü Çiz
   // 6. Arayüzü Çiz
    recalcStats(); 
    
    // EKLENEN KISIM: Aylık sekmesindeki başlığı seçili aya göre ayarlar
    if (window.aylikCurrentMonth) {
        const lbl = document.getElementById('aylikMonthLabel');
        if(lbl) {
            const parts = window.aylikCurrentMonth.split('-');
            lbl.textContent = new Date(parts[0], parts[1]-1, 1).toLocaleDateString('en-US', {month:'long', year:'numeric'});
        }
    }
    loadBonusData();
    buildSummary();
    buildTable();
    buildCharts();

    if (currentView === 'ranking' && typeof renderHallOfFameCards === 'function') {
        renderHallOfFameCards();
    }
  
    // 7. İşlemi bitir ve temizle
    document.getElementById('userPage').style.cursor = 'default';
    
    
    console.log("Dashboard başarıyla güncellendi.");
  }
  // 5. BULUTA KAYDETME FONKSİYONU
function saveData() {
    localStorage.setItem('aylikRaporlar_v1', JSON.stringify(aylikData));
    _saveDataActual(); // HİÇ BEKLEMEDEN ANINDA FIRLAT!
  }
  function _saveDataActual() {
    const currentGunlukData = JSON.parse(localStorage.getItem('gnRaporlar_v1') || '{}');
    const now = new Date();
    const timeString = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
  
    // --- TRUVA ATLARI ---
    aylikData["__GIZLI_GUNLUK__"] = currentGunlukData;
    aylikData["__GIZLI_OVERDUE__"] = overdueJobs; 
    aylikData["__GIZLI_DEFECT__"] = defectData;   
    aylikData["__GIZLI_MAILLER__"] = mailler;
    aylikData["__GIZLI_COMING_SOON__"] = isComingSoonActive;
    aylikData["__GIZLI_OVERDUE_HISTORY__"] = overdueHistory;
  aylikData["__GIZLI_INSPECTOR__"] = inspectorHistory;
  aylikData["__GIZLI_COMPLIANCE__"] = complianceBonus;
  aylikData["__GIZLI_DRILL__"] = drillBonus;
  aylikData["__GIZLI_TECH_WEEKLY__"] = techWeeklyData;
aylikData["__GIZLI_TECH_MONTHLY__"] = techMonthlyData;
    
    aylikData["__GIZLI_WEEKS__"] = {
        haftalik: window.committedWeeks_haftalik || [],
        aylik: window.committedWeeks_aylik || [],
        alltime: window.committedWeeks_alltime || []
    };
    aylikData["__GIZLI_MONTHS__"] = {
        haftalik: window.committedMonths_haftalik || [],
        aylik: window.committedMonths_aylik || [],
        alltime: window.committedMonths_alltime || []
    };
    aylikData["__GIZLI_TECH_WEEKS__"] = {
      haftalik: window.committedTechWeeks_haftalik || [],
      aylik: window.committedTechWeeks_aylik || [],
      alltime: window.committedTechWeeks_alltime || []
  };
  aylikData["__GIZLI_TECH_MONTHS__"] = {
      haftalik: window.committedTechMonths_haftalik || [],
      aylik: window.committedTechMonths_aylik || [],
      alltime: window.committedTechMonths_alltime || []
  };
    
    localStorage.setItem('aylikRaporlar_v1', JSON.stringify(aylikData));
    
    // YENİ: KAYIT SAATİNİ MÜHÜRLE (15 Saniye koruması için)
    localStorage.setItem('spark_cache_time_v1', Date.now().toString());
  
    const listelerObj = {
        weeks: aylikData["__GIZLI_WEEKS__"],
        months: aylikData["__GIZLI_MONTHS__"]
    };
    localStorage.setItem('spark_listeler_v1', JSON.stringify(listelerObj));
  
    const dataPackage = {
      bonus_data: bonusData,
      filo: filo,
      mailler: mailler,
      overdueHistory: overdueHistory,
      overdueSnapshots: overdueSnapshots,
      gunluk: currentGunlukData,
      aylik: aylikData,
      techWeekly: techWeeklyData,
techMonthly: techMonthlyData,
      manualArrows: manualArrows,
      fleetHistory: fleetHistory,
      shipRankingHistory: shipRankingHistory,
  bagimsizPscRecords: bagimsizPscRecords,
      arrowMode: arrowMode,
      committedWeeks: {
        haftalik: window.committedWeeks_haftalik || [],
        aylik: window.committedWeeks_aylik || [],
        alltime: window.committedWeeks_alltime || []
    },
    committedMonths: {
        haftalik: window.committedMonths_haftalik || [],
        aylik: window.committedMonths_aylik || [],
        alltime: window.committedMonths_alltime || []
    },
    
    // İŞTE EKLENEN YENİ KISIM BURASI:
    committedTechWeeks: {
        haftalik: window.committedTechWeeks_haftalik || [],
        aylik: window.committedTechWeeks_aylik || [],
        alltime: window.committedTechWeeks_alltime || []
    },
    committedTechMonths: {
        haftalik: window.committedTechMonths_haftalik || [],
        aylik: window.committedTechMonths_aylik || [],
        alltime: window.committedTechMonths_alltime || []
    },
    etaCsvData: window.globalEtaCsv || "",
    lastUpdated: timeString,
      previousRanks: previousRanks,
      activeWeek: window.gnCurrentFriday,
  activeMonth: window.aylikCurrentMonth,
      overdue: overdueJobs,   
      defect: defectData,
      complianceBonus: complianceBonus,
      drillBonus: drillBonus,
      isComplianceVisible: isComplianceVisible,
      personel: perfLoadData(),
      isComingSoonActive: isComingSoonActive,
      inspectorHistory: inspectorHistory // <--- İŞTE BURAYA EKLENDİ
    };
    
    fetch(API_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataPackage)
    }).then(() => console.log("Veri Firebase'e başarıyla kaydedildi."))
      .catch(err => console.error("Kaydetme hatası:", err));    
    localStorage.setItem('overdueJobs_v1', JSON.stringify(overdueJobs));
    localStorage.setItem('drillBonus_v1', JSON.stringify(drillBonus));
    localStorage.setItem('defectData_v1', JSON.stringify(defectData));
    recalcStats();
  }
  function gnSave(data) {
    localStorage.setItem('gnRaporlar_v1', JSON.stringify(data));
    saveData();
  }
  
  // (Burası silmediğin kodun hemen üstüne gelecek)
  // function resetData() { ...
  function resetData() {
    if(!confirm("Tüm veriler silinip varsayılana dönecek. Emin misiniz?")) return;
    filo = JSON.parse(JSON.stringify(defaultFilo));
    mailler = JSON.parse(JSON.stringify(defaultMailler));
    localStorage.removeItem('gnRaporlar_v1');
    localStorage.removeItem('aylikRaporlar_v1');
    localStorage.removeItem('overdueJobs_v1');
    localStorage.removeItem('defectData_v1');
    
    maillerModifiedThisSession = true;
    saveData();
    location.reload();
  }
  
  function recalcStats() {
    mailler.forEach(m => {
      if(!m.yok) m.yok = [];
      if(!m.muaf) m.muaf =[];
      const aktifGemi = filo.filter(g => !m.muaf.includes(g));
      m.toplam = aktifGemi.length;
      m.cevap = aktifGemi.filter(g => !m.yok.includes(g)).length;
    });
  
  }
  const muafMi           = (g, i) => (mailler[i].muaf || []).includes(g);
  const cevapVerdiMi     = (g, i) => !muafMi(g, i) && !(mailler[i].yok || []).includes(g);
  const gemiAktifMailSayisi = g  => mailler.filter((_, i) => !muafMi(g, i)).length;
  const gemiOrani        = g     => mailler.reduce((a, _, i) => a + (!muafMi(g, i) && cevapVerdiMi(g, i) ? 1 : 0), 0);
  const getStatus        = g     => {
      const aktif = gemiAktifMailSayisi(g);
      const d = gemiOrani(g);
      if(aktif === 0) return 'ok';
      return d === aktif ? 'ok' : d === 0 ? 'bad' : 'warn';
  };
  // ══════════════════════════════════════════════════════
  //  GÖRSELLEŞTİRME (DASHBOARD)
  // ══════════════════════════════════════════════════════
  
  function buildSummary() {
    // 1. Yeni Filo Ortalamasını Hesapla (Tüm Raporlar - Final Ratio)
    let totalFinalRate = 0;
    filo.forEach(gemi => {
      totalFinalRate += getShipFinalRate(gemi);
    });
    const oran = filo.length > 0 ? Math.round(totalFinalRate / filo.length) : 0;
  
    // 2. Otomatik Kayıt İşlemi (Her Cuma Günü)
    const today = new Date();
    if (today.getDay() === 5) { // 5 = Cuma
      const dateStr = today.toLocaleDateString('tr-TR');
      const alreadySaved = fleetHistory.some(item => item.date === dateStr);
      
      if (!alreadySaved) {
        fleetHistory.push({ date: dateStr, avg: oran });
        
        // Şampiyonlar Ligi için ilk 3 gemiyi bul ve kaydet
        const haftalikSiralama = getSortedShips(filo, 'haftalik');
        shipRankingHistory.push({
            date: dateStr,
            first: haftalikSiralama[0] || "",
            second: haftalikSiralama[1] || "",
            third: haftalikSiralama[2] || ""
        });
        
        saveData(); // Buluta gönder
      }
    }
  
    // 3. En İyi ve En Kötü Gemiler
    const siralama = getSortedShips(filo);
    const enIyiler = siralama.slice(0, 2).join(', ');
    const enKotuler = siralama.slice(-2).join(', ');
  
   // 4. Kartları Oluştur (Tam ve Kısmi Cevap kaldırıldı, tıklanabilirlik eklendi)
    // 4. Kartları Oluştur (Tam ve Kısmi Cevap kaldırıldı, tıklanabilirlik eklendi)
    const cards=[
      {
        label:'🚢 TOPLAM GEMİ',
        val:filo.length,
        sub:'Aktif Gemi Sayısı',
        clickAttr:'',
        labelStyle:'color:#4285f4; font-weight:800; letter-spacing:0.05em;',
        valStyle:'color:#fff; font-size:2.4rem;'
      },
      {
        label:'🏆 EN İYİ / EN KÖTÜ 2',
        val:`<div style="font-size:1.3rem; line-height:1.2; color:var(--ok); margin-bottom:5px; text-shadow:0 0 10px rgba(0,240,184,0.3)">🏆 ${enIyiler}</div>`,
        sub:`<div style="color:var(--bad); font-size:0.8rem; font-weight:700; margin-top:5px; opacity:0.9">🔻 Sonuncular: ${enKotuler}</div>`,
        clickAttr:'',
        labelStyle:'color:#d96570; font-weight:800; letter-spacing:0.05em;',
        valStyle:'color:#fff; font-size:2.1rem;'
      },
      // Bu karta tıklandığında grafik açılacak
      {
        label:'📈 FİLO FİNAL ORTALAMASI',
        val:'%'+oran,
        sub:'Matris + Günlük + Aylık',
        clickAttr:'onclick="openHistoryChart()" style="cursor:pointer;" title="Geçmişi görmek için tıklayın"',
        labelStyle:'color:#f0a500; font-weight:800; letter-spacing:0.05em;',
        valStyle:'color:#fff; font-size:2.4rem;'
      },
    ];
  
    document.getElementById('summaryCards').innerHTML = cards.map((c,i)=>`
      <div class="s-card ai-glow-card reveal" ${c.clickAttr} style="transition-delay:${i*0.07}s">
        <div class="s-label" style="${c.labelStyle}">${c.label}</div>
        <div class="s-val" style="${c.valStyle}">${c.val}</div>
        <div class="s-sub">${c.sub}</div>
      </div>`).join('');
    
    if(document.getElementById('welcomeScreen').classList.contains('hidden')) {
        observeReveal();
    }
  }
  function switchRankingMode(mode) {
      rankingMode = mode;
      ['haftalik','aylik','alltime'].forEach(m => {
          const btnId = 'rm' + m.charAt(0).toUpperCase() + m.slice(1);
          const btn = document.getElementById(btnId);
          if (!btn) return;
          
          // Önce mevcut tüm aktif sınıfları temizle
          btn.classList.remove('active-teal', 'active-gold');
  
          if (m === mode) {
              // AKTİF SEKMEYİ AYARLA
              if (m === 'alltime') {
                  // All Time Top ise ona özel siberpunk ALTIN stilini ve animasyonu aç
                  btn.classList.add('active-gold');
              } else {
                  // Haftalık veya Aylık ise siberpunk TEAL stilini aç
                  btn.classList.add('active-teal');
              }
          } 
          // Pasif olanlar otomatik olarak temel .ranking-mode-btn stilinde kalacaktır, JS ekstra ayar yapmaz.
      });
      applyFilters();
  }
  function switchView(view) {
    currentView = view;
    document.getElementById('viewRanking').classList.toggle('active', view === 'ranking');
    document.getElementById('viewMatrix').classList.toggle('active', view === 'matrix');
    document.getElementById('viewGunluk').classList.toggle('active', view === 'gunluk');
    document.getElementById('viewAylik').classList.toggle('active', view === 'aylik');
    document.getElementById('viewOverdue').classList.toggle('active', view === 'overdue');
    const btnDrill = document.getElementById('viewDrill'); if(btnDrill) btnDrill.classList.toggle('active', view === 'drill');
    document.getElementById('viewDefect').classList.toggle('active', view === 'defect');
    
    const hallOfFame = document.getElementById('hallOfFameContainer');
    if (hallOfFame) hallOfFame.style.display = (view === 'ranking') ? 'block' : 'none';
    
    if (view === 'ranking') {
        applyFilters();
        renderHallOfFameCards(); // <--- Yeni kart fonksiyonumuzu çağırıyoruz
    }
    // Yeni eklenen sekmeler
    const btnTW = document.getElementById('viewTechWeekly'); if(btnTW) btnTW.classList.toggle('active', view === 'techWeekly');
    const btnTM = document.getElementById('viewTechMonthly'); if(btnTM) btnTM.classList.toggle('active', view === 'techMonthly');

    const toolbar = document.querySelector('.toolbar');
    if(toolbar) toolbar.style.display = (view === 'gunluk' || view === 'aylik' || view === 'techWeekly' || view === 'techMonthly' || view === 'overdue' || view === 'defect') ? 'none' : 'flex';
    
    const weekContainer = document.getElementById('gnWeekContainer');
    if(weekContainer) weekContainer.style.display = (view === 'gunluk') ? 'flex' : 'none';
    
    const rankingBar = document.getElementById('rankingModeBar');
    if(rankingBar) rankingBar.style.display = (view === 'ranking') ? 'flex' : 'none';

    const aylikContainer = document.getElementById('aylikMonthContainer');
    if(aylikContainer) aylikContainer.style.display = (view === 'aylik') ? 'flex' : 'none';

    // Yeni eklenen tarih seçiciler
    const twContainer = document.getElementById('techWeeklyDateContainer');
    if(twContainer) twContainer.style.display = (view === 'techWeekly') ? 'flex' : 'none';
    
    const tmContainer = document.getElementById('techMonthlyDateContainer');
    if(tmContainer) tmContainer.style.display = (view === 'techMonthly') ? 'flex' : 'none';

    document.getElementById('matrisTable').style.display = (view === 'matrix' || view === 'ranking' || view === 'gunluk' || view === 'aylik' || view === 'techWeekly' || view === 'techMonthly') ? 'table' : 'none';
    document.getElementById('viewOverdueContent').style.display = (view === 'overdue') ? 'block' : 'none';
    document.getElementById('viewDefectContent').style.display = (view === 'defect') ? 'block' : 'none';
    document.getElementById('viewDrillContent').style.display = (view === 'drill') ? 'block' : 'none';
    
    const chartsRow = document.getElementById('chartsRow');
    if(chartsRow) chartsRow.style.display = (view === 'matrix') ? 'grid' : 'none';

    // Sayfa Çizdirme Yönlendirmeleri
    if(view === 'ranking') {
        applyFilters();
        if(typeof renderHallOfFameCards === 'function') renderHallOfFameCards();
    }
    else if(view === 'gunluk') renderGunlukView();
    else if(view === 'aylik') renderAylikView();
    else if(view === 'techWeekly') renderTechWeeklyView();
    else if(view === 'techMonthly') renderTechMonthlyView();
    else if(view === 'overdue') renderOverdueView();
    else if(view === 'defect') renderDefectView();
    else if(view === 'drill') renderDrillView();
    else buildTable();
}
// --- TECHNICAL EKRAN GÖRÜNTÜLEME FONKSİYONLARI ---
let currentTechWeeklyDate = window.gnCurrentFriday;
let currentTechMonthlyDate = window.aylikCurrentMonth;

function changeTechWeeklyDate(val) {
    if(!val) return;
    currentTechWeeklyDate = val;
    if(currentView === 'techWeekly') renderTechWeeklyView();
}

function changeTechMonthlyDate(val) {
    if(!val) return;
    currentTechMonthlyDate = val;
    if(currentView === 'techMonthly') renderTechMonthlyView();
}

function renderTechWeeklyView() {
    if(!currentTechWeeklyDate) currentTechWeeklyDate = window.gnCurrentFriday;
    const wData = techWeeklyData[currentTechWeeklyDate] || {};
    
    let head = `<tr><th class="ship-th" style="min-width:100px;">VESSEL</th>`;
    TECH_WEEKLY_ITEMS.forEach(item => {
        head += `<th style="text-align:center;"><span style="display:block;font-family:'Outfit';font-weight:700;font-size:0.65rem;color:#4285f4;">${item}</span></th>`;
    });
    head += `<th style="text-align:center;min-width:120px;">WEEKLY RATIO</th></tr>`;

    let body = '';
    filo.forEach(ship => {
        let cells = ''; let count = 0; let expected = TECH_WEEKLY_ITEMS.length;
        const shipData = wData[ship] || {};
        
        TECH_WEEKLY_ITEMS.forEach(item => {
            const val = shipData[item];
            if(val === 'yes') {
                count++;
                cells += `<td style="text-align:center;"><span style="color:var(--ok);font-size:1.1rem;text-shadow:0 0 8px rgba(0,240,184,0.5)">✓</span></td>`;
            } else if(val === 'muaf') {
                expected--;
                cells += `<td style="text-align:center;"><span style="color:var(--muted);font-size:0.9rem;">⊘</span></td>`;
            } else {
                cells += `<td style="text-align:center;"><span style="color:rgba(255,90,114,0.35);font-size:1rem;">✗</span></td>`;
            }
        });
        
        const oran = expected > 0 ? Math.round((count / expected) * 100) : 100;
        const statCls = oran >= 80 ? 'ok' : oran >= 40 ? 'warn' : 'bad';
        
        body += `<tr data-gemi="${ship}" data-status="${statCls}">
            <td class="ship-col"><span class="ship-tag">${ship}</span></td>
            ${cells}
            <td>
                <div class="rate-pill rate-${statCls}" style="justify-content:center;gap:6px;">
                    <div class="mini-bg" style="flex:1;"><div class="mini-fill" style="width:${oran}%"></div></div>
                    <span class="rate-num">${count}/${expected}</span>
                </div>
            </td>
        </tr>`;
    });

    document.getElementById('tableHead').innerHTML = head;
    document.getElementById('tableBody').innerHTML = body;
    const rc = document.getElementById('resultCount');
    if(rc) rc.textContent = '';
    document.getElementById('techWeeklyDateSelect').value = currentTechWeeklyDate;
}

function renderTechMonthlyView() {
    if(!currentTechMonthlyDate) currentTechMonthlyDate = window.aylikCurrentMonth;
    const mData = techMonthlyData[currentTechMonthlyDate] || {};
    
    let head = `<tr><th class="ship-th" style="min-width:100px;">VESSEL</th>`;
    TECH_MONTHLY_ITEMS.forEach(item => {
        head += `<th style="text-align:center;"><span style="display:block;font-family:'Outfit';font-weight:700;font-size:0.65rem;color:#4285f4;">${item}</span></th>`;
    });
    head += `<th style="text-align:center;min-width:120px;">MONTHLY RATIO</th></tr>`;

    let body = '';
    filo.forEach(ship => {
        let cells = ''; let count = 0; let expected = TECH_MONTHLY_ITEMS.length;
        const shipData = mData[ship] || {};
        
        TECH_MONTHLY_ITEMS.forEach(item => {
            const val = shipData[item];
            if(val === 'yes') {
                count++;
                cells += `<td style="text-align:center;"><span style="color:var(--ok);font-size:1.1rem;text-shadow:0 0 8px rgba(0,240,184,0.5)">✓</span></td>`;
            } else if(val === 'muaf') {
                expected--;
                cells += `<td style="text-align:center;"><span style="color:var(--muted);font-size:0.9rem;">⊘</span></td>`;
            } else {
                cells += `<td style="text-align:center;"><span style="color:rgba(255,90,114,0.35);font-size:1rem;">✗</span></td>`;
            }
        });
        
        const oran = expected > 0 ? Math.round((count / expected) * 100) : 100;
        const statCls = oran >= 80 ? 'ok' : oran >= 40 ? 'warn' : 'bad';
        
        body += `<tr data-gemi="${ship}" data-status="${statCls}">
            <td class="ship-col"><span class="ship-tag">${ship}</span></td>
            ${cells}
            <td>
                <div class="rate-pill rate-${statCls}" style="justify-content:center;gap:6px;">
                    <div class="mini-bg" style="flex:1;"><div class="mini-fill" style="width:${oran}%"></div></div>
                    <span class="rate-num">${count}/${expected}</span>
                </div>
            </td>
        </tr>`;
    });

    document.getElementById('tableHead').innerHTML = head;
    document.getElementById('tableBody').innerHTML = body;
    const rc = document.getElementById('resultCount');
    if(rc) rc.textContent = '';
    document.getElementById('techMonthlyDateSelect').value = currentTechMonthlyDate;
}
  
  function buildTable(gemiler) {
    gemiler = gemiler || filo;
    if (currentView === 'matrix') renderMatrixView(gemiler);
    else if (currentView === 'ranking') renderRankingView(gemiler);
    applyFiltersRows();
  }
  
  function renderMatrixView(gemiler) {
    let thH = `<tr><th class="ship-th">VESSEL</th>`;
    mailler.forEach((m,i)=>{
      const k = m.konu.length>14 ? m.konu.substring(0,12)+'…' : m.konu;
      thH += `<th onclick="sortByMail(${i})" title="${m.konu}"><span class="th-top">${k}</span><span class="th-date">${m.tarih}</span></th>`;
    });
    thH += `<th class="rate-th" onclick="sortByRate()">FEEDBACK RATIO <span class="sort-arrow" id="sortArrow">↕</span></th></tr>`;
    document.getElementById('tableHead').innerHTML = thH;
  
    let tbH = '';
    gemiler.forEach(gemi => {
      const aktif = gemiAktifMailSayisi(gemi);
      const d = gemiOrani(gemi);
      const oran = aktif > 0 ? Math.round(d/aktif*100) : 100;
      const stat = getStatus(gemi);
      const badge = aktif === 0 ? 'MUAF' : (stat==='ok'?'TAM':stat==='warn'?'PARTIAL':'YOK');
      let cells='';
      mailler.forEach((_,i)=>{
        if(muafMi(gemi, i)) {
          cells += `<td style="color:rgba(150,170,165,0.35);font-size:0.9rem;" title="Muaf">—</td>`;
        } else {
          cells += cevapVerdiMi(gemi,i) ? `<td class="cell-ok">✓</td>` : `<td class="cell-bad">✗</td>`;
        }
      });
      tbH += `<tr data-status="${stat}" data-gemi="${gemi}" data-rate="${oran}">
        <td class="ship-col"><span class="ship-tag">${gemi}</span></td>
        ${cells}
        <td><div class="rate-pill rate-${stat}">
          <span class="rate-num">${d}/${aktif}</span>
          <div class="mini-bg"><div class="mini-fill" style="width:${oran}%"></div></div>
          <span class="rbadge">${badge}</span>
        </div></td></tr>`;
    });
    document.getElementById('tableBody').innerHTML = tbH;
  }
  
  function renderRankingView(gemiler) {
    const mode = rankingMode; 
    const sortedShips = getSortedShips(gemiler, mode); 
    
    // Sütunların başlıkta ne kadar yer kaplayacağını mod bazlı dinamik ayarlıyoruz
    const opsColspan = mode === 'haftalik' ? 3 : 4;
    const techColspan = mode === 'haftalik' ? 1 : 2;
    
    let thH = `
    <tr>
        <th rowspan="2" style="width:50px; vertical-align:middle; border-bottom:1px solid var(--border2);">rank</th>
        <th rowspan="2" class="ship-th" style="text-align:left; padding-left:1.5rem; vertical-align:middle; border-bottom:1px solid var(--border2);">VESSEL</th>
        
        <th colspan="${opsColspan}" style="text-align:center; padding:18px 5px 8px 5px; border-bottom:none; position:relative;">
            <div style="position:absolute; top:8px; left:4px; right:4px; bottom:0; border-top:1px solid rgba(255,255,255,0.4); border-left:1px solid rgba(255,255,255,0.4); border-right:1px solid rgba(255,255,255,0.4); border-radius:6px 6px 0 0; pointer-events:none;"></div>
            
            <div style="display:inline-block; font-family:'Plus Jakarta Sans', sans-serif; font-weight:700; letter-spacing:1px; color:#fff; font-size:0.75rem; position:relative; z-index:1; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">
                OPERATIONS DEPARTMENT
            </div>
        </th>
        
        <th colspan="${techColspan}" style="text-align:center; padding:18px 5px 8px 5px; border-bottom:none; position:relative;">
            <div style="position:absolute; top:8px; left:4px; right:4px; bottom:0; border-top:1px solid rgba(255,255,255,0.4); border-left:1px solid rgba(255,255,255,0.4); border-right:1px solid rgba(255,255,255,0.4); border-radius:6px 6px 0 0; pointer-events:none;"></div>
            
            <div style="display:inline-block; font-family:'Plus Jakarta Sans', sans-serif; font-weight:700; letter-spacing:1px; color:#fff; font-size:0.75rem; position:relative; z-index:1; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">
                TECHNICAL DEPARTMENT
            </div>
        </th>
        
        ${isComplianceVisible ? '<th rowspan="2" style="white-space: normal; max-width: 100px; vertical-align:middle; border-bottom:1px solid var(--border2);">COMPANY PROCEDURES COMPLIANCE BONUS </th>' : ''}
        <th rowspan="2" style="white-space: normal; max-width: 100px; vertical-align:middle; border-bottom:1px solid var(--border2);">DRILL QUALITY BONUS</th>
        <th rowspan="2" style="vertical-align:middle; border-bottom:1px solid var(--border2);">FINAL RATIO</th>
        <th rowspan="2" style="vertical-align:middle; border-bottom:1px solid var(--border2);"></th>
    </tr>
    <tr>
        <th style="border-top:1px dashed var(--border); padding-top:8px;">MAİL FEEDBACK RATIO</th>
        <th style="border-top:1px dashed var(--border); padding-top:8px;">DAILY WORK REPORT RATIO</th>
        ${mode === 'haftalik' ? '' : '<th style="border-top:1px dashed var(--border); padding-top:8px;">MONTHLY REPORTS RATIO</th>'}
        <th style="border-top:1px dashed var(--border); padding-top:8px;">OVERDUE JOB BONUS</th>
        
        <th style="border-top:1px dashed var(--border); padding-top:8px;">WEEKLY REPORTS RATIO</th>
        ${mode === 'haftalik' ? '' : '<th style="border-top:1px dashed var(--border); padding-top:8px;">MONTHLY REPORTS RATIO</th>'}
    </tr>`;
    document.getElementById('tableHead').innerHTML = thH;

    let tbH = '';
    sortedShips.forEach((gemi, index) => {
        const currentRank = index + 1;
        const prevRank = previousRanks[gemi] || currentRank;
        let rankIcon = '';
        if (mode === 'alltime') {
            var arrowVal = (arrowMode === 'manual' && manualArrows[gemi]) ? manualArrows[gemi]
                : (currentRank < prevRank ? 'up' : currentRank > prevRank ? 'down' : 'same');
            if (arrowVal === 'up') rankIcon = `<span class="rank-up" title="Sıralama Yükseldi">▲</span>`;
            else if (arrowVal === 'down') rankIcon = `<span class="rank-down" title="Sıralama Düştü">▼</span>`;
            else rankIcon = `<span class="rank-same" title="Değişmedi">-</span>`;
        }
        
        // Operasyon Puanları
        const mailRate = Math.round(getShipMailRate(gemi));
        const dailyRate = Math.round(getShipDailyRateForMode(gemi, mode));
        const aylikRate = Math.round(getShipAylikRateForMode(gemi, mode));
        const overdueBonus = Math.round(getOverdueBonus(gemi, mode) * 10) / 10; 
        
        // Technical Puanları
        const techWeeklyRate = Math.round(getShipTechWeeklyRateForMode(gemi, mode));
        const techMonthlyRate = Math.round(getShipTechMonthlyRateForMode(gemi, mode));

        const finalRate = Math.round(getShipFinalRateForMode(gemi, mode));
        const compBonus = getComplianceBonus(gemi); 
        const drBonus = getDrillBonus(gemi);     
        
        let stat = 'bad'; let label = 'POOR';
        if (finalRate >= 70) { stat = 'ok'; label = 'EXCELLENT'; } 
        else if (finalRate >= 40) { stat = 'warn'; label = 'ACCEPTABLE'; } 

        let rankDisplay = `<span style="font-family:'DM Mono'; opacity:0.5">#${currentRank}</span>`;
        if(currentRank === 1) rankDisplay = `<div class="rank-badge rank-1">1</div>`;
        if(currentRank === 2) rankDisplay = `<div class="rank-badge rank-2">2</div>`;
        if(currentRank === 3) rankDisplay = `<div class="rank-badge rank-3">3</div>`;

        const gradMap = {
            ok:   'linear-gradient(135deg, #00f0b8, #00c8a0)',
            warn: 'linear-gradient(135deg, #e8b84b, #c07800)',
            bad:  'linear-gradient(135deg, #ff5a72, #cc0030)'
        };
        const badgeStyle = `background:${gradMap[stat]}; color:#000; border:none; font-weight:800;`;
        const subBadgeStyle = `background:rgba(255,255,255,0.05); color:var(--muted); border:1px solid rgba(255,255,255,0.1); font-weight:600;`;

        tbH += `<tr data-status="${stat}" data-gemi="${gemi}" data-rate="${finalRate}">
          <td>${rankDisplay}</td>
          <td class="ship-col" style="padding-left:1.5rem;">
            <span class="ship-tag" style="font-size:1rem;">${gemi}</span>${rankIcon}
          </td>
          
          <td><span class="rbadge" style="font-size:0.8rem; padding:4px 10px; ${subBadgeStyle}">%${mailRate}</span></td>
          <td><span class="rbadge" style="font-size:0.8rem; padding:4px 10px; ${subBadgeStyle}">%${dailyRate}</span></td>
          ${mode === 'haftalik' ? '' : `<td><span class="rbadge" style="font-size:0.8rem; padding:4px 10px; ${subBadgeStyle}">%${aylikRate}</span></td>`}
          <td>
            <span class="rbadge" style="font-size:0.8rem; padding:4px 10px;
              background:${overdueBonus >= 0 ? 'rgba(0,240,184,0.12)' : 'rgba(255,90,114,0.12)'};
              color:${overdueBonus >= 0 ? 'var(--ok)' : 'var(--bad)'};
              border:1px solid ${overdueBonus >= 0 ? 'rgba(0,240,184,0.3)' : 'rgba(255,90,114,0.3)'};
              font-weight:700;">${overdueBonus >= 0 ? '+' : ''}${overdueBonus}</span>
          </td>
          
          <td><span class="rbadge" style="font-size:0.8rem; padding:4px 10px; ${subBadgeStyle}">%${techWeeklyRate}</span></td>
          ${mode === 'haftalik' ? '' : `<td><span class="rbadge" style="font-size:0.8rem; padding:4px 10px; ${subBadgeStyle}">%${techMonthlyRate}</span></td>`}

          ${isComplianceVisible ? (() => {
            let compBg = 'rgba(255,255,255,0.03)';
            let compColor = 'var(--muted)';
            let compBorder = 'rgba(255,255,255,0.1)';
            let compText = compBonus === 0 ? '-' : (compBonus > 0 ? '+' + compBonus : compBonus);

            if (compBonus > 0) {
                compBg = 'rgba(0,240,184,0.12)';
                compColor = 'var(--ok)';
                compBorder = 'rgba(0,240,184,0.3)';
            } else if (compBonus < 0) {
                compBg = 'rgba(255,90,114,0.15)';
                compColor = 'var(--bad)';
                compBorder = 'rgba(255,90,114,0.4)';
            }

            return `<td style="text-align:center;">
                <span class="rbadge" style="font-size:0.85rem; padding:4px 10px; background:${compBg}; color:${compColor}; border:1px solid ${compBorder}; font-weight:700;">${compText}</span>
            </td>`;
        })() : ''}
          
          <td style="text-align:center;">
              <span class="rbadge" style="font-size:0.85rem; padding:4px 10px; background:${drBonus > 0 ? 'rgba(0,240,184,0.12)' : drBonus < 0 ? 'rgba(255,90,114,0.15)' : 'rgba(255,255,255,0.03)'}; color:${drBonus > 0 ? 'var(--ok)' : drBonus < 0 ? 'var(--bad)' : 'var(--muted)'}; border:1px solid ${drBonus > 0 ? 'rgba(0,240,184,0.3)' : drBonus < 0 ? 'rgba(255,90,114,0.4)' : 'rgba(255,255,255,0.1)'}; font-weight:700;">
                  ${drBonus > 0 ? '+' + drBonus : (drBonus === 0 ? '-' : drBonus)}
              </span>
          </td>

          <td>
            <span class="rbadge" style="font-size:0.85rem; padding:5px 14px; ${badgeStyle}">${finalRate}</span>
          </td>
          <td><span class="rbadge" style="font-size:0.7rem; padding:4px 10px; ${badgeStyle}">${label}</span></td>
        </tr>`;
    });
    document.getElementById('tableBody').innerHTML = tbH;
}
  
  
  
  function openAdmin() {
    const pass = prompt("Yönetici Şifresi:", "");
    if(pass === "admin123") {
      adminOpenedRanks = calculateCurrentRanks(filo);
      maillerModifiedThisSession = false; 
      
      document.getElementById('adminPanel').classList.add('open');
      renderAdminMailList();
      renderManualArrowTable();
      const gp = document.getElementById('adminGunlukPanel');
  if(gp) gp.style.display = 'block';
  
  const ap = document.getElementById('adminAylikPanel');
  if(ap) ap.style.display = 'block';

  const twp = document.getElementById('adminTechWeeklyPanel');
if(twp) twp.style.display = 'block';
const tmp = document.getElementById('adminTechMonthlyPanel');
if(tmp) tmp.style.display = 'block';

if(window.gnCurrentFriday) document.getElementById('adminTechWeeklyDate').value = window.gnCurrentFriday;
if(window.aylikCurrentMonth) document.getElementById('adminTechMonthlyDate').value = window.aylikCurrentMonth;
  
  const op = document.getElementById('adminOverduePanel');
  if(op) op.style.display = 'block';
  
  const dp = document.getElementById('adminDefectPanel');
  if(dp) dp.style.display = 'block';
  const cp = document.getElementById('adminCompliancePanel');
  const drillP = document.getElementById('adminDrillPanel');
if(drillP) drillP.style.display = 'block';
      if(cp) cp.style.display = 'block';
  
      if(window.gnCurrentFriday) document.getElementById('gnHaftaBaslangic').value = window.gnCurrentFriday;
      if(window.aylikCurrentMonth) document.getElementById('adminAylikMonth').value = window.aylikCurrentMonth;
      gnRenderAdminHafta();
  renderAdminAylik();
  renderAdminTechWeekly();
renderAdminTechMonthly();
  renderAdminOverdue();
  renderAdminDefect();
  renderAdminCompliance();
  renderAdminDrill();
  renderCommittedLists();

  // TEKNİK LİSTELERİ GETİRECEK OLAN YENİ SATIR:
  if(typeof renderTechCommittedLists !== 'undefined') renderTechCommittedLists();

  updateComplianceVisibilityUI();
        } else if(pass !== null) {
      alert("Hatalı şifre");
    }
  }
  
  function closeAdmin() {
    document.getElementById('adminPanel').classList.remove('open');
    if (maillerModifiedThisSession) previousRanks = adminOpenedRanks;
    
    saveData();
    gnSaveAll();
    buildSummary();
    if(currentView === 'gunluk') renderGunlukView();
    else if(currentView === 'aylik') renderAylikView();
    else if(currentView === 'overdue') renderOverdueView();
    else if(currentView === 'defect') renderDefectView();
    else buildTable();
    buildCharts();
  }
  
  function renderAdminMailList() {
    const list = document.getElementById('adminMailList');
    list.innerHTML = '';
    mailler.forEach((m, idx) => {
      const div = document.createElement('div');
      div.className = 'mail-list-item';
      if(idx === selectedMailIndex) div.classList.add('active');
      div.innerHTML = `<span><b>${m.konu}</b> <small>(${m.tarih})</small></span> <span style="font-size:0.7rem; color:var(--bad)" onclick="deleteMail(${idx}, event)">SİL 🗑️</span>`;
      div.onclick = (e) => {
        if(e.target.tagName !== 'SPAN' || !e.target.innerText.includes('SİL')) selectMailForEdit(idx);
      };
      list.appendChild(div);
    });
  }
  
  function addNewMail() {
    const sub = document.getElementById('newMailSubject').value.trim();
    const date = document.getElementById('newMailDate').value.trim();
    if(!sub || !date) { alert("Lütfen konu ve tarih giriniz."); return; }
    mailler.push({ id: Date.now(), konu: sub, tarih: date, yok: JSON.parse(JSON.stringify(filo)) });
    document.getElementById('newMailSubject').value = ''; document.getElementById('newMailDate').value = '';
    maillerModifiedThisSession = true; 
    saveData(); renderAdminMailList();
  }
  
  function deleteMail(idx, e) {
    e.stopPropagation();
    if(confirm("Bu mail kaydını silmek istediğinize emin misiniz?")) {
      mailler.splice(idx, 1);
      selectedMailIndex = -1;
      document.getElementById('editArea').style.opacity = '0.5';
      document.getElementById('editArea').style.pointerEvents = 'none';
      document.getElementById('editTitle').innerText = "Mail Seçiniz...";
      document.getElementById('shipCheckGrid').innerHTML = "";
      maillerModifiedThisSession = true; 
      saveData(); renderAdminMailList();
    }
  }
  
  function selectMailForEdit(idx) {
    selectedMailIndex = idx;
    const m = mailler[idx];
    document.getElementById('editTitle').innerText = `DÜZENLE: ${m.konu}`;
    document.getElementById('editArea').style.opacity = '1';
    document.getElementById('editArea').style.pointerEvents = 'auto';
    renderShipCheckboxes(idx); renderAdminMailList(); 
  }
  
  function renderShipCheckboxes(mailIdx) {
    const container = document.getElementById('shipCheckGrid');
    container.innerHTML = '';
    const m = mailler[mailIdx];
    if(!m.muaf) m.muaf =[];
    filo.forEach(ship => {
      const isMuaf      = m.muaf.includes(ship);
      const isResponded = !isMuaf && !m.yok.includes(ship);
      const div = document.createElement('div');
      if(isMuaf) {
        div.className = 'ship-check exempt';
        div.innerText = `⊘ ${ship}`;
      } else if(isResponded) {
        div.className = 'ship-check checked';
        div.innerText = `✓ ${ship}`;
      } else {
        div.className = 'ship-check';
        div.innerText = `✗ ${ship}`;
      }
      div.onclick = () => toggleShipResponse(mailIdx, ship);
      container.appendChild(div);
    });
  }
  
  function toggleShipResponse(mailIdx, ship) {
    const m = mailler[mailIdx];
    if(!m.muaf) m.muaf =[];
    const inYok  = m.yok.includes(ship);
    const inMuaf = m.muaf.includes(ship);
  
    if(!inYok && !inMuaf) {
      m.yok.push(ship);
    } else if(inYok && !inMuaf) {
      m.yok.splice(m.yok.indexOf(ship), 1);
      m.muaf.push(ship);
    } else {
      m.muaf.splice(m.muaf.indexOf(ship), 1);
    }
    maillerModifiedThisSession = true;
    saveData(); renderShipCheckboxes(mailIdx);
  }
  
  let sortDir = -1;
  function sortByRate() {
    if(currentView === 'ranking') return; 
    sortDir *= -1;
    document.getElementById('sortArrow').textContent = sortDir===1?'↑':'↓';
    
    const s = [...filo].sort((a,b) => {
        const diff = (gemiOrani(a)-gemiOrani(b))*sortDir;
        if(diff !== 0) return diff;
        return a.localeCompare(b);
    });
    buildTable(s);
  }
  
  function sortByMail(idx) {
    if(currentView === 'ranking') return;
    buildTable([...filo].sort((a,b) => (cevapVerdiMi(b,idx)?1:0)-(cevapVerdiMi(a,idx)?1:0)));
  }
  
  let activeFilter = 'all';
  function setFilter(f) {
    activeFilter = f;['All','Bad','Warn','Ok'].forEach(x => document.getElementById('btn'+x)?.classList.remove('active'));
    const map = {all:'btnAll',bad:'btnBad',warn:'btnWarn',ok:'btnOk'};
    document.getElementById(map[f])?.classList.add('active');
    applyFilters();
  }
  
  function applyFilters() { buildTable(); }
  
  function applyFiltersRows() {
    const q = document.getElementById('searchBox').value.toUpperCase().trim();
    let vis = 0;
    document.querySelectorAll('#tableBody tr').forEach(row => {
      const m = (q===''||row.dataset.gemi.includes(q)) && (activeFilter==='all'||row.dataset.status===activeFilter);
      row.classList.toggle('hidden-row', !m);
      if (m) vis++;
    });
    const rc = document.getElementById('resultCount');
    if(rc) rc.textContent = vis + ' gemi gösteriliyor';
  }
  
  function observeReveal() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold:0.08 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }
  
  // ══════════════════════════════════════════════════════
  //  GÜNLÜK İŞ RAPORU SİSTEMİ
  // ══════════════════════════════════════════════════════
  
  const GUNLER =['Friday','Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'];
  const GN_KEY = 'gnRaporlar_v1';
  function gnLoad() { 
      try { 
          return JSON.parse(localStorage.getItem('gnRaporlar_v1') || '{}'); 
      } catch(e) { 
          return {}; 
      } 
  }
  function gnGetHaftaGunleri(dateStr) {
    const parts = dateStr.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const d = parseInt(parts[2]);
    
    return Array.from({length:7}, (_,i) => {
      const dateObj = new Date(y, m, d + i);
      const yy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    });
  }
  
  function gnFmtDate(isoStr) { const[y,m,d] = isoStr.split('-'); return d+'.'+m; }
  
  function renderGunlukView() {
    const gunler = gnGetHaftaGunleri(window.gnCurrentFriday);
    const data = gnLoad();
  
    document.getElementById('gnWeekLabel').textContent = gnFmtDate(gunler[0]) + ' — ' + gnFmtDate(gunler[6]) + '.' + gunler[6].split('-')[0];
  
    let head = `<tr><th class="ship-th" style="min-width:100px;">VESSEL</th>`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    gunler.forEach((g, i) => {
      const isToday = g === todayStr;
      head += `<th style="text-align:center;${isToday?'color:var(--teal);':''}">
        <span style="display:block;font-family:'Outfit';font-weight:700;font-size:0.72rem;${isToday?'color:var(--teal);':''}">${GUNLER[i]}</span>
        <span style="font-size:0.6rem;color:var(--muted);">${gnFmtDate(g)}</span>
      </th>`;
    });
    head += `<th style="text-align:center;min-width:120px;">WEEKLY RATIO</th></tr>`;
  
    let body = '';
    filo.forEach(ship => {
      let cells = ''; let count = 0;
      gunler.forEach((g, idx) => {
        // Sunday (idx=2) için özel işlem
        if (idx === 2) {
          cells += `<td style="text-align:center;"><span style="color:var(--muted);font-size:0.9rem;">—</span></td>`;
          return; // Sunday'i sayma
        }
        
        const reported = data[g] && data[g][ship] === true;
        if (reported) count++;
        cells += reported
          ? `<td style="text-align:center;"><span style="color:var(--ok);font-size:1.1rem;text-shadow:0 0 8px rgba(0,240,184,0.5)">✓</span></td>`
          : `<td style="text-align:center;"><span style="color:rgba(255,90,114,0.35);font-size:1rem;">✗</span></td>`;
      });
      const oran = Math.round(count / 6 * 100);  // 7 yerine 6
      const statCls = oran >= 80 ? 'ok' : oran >= 40 ? 'warn' : 'bad';
      body += `<tr data-gemi="${ship}" data-status="${statCls}">
        <td class="ship-col"><span class="ship-tag">${ship}</span></td>
        ${cells}
        <td>
          <div class="rate-pill rate-${statCls}" style="justify-content:center;gap:6px;">
            <div class="mini-bg" style="flex:1;"><div class="mini-fill" style="width:${oran}%"></div></div>
            <span class="rate-num">${count}/6</span>
          </div>
        </td>
      </tr>`;
    });
  
    document.getElementById('tableHead').innerHTML = head;
    document.getElementById('tableBody').innerHTML = body;
  
    const rc = document.getElementById('resultCount');
    if(rc) rc.textContent = '';
  }
  
  function gnRenderAdminHafta() {
    const dateVal = document.getElementById('gnHaftaBaslangic').value;
    if (!dateVal) return;
    
    const parts = dateVal.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    
    if(d.getDay() !== 5) {
        const diff = -((d.getDay() + 2) % 7);
        d.setDate(d.getDate() + diff);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const corr = `${yyyy}-${mm}-${dd}`;
        document.getElementById('gnHaftaBaslangic').value = corr;
        window.gnCurrentFriday = corr;
    } else {
        window.gnCurrentFriday = dateVal;
    }
  
    const gunler = gnGetHaftaGunleri(window.gnCurrentFriday);
    const data = gnLoad();
    const container = document.getElementById('gnAdminTable');
  
    let head = `<tr style="border-bottom:1px solid var(--border2);"><th style="text-align:left;padding:0.6rem 1rem;font-family:'DM Mono';font-size:0.6rem;color:var(--muted);letter-spacing:0.1em;">VESSEL</th>`;
    gunler.forEach((g, i) => {
      head += `<th style="text-align:center;padding:0.6rem 0.5rem;font-family:'DM Mono';font-size:0.6rem;color:var(--muted);letter-spacing:0.08em;">${GUNLER[i]}<br><span style="color:var(--teal);font-size:0.65rem;">${gnFmtDate(g)}</span></th>`;
    });
    head += '</tr>';
  
    let body = '';
    filo.forEach(ship => {
      let cells = '';
      gunler.forEach((g, idx) => {
        // Sunday (idx=2) için tatil gösterimi
        if (idx === 2) {
          cells += `<td style="text-align:center;padding:0.4rem 0.5rem;"><div style="display:inline-block;width:70px;padding:0.35rem 0.5rem;font-size:0.7rem;color:var(--muted);background:rgba(150,210,200,0.05);border:1px solid rgba(150,210,200,0.1);border-radius:6px;">🌴 TATİL</div></td>`;
          return;
        }
        
        const checked = data[g] && data[g][ship] === true;
        cells += `<td style="text-align:center;padding:0.4rem 0.5rem;"><div class="ship-check ${checked?'checked':''}" style="display:inline-block;width:70px;padding:0.35rem 0.5rem;font-size:0.7rem;" onclick="gnToggle('${g}','${ship}',this)">${checked ? '✓ RAPORLADI' : '✗ YOK'}</div></td>`;
      });
      body += `<tr style="border-bottom:1px solid rgba(0,216,200,0.06);"><td style="padding:0.5rem 1rem;font-family:'DM Mono';font-size:0.8rem;font-weight:500;color:var(--text);">${ship}</td>${cells}</tr>`;
    });
  
    container.innerHTML = `<table style="width:100%;border-collapse:collapse;min-width:700px;"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }
  function gnToggle(dateStr, ship, el) {
    const data = gnLoad();
    if (!data[dateStr]) data[dateStr] = {};
    const cur = data[dateStr][ship] === true;
    data[dateStr][ship] = !cur;
    
    gnSave(data);
    
    el.className = `ship-check ${!cur ? 'checked' : ''}`;
    el.textContent = !cur ? '✓ RAPORLADI' : '✗ YOK';
    if(currentView === 'gunluk') renderGunlukView();
  }
  function gnHaftaKaydet() { 
      saveData(); 
      alert('✓ Hafta durumu ve raporlar tüm kullanıcılara kaydedildi.'); 
  }
  function gnSaveAll() {}
  function perfLoadData(){ 
    try { 
      var data = JSON.parse(localStorage.getItem(PERF_KEY)||'[]'); 
  // ...
   data.forEach(function(p){
        if(!p.rightshipRecords) p.rightshipRecords = [];
      });   
      // OTOMATİK DÜZELTME: Hafızada kalmış hatalı verileri (veya yanlışlıkla gemi adına "tatilde" yazılmışları) bulup onarır.
      var changed = false;
      data.forEach(function(p){
        if (p.status !== 'tatil' && p.vessel && p.vessel.toLowerCase().includes('tatil')) {
           p.status = 'tatil'; // Statüsünü zorla tatil yapar
           p.vessel = '';      // Hayali tatil gemisini siler
           p.startDate = '';
           changed = true;
        }
      });
      
      // Eğer bozuk veri düzeltildiyse, temiz halini hemen hafızaya geri yazar
      if (changed) {
         localStorage.setItem(PERF_KEY, JSON.stringify(data));
      }
      
      return data; 
    } catch(e) { 
      return []; 
    } 
  }
  function perfSaveData(d){ 
    localStorage.setItem(PERF_KEY, JSON.stringify(d)); 
    saveData(); // YENİ EKLENDİ: Yapılan değişikliği anında Google Sheets'e yollar
  }
  function fetchDefectFromSheets() {
    const btn = (window.event && window.event.target) ? window.event.target : null;
    if (btn) {
        btn.textContent = '⏳ Google JSONP ile Çekiliyor...';
        btn.disabled = true;
    }

    window.handleGoogleData = function(data) {
        try {
            let newDefectData = {};
            const rows = data.table.rows;
            
            for (let i = rows.length - 1; i >= 0; i--) {
                const rowCells = rows[i].c;
                if (!rowCells || rowCells.length < 3) continue;
                
                const vesselCell = rowCells[0]; 
                const dateCell = rowCells[1];   
                const defectCell = rowCells[2]; 
                
                if (!vesselCell || !vesselCell.v) continue;
                
                let vessel = String(vesselCell.v).trim().toUpperCase();
                
                if (vessel && filo.includes(vessel) && !newDefectData[vessel]) {
                    let dateVal = dateCell ? (dateCell.f || String(dateCell.v)) : "";
                    let defectStr = (defectCell && defectCell.v) ? String(defectCell.v).trim() : "";
                    
                    if (defectStr && defectStr.toLowerCase() !== "defect items" && defectStr !== "") {
                        let countMatch = defectStr.match(/\d+/);
                        let count = countMatch ? parseInt(countMatch[0], 10) : 0;
                        let finalDate = (dateVal.toLowerCase() === "dd.mm.yyyy" || dateVal === "null") ? "" : dateVal;
                        
                       let oldD = defectData[vessel] || {};
                        // Eğer sayı değiştiyse eski sayıyı prevCount olarak kaydet, değişmediyse eskisini koru
                        let prevC = oldD.prevCount !== undefined ? oldD.prevCount : count;
                        if (oldD.count !== undefined && oldD.count !== count) {
                            prevC = oldD.count;
                        }
                        
                        newDefectData[vessel] = {
                            count: count,
                            prevCount: prevC,
                            date: finalDate,
                            note: oldD.note || "" 
                        }; 
                    }
                }
            }
            
            Object.keys(newDefectData).forEach(ship => {
                defectData[ship] = newDefectData[ship];
            });
            
            localStorage.setItem('defectData_v1', JSON.stringify(defectData));
            saveData(); 
            renderAdminDefect();
            
            alert('✅ Engeller Aşıldı! Defect verileri başarıyla aktarıldı ve buluta kaydedildi.');

        } catch (e) {
            console.error("İşleme Hatası:", e);
            alert('❌ Veri işlenirken bir hata oluştu: ' + e.message);
        } finally {
            temizleVeKapat();
        }
    };

    function temizleVeKapat() {
        if (btn) {
            btn.textContent = '🔄 Google Sheets\'ten Çek';
            btn.disabled = false;
        }
        const scriptEl = document.getElementById('jsonp-google-script');
        if (scriptEl) scriptEl.remove(); 
        delete window.handleGoogleData;
    }

    const script = document.createElement('script');
    script.id = 'jsonp-google-script';
    
    script.onerror = function() {
        alert('❌ Google sunucularına bağlantı şirket ağınız tarafından kesildi.');
        temizleVeKapat();
    };

    script.src = 'https://docs.google.com/spreadsheets/d/1oLcBbVnThXYMwJ0-WCpZg6vtw05-WJBEIDh-TJFxo1w/gviz/tq?tqx=out:json;responseHandler:handleGoogleData&gid=372820641';
    
    document.head.appendChild(script);
}
let backupFileHandle; // BÜTÜN SORUNU ÇÖZECEK OLAN SATIR BU
async function backupToLocalJSON() {
    try {
        const backupData = {
            yedeklemeTarihi: new Date().toLocaleString('tr-TR'),
            filo: filo,
            mailler: mailler,
            overdue: overdueJobs,
            defect: defectData,
            gunluk: JSON.parse(localStorage.getItem('gnRaporlar_v1') || '{}'),
            aylik: aylikData,
            personel: JSON.parse(localStorage.getItem('spark_personel_v1') || '[]'),
            previousRanks: previousRanks,
            fleetHistory: fleetHistory,
            shipRankingHistory: shipRankingHistory,
            inspectorHistory: inspectorHistory,
bagimsizPscRecords: bagimsizPscRecords,
            overdueHistory: overdueHistory,
            overdueSnapshots: overdueSnapshots,
            committedWeeks: {
                haftalik: window.committedWeeks_haftalik || [],
                aylik: window.committedWeeks_aylik || [],
                alltime: window.committedWeeks_alltime || []
            },
            committedMonths: {
                haftalik: window.committedMonths_haftalik || [],
                aylik: window.committedMonths_aylik || [],
                alltime: window.committedMonths_alltime || []
            }
        };

        const jsonString = JSON.stringify(backupData, null, 2);

        if (!backupFileHandle) {
            backupFileHandle = await window.showSaveFilePicker({
                suggestedName: 'spark_filo_backup.json',
                types: [{
                    description: 'JSON Dosyası',
                    accept: {'application/json': ['.json']},
                }],
            });
        }

        const writable = await backupFileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        // Buton efektleri (SYNC OK!)
        const btnText = document.getElementById('backupBtnText');
        const btnIcon = document.getElementById('backupBtnIcon');
        const btn = document.getElementById('btnLocalBackup');
        
        if(btnText && btn) {
            const originalText = btnText.innerHTML;
            btnText.innerHTML = 'SYNC OK!';
            btn.style.color = 'var(--ok)';
            btn.style.borderColor = 'var(--ok)';
            btn.style.background = 'rgba(0, 240, 184, 0.1)';
            if(btnIcon) btnIcon.style.display = 'none'; 
            
            setTimeout(() => {
                btnText.innerHTML = originalText;
                btn.style.color = '';
                btn.style.borderColor = '';
                btn.style.background = '';
                if(btnIcon) btnIcon.style.display = 'block';
            }, 2000);
        }

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Yedekleme sırasında hata:", error);
            alert("Yedekleme başarısız oldu: " + error.message);
        }
    }
}
function processRemarksWithAI(remarksArray, saveCallback) {
    if(!remarksArray || remarksArray.length === 0) {
        saveCallback(remarksArray); 
        return;
    }

    pendingRemarksForAi = JSON.parse(JSON.stringify(remarksArray)); 
    pendingSaveCallback = saveCallback;

    document.getElementById('aiReviewState').style.display = 'none';
    document.getElementById('aiReviewFooter').style.display = 'none';
    document.getElementById('aiLoadingState').style.display = 'block';
    document.getElementById('aiCategoryOverlay').style.display = 'flex';

    let textList = pendingRemarksForAi.map((r, i) => (i+1) + ". " + r.desc).join("\n");
    
    // Prompt (Komut) çok daha katı hale getirildi
    let prompt = `Sen bir denizcilik PSC (Port State Control) uzmanısın. 
Aşağıdaki remark (eksiklik) listesini oku ve her bir madde için aşağıdaki kategorilerden EN UYGUN OLANINI seç.
Seçtiğin kategoriler, aşağıdaki listedeki isimlerle BİREBİR AYNI olmalıdır (başındaki numaralar dahil).

Kategoriler:
${IMO_CATEGORIES.join("\n")}

Remarklar:
${textList}

SADECE geçerli bir JSON array (dizisi) döndür. Asla başka bir açıklama metni ekleme.
Örnek format: ["07 - Fire Safety", "10 - Safety of Navigation"]`;

    // fetch isteğine generationConfig eklenerek yapay zeka JSON formatına zorlandı
  fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                responseMimeType: "application/json" 
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        // --- YENİ EKLENEN HATA KONTROLÜ ---
        if (data.error) {
            alert("Google API Hatası: " + data.error.message);
            throw new Error(data.error.message);
        }
        // ------------------------------------

        let aiResponse = data.candidates[0].content.parts[0].text;
        let categories = [];
        try {
            categories = JSON.parse(aiResponse);
        } catch(e) {
            console.error("JSON Çevirme Hatası:", e, aiResponse);
            categories = pendingRemarksForAi.map(r => "99 - Other");
        }
        buildAiReviewTable(categories);
    })
    .catch(err => {
        console.error("AI Bağlantı/Cevap Hatası:", err);
        let fallbacks = pendingRemarksForAi.map(r => "99 - Other");
        buildAiReviewTable(fallbacks);
       });
}