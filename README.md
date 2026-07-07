# Nexus Vault

**Nexus Vault** é uma aplicação web desenvolvida para funcionar como um cofre local criptografado para gerenciamento de senhas e controle de gastos. O projeto foi criado com foco em privacidade, segurança, organização financeira e funcionamento offline no próprio navegador.

A aplicação permite criar um cofre protegido por senha mestra, armazenar credenciais, registrar despesas, acompanhar valores pagos, pendentes e vencidos, além de exportar e importar backups criptografados.

## Visão geral

O Nexus Vault utiliza criptografia local no navegador. Os dados são armazenados no `localStorage` de forma criptografada, usando uma senha mestra definida pelo usuário.

A senha mestra não é armazenada e não pode ser recuperada. Ela é utilizada apenas para derivar a chave criptográfica responsável por proteger os dados do cofre.

## Funcionalidades

### Cofre de senhas

- Criação de cofre com senha mestra
- Login/desbloqueio do cofre
- Cadastro de senhas por serviço
- Armazenamento de:
  - Usuário ou e-mail
  - Senha
  - URL
  - Observações
- Geração automática de senhas fortes
- Pesquisa por serviço, usuário, URL ou observação
- Visualização dos dados cadastrados
- Cópia de credenciais para a área de transferência
- Exclusão de senhas
- Seleção de itens filtrados
- Exportação de todas as senhas
- Exportação de senhas selecionadas

### Controle de gastos

- Cadastro de gastos e serviços
- Organização por categorias
- Cadastro de despesas únicas, mensais ou anuais
- Controle de quantidade de unidades
- Registro de status:
  - Pago
  - Pendente
  - Vencido
- Registro de quem realizou o pagamento
- Cadastro e reutilização de pagadores
- Filtro por pagador
- Filtro por período de pagamento
- Edição de gastos já cadastrados
- Adição rápida de novas unidades
- Marcação de uma unidade como paga
- Marcação de todas as unidades como pagas
- Marcação de todas as unidades como pendentes
- Exclusão de gastos
- Cálculo automático de valores pagos, pendentes, vencidos e totais

### Insights financeiros

A aplicação apresenta automaticamente indicadores como:

- Total pago
- Total pendente
- Total vencido
- Total geral
- Total pago no mês
- Total vencendo no mês
- Total vencido no mês
- Total do mês
- Quantidade de serviços cadastrados
- Quantidade de unidades cadastradas

### Calculadora de divisão

O sistema possui uma calculadora para dividir valores entre pessoas, permitindo dividir:

- Total geral
- Total pago
- Total pendente
- Total vencido
- Total do mês
- Pago no mês
- Vencendo no mês
- Vencido no mês

### Backup criptografado

O Nexus Vault permite exportar e importar backups criptografados.

Recursos disponíveis:

- Exportação completa do cofre
- Exportação apenas de senhas
- Exportação de senhas selecionadas
- Importação de backup
- Opção de substituir os dados atuais
- Opção de mesclar os dados importados com os dados existentes

## Segurança

O projeto utiliza recursos nativos do navegador para criptografia:

- **AES-GCM 256 bits** para criptografia dos dados
- **PBKDF2 com SHA-256** para derivação da chave
- **250.000 iterações** no processo de derivação
- Geração de salt aleatório
- Geração de IV aleatório para criptografia
- Dados armazenados localmente de forma criptografada

## Importante sobre a senha mestra

A senha mestra não é armazenada no sistema.

Se o usuário esquecer a senha mestra, não será possível recuperar os dados criptografados nem restaurar backups antigos que tenham sido protegidos por ela.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Web Crypto API
- LocalStorage
- Service Worker
- Manifest PWA
- Progressive Web App

## Estrutura do projeto

```text
nexus-vault/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── sw.js
└── README.md
```

## Arquivos principais

### `index.html`

Contém a estrutura da aplicação, incluindo telas de criação do cofre, login, gerenciamento de senhas, controle de gastos, filtros, insights e formulários.

### `style.css`

Responsável pela identidade visual da aplicação, com layout escuro, detalhes em laranja, cartões responsivos, formulários, botões, listas e adaptação para dispositivos móveis.

### `app.js`

Contém toda a lógica da aplicação, incluindo:

- Criação e desbloqueio do cofre
- Criptografia e descriptografia
- Cadastro de senhas
- Cadastro de gastos
- Cálculo de vencimentos
- Controle de status
- Exportação e importação de backups
- Filtros e buscas
- Atualização dos indicadores financeiros

### `manifest.json`

Configuração da aplicação como PWA, permitindo comportamento semelhante a aplicativo instalado.

### `sw.js`

Service Worker responsável pelo cache dos arquivos principais e funcionamento offline.

## Como usar

1. Abra a aplicação no navegador.
2. Crie uma senha mestra forte.
3. Cadastre suas senhas e/ou gastos.
4. Bloqueie o cofre quando terminar.
5. Para acessar novamente, informe a senha mestra.
6. Faça backups criptografados regularmente.

## Funcionamento offline

O projeto possui suporte a Service Worker, permitindo que os arquivos principais sejam armazenados em cache para uso offline.

Arquivos armazenados em cache:

```text
index.html
style.css
app.js
manifest.json
```

## Privacidade

Todos os dados são armazenados localmente no navegador do usuário. O projeto não envia informações para servidores externos.

Nenhuma senha, gasto ou backup é transmitido pela internet pela aplicação.

## Possíveis melhorias futuras

- Adicionar ícones ao Manifest PWA
- Criar tela de confirmação personalizada em vez de `alert`, `prompt` e `confirm`
- Implementar opção de alteração da senha mestra
- Criar painel de gráficos para gastos
- Adicionar exportação em CSV
- Adicionar categorias com cores personalizadas
- Melhorar a experiência de instalação como aplicativo
- Criar modo de recuperação baseado em chave de emergência
- Implementar testes automatizados
- Separar o JavaScript em módulos

## Aviso

Este projeto tem finalidade educacional e demonstrativa. Embora utilize criptografia nativa do navegador, recomenda-se cautela ao armazenar informações sensíveis em qualquer aplicação local ou experimental.

## Autor

Desenvolvido por **Anderson Teixeira**.

- GitHub: [AndersonTeixeira10](https://github.com/AndersonTeixeira10)
- LinkedIn: [Anderson Teixeira](https://www.linkedin.com/in/anderson-teixeira-546756211)

## Status do projeto

Projeto funcional, em evolução e aberto para melhorias.
