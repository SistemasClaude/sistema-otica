# Sua Ótica — catálogo + painel da ótica

Sistema gratuito com **Firebase** (dados e login) e **GitHub Pages** (link público).

- **Catálogo** (`index.html`): o link que você manda para as clientes. Mostra as armações e tem o botão **"Quero este"**.
- **Painel** (`painel.html`): só você entra, com e-mail e senha. Tem estoque, botão **Bipar**, vendas, crediário, clientes com receita, cobranças, pedidos e Minha Ótica.

---

## Antes de tudo: modo demonstração

Enquanto o Firebase não estiver ligado, o app abre em **modo demonstração**, com armações, clientes, vendas e pedidos de exemplo. Para entrar no painel, qualquer senha serve. Os dados de exemplo ficam só no seu navegador. Quando você colar a configuração do Firebase (Parte 1), a demonstração some e entram os seus dados reais.

> Abrir o arquivo com dois cliques no computador **não funciona**, porque o navegador bloqueia. Veja pelo link do GitHub Pages (Parte 2) ou peça para o Claude abrir uma prévia local.

## Parte 1 — Firebase (uns 10 minutos)

1. Acesse **console.firebase.google.com** com a conta Google da ótica e clique em **Criar um projeto**. Use o nome `sistema-otica`. O Google Analytics pode ficar desligado.
   - O plano gratuito (**Spark**) basta. Não é preciso cadastrar cartão.
2. **Banco de dados**
   - No menu: **Criação → Firestore Database → Criar banco de dados**.
   - Escolha **modo de produção** e o local **southamerica-east1 (São Paulo)**.
3. **Regras de segurança**
   - Ainda no Firestore, abra a aba **Regras**.
   - Apague o que estiver lá, cole todo o conteúdo do arquivo `firestore.rules` e clique em **Publicar**.
   - Se a conta da ótica não for `email-da-otica@exemplo.com`, troque o e-mail nas regras **e também** em `js/firebase-config.js`.
4. **Login**
   - No menu: **Criação → Authentication → Vamos começar**.
   - Em **Método de login**, ative **E-mail/senha**.
   - Em **Usuários → Adicionar usuário**, informe o e-mail da ótica e crie a sua senha.
5. **Ligar o app ao Firebase**
   - Clique na ⚙️ e depois em **Configurações do projeto**.
   - Em **Seus apps**, clique no ícone **`</>`** (Web). Use o apelido `site` e **não** marque o Hosting.
   - Copie os valores do `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId e appId) e cole em **`js/firebase-config.js`**, no lugar de cada `COLE_AQUI`.
   - Esses dados não são senha e podem ficar públicos: quem protege as informações são as regras do passo 3.

## Parte 2 — GitHub Pages (o link público)

1. Crie uma conta em **github.com**, se ainda não tiver.
2. Clique em **New repository**, dê o nome `sistema-otica` e deixe **Public**.
   - O GitHub Pages gratuito exige repositório público. Não há problema: senhas e dados das clientes ficam no Firebase, e não no código.
3. Clique em **Add file → Upload files** e arraste **todo o conteúdo** desta pasta: `index.html`, `painel.html`, `manifest.json`, `firestore.rules`, `LEIA-ME.md` e as pastas `assets`, `css` e `js`. Depois clique em **Commit changes**.
4. Vá em **Settings → Pages**. Em *Branch*, escolha **main** e **/ (root)** e clique em **Save**.
   - Em 1 ou 2 minutos aparece o link: `https://SEU-USUARIO.github.io/sistema-otica/`.
5. Volte ao Firebase em **Authentication → Configurações → Domínios autorizados → Adicionar domínio** e adicione `SEU-USUARIO.github.io`.

## Parte 3 — Começar a usar

- **Catálogo para as clientes:** `https://SEU-USUARIO.github.io/sistema-otica/`
- **Seu painel:** `https://SEU-USUARIO.github.io/sistema-otica/painel.html`
  - No celular, abra o painel no Chrome ou no Safari e escolha **"Adicionar à tela inicial"**. Ele passa a abrir como um aplicativo.
- **Primeiros passos no painel:**
  1. Em **Minha Ótica**, preencha o WhatsApp e a chave Pix.
  2. Cadastre as armações em **Estoque**. O app gera o código (E00001, E00002…) e a etiqueta, que você baixa como imagem e imprime na impressora térmica.
  3. Use o botão dourado **Bipar** para dar entrada, levar na maleta, devolver e vender.
- **Esqueceu a senha?** Na tela de login, toque em **"Esqueci a senha"** e o Firebase manda um link para o seu e-mail.

## Como bipar

- **Câmera do celular:** toque em **Bipar** e aponte para o código. Na primeira vez, o navegador pede permissão para usar a câmera, e é preciso aceitar.
- **Leitor Bluetooth:** toque em **Bipar** e use o leitor normalmente. O código cai no campo de texto da janela.
- **Código de fábrica:** se a armação já vier com código de barras, bipe e o app abre o cadastro com o código preenchido.

## Limites do plano gratuito

O plano gratuito do Firebase permite **50 mil leituras e 20 mil gravações por dia**, o que é bem mais do que uma ótica usa. As fotos são reduzidas no próprio celular e ficam guardadas no banco de dados, sem precisar do Firebase Storage, que exige cartão.

## Como os arquivos estão organizados

| Arquivo | O que faz |
|---|---|
| `index.html`, `js/catalogo.js`, `css/catalogo.css` | Catálogo público |
| `painel.html`, `js/painel.js`, `css/painel.css` | Estrutura do painel, login e menu |
| `js/telas/*.js` | Telas do painel: início, estoque, vender, clientes, cobranças, pedidos e Minha Ótica |
| `js/dialogos.js` | Janelas de produto, peça bipada, cliente e receita |
| `js/acoes.js` | Tudo que grava no banco (estoque, vendas, parcelas…) |
| `js/leitor.js`, `js/etiqueta.js` | Leitor de código e etiquetas |
| `js/firebase-config.js` | **Onde você cola a configuração do Firebase** |
| `firestore.rules` | Regras de segurança (cole no console do Firebase) |
