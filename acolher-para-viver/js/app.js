(function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var form = document.getElementById('formContato');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = document.getElementById('ctNome').value.trim();
      var email = document.getElementById('ctEmail').value.trim();
      var assunto = document.getElementById('ctAssunto').value;
      var mensagem = document.getElementById('ctMensagem').value.trim();

      var corpo = 'Nome: ' + nome + '\nE-mail: ' + email + '\n\n' + mensagem;
      var mailto = 'mailto:contato@acolherparaviver.org'
        + '?subject=' + encodeURIComponent('[Acolher para Viver] ' + assunto)
        + '&body=' + encodeURIComponent(corpo);

      window.location.href = mailto;
    });
  }

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var lightboxClose = document.getElementById('lightboxClose');
  var lastFocused = null;

  function openLightbox(fullSrc, altText, caption) {
    lastFocused = document.activeElement;
    lightboxImg.src = fullSrc;
    lightboxImg.alt = altText;
    lightboxCaption.textContent = caption || '';
    lightbox.hidden = false;
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.gallery-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var img = item.querySelector('img');
      openLightbox(item.dataset.full, img ? img.alt : '', item.dataset.caption);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
  });
})();
