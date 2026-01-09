// Main Application Logic
class CaseManagementApp {
    constructor() {
        this.currentTab = 'dashboardTab';
        this.currentCaseId = null;
        this.currentSessionId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.setupOnlineListener();
        this.loadDashboard();
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
            // Refresh data when coming back online
            setTimeout(() => this.refreshCurrentTab(), 2000);
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('فقد الاتصال بالإنترنت - البيانات تحفظ محلياً', 'warning');
        });
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
            
            // Load tab content
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
            // Load statistics
            const stats = await DatabaseInstance.getStatistics();
            this.updateDashboardStats(stats);
            
            // Load upcoming sessions
            const upcomingSessions = await DatabaseInstance.getUpcomingSessions(5);
            this.updateUpcomingSessions(upcomingSessions);
            
            // Load reminders
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
                    </div>
                    <div class="session-meta">
                        <span class="court-badge">${session.court || 'غير محدد'}</span>
                        <button class="btn-small" onclick="app.viewSessionDetails(${session.id})">
                            <i class="fas fa-eye"></i>
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
        
        // Check for pending cases
        DatabaseInstance.getStatistics().then(stats => {
            if (stats.pendingCases > 0) {
                html += `
                    <div class="reminder-item info">
                        <i class="fas fa-folder"></i>
                        <span>لديك ${stats.pendingCases} قضية معلقة</span>
                    </div>
                `;
            }
            
            if (html === '') {
                html = '<div class="reminder-item"><i class="fas fa-check-circle"></i> <span>لا توجد تذكيرات حالياً</span></div>';
            }
            
            container.innerHTML = html;
        });
    }

    async loadCasesTab() {
        const tabContent = document.getElementById('casesTab');
        tabContent.innerHTML = `
            <div class="tab-container">
                <div class="tab-header">
                    <h2><i class="fas fa-folder"></i> إدارة القضايا</h2>
                    <div class="header-actions">
                        <button class="gold-btn" onclick="app.openCaseForm()">
                            <i class="fas fa-plus"></i> إضافة قضية جديدة
                        </button>
                        <div class="search-box">
                            <input type="text" id="caseSearch" placeholder="بحث في القضايا...">
                            <i class="fas fa-search"></i>
                        </div>
                    </div>
                </div>
                
                <div class="filters-bar">
                    <select id="caseTypeFilter" class="filter-select">
                        <option value="">جميع الأنواع</option>
                        ${APP_CONFIG.CASE_TYPES.map(type => `<option value="${type}">${type}</option>`).join('')}
                    </select>
                    <select id="courtFilter" class="filter-select">
                        <option value="">جميع المحاكم</option>
                        ${APP_CONFIG.COURTS.map(court => `<option value="${court}">${court}</option>`).join('')}
                    </select>
                    <select id="statusFilter" class="filter-select">
                        <option value="">جميع الحالات</option>
                        ${APP_CONFIG.CASE_STATUSES.map(status => `<option value="${status}">${status}</option>`).join('')}
                    </select>
                    <button class="btn-small" onclick="app.filterCases()">تصفية</button>
                    <button class="btn-small" onclick="app.resetCaseFilters()">إعادة تعيين</button>
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
        ['caseTypeFilter', 'courtFilter', 'statusFilter'].forEach(id => {
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
            const caseStatus = document.getElementById('statusFilter')?.value || '';
            
            const filters = {
                caseType,
                courtName,
                caseStatus
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
        document.getElementById('statusFilter').value = '';
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
                <div class="case-card glass-effect">
                    <div class="case-header">
                        <div class="case-code">${caseItem.caseCode}</div>
                        <div class="case-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="case-body">
                        <h4>${caseItem.clientName}</h4>
                        <p><i class="fas fa-phone"></i> ${caseItem.clientPhone}</p>
                        <p><i class="fas fa-balance-scale"></i> ${caseItem.caseType || 'غير محدد'}</p>
                        <p><i class="fas fa-gavel"></i> ${caseItem.courtName || 'غير محدد'}</p>
                        <p><i class="fas fa-file-alt"></i> ${caseItem.caseNumber}/${caseItem.caseYear}</p>
                    </div>
                    <div class="case-actions">
                        <button class="btn-small" onclick="app.viewCaseDetails(${caseItem.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn-small" onclick="app.editCase(${caseItem.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn-small delete" onclick="app.deleteCase(${caseItem.id})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    openCaseForm(caseId = null) {
        const modal = document.getElementById('caseModal');
        if (!modal) return;
        
        if (caseId) {
            // Edit mode
            this.currentCaseId = caseId;
            this.loadCaseForEdit(caseId);
        } else {
            // Add mode
            this.currentCaseId = null;
            this.showCaseForm();
        }
        
        modal.style.display = 'flex';
    }

    async loadCaseForEdit(caseId) {
        try {
            const cases = await DatabaseInstance.getCases();
            const caseItem = cases.find(c => c.id == caseId);
            
            if (caseItem) {
                const formHtml = `
                    <form id="caseForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>اسم العميل *</label>
                                <input type="text" id="editClientName" value="${caseItem.clientName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>رقم الهاتف *</label>
                                <input type="tel" id="editClientPhone" value="${caseItem.clientPhone || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" id="editClientEmail" value="${caseItem.clientEmail || ''}">
                            </div>
                            <div class="form-group">
                                <label>صفة العميل</label>
                                <select id="editClientRole">
                                    <option value="">اختر صفة العميل</option>
                                    ${APP_CONFIG.CLIENT_ROLES.map(role => 
                                        `<option value="${role}" ${role === caseItem.clientRole ? 'selected' : ''}>${role}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>اسم الخصم</label>
                                <input type="text" id="editOpponentName" value="${caseItem.opponentName || ''}">
                            </div>
                            <div class="form-group">
                                <label>نوع القضية</label>
                                <select id="editCaseType">
                                    <option value="">اختر نوع القضية</option>
                                    ${APP_CONFIG.CASE_TYPES.map(type => 
                                        `<option value="${type}" ${type === caseItem.caseType ? 'selected' : ''}>${type}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>رقم القضية *</label>
                                <input type="text" id="editCaseNumber" value="${caseItem.caseNumber || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>سنة القضية</label>
                                <input type="number" id="editCaseYear" value="${caseItem.caseYear || new Date().getFullYear()}">
                            </div>
                            <div class="form-group">
                                <label>المحكمة</label>
                                <select id="editCourtName">
                                    <option value="">اختر المحكمة</option>
                                    ${APP_CONFIG.COURTS.map(court => 
                                        `<option value="${court}" ${court === caseItem.courtName ? 'selected' : ''}>${court}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>الدائرة</label>
                                <select id="editCircuit">
                                    <option value="">اختر الدائرة</option>
                                    ${APP_CONFIG.CIRCUITS.map(circuit => 
                                        `<option value="${circuit}" ${circuit === caseItem.circuit ? 'selected' : ''}>${circuit}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>موضوع القضية</label>
                            <textarea id="editCaseSubject" rows="3">${caseItem.caseSubject || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>ملاحظات</label>
                            <textarea id="editCaseNotes" rows="2">${caseItem.notes || ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="gold-btn" onclick="app.updateCase()">
                                <i class="fas fa-save"></i> حفظ التعديلات
                            </button>
                            <button type="button" class="btn" onclick="closeModal('caseModal')">
                                إلغاء
                            </button>
                        </div>
                    </form>
                `;
                
                document.getElementById('caseModalBody').innerHTML = formHtml;
            }
        } catch (error) {
            console.error('Error loading case for edit:', error);
            this.showNotification('حدث خطأ أثناء تحميل بيانات القضية', 'error');
        }
    }

    showCaseForm() {
        const formHtml = `
            <form id="caseForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label>اسم العميل *</label>
                        <input type="text" id="clientName" required>
                    </div>
                    <div class="form-group">
                        <label>رقم الهاتف *</label>
                        <input type="tel" id="clientPhone" required>
                    </div>
                    <div class="form-group">
                        <label>البريد الإلكتروني</label>
                        <input type="email" id="clientEmail">
                    </div>
                    <div class="form-group">
                        <label>صفة العميل</label>
                        <select id="clientRole">
                            <option value="">اختر صفة العميل</option>
                            ${APP_CONFIG.CLIENT_ROLES.map(role => `<option value="${role}">${role}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>اسم الخصم</label>
                        <input type="text" id="opponentName">
                    </div>
                    <div class="form-group">
                        <label>نوع القضية</label>
                        <select id="caseType">
                            <option value="">اختر نوع القضية</option>
                            ${APP_CONFIG.CASE_TYPES.map(type => `<option value="${type}">${type}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>رقم القضية *</label>
                        <input type="text" id="caseNumber" required>
                    </div>
                    <div class="form-group">
                        <label>سنة القضية</label>
                        <input type="number" id="caseYear" value="${new Date().getFullYear()}">
                    </div>
                    <div class="form-group">
                        <label>المحكمة</label>
                        <select id="courtName">
                            <option value="">اختر المحكمة</option>
                            ${APP_CONFIG.COURTS.map(court => `<option value="${court}">${court}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>الدائرة</label>
                        <select id="circuit">
                            <option value="">اختر الدائرة</option>
                            ${APP_CONFIG.CIRCUITS.map(circuit => `<option value="${circuit}">${circuit}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>موضوع القضية</label>
                    <textarea id="caseSubject" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea id="caseNotes" rows="2"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="gold-btn" onclick="app.saveCase()">
                        <i class="fas fa-save"></i> حفظ القضية
                    </button>
                    <button type="button" class="btn" onclick="closeModal('caseModal')">
                        إلغاء
                    </button>
                </div>
            </form>
        `;
        
        document.getElementById('caseModalBody').innerHTML = formHtml;
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
            notes: document.getElementById('caseNotes')?.value
        };

        if (!caseData.clientName || !caseData.clientPhone || !caseData.caseNumber) {
            this.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            const result = await DatabaseInstance.saveCase(caseData);
            
            if (result.success) {
                this.showNotification(
                    result.synced ? 
                    `تم حفظ القضية بنجاح! كود القضية: ${result.caseCode}` :
                    `تم حفظ القضية محلياً! كود القضية: ${result.caseCode} (سيتم المزامنة عند الاتصال)`,
                    result.synced ? 'success' : 'warning'
                );
                
                closeModal('caseModal');
                await this.loadCasesList();
                await this.loadDashboard(); // Refresh dashboard stats
            } else {
                this.showNotification(result.error || 'حدث خطأ أثناء حفظ القضية', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ أثناء حفظ القضية', 'error');
            console.error(error);
        }
    }

    async updateCase() {
        if (!this.currentCaseId) return;
        
        const caseData = {
            clientName: document.getElementById('editClientName')?.value,
            clientPhone: document.getElementById('editClientPhone')?.value,
            clientEmail: document.getElementById('editClientEmail')?.value,
            clientRole: document.getElementById('editClientRole')?.value,
            opponentName: document.getElementById('editOpponentName')?.value,
            caseType: document.getElementById('editCaseType')?.value,
            caseNumber: document.getElementById('editCaseNumber')?.value,
            caseYear: document.getElementById('editCaseYear')?.value,
            courtName: document.getElementById('editCourtName')?.value,
            circuit: document.getElementById('editCircuit')?.value,
            caseSubject: document.getElementById('editCaseSubject')?.value,
            notes: document.getElementById('editCaseNotes')?.value
        };

        if (!caseData.clientName || !caseData.clientPhone || !caseData.caseNumber) {
            this.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            const result = await DatabaseInstance.updateCase(this.currentCaseId, caseData);
            
            if (result.success) {
                this.showNotification(
                    result.synced ? 'تم تحديث القضية بنجاح' : 'تم تحديث القضية محلياً (سيتم المزامنة لاحقاً)',
                    result.synced ? 'success' : 'warning'
                );
                
                closeModal('caseModal');
                await this.loadCasesList();
            } else {
                this.showNotification(result.error || 'حدث خطأ أثناء تحديث القضية', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ أثناء تحديث القضية', 'error');
            console.error(error);
        }
    }

    async deleteCase(caseId) {
        if (!confirm('هل أنت متأكد من حذف هذه القضية؟')) {
            return;
        }

        try {
            const result = await DatabaseInstance.deleteCase(caseId);
            
            if (result.success) {
                this.showNotification(
                    result.synced ? 'تم حذف القضية بنجاح' : 'تم حذف القضية محلياً (سيتم المزامنة لاحقاً)',
                    result.synced ? 'success' : 'warning'
                );
                
                await this.loadCasesList();
                await this.loadDashboard(); // Refresh dashboard stats
            } else {
                this.showNotification(result.error || 'حدث خطأ أثناء حذف القضية', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ أثناء حذف القضية', 'error');
            console.error(error);
        }
    }

    async viewCaseDetails(caseId) {
        try {
            const cases = await DatabaseInstance.getCases();
            const caseItem = cases.find(c => c.id == caseId);
            
            if (!caseItem) {
                this.showNotification('القضية غير موجودة', 'error');
                return;
            }
            
            const detailsHtml = `
                <div class="case-details">
                    <div class="detail-section">
                        <h4>معلومات القضية</h4>
                        <p><strong>كود القضية:</strong> ${caseItem.caseCode}</p>
                        <p><strong>رقم القضية:</strong> ${caseItem.caseNumber}/${caseItem.caseYear}</p>
                        <p><strong>نوع القضية:</strong> ${caseItem.caseType || 'غير محدد'}</p>
                        <p><strong>المحكمة:</strong> ${caseItem.courtName || 'غير محدد'}</p>
                        <p><strong>الدائرة:</strong> ${caseItem.circuit || 'غير محدد'}</p>
                        <p><strong>موضوع القضية:</strong> ${caseItem.caseSubject || 'لا يوجد'}</p>
                        <p><strong>ملاحظات:</strong> ${caseItem.notes || 'لا يوجد'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>معلومات العميل</h4>
                        <p><strong>اسم العميل:</strong> ${caseItem.clientName}</p>
                        <p><strong>رقم الهاتف:</strong> ${caseItem.clientPhone}</p>
                        <p><strong>البريد الإلكتروني:</strong> ${caseItem.clientEmail || 'غير محدد'}</p>
                        <p><strong>صفة العميل:</strong> ${caseItem.clientRole || 'غير محدد'}</p>
                        <p><strong>اسم الخصم:</strong> ${caseItem.opponentName || 'غير محدد'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>معلومات النظام</h4>
                        <p><strong>تاريخ الإضافة:</strong> ${new Date(caseItem.createdAt).toLocaleString('ar-SA')}</p>
                        <p><strong>تاريخ التحديث:</strong> ${new Date(caseItem.updatedAt).toLocaleString('ar-SA')}</p>
                        <p><strong>الحالة:</strong> ${caseItem.synced ? '<span style="color: #4CAF50;">مزامن</span>' : '<span style="color: #FF9800;">محلي</span>'}</p>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="gold-btn" onclick="app.editCase(${caseItem.id})">
                            <i class="fas fa-edit"></i> تعديل القضية
                        </button>
                        <button class="btn" onclick="closeModal('caseModal')">
                            إغلاق
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('caseModalBody').innerHTML = detailsHtml;
            document.getElementById('caseModal').style.display = 'flex';
            
        } catch (error) {
            console.error('Error viewing case details:', error);
            this.showNotification('حدث خطأ أثناء عرض تفاصيل القضية', 'error');
        }
    }

    editCase(caseId) {
        this.openCaseForm(caseId);
    }

    async loadSessionsTab() {
        const tabContent = document.getElementById('sessionsTab');
        tabContent.innerHTML = `
            <div class="tab-container">
                <div class="tab-header">
                    <h2><i class="fas fa-calendar-alt"></i> إدارة الجلسات</h2>
                    <div class="header-actions">
                        <button class="gold-btn" onclick="app.openSessionForm()">
                            <i class="fas fa-plus"></i> إضافة جلسة جديدة
                        </button>
                        <div class="search-box">
                            <input type="text" id="sessionSearch" placeholder="بحث في الجلسات...">
                            <i class="fas fa-search"></i>
                        </div>
                    </div>
                </div>
                
                <div class="filters-bar">
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
                    <button class="btn-small" onclick="app.filterSessions()">تصفية</button>
                    <button class="btn-small" onclick="app.resetSessionFilters()">إعادة تعيين</button>
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

    async loadSessionsList() {
        try {
            const sessions = await DatabaseInstance.getSessions();
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
                <div class="session-card glass-effect">
                    <div class="session-header">
                        <div class="session-date">
                            <i class="fas fa-calendar"></i> ${date}
                            <span class="session-time">${time}</span>
                        </div>
                        <div class="session-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="session-body">
                        <h4>${session.caseCode || 'غير معروف'}</h4>
                        <p><i class="fas fa-user"></i> ${session.clientName || 'غير معروف'}</p>
                        <p><i class="fas fa-gavel"></i> ${session.court || 'غير محدد'}</p>
                        <p><i class="fas fa-file-alt"></i> ${session.caseNumber || 'غير محدد'}</p>
                        <p><i class="fas fa-clipboard-check"></i> ${session.caseStatus || 'غير محدد'}</p>
                        <p><i class="fas fa-sticky-note"></i> ${session.decision || 'لا يوجد قرار'}</p>
                    </div>
                    <div class="session-actions">
                        <button class="btn-small" onclick="app.viewSessionDetails(${session.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn-small" onclick="app.editSession(${session.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn-small delete" onclick="app.deleteSession(${session.id})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    openSessionForm(sessionId = null) {
        const modal = document.getElementById('sessionModal');
        if (!modal) return;
        
        if (sessionId) {
            this.currentSessionId = sessionId;
            this.loadSessionForEdit(sessionId);
        } else {
            this.currentSessionId = null;
            this.showSessionForm();
        }
        
        modal.style.display = 'flex';
    }

    showSessionForm() {
        const formHtml = `
            <form id="sessionForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label>كود القضية *</label>
                        <input type="text" id="sessionCaseCode" required>
                    </div>
                    <div class="form-group">
                        <label>تاريخ الجلسة *</label>
                        <input type="date" id="sessionDate" required>
                    </div>
                    <div class="form-group">
                        <label>وقت الجلسة</label>
                        <input type="time" id="sessionTime">
                    </div>
                    <div class="form-group">
                        <label>المحكمة</label>
                        <select id="sessionCourt">
                            <option value="">اختر المحكمة</option>
                            ${APP_CONFIG.COURTS.map(court => `<option value="${court}">${court}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>نوع الجلسة</label>
                        <select id="sessionType">
                            <option value="جلسة عادية">جلسة عادية</option>
                            <option value="جلسة استماع">جلسة استماع</option>
                            <option value="جلسة حكم">جلسة حكم</option>
                            <option value="جلسة تحقيق">جلسة تحقيق</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>حالة القضية</label>
                        <select id="sessionCaseStatus">
                            <option value="">اختر الحالة</option>
                            ${APP_CONFIG.CASE_STATUSES.map(status => `<option value="${status}">${status}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>القرار</label>
                    <textarea id="sessionDecision" rows="3" placeholder="قرار الجلسة..."></textarea>
                </div>
                <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea id="sessionNotes" rows="2" placeholder="ملاحظات عن الجلسة..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="gold-btn" onclick="app.saveSession()">
                        <i class="fas fa-save"></i> حفظ الجلسة
                    </button>
                    <button type="button" class="btn" onclick="closeModal('sessionModal')">
                        إلغاء
                    </button>
                </div>
            </form>
        `;
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        setTimeout(() => {
            const dateInput = document.getElementById('sessionDate');
            if (dateInput) dateInput.value = today;
        }, 100);
        
        document.getElementById('sessionModalBody').innerHTML = formHtml;
    }

    async saveSession() {
        const sessionData = {
            caseCode: document.getElementById('sessionCaseCode')?.value,
            sessionDate: document.getElementById('sessionDate')?.value,
            sessionTime: document.getElementById('sessionTime')?.value,
            court: document.getElementById('sessionCourt')?.value,
            sessionType: document.getElementById('sessionType')?.value || 'جلسة عادية',
            caseStatus: document.getElementById('sessionCaseStatus')?.value,
            decision: document.getElementById('sessionDecision')?.value,
            sessionNotes: document.getElementById('sessionNotes')?.value
        };

        if (!sessionData.caseCode || !sessionData.sessionDate) {
            this.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            const result = await DatabaseInstance.saveSession(sessionData);
            
            if (result.success) {
                this.showNotification(
                    result.synced ? 'تم حفظ الجلسة بنجاح' : 'تم حفظ الجلسة محلياً (سيتم المزامنة عند الاتصال)',
                    result.synced ? 'success' : 'warning'
                );
                
                closeModal('sessionModal');
                await this.loadSessionsList();
                await this.loadDashboard(); // Refresh dashboard
            } else {
                this.showNotification(result.error || 'حدث خطأ أثناء حفظ الجلسة', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ أثناء حفظ الجلسة', 'error');
            console.error(error);
        }
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
                        <h4>معلومات الجلسة</h4>
                        <p><strong>كود القضية:</strong> ${session.caseCode || 'غير معروف'}</p>
                        <p><strong>تاريخ الجلسة:</strong> ${date}</p>
                        <p><strong>وقت الجلسة:</strong> ${time}</p>
                        <p><strong>المحكمة:</strong> ${session.court || 'غير محدد'}</p>
                        <p><strong>نوع الجلسة:</strong> ${session.sessionType || 'غير محدد'}</p>
                        <p><strong>حالة القضية:</strong> ${session.caseStatus || 'غير محدد'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>تفاصيل الجلسة</h4>
                        <p><strong>القرار:</strong></p>
                        <p>${session.decision || 'لا يوجد قرار'}</p>
                        <p><strong>ملاحظات:</strong></p>
                        <p>${session.sessionNotes || 'لا يوجد ملاحظات'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>معلومات النظام</h4>
                        <p><strong>تاريخ الإضافة:</strong> ${new Date(session.createdAt).toLocaleString('ar-SA')}</p>
                        <p><strong>تاريخ التحديث:</strong> ${new Date(session.updatedAt).toLocaleString('ar-SA')}</p>
                        <p><strong>الحالة:</strong> ${session.synced ? '<span style="color: #4CAF50;">مزامن</span>' : '<span style="color: #FF9800;">محلي</span>'}</p>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="gold-btn" onclick="app.editSession(${session.id})">
                            <i class="fas fa-edit"></i> تعديل الجلسة
                        </button>
                        <button class="btn" onclick="closeModal('sessionModal')">
                            إغلاق
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

    editSession(sessionId) {
        this.openSessionForm(sessionId);
    }

    async loadSessionForEdit(sessionId) {
        try {
            const sessions = await DatabaseInstance.getSessions();
            const session = sessions.find(s => s.id == sessionId);
            
            if (session) {
                const date = new Date(session.sessionDate).toISOString().split('T')[0];
                
                const formHtml = `
                    <form id="sessionForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>كود القضية *</label>
                                <input type="text" id="editSessionCaseCode" value="${session.caseCode || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>تاريخ الجلسة *</label>
                                <input type="date" id="editSessionDate" value="${date}" required>
                            </div>
                            <div class="form-group">
                                <label>وقت الجلسة</label>
                                <input type="time" id="editSessionTime" value="${session.sessionTime || ''}">
                            </div>
                            <div class="form-group">
                                <label>المحكمة</label>
                                <select id="editSessionCourt">
                                    <option value="">اختر المحكمة</option>
                                    ${APP_CONFIG.COURTS.map(court => 
                                        `<option value="${court}" ${court === session.court ? 'selected' : ''}>${court}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>نوع الجلسة</label>
                                <select id="editSessionType">
                                    <option value="جلسة عادية" ${session.sessionType === 'جلسة عادية' ? 'selected' : ''}>جلسة عادية</option>
                                    <option value="جلسة استماع" ${session.sessionType === 'جلسة استماع' ? 'selected' : ''}>جلسة استماع</option>
                                    <option value="جلسة حكم" ${session.sessionType === 'جلسة حكم' ? 'selected' : ''}>جلسة حكم</option>
                                    <option value="جلسة تحقيق" ${session.sessionType === 'جلسة تحقيق' ? 'selected' : ''}>جلسة تحقيق</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>حالة القضية</label>
                                <select id="editSessionCaseStatus">
                                    <option value="">اختر الحالة</option>
                                    ${APP_CONFIG.CASE_STATUSES.map(status => 
                                        `<option value="${status}" ${status === session.caseStatus ? 'selected' : ''}>${status}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>القرار</label>
                            <textarea id="editSessionDecision" rows="3">${session.decision || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>ملاحظات</label>
                            <textarea id="editSessionNotes" rows="2">${session.sessionNotes || ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="gold-btn" onclick="app.updateSession()">
                                <i class="fas fa-save"></i> حفظ التعديلات
                            </button>
                            <button type="button" class="btn" onclick="closeModal('sessionModal')">
                                إلغاء
                            </button>
                        </div>
                    </form>
                `;
                
                document.getElementById('sessionModalBody').innerHTML = formHtml;
            }
        } catch (error) {
            console.error('Error loading session for edit:', error);
            this.showNotification('حدث خطأ أثناء تحميل بيانات الجلسة', 'error');
        }
    }

    async updateSession() {
        if (!this.currentSessionId) return;
        
        const sessionData = {
            caseCode: document.getElementById('editSessionCaseCode')?.value,
            sessionDate: document.getElementById('editSessionDate')?.value,
            sessionTime: document.getElementById('editSessionTime')?.value,
            court: document.getElementById('editSessionCourt')?.value,
            sessionType: document.getElementById('editSessionType')?.value,
            caseStatus: document.getElementById('editSessionCaseStatus')?.value,
            decision: document.getElementById('editSessionDecision')?.value,
            sessionNotes: document.getElementById('editSessionNotes')?.value
        };

        if (!sessionData.caseCode || !sessionData.sessionDate) {
            this.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            const result = await DatabaseInstance.updateSession(this.currentSessionId, sessionData);
            
            if (result.success) {
                this.showNotification(
                    result.synced ? 'تم تحديث الجلسة بنجاح' : 'تم تحديث الجلسة محلياً (سيتم المزامنة لاحقاً)',
                    result.synced ? 'success' : 'warning'
                );
                
                closeModal('sessionModal');
                await this.loadSessionsList();
            } else {
                this.showNotification(result.error || 'حدث خطأ أثناء تحديث الجلسة', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ أثناء تحديث الجلسة', 'error');
            console.error(error);
        }
    }

    async deleteSession(sessionId) {
        if (!confirm('هل أنت متأكد من حذف هذه الجلسة؟')) {
            return;
        }

        try {
            const result = await DatabaseInstance.deleteSession(sessionId);
            
            if (result.success) {
                this.showNotification(
                    result.synced ? 'تم حذف الجلسة بنجاح' : 'تم حذف الجلسة محلياً (سيتم المزامنة لاحقاً)',
                    result.synced ? 'success' : 'warning'
                );
                
                await this.loadSessionsList();
                await this.loadDashboard(); // Refresh dashboard
            } else {
                this.showNotification(result.error || 'حدث خطأ أثناء حذف الجلسة', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ أثناء حذف الجلسة', 'error');
            console.error(error);
        }
    }

    async loadReportsTab() {
        const tabContent = document.getElementById('reportsTab');
        tabContent.innerHTML = `
            <div class="tab-container">
                <div class="tab-header">
                    <h2><i class="fas fa-chart-bar"></i> التقارير والإحصائيات</h2>
                </div>
                
                <div class="reports-container">
                    <div class="reports-grid">
                        <div class="report-card glass-effect">
                            <div class="report-header">
                                <i class="fas fa-chart-pie"></i>
                                <h3>التقارير السريعة</h3>
                            </div>
                            <div class="report-body">
                                <button class="report-btn" onclick="app.generateCasesReport()">
                                    <i class="fas fa-file-pdf"></i> تقرير القضايا
                                </button>
                                <button class="report-btn" onclick="app.generateSessionsReport()">
                                    <i class="fas fa-file-pdf"></i> تقرير الجلسات
                                </button>
                                <button class="report-btn" onclick="app.generateStatisticsReport()">
                                    <i class="fas fa-chart-line"></i> تقرير إحصائي
                                </button>
                                <button class="report-btn" onclick="app.generateClientReport()">
                                    <i class="fas fa-users"></i> تقرير العملاء
                                </button>
                            </div>
                        </div>
                        
                        <div class="report-card glass-effect">
                            <div class="report-header">
                                <i class="fas fa-search"></i>
                                <h3>البحث المتقدم</h3>
                            </div>
                            <div class="report-body">
                                <div class="search-form">
                                    <input type="text" id="reportSearch" placeholder="بحث في جميع البيانات...">
                                    <button class="btn-small" onclick="app.searchAllData()">
                                        <i class="fas fa-search"></i> بحث
                                    </button>
                                </div>
                                
                                <div class="date-range">
                                    <label>من تاريخ:</label>
                                    <input type="date" id="reportDateFrom">
                                    <label>إلى تاريخ:</label>
                                    <input type="date" id="reportDateTo">
                                </div>
                                
                                <div id="searchResults" class="search-results">
                                    <!-- سيتم عرض نتائج البحث هنا -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="statistics-section glass-effect">
                        <h3><i class="fas fa-chart-bar"></i> الإحصائيات الحية</h3>
                        <div id="liveStatistics" class="live-stats">
                            <p class="loading-text">جارٍ تحميل الإحصائيات...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadLiveStatistics();
    }

    async loadLiveStatistics() {
        try {
            const stats = await DatabaseInstance.getStatistics();
            
            let html = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalCases}</div>
                        <div class="stat-label">إجمالي القضايا</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalSessions}</div>
                        <div class="stat-label">إجمالي الجلسات</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.todaySessions}</div>
                        <div class="stat-label">جلسات اليوم</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.pendingCases}</div>
                        <div class="stat-label">قضايا معلقة</div>
                    </div>
                </div>
                
                <div class="stats-charts">
                    <h4>توزيع القضايا حسب النوع</h4>
            `;
            
            if (Object.keys(stats.caseTypes).length > 0) {
                html += '<div class="chart-container">';
                for (const [type, count] of Object.entries(stats.caseTypes)) {
                    const percentage = (count / stats.totalCases * 100).toFixed(1);
                    html += `
                        <div class="chart-item">
                            <div class="chart-label">${type}</div>
                            <div class="chart-bar">
                                <div class="chart-fill" style="width: ${percentage}%"></div>
                            </div>
                            <div class="chart-value">${count} (${percentage}%)</div>
                        </div>
                    `;
                }
                html += '</div>';
            } else {
                html += '<p class="no-data">لا توجد بيانات</p>';
            }
            
            html += `
                </div>
            `;
            
            document.getElementById('liveStatistics').innerHTML = html;
            
        } catch (error) {
            console.error('Error loading live statistics:', error);
            document.getElementById('liveStatistics').innerHTML = '<p class="error-text">حدث خطأ أثناء تحميل الإحصائيات</p>';
        }
    }

    async searchAllData() {
        const searchQuery = document.getElementById('reportSearch')?.value || '';
        const dateFrom = document.getElementById('reportDateFrom')?.value || '';
        const dateTo = document.getElementById('reportDateTo')?.value || '';
        
        if (!searchQuery && !dateFrom && !dateTo) {
            this.showNotification('يرجى إدخال معايير البحث', 'warning');
            return;
        }
        
        try {
            const cases = await DatabaseInstance.searchCases(searchQuery, {
                dateFrom,
                dateTo
            });
            
            const sessions = await DatabaseInstance.searchSessions(searchQuery, {
                dateFrom,
                dateTo
            });
            
            this.displaySearchResults(cases, sessions);
            
        } catch (error) {
            console.error('Error searching data:', error);
            this.showNotification('حدث خطأ أثناء البحث', 'error');
        }
    }

    displaySearchResults(cases, sessions) {
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        let html = '<h4>نتائج البحث</h4>';
        
        if (cases.length === 0 && sessions.length === 0) {
            html += '<p class="no-data">لا توجد نتائج للبحث</p>';
        } else {
            if (cases.length > 0) {
                html += `
                    <div class="results-section">
                        <h5>القضايا (${cases.length})</h5>
                        <div class="results-list">
                `;
                
                cases.slice(0, 5).forEach(caseItem => {
                    html += `
                        <div class="result-item">
                            <span><strong>${caseItem.caseCode}</strong> - ${caseItem.clientName}</span>
                            <button class="btn-small" onclick="app.viewCaseDetails(${caseItem.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                });
                
                if (cases.length > 5) {
                    html += `<p class="more-results">و ${cases.length - 5} نتائج أخرى...</p>`;
                }
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            if (sessions.length > 0) {
                html += `
                    <div class="results-section">
                        <h5>الجلسات (${sessions.length})</h5>
                        <div class="results-list">
                `;
                
                sessions.slice(0, 5).forEach(session => {
                    const date = new Date(session.sessionDate).toLocaleDateString('ar-SA');
                    html += `
                        <div class="result-item">
                            <span><strong>${session.caseCode}</strong> - ${date}</span>
                            <button class="btn-small" onclick="app.viewSessionDetails(${session.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                });
                
                if (sessions.length > 5) {
                    html += `<p class="more-results">و ${sessions.length - 5} نتائج أخرى...</p>`;
                }
                
                html += `
                        </div>
                    </div>
                `;
            }
        }
        
        container.innerHTML = html;
    }

    async generateCasesReport() {
        try {
            const cases = await DatabaseInstance.getCases();
            
            if (cases.length === 0) {
                this.showNotification('لا توجد قضايا لإنشاء التقرير', 'warning');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('تقرير القضايا القضائية', 105, 15, { align: 'center' });
            
            // Add date
            doc.setFontSize(10);
            doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 25, { align: 'center' });
            
            // Add statistics
            const stats = await DatabaseInstance.getStatistics();
            doc.text(`إجمالي القضايا: ${stats.totalCases}`, 20, 35);
            doc.text(`القضايا المعلقة: ${stats.pendingCases}`, 20, 40);
            doc.text(`القضايا العاجلة: ${stats.urgentCases}`, 20, 45);
            
            // Add table
            const tableColumn = ["كود القضية", "اسم العميل", "رقم الهاتف", "نوع القضية", "المحكمة"];
            const tableRows = [];
            
            cases.forEach(caseItem => {
                const row = [
                    caseItem.caseCode,
                    caseItem.clientName,
                    caseItem.clientPhone,
                    caseItem.caseType || 'غير محدد',
                    caseItem.courtName || 'غير محدد'
                ];
                tableRows.push(row);
            });
            
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 50,
                theme: 'grid',
                headStyles: { fillColor: [0, 0, 0] },
                styles: { font: 'helvetica', fontSize: 8 }
            });
            
            // Save the PDF
            doc.save(`تقرير_القضايا_${new Date().toISOString().split('T')[0]}.pdf`);
            
            this.showNotification('تم إنشاء تقرير القضايا بنجاح', 'success');
            
        } catch (error) {
            console.error('Error generating cases report:', error);
            this.showNotification('حدث خطأ أثناء إنشاء التقرير', 'error');
        }
    }

    async generateSessionsReport() {
        try {
            const sessions = await DatabaseInstance.getSessions();
            
            if (sessions.length === 0) {
                this.showNotification('لا توجد جلسات لإنشاء التقرير', 'warning');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('تقرير الجلسات القضائية', 105, 15, { align: 'center' });
            
            // Add date
            doc.setFontSize(10);
            doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 25, { align: 'center' });
            
            // Add statistics
            const stats = await DatabaseInstance.getStatistics();
            doc.text(`إجمالي الجلسات: ${stats.totalSessions}`, 20, 35);
            doc.text(`جلسات اليوم: ${stats.todaySessions}`, 20, 40);
            doc.text(`الجلسات القادمة: ${stats.upcomingSessions}`, 20, 45);
            
            // Add table
            const tableColumn = ["كود القضية", "تاريخ الجلسة", "الوقت", "المحكمة", "القرار"];
            const tableRows = [];
            
            sessions.forEach(session => {
                const date = new Date(session.sessionDate).toLocaleDateString('ar-SA');
                const row = [
                    session.caseCode || 'غير معروف',
                    date,
                    session.sessionTime || '--:--',
                    session.court || 'غير محدد',
                    session.decision || 'لا يوجد'
                ];
                tableRows.push(row);
            });
            
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 50,
                theme: 'grid',
                headStyles: { fillColor: [0, 0, 0] },
                styles: { font: 'helvetica', fontSize: 8 }
            });
            
            // Save the PDF
            doc.save(`تقرير_الجلسات_${new Date().toISOString().split('T')[0]}.pdf`);
            
            this.showNotification('تم إنشاء تقرير الجلسات بنجاح', 'success');
            
        } catch (error) {
            console.error('Error generating sessions report:', error);
            this.showNotification('حدث خطأ أثناء إنشاء التقرير', 'error');
        }
    }

    async generateStatisticsReport() {
        try {
            const stats = await DatabaseInstance.getStatistics();
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('التقرير الإحصائي', 105, 15, { align: 'center' });
            
            // Add date
            doc.setFontSize(10);
            doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 25, { align: 'center' });
            
            // Add statistics
            let y = 35;
            doc.text(`إجمالي القضايا: ${stats.totalCases}`, 20, y); y += 5;
            doc.text(`إجمالي الجلسات: ${stats.totalSessions}`, 20, y); y += 5;
            doc.text(`جلسات اليوم: ${stats.todaySessions}`, 20, y); y += 5;
            doc.text(`الجلسات القادمة: ${stats.upcomingSessions}`, 20, y); y += 5;
            doc.text(`القضايا المعلقة: ${stats.pendingCases}`, 20, y); y += 5;
            doc.text(`القضايا العاجلة: ${stats.urgentCases}`, 20, y); y += 10;
            
            // Add case types distribution
            if (Object.keys(stats.caseTypes).length > 0) {
                doc.text('توزيع القضايا حسب النوع:', 20, y); y += 5;
                for (const [type, count] of Object.entries(stats.caseTypes)) {
                    const percentage = (count / stats.totalCases * 100).toFixed(1);
                    doc.text(`${type}: ${count} (${percentage}%)`, 30, y); y += 5;
                }
                y += 5;
            }
            
            // Add case status distribution
            if (Object.keys(stats.caseStatuses).length > 0) {
                doc.text('توزيع القضايا حسب الحالة:', 20, y); y += 5;
                for (const [status, count] of Object.entries(stats.caseStatuses)) {
                    doc.text(`${status}: ${count}`, 30, y); y += 5;
                }
            }
            
            // Save the PDF
            doc.save(`تقرير_إحصائي_${new Date().toISOString().split('T')[0]}.pdf`);
            
            this.showNotification('تم إنشاء التقرير الإحصائي بنجاح', 'success');
            
        } catch (error) {
            console.error('Error generating statistics report:', error);
            this.showNotification('حدث خطأ أثناء إنشاء التقرير', 'error');
        }
    }

    async generateClientReport() {
        try {
            const cases = await DatabaseInstance.getCases();
            
            if (cases.length === 0) {
                this.showNotification('لا توجد قضايا لإنشاء التقرير', 'warning');
                return;
            }
            
            // Group cases by client
            const clients = {};
            cases.forEach(caseItem => {
                const key = `${caseItem.clientName}_${caseItem.clientPhone}`;
                if (!clients[key]) {
                    clients[key] = {
                        name: caseItem.clientName,
                        phone: caseItem.clientPhone,
                        email: caseItem.clientEmail,
                        cases: []
                    };
                }
                clients[key].cases.push({
                    code: caseItem.caseCode,
                    type: caseItem.caseType,
                    court: caseItem.courtName,
                    status: caseItem.caseStatus
                });
            });
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('تقرير العملاء', 105, 15, { align: 'center' });
            
            // Add date
            doc.setFontSize(10);
            doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 25, { align: 'center' });
            
            // Add client information
            let y = 35;
            Object.values(clients).forEach((client, index) => {
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text(`العميل ${index + 1}: ${client.name}`, 20, y); y += 7;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(`رقم الهاتف: ${client.phone}`, 20, y); y += 5;
                if (client.email) {
                    doc.text(`البريد الإلكتروني: ${client.email}`, 20, y); y += 5;
                }
                doc.text(`عدد القضايا: ${client.cases.length}`, 20, y); y += 5;
                
                if (client.cases.length > 0) {
                    doc.text('القضايا:', 20, y); y += 5;
                    client.cases.forEach((caseItem, caseIndex) => {
                        doc.text(`${caseIndex + 1}. ${caseItem.code} - ${caseItem.type} - ${caseItem.court}`, 30, y); y += 5;
                        if (y > 270) {
                            doc.addPage();
                            y = 20;
                        }
                    });
                }
                
                y += 5;
            });
            
            // Save the PDF
            doc.save(`تقرير_العملاء_${new Date().toISOString().split('T')[0]}.pdf`);
            
            this.showNotification('تم إنشاء تقرير العملاء بنجاح', 'success');
            
        } catch (error) {
            console.error('Error generating client report:', error);
            this.showNotification('حدث خطأ أثناء إنشاء التقرير', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        // Remove existing timeout if any
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }
        
        // Auto hide after 5 seconds
        notification.timeoutId = setTimeout(() => {
            notification.textContent = '';
            notification.className = 'notification';
        }, 5000);
    }
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
        } else {
            app.showNotification('فشل تصدير البيانات', 'error');
        }
    } catch (error) {
        app.showNotification('حدث خطأ أثناء تصدير البيانات', 'error');
        console.error(error);
    }
};

window.syncData = function() {
    if (navigator.onLine) {
        DatabaseInstance.syncAllData();
    } else {
        app.showNotification('غير متصل بالإنترنت', 'warning');
    }
};

window.clearLocalData = function() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات المحلية؟ (لن يتم حذف البيانات من السحابة)')) {
        DatabaseInstance.clearLocalData().then(result => {
            if (result.success) {
                app.showNotification('تم مسح البيانات المحلية بنجاح', 'success');
                app.loadDashboard();
            } else {
                app.showNotification('فشل مسح البيانات المحلية', 'error');
            }
        });
    }
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
