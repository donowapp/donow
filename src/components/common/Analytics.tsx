'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { getPlatformSettings } from '@/lib/admin';
import { initObservability } from '@/lib/crash';

type Tracking = {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  metaPixelId: string;
};

export default function Analytics() {
  const [t, setT] = useState<Tracking | null>(null);

  useEffect(() => {
    initObservability();
    getPlatformSettings()
      .then((s) =>
        setT({
          googleAnalyticsId: s.googleAnalyticsId ?? '',
          googleTagManagerId: s.googleTagManagerId ?? '',
          metaPixelId: s.metaPixelId ?? '',
        })
      )
      .catch(() => {});
  }, []);

  if (!t) return null;

  // Hard allow-list the formats before these values are interpolated into inline
  // <Script> bodies. Anything not matching is dropped, so a malicious settings
  // value can never break out of the string literal and inject script (XSS).
  const valid = (v: string, re: RegExp) => (re.test(v.trim()) ? v.trim() : '');
  const ga = valid(t.googleAnalyticsId, /^(G|UA|AW|GT)-[A-Z0-9-]{1,20}$/i);
  const gtm = valid(t.googleTagManagerId, /^GTM-[A-Z0-9]{1,12}$/i);
  const pixel = valid(t.metaPixelId, /^[0-9]{6,20}$/);

  return (
    <>
      {ga && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}

      {gtm && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}

      {pixel && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
