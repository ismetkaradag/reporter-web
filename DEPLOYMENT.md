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

#### Yöntem 1: vercel.json ile (Önerilen)

vercel.json dosyası zaten yapılandırılmıştır, sadece deploy edin:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/sync-orders",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**ÖNEMLI:** Deploy sonrası Vercel Dashboard'dan cron job'ı düzenleyip Authorization header ekleyin:

1. Vercel Dashboard → Project → Settings → Cron Jobs
2. Oluşturulan cron job'ı düzenleyin
3. "Headers" bölümüne ekleyin:
   - Key: `Authorization`
   - Value: `Bearer <SYNC_TOKEN_DEĞERİNİZ>`

#### Yöntem 2: Vercel Dashboard'dan Manuel Ekleme

1. vercel.json dosyasındaki crons array'ini boşaltın veya silin
2. Vercel Dashboard → Project → Settings → Cron Jobs → Add Cron Job
3. Aşağıdaki bilgileri girin:
   - **URL**: `/api/cron/sync-orders`
   - **Schedule**: `0 */6 * * *`
   - **Headers**:
     - Key: `Authorization`
     - Value: `Bearer YOUR_SYNC_TOKEN`

## Sync API Kullanımı

### Manuel Sync Tetikleme

```bash
# Authorization header ile (önerilen)
curl -H "Authorization: Bearer YOUR_SYNC_TOKEN" \
  https://your-domain.vercel.app/api/cron/sync-orders

# Local test
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

- `0 */6 * * *` - Her 6 saatte bir (varsayılan)
- `0 */12 * * *` - Her 12 saatte bir
- `0 0 * * *` - Her gün gece yarısı
- `*/30 * * * *` - Her 30 dakikada bir
- `0 9 * * *` - Her gün saat 09:00'da

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
