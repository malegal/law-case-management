// Database Connection and Operations with Supabase
class Database {
    constructor() {
        this.supabaseUrl = 'https://dkknnwtdtkjtspfcfcij.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra25ud3RkdGtqdHNwZmNmY2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODkyODAsImV4cCI6MjA4MzQ2NTI4MH0.jwKmKu5hUE6pfFM8BCy-CF0R9h4RkXbhR50Vau1Q7qw';
        this.supabase = null;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.init();
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus(true);
            this.syncPendingOperations();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus(false);
        });
    }

    async init() {
        // Initialize Supabase
        this.initSupabase();
        
        // Initialize IndexedDB
        await this.initIndexedDB();
        
        // Check initial connection
        this.updateConnectionStatus(this.isOnline);
        
        // Sync data if online
        if (this.isOnline) {
            setTimeout(() => this.syncAllData(), 2000);
        }
    }

    initSupabase() {
        try {
            if (typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey, {
                    auth: {
                        persistSession: false
                    },
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                });
                console.log('✅ Supabase initialized successfully');
            } else {
                console.warn('⚠️ Supabase library not available');
            }
        } catch (error) {
            console.error('❌ Error initializing Supabase:', error);
        }
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('LawCaseDB', 4);
            
            request.onerror = (event) => {
                console.error('❌ Error opening database:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB opened successfully');
                
                // Check if tables exist, create if not
                this.checkAndCreateTables().then(resolve).catch(reject);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create cases store
                if (!db.objectStoreNames.contains('cases')) {
                    const caseStore = db.createObjectStore('cases', { keyPath: 'id', autoIncrement: true });
                    caseStore.createIndex('caseCode', 'caseCode', { unique: true });
                    caseStore.createIndex('clientPhone', 'clientPhone', { unique: false });
                    caseStore.createIndex('createdAt', 'createdAt', { unique: false });
                    caseStore.createIndex('synced', 'synced', { unique: false });
                }
                
                // Create sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                    sessionStore.createIndex('caseCode', 'caseCode', { unique: false });
                    sessionStore.createIndex('sessionDate', 'sessionDate', { unique: false });
                    sessionStore.createIndex('synced', 'synced', { unique: false });
                }
                
                // Create sync queue
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    queueStore.createIndex('type', 'type', { unique: false });
                    queueStore.createIndex('status', 'status', { unique: false });
                }
                
                console.log('🔄 IndexedDB schema upgraded');
            };
        });
    }

    async checkAndCreateTables() {
        const tables = ['cases', 'sessions', 'syncQueue'];
        const transaction = this.db.transaction(tables, 'readonly');
        
        for (const table of tables) {
            if (!this.db.objectStoreNames.contains(table)) {
                console.warn(`⚠️ Table ${table} missing, reopening DB...`);
                // Reopen with higher version to trigger upgrade
                return new Promise((resolve, reject) => {
                    const newRequest = indexedDB.open('LawCaseDB', this.db.version + 1);
                    newRequest.onerror = reject;
                    newRequest.onsuccess = (e) => {
                        this.db = e.target.result;
                        resolve();
                    };
                });
            }
        }
    }

    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            if (isOnline) {
                statusElement.innerHTML = '<i class="fas fa-wifi"></i> <span>متصل</span>';
                statusElement.style.color = '#4CAF50';
            } else {
                statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> <span>غير متصل</span>';
                statusElement.style.color = '#F44336';
            }
        }
        
        if (isOnline) {
            this.showNotification('تم استعادة الاتصال بالإنترنت', 'success');
        } else {
            this.showNotification('فقد الاتصال بالإنترنت - البيانات تحفظ محلياً', 'warning');
        }
    }

    // ==================== Cases Operations ====================
    
    async saveCase(caseData) {
        try {
            // Validate required fields
            if (!caseData.clientName || !caseData.clientPhone || !caseData.caseNumber) {
                throw new Error('يرجى ملء جميع الحقول المطلوبة');
            }
            
            // Generate case code if not exists
            if (!caseData.caseCode) {
                caseData.caseCode = this.generateCaseCode();
            }
            
            // Add timestamps
            caseData.createdAt = new Date().toISOString();
            caseData.updatedAt = new Date().toISOString();
            caseData.synced = false;
            
            // Show loading
            this.showLoading(true);
            
            let result;
            
            if (this.isOnline && this.supabase) {
                // Try to save to Supabase first
                result = await this.saveCaseToSupabase(caseData);
            } else {
                // Save to IndexedDB only
                result = await this.saveCaseToIndexedDB(caseData);
            }
            
            this.showLoading(false);
            
            if (result.success) {
                return {
                    success: true,
                    id: result.id,
                    caseCode: caseData.caseCode,
                    synced: result.synced || false
                };
            } else {
                throw new Error(result.error || 'حدث خطأ أثناء حفظ القضية');
            }
            
        } catch (error) {
            console.error('❌ Error saving case:', error);
            this.showLoading(false);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async saveCaseToSupabase(caseData) {
        try {
            const supabaseData = {
                client_name: caseData.clientName,
                client_phone: caseData.clientPhone,
                client_email: caseData.clientEmail || null,
                client_role: caseData.clientRole || null,
                opponent_name: caseData.opponentName || null,
                case_type: caseData.caseType || null,
                case_number: caseData.caseNumber,
                case_year: caseData.caseYear || new Date().getFullYear(),
                court_name: caseData.courtName || null,
                circuit: caseData.circuit || null,
                case_subject: caseData.caseSubject || null,
                notes: caseData.notes || null,
                case_code: caseData.caseCode,
                created_at: caseData.createdAt,
                updated_at: caseData.updatedAt
            };
            
            const { data, error } = await this.supabase
                .from('cases')
                .insert([supabaseData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Update case data with Supabase ID
            caseData.supabaseId = data.id;
            caseData.synced = true;
            
            // Also save to IndexedDB for offline access
            const localId = await this.saveCaseToIndexedDB(caseData);
            
            return {
                success: true,
                id: localId,
                supabaseId: data.id,
                synced: true
            };
            
        } catch (error) {
            console.error('❌ Error saving to Supabase:', error);
            
            // Save to IndexedDB and add to sync queue
            caseData.synced = false;
            const localId = await this.saveCaseToIndexedDB(caseData);
            await this.addToSyncQueue('case', 'create', caseData, localId);
            
            return {
                success: true,
                id: localId,
                synced: false
            };
        }
    }

    async saveCaseToIndexedDB(caseData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cases'], 'readwrite');
            const store = transaction.objectStore('cases');
            
            const request = store.add(caseData);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getCases() {
        try {
            let cases = [];
            
            if (this.isOnline && this.supabase) {
                // Try to get from Supabase
                cases = await this.getCasesFromSupabase();
                
                if (cases.length > 0) {
                    // Save to IndexedDB for offline access
                    await this.syncCasesToIndexedDB(cases);
                }
            }
            
            // If no data from Supabase or offline, get from IndexedDB
            if (cases.length === 0) {
                cases = await this.getCasesFromIndexedDB();
            }
            
            return cases;
            
        } catch (error) {
            console.error('❌ Error getting cases:', error);
            // Fallback to IndexedDB
            return await this.getCasesFromIndexedDB();
        }
    }

    async getCasesFromSupabase() {
        try {
            const { data, error } = await this.supabase
                .from('cases')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data.map(item => ({
                id: item.id,
                supabaseId: item.id,
                clientName: item.client_name,
                clientPhone: item.client_phone,
                clientEmail: item.client_email,
                clientRole: item.client_role,
                opponentName: item.opponent_name,
                caseType: item.case_type,
                caseNumber: item.case_number,
                caseYear: item.case_year,
                courtName: item.court_name,
                circuit: item.circuit,
                caseSubject: item.case_subject,
                notes: item.notes,
                caseCode: item.case_code,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                synced: true
            }));
            
        } catch (error) {
            console.error('❌ Error fetching from Supabase:', error);
            return [];
        }
    }

    async getCasesFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cases'], 'readonly');
            const store = transaction.objectStore('cases');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async syncCasesToIndexedDB(cases) {
        try {
            const transaction = this.db.transaction(['cases'], 'readwrite');
            const store = transaction.objectStore('cases');
            
            // Clear existing data
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // Add new data
                cases.forEach(caseItem => {
                    store.add(caseItem);
                });
            };
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject(event.target.error);
            });
            
        } catch (error) {
            console.error('❌ Error syncing cases to IndexedDB:', error);
        }
    }

    async updateCase(id, caseData) {
        try {
            caseData.updatedAt = new Date().toISOString();
            caseData.synced = false;
            
            this.showLoading(true);
            
            // Update in IndexedDB
            await this.updateCaseInIndexedDB(id, caseData);
            
            let result = { success: true };
            
            if (this.isOnline && this.supabase && caseData.supabaseId) {
                // Try to update in Supabase
                result = await this.updateCaseInSupabase(caseData);
            } else if (this.isOnline && this.supabase) {
                // Case doesn't have supabaseId, add to sync queue
                await this.addToSyncQueue('case', 'update', caseData, id);
            }
            
            this.showLoading(false);
            return result;
            
        } catch (error) {
            console.error('❌ Error updating case:', error);
            this.showLoading(false);
            return { success: false, error: error.message };
        }
    }

    async updateCaseInIndexedDB(id, caseData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cases'], 'readwrite');
            const store = transaction.objectStore('cases');
            
            // Get existing case first
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const existingCase = getRequest.result;
                const updatedCase = { ...existingCase, ...caseData, id };
                
                const updateRequest = store.put(updatedCase);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = (event) => reject(event.target.error);
            };
            
            getRequest.onerror = (event) => reject(event.target.error);
        });
    }

    async updateCaseInSupabase(caseData) {
        try {
            const supabaseData = {
                client_name: caseData.clientName,
                client_phone: caseData.clientPhone,
                client_email: caseData.clientEmail || null,
                client_role: caseData.clientRole || null,
                opponent_name: caseData.opponentName || null,
                case_type: caseData.caseType || null,
                case_number: caseData.caseNumber,
                case_year: caseData.caseYear,
                court_name: caseData.courtName || null,
                circuit: caseData.circuit || null,
                case_subject: caseData.caseSubject || null,
                notes: caseData.notes || null,
                case_code: caseData.caseCode,
                updated_at: caseData.updatedAt
            };
            
            const { error } = await this.supabase
                .from('cases')
                .update(supabaseData)
                .eq('id', caseData.supabaseId);
            
            if (error) throw error;
            
            // Update synced status in IndexedDB
            caseData.synced = true;
            await this.updateCaseInIndexedDB(caseData.localId || caseData.id, caseData);
            
            return { success: true, synced: true };
            
        } catch (error) {
            console.error('❌ Error updating in Supabase:', error);
            await this.addToSyncQueue('case', 'update', caseData, caseData.id);
            return { success: true, synced: false };
        }
    }

    async deleteCase(id) {
        try {
            this.showLoading(true);
            
            // Get case data first
            const caseData = await this.getCaseFromIndexedDB(id);
            
            if (!caseData) {
                throw new Error('القضية غير موجودة');
            }
            
            // Delete from IndexedDB
            await this.deleteCaseFromIndexedDB(id);
            
            let result = { success: true };
            
            if (this.isOnline && this.supabase && caseData.supabaseId) {
                // Try to delete from Supabase
                result = await this.deleteCaseFromSupabase(caseData.supabaseId);
            } else if (caseData.supabaseId) {
                // Case has supabaseId but we're offline, add to sync queue
                await this.addToSyncQueue('case', 'delete', { supabaseId: caseData.supabaseId }, id);
            }
            
            this.showLoading(false);
            return result;
            
        } catch (error) {
            console.error('❌ Error deleting case:', error);
            this.showLoading(false);
            return { success: false, error: error.message };
        }
    }

    async getCaseFromIndexedDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cases'], 'readonly');
            const store = transaction.objectStore('cases');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async deleteCaseFromIndexedDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cases'], 'readwrite');
            const store = transaction.objectStore('cases');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async deleteCaseFromSupabase(supabaseId) {
        try {
            const { error } = await this.supabase
                .from('cases')
                .delete()
                .eq('id', supabaseId);
            
            if (error) throw error;
            
            return { success: true, synced: true };
            
        } catch (error) {
            console.error('❌ Error deleting from Supabase:', error);
            await this.addToSyncQueue('case', 'delete', { supabaseId }, null);
            return { success: true, synced: false };
        }
    }

    // ==================== Sessions Operations ====================
    
    async saveSession(sessionData) {
        try {
            // Validate required fields
            if (!sessionData.caseCode || !sessionData.sessionDate) {
                throw new Error('يرجى ملء جميع الحقول المطلوبة');
            }
            
            // Add timestamps
            sessionData.createdAt = new Date().toISOString();
            sessionData.updatedAt = new Date().toISOString();
            sessionData.synced = false;
            
            this.showLoading(true);
            
            let result;
            
            if (this.isOnline && this.supabase) {
                // Try to save to Supabase first
                result = await this.saveSessionToSupabase(sessionData);
            } else {
                // Save to IndexedDB only
                result = await this.saveSessionToIndexedDB(sessionData);
            }
            
            this.showLoading(false);
            
            if (result.success) {
                return {
                    success: true,
                    id: result.id,
                    synced: result.synced || false
                };
            } else {
                throw new Error(result.error || 'حدث خطأ أثناء حفظ الجلسة');
            }
            
        } catch (error) {
            console.error('❌ Error saving session:', error);
            this.showLoading(false);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async saveSessionToSupabase(sessionData) {
        try {
            const supabaseData = {
                case_code: sessionData.caseCode,
                case_number: sessionData.caseNumber || null,
                case_year: sessionData.caseYear || null,
                court: sessionData.court || null,
                circuit: sessionData.circuit || null,
                client_name: sessionData.clientName || null,
                client_phone: sessionData.clientPhone || null,
                client_role: sessionData.clientRole || null,
                opponent_name: sessionData.opponentName || null,
                case_status: sessionData.caseStatus || null,
                session_date: sessionData.sessionDate,
                session_time: sessionData.sessionTime || null,
                decision: sessionData.decision || null,
                session_notes: sessionData.sessionNotes || null,
                session_type: sessionData.sessionType || 'جلسة عادية',
                created_at: sessionData.createdAt,
                updated_at: sessionData.updatedAt
            };
            
            const { data, error } = await this.supabase
                .from('sessions')
                .insert([supabaseData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Update session data with Supabase ID
            sessionData.supabaseId = data.id;
            sessionData.synced = true;
            
            // Also save to IndexedDB for offline access
            const localId = await this.saveSessionToIndexedDB(sessionData);
            
            return {
                success: true,
                id: localId,
                supabaseId: data.id,
                synced: true
            };
            
        } catch (error) {
            console.error('❌ Error saving session to Supabase:', error);
            
            // Save to IndexedDB and add to sync queue
            sessionData.synced = false;
            const localId = await this.saveSessionToIndexedDB(sessionData);
            await this.addToSyncQueue('session', 'create', sessionData, localId);
            
            return {
                success: true,
                id: localId,
                synced: false
            };
        }
    }

    async saveSessionToIndexedDB(sessionData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            
            const request = store.add(sessionData);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getSessions() {
        try {
            let sessions = [];
            
            if (this.isOnline && this.supabase) {
                // Try to get from Supabase
                sessions = await this.getSessionsFromSupabase();
                
                if (sessions.length > 0) {
                    // Save to IndexedDB for offline access
                    await this.syncSessionsToIndexedDB(sessions);
                }
            }
            
            // If no data from Supabase or offline, get from IndexedDB
            if (sessions.length === 0) {
                sessions = await this.getSessionsFromIndexedDB();
            }
            
            return sessions;
            
        } catch (error) {
            console.error('❌ Error getting sessions:', error);
            return await this.getSessionsFromIndexedDB();
        }
    }

    async getSessionsFromSupabase() {
        try {
            const { data, error } = await this.supabase
                .from('sessions')
                .select('*')
                .order('session_date', { ascending: true });
            
            if (error) throw error;
            
            return data.map(item => ({
                id: item.id,
                supabaseId: item.id,
                caseCode: item.case_code,
                caseNumber: item.case_number,
                caseYear: item.case_year,
                court: item.court,
                circuit: item.circuit,
                clientName: item.client_name,
                clientPhone: item.client_phone,
                clientRole: item.client_role,
                opponentName: item.opponent_name,
                caseStatus: item.case_status,
                sessionDate: item.session_date,
                sessionTime: item.session_time,
                decision: item.decision,
                sessionNotes: item.session_notes,
                sessionType: item.session_type,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                synced: true
            }));
            
        } catch (error) {
            console.error('❌ Error fetching sessions from Supabase:', error);
            return [];
        }
    }

    async getSessionsFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async syncSessionsToIndexedDB(sessions) {
        try {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            
            // Clear existing data
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // Add new data
                sessions.forEach(session => {
                    store.add(session);
                });
            };
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject(event.target.error);
            });
            
        } catch (error) {
            console.error('❌ Error syncing sessions to IndexedDB:', error);
        }
    }

    async getTodaySessions() {
        const sessions = await this.getSessions();
        const today = new Date().toISOString().split('T')[0];
        
        return sessions.filter(session => {
            const sessionDate = new Date(session.sessionDate).toISOString().split('T')[0];
            return sessionDate === today;
        });
    }

    async getUpcomingSessions(days = 7) {
        const sessions = await this.getSessions();
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);
        
        return sessions.filter(session => {
            const sessionDate = new Date(session.sessionDate);
            return sessionDate >= today && sessionDate <= futureDate;
        }).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
    }

    // ==================== Statistics ====================
    
    async getStatistics() {
        try {
            const cases = await this.getCases();
            const sessions = await this.getSessions();
            const todaySessions = await this.getTodaySessions();
            const upcomingSessions = await this.getUpcomingSessions(7);
            
            const caseTypes = {};
            const caseStatuses = {};
            const courtStats = {};
            
            cases.forEach(caseItem => {
                const type = caseItem.caseType || 'غير محدد';
                caseTypes[type] = (caseTypes[type] || 0) + 1;
                
                const court = caseItem.courtName || 'غير محدد';
                courtStats[court] = (courtStats[court] || 0) + 1;
            });
            
            sessions.forEach(session => {
                const status = session.caseStatus || 'غير محدد';
                caseStatuses[status] = (caseStatuses[status] || 0) + 1;
            });
            
            const urgentCases = sessions.filter(session => {
                const sessionDate = new Date(session.sessionDate);
                const today = new Date();
                const diffTime = sessionDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 3 && diffDays >= 0;
            }).length;
            
            return {
                totalCases: cases.length,
                totalSessions: sessions.length,
                todaySessions: todaySessions.length,
                upcomingSessions: upcomingSessions.length,
                pendingCases: cases.filter(c => c.caseStatus === 'معلقة' || !c.caseStatus).length,
                urgentCases: urgentCases,
                caseTypes,
                caseStatuses,
                courtStats
            };
            
        } catch (error) {
            console.error('❌ Error getting statistics:', error);
            return {
                totalCases: 0,
                totalSessions: 0,
                todaySessions: 0,
                upcomingSessions: 0,
                pendingCases: 0,
                urgentCases: 0,
                caseTypes: {},
                caseStatuses: {},
                courtStats: {}
            };
        }
    }

    // ==================== Search Operations ====================
    
    async searchCases(query, filters = {}) {
        try {
            const cases = await this.getCases();
            
            return cases.filter(caseItem => {
                // Text search
                const searchText = query.toLowerCase();
                const textMatch = !searchText || 
                    (caseItem.clientName && caseItem.clientName.toLowerCase().includes(searchText)) ||
                    (caseItem.caseCode && caseItem.caseCode.toLowerCase().includes(searchText)) ||
                    (caseItem.caseNumber && caseItem.caseNumber.toLowerCase().includes(searchText)) ||
                    (caseItem.clientPhone && caseItem.clientPhone.includes(searchText));
                
                // Filter by case type
                const typeMatch = !filters.caseType || caseItem.caseType === filters.caseType;
                
                // Filter by court
                const courtMatch = !filters.courtName || caseItem.courtName === filters.courtName;
                
                // Filter by status
                const statusMatch = !filters.caseStatus || caseItem.caseStatus === filters.caseStatus;
                
                // Filter by date range
                let dateMatch = true;
                if (filters.dateFrom || filters.dateTo) {
                    const caseDate = new Date(caseItem.createdAt);
                    if (filters.dateFrom && caseDate < new Date(filters.dateFrom)) {
                        dateMatch = false;
                    }
                    if (filters.dateTo && caseDate > new Date(filters.dateTo)) {
                        dateMatch = false;
                    }
                }
                
                return textMatch && typeMatch && courtMatch && statusMatch && dateMatch;
            });
            
        } catch (error) {
            console.error('❌ Error searching cases:', error);
            return [];
        }
    }

    async searchSessions(query, filters = {}) {
        try {
            const sessions = await this.getSessions();
            
            return sessions.filter(session => {
                // Text search
                const searchText = query.toLowerCase();
                const textMatch = !searchText || 
                    (session.caseCode && session.caseCode.toLowerCase().includes(searchText)) ||
                    (session.clientName && session.clientName.toLowerCase().includes(searchText)) ||
                    (session.caseNumber && session.caseNumber.toLowerCase().includes(searchText));
                
                // Filter by date range
                let dateMatch = true;
                if (filters.dateFrom || filters.dateTo) {
                    const sessionDate = new Date(session.sessionDate);
                    if (filters.dateFrom && sessionDate < new Date(filters.dateFrom)) {
                        dateMatch = false;
                    }
                    if (filters.dateTo && sessionDate > new Date(filters.dateTo)) {
                        dateMatch = false;
                    }
                }
                
                // Filter by court
                const courtMatch = !filters.court || session.court === filters.court;
                
                // Filter by session type
                const typeMatch = !filters.sessionType || session.sessionType === filters.sessionType;
                
                return textMatch && dateMatch && courtMatch && typeMatch;
            });
            
        } catch (error) {
            console.error('❌ Error searching sessions:', error);
            return [];
        }
    }

    // ==================== Sync Operations ====================
    
    async addToSyncQueue(type, action, data, localId) {
        try {
            const queueItem = {
                type,
                action,
                data,
                localId,
                status: 'pending',
                createdAt: new Date().toISOString(),
                retries: 0
            };
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['syncQueue'], 'readwrite');
                const store = transaction.objectStore('syncQueue');
                
                const request = store.add(queueItem);
                
                request.onsuccess = () => {
                    console.log(`📝 Added ${type} ${action} to sync queue`);
                    resolve(request.result);
                };
                request.onerror = (event) => reject(event.target.error);
            });
            
        } catch (error) {
            console.error('❌ Error adding to sync queue:', error);
        }
    }

    async processSyncQueue() {
        if (!this.isOnline || !this.supabase) return;
        
        try {
            const queueItems = await this.getSyncQueueItems();
            
            for (const item of queueItems) {
                try {
                    console.log(`🔄 Processing sync item: ${item.type} ${item.action}`);
                    
                    switch (item.type) {
                        case 'case':
                            await this.processCaseSync(item);
                            break;
                        case 'session':
                            await this.processSessionSync(item);
                            break;
                    }
                    
                    // Remove from queue after successful processing
                    await this.removeFromSyncQueue(item.id);
                    
                } catch (error) {
                    console.error(`❌ Error processing sync item ${item.id}:`, error);
                    
                    // Increment retry count
                    item.retries += 1;
                    item.lastError = error.message;
                    
                    if (item.retries >= 3) {
                        // Too many retries, mark as failed
                        item.status = 'failed';
                        await this.updateSyncQueueItem(item);
                    } else {
                        // Update retry count
                        await this.updateSyncQueueItem(item);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error processing sync queue:', error);
        }
    }

    async getSyncQueueItems() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async removeFromSyncQueue(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async updateSyncQueueItem(item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.put(item);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async processCaseSync(item) {
        switch (item.action) {
            case 'create':
                await this.saveCaseToSupabase(item.data);
                break;
            case 'update':
                await this.updateCaseInSupabase(item.data);
                break;
            case 'delete':
                if (item.data.supabaseId) {
                    await this.deleteCaseFromSupabase(item.data.supabaseId);
                }
                break;
        }
    }

    async processSessionSync(item) {
        switch (item.action) {
            case 'create':
                await this.saveSessionToSupabase(item.data);
                break;
            case 'update':
                // Similar to create
                break;
            case 'delete':
                if (item.data.supabaseId) {
                    // Similar to case delete
                    break;
                }
        }
    }

    async syncAllData() {
        if (!this.isOnline || !this.supabase) {
            console.log('⚠️ Cannot sync - offline or Supabase not available');
            return;
        }
        
        try {
            this.showLoading(true);
            this.showNotification('جارٍ مزامنة البيانات...', 'info');
            
            // Process sync queue first
            await this.processSyncQueue();
            
            // Sync cases from Supabase
            const cases = await this.getCasesFromSupabase();
            if (cases.length > 0) {
                await this.syncCasesToIndexedDB(cases);
            }
            
            // Sync sessions from Supabase
            const sessions = await this.getSessionsFromSupabase();
            if (sessions.length > 0) {
                await this.syncSessionsToIndexedDB(sessions);
            }
            
            this.showLoading(false);
            this.showNotification('✅ تمت مزامنة البيانات بنجاح', 'success');
            
        } catch (error) {
            console.error('❌ Error syncing all data:', error);
            this.showLoading(false);
            this.showNotification('❌ فشلت مزامنة البيانات', 'error');
        }
    }

    async syncPendingOperations() {
        if (this.isOnline && this.supabase) {
            setTimeout(() => {
                this.processSyncQueue();
            }, 3000);
        }
    }

    // ==================== Export/Import ====================
    
    async exportData() {
        try {
            const cases = await this.getCases();
            const sessions = await this.getSessions();
            
            const data = {
                cases,
                sessions,
                exportDate: new Date().toISOString(),
                appVersion: '2.0'
            };
            
            return JSON.stringify(data, null, 2);
            
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            return null;
        }
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            let importedCount = 0;
            
            if (data.cases && Array.isArray(data.cases)) {
                for (const caseItem of data.cases) {
                    await this.saveCase(caseItem);
                    importedCount++;
                }
            }
            
            if (data.sessions && Array.isArray(data.sessions)) {
                for (const session of data.sessions) {
                    await this.saveSession(session);
                    importedCount++;
                }
            }
            
            return { success: true, count: importedCount };
            
        } catch (error) {
            console.error('❌ Error importing data:', error);
            return { success: false, error: error.message };
        }
    }

    async clearLocalData() {
        try {
            // Clear all IndexedDB stores
            const stores = ['cases', 'sessions', 'syncQueue'];
            
            for (const storeName of stores) {
                await new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    
                    request.onsuccess = () => resolve();
                    request.onerror = (event) => reject(event.target.error);
                });
            }
            
            console.log('🗑️ All local data cleared');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error clearing local data:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== Helper Methods ====================
    
    generateCaseCode() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `C-${year}${month}${day}-${random}`;
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
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

// Create global instance
const DatabaseInstance = new Database();
