# Deployment Talimatları

## Vercel'e Deployment

### 1. Environment Variables Ayarları

Vercel dashboard'dan aşağıdaki environment variable'ları ekleyin:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://cukcmdmkpkkzmfqxfosl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Dış API
BASE_URL=https://yonder.okuldolabim.com/
COOKIE_VALUE=<your-cookie>
API_KEY=<your-api-key>
SECRET_KEY=<your-secret-key>
EMAIL=<api-email>
PASSWORD=<api-password>

# Sync Security Token (Manuel test için)
SYNC_TOKEN=<your-sync-token>

# Kampüs Listesi
NEXT_PUBLIC_KAMPUSLER=Ataşehir Kampüsü,Başakşehir Kampüsü,Batıkent 100. Yıl Kampüsü,Bursa Kampüsü,Doğukent Kampüsü,Kağıthane Kampüsü,Kartal Kampüsü,Kocaeli Kampüsü,Maltepe Kampüsü,Pendik Kampüsü,Sancaktepe Kampüsü,Vadi Kampüsü
```

### 2. Vercel Cron Job Yapılandırması

vercel.json dosyası zaten yapılandırılmıştır, sadece deploy edin:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/sync-orders",
      "schedule": "0 12 * * *"
    }
  ]
}
```

**Deployment sonrası Vercel otomatik olarak:**
- `CRON_SECRET` environment variable'ını oluşturur
- Her cron job isteğine `Authorization: Bearer <CRON_SECRET>` header'ı ekler
- Cron job'ı belirtilen schedule'a göre çalıştırır

**Hiçbir ek ayar yapmanıza gerek yok!** Kod hem Vercel'in CRON_SECRET'ini hem de manuel kullanım için SYNC_TOKEN'ı destekler.

## Sync API Kullanımı

### Manuel Sync Tetikleme

```bash
# Production'da SYNC_TOKEN ile
curl -H "Authorization: Bearer YOUR_SYNC_TOKEN" \
  https://your-domain.vercel.app/api/cron/sync-orders

# Local test (CRON_SECRET ile)
curl -H "Authorization: Bearer local-test-secret" \
  http://localhost:3000/api/cron/sync-orders

# Local test (SYNC_TOKEN ile)
curl -H "Authorization: Bearer aa7d841d5f1f78ac61fce7545f30eb14dfbb2013163682223f78a3192b75fbbb" \
  http://localhost:3000/api/cron/sync-orders
```

### Response Örneği

```json
{
  "success": true,
  "message": "Senkronizasyon tamamlandı",
  "stats": {
    "totalOrders": 15420,
    "inserted": 234,
    "updated": 15186,
    "failed": 0,
    "duration": "45.32s"
  }
}
```

## Cron Schedule Değiştirme

vercel.json içinde schedule değerini düzenleyin:

- `0 12 * * *` - Her gün öğlen 12:00 (varsayılan)
- `0 0 * * *` - Her gün gece yarısı
- `0 9 * * *` - Her gün sabah 09:00
- `0 */6 * * *` - Her 6 saatte bir
- `0 */12 * * *` - Her 12 saatte bir
- `*/30 * * * *` - Her 30 dakikada bir

Cron expression'ları için: [crontab.guru](https://crontab.guru)

## Güvenlik Notları

1. **SYNC_TOKEN'ı güvenli tutun**: Bu token olmadan kimse sync endpoint'ini tetikleyemez
2. **vercel.json'u dikkatli commit edin**: Token içeriyorsa .gitignore'a ekleyin
3. **Production environment'a özel token kullanın**: Development ve production için farklı token'lar kullanın

## Troubleshooting

### Cron Job Çalışmıyor

1. Vercel Dashboard → Deployments → Cron Logs kontrol edin
2. SYNC_TOKEN'ın doğru olduğundan emin olun
3. vercel.json'un doğru commit edildiğini kontrol edin

### Timeout Hataları

API'den tüm siparişleri çekmek uzun sürebilir. Kod zaten hata olursa diğer siparişlere devam edecek şekilde yazılmıştır. Failed count'u kontrol edin.

### Failed Orders

Response'daki `failed` sayısı 0'dan fazlaysa, Vercel logs'ları kontrol edin. Her başarısız sipariş için detaylı log atılır.
