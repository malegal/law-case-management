// Main Application Logic
class CaseManagementApp {
    constructor() {
        this.currentTab = 'dashboardTab';
        this.currentCaseId = null;
        this.currentSessionId = null;
        this.currentSessionFilter = 'all'; // 'all', 'week', 'month'
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.setupOnlineListener();
        this.loadDashboard();
        this.checkPWAInstall();
    }

    setupEventListeners() {
        // Auto-update date and time every minute
        setInterval(() => this.updateDateTime(), 60000);
        
        // Check for sync every 30 seconds if online
        setInterval(() => {
            if (navigator.onLine) {
                DatabaseInstance.syncPendingOperations();
            }
        }, 30000);
    }

    setupOnlineListener() {
        window.addEventListener('online', () => {
            this.showNotification('تم استعادة الاتصال بالإنترنت', 'success');
            setTimeout(() => this.refreshCurrentTab(), 2000);
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('فقد الاتصال بالإنترنت - البيانات تحفظ محلياً', 'warning');
        });
    }

    checkPWAInstall() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            const installBtn = document.getElementById('installBtn');
            if (installBtn) installBtn.style.display = 'none';
        }
    }

    updateDateTime() {
        const now = new Date();
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');
        
        if (dateElement) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = now.toLocaleDateString('ar-SA', options);
        }
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        }
    }

    showTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        this.currentTab = tabId;
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.classList.add('active');
            this.loadTabContent(tabId);
        }
        
        // Activate corresponding button
        const activeBtn = document.querySelector(`[onclick="showTab('${tabId}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    loadTabContent(tabId) {
        switch (tabId) {
            case 'dashboardTab':
                this.loadDashboard();
                break;
            case 'casesTab':
                this.loadCasesTab();
                break;
            case 'sessionsTab':
                this.loadSessionsTab();
                break;
            case 'reportsTab':
                this.loadReportsTab();
                break;
        }
    }

    refreshCurrentTab() {
        this.loadTabContent(this.currentTab);
    }

    async loadDashboard() {
        try {
            const stats = await DatabaseInstance.getStatistics();
            this.updateDashboardStats(stats);
            
            const upcomingSessions = await DatabaseInstance.getUpcomingSessions(5);
            this.updateUpcomingSessions(upcomingSessions);
            
            this.updateReminders(upcomingSessions);
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('totalCases').textContent = stats.totalCases;
        document.getElementById('todaySessions').textContent = stats.todaySessions;
        document.getElementById('pendingCases').textContent = stats.pendingCases;
        document.getElementById('urgentCases').textContent = stats.urgentCases;
    }

    updateUpcomingSessions(sessions) {
        const container = document.getElementById('upcomingSessionsList');
        if (!container) return;
        
        if (sessions.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد جلسات قادمة</p>';
            return;
        }
        
        let html = '';
        sessions.forEach(session => {
            const date = new Date(session.sessionDate).toLocaleDateString('ar-SA');
            const time = session.sessionTime || '--:--';
            
            html += `
                <div class="session-item">
                    <div class="session-info">
                        <strong>${session.caseCode || 'غير معروف'}</strong>
                        <span>${date} - ${time}</span>
                        <small>${session.court || 'غير محدد'}</small>
                    </div>
                    <div class="session-meta">
                        <span class="case-status ${session.caseStatus === 'مؤجلة' ? 'warning' : 'info'}">
                            ${session.caseStatus || 'مجدولة'}
                        </span>
                        <button class="btn-small" onclick="app.addToGoogleCalendar(${session.id})">
                            <i class="fas fa-calendar-plus"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    updateReminders(sessions) {
        const container = document.getElementById('remindersList');
        if (!container) return;
        
        let html = '';
        const today = new Date();
        
        // Check for sessions today
        const todaySessions = sessions.filter(s => {
            const sessionDate = new Date(s.sessionDate);
            return sessionDate.toDateString() === today.toDateString();
        });
        
        if (todaySessions.length > 0) {
            html += `
                <div class="reminder-item urgent">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>لديك ${todaySessions.length} جلسة اليوم</span>
                </div>
            `;
        }
        
        // Check for sessions tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowSessions = sessions.filter(s => {
            const sessionDate = new Date(s.sessionDate);
            return sessionDate.toDateString() === tomorrow.toDateString();
        });
        
        if (tomorrowSessions.length > 0) {
            html += `
                <div class="reminder-item warning">
                    <i class="fas fa-clock"></i>
                    <span>لديك ${tomorrowSessions.length} جلسة غداً</span>
                </div>
            `;
        }
        
        if (html === '') {
            html = '<div class="reminder-item"><i class="fas fa-check-circle"></i> <span>لا توجد تذكيرات حالياً</span></div>';
        }
        
        container.innerHTML = html;
    }

    async loadCasesTab() {
        const tabContent = document.getElementById('casesTab');
        tabContent.innerHTML = `
            <div class="tab-container">
                <div class="tab-header gold-frame">
                    <h2 class="gold-shiny"><i class="fas fa-folder"></i> إدارة القضايا</h2>
                    <div class="header-actions">
                        <button class="gold-shiny-btn" onclick="app.openCaseForm()">
                            <i class="fas fa-plus"></i> إضافة قضية جديدة
                        </button>
                        <div class="search-box">
                            <input type="text" id="caseSearch" placeholder="بحث في القضايا..." class="gold-input">
                            <i class="fas fa-search gold-shiny"></i>
                        </div>
                    </div>
                </div>
                
                <div class="filters-bar gold-frame">
                    <select id="caseTypeFilter" class="filter-select">
                        <option value="">جميع الأنواع</option>
                        ${APP_CONFIG.CASE_TYPES.map(type => `<option value="${type}">${type}</option>`).join('')}
                    </select>
                    <select id="courtFilter" class="filter-select">
                        <option value="">جميع المحاكم</option>
                        ${APP_CONFIG.COURTS.map(court => `<option value="${court}">${court}</option>`).join('')}
                    </select>
                    <button class="btn-small gold-shiny-btn" onclick="app.filterCases()">تصفية</button>
                    <button class="btn-small gold-shiny-btn" onclick="app.resetCaseFilters()">إعادة تعيين</button>
                </div>
                
                <div class="cases-list" id="casesList">
                    <p class="loading-text">جارٍ تحميل القضايا...</p>
                </div>
            </div>
        `;
        
        await this.loadCasesList();
        
        // Setup search
        const searchInput = document.getElementById('caseSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterCases();
            });
        }
        
        // Setup filter change listeners
        ['caseTypeFilter', 'courtFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterCases());
            }
        });
    }

    async loadCasesList() {
        try {
            const cases = await DatabaseInstance.getCases();
            this.displayCases(cases);
        } catch (error) {
            console.error('Error loading cases:', error);
            this.showNotification('حدث خطأ أثناء تحميل القضايا', 'error');
        }
    }

    async filterCases() {
        try {
            const searchQuery = document.getElementById('caseSearch')?.value || '';
            const caseType = document.getElementById('caseTypeFilter')?.value || '';
            const courtName = document.getElementById('courtFilter')?.value || '';
            
            const filters = {
                caseType,
                courtName
            };
            
            const cases = await DatabaseInstance.searchCases(searchQuery, filters);
            this.displayCases(cases);
            
        } catch (error) {
            console.error('Error filtering cases:', error);
        }
    }

    resetCaseFilters() {
        document.getElementById('caseSearch').value = '';
        document.getElementById('caseTypeFilter').value = '';
        document.getElementById('courtFilter').value = '';
        this.loadCasesList();
    }

    displayCases(cases) {
        const container = document.getElementById('casesList');
        if (!container) return;
        
        if (cases.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد قضايا</p>';
            return;
        }
        
        let html = '';
        cases.forEach(caseItem => {
            const statusClass = caseItem.synced ? 'synced' : 'local';
            const statusText = caseItem.synced ? 'مزامن' : 'محلي';
            
            html += `
                <div class="case-card gold-frame">
                    <div class="case-header">
                        <div class="case-code gold-shiny">${caseItem.caseCode}</div>
                        <div class="case-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="case-body">
                        <h4 class="gold-shiny">${caseItem.clientName}</h4>
                        <p><i class="fas fa-phone gold-shiny"></i> ${caseItem.clientPhone}</p>
                        <p><i class="fas fa-balance-scale gold-shiny"></i> ${caseItem.caseType || 'غير محدد'}</p>
                        <p><i class="fas fa-gavel gold-shiny"></i> ${caseItem.courtName || 'غير محدد'}</p>
                        <p><i class="fas fa-file-alt gold-shiny"></i> ${caseItem.caseNumber}/${caseItem.caseYear}</p>
                        <p><i class="fas fa-user-tie gold-shiny"></i> ${caseItem.clientRole || 'غير محدد'}</p>
                    </div>
                    <div class="case-actions">
                        <button class="btn-small gold-shiny-btn" onclick="app.viewCaseDetails(${caseItem.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn-small gold-shiny-btn" onclick="app.editCase(${caseItem.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async loadSessionsTab() {
        const tabContent = document.getElementById('sessionsTab');
        tabContent.innerHTML = `
            <div class="tab-container">
                <div class="tab-header gold-frame">
                    <h2 class="gold-shiny"><i class="fas fa-calendar-alt"></i> إدارة الجلسات</h2>
                    <div class="header-actions">
                        <button class="gold-shiny-btn" onclick="app.openSessionForm()">
                            <i class="fas fa-plus"></i> إضافة جلسة جديدة
                        </button>
                        <div class="search-box">
                            <input type="text" id="sessionSearch" placeholder="بحث في الجلسات..." class="gold-input">
                            <i class="fas fa-search gold-shiny"></i>
                        </div>
                    </div>
                </div>
                
                <div class="session-filters gold-frame">
                    <button class="session-filter-btn ${this.currentSessionFilter === 'all' ? 'active' : ''}" 
                            onclick="app.setSessionFilter('all')">
                        جميع الجلسات
                    </button>
                    <button class="session-filter-btn ${this.currentSessionFilter === 'week' ? 'active' : ''}" 
                            onclick="app.setSessionFilter('week')">
                        جلسات هذا الأسبوع
                    </button>
                    <button class="session-filter-btn ${this.currentSessionFilter === 'month' ? 'active' : ''}" 
                            onclick="app.setSessionFilter('month')">
                        جلسات هذا الشهر
                    </button>
                </div>
                
                <div class="filters-bar gold-frame">
                    <input type="date" id="sessionDateFilter" class="filter-select">
                    <select id="sessionCourtFilter" class="filter-select">
                        <option value="">جميع المحاكم</option>
                        ${APP_CONFIG.COURTS.map(court => `<option value="${court}">${court}</option>`).join('')}
                    </select>
                    <select id="sessionTypeFilter" class="filter-select">
                        <option value="">جميع الأنواع</option>
                        <option value="جلسة عادية">جلسة عادية</option>
                        <option value="جلسة استماع">جلسة استماع</option>
                        <option value="جلسة حكم">جلسة حكم</option>
                        <option value="جلسة تحقيق">جلسة تحقيق</option>
                    </select>
                    <button class="btn-small gold-shiny-btn" onclick="app.filterSessions()">تصفية</button>
                    <button class="btn-small gold-shiny-btn" onclick="app.resetSessionFilters()">إعادة تعيين</button>
                </div>
                
                <div class="sessions-list" id="sessionsList">
                    <p class="loading-text">جارٍ تحميل الجلسات...</p>
                </div>
            </div>
        `;
        
        await this.loadSessionsList();
        
        // Setup search
        const searchInput = document.getElementById('sessionSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterSessions();
            });
        }
    }

    setSessionFilter(filter) {
        this.currentSessionFilter = filter;
        this.loadSessionsList();
        
        // Update active buttons
        document.querySelectorAll('.session-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    async loadSessionsList() {
        try {
            let sessions = [];
            
            switch (this.currentSessionFilter) {
                case 'week':
                    sessions = await DatabaseInstance.getUpcomingSessions(7);
                    break;
                case 'month':
                    const today = new Date();
                    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                    const diffTime = Math.abs(nextMonth - today);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    sessions = await DatabaseInstance.getUpcomingSessions(diffDays);
                    break;
                default:
                    sessions = await DatabaseInstance.getSessions();
            }
            
            this.displaySessions(sessions);
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showNotification('حدث خطأ أثناء تحميل الجلسات', 'error');
        }
    }

    async filterSessions() {
        try {
            const searchQuery = document.getElementById('sessionSearch')?.value || '';
            const dateFilter = document.getElementById('sessionDateFilter')?.value || '';
            const courtFilter = document.getElementById('sessionCourtFilter')?.value || '';
            const typeFilter = document.getElementById('sessionTypeFilter')?.value || '';
            
            const filters = {};
            if (dateFilter) filters.dateFrom = dateFilter;
            if (courtFilter) filters.court = courtFilter;
            if (typeFilter) filters.sessionType = typeFilter;
            
            const sessions = await DatabaseInstance.searchSessions(searchQuery, filters);
            this.displaySessions(sessions);
            
        } catch (error) {
            console.error('Error filtering sessions:', error);
        }
    }

    resetSessionFilters() {
        document.getElementById('sessionSearch').value = '';
        document.getElementById('sessionDateFilter').value = '';
        document.getElementById('sessionCourtFilter').value = '';
        document.getElementById('sessionTypeFilter').value = '';
        this.loadSessionsList();
    }

    displaySessions(sessions) {
        const container = document.getElementById('sessionsList');
        if (!container) return;
        
        if (sessions.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد جلسات</p>';
            return;
        }
        
        let html = '';
        sessions.forEach(session => {
            const date = new Date(session.sessionDate).toLocaleDateString('ar-SA');
            const time = session.sessionTime || '--:--';
            const statusClass = session.synced ? 'synced' : 'local';
            const statusText = session.synced ? 'مزامن' : 'محلي';
            
            html += `
                <div class="session-card gold-frame">
                    <div class="session-header">
                        <div class="session-date">
                            <i class="fas fa-calendar gold-shiny"></i> ${date}
                            <span class="session-time">${time}</span>
                        </div>
                        <div class="session-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="session-body">
                        <h4 class="gold-shiny">${session.caseCode || 'غير معروف'}</h4>
                        <p><i class="fas fa-user gold-shiny"></i> ${session.clientName || 'غير معروف'}</p>
                        <p><i class="fas fa-gavel gold-shiny"></i> ${session.court || 'غير محدد'}</p>
                        <p><i class="fas fa-file-alt gold-shiny"></i> ${session.caseNumber || 'غير محدد'}</p>
                        <p><i class="fas fa-clipboard-check gold-shiny"></i> ${session.caseStatus || 'غير محدد'}</p>
                        <p><i class="fas fa-sticky-note gold-shiny"></i> ${session.decision || 'لا يوجد قرار'}</p>
                    </div>
                    <div class="session-actions">
                        <button class="btn-small gold-shiny-btn" onclick="app.viewSessionDetails(${session.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn-small gold-shiny-btn" onclick="app.addToGoogleCalendar(${session.id})">
                            <i class="fas fa-calendar-plus"></i> تقويم
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async addToGoogleCalendar(sessionId) {
        try {
            const sessions = await DatabaseInstance.getSessions();
            const session = sessions.find(s => s.id == sessionId);
            
            if (!session) {
                this.showNotification('الجلسة غير موجودة', 'error');
                return;
            }
            
            // Format date and time for Google Calendar
            const startDate = new Date(session.sessionDate);
            if (session.sessionTime) {
                const [hours, minutes] = session.sessionTime.split(':');
                startDate.setHours(parseInt(hours), parseInt(minutes));
            } else {
                startDate.setHours(10, 0); // Default time 10:00 AM
            }
            
            const endDate = new Date(startDate.getTime() + (60 * 60 * 1000)); // 1 hour duration
            
            // Create Google Calendar URL
            const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`جلسة قضائية: ${session.caseCode}`)}&dates=${this.formatGoogleCalendarDate(startDate)}/${this.formatGoogleCalendarDate(endDate)}&details=${encodeURIComponent(`قضية: ${session.caseCode}
            العميل: ${session.clientName}
            المحكمة: ${session.court}
            القرار: ${session.decision || 'لم يتخذ'}
            ملاحظات: ${session.sessionNotes || 'لا يوجد'}`)}&location=${encodeURIComponent(session.court || 'المحكمة')}&sf=true&output=xml`;
            
            // Open in new window
            window.open(googleCalendarUrl, '_blank');
            
            this.showNotification('تم فتح تقويم جوجل لإضافة الجلسة', 'success');
            
        } catch (error) {
            console.error('Error adding to Google Calendar:', error);
            this.showNotification('حدث خطأ أثناء فتح تقويم جوجل', 'error');
        }
    }

    formatGoogleCalendarDate(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0];
    }

    async viewSessionDetails(sessionId) {
        try {
            const sessions = await DatabaseInstance.getSessions();
            const session = sessions.find(s => s.id == sessionId);
            
            if (!session) {
                this.showNotification('الجلسة غير موجودة', 'error');
                return;
            }
            
            const date = new Date(session.sessionDate).toLocaleDateString('ar-SA');
            const time = session.sessionTime || '--:--';
            
            const detailsHtml = `
                <div class="session-details">
                    <div class="detail-section">
                        <h4 class="gold-shiny">معلومات الجلسة</h4>
                        <p><strong>كود القضية:</strong> ${session.caseCode || 'غير معروف'}</p>
                        <p><strong>تاريخ الجلسة:</strong> ${date}</p>
                        <p><strong>وقت الجلسة:</strong> ${time}</p>
                        <p><strong>المحكمة:</strong> ${session.court || 'غير محدد'}</p>
                        <p><strong>الدائرة:</strong> ${session.circuit || 'غير محدد'}</p>
                        <p><strong>حالة القضية:</strong> ${session.caseStatus || 'غير محدد'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4 class="gold-shiny">تفاصيل الجلسة</h4>
                        <p><strong>القرار:</strong></p>
                        <p>${session.decision || 'لا يوجد قرار'}</p>
                        <p><strong>ملاحظات:</strong></p>
                        <p>${session.sessionNotes || 'لا يوجد ملاحظات'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4 class="gold-shiny">معلومات الأشخاص</h4>
                        <p><strong>العميل:</strong> ${session.clientName || 'غير معروف'}</p>
                        <p><strong>صفة العميل:</strong> ${session.clientRole || 'غير محدد'}</p>
                        <p><strong>رقم هاتف العميل:</strong> ${session.clientPhone || 'غير معروف'}</p>
                        <p><strong>الخصم:</strong> ${session.opponentName || 'غير محدد'}</p>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="gold-shiny-btn" onclick="app.addToGoogleCalendar(${session.id})">
                            <i class="fas fa-calendar-plus"></i> إضافة لتقويم جوجل
                        </button>
                        <button class="btn gold-shiny-btn" onclick="closeModal('sessionModal')">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('sessionModalBody').innerHTML = detailsHtml;
            document.getElementById('sessionModal').style.display = 'flex';
            
        } catch (error) {
            console.error('Error viewing session details:', error);
            this.showNotification('حدث خطأ أثناء عرض تفاصيل الجلسة', 'error');
        }
    }

    // ... باقي الدوال كما هي في الكود السابق مع تعديلات بسيطة للأزرار والألوان

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }
        
        notification.timeoutId = setTimeout(() => {
            notification.textContent = '';
            notification.className = 'notification';
        }, 5000);
    }
}

// Initialize the app
const app = new CaseManagementApp();

// Global functions
window.checkPassword = function() {
    const password = document.getElementById('passwordInput').value;
    const loginError = document.getElementById('loginError');
    
    if (password === APP_CONFIG.PASSWORD) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        app.updateDateTime();
    } else {
        loginError.textContent = 'كلمة المرور غير صحيحة';
    }
};

window.logout = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('passwordInput').value = '';
        document.getElementById('loginError').textContent = '';
    }
};

window.showTab = (tabId) => app.showTab(tabId);

window.installPWA = function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                document.getElementById('installBtn').style.display = 'none';
            }
            deferredPrompt = null;
        });
    }
};

window.exportData = async function() {
    try {
        const data = await DatabaseInstance.exportData();
        if (data) {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            app.showNotification('تم تصدير البيانات بنجاح', 'success');
        }
    } catch (error) {
        app.showNotification('حدث خطأ أثناء تصدير البيانات', 'error');
    }
};

window.syncData = function() {
    if (navigator.onLine) {
        DatabaseInstance.syncAllData();
    } else {
        app.showNotification('غير متصل بالإنترنت', 'warning');
    }
};

window.printReport = function() {
    window.print();
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const caseModal = document.getElementById('caseModal');
    const sessionModal = document.getElementById('sessionModal');
    
    if (caseModal && event.target === caseModal) {
        caseModal.style.display = 'none';
    }
    if (sessionModal && event.target === sessionModal) {
        sessionModal.style.display = 'none';
    }
});
