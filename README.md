# FURIA FARMES - Bot Discord

Bot profissional de farmes para Discord usando Node.js + discord.js v14, sem comandos slash. Tudo funciona por painéis, botões, menus e modais.

## 1. Instalar

```bash
npm install
```

## 2. Configurar `.env`

O arquivo `.env` já vem com seu CLIENT_ID, GUILD_ID e os cargos por ID.

Você só precisa preencher:

```env
DISCORD_TOKEN=SEU_TOKEN_AQUI
CHANNEL_MAIN_PANEL_ID=ID_CANAL_FARME
CHANNEL_GOALS_ID=ID_CANAL_METAS
CHANNEL_APPROVAL_ID=ID_CANAL_APROVAR
CHANNEL_RANKING_ID=ID_CANAL_RANKING
CHANNEL_LOGS_ID=ID_CANAL_LOGS
CHANNEL_ADMIN_ID=ID_CANAL_CONFIG
```

Os cargos autorizados já estão assim:

```env
ROLE_1_ID=1218199539765481531
ROLE_2_ID=1218199539765481530
ROLE_3_ID=1218199539765481528
ROLE_4_ID=1218199539735990301
ROLE_5_ID=
```

Se quiser adicionar outro cargo futuramente, coloque o ID em `ROLE_5_ID`.

## 3. Intents obrigatórias

No Discord Developer Portal > Bot, ative:

- Presence Intent
- Server Members Intent
- Message Content Intent

## 4. Permissões do bot nos canais

O bot precisa ter:

- Ver canal
- Enviar mensagens
- Incorporar links
- Ler histórico de mensagens
- Gerenciar mensagens
- Usar componentes/interações

## 5. Ligar o bot

```bash
npm start
```

## 6. Desligar o bot

No terminal:

```bash
CTRL + C
```

## Observações importantes

- Os painéis são criados automaticamente quando o bot liga.
- Os IDs dos cargos são lidos pelo `.env`, não por nome.
- O sistema evita flood com sessão única por usuário, cooldown e mensagens temporárias.
- As metas aceitam meta semanal, mensal, sorteio e imagem por URL.
