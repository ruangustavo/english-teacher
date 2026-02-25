# Você ganha um professor de inglês no WhatsApp; com correção no formato do próprio WhatsApp

Este projeto roda um bot de WhatsApp que conversa em inglês e, quando vale a pena, manda uma segunda mensagem com correções da sua última frase.

Ele também entende áudio; baixa o áudio do WhatsApp, transcreve com Whisper, e responde como se você tivesse digitado.

### O que ele faz, na prática

- **Conversa natural em inglês**: resposta curta, em tom de conversa, e termina com uma pergunta para manter o papo.
- **Correção em outra mensagem**: manda um feedback separado com o formato do WhatsApp:
  - `~errado~` para riscar
  - `*certo*` para destacar
- **Áudio vira texto**: transcreve mensagem de voz e usa a transcrição como entrada.
- **Memória por contato**: guarda o histórico por usuário em memória por 2 horas.
- **/reset**: apaga a conversa daquele contato e começa do zero.

### Stack e dependências

- **WhatsApp**: `baileys` (conexão e eventos)
- **IA**: Vercel AI SDK (`ai`) + provider OpenAI (`@ai-sdk/openai`)
- **Modelos usados no código**:
  - chat: `gpt-4o`
  - transcrição: `whisper-1`

### Requisitos

- **Node.js 20+**; o script usa `node --env-file` e `node --watch`.
- **pnpm** (tem `pnpm-lock.yaml` no repo).
- Uma conta do WhatsApp para escanear o QR Code.

### Como rodar

- **Instale dependências**:

```bash
pnpm install
```

- **Crie um `.env` na raiz**:

```bash
OPENAI_API_KEY="coloque_sua_chave_aqui"
```

- **Start do bot**:

```bash
pnpm dev
```

Quando o bot iniciar, ele imprime um QR Code no terminal. Abra o WhatsApp no celular e escaneie.

### Como usar no WhatsApp

- **Texto**: mande uma mensagem normal.
- **Áudio**: mande uma mensagem de voz; o bot transcreve e responde.
- **Reset da conversa**: mande `reset` ou `/reset`.

### Detalhes que importam

- **Sessão some quando você reinicia o processo**: a memória fica só em RAM.
- **Credenciais do WhatsApp ficam em `auth_info_baileys/`**:
  - esse diretório guarda o login do Baileys
  - já está no `.gitignore`
