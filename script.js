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
