// Main Application Logic
class CaseManagementApp {
    constructor() {
        this.currentTab = 'casesTab';
        this.currentDate = moment().locale('ar');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.loadTabContent();
    }

    setupEventListeners() {
        // Auto-update date and time every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    updateDateTime() {
        this.currentDate = moment().locale('ar');
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');
        
        if (dateElement) {
            dateElement.textContent = this.currentDate.format('dddd، D MMMM YYYY');
        }
        
        if (timeElement) {
            timeElement.textContent = this.currentDate.format('hh:mm A');
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
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.classList.add('active');
            this.currentTab = tabId;
            
            // Load tab content if empty
            if (tab.innerHTML.trim() === '') {
                this.loadTabContent();
            }
        }
        
        // Activate corresponding button
        const activeBtn = document.querySelector(`[onclick="showTab('${tabId}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    loadTabContent() {
        switch (this.currentTab) {
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

    loadCasesTab() {
        const tabContent = document.getElementById('casesTab');
        tabContent.innerHTML = `
            <div class="form-container">
                <div class="form-section">
                    <h2 class="form-title gold-text">إضافة/تعديل قضية</h2>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">اسم العميل *</label>
                            <input type="text" id="clientName" class="glass-input" 
                                   placeholder="أدخل اسم العميل" 
                                   oninput="app.autoFillClientInfo()">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">رقم هاتف العميل *</label>
                            <input type="tel" id="clientPhone" class="glass-input" 
                                   placeholder="أدخل رقم الهاتف" 
                                   oninput="app.autoFillClientInfo()">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">بريد العميل الإلكتروني</label>
                            <input type="email" id="clientEmail" class="glass-input" 
                                   placeholder="example@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">صفة العميل</label>
                            <select id="clientRole" class="form-select">
                                <option value="">اختر صفة العميل</option>
                                ${APP_CONFIG.CLIENT_ROLES.map(role => 
                                    `<option value="${role}">${role}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">اسم الخصم</label>
                            <input type="text" id="opponentName" class="glass-input" 
                                   placeholder="اسم الخصم في القضية">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">نوع القضية</label>
                            <select id="caseType" class="form-select">
                                <option value="">اختر نوع القضية</option>
                                ${APP_CONFIG.CASE_TYPES.map(type => 
                                    `<option value="${type}">${type}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">رقم القضية *</label>
                            <input type="text" id="caseNumber" class="glass-input" 
                                   placeholder="رقم القضية بالمحكمة">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">سنة القضية *</label>
                            <input type="number" id="caseYear" class="glass-input" 
                                   placeholder="سنة القضية" 
                                   min="2000" max="2100" 
                                   value="${new Date().getFullYear()}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">المحكمة</label>
                            <select id="courtName" class="form-select">
                                <option value="">اختر المحكمة</option>
                                ${APP_CONFIG.COURTS.map(court => 
                                    `<option value="${court}">${court}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">الدائرة</label>
                            <select id="circuit" class="form-select">
                                <option value="">اختر الدائرة</option>
                                ${APP_CONFIG.CIRCUITS.map(circuit => 
                                    `<option value="${circuit}">${circuit}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">موضوع القضية</label>
                        <textarea id="caseSubject" class="glass-input" 
                                  placeholder="وصف مختصر لموضوع القضية" 
                                  rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">ملاحظات</label>
                        <textarea id="caseNotes" class="glass-input" 
                                  placeholder="ملاحظات إضافية عن القضية" 
                                  rows="2"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="app.saveCase()" class="gold-btn">
                            💾 حفظ القضية
                        </button>
                        <button onclick="app.updateCase()" class="gold-btn">
                            ✏️ تعديل القضية
                        </button>
                        <button onclick="app.deleteCase()" class="gold-btn">
                            🗑️ حذف القضية
                        </button>
                        <button onclick="app.clearCaseForm()" class="gold-btn">
                            ♻️ مسح النموذج
                        </button>
                    </div>
                </div>
                
                <div class="form-section">
                    <h2 class="form-title gold-text">القضايا المسجلة</h2>
                    <div id="casesList" class="table-container">
                        <!-- Cases will be loaded here -->
                    </div>
                </div>
            </div>
        `;
        
        this.loadCasesList();
    }

    loadSessionsTab() {
        const tabContent = document.getElementById('sessionsTab');
        tabContent.innerHTML = `
            <div class="form-container">
                <div class="form-section">
                    <h2 class="form-title gold-text">إدارة الجلسات</h2>
                    
                    <div class="search-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">كود القضية</label>
                                <input type="text" id="searchCaseCode" class="glass-input" 
                                       placeholder="أدخل كود القضية" 
                                       oninput="app.autoFillSessionInfo()">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">اسم العميل</label>
                                <input type="text" id="searchClientName" class="glass-input" 
                                       placeholder="اسم العميل" 
                                       oninput="app.autoFillSessionInfo()">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">رقم هاتف العميل</label>
                                <input type="tel" id="searchClientPhone" class="glass-input" 
                                       placeholder="رقم الهاتف" 
                                       oninput="app.autoFillSessionInfo()">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">كود القضية *</label>
                            <input type="text" id="sessionCaseCode" class="glass-input" 
                                   placeholder="كود القضية">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">رقم القضية</label>
                            <input type="text" id="sessionCaseNumber" class="glass-input" 
                                   placeholder="رقم القضية">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">سنة القضية</label>
                            <input type="number" id="sessionCaseYear" class="glass-input" 
                                   placeholder="سنة القضية" 
                                   value="${new Date().getFullYear()}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">المحكمة</label>
                            <select id="sessionCourt" class="form-select">
                                <option value="">اختر المحكمة</option>
                                ${APP_CONFIG.COURTS.map(court => 
                                    `<option value="${court}">${court}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">الدائرة</label>
                            <select id="sessionCircuit" class="form-select">
                                <option value="">اختر الدائرة</option>
                                ${APP_CONFIG.CIRCUITS.map(circuit => 
                                    `<option value="${circuit}">${circuit}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">اسم العميل</label>
                            <input type="text" id="sessionClientName" class="glass-input" 
                                   placeholder="اسم العميل">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">رقم الهاتف</label>
                            <input type="tel" id="sessionClientPhone" class="glass-input" 
                                   placeholder="رقم الهاتف">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">صفة العميل</label>
                            <select id="sessionClientRole" class="form-select">
                                <option value="">اختر الصفة</option>
                                ${APP_CONFIG.CLIENT_ROLES.map(role => 
                                    `<option value="${role}">${role}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">اسم الخصم</label>
                            <input type="text" id="sessionOpponent" class="glass-input" 
                                   placeholder="اسم الخصم">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">حالة القضية</label>
                            <select id="sessionCaseStatus" class="form-select">
                                <option value="">اختر الحالة</option>
                                ${APP_CONFIG.CASE_STATUSES.map(status => 
                                    `<option value="${status}">${status}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">تاريخ الجلسة *</label>
                            <input type="date" id="sessionDate" class="glass-input" 
                                   value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">وقت الجلسة</label>
                            <input type="time" id="sessionTime" class="glass-input" 
                                   value="09:00">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">القرار</label>
                        <textarea id="sessionDecision" class="glass-input" 
                                  placeholder="قرار الجلسة" 
                                  rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">ملاحظات</label>
                        <textarea id="sessionNotes" class="glass-input" 
                                  placeholder="ملاحظات عن الجلسة" 
                                  rows="2"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="app.saveSession()" class="gold-btn">
                            💾 حفظ الجلسة
                        </button>
                        <button onclick="app.updateSession()" class="gold-btn">
                            ✏️ تعديل الجلسة
                        </button>
                        <button onclick="app.deleteSession()" class="gold-btn">
                            🗑️ حذف الجلسة
                        </button>
                        <button onclick="app.addToGoogleCalendar()" class="gold-btn">
                            📅 إضافة لتقويم جوجل
                        </button>
                        <button onclick="app.clearSessionForm()" class="gold-btn">
                            ♻️ مسح النموذج
                        </button>
                    </div>
                </div>
                
                <div class="calendar-buttons">
                    <button onclick="app.loadThisWeekSessions()" class="calendar-btn">
                        📋 قضايا الأسبوع الحالي
                    </button>
                    <button onclick="app.loadThisMonthSessions()" class="calendar-btn">
                        📅 قضايا الشهر الحالي
                    </button>
                    <button onclick="app.printSessionsPDF()" class="calendar-btn">
                        🖨️ طباعة PDF
                    </button>
                </div>
                
                <div class="form-section">
                    <h2 class="form-title gold-text">قائمة الجلسات</h2>
                    <div id="sessionsList" class="table-container">
                        <!-- Sessions will be loaded here -->
                    </div>
                </div>
            </div>
        `;
        
        this.loadSessionsList();
    }

    loadReportsTab() {
        const tabContent = document.getElementById('reportsTab');
        tabContent.innerHTML = `
            <div class="form-container">
                <div class="search-section">
                    <h2 class="form-title gold-text">البحث المتقدم</h2>
                    
                    <div class="search-grid">
                        <div class="form-group">
                            <label class="form-label">بحث باسم العميل</label>
                            <input type="text" id="searchByName" class="glass-input" 
                                   placeholder="اسم العميل">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">بحث برقم الهاتف</label>
                            <input type="tel" id="searchByPhone" class="glass-input" 
                                   placeholder="رقم الهاتف">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">بحث بكود القضية</label>
                            <input type="text" id="searchByCaseCode" class="glass-input" 
                                   placeholder="كود القضية">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">بحث برقم القضية</label>
                            <input type="text" id="searchByCaseNumber" class="glass-input" 
                                   placeholder="رقم القضية">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">سنة القضية</label>
                            <input type="number" id="searchByYear" class="glass-input" 
                                   placeholder="السنة">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">حالة القضية</label>
                            <select id="searchByStatus" class="form-select">
                                <option value="">جميع الحالات</option>
                                ${APP_CONFIG.CASE_STATUSES.map(status => 
                                    `<option value="${status}">${status}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">نوع القضية</label>
                            <select id="searchByType" class="form-select">
                                <option value="">جميع الأنواع</option>
                                ${APP_CONFIG.CASE_TYPES.map(type => 
                                    `<option value="${type}">${type}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">المحكمة</label>
                            <select id="searchByCourt" class="form-select">
                                <option value="">جميع المحاكم</option>
                                ${APP_CONFIG.COURTS.map(court => 
                                    `<option value="${court}">${court}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">من تاريخ</label>
                            <input type="date" id="dateFrom" class="glass-input">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">إلى تاريخ</label>
                            <input type="date" id="dateTo" class="glass-input">
                        </div>
                    </div>
                    
                    <div class="search-actions">
                        <button onclick="app.searchAll()" class="gold-btn">
                            🔍 بحث شامل
                        </button>
                        <button onclick="app.searchCases()" class="gold-btn">
                            📋 بحث في القضايا
                        </button>
                        <button onclick="app.searchSessions()" class="gold-btn">
                            📅 بحث في الجلسات
                        </button>
                        <button onclick="app.clearSearch()" class="gold-btn">
                            ♻️ مسح البحث
                        </button>
                        <button onclick="app.printSearchResults()" class="gold-btn">
                            🖨️ طباعة PDF
                        </button>
                    </div>
                </div>
                
                <div class="form-section">
                    <h2 class="form-title gold-text">نتائج البحث</h2>
                    <div id="searchResults" class="table-container">
                        <!-- Search results will be loaded here -->
                    </div>
                </div>
                
                <div class="form-section">
                    <h2 class="form-title gold-text">التقارير والإحصائيات</h2>
                    <div class="form-grid">
                        <div class="form-group">
                            <button onclick="app.generateCasesReport()" class="gold-btn">
                                📊 تقرير القضايا
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <button onclick="app.generateSessionsReport()" class="gold-btn">
                                📈 تقرير الجلسات
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <button onclick="app.generateClientReport()" class="gold-btn">
                                👥 تقرير العملاء
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <button onclick="app.generateCourtReport()" class="gold-btn">
                                ⚖️ تقرير المحاكم
                            </button>
                        </div>
                    </div>
                    
                    <div id="reportContainer" class="table-container" style="margin-top: 20px;">
                        <!-- Reports will be displayed here -->
                    </div>
                </div>
            </div>
        `;
    }

    async autoFillClientInfo() {
        const clientName = document.getElementById('clientName')?.value;
        const clientPhone = document.getElementById('clientPhone')?.value;
        
        if (clientName || clientPhone) {
            // البحث في قاعدة البيانات عن معلومات العميل
            const cases = await Database.getCases();
            const existingClient = cases.find(caseItem => 
                caseItem.clientName === clientName || 
                caseItem.clientPhone === clientPhone
            );
            
            if (existingClient) {
                document.getElementById('clientEmail').value = existingClient.clientEmail || '';
                document.getElementById('clientRole').value = existingClient.clientRole || '';
            }
        }
    }

    async autoFillSessionInfo() {
        const caseCode = document.getElementById('searchCaseCode')?.value;
        const clientName = document.getElementById('searchClientName')?.value;
        const clientPhone = document.getElementById('searchClientPhone')?.value;
        
        if (caseCode || clientName || clientPhone) {
            // البحث في القضايا
            const cases = await Database.getCases();
            const foundCase = cases.find(caseItem => 
                caseItem.caseCode === caseCode ||
                caseItem.clientName === clientName ||
                caseItem.clientPhone === clientPhone
            );
            
            if (foundCase) {
                document.getElementById('sessionCaseCode').value = foundCase.caseCode || '';
                document.getElementById('sessionCaseNumber').value = foundCase.caseNumber || '';
                document.getElementById('sessionCaseYear').value = foundCase.caseYear || '';
                document.getElementById('sessionCourt').value = foundCase.courtName || '';
                document.getElementById('sessionCircuit').value = foundCase.circuit || '';
                document.getElementById('sessionClientName').value = foundCase.clientName || '';
                document.getElementById('sessionClientPhone').value = foundCase.clientPhone || '';
                document.getElementById('sessionClientRole').value = foundCase.clientRole || '';
                document.getElementById('sessionOpponent').value = foundCase.opponentName || '';
            }
        }
    }

    async saveCase() {
        const caseData = {
            clientName: document.getElementById('clientName')?.value,
            clientPhone: document.getElementById('clientPhone')?.value,
            clientEmail: document.getElementById('clientEmail')?.value,
            clientRole: document.getElementById('clientRole')?.value,
            opponentName: document.getElementById('opponentName')?.value,
            caseType: document.getElementById('caseType')?.value,
            caseNumber: document.getElementById('caseNumber')?.value,
            caseYear: document.getElementById('caseYear')?.value,
            courtName: document.getElementById('courtName')?.value,
            circuit: document.getElementById('circuit')?.value,
            caseSubject: document.getElementById('caseSubject')?.value,
            notes: document.getElementById('caseNotes')?.value,
            caseCode: this.generateCaseCode(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!caseData.clientName || !caseData.clientPhone || !caseData.caseNumber || !caseData.caseYear) {
            this.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            await Database.saveCase(caseData);
            this.showNotification(`تم حفظ القضية بنجاح! كود القضية: ${caseData.caseCode}`, 'success');
            this.clearCaseForm();
            this.loadCasesList();
        } catch (error) {
            this.showNotification('حدث خطأ أثناء حفظ القضية', 'error');
            console.error(error);
        }
    }

    generateCaseCode() {
        const year = new Date().getFullYear().toString().slice(-1);
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `MA-${year}${randomNum}-${randomChars}`;
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        setTimeout(() => {
            notification.textContent = '';
            notification.className = 'notification';
        }, 5000);
    }

    // More methods will be implemented in other files
}

// Initialize the app
const app = new CaseManagementApp();

// Global functions for HTML onclick events
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

window.exportData = async function() {
    try {
        const cases = await Database.getCases();
        const sessions = await Database.getSessions();
        
        const data = {
            cases: cases,
            sessions: sessions,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `قضايا_نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        app.showNotification('تم تصدير البيانات بنجاح', 'success');
    } catch (error) {
        app.showNotification('حدث خطأ أثناء تصدير البيانات', 'error');
    }
};

window.clearCache = function() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات المخزنة محلياً؟')) {
        Database.clearAll();
        app.showNotification('تم مسح البيانات المخزنة محلياً', 'success');
    }
};
