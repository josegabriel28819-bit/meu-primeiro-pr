# Acolher para Viver

Site do projeto de extensão **Acolher para Viver**. HTML/CSS/JS puro, sem build.

No semestre anterior o projeto tratou do acolhimento a pessoas enlutadas; neste semestre o foco é
o Setembro Amarelo, conscientização sobre saúde mental e prevenção ao suicídio.

## Como usar

Abra `index.html` diretamente no navegador, ou sirva a pasta com um servidor local:

```bash
py -m http.server 8125
```

e acesse `http://localhost:8125`.

## Seções

- **Sobre**: apresentação do projeto e das duas frentes (luto / Setembro Amarelo).
- **Acolhimento ao Luto**: posts informativos, cartilha, ação na rua e a atividade "Mala da
  Saudade", do semestre anterior.
- **Setembro Amarelo**: informação responsável sobre saúde mental e prevenção ao suicídio.
- **Precisa de ajuda?**: canais de apoio imediato (CVV 188, SAMU 192, CAPS). Também aparece fixo
  no topo de todas as páginas.
- **Participe**: formas de contribuir com o projeto.
- **Contato**: formulário que abre um e-mail pré-preenchido (`mailto:`).

> Ajuste o e-mail de destino do formulário em `js/app.js` (constante `mailto`) para o e-mail real
> do projeto.

## Estrutura

```
index.html
css/style.css
js/app.js
```
