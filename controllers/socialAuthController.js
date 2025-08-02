const axios = require('axios');
const User = require('../models/userModel');
const SocialAccount = require('../models/socialAccountModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

class SocialAuthController {
  // بدء عملية OAuth
  static initiateOAuth = catchAsync(async (req, res, next) => {
    const { platform } = req.params;
    const { redirectUri } = req.query;

    let authUrl = '';
    const state = JSON.stringify({
      userId: req.user.id,
      redirectUri: redirectUri || `${process.env.FRONTEND_URL}/dashboard`
    });

    switch (platform) {
      case 'facebook':
        authUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${process.env.FB_APP_ID}&redirect_uri=${process.env.BACKEND_URL}/api/v1/auth/facebook/callback&state=${encodeURIComponent(state)}&scope=pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages,pages_messaging`;
        break;
      case 'instagram':
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_APP_ID}&redirect_uri=${process.env.BACKEND_URL}/api/v1/auth/instagram/callback&scope=user_profile,user_media&response_type=code&state=${encodeURIComponent(state)}`;
        break;
      case 'tiktok':
        authUrl = `https://www.tiktok.com/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.upload,video.publish,comment.list,comment.create&response_type=code&redirect_uri=${process.env.BACKEND_URL}/api/v1/auth/tiktok/callback&state=${encodeURIComponent(state)}`;
        break;
      default:
        return next(new AppError('المنصة غير مدعومة', 400));
    }

    res.redirect(authUrl);
  });

  // معالجة رد استدعاء فيسبوك
  static handleFacebookCallback = catchAsync(async (req, res, next) => {
    const { code, state } = req.query;
    if (!code) return next(new AppError('رمز التفعيل غير موجود', 400));

    const stateObj = JSON.parse(decodeURIComponent(state));
    const userId = stateObj.userId;

    // استبدال الرمز المميز للوصول
    const tokenResponse = await axios.get(`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${process.env.FB_APP_ID}&redirect_uri=${process.env.BACKEND_URL}/api/v1/auth/facebook/callback&client_secret=${process.env.FB_APP_SECRET}&code=${code}`);
    
    const { access_token: accessToken, expires_in: expiresIn } = tokenResponse.data;

    // جلب بيانات المستخدم من فيسبوك
    const profileResponse = await axios.get(`https://graph.facebook.com/v12.0/me?fields=id,name&access_token=${accessToken}`);
    const { id: facebookUserId, name: facebookUsername } = profileResponse.data;
    
    // الحصول على معلومات الصفحات المرتبطة
    const pagesResponse = await axios.get(`https://graph.facebook.com/v12.0/me/accounts?access_token=${accessToken}`);
    
    // تحديث بيانات المستخدم
    // البحث عن حساب موجود أو إنشاء حساب جديد
    await SocialAccount.findOneAndUpdate(
      { user: userId, platform: 'facebook', accountId: facebookUserId },
      {
        user: userId,
        platform: 'facebook',
        accountId: facebookUserId, // تم الإصلاح
        platformUsername: facebookUsername, // تم الإصلاح
        accessToken: accessToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        isActive: true,
        lastTokenRefresh: new Date(),
        metadata: {
          pages: pagesResponse.data.data.map(page => ({
            id: page.id,
            name: page.name,
            accessToken: page.access_token,
            category: page.category,
            perms: page.perms
          }))
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.redirect(`${stateObj.redirectUri}?status=success&platform=facebook`);
  });

  // معالجة رد استدعاء انستغرام
  static handleInstagramCallback = catchAsync(async (req, res, next) => {
    const { code, state } = req.query;
    if (!code) return next(new AppError('رمز التفعيل غير موجود', 400));

    const stateObj = JSON.parse(decodeURIComponent(state));
    const userId = stateObj.userId;

    // استبدال الكود بتوكن وصول
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://api.instagram.com/oauth/access_token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BACKEND_URL}/api/v1/auth/instagram/callback`,
        code
      }).toString(),
    });
    const { access_token: accessToken, user_id: instagramUserId } = tokenResponse.data;

    // جلب معلومات الحساب (اختياري)
    let accountInfo = {};
    try {
      const userInfo = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`);
      accountInfo = userInfo.data;
    } catch (e) { /* تجاهل الخطأ إذا فشل */ }

    await SocialAccount.findOneAndUpdate(
      { user: userId, platform: 'instagram' },
      {
        user: userId,
        platform: 'instagram',
        accountId: instagramUserId,
        platformUsername: accountInfo.username,
        accessToken: accessToken,
        tokenExpiresAt: null,
        isActive: true,
        lastTokenRefresh: new Date(),
        metadata: accountInfo
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.redirect(`${stateObj.redirectUri}?status=success&platform=instagram`);
  });

  // معالجة رد استدعاء تيك توك
  static handleTikTokCallback = catchAsync(async (req, res, next) => {
    const { code, state } = req.query;
    if (!code) return next(new AppError('رمز التفعيل غير موجود', 400));

    const stateObj = JSON.parse(decodeURIComponent(state));
    const userId = stateObj.userId;

    // استبدال الكود بتوكن وصول
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://open.tiktokapis.com/v2/oauth/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.BACKEND_URL}/api/v1/auth/tiktok/callback`
      }).toString(),
    });
    const { access_token: accessToken, expires_in: expiresIn, open_id: tiktokOpenId } = tokenResponse.data.data;

    // جلب معلومات الحساب (اختياري)
    let accountInfo = {};
    try {
      const userInfo = await axios.get(`https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url&access_token=${accessToken}`);
      accountInfo = userInfo.data.data;
    } catch (e) { /* تجاهل الخطأ إذا فشل */ }

    await SocialAccount.findOneAndUpdate(
      { user: userId, platform: 'tiktok' },
      {
        user: userId,
        platform: 'tiktok',
        accountId: tiktokOpenId,
        platformUsername: accountInfo.display_name,
        platformProfileUrl: accountInfo.avatar_url,
        accessToken: accessToken,
        tokenExpiresAt: new Date(Date.now() + (expiresIn || 0) * 1000),
        isActive: true,
        lastTokenRefresh: new Date(),
        metadata: accountInfo
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.redirect(`${stateObj.redirectUri}?status=success&platform=tiktok`);
  });

}

module.exports = SocialAuthController;
