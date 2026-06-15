const API_URL = "https://spark-filo-panel-default-rtdb.europe-west1.firebasedatabase.app/.json";
const PERF_KEY = 'spark_personel_v1';
const defaultFilo = ["ARES","BEAM","CANAL","COMET","DALI","DODO","EMINE","IDON","DREAM","FAUN","FLAT","GIFT","JUST","KRONOS","APRIL","LAKER","ZEYNEP"];
const defaultMailler =[
  { id:1, konu:"FLM DE-RUSTING", tarih:"31.10.2025", yok:["CANAL","FAUN","FLAT"],                                                                                muaf:[] },
  { id:2, konu:"AUS LADDER",     tarih:"25.11.2025", yok:["DODO","FAUN","GIFT"],                                                                                  muaf:[] },
  { id:3, konu:"AMBAR SİNTİNE",  tarih:"24.11.2025", yok:["APRIL","CANAL","DODO","DREAM","FAUN","FLAT","GIFT","IDON","KRONOS"],                                   muaf:[] },
  { id:4, konu:"FIRE DOOR",      tarih:"25.12.2025", yok:["APRIL","ARES","DALI","DODO","DREAM","FAUN","GIFT","IDON","LAKER"],                                     muaf:[] },
  { id:5, konu:"AIR COMPRESSOR", tarih:"12.01.2026", yok:["APRIL","COMET","DREAM","FAUN","FLAT","GIFT","IDON","LAKER"],                                           muaf:[] },
  { id:6, konu:"PSC NON CONF.",  tarih:"01.11.2025", yok:["APRIL","DALI","FLAT"],                                                                                 muaf:[] }
];

const AYLIK_ITEMS_OLD = ["General Condition Photos", "MLC Status", "Critical Item Videos", "Lubrication - Greasing Report", "Provision Stock List"];
const AYLIK_ITEMS_NEW = ["General Condition Photos", "MLC Status", "Critical Item Videos", "Lubrication - Greasing Report", "Provision Stock List", "Drıll Vıdeos"];
function getAylikItems(monthStr) {
    if (!monthStr) return AYLIK_ITEMS_OLD;
    // YYYY-MM formatında kontrol eder (2026-03 ve sonrası için yeni listeyi, öncesi için eski listeyi verir)
    return (monthStr >= "2026-03") ? AYLIK_ITEMS_NEW : AYLIK_ITEMS_OLD;
}
let filo = [];
let inspectorMapping = {
    "OKTAY KARAN": ["COMET", "DREAM", "FAUN", "JUST", "CANAL","EMINE"],
    "ERDEM GÜR": ["DODO", "FLAT", "GIFT", "IDON", "LAKER"],
    "ONUR BENZET": ["APRIL", "ARES", "BEAM", "DALI", "KRONOS", "ZEYNEP"]
};
const PSC_MOU_MAP = {
  'Paris MoU': ['France','Germany','Netherlands','Belgium','Denmark','Sweden','Norway','Finland','Spain','Portugal','United Kingdom','Italy','Greece','Poland','Latvia','Lithuania','Estonia','Croatia','Slovenia','Cyprus','Malta','Ireland','Iceland','Canada'],
  'Tokyo MoU': ['China','Hong Kong','Japan','South Korea','North Korea','Australia','New Zealand','Singapore','Philippines','Indonesia','Vietnam','Thailand','Malaysia','Papua New Guinea','Vanuatu','Fiji'],
  'Indian Ocean MoU': ['India','Pakistan','South Africa','Mauritius','Maldives','Kenya','Tanzania','Mozambique','Madagascar','Oman','Seychelles','Iran','Yemen','Ethiopia','Eritrea','Djibouti','Somalia','Sri Lanka','Bangladesh','Myanmar'],
  'Black Sea MoU': ['Ukraine','Georgia','Romania','Bulgaria','Russia'],
  'Mediterranean MoU': ['Algeria','Egypt','Israel','Jordan','Lebanon','Libya','Morocco','Syria','Tunisia','Turkey','Albania'],
  'Riyadh MoU': ['Saudi Arabia','UAE','Bahrain','Kuwait','Qatar','Iraq'],
  'Abuja MoU': ['Nigeria','Ghana','Ivory Coast','Cameroon','Senegal','Benin','Togo','Guinea','Sierra Leone','Liberia','Gabon','Equatorial Guinea','Namibia','Angola','Congo','Gambia','Mauritania'],
  'Vina del Mar': ['Argentina','Brazil','Chile','Colombia','Cuba','Ecuador','Mexico','Panama','Peru','Trinidad and Tobago','Uruguay','Venezuela','Bolivia','Honduras','Guatemala','Nicaragua'],
  'Caribbean MoU': ['Jamaica','Barbados','Dominican Republic','Haiti','Belize','Suriname','Bahamas','Cayman Islands','Antigua and Barbuda','St. Kitts and Nevis','St. Lucia','St. Vincent and the Grenadines'],
  'USCG': ['United States', 'USA']
};
  var PSC_TIERS={
    tier1:{coeff:1.50,countries:['AUSTRALIA','UNITED STATES','USA','UNITED KINGDOM','UK','NETHERLANDS','FRANCE','GERMANY','NORWAY','SWEDEN','DENMARK','FINLAND','JAPAN','CANADA','NEW ZEALAND']},
    tier2:{coeff:1.35,countries:['BELGIUM','SPAIN','ITALY','PORTUGAL','GREECE','IRELAND','ICELAND','POLAND','ESTONIA','LATVIA','LITHUANIA','SLOVENIA','CROATIA','MALTA','CYPRUS','SOUTH KOREA','SINGAPORE','HONG KONG','CHINA','CHILE','SOUTH AFRICA']},
    tier3:{coeff:1.00,countries:['INDONESIA','MALAYSIA','PHILIPPINES','THAILAND','VIETNAM','RUSSIA','PANAMA','MEXICO','PERU','ARGENTINA','BRAZIL','COLOMBIA','URUGUAY','ECUADOR','INDIA','SRI LANKA','BANGLADESH','PAKISTAN','OMAN','IRAN','MOZAMBIQUE','TANZANIA','KENYA','MADAGASCAR','MAURITIUS','MALDIVES','SEYCHELLES','TURKEY','BULGARIA','ROMANIA','GEORGIA','UKRAINE','AZERBAIJAN','MOROCCO','ALGERIA','TUNISIA','LIBYA','EGYPT','ISRAEL','LEBANON','SYRIA','ALBANIA','SAUDI ARABIA','UAE','QATAR','KUWAIT','BAHRAIN','IRAQ','JORDAN','YEMEN']},
    tier4:{coeff:0.70,countries:['JAMAICA','TRINIDAD AND TOBAGO','BARBADOS','CUBA','DOMINICAN REPUBLIC','HAITI','BELIZE','SURINAME','GHANA','NIGERIA','CAMEROON','SENEGAL','IVORY COAST','TOGO','BENIN','CONGO','ANGOLA','GABON','EQUATORIAL GUINEA']},
    tier5:{coeff:0.40,countries:['LIBERIA','SIERRA LEONE','GUINEA','GAMBIA','MAURITANIA','SOMALIA','ERITREA','DJIBOUTI','MYANMAR','NORTH KOREA','VENEZUELA','HONDURAS','GUATEMALA','NICARAGUA']}
  };
  var COUNTRY_CODES={
    'AUSTRALIA':'au','UNITED STATES':'us','USA':'us','UNITED KINGDOM':'gb','UK':'gb',
    'NETHERLANDS':'nl','FRANCE':'fr','GERMANY':'de','NORWAY':'no','SWEDEN':'se',
    'DENMARK':'dk','FINLAND':'fi','JAPAN':'jp','CANADA':'ca','NEW ZEALAND':'nz',
    'BELGIUM':'be','SPAIN':'es','ITALY':'it','PORTUGAL':'pt','GREECE':'gr',
    'IRELAND':'ie','ICELAND':'is','POLAND':'pl','ESTONIA':'ee','LATVIA':'lv',
    'LITHUANIA':'lt','SLOVENIA':'si','CROATIA':'hr','MALTA':'mt','CYPRUS':'cy',
    'SOUTH KOREA':'kr','SINGAPORE':'sg','HONG KONG':'hk','CHINA':'cn','CHILE':'cl',
    'SOUTH AFRICA':'za','INDONESIA':'id','MALAYSIA':'my','PHILIPPINES':'ph',
    'THAILAND':'th','VIETNAM':'vn','RUSSIA':'ru','PANAMA':'pa','MEXICO':'mx',
    'PERU':'pe','ARGENTINA':'ar','BRAZIL':'br','COLOMBIA':'co','URUGUAY':'uy',
    'ECUADOR':'ec','INDIA':'in','SRI LANKA':'lk','BANGLADESH':'bd','PAKISTAN':'pk',
    'OMAN':'om','IRAN':'ir','MOZAMBIQUE':'mz','TANZANIA':'tz','KENYA':'ke',
    'MADAGASCAR':'mg','MAURITIUS':'mu','MALDIVES':'mv','SEYCHELLES':'sc',
    'TURKEY':'tr','BULGARIA':'bg','ROMANIA':'ro','GEORGIA':'ge','UKRAINE':'ua',
    'AZERBAIJAN':'az','MOROCCO':'ma','ALGERIA':'dz','TUNISIA':'tn','LIBYA':'ly',
    'EGYPT':'eg','ISRAEL':'il','LEBANON':'lb','SYRIA':'sy','ALBANIA':'al',
    'SAUDI ARABIA':'sa','UAE':'ae','QATAR':'qa','KUWAIT':'kw','BAHRAIN':'bh',
    'IRAQ':'iq','JORDAN':'jo','YEMEN':'ye','JAMAICA':'jm',
    'TRINIDAD AND TOBAGO':'tt','BARBADOS':'bb','CUBA':'cu','DOMINICAN REPUBLIC':'do',
    'HAITI':'ht','BELIZE':'bz','SURINAME':'sr','GHANA':'gh','NIGERIA':'ng',
    'CAMEROON':'cm','SENEGAL':'sn','IVORY COAST':'ci','TOGO':'tg','BENIN':'bj',
    'CONGO':'cg','ANGOLA':'ao','GABON':'ga','EQUATORIAL GUINEA':'gq',
    'LIBERIA':'lr','SIERRA LEONE':'sl','GUINEA':'gn','GAMBIA':'gm',
    'MAURITANIA':'mr','SOMALIA':'so','ERITREA':'er','DJIBOUTI':'dj',
    'MYANMAR':'mm','NORTH KOREA':'kp','VENEZUELA':'ve','HONDURAS':'hn',
    'GUATEMALA':'gt','NICARAGUA':'ni'
  };
  var VESSEL_BUILD_YEARS = {
    "APRIL": 2007, "ARES": 2005, "BEAM": 2011, "CANAL": 2012,"EMINE": 2026,
    "DALI": 2005, "DODO": 2006, "DREAM": 2012, "FAUN": 2015,
    "FLAT": 2016, "GIFT": 2012, "IDON": 2009, "JUST": 2011,
    "KRONOS": 2012, "LAKER": 2011, "ZEYNEP": 2025
  };
  const GEMINI_API_KEY = "AQ.Ab8RN6IIPEk2JK6BGci3jB0b11LUHWCWq85dBZE3AF3_fr5f3A";

const IMO_CATEGORIES = [
    "01 - Certificates & Documentation",
    "02 - Structural Conditions",
    "03 - Water/Weathertight Conditions",
    "04 - Emergency Systems",
    "07 - Fire Safety",
    "09 - Working and Living Conditions",
    "10 - Safety of Navigation",
    "11 - Life Saving Appliances",
    "13 - Propulsion and Auxiliary Machinery",
    "14 - Pollution Prevention (MARPOL)",
    "15 - ISM",
    "99 - Other"
];
const MOU_THRESHOLDS = {
  "Paris MoU":         { HIGH: 3,  STANDARD: 7,  LOW: 18 },
  "Tokyo MoU":         { HIGH: 3,  STANDARD: 6,  LOW: 12 },
  "USCG":              { HIGH: 2,  STANDARD: 6,  LOW: 12 },
  "Black Sea MoU":     { HIGH: 3,  STANDARD: 6,  LOW: 12 },
  "Mediterranean MoU": { HIGH: 3,  STANDARD: 6,  LOW: 12 },
  "Indian Ocean MoU":  { HIGH: 3,  STANDARD: 6,  LOW: 12 },
  "Riyadh MoU":        { HIGH: 6,  STANDARD: 9,  LOW: 12 },
  "Abuja MoU":         { HIGH: 6,  STANDARD: 9,  LOW: 12 },
  "Vina del Mar":      { HIGH: 6,  STANDARD: 9,  LOW: 12 },
  "Caribbean MoU":     { HIGH: 6,  STANDARD: 9,  LOW: 12 }
};
function normalizeName(name) {
  if (!name) return '';
  return name.trim().toUpperCase()
      .replace(/Ç/g,'C').replace(/Ğ/g,'G').replace(/İ/g,'I')
      .replace(/Ö/g,'O').replace(/Ş/g,'S').replace(/Ü/g,'U')
      .replace(/ç/g,'C').replace(/ğ/g,'G').replace(/ı/g,'I')
      .replace(/ö/g,'O').replace(/ş/g,'S').replace(/ü/g,'U')
      .replace(/\s+/g,' ').trim();
}