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

# Sync Security Token
SYNC_TOKEN=<your-sync-token>

# Kampüs Listesi
NEXT_PUBLIC_KAMPUSLER=Ataşehir Kampüsü,Başakşehir Kampüsü,Batıkent 100. Yıl Kampüsü,Bursa Kampüsü,Doğukent Kampüsü,Kağıthane Kampüsü,Kartal Kampüsü,Kocaeli Kampüsü,Maltepe Kampüsü,Pendik Kampüsü,Sancaktepe Kampüsü,Vadi Kampüsü
```

### 2. Vercel Cron Job Yapılandırması

**Önemli:** vercel.json dosyasını deployment öncesi güncelleyin:

```json
{
  "crons": [
    {
      "path": "/api/sync-orders?token=<SYNC_TOKEN_DEĞERİ>",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

`<SYNC_TOKEN_DEĞERİ>` yerine gerçek SYNC_TOKEN değerini yazın.

**NOT:** vercel.json'u git'e commit etmeden önce token'ı kaldırın veya .gitignore'a ekleyin.

### 3. Alternatif: Manuel Cron Setup

vercel.json yerine Vercel Dashboard'dan manuel cron job eklemek için:

1. Vercel Dashboard → Project Settings → Cron Jobs
2. "Add Cron Job" butonuna tıklayın
3. URL: `https://your-domain.vercel.app/api/sync-orders?token=<SYNC_TOKEN>`
4. Schedule: `0 */6 * * *` (Her 6 saatte bir)

## Sync API Kullanımı

### Manuel Sync Tetikleme

```bash
# Query parameter ile
curl "https://your-domain.vercel.app/api/sync-orders?token=YOUR_SYNC_TOKEN"

# Authorization header ile
curl -H "Authorization: Bearer YOUR_SYNC_TOKEN" \
  https://your-domain.vercel.app/api/sync-orders
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
