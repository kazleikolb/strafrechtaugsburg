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
  // Die Seite setzt aktuell keine Cookies und lädt keine optionalen Dienste.
  // Die Auswahl wird nur im localStorage gespeichert (kein Cookie).
  // Künftige optionale Dienste (z. B. Statistik) dürfen erst geladen werden,
  // wenn KanzleiConsent.allowsOptional() true liefert; auf Änderungen
  // reagiert das Ereignis "kanzlei:consent".
  var CONSENT_KEY = 'kanzlei-consent-v1';
  var banner = null;
  var lastOpener = null;

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
      '<p id="consent-text">Diese Website setzt keine Tracking- oder Marketing-Cookies. ' +
      'Optionale Dienste würden nur mit Ihrer Zustimmung geladen; aktuell sind keine eingebunden. ' +
      'Ihre Auswahl wird in Ihrem Browser gespeichert und kann über „Cookie-Einstellungen“ in der Fußzeile geändert werden.</p>' +
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

  if (!readConsent()) showBanner(false);

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
