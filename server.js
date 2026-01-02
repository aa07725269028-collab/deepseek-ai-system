// ====================================================
// 🚀 DeepSeek AI Security System - الخادم الرئيسي
// 🔒 مستوى الأمان: عسكري
// 📅 الإصدار: 1.0.0
// ====================================================

// === استيراد المكتبات ===
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// === استيراد إعدادات الأمان ===
const securityConfig = require('./security-config');

// === تهيئة التطبيق ===
const app = express();
const PORT = process.env.PORT || 3000;

// === نظام السجلات المتقدم ===
const logger = winston.createLogger({
    level: securityConfig.monitoring.logLevel,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'deepseek-ai-server' },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: securityConfig.monitoring.logFileSize,
            maxFiles: securityConfig.monitoring.logFilesToKeep
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: securityConfig.monitoring.logFileSize,
            maxFiles: securityConfig.monitoring.logFilesToKeep
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// === وسائط الأمان ===
app.use(helmet(securityConfig.apiSecurity.headers));
app.use(cors(securityConfig.apiSecurity.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === معدل التحديد ===
const apiLimiter = rateLimit(securityConfig.apiSecurity.rateLimit);
app.use('/api/', apiLimiter);

// === قاعدة بيانات مؤقتة (في الإنتاج تستخدم MySQL) ===
let usersDB = [];
let socialAccountsDB = [];
let auditLogDB = [];
let sessionsDB = [];
let securityEventsDB = [];

// === دوال الأمان ===

/**
 * تسجيل حدث تدقيق
 */
function logAudit(action, userId, details, ip = '127.0.0.1') {
    const logEntry = {
        id: auditLogDB.length + 1,
        timestamp: new Date().toISOString(),
        action,
        userId,
        details: typeof details === 'object' ? details : { message: details },
        ip,
        severity: getActionSeverity(action)
    };
    
    auditLogDB.push(logEntry);
    
    // حفظ في ملف (في الإنتاج: قاعدة بيانات)
    if (securityConfig.monitoring.logEvents[getActionType(action)]) {
        logger.info(`🔍 تدقيق: ${action}`, { userId, ip, details });
    }
    
    // تنظيف السجلات القديمة
    cleanupOldLogs();
    
    return logEntry;
}

/**
 * تسجيل حدث أمني
 */
function logSecurityEvent(eventType, details, severity = 'medium') {
    const event = {
        id: securityEventsDB.length + 1,
        timestamp: new Date().toISOString(),
        eventType,
        details,
        severity,
        ip: details.ip || '127.0.0.1',
        userAgent: details.userAgent || 'Unknown'
    };
    
    securityEventsDB.push(event);
    logger[severity === 'high' ? 'error' : 'warn'](`🚨 حدث أمني: ${eventType}`, details);
    
    // في الإنتاج: إرسال تنبيه للمشرف
    if (severity === 'high') {
        sendSecurityAlert(event);
    }
    
    return event;
}

/**
 * إنشاء مستخدم جديد
 */
async function createUser(username, password, isAdmin = false) {
    // التحقق من اسم المستخدم المكرر
    if (usersDB.find(u => u.username === username)) {
        throw new Error('اسم المستخدم موجود مسبقاً');
    }
    
    // التحقق من قوة كلمة المرور
    const validation = securityConfig.validatePassword(password);
    if (!validation.valid) {
        throw new Error(`كلمة المرور ضعيفة: ${validation.errors.join(', ')}`);
    }
    
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(
        password, 
        securityConfig.encryption.saltRounds
    );
    
    const user = {
        id: usersDB.length + 1,
        username,
        password: hashedPassword,
        isAdmin,
        role: isAdmin ? 'admin' : 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        lastPasswordChange: new Date().toISOString(),
        loginAttempts: 0,
        lockedUntil: null,
        permissions: isAdmin ? securityConfig.accessControl.roles.admin : securityConfig.accessControl.roles.user
    };
    
    usersDB.push(user);
    logAudit('USER_CREATED', user.id, { username, isAdmin });
    
    return user;
}

/**
 * التحقق من صلاحية المستخدم
 */
function validateUserStatus(user) {
    if (!user.isActive) {
        throw new Error('الحساب معطل');
    }
    
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / (1000 * 60));
        throw new Error(`الحساب مقفل مؤقتاً. حاول مرة أخرى بعد ${minutesLeft} دقيقة`);
    }
    
    // التحقق من انتهاء صلاحية كلمة المرور
    const passwordAge = (new Date() - new Date(user.lastPasswordChange)) / (1000 * 60 * 60 * 24);
    if (passwordAge > securityConfig.passwordPolicy.maxAgeDays) {
        logSecurityEvent('PASSWORD_EXPIRED', { userId: user.id, username: user.username });
    }
    
    return true;
}

/**
 * تحديث محاولات الدخول
 */
function updateLoginAttempts(user, success) {
    if (success) {
        user.loginAttempts = 0;
        user.lockedUntil = null;
        user.lastLogin = new Date().toISOString();
    } else {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        
        if (user.loginAttempts >= securityConfig.passwordPolicy.lockoutAttempts) {
            const lockoutTime = new Date();
            lockoutTime.setMinutes(lockoutTime.getMinutes() + securityConfig.passwordPolicy.lockoutMinutes);
            user.lockedUntil = lockoutTime.toISOString();
            
            logSecurityEvent('ACCOUNT_LOCKED', {
                userId: user.id,
                username: user.username,
                attempts: user.loginAttempts,
                lockedUntil: user.lockedUntil
            }, 'high');
        }
    }
}

/**
 * إنشاء جلسة جديدة
 */
function createSession(userId, token) {
    const session = {
        id: sessionsDB.length + 1,
        userId,
        token,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 دقيقة
        lastActivity: new Date().toISOString(),
        ip: '127.0.0.1', // في الإنتاج: req.ip
        isValid: true
    };
    
    sessionsDB.push(session);
    return session;
}

/**
 * التحقق من صلاحية الجلسة
 */
function validateSession(token) {
    const session = sessionsDB.find(s => s.token === token && s.isValid);
    
    if (!session) {
        return null;
    }
    
    if (new Date(session.expiresAt) < new Date()) {
        session.isValid = false;
        return null;
    }
    
    // تحديث آخر نشاط
    session.lastActivity = new Date().toISOString();
    
    return session;
}

/**
 * إنهاء الجلسة
 */
function invalidateSession(token) {
    const session = sessionsDB.find(s => s.token === token);
    if (session) {
        session.isValid = false;
        session.endedAt = new Date().toISOString();
    }
}

/**
 * تنظيف السجلات القديمة
 */
function cleanupOldLogs() {
    const retentionDays = securityConfig.monitoring.auditLogRetention;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    auditLogDB = auditLogDB.filter(log => new Date(log.timestamp) > cutoffDate);
    securityEventsDB = securityEventsDB.filter(event => new Date(event.timestamp) > cutoffDate);
    
    // تنظيف الجلسات المنتهية
    sessionsDB = sessionsDB.filter(session => {
        if (!session.isValid) return false;
        if (new Date(session.expiresAt) < new Date()) {
            session.isValid = false;
            return false;
        }
        return true;
    });
}

// === دوال مساعدة ===
function getActionSeverity(action) {
    const severeActions = ['ACCOUNT_LOCKED', 'PASSWORD_CHANGE', 'USER_DELETE', 'SECURITY_BREACH'];
    const mediumActions = ['LOGIN_FAILED', 'USER_DISABLE', 'USER_ENABLE'];
    
    if (severeActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';
    return 'low';
}

function getActionType(action) {
    if (action.includes('LOGIN')) return 'login';
    if (action.includes('USER')) return 'user';
    if (action.includes('PASSWORD')) return 'passwordChange';
    if (action.includes('SECURITY')) return 'securityEvents';
    return 'apiCalls';
}

function sendSecurityAlert(event) {
    // في الإنتاج: إرسال بريد إلكتروني/رسالة للمشرف
    console.log(`🚨 تنبيه أمني عاجل: ${event.eventType}`);
    console.log(`📝 التفاصيل: ${JSON.stringify(event.details, null, 2)}`);
}

// === واجهات API ===

/**
 * 🔐 تسجيل الدخول
 */
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // التحقق من الإدخال
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'يرجى إدخال اسم المستخدم وكلمة المرور' 
            });
        }
        
        // البحث عن المستخدم
        const user = usersDB.find(u => u.username === username);
        
        if (!user) {
            logSecurityEvent('LOGIN_FAILED', { 
                username, 
                reason: 'مستخدم غير موجود',
                ip: clientIP 
            });
            return res.status(401).json({ 
                error: 'بيانات الدخول غير صحيحة' 
            });
        }
        
        // التحقق من حالة المستخدم
        try {
            validateUserStatus(user);
        } catch (statusError) {
            return res.status(403).json({ error: statusError.message });
        }
        
        // التحقق من كلمة المرور
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            updateLoginAttempts(user, false);
            logAudit('LOGIN_FAILED', user.id, { 
                username, 
                reason: 'كلمة مرور خاطئة',
                ip: clientIP 
            });
            return res.status(401).json({ 
                error: 'بيانات الدخول غير صحيحة',
                remainingAttempts: securityConfig.passwordPolicy.lockoutAttempts - user.loginAttempts
            });
        }
        
        // تسجيل الدخول الناجح
        updateLoginAttempts(user, true);
        
        // إنشاء التوكن
        const tokenPayload = securityConfig.generateTokenPayload(user);
        const token = jwt.sign(
            tokenPayload,
            securityConfig.encryption.tokenSecret,
            { expiresIn: securityConfig.authentication.tokenExpiry }
        );
        
        // إنشاء جلسة
        const session = createSession(user.id, token);
        
        logAudit('LOGIN_SUCCESS', user.id, { 
            username, 
            sessionId: session.id,
            ip: clientIP 
        });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                role: user.role,
                permissions: user.permissions
            },
            session: {
                id: session.id,
                expiresAt: session.expiresAt
            },
            message: '✅ تم تسجيل الدخول بنجاح'
        });
        
    } catch (error) {
        logger.error('خطأ في تسجيل الدخول:', error);
        res.status(500).json({ 
            error: 'خطأ في الخادم',
            details: securityConfig.development.debugMode ? error.message : undefined
        });
    }
});

/**
 * 👤 تغيير كلمة المرور
 */
app.post('/api/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        // التحقق من التوكن
        const decoded = jwt.verify(token, securityConfig.encryption.tokenSecret);
        const user = usersDB.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        // التحقق من كلمة المرور الحالية
        const validCurrent = await bcrypt.compare(currentPassword, user.password);
        if (!validCurrent) {
            logAudit('PASSWORD_CHANGE_FAILED', user.id, { reason: 'كلمة المرور الحالية خاطئة' });
            return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
        }
        
        // التحقق من كلمة المرور الجديدة
        const validation = securityConfig.validatePassword(newPassword);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'كلمة المرور الجديدة ضعيفة',
                details: validation.errors 
            });
        }
        
        // تشفير كلمة المرور الجديدة
        const hashedPassword = await bcrypt.hash(newPassword, securityConfig.encryption.saltRounds);
        user.password = hashedPassword;
        user.lastPasswordChange = new Date().toISOString();
        
        // إضافة إلى سجل كلمات المرور
        if (!user.passwordHistory) user.passwordHistory = [];
        user.passwordHistory.push({
            password: hashedPassword,
            changedAt: user.lastPasswordChange
        });
        
        // حفظ آخر 5 كلمات مرور فقط
        if (user.passwordHistory.length > securityConfig.passwordPolicy.historySize) {
            user.passwordHistory = user.passwordHistory.slice(-securityConfig.passwordPolicy.historySize);
        }
        
        logAudit('PASSWORD_CHANGED', user.id, {});
        res.json({ 
            success: true,
            message: '✅ تم تغيير كلمة المرور بنجاح',
            nextChange: new Date(Date.now() + securityConfig.passwordPolicy.maxAgeDays * 24 * 60 * 60 * 1000)
        });
        
    } catch (error) {
        logger.error('خطأ في تغيير كلمة المرور:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

/**
 * 👑 الحصول على قائمة المستخدمين (للمشرف فقط)
 */
app.get('/api/admin/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        const decoded = jwt.verify(token, securityConfig.encryption.tokenSecret);
        
        if (!decoded.isAdmin) {
            logAudit('UNAUTHORIZED_ACCESS', decoded.userId, { action: 'GET_USERS' });
            return res.status(403).json({ error: 'صلاحيات غير كافية' });
        }
        
        // إرجاع قائمة المستخدمين بدون كلمات المرور
        const usersList = usersDB.map(user => ({
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            lastPasswordChange: user.lastPasswordChange,
            loginAttempts: user.loginAttempts,
            lockedUntil: user.lockedUntil
        }));
        
        logAudit('USERS_LISTED', decoded.userId, { count: usersList.length });
        res.json({
            success: true,
            users: usersList,
            total: usersList.length,
            active: usersList.filter(u => u.isActive).length,
            locked: usersList.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length
        });
        
    } catch (error) {
        logger.error('خطأ في جلب المستخدمين:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

/**
 * ➕ إضافة مستخدم جديد (للمشرف فقط)
 */
app.post('/api/admin/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        const decoded = jwt.verify(token, securityConfig.encryption.tokenSecret);
        
        if (!decoded.isAdmin) {
            logAudit('UNAUTHORIZED_ACCESS', decoded.userId, { action: 'CREATE_USER' });
            return res.status(403).json({ error: 'صلاحيات غير كافية' });
        }
        
        const { username, password, isAdmin = false } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'يرجى إدخال جميع الحقول' });
        }
        
        const user = await createUser(username, password, isAdmin);
        
        res.json({
            success: true,
            message: `✅ تم إنشاء المستخدم ${username} بنجاح`,
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        logger.error('خطأ في إنشاء المستخدم:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * 🚫 تعطيل مستخدم (للمشرف فقط)
 */
app.put('/api/admin/users/:id/disable', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        const decoded = jwt.verify(token, securityConfig.encryption.tokenSecret);
        
        if (!decoded.isAdmin) {
            logAudit('UNAUTHORIZED_ACCESS', decoded.userId, { action: 'DISABLE_USER' });
            return res.status(403).json({ error: 'صلاحيات غير كافية' });
        }
        
        const userId = parseInt(req.params.id);
        const user = usersDB.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        // لا يمكن تعطيل المشرف الرئيسي
        if (user.username === 'admin' || user.username === 'superadmin') {
            return res.status(400).json({ error: 'لا يمكن تعطيل المشرف الرئيسي' });
        }
        
        // لا يمكن تعطيل نفسه
        if (user.id === decoded.userId) {
            return res.status(400).json({ error: 'لا يمكن تعطيل حسابك الخاص' });
        }
        
        user.isActive = false;
        user.disabledAt = new Date().toISOString();
        user.disabledBy = decoded.userId;
        
        // إنهاء جميع جلسات المستخدم
        sessionsDB.filter(s => s.userId === userId).forEach(s => {
            s.isValid = false;
            s.endedAt = new Date().toISOString();
        });
        
        logAudit('USER_DISABLED', decoded.userId, { 
            targetUserId: userId, 
            targetUsername: user.username 
        });
        
        res.json({ 
            success: true,
            message: `✅ تم تعطيل المستخدم ${user.username}` 
        });
        
    } catch (error) {
        logger.error('خطأ في تعطيل المستخدم:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

/**
 * ✅ تفعيل مستخدم (للمشرف فقط)
 */
app.put('/api/admin/users/:id/enable', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        const decoded = jwt.verify(token, securityConfig.encryption.tokenSecret);
        
        if (!decoded.isAdmin) {
            logAudit('UNAUTHORIZED_ACCESS', decoded.userId, { action: 'ENABLE_USER' });
            return res.status(403).json({ error: 'صلاحيات غير كافية' });
        }
        
        const userId = parseInt(req.params.id);
        const user = usersDB.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        user.isActive = true;
        user.enabledAt = new Date().toISOString();
        user.enabledBy = decoded.userId;
        
        logAudit('USER_ENABLED', decoded.userId, { 
            targetUserId: userId, 
            targetUsername: user.username 
        });
        
        res.json({ 
            success: true,
            message: `✅ تم تفعيل المستخدم ${user.username}` 
        });
        
    } catch (error) {
        logger.error('خطأ في تفعيل المستخدم:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

/**
 * 📊 الحصول على سجلات التدقيق (للمشرف فقط)
 */
app.get('/api/admin/audit-logs', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        const decoded = jwt.verify(token, securityConfig.encryption.tokenSecret);
        
        if (!decoded.isAdmin) {
            logAudit('UNAUTHORIZED_ACCESS', decoded.userId, { action: 'GET_AUDIT_LOGS' });
            return res.status(403).json({ error: 'صلاحيات غير كافية' });
        }
        
        const { page = 1, limit = 50, action, severity, startDate, endDate } = req.query;
        let filteredLogs = [...auditLogDB];
        
        // التصفية حسب الإجراء
        if (action) {
            filteredLogs = filteredLogs.filter(log => log.action.includes(action));
        }
        
        // التصفية حسب الشدة
        if (severity) {
            filteredLogs = filteredLogs.filter(log => log.severity === severity);
        }
        
        // التصفية حسب التاريخ
        if (startDate) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
        }
        
        if (endDate) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
        }
        
        // الترتيب من الأحدث للأقدم
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // التجزئة
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            logs: paginatedLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filteredLogs.length,
                pages: Math.ceil(filteredLogs.length / limit)
            },
            filters: {
                action,
                severity,
                startDate,
                endDate
            }
        });
        
    } catch (error) {
        logger.error('خطأ في جلب سجلات التدقيق:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

/**
 * 📈 إحصائيات النظام (للمشرف فقط)
 */
app.get('/api/admin/stats', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        const decoded = jwt.verify(token, securityConfig.encryption.tokenSecret);
        
        if (!decoded.isAdmin) {
            return res.status(403).json({ error: 'صلاحيات غير كافية' });
        }
        
        const stats = {
            users: {
                total: usersDB.length,
                active: usersDB.filter(u => u.isActive).length,
                admin: usersDB.filter(u => u.isAdmin).length,
                locked: usersDB.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length,
                disabled: usersDB.filter(u => !u.isActive).length
            },
            sessions: {
                active: sessionsDB.filter(s => s.isValid).length,
                total: sessionsDB.length
            },
            logs: {
                audit: auditLogDB.length,
                security: securityEventsDB.length,
                today: auditLogDB.filter(log => 
                    new Date(log.timestamp).toDateString() === new Date().toDateString()
                ).length
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: securityConfig.system.version,
                securityLevel: securityConfig.system.securityLevel
            }
        };
        
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('خطأ في جلب الإحصائيات:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

/**
 * 🏠 خدمة الملفات الثابتة
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

// === تهيئة المستخدمين الافتراضيين ===
async function initializeSystem() {
    try {
        // إنشاء المستخدمين الافتراضيين إذا لم يكونوا موجودين
        if (!usersDB.find(u => u.username === 'superadmin')) {
            await createUser('superadmin', 'Super@Admin123!', true);
            logger.info('✅ تم إنشاء المشرف العام');
        }
        
        if (!usersDB.find(u => u.username === 'admin')) {
            await createUser('admin', 'Admin@2024Secure!', true);
            logger.info('✅ تم إنشاء المشرف');
        }
        
        if (!usersDB.find(u => u.username === 'user1')) {
            await createUser('user1', 'User@2024Secure!', false);
            logger.info('✅ تم إنشاء المستخدم التجريبي');
        }
        
        logger.info('✅ تم تهيئة النظام بنجاح');
        
    } catch (error) {
        logger.error('❌ خطأ في تهيئة النظام:', error);
    }
}

// === تشغيل الخادم ===
async function startServer() {
    try {
        // إنشاء مجلد السجلات إذا لم يكن موجوداً
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs', { recursive: true });
        }
        
        // تهيئة النظام
        await initializeSystem();
        
        // تشغيل الخادم
        app.listen(PORT, () => {
            console.log(`
            ============================================
            🚀 DeepSeek AI Security System
            🔒 مستوى الأمان: ${securityConfig.system.securityLevel}
            ============================================
            📍 يعمل على: http://localhost:${PORT}
            ⏰ الوقت: ${new Date().toLocaleString('ar-SA')}
            📦 الإصدار: ${securityConfig.system.version}
            
            👑 المستخدمون الافتراضيون:
            1. superadmin / Super@Admin123! (المشرف العام)
            2. admin / Admin@2024Secure! (المشرف)
            3. user1 / User@2024Secure! (مستخدم عادي)
            
            ⚠️ تحذير: غير كلمات المرور فوراً في الإنتاج!
            ============================================
            `);
            
            logger.info(`🚀 الخادم يعمل على البورت ${PORT}`);
            
            // جدولة تنظيف السجلات كل ساعة
            setInterval(cleanupOldLogs, 60 * 60 * 1000);
        });
        
    } catch (error) {
        logger.error('❌ فشل في تشغيل الخادم:', error);
        process.exit(1);
    }
}

// === تشغيل النظام ===
if (require.main === module) {
    startServer();
}

// === تصدير للتطوير والاختبار ===
module.exports = {
    app,
    usersDB,
    auditLogDB,
    securityEventsDB,
    sessionsDB,
    logAudit,
    logSecurityEvent,
    createUser,
    validateUserStatus
};
