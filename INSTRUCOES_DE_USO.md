# Guia Passo a Passo: Executar o Gestor de Vendas Simplificado

Verifiquei a configuração do seu projeto e ele parece estar estruturado corretamente para funcionar. O Backend espera rodar na porta 3000 e o Frontend está configurado para se comunicar com essa porta. O banco de dados (`dev.db`) também já existe.

Siga os passos abaixo para colocar tudo no ar:

## Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

## Passo 1: Configurar e Rodar o Backend
O "cérebro" da aplicação precisa rodar primeiro.

1.  Abra um terminal (PowerShell ou CMD).
2.  Entre na pasta `backend`:
    ```powershell
    cd backend
    ```
3.  Instale as dependências (caso ainda não tenha feito):
    ```powershell
    npm install
    ```
4.  (Opcional, mas recomendado) Garanta que o banco de dados está sincronizado:
    ```powershell
    npm run prisma:generate
    ```
5.  Inicie o servidor:
    ```powershell
    npm run dev
    ```
    ✅ **Sucesso:** Você verá uma mensagem como `Server running on http://localhost:3000`.
    *Mantenha este terminal aberto.*

## Passo 2: Configurar e Rodar o Frontend
Agora, a interface visual para você usar.

1.  Abra um **novo** terminal (mantenha o do backend rodando).
2.  Garanta que está na pasta raiz do projeto (`gestor-de-vendas-simplificado`). Se estiver no backend, volte um nível:
    ```powershell
    cd ..
    ```
3.  Instale as dependências:
    ```powershell
    npm install
    ```
4.  Inicie a aplicação:
    ```powershell
    npm run dev
    ```
    ✅ **Sucesso:** O terminal mostrará um link local, geralmente `http://localhost:5173/`.

## Passo 3: Acessar a Aplicação
1.  Abra seu navegador (Chrome, Edge, etc.).
2.  Acesse o link mostrado no passo anterior (ex: `http://localhost:5173`).
3.  A aplicação deve carregar e mostrar os dados vindos do backend (Clientes, Produtos, Vendas).

---

## Verificações que fiz para você
- **Portas:** Backend na 3000 e Frontend apontando para 3000. (OK)
- **Banco de Dados:** Arquivo `dev.db` encontrado na pasta `backend/prisma`. (OK)
- **Instalação:** Arquivos `package.json` presentes em ambas as pastas. (OK)

Se encontrar algum erro "Connection refused", verifique se o terminal do **Passo 1** ainda está rodando sem erros.
