# 🎁 Amigo Secreto da Família

Aplicação web responsiva (mobile-first) em **Português do Brasil (PT-BR)** feita com **Vite + React + TypeScript + Tailwind CSS + Firebase Spark (100% gratuito)**, pronta para hospedagem estática no **GitHub Pages** a partir da pasta `/docs`.

---

## ✨ Principais Recursos

- **Acesso sem senha via QR Code:** Cada participante (`Victor`, `Wellington`, `Rosângela` e `Bianca`) recebe um QR Code e link mágico individual (`?token=...`).
- **Regra estrita Anti-Spoiler:** Quem cada pessoa tirou no sorteio e o carrinho privado de planejamento nunca são exibidos para outros participantes — **nem mesmo no Painel Admin**.
- **Feed estilo loja:** Preços destacados em `R$`, indicadores visuais comparando com o orçamento de **R$ 150,00**, filtros por pessoa, botão secreto `🎁 Meu Amigo Secreto` com **Modo Privacidade (olho)** e dicas de tamanhos/preferências.
- **3 formatos de pedidos:**
  1. **Produto de Loja:** Puxa metadados OpenGraph automaticamente via `microlink.io` / `jsonlink.io` com fallback amigável caso a loja bloqueie automação.
  2. **Digital / Assinatura:** Ideal para gift cards, assinaturas ou experiências, com instruções de compra/ativação.
  3. **Monte um Combo:** Agrupa vários itens com barra de soma em tempo real comparada ao teto do evento.
- **Upload de fotos 100% gratuito (sem Firebase Storage):** As imagens enviadas são comprimidas diretamente no navegador via `<canvas>` (máx. 720px, abaixo de 150 KB) e armazenadas em Base64 no Firestore.
- **Carrinho Privado de Planejamento:** Simule combinações de presentes, inclua frete estimado, adicione anotações secretas e marque o que já comprou.
- **Painel Admin (Victor):** QR Codes prontos para baixar como cartão PNG e enviar no WhatsApp, rotação de tokens, alteração de orçamento/prazo e moderação de itens.

---

## 🔥 1. Configurando o Firebase Spark (Gratuito)

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e crie um novo projeto (mantenha no **Plano Spark — Gratuito**, não é necessário ativar faturamento nem Storage).
2. No menu lateral, clique em **Criação > Firestore Database > Criar banco de dados**:
   - Escolha a localização mais próxima (ex: `southamerica-east1` — São Paulo).
   - Inicie em **Modo de produção** (ou teste inicialmente).
3. Na aba **Regras (Rules)** do Firestore, cole o conteúdo do arquivo [`firestore.rules`](./firestore.rules) deste repositório e clique em **Publicar**.
   - *Obs.:* Leia os comentários dentro de `firestore.rules` para entender as validações aplicadas ao modelo de token familiar e como endurecer com Anonymous Auth caso queira no futuro.
4. Volte em **Configurações do Projeto** (ícone de engrenagem) > **Seus apps** > clique no ícone **`</>` (Web)** para registrar um app web (não precisa marcar Firebase Hosting).
5. Copie os valores de `firebaseConfig`.

---

## ⚙️ 2. Configurando o Projeto Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   *(No Windows PowerShell: `Copy-Item .env.example .env`)*
3. Preencha as variáveis `VITE_FIREBASE_*` no arquivo `.env` com as credenciais obtidas no Firebase Console.
4. Rode o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 🚀 3. Primeiro Boot do Admin e QR Codes

1. Ao abrir o aplicativo pela primeira vez com o Firestore vazio, aparecerá a tela **Primeiro Acesso — Setup Inicial**.
2. Crie um **PIN secreto do Admin** (usado apenas caso o Victor precise recuperar o acesso em outro dispositivo) e clique em **Inicializar Amigo Secreto e Gerar QR Codes**.
3. O sistema criará automaticamente os 4 perfis (`victor`, `wellington`, `rosangela`, `bianca`), os tokens aleatórios e a data limite padrão (`25/11/2026 às 23:59:59`, Horário de Brasília).
4. Acesse o **Painel Admin** no menu superior (ou inferior no celular) para:
   - **Baixar QR Code (PNG)** de cada familiar e enviar direto no WhatsApp;
   - Ou clicar em **Copiar Link Mágico**.

> **Importante:** Gere os links/QR Codes finais **depois** de publicar no GitHub Pages (ou acesse o site já publicado no GitHub Pages para gerar os QR Codes), pois o QR Code aponta para a URL atual onde o Painel Admin está aberto.

---

## 🌐 4. Build e Deploy no GitHub Pages (`/docs`)

O `vite.config.ts` já está configurado com `base: './'` e saída em `docs/`.

1. Certifique-se de que seu arquivo `.env` está preenchido corretamente antes do build (o Vite injeta as variáveis `VITE_FIREBASE_*` no bundle estático gerado em `/docs`).
2. Execute o build de produção:
   ```bash
   npm run build
   ```
3. Confirme que a pasta `/docs` foi gerada/atualizada com `index.html` e `assets/`.
4. Faça o commit e push para o seu repositório no GitHub (incluindo a pasta `/docs` e **nunca** comitando o arquivo `.env`, que já está no `.gitignore`).
5. No GitHub, acesse **Settings > Pages**:
   - Em **Build and deployment > Source**, selecione **Deploy from a branch**.
   - Em **Branch**, escolha `main` e a pasta **`/docs`**, depois clique em **Save**.
6. Em alguns instantes o site estará no ar em `https://seu-usuario.github.io/seu-repositorio/`.

---

## 📁 Estrutura de Pastas

```text
├── docs/                  # Saída final do build para o GitHub Pages
├── src/
│   ├── components/        # Telas e componentes de UI (Feed, Carrinho, Admin, Onboarding...)
│   ├── constants/         # Participantes fixos, avatares e paleta de cores
│   ├── firebase/          # Configuração Firebase e serviço completo em tempo real
│   ├── hooks/             # Toast e contagem regressiva em tempo real
│   ├── types/             # Tipagens TypeScript (com separação anti-spoiler)
│   ├── utils/             # Compressão de imagem, link preview, formatação BRL e QR PNG
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── firestore.rules
├── vite.config.ts
└── README.md
```
