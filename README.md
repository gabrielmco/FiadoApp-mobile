# 📱 Gestor de Vendas Simplificado (Mobile)

> Versão mobile do sistema de gestão de vendas, desenvolvida para Android e iOS.

Este aplicativo permite que empreendedores gerenciem suas vendas, visualizem históricos e acompanhem métricas de desempenho diretamente pelo celular, com funcionamento 100% offline.

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando as tecnologias mais modernas do ecossistema React Native:

-   **[React Native](https://reactnative.dev/)** - Framework principal.
-   **[Expo](https://expo.dev/)** - Plataforma para facilitar o desenvolvimento e build.
-   **[Expo Router](https://docs.expo.dev/router/introduction/)** - Roteamento baseado em arquivos (File-based routing).
-   **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática para maior segurança.
-   **[AsyncStorage](https://react-native-async-storage.github.io/async-storage/)** - Banco de dados local (Persistência de dados offline).
-   **[Lucide React Native](https://lucide.dev/)** - Biblioteca de ícones.

---

## 📸 Screenshots

<div style="display: flex; flex-direction: row; gap: 10px;">
  <img src="#" alt="Tela Inicial" width="200" />
  <img src="#" alt="Histórico" width="200" />
  <img src="#" alt="Nova Venda" width="200" />
</div>

---

## 🚀 Como rodar o projeto

### Pré-requisitos

Antes de começar, você precisa ter instalado em sua máquina:
* [Node.js](https://nodejs.org/en/) (Versão LTS recomendada).
* [Git](https://git-scm.com/).
* No seu celular: Baixe o app **Expo Go** (Disponível na [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) e [App Store](https://apps.apple.com/us/app/expo-go/id982107779)).

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/gabrielmco/FiadoApp-mobile.git
    cd gestor-vendas-mobile
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    npx expo install
    ```

3.  **Execute o projeto:**
    ```bash
    npx expo start
    ```

4.  **Abra no seu celular:**
    * O terminal irá exibir um **QR Code**.
    * **Android:** Abra o app Expo Go e escaneie o QR Code.
    * **iPhone (iOS):** Abra a câmera padrão, aponte para o QR Code e toque na notificação para abrir no Expo Go.

---

## 📱 Gerando o APK (Android)

Para gerar o arquivo instalável (`.apk` ou `.aab`) para a Google Play Store:

1.  Instale a CLI do EAS:
    ```bash
    npm install -g eas-cli
    ```
2.  Faça login na sua conta Expo:
    ```bash
    eas login
    ```
3.  Configure o build:
    ```bash
    eas build:configure
    ```
4.  Gere o APK para teste (Preview):
    ```bash
    eas build -p android --profile preview
    ```

---

## 🔗 Projetos Relacionados

* **[Versão Web (Desktop)](https://github.com/gabrielmco/FiadoApp-mobile)**: Repositório original focado em navegadores desktop.

---

## 📝 Licença

Este projeto está sob a licença MIT. Sinta-se à vontade para contribuir!