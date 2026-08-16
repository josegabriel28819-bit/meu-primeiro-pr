# Ponto, Vales & Escala

Aplicativo web simples para calcular ponto de horas, vale-transporte e vale-combustível de colaboradores.

Não precisa instalar nada: é HTML/CSS/JS puro, com os dados salvos no navegador (localStorage).

## Como usar

Abra o arquivo `index.html` diretamente no navegador, ou sirva a pasta com um servidor local, por exemplo:

```bash
py -m http.server 8123
```

e acesse `http://localhost:8123`.

## Funcionalidades

- **Colaboradores** — cadastro com jornada diária, valor do vale-transporte/dia e valor do vale-combustível/dia.
- **Ponto** — registro diário de entrada, saída para almoço, volta do almoço e saída. Calcula automaticamente as horas trabalhadas no dia, o saldo (banco de horas) do dia e o total do mês.
- **Vale Transporte / Combustível** — calcula a reposição necessária: `necessário = valor por dia × dias que serão trabalhados`, `reposição = necessário − saldo atual` (nunca negativa). Ao confirmar, o saldo do colaborador é atualizado e fica registrado no histórico.
- **Escala Sábados** — controla a alternância entre Grupo A e Grupo B nos sábados que a empresa abre (normalmente 2 por mês) e mostra qual data vai aparecer errada no Solides (o sistema exibe o domingo que inicia a semana em vez da data real do sábado).
- **Relatório** — resumo mensal por colaborador (horas trabalhadas, saldo de horas, saldo de VT e VC).
- **Backup** — exportar/importar todos os dados em um arquivo `.json`.

## Estrutura

```
index.html
css/style.css
js/app.js
```
