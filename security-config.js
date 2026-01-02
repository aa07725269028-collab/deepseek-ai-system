/**
 * 🔒 إعدادات الأمان - مستوى عسكري
 * ⚠️ لا تعدل هذه الإعدادات إلا إذا كنت تعرف ما تفعل
 * 🚨 تخزين آمن: لا تخزن في GitHub في البيئة الإنتاجية
 */

const securityConfig = {
    // === إعدادات النظام الأساسية ===
    system: {
        name: "DeepSeek AI Security System",
        version: "1.0.0",
        securityLevel: "MILITARY_GRADE",
        maintenanceMode: false,
        maxUsers: 100,
        sessionTimeout: 900, // 15 دقيقة بالثواني
        dataRetentionDays: 365
    },

    // === إعدادات التشفير ===
    encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,      // 256-bit
        ivLength: 16,       // 128-bit
        saltRounds: 12,     // bcrypt rounds
        tokenSecret: process.env.TOKEN_SECRET || 'CHANGE_THIS_IN_PRODUCTION',
        refreshSecret: process.env.REFRESH_SECRET || 'CHANGE_THIS_TOO_IN_PRODUCTION'
    },

    // === سياسة كلمات المرور ===
    passwordPolicy: {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?",
        maxAgeDays: 90,          // تغيير كل 90 يوم
        historySize: 5,          // لا يمكن إعادة استخدام آخر 5 كلمات مرور
        lockoutAttempts: 5,      // 5 محاولات فاشلة
        lockoutMinutes: 30       // قفل لمدة 30 دقيقة
    },

    // === إعدادات المصادقة ===
    authentication: {
        tokenExpiry: '15m',      // JWT انتهاء بعد 15 دقيقة
        refreshTokenExpiry: '7d', // Refresh token 7 أيام
        cookieSecure: true,      // HTTPS فقط
        cookieHttpOnly: true,    // لا يمكن الوصول عبر JavaScript
        cookieSameSite: 'strict'
    },

    // === إعدادات المراقبة والتدقيق ===
    monitoring: {
        logLevel: 'info',        // error, warn, info, debug
        logFileSize: '50m',      // حجم ملف السجلات
        logFilesToKeep: 30,      // عدد الملفات المحفوظة
        auditLogRetention: 365,  // حفظ سجلات التدقيق سنة
        
        // أنواع الأحداث المسجلة
        logEvents: {
            login: true,
            logout: true,
            passwordChange: true,
            userCreate: true,
            userDelete: true,
            userDisable: true,
            adminActions: true,
            securityEvents: true,
            apiCalls: true
        }
    },

    // === تحكم الوصول ===
    accessControl: {
        // قائمة IPs المسموحة (فارغة = جميعها)
        allowedIPs: [],
        
        // IPs محظورة
        blockedIPs: [],
        
        // دول محظورة (رموز ISO)
        blockedCountries: ['KP', 'IR', 'SY', 'CU', 'VE'],
        
        // قيود الوقت
        timeRestrictions: {
            enabled: false,
            startHour: 6,    // 6 صباحاً
            endHour: 22      // 10 مساءً
        },
        
        // صلاحيات الأدوار
        roles: {
            superAdmin: ['*'],
            admin: [
                'users:read', 'users:create', 'users:update', 'users:disable',
                'audit:read', 'system:monitor', 'reports:generate'
            ],
            user: [
                'self:read', 'self:update', 'content:create', 'content:read'
            ]
        }
    },

    // === أمان API ===
    apiSecurity: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 دقيقة
            maxRequests: 100,
            message: '⚠️ تجاوزت الحد المسموح للطلبات. حاول مرة أخرى لاحقاً.'
        },
        
        cors: {
            enabled: true,
            // في الإنتاج: ['https://yourdomain.com']
            origins: ['http://localhost:3000', 'http://localhost:8080'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        },
        
        headers: {
            xssProtection: true,
            noSniff: true,
            frameguard: { action: 'deny' },
            hsts: { maxAge: 31536000, includeSubDomains: true },
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    fontSrc: ["'self'"],
                    connectSrc: ["'self'"]
                }
            }
        }
    },

    // === أمان قاعدة البيانات ===
    database: {
        connectionLimit: 10,
        connectTimeout: 10000,    // 10 ثواني
        acquireTimeout: 10000,
        timeout: 30000,           // 30 ثانية
        encryptionAtRest: true,
        backup: {
            frequency: 'daily',   // يومي
            retention: 30,        // 30 يوم
            location: '/secure/backups'
        },
        
        // جداول النظام
        tables: {
            users: 'deepseek_users',
            sessions: 'deepseek_sessions',
            audit_logs: 'deepseek_audit',
            social_accounts: 'deepseek_social',
            scheduled_posts: 'deepseek_posts',
            security_events: 'deepseek_security'
        }
    },

    // === إعدادات الشبكة ===
    network: {
        timeout: 30000,           // 30 ثانية
        keepAlive: true,
        maxSockets: 50,
        proxy: false,
        ssl: {
            enabled: true,
            force: true           // إجبار HTTPS
        }
    },

    // === إعدادات المحتوى ===
    content: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: [
            'video/mp4', 'video/avi', 'video/mov', 'video/mkv',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain'
        ],
        virusScan: true,
        contentFilter: true,
        autoModeration: true
    },

    // === إعدادات النشر ===
    publishing: {
        dailyLimit: 6,            // 6 منشورات يومياً
        minInterval: 240,         // 4 ساعات بين المنشورات
        platforms: {
            youtube: { enabled: true, apiRequired: true },
            facebook: { enabled: true, apiRequired: true },
            instagram: { enabled: true, apiRequired: true },
            tiktok: { enabled: true, apiRequired: true },
            twitter: { enabled: true, apiRequired: true }
        },
        schedule: {
            enabled: true,
            timezone: 'Asia/Riyadh',
            businessHours: { start: 8, end: 22 } // 8 صباحاً - 10 مساءً
        }
    },

    // === إعدادات البريد الإلكتروني ===
    email: {
        enabled: false,           // في الإنتاج: true
        securityAlerts: true,
        loginNotifications: true,
        passwordChangeAlerts: true,
        adminReports: true,
        rateLimit: 100            // 100 بريد في اليوم
    },

    // === إعدادات الطوارئ ===
    emergency: {
        shutdownCode: 'ALPHA-OMEGA-777',
        backupLocation: '/secure/emergency-backups',
        contact: {
            primary: 'security@deepseek.ai',
            secondary: 'admin@deepseek.ai',
            phone: '+966500000000'
        },
        protocols: {
            dataBreach: 'LOCKDOWN_IMMEDIATE',
            ddosAttack: 'ENABLE_RATE_LIMITING',
            unauthorizedAccess: 'LOG_AND_ALERT'
        }
    },

    // === قائمة المشرفين ===
    administrators: [
        {
            id: 1,
            username: 'superadmin',
            name: 'المشرف العام',
            email: 'superadmin@deepseek.ai',
            role: 'superAdmin',
            permissions: ['*'],
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        }
    ],

    // === إعدادات التحديث ===
    updates: {
        autoCheck: true,
        autoInstall: false,       // في الإنتاج: false
        notificationDays: 7,
        backupBeforeUpdate: true,
        supportedVersions: ['1.0.0', '1.1.0', '1.2.0']
    },

    // === إعدادات التطوير ===
    development: {
        debugMode: false,
        verboseLogging: false,
        skipAuth: false,
        testMode: false,
        mockData: false
    }
};

// === دوال الأمان ===
securityConfig.validatePassword = function(password) {
    const policy = this.passwordPolicy;
    const errors = [];

    if (password.length < policy.minLength) {
        errors.push(`يجب أن تكون كلمة المرور ${policy.minLength} أحرف على الأقل`);
    }

    if (password.length > policy.maxLength) {
        errors.push(`يجب ألا تتجاوز كلمة المرور ${policy.maxLength} حرف`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('يجب أن تحتوي على حرف كبير على الأقل');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('يجب أن تحتوي على حرف صغير على الأقل');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
        errors.push('يجب أن تحتوي على رقم على الأقل');
    }

    if (policy.requireSpecialChars) {
        const specialRegex = new RegExp(`[${this.escapeRegExp(policy.specialChars)}]`);
        if (!specialRegex.test(password)) {
            errors.push(`يجب أن تحتوي على رمز خاص من: ${policy.specialChars}`);
        }
    }

    // التحقق من القوة
    const strength = this.calculatePasswordStrength(password);
    if (strength < 3) {
        errors.push('كلمة المرور ضعيفة جداً');
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        strength: strength
    };
};

securityConfig.calculatePasswordStrength = function(password) {
    let score = 0;
    
    // الطول
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    
    // الأحرف الكبيرة
    if (/[A-Z]/.test(password)) score += 1;
    
    // الأحرف الصغيرة
    if (/[a-z]/.test(password)) score += 1;
    
    // الأرقام
    if (/\d/.test(password)) score += 1;
    
    // الرموز الخاصة
    const specialRegex = new RegExp(`[${this.escapeRegExp(this.passwordPolicy.specialChars)}]`);
    if (specialRegex.test(password)) score += 1;
    
    // التنوع
    const uniqueChars = new Set(password).size;
    if (uniqueChars / password.length > 0.7) score += 1;
    
    return Math.min(score, 5); // من 0 إلى 5
};

securityConfig.escapeRegExp = function(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

securityConfig.generateTokenPayload = function(user) {
    return {
        userId: user.id,
        username: user.username,
        role: user.role || 'user',
        isAdmin: user.isAdmin || false,
        permissions: user.permissions || [],
        sessionId: this.generateSessionId()
    };
};

securityConfig.generateSessionId = function() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

securityConfig.getPlatformConfig = function(platform) {
    return this.publishing.platforms[platform] || null;
};

securityConfig.isPlatformEnabled = function(platform) {
    const config = this.getPlatformConfig(platform);
    return config ? config.enabled : false;
};

securityConfig.validateIP = function(ip) {
    const blocked = this.accessControl.blockedIPs;
    const allowed = this.accessControl.allowedIPs;
    
    // إذا كانت القائمة المسموحة فارغة، جميع الـ IPs مسموحة
    if (allowed.length > 0 && !allowed.includes(ip)) {
        return false;
    }
    
    // التحقق من المحظورة
    if (blocked.includes(ip)) {
        return false;
    }
    
    return true;
};

// === تصدير الإعدادات ===
module.exports = securityConfig;

// === تحذير عند التحميل ===
console.log(`
🔒 تم تحميل إعدادات الأمان
📋 الإصدار: ${securityConfig.system.version}
🛡️ مستوى الأمان: ${securityConfig.system.securityLevel}
👥 الحد الأقصى للمستخدمين: ${securityConfig.system.maxUsers}
`);
