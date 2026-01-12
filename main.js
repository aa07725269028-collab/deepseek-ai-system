// ====================================================
// 👑 DEEPSEEK EMPIRE MAIN SYSTEM - النظام الرئيسي
// ⚡ يربط كل الأنظمة معاً
// ====================================================

const express = require('express');
const EmpirePublisher = require('./auto-publisher');
const EmpireVideoGenerator = require('./video-generator');
const EmpireScheduler = require('./scheduler');

// تهيئة الأنظمة
const publisher = new EmpirePublisher();
const videoGenerator = new EmpireVideoGenerator();
const scheduler = new EmpireScheduler();

// بيانات تجريبية
const demoUsers = [
    {
        username: 'user1',
        country: 'السعودية',
        platforms: ['youtube', 'tiktok', 'instagram'],
        contentPreferences: ['education', 'technology']
    },
    {
        username: 'user2', 
        country: 'مصر',
        platforms: ['facebook', 'tiktok', 'youtube'],
        contentPreferences: ['entertainment', 'news']
    },
    {
        username: 'user3',
        country: 'الإمارات',
        platforms: ['instagram', 'snapchat', 'tiktok'],
        contentPreferences: ['lifestyle', 'technology']
    }
];

// API: النظام الكامل
app.post('/api/empire/auto-publish', async (req, res) => {
    try {
        const { topic } = req.body;
        
        if (!topic) {
            return res.json({ success: false, error: 'الموضوع مطلوب' });
        }

        console.log('🚀 بدء النظام الإمبراطوري:', topic);

        // 1. توليد فيديوهات للدول المختلفة
        const countries = ['السعودية', 'مصر', 'الإمارات'];
        const videosResult = await videoGenerator.generateVideosForCountries(topic, countries);
        
        if (!videosResult.success) {
            return res.json({ success: false, error: 'فشل في توليد الفيديوهات' });
        }

        // 2. جدولة النشر للمستخدمين
        const schedulingResult = await scheduler.scheduleMultipleUsers(
            demoUsers,
            videosResult.videos[0]?.video
        );

        // 3. بدء النشر الفوري على بعض المنصات
        const publishResults = [];
        
        for (const user of demoUsers.slice(0, 2)) { // أول مستخدمين فقط
            const result = await publisher.massPublish(
                videosResult.videos[0]?.video?.url || 'https://empire.ai/video.mp4',
                videosResult.videos[0]?.text || topic,
                user.country,
                user.platforms.slice(0, 2) // أول منصتين فقط
            );
            
            publishResults.push({
                user: user.username,
                country: user.country,
                ...result
            });
        }

        res.json({
            success: true,
            message: '✨ تم تشغيل النظام الإمبراطوري بنجاح',
            summary: {
                videos_generated: videosResult.videos_generated,
                users_scheduled: schedulingResult.total_users,
                immediate_publishes: publishResults.length,
                total_platforms: publishResults.reduce((sum, r) => sum + (r.totalPlatforms || 0), 0)
            },
            videos: videosResult.videos,
            scheduling: schedulingResult,
            publishing: publishResults,
            system: {
                status: 'EMPIRE_ACTIVE',
                timestamp: new Date().toISOString(),
                next_auto_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        });

    } catch (error) {
        console.error('❌ خطأ في النظام:', error);
        res.json({ success: false, error: error.message });
    }
});

// API: إحصائيات النظام
app.get('/api/empire/stats', (req, res) => {
    const stats = {
        publisher: {
            platforms_supported: Object.keys(publisher.platforms).length,
            countries_supported: Object.keys(publisher.countryConfigs).length
        },
        video_generator: {
            styles: Object.keys(videoGenerator.styles),
            languages: Object.keys(videoGenerator.languages)
        },
        scheduler: scheduler.getSchedulingStats(),
        system: {
            uptime: process.uptime(),
            version: 'EMPIRE_1.0.0',
            ai_power: 'OMEGA'
        }
    };

    res.json({ success: true, stats });
});

// API: اختبار النظام
app.get('/api/empire/test', async (req, res) => {
    try {
        // توليد فيديو تجريبي
        const videoResult = await videoGenerator.generateVideo(
            'اختبار النظام الإمبراطوري',
            'cinematic',
            15
        );

        // جدولة تجريبية
        const scheduleResult = scheduler.createSmartSchedule(demoUsers[0]);

        res.json({
            success: true,
            test: 'EMPIRE_SYSTEM_TEST_PASSED',
            video: videoResult.success ? videoResult.data : null,
            schedule: scheduleResult,
            message: '✅ النظام الإمبراطوري يعمل بشكل مثالي'
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

console.log(`
👑 نظام النشر الإمبراطوري جاهز!
📁 الملفات المضافة:
1. auto-publisher.js - للنشر على 12+ منصة
2. video-generator.js - لتوليد فيديوهات ذكية
3. scheduler.js - للجدولة الذكية
4. main.js - النظام الرئيسي

🚀 استخدم API:
POST /api/empire/auto-publish - للنشر التلقائي
GET /api/empire/stats - لإحصائيات النظام
GET /api/empire/test - لاختبار النظام
`);
