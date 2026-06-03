'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { getPlatformSettings } from '@/lib/admin';

type Tracking = {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  metaPixelId: string;
  customHeadScript: string;
};

/**
 * Injects the analytics / marketing pixels configured by an admin in
 * Settings → Tracking & Pixels. Tracking IDs are public by nature (they end
 * up in the page HTML regardless), so this fetches the public settings doc
 * client-side and renders the relevant snippets via next/script.
 */
export default function Analytics() {
  const [t, setT] = useState<Tracking | null>(null);

  useEffect(() => {
    getPlatformSettings()
      .then((s) =>
        setT({
          googleAnalyticsId: s.googleAnalyticsId ?? '',
          googleTagManagerId: s.googleTagManagerId ?? '',
          metaPixelId: s.metaPixelId ?? '',
          customHeadScript: s.customHeadScript ?? '',
        })
      )
      .catch(() => {});
  }, []);

  // Custom snippet: re-create <script> nodes so they actually execute
  // (setting innerHTML alone does not run scripts).
  useEffect(() => {
    const snippet = t?.customHeadScript?.trim();
    if (!snippet) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = snippet;
    const injected: Node[] = [];
    tpl.content.childNodes.forEach((node) => {
      if (node.nodeName === 'SCRIPT') {
        const src = node as HTMLScriptElement;
        const el = document.createElement('script');
        for (const attr of Array.from(src.attributes)) el.setAttribute(attr.name, attr.value);
        el.text = src.text;
        el.setAttribute('data-donow-custom', '');
        document.head.appendChild(el);
        injected.push(el);
      } else {
        const clone = node.cloneNode(true);
        document.head.appendChild(clone);
        injected.push(clone);
      }
    });
    return () => injected.forEach((n) => n.parentNode?.removeChild(n));
  }, [t?.customHeadScript]);

  if (!t) return null;

  const { googleAnalyticsId: ga, googleTagManagerId: gtm, metaPixelId: pixel } = t;

  return (
    <>
      {/* Google Analytics 4 */}
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

      {/* Google Tag Manager */}
      {gtm && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}

      {/* Meta (Facebook) Pixel */}
      {pixel && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
