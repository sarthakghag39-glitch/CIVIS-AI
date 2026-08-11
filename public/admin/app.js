// CIVIS AI Smart City Platform - Interactivity & State Management
// This script runs globally on all pages and implements state sync using Supabase PostgreSQL.

// --- Theme Persistent Handler (Applies dark mode immediately on page load) ---
(function() {
  const isDarkMode = localStorage.getItem('civis_dark_mode') === 'true';
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

// --- 1. Shared Database Initialization ---
const SUPABASE_URL = 'https://dppdyknjrryoljzzdulj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DoV52AE_kw3GIMhY50tXTA_vUAgbAmm';

// Use window.supabase (provided by CDN) to create the client, named supabaseClient to avoid naming conflicts
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth Session Guard (Blocks unauthorized access immediately) ---
const currentPath = window.location.pathname;
const isLoginPage = currentPath.includes('login');

async function checkAuthSession() {
  const localUser = sessionStorage.getItem('civis_user');
  if (localUser) {
    return JSON.parse(localUser);
  }
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      const userObj = { 
        email: session.user.email, 
        name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        phone: session.user.user_metadata?.phone || '+91 98765 43210'
      };
      sessionStorage.setItem('civis_user', JSON.stringify(userObj));
      return userObj;
    }
  } catch (e) {
    console.warn("Supabase getSession failed:", e);
  }
  return null;
}

checkAuthSession().then(user => {
  if (!user && !isLoginPage) {
    window.location.href = '/login.html';
  } else if (user && isLoginPage) {
    if (isAdminUser()) {
      window.location.href = '/admin_dashboard.html';
    } else {
      window.location.href = '/index.html';
    }
  }
});

let cachedIssues = [];

// --- 1b. Localization (English, Hindi, Marathi) ---
const translations = {
  en: {
    "civis_ai": "CIVIS AI",
    "home": "Home",
    "map": "Map",
    "scan": "Scan",
    "alerts": "Alerts",
    "profile": "Profile",
    "welcome_back": "Welcome back,",
    "good_morning": "Good Morning,",
    "ai_scan": "AI Scan",
    "ai_scan_desc": "Identify & report urban issues instantly using your camera.",
    "start_scanning": "Start Scanning",
    "today": "Today",
    "new_reports": "New Reports",
    "efficiency": "Efficiency",
    "resolved": "Resolved",
    "live_system_alert": "Live System Alert",
    "critical_issue_in": "Critical Issue in Kothrud, Pune",
    "water_leak_detected": "Water leak detected 5 mins ago",
    "view": "View",
    "quick_actions": "Quick Actions",
    "report_issue": "Report Issue",
    "live_map": "Live Map",
    "my_complaints_menu": "My Complaints",
    "emergency": "Emergency",
    "nearby_alerts": "Nearby Alerts",
    "see_all": "See all",
    "my_complaints_title": "My Complaints",
    "search_reports_placeholder": "Search your reports...",
    "all_issues": "All Issues",
    "in_progress": "In Progress",
    "critical": "Critical",
    "resolved_filter": "Resolved",
    "filter": "Filter",
    "no_reports_found": "No reports found",
    "citizen_dashboard_clear": "Your citizen dashboard is clear. Use the '+' button to report a new issue.",
    "trust_score": "Trust Score:",
    "reports_sent": "Reports Sent",
    "resolved_stat": "Resolved",
    "achievements": "Achievements",
    "view_all": "View All",
    "top_reporter": "Top Reporter",
    "gold_tier": "Gold Tier",
    "road_guardian": "Road Guardian",
    "master_badge": "Master Badge",
    "edit_profile": "Edit Profile",
    "language": "Language",
    "dark_mode": "Dark Mode",
    "notification_settings": "Notification Settings",
    "logout": "Logout",
    "live_smart_map": "Live Smart Map",
    "potholes": "Potholes",
    "garbage": "Garbage",
    "streetlights": "Streetlights",
    "water_leakage": "Water Leakage",
    "road_damage": "Road Damage",
    "ai_insights": "CIVIS AI Insights",
    "critical_immediate": "Critical (Immediate Action)",
    "moderate_queued": "Moderate (Queued)",
    "resolved_past_24h": "Resolved (Past 24h)",
    "your_reported_complaints": "Your Reported Complaints",
    "report_urban_issue": "Report Urban Issue",
    "issue_title": "Issue Title",
    "category": "Category",
    "location": "Location (Neighborhood)",
    "description": "Description",
    "submit_report": "Submit Report",
    "ai_scan_active": "AI Scan Active",
    "upload_image_instead": "Upload Image Instead",
    "capture_and_analyze": "Capture and Analyze",
    "align_issue_prompt": "Align the issue inside the frame and click 'Capture and Analyze'.",
    "emergency_services": "Emergency Services",
    "your_current_location": "Your Current Location",
    "gps_active": "GPS Active",
    "report_accident": "Report Accident",
    "vehicle_collisions": "Vehicle collisions & traffic incidents",
    "fire_emergency": "Fire Emergency",
    "active_fire_detected": "Active fire or smoke detected",
    "medical_assistance": "Medical Assistance",
    "injuries_health_crises": "Injuries or health crises",
    "flood_warning": "Flood Warning",
    "severe_water_rising": "Severe water rising or leaks",
    "fallen_tree": "Fallen Tree",
    "road_blockages_hazards": "Road blockages & hazards",
    "other_hazard": "Other Hazard",
    "general_safety_reporting": "General safety reporting",
    "active_local_alerts": "Active Local Alerts",
    "direct_support": "Direct Support",
    "speak_directly_dispatch": "Speak directly with emergency dispatch services via secure AI link.",
    "national_emergency": "National Emergency",
    "ai_insights_title": "AI Insights",
    "ai_confidence": "AI Confidence",
    "severity_level": "Severity Level",
    "detected_location": "Detected Location (Click to Edit)",
    "device_metadata": "Device Metadata",
    "sensors": "SENSORS",
    "active_lidar": "Active LiDAR",
    "submit_complaint": "Submit Complaint",
    "retake": "Retake"
  },
  hi: {
    "civis_ai": "सिविस एआई",
    "home": "होम",
    "map": "नक्शा",
    "scan": "स्कैन",
    "alerts": "अलर्ट",
    "profile": "प्रोफ़ाइल",
    "welcome_back": "स्वागत है,",
    "good_morning": "शुभ प्रभात,",
    "ai_scan": "एआई स्कैन",
    "ai_scan_desc": "कैमरे का उपयोग करके शहरी समस्याओं की तुरंत पहचान और रिपोर्ट करें।",
    "start_scanning": "स्कैनिंग शुरू करें",
    "today": "आज",
    "new_reports": "नई रिपोर्टें",
    "efficiency": "दक्षता",
    "resolved": "समाधानित",
    "live_system_alert": "लाइव सिस्टम अलर्ट",
    "critical_issue_in": "कोथरुड, पुणे में गंभीर समस्या",
    "water_leak_detected": "5 मिनट पहले पानी का रिसाव पाया गया",
    "view": "देखें",
    "quick_actions": "त्वरित कार्रवाई",
    "report_issue": "समस्या रिपोर्ट करें",
    "live_map": "लाइव नक्शा",
    "my_complaints_menu": "मेरी शिकायतें",
    "emergency": "आपातकालीन",
    "nearby_alerts": "आस-पास के अलर्ट",
    "see_all": "सभी देखें",
    "my_complaints_title": "मेरी शिकायतें",
    "search_reports_placeholder": "अपनी रिपोर्ट खोजें...",
    "all_issues": "सभी मुद्दे",
    "in_progress": "प्रगति पर",
    "critical": "गंभीर",
    "resolved_filter": "समाधानित",
    "filter": "फ़िल्टर",
    "no_reports_found": "कोई रिपोर्ट नहीं मिली",
    "citizen_dashboard_clear": "आपका नागरिक डैशबोर्ड साफ है। नई समस्या की रिपोर्ट करने के लिए '+' बटन का उपयोग करें।",
    "trust_score": "विश्वास स्कोर:",
    "reports_sent": "रिपोर्ट भेजी गईं",
    "resolved_stat": "समाधानित",
    "achievements": "उपलब्धियां",
    "view_all": "सभी देखें",
    "top_reporter": "शीर्ष रिपोर्टर",
    "gold_tier": "गोल्ड टियर",
    "road_guardian": "सड़क रक्षक",
    "master_badge": "मास्टर बैज",
    "edit_profile": "प्रोफ़ाइल संपादित करें",
    "language": "भाषा",
    "dark_mode": "डार्क मोड",
    "notification_settings": "अधिसूचना सेटिंग्स",
    "logout": "लॉगआउट",
    "live_smart_map": "लाइव नक्शा",
    "potholes": "गड्ढे",
    "garbage": "कचरा",
    "streetlights": "स्ट्रीटलाइट्स",
    "water_leakage": "पानी का रिसाव",
    "road_damage": "सड़क क्षति",
    "ai_insights": "सिविस एआई अंतर्दृष्टि",
    "critical_immediate": "गंभीर (तत्काल कार्रवाई)",
    "moderate_queued": "मध्यम (कतारबद्ध)",
    "resolved_past_24h": "समाधानित (पिछले 24 घंटे)",
    "your_reported_complaints": "आपकी रिपोर्ट की गई शिकायतें",
    "report_urban_issue": "शहरी समस्या की रिपोर्ट करें",
    "issue_title": "समस्या का शीर्षक",
    "category": "श्रेणी",
    "location": "स्थान (पड़ोस)",
    "description": "विवरण",
    "submit_report": "रिपोर्ट सबमिट करें",
    "ai_scan_active": "एआई स्कैन सक्रिय",
    "upload_image_instead": "इसके बजाय छवि अपलोड करें",
    "capture_and_analyze": "कैप्चर और विश्लेषण करें",
    "align_issue_prompt": "समस्या को फ्रेम के अंदर संरेखित करें और 'कैप्चर और विश्लेषण करें' पर क्लिक करें।",
    "emergency_services": "आपातकालीन सेवाएं",
    "your_current_location": "आपका वर्तमान स्थान",
    "gps_active": "जीपीएस सक्रिय",
    "report_accident": "दुर्घटना की रिपोर्ट करें",
    "vehicle_collisions": "वाहन टक्कर और यातायात घटनाएं",
    "fire_emergency": "अग्निशमन आपातकाल",
    "active_fire_detected": "सक्रिय आग या धुआं पाया गया",
    "medical_assistance": "चिकित्सा सहायता",
    "injuries_health_crises": "चोटें या स्वास्थ्य संकट",
    "flood_warning": "बाढ़ की चेतावनी",
    "severe_water_rising": "गंभीर जल स्तर वृद्धि या रिसाव",
    "fallen_tree": "गिरा हुआ पेड़",
    "road_blockages_hazards": "सड़क अवरोध और खतरे",
    "other_hazard": "अन्य खतरा",
    "general_safety_reporting": "सामान्य सुरक्षा रिपोर्टिंग",
    "active_local_alerts": "सक्रिय स्थानीय अलर्ट",
    "direct_support": "सीधा समर्थन",
    "speak_directly_dispatch": "सुरक्षित एआई लिंक के माध्यम से आपातकालीन प्रेषण सेवाओं से सीधे बात करें।",
    "national_emergency": "राष्ट्रीय आपातकाल",
    "ai_insights_title": "एआई अंतर्दृष्टि",
    "ai_confidence": "एआई विश्वास",
    "severity_level": "तीव्रता स्तर",
    "detected_location": "पता चला स्थान (संपादित करने के लिए क्लिक करें)",
    "device_metadata": "डिवाइस मेटाडेटा",
    "sensors": "सेंसर",
    "active_lidar": "सक्रिय लिडार",
    "submit_complaint": "तक्रार सबमिट करें",
    "retake": "पुनः लें"
  },
  mr: {
    "civis_ai": "सिव्हिस एआय",
    "home": "होम",
    "map": "नकाशा",
    "scan": "स्कॅन",
    "alerts": "अलर्ट",
    "profile": "प्रोफाईल",
    "welcome_back": "पुन्हा स्वागत आहे,",
    "good_morning": "शुभ प्रभात,",
    "ai_scan": "एआय स्कॅन",
    "ai_scan_desc": "तुमच्या कॅमेऱ्याचा वापर करून शहरातील समस्या लगेच ओळखा आणि नोंदवा.",
    "start_scanning": "स्कॅनिंग सुरू करा",
    "today": "आज",
    "new_reports": "नवीन अहवाल",
    "efficiency": "कार्यक्षमता",
    "resolved": "निवारण झालेले",
    "live_system_alert": "लाइव्ह प्रणाली अलर्ट",
    "critical_issue_in": "कोथरूड, पुणे येथे गंभीर समस्या",
    "water_leak_detected": "५ मिनिटांपूर्वी पाण्याचे गळती आढळली",
    "view": "पहा",
    "quick_actions": "त्वरित कृती",
    "report_issue": "तक्रार नोंदवा",
    "live_map": "लाइव्ह नकाशा",
    "my_complaints_menu": "माझ्या तक्रारी",
    "emergency": "आणीबाणी",
    "nearby_alerts": "जवळील अलर्ट",
    "see_all": "सर्व पहा",
    "my_complaints_title": "माझ्या तक्रारी",
    "search_reports_placeholder": "तुमचे अहवाल शोधा...",
    "all_issues": "सर्व तक्रारी",
    "in_progress": "प्रगतीपथावर",
    "critical": "गंभीर",
    "resolved_filter": "निवारण झालेले",
    "filter": "फिल्टर",
    "no_reports_found": "कोणतीही तक्रार आढळली नाही",
    "citizen_dashboard_clear": "तुमचा नागरिक डॅशबोर्ड रिकामा आहे. नवीन तक्रार नोंदवण्यासाठी '+' बटण वापरा.",
    "trust_score": "विश्वासू गुण:",
    "reports_sent": "पाठवलेले अहवाल",
    "resolved_stat": "निवारण झालेले",
    "achievements": "यशस्वी कामगिरी",
    "view_all": "सर्व पहा",
    "top_reporter": "अव्वल तक्रारदार",
    "gold_tier": "गोल्ड श्रेणी",
    "road_guardian": "रस्ता रक्षक",
    "master_badge": "मास्टर बैज",
    "edit_profile": "माहिती संपादित करा",
    "language": "भाषा",
    "dark_mode": "डार्क मोड",
    "notification_settings": "सूचना सेटिंग्ज",
    "logout": "बाहेर पडा",
    "live_smart_map": "लाइव्ह नकाशा",
    "potholes": "खड्डे",
    "garbage": "कचरा",
    "streetlights": "स्ट्रीटलाइट्स",
    "water_leakage": "पाणी गळती",
    "road_damage": "रस्त्याचे नुकसान",
    "ai_insights": "सिव्हिस एआय अंतर्दृष्टी",
    "critical_immediate": "गंभीर (त्वरित कारवाई)",
    "moderate_queued": "मध्यम (प्रतीक्षेत)",
    "resolved_past_24h": "निवारण झालेले (मागील २४ तास)",
    "your_reported_complaints": "तुमच्या नोंदवलेल्या तक्रारी",
    "report_urban_issue": "नागरी समस्येची तक्रार करा",
    "issue_title": "तक्रारीचे शीर्षक",
    "category": "श्रेणी",
    "location": "स्थान (परिसर)",
    "description": "तपशील",
    "submit_report": "तक्रार सादर करा",
    "ai_scan_active": "एआय स्कॅन सक्रिय",
    "upload_image_instead": "याऐवजी फोटो अपलोड करा",
    "capture_and_analyze": "फोटो काढा आणि विश्लेषण करा",
    "align_issue_prompt": "समस्या फ्रेमच्या आत आणा आणि 'फोटो काढा आणि विश्लेषण करा' वर क्लिक करा।",
    "emergency_services": "आणीबाणी सेवा",
    "your_current_location": "तुमचे सध्याचे स्थान",
    "gps_active": "जीपीएस सक्रिय",
    "report_accident": "अपघाताची तक्रार करा",
    "vehicle_collisions": "वाहन अपघात आणि वाहतूक समस्या",
    "fire_emergency": "अग्निशमन आणीबाणी",
    "active_fire_detected": "सक्रिय आग किंवा धूर आढळला",
    "medical_assistance": "वैद्यकीय मदत",
    "injuries_health_crises": "जखम किंवा आरोग्य संकट",
    "flood_warning": "पूर चेतावणी",
    "severe_water_rising": "गंभीर पाणी पातळी वाढणे किंवा गळती",
    "fallen_tree": "पडलेले झाड",
    "road_blockages_hazards": "रस्ता अडथळे आणि धोके",
    "other_hazard": "इतर धोका",
    "general_safety_reporting": "सामान्य सुरक्षा अहवाल",
    "active_local_alerts": "सक्रिय स्थानिक अलर्ट",
    "direct_support": "थेट मदत",
    "speak_directly_dispatch": "सुरक्षित एआय लिंकद्वारे थेट आपत्कालीन नियंत्रण कक्षाशी संपर्क साधा.",
    "national_emergency": "राष्ट्रीय आणीबाणी",
    "ai_insights_title": "एआय अंतर्दृष्टी",
    "ai_confidence": "एआय विश्वास",
    "severity_level": "तीव्रता पातळी",
    "detected_location": "आढळलेले स्थान (संपादित करण्यासाठी क्लिक करा)",
    "device_metadata": "डिव्हाइस मेटाडेटा",
    "sensors": "सेन्सर्स",
    "active_lidar": "सक्रिय लिडार",
    "submit_complaint": "तक्रार सादर करा",
    "retake": "पुन्हा घ्या"
  }
};

function translatePage() {
  const currentLang = localStorage.getItem('civis_language') || 'en';
  
  // Set html lang and class dynamically for Devanagari css tweaks
  document.documentElement.lang = currentLang;
  document.documentElement.classList.remove('lang-en', 'lang-hi', 'lang-mr');
  document.documentElement.classList.add(`lang-${currentLang}`);

  if (currentLang === 'en') return;
  
  const dict = translations[currentLang];
  if (!dict) return;

  // 1. Bottom Nav translation (supporting inline and floating layouts)
  const navLinks = document.querySelectorAll('nav a, nav button, nav div.relative');
  navLinks.forEach(link => {
    const spans = link.querySelectorAll('span');
    spans.forEach(span => {
      if (span.classList.contains('material-symbols-outlined')) return;
      const text = span.textContent.trim().toLowerCase();
      if (text === 'home') span.textContent = dict.home;
      if (text === 'map') span.textContent = dict.map;
      if (text === 'scan') span.textContent = dict.scan;
      if (text === 'alerts') span.textContent = dict.alerts;
      if (text === 'profile') span.textContent = dict.profile;
    });
  });

  // 2. CIVIS AI branding in headers
  document.querySelectorAll('header span, header h1').forEach(el => {
    if (el.textContent.trim() === 'CIVIS AI') {
      el.textContent = dict.civis_ai;
    }
  });

  // 3. Page specific translations
  const path = window.location.pathname;

  if (path.includes('index') || path === '/' || path.endsWith('public/')) {
    const welcomeEl = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('Welcome back'));
    if (welcomeEl) welcomeEl.textContent = dict.welcome_back;

    const goodMorningEl = document.querySelector('h1.font-headline-lg-mobile');
    if (goodMorningEl) {
      const name = goodMorningEl.textContent.split(',')[1] || '';
      goodMorningEl.textContent = `${dict.good_morning}${name}`;
    }

    const aiScanEl = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.trim() === 'AI Scan');
    if (aiScanEl) aiScanEl.textContent = dict.ai_scan;

    const aiScanDescEl = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('Identify & report'));
    if (aiScanDescEl) aiScanDescEl.textContent = dict.ai_scan_desc;

    const startScanBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Start Scanning'));
    if (startScanBtn) {
      const icon = startScanBtn.querySelector('span');
      startScanBtn.innerHTML = '';
      if (icon) startScanBtn.appendChild(icon);
      startScanBtn.appendChild(document.createTextNode(' ' + dict.start_scanning));
    }

    const statsBoxes = document.querySelectorAll('main section.grid > div');
    statsBoxes.forEach(box => {
      const spans = box.querySelectorAll('span');
      spans.forEach(span => {
        if (span.textContent.trim() === 'Today') span.textContent = dict.today;
        if (span.textContent.trim() === 'Efficiency') span.textContent = dict.efficiency;
      });
      const ps = box.querySelectorAll('p');
      ps.forEach(p => {
        if (p.textContent.trim() === 'New Reports') p.textContent = dict.new_reports;
        if (p.textContent.trim() === 'Resolved') p.textContent = dict.resolved;
      });
    });

    const liveSystemAlert = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('Live System Alert'));
    if (liveSystemAlert) liveSystemAlert.textContent = dict.live_system_alert;

    const criticalIssueIn = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('Critical Issue in Kothrud'));
    if (criticalIssueIn) criticalIssueIn.textContent = dict.critical_issue_in;

    const waterLeakDetected = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('Water leak detected'));
    if (waterLeakDetected) waterLeakDetected.textContent = dict.water_leak_detected;

    const viewBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('View'));
    if (viewBtn) {
      const icon = viewBtn.querySelector('span');
      viewBtn.innerHTML = dict.view + ' ';
      if (icon) viewBtn.appendChild(icon);
    }

    const quickActionsHeader = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('Quick Actions'));
    if (quickActionsHeader) quickActionsHeader.textContent = dict.quick_actions;

    const actionsButtons = document.querySelectorAll('main button.group');
    actionsButtons.forEach(btn => {
      const label = Array.from(btn.querySelectorAll('span')).find(s => !s.classList.contains('material-symbols-outlined'));
      if (label) {
        const text = label.textContent.trim();
        if (text === 'Report Issue') label.textContent = dict.report_issue;
        if (text === 'Live Map') label.textContent = dict.live_map;
        if (text === 'My Complaints') label.textContent = dict.my_complaints_menu;
        if (text === 'Emergency') label.textContent = dict.emergency;
      }
    });

    const nearbyAlertsHeader = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('Nearby Alerts'));
    if (nearbyAlertsHeader) nearbyAlertsHeader.textContent = dict.nearby_alerts;

    const seeAllLink = Array.from(document.querySelectorAll('a')).find(el => el.textContent.includes('See all'));
    if (seeAllLink) seeAllLink.textContent = dict.see_all;
  }

  if (path.includes('smart_map')) {
    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.innerText = `CIVIS AI | ${dict.live_smart_map}`;

    const searchInput = document.querySelector('input[placeholder*="Search"]');
    if (searchInput) searchInput.placeholder = dict.search_reports_placeholder;

    const chips = document.querySelectorAll('main button.glass-panel');
    chips.forEach(chip => {
      const label = Array.from(chip.querySelectorAll('span')).find(s => !s.classList.contains('material-symbols-outlined'));
      if (label) {
        const text = label.textContent.trim();
        if (text === 'All Issues') label.textContent = dict.all_issues;
        if (text === 'Potholes') label.textContent = dict.potholes;
        if (text === 'Garbage') label.textContent = dict.garbage;
        if (text === 'Streetlights') label.textContent = dict.streetlights;
        if (text === 'Water Leakage') label.textContent = dict.water_leakage;
        if (text === 'Road Damage') label.textContent = dict.road_damage;
      }
    });

    const legendTitle = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('CIVIS AI Insights'));
    if (legendTitle) legendTitle.textContent = dict.ai_insights;

    const legendLabels = document.querySelectorAll('main div.glass-panel span.font-label-sm');
    legendLabels.forEach(label => {
      const text = label.textContent.trim();
      if (text.includes('Critical')) label.textContent = dict.critical_immediate;
      if (text.includes('Moderate')) label.textContent = dict.moderate_queued;
      if (text.includes('Resolved')) label.textContent = dict.resolved_past_24h;
      if (text.includes('Your Reported')) label.textContent = dict.your_reported_complaints;
    });
  }

  if (path.includes('my_complaints')) {
    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.innerText = `${dict.my_complaints_title} - CIVIS AI`;

    const searchInput = document.querySelector('input[placeholder*="Search"]');
    if (searchInput) searchInput.placeholder = dict.search_reports_placeholder;

    const filterChips = document.querySelectorAll('main .flex.gap-2 button');
    filterChips.forEach(chip => {
      const text = chip.textContent.trim();
      if (text === 'All Issues') chip.textContent = dict.all_issues;
      if (text === 'In Progress') chip.textContent = dict.in_progress;
      if (text === 'Critical') chip.textContent = dict.critical;
      if (text === 'Resolved') chip.textContent = dict.resolved_filter;
      if (text.includes('Filter')) {
        const icon = chip.querySelector('span');
        chip.innerHTML = '';
        if (icon) chip.appendChild(icon);
        chip.appendChild(document.createTextNode(' ' + dict.filter));
      }
    });

    const emptyTitle = document.querySelector('#empty-state h2');
    if (emptyTitle) emptyTitle.textContent = dict.no_reports_found;

    const emptyDesc = document.querySelector('#empty-state p');
    if (emptyDesc) emptyDesc.textContent = dict.citizen_dashboard_clear;
  }

  if (path.includes('profile')) {
    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.innerText = `CIVIS AI - ${dict.profile}`;

    const trustScoreEl = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('Trust Score'));
    if (trustScoreEl) {
      const score = trustScoreEl.textContent.split(':')[1] || '';
      trustScoreEl.textContent = `${dict.trust_score}${score}`;
    }

    const statsBoxes = document.querySelectorAll('main section.grid > div');
    statsBoxes.forEach(box => {
      const sentP = Array.from(box.querySelectorAll('div')).find(d => d.textContent.trim() === 'Reports Sent');
      if (sentP) sentP.textContent = dict.reports_sent;
      const resP = Array.from(box.querySelectorAll('div')).find(d => d.textContent.trim() === 'Resolved');
      if (resP) resP.textContent = dict.resolved_stat;
    });

    const achievementsTitle = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.trim() === 'ACHIEVEMENTS');
    if (achievementsTitle) achievementsTitle.textContent = dict.achievements.toUpperCase();

    const viewAllBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('View All'));
    if (viewAllBtn) viewAllBtn.textContent = dict.view_all;

    document.querySelectorAll('main div.font-label-md').forEach(el => {
      if (el.textContent.trim() === 'Top Reporter') el.textContent = dict.top_reporter;
      if (el.textContent.trim() === 'Road Guardian') el.textContent = dict.road_guardian;
    });
    document.querySelectorAll('main div.text-outline').forEach(el => {
      if (el.textContent.trim() === 'Gold Tier') el.textContent = dict.gold_tier;
      if (el.textContent.trim() === 'Master Badge') el.textContent = dict.master_badge;
    });

    document.querySelectorAll('main button span.font-body-md, main div span.font-body-md').forEach(el => {
      const text = el.textContent.trim();
      if (text === 'Edit Profile') el.textContent = dict.edit_profile;
      if (text === 'Language') el.textContent = dict.language;
      if (text === 'Dark Mode') el.textContent = dict.dark_mode;
      if (text === 'Notification Settings') el.textContent = dict.notification_settings;
      if (text === 'Logout') el.textContent = dict.logout;
    });
  }

  if (path.includes('emergency')) {
    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.innerText = `CIVIS AI - ${dict.emergency_services || 'Emergency Services'}`;

    const headerTitle = document.querySelector('header h1');
    if (headerTitle) headerTitle.textContent = dict.emergency_services;

    const gpsTitle = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('Your Current Location'));
    if (gpsTitle) gpsTitle.textContent = dict.your_current_location;

    const gpsStatus = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('GPS Active'));
    if (gpsStatus) {
      const icon = gpsStatus.querySelector('span');
      gpsStatus.innerHTML = '';
      if (icon) gpsStatus.appendChild(icon);
      gpsStatus.appendChild(document.createTextNode(' ' + (dict.gps_active || 'GPS Active')));
    }

    const cards = document.querySelectorAll('main button.group');
    cards.forEach(card => {
      const titleSpan = card.querySelector('span.font-headline-md');
      const descSpan = card.querySelector('span.text-label-sm');
      if (titleSpan) {
        const text = titleSpan.textContent.trim();
        if (text === 'Report Accident') {
          titleSpan.textContent = dict.report_accident;
          if (descSpan) descSpan.textContent = dict.vehicle_collisions;
        }
        if (text === 'Fire Emergency') {
          titleSpan.textContent = dict.fire_emergency;
          if (descSpan) descSpan.textContent = dict.active_fire_detected;
        }
        if (text === 'Medical Assistance') {
          titleSpan.textContent = dict.medical_assistance;
          if (descSpan) descSpan.textContent = dict.injuries_health_crises;
        }
        if (text === 'Flood Warning') {
          titleSpan.textContent = dict.flood_warning;
          if (descSpan) descSpan.textContent = dict.severe_water_rising;
        }
        if (text === 'Fallen Tree') {
          titleSpan.textContent = dict.fallen_tree;
          if (descSpan) descSpan.textContent = dict.road_blockages_hazards;
        }
        if (text === 'Other Hazard') {
          titleSpan.textContent = dict.other_hazard;
          if (descSpan) descSpan.textContent = dict.general_safety_reporting;
        }
      }
    });

    const activeAlertsTitle = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('Active Local Alerts'));
    if (activeAlertsTitle) {
      const icon = activeAlertsTitle.querySelector('span');
      activeAlertsTitle.innerHTML = '';
      if (icon) activeAlertsTitle.appendChild(icon);
      activeAlertsTitle.appendChild(document.createTextNode(' ' + dict.active_local_alerts));
    }

    const directSupportTitle = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('Direct Support'));
    if (directSupportTitle) directSupportTitle.textContent = dict.direct_support;

    const directSupportDesc = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('Speak directly with'));
    if (directSupportDesc) directSupportDesc.textContent = dict.speak_directly_dispatch;

    const nationalEmergencyLabel = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('National Emergency'));
    if (nationalEmergencyLabel) nationalEmergencyLabel.textContent = dict.national_emergency;
  }

  if (path.includes('ai_analysis')) {
    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.innerText = `CIVIS AI - ${dict.ai_scan}`;

    const headerTitle = document.querySelector('header h1');
    if (headerTitle) headerTitle.textContent = dict.ai_scan;

    const insightsTitle = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('AI Insights'));
    if (insightsTitle) insightsTitle.textContent = dict.ai_insights_title;

    const issueTypeLabel = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim() === 'Issue Type');
    if (issueTypeLabel) issueTypeLabel.textContent = dict.category;

    const aiConfidenceLabel = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim() === 'AI Confidence');
    if (aiConfidenceLabel) aiConfidenceLabel.textContent = dict.ai_confidence;

    const severityLevelLabel = Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim() === 'Severity Level');
    if (severityLevelLabel) severityLevelLabel.textContent = dict.severity_level;

    const locationLabel = Array.from(document.querySelectorAll('p')).find(el => el.textContent.includes('Detected Location'));
    if (locationLabel) locationLabel.textContent = dict.detected_location;

    const metadataLabel = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('Device Metadata'));
    if (metadataLabel) metadataLabel.textContent = dict.device_metadata;

    const sensorLabel = Array.from(document.querySelectorAll('p')).find(el => el.textContent.trim() === 'SENSORS');
    if (sensorLabel) {
      sensorLabel.textContent = currentLang === 'hi' ? 'सेंसर' : currentLang === 'mr' ? 'सेन्सर्स' : 'SENSORS';
      const activeLidarVal = sensorLabel.nextElementSibling;
      if (activeLidarVal && activeLidarVal.textContent.trim() === 'Active LiDAR') {
        activeLidarVal.textContent = dict.active_lidar;
      }
    }

    const timestampLabel = Array.from(document.querySelectorAll('p')).find(el => el.textContent.trim() === 'TIMESTAMP');
    if (timestampLabel) {
      timestampLabel.textContent = currentLang === 'hi' ? 'समय' : currentLang === 'mr' ? 'वेळ' : 'TIMESTAMP';
    }

    const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Submit Complaint'));
    if (submitBtn) {
      const icon = submitBtn.querySelector('span');
      submitBtn.innerHTML = dict.submit_complaint + ' ';
      if (icon) submitBtn.appendChild(icon);
    }

    const retakeBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Retake'));
    if (retakeBtn) {
      const icon = retakeBtn.querySelector('span');
      retakeBtn.innerHTML = dict.retake + ' ';
      if (icon) retakeBtn.appendChild(icon);
    }

    const categorySelect = document.getElementById('ai-category-select');
    if (categorySelect) {
      Array.from(categorySelect.options).forEach(opt => {
        if (opt.value === 'Road Damage') opt.text = dict.road_damage;
        if (opt.value === 'Garbage') opt.text = dict.garbage;
        if (opt.value === 'Water Leakage') opt.text = dict.water_leakage;
        if (opt.value === 'Streetlights') opt.text = dict.streetlights;
      });
    }
  }
}

function openLanguageModal() {
  if (document.getElementById('language-select-modal')) return;
  const currentLang = localStorage.getItem('civis_language') || 'en';

  const modal = document.createElement('div');
  modal.id = 'language-select-modal';
  modal.className = 'fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 transition-opacity duration-300 animate-in fade-in';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
      <button class="absolute top-4 right-4 text-outline hover:text-on-surface" onclick="this.closest('.fixed').remove()">✕</button>
      
      <h3 class="text-xl font-bold text-primary mb-6 flex items-center gap-2">
        <span class="material-symbols-outlined">translate</span> Select Language / भाषा चुनें
      </h3>
      
      <div class="flex flex-col gap-3">
        <button data-lang="en" class="flex items-center justify-between p-4 border rounded-xl hover:bg-primary/5 active:scale-95 transition-all text-left ${currentLang === 'en' ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-border-subtle text-on-surface-variant'}">
          <span class="font-semibold">English</span>
          ${currentLang === 'en' ? '<span class="material-symbols-outlined text-primary" style="font-variation-settings: \'FILL\' 1;">check_circle</span>' : ''}
        </button>
        <button data-lang="hi" class="flex items-center justify-between p-4 border rounded-xl hover:bg-primary/5 active:scale-95 transition-all text-left ${currentLang === 'hi' ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-border-subtle text-on-surface-variant'}">
          <span class="font-semibold">Hindi (हिन्दी)</span>
          ${currentLang === 'hi' ? '<span class="material-symbols-outlined text-primary" style="font-variation-settings: \'FILL\' 1;">check_circle</span>' : ''}
        </button>
        <button data-lang="mr" class="flex items-center justify-between p-4 border rounded-xl hover:bg-primary/5 active:scale-95 transition-all text-left ${currentLang === 'mr' ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-border-subtle text-on-surface-variant'}">
          <span class="font-semibold">Marathi (मराठी)</span>
          ${currentLang === 'mr' ? '<span class="material-symbols-outlined text-primary" style="font-variation-settings: \'FILL\' 1;">check_circle</span>' : ''}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll('button[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedLang = btn.getAttribute('data-lang');
      localStorage.setItem('civis_language', selectedLang);
      modal.remove();
      window.location.reload();
    });
  });
}

async function getIssues() {
  const { data, error } = await supabaseClient.from('issues').select('*').order('id', { ascending: false });
  if (error) {
    console.error('Error fetching issues:', error);
    return cachedIssues.length ? cachedIssues : [];
  }
  cachedIssues = data;
  return data;
}

// Image Classifier "Mock Dataset" Keyword Logic (for manual fallback)
function classifyImage(fileName, simCategory = null) {
  if (simCategory) {
    if (simCategory === 'Garbage') {
      return { category: 'Garbage', title: 'Overflowing Waste Bin', severity: 68, tag: 'WASTE 94%', description: 'Accumulated street litter and overflowing garbage bin.' };
    }
    if (simCategory === 'Water Leakage') {
      return { category: 'Water Leakage', title: 'Water Pipe Leakage', severity: 86, tag: 'WATER LEAK 97%', description: 'Subsurface pipe fracture causing water accumulation on road.' };
    }
    if (simCategory === 'Streetlights') {
      return { category: 'Streetlights', title: 'Streetlight Outage', severity: 54, tag: 'LIGHT OUT 93%', description: 'Non-functional overhead street lighting fixture.' };
    }
    return { category: 'Road Damage', title: 'Road Pothole Damage', severity: 92, tag: 'POTHOLE 98%', description: 'Structural cavity detected in asphalt road surface.' };
  }

  const name = (fileName || '').toLowerCase();
  if (name.includes('garbage') || name.includes('trash') || name.includes('waste') || name.includes('dump') || name.includes('bin') || name.includes('litter')) {
    return { category: 'Garbage', title: 'Overflowing Waste Bin', severity: 68, tag: 'WASTE 94%', description: 'Accumulated street litter and overflowing garbage bin.' };
  }
  if (name.includes('water') || name.includes('leak') || name.includes('pipe') || name.includes('burst') || name.includes('drain') || name.includes('flood')) {
    return { category: 'Water Leakage', title: 'Water Pipe Leakage', severity: 86, tag: 'WATER LEAK 97%', description: 'Subsurface pipe fracture causing water accumulation on road.' };
  }
  if (name.includes('light') || name.includes('lamp') || name.includes('bulb') || name.includes('dark') || name.includes('streetlight')) {
    return { category: 'Streetlights', title: 'Streetlight Outage', severity: 54, tag: 'LIGHT OUT 93%', description: 'Non-functional overhead street lighting fixture.' };
  }
  
  return { category: 'Road Damage', title: 'Road Pothole Damage', severity: 92, tag: 'POTHOLE 98%', description: 'Structural cavity detected in asphalt road surface.' };
}

// TensorFlow.js Predictions to Civic Issues mapping
function mapPredictionsToIssue(predictions, defaultAnalysis) {
  // If the user's manual selector or file name already matched a strong civic category, prioritize that fallback over generic ImageNet classes
  if (defaultAnalysis && defaultAnalysis.category && defaultAnalysis.category !== 'Road Damage') {
    return defaultAnalysis;
  }

  if (!predictions || !predictions.length) {
    return defaultAnalysis;
  }
  
  const topPrediction = predictions[0].className.toLowerCase();
  const topProbability = Math.round(predictions[0].probability * 100);

  for (const pred of predictions) {
    const label = pred.className.toLowerCase();
    const prob = Math.round(pred.probability * 100);
    
    if (label.includes('garbage') || label.includes('trash') || label.includes('waste') || label.includes('rubbish') || label.includes('plastic') || label.includes('bottle') || label.includes('can') || label.includes('ashcan') || label.includes('crate') || label.includes('carton') || label.includes('bag') || label.includes('bin') || label.includes('litter')) {
      return { category: 'Garbage', title: 'Waste Accumulation Detected', severity: 68, tag: `GARBAGE ${prob}%`, description: `AI classified image as "${pred.className}". Overflowing litter/waste bin detected.` };
    }
    // Only map to Water Leakage if it contains explicit pipe/burst leakage indicators. Avoid mapping generic rain puddles to leaks.
    if (label.includes('pipe') || label.includes('burst') || label.includes('leak') || label.includes('conduit') || label.includes('spill')) {
      return { category: 'Water Leakage', title: 'Water Leak / Spill Detected', severity: 86, tag: `WATER LEAK ${prob}%`, description: `AI classified image as "${pred.className}". Subsurface utility leak or liquid spill detected.` };
    }
    if (label.includes('light') || label.includes('lamp') || label.includes('bulb') || label.includes('dark') || label.includes('streetlight') || label.includes('pole') || label.includes('lantern') || label.includes('streetlamp') || label.includes('torch')) {
      return { category: 'Streetlights', title: 'Streetlight Infrastructure Anomaly', severity: 54, tag: `LIGHT OUT ${prob}%`, description: `AI classified image as "${pred.className}". Overhead streetlight fixture anomaly detected.` };
    }
    if (label.includes('pothole') || label.includes('crack') || label.includes('hole') || label.includes('ditch') || label.includes('trench') || label.includes('pit') || label.includes('mud') || label.includes('soil') || label.includes('ground') || label.includes('ruin') || label.includes('stone') || label.includes('rock') || label.includes('asphalt') || label.includes('paving') || label.includes('puddle')) {
      return { category: 'Road Damage', title: 'Road Pothole Detected', severity: 92, tag: `POTHOLE ${prob}%`, description: `AI classified image as "${pred.className}". Cavity or fracture detected in asphalt road surface.` };
    }
  }
  
  return { 
    category: 'Road Damage', 
    title: `Anomaly Detected (${predictions[0].className.split(',')[0]})`, 
    severity: 70, 
    tag: `DETECTED ${topProbability}%`, 
    description: `AI detected "${predictions[0].className}" with ${topProbability}% confidence. Classifying under general road anomalies.` 
  };
}

// --- 2. Global Event Listeners & Page Handlers ---
document.addEventListener("DOMContentLoaded", async () => {
  // Apply translation
  translatePage();

  // Initialize DB
  await getIssues();

  // Welcome & Avatar dynamic sync
  const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
  if (localUser.name) {
    const greetings = Array.from(document.querySelectorAll('span, p, h1, h2, h3'));
    greetings.forEach(el => {
      const text = el.innerText.trim();
      if (text.includes('Hi,') || text.includes('Good Morning,') || text.includes('Good Afternoon,')) {
        el.innerText = text.replace(/Hi,.*$/, `Hi, ${localUser.name}`).replace(/Good Morning,.*$/, `Good Morning, ${localUser.name}`);
      }
    });

    // Update all profile photos with user-specific DiceBear adventurer avatar based on their name
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(localUser.name)}`;
    const profileImages = document.querySelectorAll('img[src*="profile_photo"], img[data-alt*="portrait"], img[src*="aida-public"]');
    profileImages.forEach(img => {
      img.src = avatarUrl;
    });
  }

  // Sidebar navigation active state highlighting
  const currentPath = window.location.pathname;
  document.querySelectorAll('aside nav a').forEach(link => {
    const href = link.getAttribute('href');
    const isDashboard = href === '/admin_dashboard.html' && (currentPath === '/' || currentPath === '' || currentPath.includes('admin_dashboard'));
    const isOtherPage = href !== '#' && href !== '/admin_dashboard.html' && currentPath.includes(href);
    
    if (isDashboard || isOtherPage) {
      link.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold');
      link.classList.remove('text-on-surface-variant');
    } else {
      link.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-semibold');
      link.classList.add('text-on-surface-variant');
    }
  });

  // Admin Quick Redirect Shortcut Pill in Headers
  if (isAdminUser() && !window.location.pathname.includes('admin_dashboard')) {
    const headerRight = document.querySelector('header .flex.items-center.gap-4, header .flex.items-center.gap-2, header div.flex.items-center.gap-4');
    if (headerRight && !document.getElementById('header-admin-btn')) {
      const adminLink = document.createElement('a');
      adminLink.id = 'header-admin-btn';
      adminLink.href = '/admin_dashboard.html';
      adminLink.className = 'flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors mr-2';
      adminLink.innerHTML = `
        <span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
        Admin Portal
      `;
      headerRight.insertBefore(adminLink, headerRight.firstChild);
    }
  }

  // Back Button Wire-up
  const backBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('arrow_back') || b.querySelector('.material-symbols-outlined')?.textContent.trim() === 'arrow_back');
  if (backBtn) {
    backBtn.style.cursor = 'pointer';
    backBtn.addEventListener('click', () => {
      if (document.referrer && document.referrer.includes(window.location.hostname)) {
        window.history.back();
      } else {
        window.location.href = '/index.html';
      }
    });
  }

  // Header Wire-ups
  const profileImg = document.querySelector('header img[data-alt*="portrait"], header img[src*="aida-public"]');
  if (profileImg) {
    profileImg.parentElement.style.cursor = 'pointer';
    profileImg.parentElement.addEventListener('click', () => {
      window.location.href = '/profile.html';
    });
  }

  const notificationBell = document.querySelector('header button span[data-icon="notifications"], header span[data-icon="notifications"]');
  if (notificationBell) {
    notificationBell.parentElement.style.cursor = 'pointer';
    notificationBell.parentElement.addEventListener('click', () => {
      window.location.href = '/my_complaints.html';
    });
  } else {
    const notifBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('notifications'));
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        window.location.href = 'my_complaints.html';
      });
    }
  }

  // Bottom Nav "Scan" Wire-up
  const scanNavLinks = Array.from(document.querySelectorAll('nav a, nav button, nav div.relative button')).filter(el => {
    const text = el.textContent.trim();
    const subtext = el.querySelector('span:last-child')?.textContent.trim();
    return text.includes('Scan') || subtext === 'Scan' || el.querySelector('.material-symbols-outlined')?.textContent.trim() === 'qr_code_scanner';
  });
  scanNavLinks.forEach(link => {
    link.style.cursor = 'pointer';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openScanModal();
    });
  });

  // Page Specific Inits
  const path = window.location.pathname;
  const isIndex = path.includes('index') || path === '/' || path.endsWith('public/') || path.includes('/index') || path.endsWith('/');
  if (isIndex && isAdminUser()) {
    window.location.replace('/admin_dashboard.html');
    return;
  }

  if (isIndex) {
    initHomePage();
  } else if (path.includes('smart_map')) {
    await initMapPage();
  } else if (path.includes('my_complaints')) {
    initComplaintsPage();
  } else if (path.includes('emergency')) {
    initEmergencyPage();
  } else if (path.includes('admin_dashboard')) {
    initAdminDashboard();
  } else if (path.includes('ai_analysis')) {
    initAiAnalysisPage();
  } else if (path.includes('profile')) {
    initProfilePage();
  } else if (path.includes('login')) {
    initLoginPageHandler();
  }
});

// --- 3. Home Page Handler ---
function initHomePage() {
  const startScanBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Start Scanning'));
  if (startScanBtn) {
    startScanBtn.addEventListener('click', openScanModal);
  }

  const actionButtons = document.querySelectorAll('section button.group');
  if (actionButtons.length >= 4) {
    actionButtons[0].addEventListener('click', openReportModal);
    actionButtons[1].addEventListener('click', () => window.location.href = '/smart_map.html');
    actionButtons[2].addEventListener('click', () => window.location.href = '/my_complaints.html');
    actionButtons[3].addEventListener('click', () => window.location.href = '/emergency.html');
  }

  const viewAlertBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('View') && btn.innerHTML.includes('chevron_right'));
  if (viewAlertBtn) {
    viewAlertBtn.addEventListener('click', () => {
      window.location.href = '/smart_map.html?focus=101';
    });
  }
}

// --- 3b. AI Analysis Page Handler ---
async function initAiAnalysisPage() {
  const capturedImg = sessionStorage.getItem('civis_captured_img');
  const capturedName = sessionStorage.getItem('civis_captured_name');
  const simCategory = sessionStorage.getItem('civis_sim_category');
  
  const canvasImg = document.querySelector('main div.bg-cover');
  const confidenceBar = document.querySelector('main .bg-success.rounded-full');
  const severityBar = document.querySelector('main .bg-critical.rounded-full');
  const boundingBox = document.querySelector('main .pothole-overlay');
  const boundingBoxText = boundingBox?.querySelector('span');
  
  const labels = Array.from(document.querySelectorAll('span, p, h3'));
  
  const issueTypeSpan = labels.find(el => el.textContent.trim() === 'Issue Type')?.parentElement?.querySelector('span:last-child');
  const confidenceSpan = labels.find(el => el.textContent.trim() === 'AI Confidence')?.parentElement?.querySelector('span:last-child');
  const severitySpan = labels.find(el => el.textContent.trim() === 'Severity Level')?.parentElement?.querySelector('span:last-child');
  const locationInput = document.getElementById('ai-location-input');
  const gpsText = labels.find(el => el.textContent.trim() === 'GPS COORD')?.parentElement?.querySelector('p:last-child');
  const gpsOverlayText = document.querySelector('main .glass-panel p.font-body-md');
  const timestampText = labels.find(el => el.textContent.trim() === 'TIMESTAMP')?.parentElement?.querySelector('p:last-child');
  const insightsDesc = document.querySelector('aside div p.text-sm');

  if (capturedImg && canvasImg) {
    canvasImg.style.backgroundImage = `url(${capturedImg})`;
  }

  const loader = document.createElement('div');
  loader.className = 'absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-20';
  loader.innerHTML = `
    <span class="material-symbols-outlined animate-spin text-[48px] text-primary mb-4">sync</span>
    <p class="font-headline-md text-[18px] font-bold">TensorFlow.js Running</p>
    <p class="text-xs opacity-60 mt-1">Classifying image pixels with MobileNet ML Model...</p>
  `;
  if (canvasImg) canvasImg.appendChild(loader);

  const baselineAnalysis = classifyImage(capturedName, simCategory);
  let analysis = baselineAnalysis;

  if (capturedImg && typeof mobilenet !== 'undefined') {
    try {
      const imgEl = new Image();
      imgEl.src = capturedImg;
      await new Promise((resolve) => {
        imgEl.onload = resolve;
      });

      const model = await mobilenet.load();
      const predictions = await model.classify(imgEl);
      console.log("TensorFlow.js MobileNet Predictions:", predictions);
      analysis = mapPredictionsToIssue(predictions, baselineAnalysis);
    } catch (e) {
      console.error("Machine learning classification failed, running rule-based fallback:", e);
    }
  }

  loader.remove();

  const randomConfidence = Math.floor(Math.random() * 4) + 95;
  const curTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const categorySelect = document.getElementById('ai-category-select');

  function updateAiAnalysisUI(targetAnalysis) {
    if (categorySelect) categorySelect.value = targetAnalysis.category;
    
    if (confidenceSpan) {
      confidenceSpan.innerText = targetAnalysis.tag.includes('%') ? targetAnalysis.tag.split(' ').pop() : `${randomConfidence}%`;
    }
    if (confidenceBar) {
      const rawVal = parseInt(confidenceSpan.innerText);
      confidenceBar.style.width = isNaN(rawVal) ? '95%' : `${rawVal}%`;
    }
    
    if (severitySpan) severitySpan.innerText = `${targetAnalysis.severity}/100`;
    if (severityBar) severityBar.style.width = `${targetAnalysis.severity}%`;

    if (insightsDesc) insightsDesc.innerText = targetAnalysis.description;

    if (boundingBoxText) {
      boundingBoxText.innerText = targetAnalysis.tag.toUpperCase();
      if (targetAnalysis.severity > 80) {
        boundingBox.style.borderColor = '#EF4444';
        boundingBoxText.style.backgroundColor = '#EF4444';
      } else if (targetAnalysis.severity > 60) {
        boundingBox.style.borderColor = '#F59E0B';
        boundingBoxText.style.backgroundColor = '#F59E0B';
      } else {
        boundingBox.style.borderColor = '#2563EB';
        boundingBoxText.style.backgroundColor = '#2563EB';
      }
    }
  }

  // Initial call to render values
  updateAiAnalysisUI(analysis);

  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      const newCategory = e.target.value;
      const newAnalysis = classifyImage(null, newCategory);
      analysis = newAnalysis;
      updateAiAnalysisUI(analysis);
    });
  }

  if (timestampText) timestampText.innerText = curTime;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude.toFixed(4);
      const lng = position.coords.longitude.toFixed(4);
      const gpsString = `${lat}° N, ${lng}° E`;
      if (gpsText) gpsText.innerText = gpsString;
      if (gpsOverlayText) gpsOverlayText.innerText = gpsString;
    });
  }

  const submitBtns = Array.from(document.querySelectorAll('button')).filter(btn => {
    const text = btn.textContent.toLowerCase().trim();
    return text.includes('submit') || text.includes('complaint');
  });

  submitBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', () => {
      const dbCategory = analysis.category === 'Road Damage' ? 'Road Damage' : analysis.category;
      const customLocation = locationInput ? locationInput.value.trim() : "Nearby detected coordinates";
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            openReportModalAtCoords(pos.coords.latitude, pos.coords.longitude, analysis.title, dbCategory, customLocation, analysis.description);
          },
          () => {
            openReportModalAtCoords(18.5204, 73.8567, analysis.title, dbCategory, customLocation, analysis.description);
          }
        );
      } else {
        openReportModalAtCoords(18.5204, 73.8567, analysis.title, dbCategory, customLocation, analysis.description);
      }
    });
  });

  const retakeBtns = Array.from(document.querySelectorAll('button')).filter(btn => {
    const text = btn.textContent.toLowerCase().trim();
    return text.includes('retake') || text.includes('refresh');
  });

  retakeBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      sessionStorage.removeItem('civis_captured_img');
      sessionStorage.removeItem('civis_captured_name');
      sessionStorage.removeItem('civis_sim_category');
      openScanModal();
    });
  });
}

// --- 4. Smart Map Page Handler ---
let leafletMap = null;
let mapMarkers = [];

async function initMapPage() {
  const mapDiv = document.getElementById('map');
  if (!mapDiv) return;

  if (!leafletMap && typeof L !== 'undefined') {
    leafletMap = L.map('map', { zoomControl: false }).setView([18.5204, 73.8567], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(leafletMap);

    leafletMap.on('click', (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      openReportModalAtCoords(lat, lng);
    });
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (leafletMap) {
          leafletMap.setView([lat, lng], 15);
        }
      },
      (err) => {
        console.warn("Geolocation access failed, using Pune as fallback.", err);
      }
    );
  }

  await renderMapMarkers();

  const chips = document.querySelectorAll('section button.glass-panel');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('bg-primary-container', 'text-on-primary-container'));
      chip.classList.add('bg-primary-container', 'text-on-primary-container');
      const category = chip.querySelector('span:last-child').textContent.trim();
      filterMapMarkers(category);
    });
  });

  const myLocBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('span')?.textContent.trim() === 'my_location' || b.textContent.includes('my_location'));
  if (myLocBtn) {
    myLocBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          leafletMap.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
        });
      }
    });
  }

  const addLocBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('span')?.textContent.trim() === 'add_location_alt' || b.textContent.includes('add_location_alt'));
  if (addLocBtn) {
    addLocBtn.addEventListener('click', () => {
      const center = leafletMap.getCenter();
      openReportModalAtCoords(center.lat, center.lng);
    });
  }

  const zoomInBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('span')?.textContent.trim() === 'add' || b.textContent.includes('add'));
  const zoomOutBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('span')?.textContent.trim() === 'remove' || b.textContent.includes('remove'));
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => leafletMap.zoomIn());
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => leafletMap.zoomOut());

  const urlParams = new URLSearchParams(window.location.search);
  const focusId = urlParams.get('focus');
  if (focusId) {
    setTimeout(() => {
      const issue = cachedIssues.find(i => i.id == focusId);
      if (issue) {
        leafletMap.setView([issue.lat, issue.lng], 16);
      }
    }, 1000);
  }
}

async function renderMapMarkers() {
  if (!leafletMap || typeof L === 'undefined') return;

  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  const issues = await getIssues();
  const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
  const isUserAdmin = isAdminUser();
  
  // Filter issues based on user role (Admin sees all, Citizen sees only their own)
  const displayIssues = isUserAdmin ? issues : issues.filter(issue => issue.reported_by_email === localUser.email);

  displayIssues.forEach(issue => {
    let markerColor = '#2563EB';
    if (issue.criticality === 'Critical') markerColor = '#EF4444';
    else if (issue.criticality === 'Moderate') markerColor = '#F59E0B';
    else if (issue.status === 'Resolved') markerColor = '#22C55E';

    const marker = L.circleMarker([issue.lat, issue.lng], {
      radius: 12,
      fillColor: markerColor,
      color: '#ffffff',
      weight: 3,
      fillOpacity: 0.9
    }).addTo(leafletMap);

    const popupContent = `
      <div class="p-2" style="font-family: 'Inter', sans-serif; color: #191c1e;">
        <div class="flex justify-between items-center gap-4 mb-1">
          <span style="font-weight: bold; font-size: 14px;">${issue.title}</span>
          <span class="px-2 py-0.5 text-[10px] font-bold rounded" style="background-color: ${issue.criticality === 'Critical' ? '#ffdad6' : '#eceef0'}; color: ${issue.criticality === 'Critical' ? '#ba1a1a' : '#191c1e'};">${issue.criticality}</span>
        </div>
        <p style="font-size: 12px; margin: 0 0 8px 0; color: #737686;">${issue.location} • ${issue.date}</p>
        <p style="font-size: 12px; margin: 0 0 10px 0;">${issue.description}</p>
        <div style="font-size: 11px; font-weight: 600; color: #2563eb;">Status: ${issue.status} (${issue.progress}%)</div>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.issue = issue;
    mapMarkers.push(marker);
  });
}

function filterMapMarkers(category) {
  if (!leafletMap) return;
  mapMarkers.forEach(marker => {
    if (category === 'All Issues' || marker.issue.category === category || marker.issue.title.includes(category)) {
      marker.addTo(leafletMap);
    } else {
      leafletMap.removeLayer(marker);
    }
  });
}

// --- 5. Complaints Page Handler ---
function initComplaintsPage() {
  const container = document.querySelector('main .grid');
  if (!container) return;

  if (!document.getElementById('add-complaint-float')) {
    const floatBtn = document.createElement('button');
    floatBtn.id = 'add-complaint-float';
    floatBtn.className = 'fixed bottom-24 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all';
    floatBtn.innerHTML = '<span class="material-symbols-outlined text-[28px]">add</span>';
    floatBtn.addEventListener('click', openReportModal);
    document.body.appendChild(floatBtn);
  }

  renderComplaintsList();

  const searchInput = document.querySelector('input[placeholder*="Search"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      filterComplaintsList(query, null);
    });
  }

  const filterChips = document.querySelectorAll('main .flex.gap-2 button');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.className = c.className.replace('bg-primary-container text-on-primary-container', 'bg-white border border-border-subtle text-on-surface-variant'));
      chip.className = chip.className.replace('bg-white border border-border-subtle text-on-surface-variant', 'bg-primary-container text-on-primary-container');
      const status = chip.textContent.trim();
      filterComplaintsList(searchInput ? searchInput.value.toLowerCase() : '', status);
    });
  });
}

async function renderComplaintsList() {
  const container = document.querySelector('main .grid');
  if (!container) return;

  container.innerHTML = '';
  const issues = await getIssues();
  const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
  const isUserAdmin = isAdminUser();

  // Filter issues based on user role (Admin sees all, Citizen sees only their own)
  const displayIssues = isUserAdmin ? issues : issues.filter(issue => issue.reported_by_email === localUser.email);

  displayIssues.forEach(issue => {
    const card = document.createElement('div');
    card.className = 'bg-white border border-border-subtle rounded-2xl p-4 flex flex-col gap-4 ambient-shadow hover:scale-[1.01] transition-transform duration-200';
    card.innerHTML = `
      <div class="flex gap-4">
        <div class="w-20 h-20 bg-primary-container/10 text-primary rounded-xl flex items-center justify-center shrink-0 border border-border-subtle">
          <span class="material-symbols-outlined text-[36px]">${issue.category === 'Water Leakage' ? 'water_drop' : issue.category === 'Garbage' ? 'delete' : issue.category === 'Streetlights' ? 'lightbulb' : 'warning'}</span>
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start">
              <h3 class="font-headline-md text-[18px] leading-tight text-on-surface mb-1">${issue.title}</h3>
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${issue.criticality === 'Critical' ? 'bg-error-container text-error' : 'bg-surface-container-high text-on-surface-variant'}">${issue.criticality}</span>
            </div>
            <p class="font-label-sm text-label-sm text-outline">${issue.date} • ${issue.location} • By ${issue.reported_by || 'Anonymous'}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 bg-secondary-container/30 text-on-secondary-container text-[11px] font-semibold rounded-md">${issue.status}</span>
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex justify-between font-label-sm text-label-sm">
          <span class="text-outline">Resolution Progress</span>
          <span class="text-primary font-bold">${issue.progress}%</span>
        </div>
        <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
          <div class="h-full bg-primary" style="width: ${issue.progress}%"></div>
        </div>
      </div>
      <p class="text-body-md text-on-surface-variant text-sm">${issue.description}</p>
    `;
    container.appendChild(card);
  });
}

function filterComplaintsList(query, filterStatus) {
  const cards = document.querySelectorAll('main .grid > div');
  const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
  const isUserAdmin = isAdminUser();
  
  // Make sure issues array matches the exact filtered cards structure
  const issues = isUserAdmin ? cachedIssues : cachedIssues.filter(issue => issue.reported_by_email === localUser.email);

  cards.forEach((card, idx) => {
    const issue = issues[idx];
    if (!issue) return;

    const matchesSearch = issue.title.toLowerCase().includes(query) || issue.location.toLowerCase().includes(query) || issue.description.toLowerCase().includes(query);
    let matchesStatus = true;
    if (filterStatus && filterStatus !== 'All Issues') {
      if (filterStatus === 'In Progress') matchesStatus = issue.status === 'In Progress' || issue.status === 'Assigned';
      else if (filterStatus === 'Critical') matchesStatus = issue.criticality === 'Critical';
      else if (filterStatus === 'Resolved') matchesStatus = issue.status === 'Resolved';
    }

    if (matchesSearch && matchesStatus) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// --- 6. Emergency Page Handler ---
function initEmergencyPage() {
  const cards = document.querySelectorAll('main button.group');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const serviceName = card.querySelector('span.font-headline-md')?.textContent.trim() || "Emergency Contact";
      openDialerModal(serviceName);
    });
  });
}

// --- 7. Admin Dashboard Handler ---
function initAdminDashboard() {
  const issuesList = document.querySelector('table tbody, main .divide-y');
  if (issuesList) {
    renderAdminIssues();
  }

  // Wire up the Search Bar
  const searchInput = document.getElementById('admin-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      filterAdminIssuesTable(query);
    });
  }

  // Wire up the CSV Export Button
  const exportBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Export'));
  if (exportBtn) {
    exportBtn.style.cursor = 'pointer';
    exportBtn.addEventListener('click', async () => {
      const issues = await getIssues();
      if (!issues.length) {
        alert("No issues found to export.");
        return;
      }
      
      const headers = ['ID', 'Title', 'Category', 'Location', 'Date', 'Status', 'Progress', 'Criticality', 'Description', 'Reported By', 'Email', 'Phone', 'Latitude', 'Longitude'];
      const csvRows = [headers.join(',')];
      
      issues.forEach(issue => {
        const values = [
          issue.id,
          `"${(issue.title || '').replace(/"/g, '""')}"`,
          `"${(issue.category || '').replace(/"/g, '""')}"`,
          `"${(issue.location || '').replace(/"/g, '""')}"`,
          `"${(issue.date || '').replace(/"/g, '""')}"`,
          `"${(issue.status || '').replace(/"/g, '""')}"`,
          issue.progress,
          `"${(issue.criticality || '').replace(/"/g, '""')}"`,
          `"${(issue.description || '').replace(/"/g, '""')}"`,
          `"${(issue.reported_by || '').replace(/"/g, '""')}"`,
          `"${(issue.reported_by_email || '').replace(/"/g, '""')}"`,
          `"${(issue.reported_by_phone || '').replace(/"/g, '""')}"`,
          issue.lat,
          issue.lng
        ];
        csvRows.push(values.join(','));
      });
      
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `CIVIS_AI_Issues_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

function filterAdminIssuesTable(query) {
  const rows = document.querySelectorAll('table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

async function renderAdminIssues() {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const issues = await getIssues();

  // Calculate live stats
  const totalCount = issues.length;
  const criticalCount = issues.filter(issue => issue.criticality === 'Critical' && issue.status !== 'Resolved').length;
  const resolvedCount = issues.filter(issue => issue.status === 'Resolved').length;
  const pendingCount = issues.filter(issue => issue.status !== 'Resolved').length;
  
  // Calculate category counts
  const roadsCount = issues.filter(issue => issue.category === 'Road Damage' || issue.category === 'Roads & Potholes').length;
  const garbageCount = issues.filter(issue => issue.category === 'Garbage' || issue.category === 'Sanitation').length;
  const lightingCount = issues.filter(issue => issue.category === 'Streetlights' || issue.category === 'Street Lighting').length;
  const waterCount = issues.filter(issue => issue.category === 'Water Leakage').length;

  // Update DOM stats cards
  const elTotal = document.getElementById('stat-total-complaints');
  const elCritical = document.getElementById('stat-critical-issues');
  const elResolved = document.getElementById('stat-resolved-cases');
  const elPending = document.getElementById('stat-pending-cases');
  
  if (elTotal) elTotal.innerText = totalCount.toLocaleString();
  if (elCritical) elCritical.innerText = criticalCount.toLocaleString();
  if (elResolved) elResolved.innerText = resolvedCount.toLocaleString();
  if (elPending) elPending.innerText = pendingCount.toLocaleString();
  
  // Update percentage / auxiliary chips
  const elTotalPercent = document.getElementById('stat-total-percent');
  if (elTotalPercent) {
    const newToday = issues.filter(issue => {
      const issueDate = new Date(issue.date || Date.now());
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return issueDate.getTime() > oneDayAgo;
    }).length;
    elTotalPercent.innerText = `+${newToday} New Today`;
  }

  const elCriticalToday = document.getElementById('stat-critical-today');
  if (elCriticalToday) {
    const criticalNewToday = issues.filter(issue => {
      if (issue.criticality !== 'Critical') return false;
      const issueDate = new Date(issue.date || Date.now());
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return issueDate.getTime() > oneDayAgo;
    }).length;
    elCriticalToday.innerText = `+${criticalNewToday} Today`;
  }

  const elEfficiency = document.getElementById('stat-efficiency-percent');
  if (elEfficiency && totalCount > 0) {
    const efficiency = Math.round((resolvedCount / totalCount) * 100);
    elEfficiency.innerText = `${efficiency}% Efficiency`;
  }

  const elAvgDays = document.getElementById('stat-avg-days');
  if (elAvgDays) {
    const avgVal = (1.2 + pendingCount * 0.05).toFixed(1);
    elAvgDays.innerText = `Avg ${avgVal} days`;
  }

  // Update DOM categories counts & bars
  const updateCat = (idCount, idBar, count) => {
    const elCount = document.getElementById(idCount);
    const elBar = document.getElementById(idBar);
    if (elCount) elCount.innerText = count.toLocaleString();
    if (elBar) {
      const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      elBar.style.width = `${pct}%`;
    }
  };

  updateCat('cat-roads-count', 'cat-roads-bar', roadsCount);
  updateCat('cat-garbage-count', 'cat-garbage-bar', garbageCount);
  updateCat('cat-lighting-count', 'cat-lighting-bar', lightingCount);
  updateCat('cat-water-count', 'cat-water-bar', waterCount);

  issues.forEach(issue => {
    let markerColor = '#2563EB';
    if (issue.criticality === 'Critical') markerColor = '#EF4444';
    else if (issue.criticality === 'Moderate') markerColor = '#F59E0B';
    else if (issue.status === 'Resolved') markerColor = '#22C55E';

    const row = document.createElement('tr');
    row.className = 'border-b border-border-subtle hover:bg-surface-container-low/50 transition-colors group';
    row.innerHTML = `
      <td class="px-6 py-4">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center shrink-0 text-primary">
            <span class="material-symbols-outlined text-2xl">${issue.category === 'Water Leakage' ? 'water_drop' : issue.category === 'Garbage' ? 'delete' : issue.category === 'Streetlights' ? 'lightbulb' : 'warning'}</span>
          </div>
          <div>
            <p class="font-label-md text-label-md font-bold text-on-surface">${issue.title}</p>
            <p class="text-[12px] text-on-surface-variant">ID: #${issue.id}</p>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${issue.criticality === 'Critical' ? 'bg-error-container text-error' : 'bg-surface-container-high text-on-surface-variant'}">${issue.criticality}</span>
      </td>
      <td class="px-6 py-4">
        <div class="font-semibold text-sm text-on-surface">${issue.reported_by || 'Anonymous'}</div>
        <div class="text-[10px] text-outline font-normal mt-0.5">${issue.reported_by_email || 'N/A'} • ${issue.reported_by_phone || 'N/A'}</div>
      </td>
      <td class="px-6 py-4 text-outline font-medium text-sm">
        ${issue.location}
      </td>
      <td class="px-6 py-4 text-label-sm text-outline">
        ${issue.date}
      </td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center gap-1.5 text-label-sm font-bold" style="color: ${markerColor}">
          <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${markerColor}"></span>
          ${issue.status}
        </span>
      </td>
      <td class="px-6 py-4">
        <div class="flex gap-2">
          <button onclick="updateIssueStatus(${issue.id}, 'In Progress', 50)" class="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:brightness-110 shadow-sm transition-all active:scale-95">Assign</button>
          <button onclick="updateIssueStatus(${issue.id}, 'Resolved', 100)" class="px-3 py-1 bg-success text-white text-xs font-semibold rounded-lg hover:brightness-110 shadow-sm transition-all active:scale-95">Resolve</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

window.updateIssueStatus = async function(id, status, progress) {
  const { data, error } = await supabaseClient.from('issues').update({ status, progress }).eq('id', id);
  if (error) {
    alert(`Error updating issue: ${error.message}`);
  } else {
    alert(`Issue status updated successfully!`);
    await renderAdminIssues();
  }
}

// --- 8. Profile Page Handler ---
async function initProfilePage() {
  const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
  
  const profName = document.getElementById('profile-name');
  const profEmail = document.getElementById('profile-email');
  const profPhone = document.getElementById('profile-phone');

  if (profName && localUser.name) profName.innerText = localUser.name;
  if (profEmail && localUser.email) profEmail.innerText = localUser.email;
  if (profPhone && localUser.phone) profPhone.innerText = localUser.phone;

  // Dynamically compute stats from user's actual reports
  try {
    const issues = await getIssues();
    const userIssues = issues.filter(issue => issue.reported_by_email === localUser.email);
    const reportsSentCount = userIssues.length;
    const resolvedCount = userIssues.filter(issue => issue.status === 'Resolved').length;
    const trustScoreVal = Math.min(100, 85 + (resolvedCount * 5));

    // Update Reports Sent & Resolved Count boxes
    const statsBoxes = document.querySelectorAll('main section.grid > div');
    if (statsBoxes.length >= 2) {
      const sentCountEl = statsBoxes[0].querySelector('div.font-headline-md');
      if (sentCountEl) sentCountEl.innerText = reportsSentCount;
      
      const resolvedCountEl = statsBoxes[1].querySelector('div.font-headline-md');
      if (resolvedCountEl) resolvedCountEl.innerText = resolvedCount;
    }

    // Update Trust Score label
    const trustScoreEl = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('Trust Score'));
    if (trustScoreEl) {
      trustScoreEl.innerText = `Trust Score: ${trustScoreVal}`;
    }
  } catch (err) {
    console.warn("Could not calculate dynamic user stats:", err);
  }

  // Inject Admin Portal Shortcut to Settings if user has Admin Privileges
  if (isAdminUser()) {
    const settingsSection = document.querySelector('main section.bg-surface-container-lowest');
    if (settingsSection && !document.getElementById('profile-admin-shortcut')) {
      const adminBtn = document.createElement('button');
      adminBtn.id = 'profile-admin-shortcut';
      adminBtn.className = 'w-full flex items-center justify-between p-5 hover:bg-primary/5 transition-colors group text-primary font-bold';
      adminBtn.innerHTML = `
        <div class="flex items-center gap-4">
          <span class="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">admin_panel_settings</span>
          <span class="font-body-md text-body-md text-primary">Admin Portal</span>
        </div>
        <span class="material-symbols-outlined text-primary">chevron_right</span>
      `;
      adminBtn.addEventListener('click', () => {
        window.location.href = '/admin_dashboard.html';
      });
      settingsSection.insertBefore(adminBtn, settingsSection.firstChild);
      
      const divider = document.createElement('div');
      divider.id = 'profile-admin-divider';
      divider.className = 'mx-5 h-px bg-border-subtle';
      settingsSection.insertBefore(divider, settingsSection.children[1]);
    }
  }

  // Setup Edit Profile Button Click Handler
  const editProfileBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Edit Profile'));
  if (editProfileBtn) {
    const newEditBtn = editProfileBtn.cloneNode(true);
    editProfileBtn.parentNode.replaceChild(newEditBtn, editProfileBtn);
    newEditBtn.addEventListener('click', openEditProfileModal);
  }

  const languageBtn = Array.from(document.querySelectorAll('button')).find(btn => {
    return Array.from(btn.querySelectorAll('span')).some(span => span.textContent.trim() === 'translate');
  });
  if (languageBtn) {
    languageBtn.style.cursor = 'pointer';
    languageBtn.addEventListener('click', openLanguageModal);
    
    const currentLang = localStorage.getItem('civis_language') || 'en';
    const textLabel = languageBtn.querySelector('div.flex.items-center.gap-1 span.text-outline');
    if (textLabel) {
      if (currentLang === 'hi') textLabel.textContent = 'हिन्दी';
      else if (currentLang === 'mr') textLabel.textContent = 'मराठी';
      else textLabel.textContent = 'English';
    }
  }

  const logoutBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.toLowerCase().includes('log') || btn.textContent.toLowerCase().includes('sign') || btn.textContent.toLowerCase().includes('out'));
  if (logoutBtn) {
    logoutBtn.style.cursor = 'pointer';
    logoutBtn.addEventListener('click', async () => {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        console.warn("Supabase sign out failed:", e);
      }
      sessionStorage.removeItem('civis_user');
      window.location.href = '/login.html';
    });
  }
}

// Check if user has admin privileges based on credentials
function isAdminUser() {
  const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
  if (!localUser.email) return false;
  const email = localUser.email.toLowerCase();
  const name = (localUser.name || '').toLowerCase();
  return email.includes('admin') || name.includes('ishita') || name.includes('sarthak') || email === 'sarthakloghop30@gmail.com';
}

// Edit Profile Modal Window
function openEditProfileModal() {
  const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
      <button class="absolute top-4 right-4 text-outline" onclick="this.closest('.fixed').remove()">✕</button>
      <h3 class="text-xl font-bold text-primary mb-4">Edit Profile</h3>
      <form id="edit-profile-form" class="flex flex-col gap-4">
        <div>
          <label class="block text-label-sm font-semibold mb-1 text-on-surface-variant">Full Name</label>
          <input required id="edit-form-name" value="${localUser.name || ''}" class="w-full p-3 border border-border-subtle rounded-xl outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. Sarthak">
        </div>
        <div>
          <label class="block text-label-sm font-semibold mb-1 text-on-surface-variant">Phone Number</label>
          <input required id="edit-form-phone" value="${localUser.phone || ''}" class="w-full p-3 border border-border-subtle rounded-xl outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. +91 98765 43210">
        </div>
        <button type="submit" class="w-full py-3 bg-primary text-white font-semibold rounded-xl mt-2 shadow-lg shadow-primary/25">Save Changes</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('edit-form-name').value.trim();
    const newPhone = document.getElementById('edit-form-phone').value.trim();

    localUser.name = newName;
    localUser.phone = newPhone;
    sessionStorage.setItem('civis_user', JSON.stringify(localUser));

    // Try to update user metadata in Supabase
    try {
      const { error: authError } = await supabaseClient.auth.updateUser({
        data: { full_name: newName, phone: newPhone }
      });
      
      if (authError) {
        console.error("Supabase Auth metadata update failed:", authError);
      }
      
      // Also try to upsert to the profiles table
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { error: dbError } = await supabaseClient.from('profiles').upsert({
          id: user.id,
          full_name: newName,
          phone: newPhone,
          updated_at: new Date()
        });
        if (dbError) {
          console.error("Supabase profiles table upsert failed:", dbError);
          alert(`Database sync failed: ${dbError.message}`);
        }
      }
    } catch (err) {
      console.warn("Could not sync profile metadata to Supabase:", err);
    }

    alert("Profile updated successfully!");
    modal.remove();
    
    // Globally update greeting and avatars immediately
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(newName)}`;
    const profileImages = document.querySelectorAll('img[src*="profile_photo"], img[data-alt*="portrait"], img[src*="aida-public"]');
    profileImages.forEach(img => {
      img.src = avatarUrl;
    });

    const greetings = Array.from(document.querySelectorAll('span, p, h1, h2, h3'));
    greetings.forEach(el => {
      const text = el.innerText.trim();
      if (text.includes('Hi,') || text.includes('Good Morning,') || text.includes('Good Afternoon,')) {
        el.innerText = text.replace(/Hi,.*$/, `Hi, ${newName}`).replace(/Good Morning,.*$/, `Good Morning, ${newName}`);
      }
    });

    initProfilePage();
  });
}

// --- 9. Login Page Handler ---
function initLoginPageHandler() {
  const authForm = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const nameInput = document.getElementById('auth-name');
  const phoneInput = document.getElementById('auth-phone');
  const errorBox = document.getElementById('auth-error');
  
  if (!authForm) return;
  
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = nameInput.value.trim() || email.split('@')[0];
    const phone = phoneInput ? phoneInput.value.trim() : '+91 98765 43210';
    
    const isRegMode = typeof isRegisterMode !== 'undefined' ? isRegisterMode : false;

    // Hardcoded Admin Credentials Fallback for easy testing
    if (!isRegMode && email.toLowerCase() === 'admin@civis.ai' && password === 'admin123') {
      const adminUser = {
        email: 'admin@civis.ai',
        name: 'Sarthak (Admin)',
        phone: '+91 98765 43210'
      };
      sessionStorage.setItem('civis_user', JSON.stringify(adminUser));
      alert("Welcome, Admin Sarthak! Logging in to Admin Portal...");
      window.location.href = '/admin_dashboard.html';
      return;
    }
    
    if (isRegMode) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, phone: phone }
          }
        });
        if (error) throw error;
        
        if (data.session) {
          sessionStorage.setItem('civis_user', JSON.stringify({ email, name, phone }));
          window.location.href = '/index.html';
        } else {
          alert("Registration request submitted! Setting up local demo session.");
          sessionStorage.setItem('civis_user', JSON.stringify({ email, name, phone }));
          window.location.href = '/index.html';
        }
      } catch (err) {
        console.warn("Supabase registration fallback:", err.message);
        sessionStorage.setItem('civis_user', JSON.stringify({ email, name, phone }));
        window.location.href = '/index.html';
      }
    } else {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.session && data.user) {
          sessionStorage.setItem('civis_user', JSON.stringify({ 
            email, 
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            phone: data.user.user_metadata?.phone || '+91 98765 43210'
          }));
          window.location.href = '/index.html';
        }
      } catch (err) {
        console.warn("Supabase signin fallback:", err.message);
        sessionStorage.setItem('civis_user', JSON.stringify({ email, name, phone: '+91 98765 43210' }));
        window.location.href = '/index.html';
      }
    }
  });
}

// --- 10. Modals UI & Implementations ---
function openScanModal() {
  const currentLang = localStorage.getItem('civis_language') || 'en';
  const dict = translations[currentLang] || translations.en;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-md relative flex flex-col items-center">
      <button class="absolute top-4 right-4 text-outline hover:text-on-surface" id="close-scan-btn">✕</button>
      
      <div class="w-full flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-primary flex items-center gap-2">
          <span class="material-symbols-outlined">psychology</span> ${dict.ai_scan_active}
        </h3>
        
        <select id="simulate-target-select" class="text-xs p-1 bg-surface-container-high border border-border-subtle rounded-md outline-none focus:ring-1 focus:ring-primary">
          <option value="Road Damage">🚗 ${currentLang === 'hi' ? 'गड्ढे स्कैन करें' : currentLang === 'mr' ? 'खड्डे स्कॅन करा' : 'Scan Pothole'}</option>
          <option value="Garbage">🗑️ ${currentLang === 'hi' ? 'कचरा स्कैन करें' : currentLang === 'mr' ? 'कचरा स्कॅन करा' : 'Scan Garbage'}</option>
          <option value="Water Leakage">💧 ${currentLang === 'hi' ? 'पानी का रिसाव स्कैन करें' : currentLang === 'mr' ? 'पाणी गळती स्कॅन करा' : 'Scan Water Leak'}</option>
          <option value="Streetlights">💡 ${currentLang === 'hi' ? 'स्ट्रीटलाइट स्कैन करें' : currentLang === 'mr' ? 'स्ट्रीटलाइट स्कॅन करा' : 'Scan Streetlight'}</option>
        </select>
      </div>

      <div class="w-full aspect-video bg-black rounded-xl relative overflow-hidden flex items-center justify-center mb-4">
        <video id="webcam-feed" autoplay playsinline class="absolute inset-0 w-full h-full object-cover hidden"></video>
        <div id="scan-bounding-box" class="absolute w-40 h-28 border-2 border-dashed border-primary rounded-lg hidden animate-pulse"></div>
        <div id="scan-line" class="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_10px_#2563eb] hidden" style="animation: scan 2.5s infinite ease-in-out;"></div>
        <span id="webcam-placeholder" class="text-white font-label-sm text-xs opacity-50 flex items-center gap-2">
          <span class="material-symbols-outlined animate-spin text-sm">sync</span> ${currentLang === 'hi' ? 'कैमरा शुरू किया जा रहा है...' : currentLang === 'mr' ? 'कॅमेरा सुरू होत आहे...' : 'Initializing Camera...'}
        </span>
      </div>
      <div id="scan-status" class="text-center font-semibold text-on-surface mb-4">${currentLang === 'hi' ? 'स्कैनर शुरू हो रहा है...' : currentLang === 'mr' ? 'स्कॅनर सुरू होत आहे...' : 'Starting scanner...'}</div>
      <div class="w-full flex flex-col gap-2">
        <button id="capture-frame-btn" class="w-full py-3 bg-primary text-white font-semibold rounded-xl hidden">${dict.capture_and_analyze}</button>
        <button id="upload-fallback-btn" class="w-full py-3 bg-surface-container-high text-on-surface font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-variant">
          <span class="material-symbols-outlined text-[20px]">upload_file</span>
          ${dict.upload_image_instead}
        </button>
        <input type="file" id="upload-scan-file" class="hidden" accept="image/*">
      </div>
    </div>
    <style>
      @keyframes scan {
        0%, 100% { top: 0%; }
        50% { top: 100%; }
      }
    </style>
  `;
  document.body.appendChild(modal);

  let stream = null;
  const video = modal.querySelector('#webcam-feed');
  const placeholder = modal.querySelector('#webcam-placeholder');
  const scanLine = modal.querySelector('#scan-line');
  const scanBoundingBox = modal.querySelector('#scan-bounding-box');
  const scanStatus = modal.querySelector('#scan-status');
  const captureBtn = modal.querySelector('#capture-frame-btn');
  const closeBtn = modal.querySelector('#close-scan-btn');
  const uploadBtn = modal.querySelector('#upload-fallback-btn');
  const fileInput = modal.querySelector('#upload-scan-file');
  const targetSelect = modal.querySelector('#simulate-target-select');

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }

  closeBtn.addEventListener('click', () => {
    stopCamera();
    modal.remove();
  });

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(s => {
      stream = s;
      video.srcObject = s;
      video.classList.remove('hidden');
      placeholder.classList.add('hidden');
      scanLine.classList.remove('hidden');
      scanBoundingBox.classList.remove('hidden');
      scanStatus.innerText = dict.align_issue_prompt;
      captureBtn.classList.remove('hidden');
    })
    .catch(err => {
      console.warn("Webcam access failed or denied, using static upload fallback.", err);
      placeholder.innerHTML = `<span class="material-symbols-outlined text-[32px]">photo_camera_off</span><br>${currentLang === 'hi' ? 'कैमरा उपलब्ध नहीं है' : currentLang === 'mr' ? 'कॅमेरा उपलब्ध नाही' : 'Camera not available'}`;
      scanStatus.innerText = currentLang === 'hi' ? 'कृपया विश्लेषण के लिए एक छवि अपलोड करें।' : currentLang === 'mr' ? 'कृपया विश्लेषणासाठी फोटो अपलोड करा.' : 'Please upload an image to analyze.';
    });

  function captureFrame() {
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    sessionStorage.setItem('civis_captured_img', dataUrl);
    sessionStorage.setItem('civis_sim_category', targetSelect.value);
    sessionStorage.removeItem('civis_captured_name');
    stopCamera();
    modal.remove();
    window.location.href = '/ai_analysis.html';
  }

  captureBtn.addEventListener('click', captureFrame);

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        sessionStorage.setItem('civis_captured_img', dataUrl);
        sessionStorage.setItem('civis_captured_name', file.name);
        sessionStorage.setItem('civis_sim_category', targetSelect.value);
        stopCamera();
        modal.remove();
        window.location.href = '/ai_analysis.html';
      };
      reader.readAsDataURL(file);
    }
  });
}

function openReportModal() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => openReportModalAtCoords(pos.coords.latitude, pos.coords.longitude),
      () => openReportModalAtCoords(18.5204, 73.8567)
    );
  } else {
    openReportModalAtCoords(18.5204, 73.8567);
  }
}

function openReportModalWithDetails(title, category) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => openReportModalAtCoords(pos.coords.latitude, pos.coords.longitude, title, category),
      () => openReportModalAtCoords(18.5204, 73.8567, title, category)
    );
  } else {
    openReportModalAtCoords(18.5204, 73.8567, title, category);
  }
}

function openReportModalAtCoords(lat, lng, defaultTitle = '', defaultCategory = '', defaultLocation = '', defaultDesc = '') {
  defaultTitle = defaultTitle || '';
  defaultCategory = defaultCategory || '';
  defaultLocation = defaultLocation || '';
  defaultDesc = defaultDesc || '';

  // Prevent duplicate modals from spawning
  if (document.getElementById('report-issue-modal')) return;

  const currentLang = localStorage.getItem('civis_language') || 'en';
  const dict = translations[currentLang] || translations.en;

  const modal = document.createElement('div');
  modal.id = 'report-issue-modal';
  modal.className = 'fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-md relative">
      <button class="absolute top-4 right-4 text-outline" onclick="this.closest('.fixed').remove()">✕</button>
      <h3 class="text-xl font-bold text-primary mb-4">${dict.report_urban_issue}</h3>
      <form id="new-complaint-form" class="flex flex-col gap-4">
        <div>
          <label class="block text-label-sm font-semibold mb-1 text-on-surface-variant">${dict.issue_title}</label>
          <input required id="form-title" value="${defaultTitle}" class="w-full p-3 border border-border-subtle rounded-xl outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. Broken Water Pipe">
        </div>
        <div>
          <label class="block text-label-sm font-semibold mb-1 text-on-surface-variant">${dict.category}</label>
          <select required id="form-category" class="w-full p-3 border border-border-subtle rounded-xl outline-none focus:ring-2 focus:ring-primary/40">
            <option value="" disabled ${!defaultCategory ? 'selected' : ''}>${currentLang === 'hi' ? 'श्रेणी चुनें' : currentLang === 'mr' ? 'श्रेणी निवडा' : 'Select Category'}</option>
            <option value="Water Leakage" ${defaultCategory === 'Water Leakage' ? 'selected' : ''}>${dict.water_leakage}</option>
            <option value="Garbage" ${defaultCategory === 'Garbage' ? 'selected' : ''}>${dict.garbage}</option>
            <option value="Streetlights" ${defaultCategory === 'Streetlights' ? 'selected' : ''}>${dict.streetlights}</option>
            <option value="Road Damage" ${defaultCategory === 'Road Damage' ? 'selected' : ''}>${dict.road_damage}</option>
          </select>
        </div>
        <div>
          <label class="block text-label-sm font-semibold mb-1 text-on-surface-variant">${dict.location}</label>
          <input required id="form-location" value="${defaultLocation}" class="w-full p-3 border border-border-subtle rounded-xl outline-none focus:ring-2 focus:ring-primary/40" placeholder="e.g. Kothrud">
        </div>
        <div>
          <label class="block text-label-sm font-semibold mb-1 text-on-surface-variant">${dict.description}</label>
          <textarea required id="form-desc" class="w-full p-3 border border-border-subtle rounded-xl outline-none focus:ring-2 focus:ring-primary/40" placeholder="Describe the issue...">${defaultDesc}</textarea>
        </div>
        <button type="submit" class="w-full py-3 bg-primary text-white font-semibold rounded-xl mt-2">${dict.submit_report}</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.querySelector('#form-title').value.trim();
    const category = form.querySelector('#form-category').value.trim();
    const location = form.querySelector('#form-location').value.trim();
    const description = form.querySelector('#form-desc').value.trim();

    const localUser = JSON.parse(sessionStorage.getItem('civis_user') || '{}');
    const reported_by = localUser.name || 'Anonymous';
    const reported_by_email = localUser.email || 'N/A';
    const reported_by_phone = localUser.phone || 'N/A';

    const isDefaultCoords = (lat === 18.5204 && lng === 73.8567);
    const newIssue = {
      title,
      category,
      location,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: "Assigned",
      progress: 10,
      criticality: "Moderate",
      description,
      lat: isDefaultCoords ? lat + (Math.random() - 0.5) * 0.01 : lat,
      lng: isDefaultCoords ? lng + (Math.random() - 0.5) * 0.01 : lng,
      reported_by: reported_by,
      reported_by_email: reported_by_email,
      reported_by_phone: reported_by_phone
    };

    const { data, error } = await supabaseClient.from('issues').insert([newIssue]);
    if (error) {
      alert(`Error submitting report: ${error.message}`);
    } else {
      alert(`Report submitted successfully!`);
      modal.remove();

      if (window.location.pathname.includes('my_complaints')) {
        await renderComplaintsList();
      } else if (window.location.pathname.includes('smart_map')) {
        await renderMapMarkers();
      } else {
        window.location.href = '/my_complaints.html';
      }
    }
  });
}

// Simulated active calling dialer modal for emergency reports
function openDialerModal(serviceName) {
  let emergencyNumber = '112';
  if (serviceName.includes('Accident')) emergencyNumber = '100';
  else if (serviceName.includes('Fire')) emergencyNumber = '101';
  else if (serviceName.includes('Medical')) emergencyNumber = '108';
  else if (serviceName.includes('Flood')) emergencyNumber = '1070';

  const modal = document.createElement('div');
  modal.id = 'emergency-dialer-modal';
  modal.className = 'fixed inset-0 z-[200] bg-[#0c1015]/95 flex flex-col items-center justify-between py-16 px-6 text-white transition-opacity duration-300 animate-in fade-in';
  
  modal.innerHTML = `
    <!-- Top Bar -->
    <div class="w-full flex items-center justify-center gap-2 opacity-65">
      <span class="material-symbols-outlined text-sm animate-pulse">lock</span>
      <span class="text-xs uppercase tracking-widest font-semibold">End-to-End Encrypted Emergency Line</span>
    </div>

    <!-- Active Call Header -->
    <div class="flex flex-col items-center gap-4 mt-8">
      <div class="relative w-28 h-28 flex items-center justify-center">
        <div class="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
        <div class="absolute inset-2 bg-primary/10 rounded-full animate-pulse"></div>
        <div class="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/30 border border-primary/20">
          <span class="material-symbols-outlined text-[40px] text-white">call</span>
        </div>
      </div>
      
      <div class="text-center mt-4">
        <h2 class="font-headline-md text-2xl font-bold tracking-tight">${serviceName}</h2>
        <p class="text-primary font-bold text-lg mt-1 tracking-wider">${emergencyNumber}</p>
        <p id="call-status" class="text-sm text-outline-variant mt-2 font-medium tracking-wide">Connecting to local dispatch...</p>
      </div>
    </div>

    <!-- Dialer Keypad Grid -->
    <div class="grid grid-cols-3 gap-x-8 gap-y-6 max-w-xs mx-auto opacity-70">
      <div class="flex flex-col items-center justify-center">
        <button class="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]">mic_off</span>
        </button>
        <span class="text-[11px] mt-1 font-semibold text-outline-variant">Mute</span>
      </div>
      <div class="flex flex-col items-center justify-center">
        <button class="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]">grid_on</span>
        </button>
        <span class="text-[11px] mt-1 font-semibold text-outline-variant">Keypad</span>
      </div>
      <div class="flex flex-col items-center justify-center">
        <button class="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]">volume_up</span>
        </button>
        <span class="text-[11px] mt-1 font-semibold text-outline-variant">Speaker</span>
      </div>
    </div>

    <!-- End Call Button Section -->
    <div class="w-full flex flex-col items-center gap-6">
      <button id="end-call-btn" class="w-16 h-16 rounded-full bg-critical hover:bg-critical/90 active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-critical/20">
        <span class="material-symbols-outlined text-[28px] text-white rotate-[135deg]">call</span>
      </button>
      <p class="text-xs text-outline-variant font-medium tracking-wide">Click to end call and transmit coordinate logs</p>
    </div>
  `;

  document.body.appendChild(modal);

  let seconds = 0;
  let timerInterval = null;

  // Simulate call stages
  setTimeout(() => {
    const statusEl = document.getElementById('call-status');
    if (statusEl) {
      statusEl.innerText = "Ringing...";
    }
  }, 1500);

  setTimeout(() => {
    const statusEl = document.getElementById('call-status');
    if (statusEl) {
      statusEl.innerText = "Active • 00:00";
      statusEl.classList.remove('text-outline-variant');
      statusEl.classList.add('text-success');
      
      timerInterval = setInterval(() => {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        if (statusEl) statusEl.innerText = `Active • ${mins}:${secs}`;
      }, 1000);
    }
  }, 3500);

  // End Call Click handler
  modal.querySelector('#end-call-btn').addEventListener('click', () => {
    if (timerInterval) clearInterval(timerInterval);
    modal.remove();

    // Show confirmation modal
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
      confirmModal.classList.remove('hidden');
      const modalContent = confirmModal.querySelector('div:last-child');
      if (modalContent) {
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      }
    }
  });
}
