// Configuration File
const APP_CONFIG = {
    APP_NAME: "نظام إدارة القضايا",
    VERSION: "2.0.0",
    PASSWORD: "Lawyer@301884",
    GOOGLE_CALENDAR_EMAIL: "mahmoud.legal@gmail.com",
    
    // Colors
    COLORS: {
        DARK_BLACK: "#000000",
        GOLD: "#D4AF37",
        GOLD_LIGHT: "#F4E4A6",
        GOLD_DARK: "#B8860B"
    },
    
    // Client Roles
    CLIENT_ROLES: [
        "مدعي",
        "مدعى عليه", 
        "مستانف",
        "مستانف ضده",
        "طاعن",
        "مطعون ضده",
        "متهم",
        "محني عليه",
        "مدعي بالحق المدني",
        "شاكي",
        "مشكو في حقه",
        "خصم مدخل",
        "متدخل هجومي",
        "متدخل انضمامي"
    ],
    
    // Case Types
    CASE_TYPES: [
        "مدني",
        "جنائي", 
        "احوال شخصية",
        "تجاري",
        "ايجارات",
        "اداري",
        "شهر عقاري"
    ],
    
    // Case Statuses
    CASE_STATUSES: [
        "جديدة",
        "مؤجلة",
        "موقوفة", 
        "مشطوبة",
        "محجوزة للحكم",
        "حكم"
    ],
    
    // Courts (Example - يمكن إضافة المزيد)
    COURTS: [
        "محكمة الرياض",
        "محكمة جدة",
        "محكمة الدمام",
        "محكمة مكة المكرمة",
        "محكمة المدينة المنورة",
        "محكمة الأحساء",
        "محكمة الطائف",
        "محكمة القصيم"
    ],
    
    // Circuits (دوائر المحاكم)
    CIRCUITS: [
        "الدائرة الأولى",
        "الدائرة الثانية", 
        "الدائرة الثالثة",
        "الدائرة الرابعة",
        "الدائرة الخامسة",
        "الدائرة التجارية",
        "الدائرة الجزائية",
        "الدائرة المدنية"
    ],
    
    // Session Statuses
    SESSION_STATUSES: [
        "مجدولة",
        "منعقدة",
        "منتهية",
        "ملغاة",
        "مؤجلة"
    ]
};

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
}
