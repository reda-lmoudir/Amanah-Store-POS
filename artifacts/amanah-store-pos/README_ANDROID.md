# مشروع متجر الأمانة لنظام Android

هذا المجلد يحتوي على مشروع Android أصلي مولّد من تطبيق Expo، ويمكن فتحه مباشرة في Android Studio.

## فتح المشروع

1. افتح Android Studio.
2. اختر **Open**.
3. اختر مجلد:

   `artifacts/amanah-store-pos/android`

4. انتظر اكتمال Gradle Sync.
5. شغّل التطبيق على جهاز Android أو محاكي من زر **Run**.

## إعدادات التطبيق

- اسم الحزمة: `com.amanahstore.pos`
- اتجاه التطبيق: عمودي
- دعم RTL مفعل
- صلاحية الكاميرا مضافة لمسح الباركود
- رقم الإصدار الحالي: `1.0.0`
- `versionCode`: `1`

## إنشاء نسخة رفع

من Android Studio:

1. افتح **Build > Generate Signed Bundle / APK**.
2. اختر **Android App Bundle** للنشر على Google Play أو **APK** للتثبيت المباشر.
3. أنشئ أو اختر مفتاح توقيع Release.
4. اختر `release` ثم نفّذ البناء.

للتحديثات المستقبلية، زد `versionCode` في `app.json` ثم أعد توليد ملفات Android من مشروع Expo قبل إنشاء نسخة جديدة.

## ملاحظة

تحتاج عملية البناء المحلية إلى Android Studio مع Android SDK و JDK مثبتين. مجلد `android` جاهز للتزامن والبناء داخل Android Studio.