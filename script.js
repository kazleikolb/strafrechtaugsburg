(function () {
  'use strict';

  // --- Alte Anker auf die neuen Unterseiten umleiten --------------------
  var legacy = { '#impressum': '/impressum/', '#datenschutz': '/datenschutz/' };
  if (legacy[location.hash]) { location.replace(legacy[location.hash]); return; }

  // --- Menüs: Dropdown schließen bei Klick außerhalb oder Escape ---------
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.dropdown[open], details.mobile-menu[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('details.dropdown[open], details.mobile-menu[open]').forEach(function (d) {
        d.removeAttribute('open');
      });
    }
  });
  document.querySelectorAll('.mobile-menu-panel a').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = a.closest('details');
      if (d) d.removeAttribute('open');
    });
  });

  // --- Cookie-/Datenschutz-Hinweis ---------------------------------------
  // Ohne Zustimmung setzt die Seite keine Cookies und lädt nichts von Dritten.
  // Die Auswahl wird nur im localStorage gespeichert (kein Cookie).
  // Nur nach "Alle akzeptieren" wird das Google-Ads-Tag (Conversion-Messung)
  // geladen, ohne Personalisierung. Bei "Nur notwendige" wird es nicht
  // geladen bzw. die Einwilligung widerrufen und Google-Cookies entfernt.
  // Auf Änderungen reagiert das Ereignis "kanzlei:consent".
  var CONSENT_KEY = 'kanzlei-consent-v1';
  var ADS_ID = 'AW-17787534772';
  var adsLoaded = false;
  var banner = null;
  var lastOpener = null;

  function loadGoogleAds() {
    if (adsLoaded) return;
    adsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied'
    });
    // Einwilligung nur für die Messung; keine personalisierte Werbung
    gtag('consent', 'update', {
      ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('config', ADS_ID, { allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ADS_ID;
    document.head.appendChild(s);
  }

  function revokeGoogleAds() {
    if (typeof window.gtag === 'function') {
      gtag('consent', 'update', {
        ad_storage: 'denied', ad_user_data: 'denied',
        ad_personalization: 'denied', analytics_storage: 'denied'
      });
    }
    // Von Google gesetzte Cookies (_gcl_*, _gac_*) entfernen
    var host = location.hostname;
    var domains = [host, '.' + host];
    var parts = host.split('.');
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^(_gcl_|_gac_|_ga)/.test(name)) {
        domains.forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + d;
        });
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      }
    });
  }

  function applyConsent(rec) {
    if (rec && rec.choice === 'all') loadGoogleAds();
    else if (adsLoaded) revokeGoogleAds();
  }

  window.addEventListener('kanzlei:consent', function (e) { applyConsent(e.detail); });

  function readConsent() {
    try {
      var rec = JSON.parse(localStorage.getItem(CONSENT_KEY));
      return rec && rec.v === 1 ? rec : null;
    } catch (e) { return null; }
  }

  function saveConsent(choice) {
    var rec = { v: 1, choice: choice, ts: new Date().toISOString() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(rec)); } catch (e) { /* z. B. privater Modus */ }
    window.dispatchEvent(new CustomEvent('kanzlei:consent', { detail: rec }));
    return rec;
  }

  function closeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    if (lastOpener && document.contains(lastOpener)) lastOpener.focus();
    lastOpener = null;
  }

  function showBanner(userInitiated) {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'consent-title');
    banner.setAttribute('aria-describedby', 'consent-text');
    banner.innerHTML =
      '<h2 id="consent-title">Datenschutz und Cookies</h2>' +
      '<p id="consent-text">Ohne Ihre Zustimmung setzt diese Website keine Cookies. ' +
      'Mit „Alle akzeptieren“ erlauben Sie Google Ads, den Erfolg von Anzeigen zu messen (Cookies von Google, ' +
      'Datenübermittlung in die USA möglich, keine personalisierte Werbung). ' +
      'Mit „Nur notwendige“ wird nichts von Google geladen. ' +
      'Ihre Auswahl können Sie jederzeit über „Cookie-Einstellungen“ in der Fußzeile ändern.</p>' +
      '<p><a href="/datenschutz/">Datenschutzerklärung</a> · <a href="/impressum/">Impressum</a></p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="btn btn-secondary" data-choice="necessary">Nur notwendige</button>' +
      '<button type="button" class="btn btn-primary" data-choice="all">Alle akzeptieren</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-choice]');
      if (!btn) return;
      saveConsent(btn.getAttribute('data-choice'));
      closeBanner();
    });
    document.body.appendChild(banner);
    if (userInitiated) {
      var first = banner.querySelector('button');
      if (first) first.focus();
    }
  }

  window.KanzleiConsent = {
    get: readConsent,
    allowsOptional: function () { var c = readConsent(); return !!c && c.choice === 'all'; },
    open: function () { showBanner(true); }
  };

  document.querySelectorAll('[data-consent-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      lastOpener = el;
      showBanner(true);
    });
  });

  if (readConsent()) applyConsent(readConsent());
  else showBanner(false);

  // --- Kontaktformular (zweistufig) --------------------------------------
  var form = document.getElementById('wizardForm');
  if (!form) return;
  var status = document.getElementById('formStatus');

  function goStep(step) {
    form.querySelectorAll('.form-step').forEach(function (el) { el.classList.remove('active'); });
    var target = form.querySelector('.form-step[data-step="' + step + '"]');
    if (target) target.classList.add('active');
  }

  form.querySelectorAll('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = Number(btn.getAttribute('data-goto'));
      if (next > 1) {
        // Pflichtfelder des aktuellen Schritts prüfen, bevor es weitergeht
        var current = form.querySelector('.form-step.active');
        var fields = current ? current.querySelectorAll('input, select, textarea') : [];
        for (var i = 0; i < fields.length; i++) {
          if (!fields[i].checkValidity()) { fields[i].reportValidity(); return; }
        }
      }
      goStep(next);
    });
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    status.textContent = 'Anfrage wird versendet …';

    try {
      var response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      var result = await response.json();

      if (result.success === 'true' || result.success === true) {
        status.textContent = 'Vielen Dank. Ihre Anfrage wurde versendet. Wir melden uns schnellstmöglich bei Ihnen. In Notfällen rufen Sie bitte direkt an: 0170 1016697.';
        form.reset();
        goStep(1);
      } else {
        status.textContent = 'Der Versand konnte nicht abgeschlossen werden. Bitte nutzen Sie alternativ Telefon, WhatsApp oder E-Mail.';
      }
    } catch (error) {
      status.textContent = 'Der Versand konnte nicht abgeschlossen werden. Bitte nutzen Sie alternativ Telefon, WhatsApp oder E-Mail.';
    }
  });
})();
