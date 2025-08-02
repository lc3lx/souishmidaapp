const axios = require("axios");
const AppError = require("../utils/appError");
const Message = require("../models/messageModel");
const Post = require("../models/postModel");
const Comment = require("../models/commentModel");
const Product = require("../models/productModel");

// استيراد مكتبات المنصات
const { FacebookAdsApi, AdAccount } = require("facebook-nodejs-business-sdk");
const tiktok = require("tiktok-app-api"); // السطر الجديد

// تكوين فيسبوك
if (!process.env.FB_ACCESS_TOKEN) {
  console.error(
    "Facebook Access Token is missing. Using dummy token for development"
  );
  process.env.FB_ACCESS_TOKEN = "dummy_token_for_development";
}

// تهيئة Facebook API
const api = FacebookAdsApi.init(process.env.FB_ACCESS_TOKEN);
// تمكين وضع التصحيح
api.setDebug(true);

// إنشاء كائن AdAccount إذا كان معرف الحساب متوفراً
let adAccount = null;
if (process.env.FB_AD_ACCOUNT_ID) {
  adAccount = new AdAccount("act_" + process.env.FB_AD_ACCOUNT_ID);
} else {
  console.warn(
    "Facebook Ad Account ID is missing. Some features may not work."
  );
}

// تكوين تيك توك
let tiktokApp = null;
(async () => {
  try {
    tiktokApp = await tiktok();
    // مثال: جلب بيانات مستخدم
    // const user = await tiktokApp.getUserByName('username');
    // const userInfo = await tiktokApp.getUserInfo(user);
    // console.log(userInfo);
  } catch (err) {
    console.error("فشل ربط تيك توك:", err);
  }
})();

class SocialMediaService {
  constructor(user) {
    this.user = user;
    this.platformServices = {
      facebook: this._publishToFacebook.bind(this),
      instagram: this._publishToInstagram.bind(this),
      tiktok: this._publishToTikTok.bind(this),
      x: this._publishToTwitter.bind(this),
      whatsapp: this._sendWhatsAppMessage.bind(this), // أضفت واتساب
    };
  }

  // Publish post to multiple platforms
  async publishPost(post) {
    const results = [];

    for (const platform of post.platforms) {
      try {
        const platformService = this.platformServices[platform.name];
        if (platformService) {
          const result = await platformService(post, platform);
          results.push({
            platform: platform.name,
            success: true,
            data: result,
          });

          // Update platform status
          platform.status = "published";
          platform.postId = result.id;
          platform.url = result.url;
        }
      } catch (error) {
        console.error(`Error publishing to ${platform.name}:`, error);
        results.push({
          platform: platform.name,
          success: false,
          error: error.message,
        });

        // Update platform status
        platform.status = "failed";
        platform.error = error.message;
      }
    }

    return results;
  }

  // Update post on multiple platforms
  async updatePost(post) {
    const results = [];

    for (const platform of post.platforms) {
      try {
        if (!platform.postId) continue;

        let result;
        switch (platform.name) {
          case "facebook":
            result = await this._updateFacebookPost(post, platform);
            break;
          case "instagram":
            result = await this._updateInstagramPost(post, platform);
            break;
          // Add other platforms as needed
        }

        results.push({
          platform: platform.name,
          success: true,
          data: result,
        });
      } catch (error) {
        console.error(`Error updating on ${platform.name}:`, error);
        results.push({
          platform: platform.name,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // Delete post from multiple platforms
  async deletePost(post) {
    const results = [];

    for (const platform of post.platforms) {
      try {
        if (!platform.postId) continue;

        switch (platform.name) {
          case "facebook":
            await this._deleteFacebookPost(platform.postId);
            break;
          case "instagram":
            await this._deleteInstagramPost(platform.postId);
            break;
          // Add other platforms as needed
        }

        results.push({
          platform: platform.name,
          success: true,
        });
      } catch (error) {
        console.error(`Error deleting from ${platform.name}:`, error);
        results.push({
          platform: platform.name,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // Get post analytics from multiple platforms
  async getPostAnalytics(post) {
    const results = [];

    for (const platform of post.platforms) {
      try {
        if (!platform.postId) continue;

        let analytics;
        switch (platform.name) {
          case "facebook":
            analytics = await this._getFacebookPostAnalytics(platform.postId);
            break;
          case "instagram":
            analytics = await this._getInstagramPostAnalytics(platform.postId);
            break;
          // Add other platforms as needed
        }

        results.push({
          platform: platform.name,
          success: true,
          data: analytics,
        });
      } catch (error) {
        console.error(`Error getting analytics from ${platform.name}:`, error);
        results.push({
          platform: platform.name,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // Message handling methods
  async sendDirectMessage(platform, recipientId, message, imageUrl = null) {
    if (platform === "whatsapp") {
      const { accessToken, phoneNumberId } = this._getAccessToken("whatsapp");
      if (!accessToken || !phoneNumberId) {
        throw new AppError("لم يتم ربط حساب واتساب", 400);
      }
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      let data = {
        messaging_product: "whatsapp",
        to: recipientId,
      };
      if (imageUrl) {
        data.type = "image";
        data.image = { link: imageUrl };
      } else {
        data.type = "text";
        data.text = { body: message };
      }
      const response = await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    }
    // ... باقي الكود للمنصات الأخرى ...
    switch (platform) {
      case "facebook":
        return this._sendFacebookMessage(
          this._getAccessToken("facebook"),
          recipientId,
          message,
          imageUrl
        );
      case "instagram":
        return this._sendInstagramMessage(
          this._getAccessToken("instagram"),
          recipientId,
          message,
          imageUrl
        );
      default:
        throw new AppError("Platform not supported for direct messages", 400);
    }
  }

  async syncMessages(platform) {
    const accessToken = this._getAccessToken(platform);

    switch (platform) {
      case "facebook":
        return this._syncFacebookMessages(accessToken);
      case "instagram":
        return this._syncInstagramMessages(accessToken);
      default:
        throw new AppError("Platform not supported for message syncing", 400);
    }
  }

  // Private methods for each platform
  async _sendFacebookMessage(
    accessToken,
    recipientId,
    message,
    imageUrl = null
  ) {
    const url = `https://graph.facebook.com/v12.0/me/messages?access_token=${accessToken}`;

    const messageData = {
      recipient: { id: recipientId },
      message: { text: message },
    };

    if (imageUrl) {
      messageData.message.attachment = {
        type: "image",
        payload: { url: imageUrl, is_reusable: true },
      };
    }

    const response = await axios.post(url, messageData);
    return response.data;
  }

  async _syncFacebookMessages(accessToken) {
    const url = `https://graph.facebook.com/v12.0/me/conversations?fields=participants,messages{message,from,created_time}&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data;
  }

  // Placeholder for Instagram message methods
  async _sendInstagramMessage(
    accessToken,
    recipientId,
    message,
    imageUrl = null
  ) {
    // Instagram uses the same API as Facebook Messenger
    return this._sendFacebookMessage(
      accessToken,
      recipientId,
      message,
      imageUrl
    );
  }

  async _syncInstagramMessages(accessToken) {
    // Instagram uses the same API as Facebook
    return this._syncFacebookMessages(accessToken);
  }

  // ========== فيسبوك ==========
  async _publishToFacebook(post, platform) {
    const { pageId } = platform;
    const pageToken = await this._getPageAccessToken("facebook", pageId);

    // تحضير بيانات النشر
    const postData = {
      message: post.content,
      access_token: pageToken,
    };

    // إضافة الوسائط إذا وجدت
    if (post.media && post.media.length > 0) {
      if (post.media[0].type === "video") {
        // رفع فيديو
        const videoResponse = await this._uploadFacebookVideo(
          pageId,
          pageToken,
          post.media[0].url
        );
        postData.video_id = videoResponse.video_id;
      } else {
        // رفع صور
        const photoIds = await Promise.all(
          post.media
            .filter((m) => m.type === "image")
            .map((media) =>
              this._uploadFacebookPhoto(pageId, pageToken, media.url)
            )
        );
        postData.attached_media = photoIds.map((id) => ({ media_fbid: id }));
      }
    }

    // النشر
    const response = await axios.post(
      `https://graph.facebook.com/v12.0/${pageId}/feed`,
      postData
    );

    // حفظ معرف المنشور للرد على التعليقات
    await Post.findByIdAndUpdate(
      post._id,
      {
        "platforms.$[elem].postId": response.data.id,
      },
      {
        arrayFilters: [{ "elem.platform": "facebook" }],
        new: true,
      }
    );

    return {
      id: response.data.id,
      url: `https://www.facebook.com/${response.data.id}`,
      platform: "facebook",
    };
  }

  // رفع فيديو لفيسبوك
  async _uploadFacebookVideo(pageId, accessToken, videoUrl) {
    // بدء جلسة رفع
    const uploadSession = await axios.post(
      `https://graph-video.facebook.com/v12.0/${pageId}/videos`,
      {
        upload_phase: "start",
        file_size: (await axios.head(videoUrl)).headers["content-length"],
        access_token: accessToken,
      }
    );

    // رفع الفيديو
    await axios.post(uploadSession.data.upload_url, {
      file: {
        value: (await axios.get(videoUrl, { responseType: "stream" })).data,
        options: {
          filename: "video.mp4",
          contentType: "video/mp4",
        },
      },
    });

    // إنهاء الرفع
    const finishResponse = await axios.post(
      `https://graph-video.facebook.com/v12.0/${pageId}/videos`,
      {
        upload_phase: "finish",
        upload_session_id: uploadSession.data.upload_session_id,
        access_token: accessToken,
      }
    );

    return { video_id: finishResponse.data.video_id };
  }

  // رفع صورة لفيسبوك
  async _uploadFacebookPhoto(pageId, accessToken, imageUrl) {
    const response = await axios.post(
      `https://graph.facebook.com/v12.0/${pageId}/photos`,
      {
        url: imageUrl,
        published: false,
        access_token: accessToken,
      }
    );
    return response.data.id;
  }

  // ========== إنستغرام ==========
  async _publishToInstagram(post, platform) {
    const { pageId } = platform;
    const pageToken = await this._getPageAccessToken("facebook", pageId);

    // الحصول على معرف إنستغرام المرتبط بالصفحة
    const igUserResponse = await axios.get(
      `https://graph.facebook.com/v12.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );

    const igUserId = igUserResponse.data.instagram_business_account.id;

    // تحضير بيانات النشر
    let creationId;

    if (post.media && post.media.length > 0) {
      if (post.media[0].type === "video") {
        // رفع فيديو لإنستغرام
        const uploadResponse = await this._uploadInstagramVideo(
          igUserId,
          pageToken,
          post.media[0].url,
          post.content
        );
        creationId = uploadResponse.id;
      } else {
        // رفع صورة/صور لإنستغرام
        const mediaUrls = post.media
          .filter((m) => m.type === "image")
          .map((m) => m.url);
        const uploadResponse = await this._uploadInstagramPhotos(
          igUserId,
          pageToken,
          mediaUrls,
          post.content
        );
        creationId = uploadResponse.id;
      }
    } else {
      // منشور نصي فقط
      const response = await axios.post(
        `https://graph.facebook.com/v12.0/${igUserId}/media`,
        {
          caption: post.content,
          access_token: pageToken,
        }
      );
      creationId = response.data.id;
    }

    // النشر
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v12.0/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: pageToken,
      }
    );

    // حفظ معرف المنشور
    await Post.findByIdAndUpdate(
      post._id,
      {
        "platforms.$[elem].postId": publishResponse.data.id,
        "platforms.$[elem].igContainerId": creationId,
      },
      {
        arrayFilters: [{ "elem.platform": "instagram" }],
        new: true,
      }
    );

    return {
      id: publishResponse.data.id,
      url: `https://www.instagram.com/p/${publishResponse.data.id}`,
      platform: "instagram",
    };
  }

  // ========== تيك توك ==========
  async _publishToTikTok(post, platform) {
    try {
      const { accessToken } = this._getAccessToken("tiktok");

      // تحميل الفيديو
      const videoResponse = await tiktokApp.uploadVideo({
        access_token: accessToken,
        video_url: post.media[0].url,
        title: post.title || "New Post",
        privacy_level: "PUBLIC",
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      });

      // حفظ معرف المنشور
      await Post.findByIdAndUpdate(
        post._id,
        {
          "platforms.$[elem].postId": videoResponse.share_id,
          "platforms.$[elem].status": "published",
        },
        {
          arrayFilters: [{ "elem.platform": "tiktok" }],
          new: true,
        }
      );

      return {
        id: videoResponse.share_id,
        url: `https://www.tiktok.com/@${videoResponse.share_user_name}/video/${videoResponse.share_id}`,
        platform: "tiktok",
      };
    } catch (error) {
      console.error("Error publishing to TikTok:", error);
      throw new AppError("فشل في النشر على تيك توك: " + error.message, 500);
    }
  }

  // ========== تويتر ==========
  async _publishToTwitter(post, platform) {
    // تنفيذ النشر على تويتر
    // ...
    return {
      id: "tweet_id",
      url: "https://twitter.com/status/tweet_id",
      platform: "twitter",
    };
  }

  // ========== واتساب ==========
  async _sendWhatsAppMessage(post, platform) {
    const { accessToken, phoneNumberId } = this._getAccessToken("whatsapp");
    if (!accessToken || !phoneNumberId) {
      throw new AppError("لم يتم ربط حساب واتساب", 400);
    }
    // إرسال رسالة نصية فقط (يمكنك تطويرها لدعم الصور والفيديو لاحقاً)
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: post.to, // يجب أن يحتوي post على رقم المستلم
        type: "text",
        text: { body: post.content },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return {
      id: response.data.messages?.[0]?.id,
      platform: "whatsapp",
      data: response.data,
    };
  }

  // ========== أدوات مساعدة ==========
  async _getPageAccessToken(platform, pageId) {
    const account = this.user.socialMediaAccounts.find(
      (acc) =>
        acc.platform === platform && acc.pages.some((p) => p.id === pageId)
    );

    if (!account) {
      throw new AppError(`لم يتم العثور على حساب ${platform}`, 404);
    }

    const page = account.pages.find((p) => p.id === pageId);
    return page.accessToken;
  }

  // ========== الرد التلقائي على التعليقات ==========
  async setupAutoReply(platform, postId, replyTemplate) {
    switch (platform) {
      case "facebook":
      case "instagram":
        return this._setupFbIgAutoReply(platform, postId, replyTemplate);
      case "tiktok":
        return this._setupTikTokAutoReply(postId, replyTemplate);
      default:
        throw new AppError("المنصة غير مدعومة للرد التلقائي", 400);
    }
  }

  async _setupFbIgAutoReply(platform, postId, replyTemplate) {
    const post = await Post.findOne({ "platforms.postId": postId });
    if (!post) {
      throw new AppError("المنشور غير موجود", 404);
    }

    // حفظ قالب الرد
    post.autoReplyTemplate = replyTemplate;
    await post.save();

    // الاشتراك في تنبيهات التعليقات الجديدة (ويب هوك)
    const pageId = post.platforms.find((p) => p.platform === platform)?.pageId;
    if (!pageId) {
      throw new AppError("معرف الصفحة غير موجود", 404);
    }

    const pageToken = await this._getPageAccessToken("facebook", pageId);

    await axios.post(
      `https://graph.facebook.com/v12.0/${pageId}/subscribed_apps`,
      {
        subscribed_fields: "feed",
        access_token: pageToken,
      }
    );

    return { success: true, message: "تم تفعيل الرد التلقائي بنجاح" };
  }

  // معالجة التعليقات الواردة (يتم استدعاؤها من ويب هوك)
  async handleNewComment(platform, commentData) {
    const { postId, commentId, from, message } = commentData;

    // البحث عن المنشور وقالب الرد
    const post = await Post.findOne({ "platforms.postId": postId });
    if (!post?.autoReplyTemplate) return;

    // إنشاء الرد
    let reply = post.autoReplyTemplate
      .replace("{user}", from.name)
      .replace("{comment}", message);

    // إرسال الرد
    switch (platform) {
      case "facebook":
      case "instagram":
        await this._replyToFbIgComment(platform, commentId, reply);
        break;
      case "tiktok":
        await this._replyToTikTokComment(commentId, reply);
        break;
    }

    // حفظ التعليق والرد في قاعدة البيانات
    await Comment.create({
      post: post._id,
      platform,
      platformCommentId: commentId,
      author: from,
      content: message,
      reply: {
        content: reply,
        status: "sent",
      },
    });
  }

  // ========== إدارة الرسائل المباشرة ==========
  async sendDirectMessage(platform, recipientId, message, productId = null) {
    let messageContent = message;

    // إضافة تفاصيل المنتج إذا كان متوفراً
    if (productId) {
      const product = await Product.findById(productId);
      if (product) {
        messageContent += `\n\n🛍️ ${product.name}`;
        messageContent += `\n💰 السعر: ${product.price} ${product.currency}`;
        if (product.description) {
          messageContent += `\n📝 ${product.description.substring(0, 100)}...`;
        }
        if (product.images?.length > 0) {
          // إرسال الصورة الأولى للمنتج
          await this._sendMediaMessage(
            platform,
            recipientId,
            product.images[0]
          );
        }
      }
    }

    // إرسال الرسالة النصية
    switch (platform) {
      case "facebook":
      case "instagram":
        return this._sendFbIgMessage(platform, recipientId, messageContent);
      case "tiktok":
        return this._sendTikTokMessage(recipientId, messageContent);
      default:
        throw new AppError("المنصة غير مدعومة للرسائل المباشرة", 400);
    }
  }

  // ========== أدوات داخلية ==========
  _getAccessToken(platform) {
    const account = this.user.socialMediaAccounts.find(
      (acc) => acc.platform === platform
    );
    if (!account || !account.accessToken) {
      throw new AppError(`لم يتم ربط حساب ${platform}`, 400);
    }

    // التحقق من انتهاء صلاحية الرمز وتجديده إذا لزم الأمر
    if (account.tokenExpiry && account.tokenExpiry < new Date()) {
      return this._refreshToken(platform, account);
    }

    return {
      accessToken: account.accessToken,
      userId: account.userId,
    };
  }

  async _refreshToken(platform, account) {
    // تنفيذ تجديد الرمز المميز حسب المنصة
    let tokenUrl = "";
    let params = {};

    switch (platform) {
      case "facebook":
        tokenUrl = "https://graph.facebook.com/v12.0/oauth/access_token";
        params = {
          grant_type: "fb_exchange_token",
          client_id: process.env.FB_APP_ID,
          client_secret: process.env.FB_APP_SECRET,
          fb_exchange_token: account.refreshToken || account.accessToken,
        };
        break;
      case "instagram":
        // إنستغرام يستخدم نفس تجديد فيسبوك
        return this._refreshToken("facebook", account);
      case "tiktok":
        tokenUrl = "https://open-api.tiktok.com/oauth/refresh_token/";
        params = {
          client_key: process.env.TIKTOK_CLIENT_KEY,
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
        };
        break;
      default:
        throw new AppError("لا يمكن تجديد الرمز لهذه المنصة", 400);
    }

    try {
      const response = await axios.get(tokenUrl, { params });

      // تحديث بيانات الحساب
      const updatedAccount = {
        ...account,
        accessToken: response.data.access_token,
        tokenExpiry: new Date(Date.now() + response.data.expires_in * 1000),
      };

      if (response.data.refresh_token) {
        updatedAccount.refreshToken = response.data.refresh_token;
      }

      // حفظ التحديثات في قاعدة البيانات
      await User.updateOne(
        { "socialMediaAccounts._id": account._id },
        { $set: { "socialMediaAccounts.$": updatedAccount } }
      );

      return {
        accessToken: updatedAccount.accessToken,
        userId: updatedAccount.userId,
      };
    } catch (error) {
      console.error("خطأ في تجديد الرمز:", error);
      throw new AppError(
        "فشل في تجديد جلسة الدخول. يرجى إعادة تسجيل الدخول",
        401
      );
    }
  }

  // ========== إرسال رسالة وسائط ==========
  async _sendMediaMessage(platform, recipientId, mediaUrl) {
    switch (platform) {
      case "facebook":
      case "instagram":
        return this._sendFbIgMedia(platform, recipientId, mediaUrl);
      case "tiktok":
        return this._sendTikTokMedia(recipientId, mediaUrl);
      default:
        throw new AppError("نوع الوسائط غير مدعوم", 400);
    }
  }

  // ========== إرسال وسائط فيسبوك وإنستغرام ==========
  async _sendFbIgMedia(platform, recipientId, mediaUrl) {
    const pageId = this._getPageId(platform);
    const pageToken = await this._getPageAccessToken("facebook", pageId);

    // تحديد نوع المحتوى
    const isVideo = mediaUrl.match(/\.(mp4|mov|avi)$/i);
    const endpoint = isVideo
      ? `https://graph.facebook.com/v12.0/${pageId}/videos`
      : `https://graph.facebook.com/v12.0/${pageId}/photos`;

    // إرسال الوسائط
    const response = await axios.post(endpoint, {
      url: mediaUrl,
      recipient: JSON.stringify({ id: recipientId }),
      access_token: pageToken,
    });

    return response.data;
  }

  // ========== إرسال وسائط تيك توك ==========
  async _sendTikTokMedia(recipientId, mediaUrl) {
    const { accessToken } = this._getAccessToken("tiktok");

    const response = await axios.post(
      "https://open-api.tiktok.com/share/video/upload/",
      {
        post_info: {
          title: "منتج جديد",
          privacy_level: "PRIVATE_TO_RECIPIENT",
          disable_comment: true,
          disable_duet: true,
          disable_stitch: true,
          brand_content_toggle: false,
          brand_organic_toggle: false,
          video_cover_timestamp_ms: 0,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: mediaUrl,
        },
        receiver_ids: [recipientId],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  }

  // ========== الحصول على معرف الصفحة ==========
  _getPageId(platform) {
    const account = this.user.socialMediaAccounts.find(
      (acc) => acc.platform === platform
    );
    if (!account?.pages?.length) {
      throw new AppError(`لم يتم العثور على صفحات ${platform}`, 404);
    }
    return account.pages[0].id;
  }
}

module.exports = SocialMediaService;
