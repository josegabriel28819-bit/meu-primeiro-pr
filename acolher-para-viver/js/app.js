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
})();
