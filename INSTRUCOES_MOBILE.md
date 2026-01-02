# Como usar este projeto no Celular (Modo Grátis e Seguro)

Você pediu uma forma de usar o sistema no celular de forma gratuita e que os dados não sejam apagados facilmente. Aqui estão as duas melhores opções que preparei para você.

## Opção 1: Aplicativo Nativo (Android APK) - **Recomendada para Segurança**

Esta opção transforma o site em um aplicativo real instalado no celular.
**Prós**: Os dados ficam salvos dentro do aplicativo e não somem se você limpar o histórico do navegador.
**Contras**: Precisa de um computador para criar o arquivo .apk inicial.

### Passos para criar o App:

1.  **Instale as dependências** (no computador):
    Abra o terminal na pasta do projeto e rode:
    ```bash
    npm install
    npm run build
    ```

2.  **Configure o Android**:
    ```bash
    npx cap add android
    npx cap sync
    ```

3.  **Gere o APK**:
    *   Você precisa ter o **Android Studio** instalado.
    *   Rode: `npx cap open android`
    *   O Android Studio vai abrir. Conecte seu celular via USB e clique no botão "Play" (Run) para instalar direto no celular.
    *   OU vá em "Build" -> "Build Bundle(s) / APK(s)" -> "Build APK" e envie o arquivo gerado para o celular.

---

## Opção 2: PWA (Aplicativo Web) - **Mais Fácil**

Esta opção não precisa instalar nada complexo. Você acessa pelo navegador e "instala" um atalho.
**Atenção**: Os dados ficam no navegador. Se você for em "Limpar Dados de Navegação", pode perder tudo. **Use o botão "Backup" do sistema frequentemente!**

### Passos:

1.  **Hospede o site** (Grátis):
    *   Use serviços como Vercel ou Netlify.
    *   Conecte seu GitHub e faça o deploy.

2.  **No Celular**:
    *   Acesse o link do site.
    *   No Chrome (Android): Toque nos 3 pontinhos -> "Adicionar à Tela Inicial" ou "Instalar App".
    *   No Safari (iPhone): Toque no botão Compartilhar -> "Adicionar à Tela de Início".
    *   O ícone aparecerá como um app normal.

## Backup de Segurança (Muito Importante)

Independente da opção, o sistema salva tudo no celular. Se o celular quebrar ou for formatado, você perde tudo.
**Sempre use o botão "Exportar Backup" no menu do sistema** e envie o arquivo baixado para seu email ou Google Drive. Assim seus dados estarão sempre seguros.
