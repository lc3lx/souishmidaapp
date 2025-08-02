# تكامل خدمات SMM الخارجية

## نظرة عامة

تم تطوير نظام متكامل للتعامل مع خدمات SMM (Social Media Marketing) الخارجية، والذي يتيح للمستخدمين:

- إضافة وإدارة مقدمي خدمات SMM متعددين
- إنشاء وتتبع طلبات SMM
- مزامنة الخدمات والأسعار تلقائياً
- إدارة الأرصدة والإحصائيات

## المقدمين المدعومين

### 1. Just Another Panel
- **الموقع**: https://justanotherpanel.com
- **API URL**: https://justanotherpanel.com/api/v2
- **المميزات**: خدمات عالية الجودة مع تسليم سريع

### 2. SMM Kings
- **الموقع**: https://smmkings.com
- **API URL**: https://smmkings.com/api/v2
- **المميزات**: خدمات مميزة لجميع منصات التواصل الاجتماعي

### 3. Secsers
- **الموقع**: https://secsers.com
- **API URL**: https://secsers.com/api/v2
- **المميزات**: خدمات موثوقة بأسعار تنافسية

## الملفات المطلوبة

### 1. النماذج (Models)

#### SMMProvider.js
```javascript
// نموذج مقدم خدمة SMM
- name: اسم المقدم (فريد)
- displayName: الاسم المعروض
- apiUrl: رابط API
- apiKey: مفتاح API
- isActive: حالة التفعيل
- supportedServices: الخدمات المدعومة
- balance: الرصيد المتاح
- stats: الإحصائيات
```

#### SMMOrder.js
```javascript
// نموذج طلب SMM
- orderId: معرف الطلب الداخلي
- externalOrderId: معرف الطلب الخارجي
- provider: مقدم الخدمة
- service: تفاصيل الخدمة
- status: حالة الطلب
- charge: التكلفة
```

### 2. الخدمات (Services)

#### SMMService.js
```javascript
// خدمة التكامل مع APIs الخارجية
- getServices(): جلب الخدمات المتاحة
- createOrder(): إنشاء طلب جديد
- getOrderStatus(): جلب حالة الطلب
- createRefill(): إنشاء طلب إعادة تعبئة
- cancelOrder(): إلغاء الطلب
- getBalance(): جلب الرصيد
```

### 3. المتحكمات (Controllers)

#### SMMController.js
```javascript
// متحكم إدارة خدمات SMM
- getProviders(): جلب المقدمين
- addProvider(): إضافة مقدم جديد
- updateProvider(): تحديث مقدم
- deleteProvider(): حذف مقدم
- toggleProvider(): تفعيل/إيقاف مقدم
- syncServices(): مزامنة الخدمات
- createOrder(): إنشاء طلب
- getOrders(): جلب الطلبات
```

### 4. المسارات (Routes)

#### SMMRoutes.js
```javascript
// مسارات API لخدمات SMM
GET    /api/smm/providers          // جلب المقدمين
POST   /api/smm/providers          // إضافة مقدم
PUT    /api/smm/providers/:id      // تحديث مقدم
DELETE /api/smm/providers/:id      // حذف مقدم
PATCH  /api/smm/providers/:id/toggle // تفعيل/إيقاف
POST   /api/smm/providers/:id/sync   // مزامنة الخدمات
GET    /api/smm/providers/:id/services // جلب خدمات المقدم
POST   /api/smm/orders             // إنشاء طلب
GET    /api/smm/orders             // جلب الطلبات
```

## طريقة التثبيت

### 1. إضافة الملفات إلى المشروع

```bash
# نسخ الملفات إلى المجلدات المناسبة
cp SMMProvider.js /path/to/project/models/
cp SMMOrder.js /path/to/project/models/
cp SMMController.js /path/to/project/controllers/
cp SMMService.js /path/to/project/utils/
cp SMMRoutes.js /path/to/project/routes/smm.js
cp SMMProviderSetup.js /path/to/project/utils/
```

### 2. تحديث server.js

```javascript
// إضافة مسار SMM
app.use('/api/smm', require('./routes/smm'));
```

### 3. تثبيت التبعيات

```bash
npm install axios
```

### 4. إعداد المقدمين الافتراضيين

```javascript
const { initializeDefaultProviders } = require('./utils/SMMProviderSetup');

// في دالة تسجيل المستخدم أو عند الحاجة
await initializeDefaultProviders(userId, {
  justanotherpanel: 'YOUR_API_KEY',
  smmkings: 'YOUR_API_KEY',
  secsers: 'YOUR_API_KEY'
});
```

## طريقة الاستخدام

### 1. إضافة مقدم خدمة جديد

```javascript
POST /api/smm/providers
{
  "name": "provider_name",
  "displayName": "Provider Display Name",
  "apiUrl": "https://provider.com/api/v2",
  "apiKey": "your_api_key",
  "priority": 1
}
```

### 2. مزامنة الخدمات

```javascript
POST /api/smm/providers/:id/sync
```

### 3. إنشاء طلب SMM

```javascript
POST /api/smm/orders
{
  "providerId": "provider_id",
  "serviceId": "service_id",
  "link": "https://social-media-link.com",
  "quantity": 1000,
  "customComments": ["comment1", "comment2"]
}
```

### 4. تتبع الطلبات

```javascript
GET /api/smm/orders?status=Pending&page=1&limit=10
```

## الميزات المتقدمة

### 1. إعادة المحاولة التلقائية
- إعادة المحاولة عند فشل الطلبات
- تأخير متدرج بين المحاولات
- حد أقصى لعدد المحاولات

### 2. إدارة الأخطاء
- تسجيل مفصل للأخطاء
- رسائل خطأ واضحة للمستخدم
- استرداد تلقائي من الأخطاء المؤقتة

### 3. الإحصائيات والتحليلات
- معدل نجاح الطلبات
- متوسط وقت الاستجابة
- إجمالي المبلغ المنفق
- عدد الطلبات المكتملة

### 4. الأمان
- تشفير مفاتيح API
- التحقق من صحة البيانات
- حماية من الطلبات المتكررة

## استكشاف الأخطاء

### مشاكل شائعة وحلولها

1. **خطأ في الاتصال بـ API**
   - تحقق من صحة رابط API
   - تأكد من صحة مفتاح API
   - تحقق من الاتصال بالإنترنت

2. **فشل في إنشاء الطلب**
   - تحقق من صحة الرابط المرسل
   - تأكد من أن الكمية ضمن الحد المسموح
   - تحقق من توفر الرصيد

3. **عدم تحديث حالة الطلب**
   - تحقق من عمل مزامنة الطلبات
   - تأكد من صحة معرف الطلب الخارجي

## الدعم والصيانة

### مهام دورية مطلوبة

1. **مزامنة الخدمات**: كل ساعة
2. **تحديث حالة الطلبات**: كل 5 دقائق
3. **تحديث الأرصدة**: كل ساعة
4. **تنظيف الطلبات القديمة**: أسبوعياً

### مراقبة الأداء

- مراقبة معدل نجاح الطلبات
- تتبع أوقات الاستجابة
- مراقبة استهلاك الأرصدة
- تحليل أنماط الاستخدام

## التطوير المستقبلي

### ميزات مخططة

1. **دعم مقدمين إضافيين**
2. **جدولة الطلبات**
3. **تحليلات متقدمة**
4. **تنبيهات ذكية**
5. **تكامل مع أنظمة الدفع**

### تحسينات الأداء

1. **تخزين مؤقت للخدمات**
2. **معالجة متوازية للطلبات**
3. **ضغط البيانات**
4. **تحسين قواعد البيانات**

