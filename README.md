# Rhally — Levantamento de Módulos
**Snapshot: 22/06/2026**

Plataforma completa de gestão de RH. Multiempresa, multitenant, com portal do colaborador, portal do cliente e painel administrativo interno.

---

## Infraestrutura

| Item | Detalhe |
|---|---|
| VPS | Ubuntu 22.04 — `201.23.1.81` |
| Frontend principal | React + Vite — `plataforma.rhally.com.br` |
| Backend principal | Node.js + TypeScript — porta 4000 |
| Portal do Cliente | Node.js + Prisma + MySQL — porta 3338 |
| Admin interno | React + Vite — `admin.rhally.com.br` |
| Site de marketing | React + Vite — `rhally.com.br` |
| Portal de vagas | `vagas.rhally.com.br` → redirect para plataforma |
| Banco de dados | MySQL 8 em `172.17.0.1:3306` (rhallydb + portal_core) |
| Process manager | PM2 |
| SSL | Let's Encrypt (Certbot) |

---

## Módulos da Plataforma

### 🏠 HUB
Dashboard central da empresa.
- Indicadores: funcionários ativos, pontos registrados, faltas do dia
- Gráficos: presença × faltas (últimos 7 dias), admissões últimos 6 meses, distribuição por setor
- Gestão de filiais e setores
- Perfil da empresa
- Calendário corporativo
- Integrações ativas
- Comunicados gerais (push + WhatsApp)

### 👥 People
Gestão completa do ciclo de vida do colaborador.
- Admissão digital 100% sem papel (formulário completo com documentos)
- Gerenciamento de funcionários (ativo/inativo)
- Inativação de funcionário com registro de motivo
- Upload e gestão de documentos por funcionário
- Cadastro por setor e filial

### ⏱ Produtividade
Controle de jornada, ponto eletrônico e gestão de ausências.
- Registro de ponto (facial, geolocalização, QR code)
- Ponto geral (link público com token para registro sem login)
- Ponto por CPF (autenticação alternativa)
- Banco de horas (empresa e por funcionário)
- Escalas de trabalho (individual e em grupo)
- Carteiras flex (jornada flexível)
- Apuração manual de ponto
- Fechamento mensal de ponto
- Ocorrências e atrasos
- Faltas por funcionário e por setor
- Folgas (solicitação + aprovação)
- Solicitações e justificativas de ponto
- **Atestados médicos**: envio pelo colaborador, download, visualização, aprovação e rejeição pelo RH
- Espelho de ponto (semanal e mensal)

### 🎯 Talent
Recrutamento e seleção.
- Gestão de vagas (a empresa cadastra livremente dentro do plano contratado)
- Pipeline de candidatos com kanban
- Agendamento de entrevistas
- Testes e avaliações de candidatos
- Portal de vagas público (`vagas.rhally.com.br`)

### 💜 Cultura & Engajamento
Identidade organizacional, comportamento, clima e mensuração contínua de engajamento.

**Atualmente entregue:**
- One-on-one sessions (chat estruturado gestor ↔ colaborador) com notas, action items, tópicos de pauta, lembretes, exportação PDF e assinatura digital
- Comunicados internos com controle de leitura

**Em construção (roadmap):**

#### Cultura & Comportamento
- **Profiler DISC**: mapeamento comportamental para fit cultural na contratação — identifica perfil dominante, influente, estável e conformista
- **Fit Cultural (MVC)**: teste científico baseado no Modelo de Valores Concorrentes com 4 quadrantes — Clã, Empreendedora, Burocrática e Mercado — mede compatibilidade candidato × empresa (ref. Gupy)
- **Engenharia de Cargos**: estrutura cargos, trilhas e planos de carreira por nível
- **Análise demissional**: formulário estruturado + correlação com dados de engajamento
- **Predição de saída voluntária (Text Analytics)**: análise de linguagem em pesquisas e feedbacks para identificar risco de desligamento
- **Hotspots**: mapa de grupos críticos com baixo engajamento ou alto risco de turnover
- **Alertas inteligentes**: variação de engajamento por setor/liderança e previsão de turnover
- **Radar de Rotatividade**: índices de entrada, saída e retenção com histórico e projeção

#### Pesquisas
- **Pesquisa de Clima personalizada**: perguntas customizáveis por empresa
- **eNPS / NPS em tempo real**: escala 0–10 com classificação automática de promotores, neutros e detratores
- **Pesquisa admissional**: aplicada nos primeiros dias do colaborador
- **Pesquisa de engajamento**: ciclos configuráveis
- **Pesquisa demissional**: aplicada no desligamento, correlacionada com dados históricos
- **Pulse Survey (pesquisa de pulso)**: janela deslizante de 14 dias, 5–6 perguntas por semana, pool de 122 perguntas com 7 tipos de resposta e coleta qualitativa adaptativa (ref. TeamCulture)

#### 10 Pilares de Engajamento
Liderança · Alinhamento · Crescimento · Satisfação · Relacionamento · Vestir a Camisa · Bem-estar · Felicidade · Reconhecimento · Feedback
- Diagnóstico de causa raiz com correlação entre pilares
- Score por pilar com comparação histórica

#### Inteligência e Analytics
- **Axel AI**: analista inteligente que gera cards de ação priorizados automaticamente com base nos dados de engajamento (ref. TeamCulture)
- **Score de Liderança (0–100)** em 5 dimensões — indicador preditivo de engajamento futuro
- **Planos de ação gerados por IA** com base nos resultados das pesquisas
- **Dashboards com análise histórica** e comparação de scores ao longo do tempo
- **Mensuração contínua** de comportamentos organizacionais com ranking dinâmico baseado na cultura presente
- **Benchmark** com outras empresas da base Rhally (anonimizado por setor/porte)
- Exportação de dados em **CSV, XLSX e PPTX**

### 🦺 Safety
Saúde e segurança do trabalho.
- Inventário de EPIs por funcionário
- Cadastro e controle de EPIs
- NR-1 / PGR (Programa de Gerenciamento de Riscos)
- Base SST compliant

### ⚖️ Compliance
Conformidade e canal de denúncias.
- Canal de denúncias anônimo
- Tokens de compliance por empresa
- Integração com sistema externo de denúncias

### 📊 Intelligence
Analytics e inteligência de dados.
- Dashboard com métricas avançadas
- Exportação de PDF
- Relatórios por módulo

### 💰 Remuneração
Folha e remuneração.
- Upload e gestão de holerites (por funcionário)
- Visualização pelo colaborador (app)
- Gestão de folgas remuneradas
- Calendário de pagamentos

### 🎁 Benefícios
Gestão de benefícios corporativos.
- Cadastro de benefícios da empresa
- Vinculação por funcionário
- Carteira flex de benefícios
- Visualização pelo colaborador

### 🎓 Academy
(Em expansão) Plataforma de treinamentos e capacitações internas.

### 🛒 Marketplace
(Em expansão) Integração com fornecedores e parceiros RH.

---

## Portal do Colaborador (app mobile/web)

Acesso via login próprio. O colaborador consegue:
- Registrar ponto (facial ou token)
- Ver espelho de ponto semanal/mensal
- Solicitar folgas e justificativas
- Ver holerites
- Ver e solicitar benefícios
- Participar de one-on-ones
- Responder pesquisas
- Comunicados e notificações

---

## Portal do Cliente (`portal.rhally.com.br`)

Para o RH da empresa cliente gerenciar sua conta Rhally:
- Ver plano contratado e módulos ativos
- Emitir e pagar faturas
- Ver contratos
- Suporte

---

## Admin Interno (`admin.rhally.com.br`) — NOVO 22/06/2026

Painel exclusivo da equipe Rhally para gestão comercial e operacional.

### Funcionalidades
- **Dashboard**: total de clientes, trials ativos, contas ativas/inativas
- **Módulos mais usados**: ranking global com dados reais do rhallydb (Produtividade, People, Talent, Safety, Remuneração, Cultura, Compliance, Benefícios)
- **Clientes mais ativos**: top 6 por volume de uso, com badges dos módulos
- **Gestão de clientes**: listagem, detalhe completo, edição de status
- **Módulos por cliente**: ativar/desativar módulos individualmente ou todos
- **Contratos**: criar, editar, vincular plano, valor mensal, data início, PDF
- **Faturas**: gerar por competência, marcar como paga, resumo financeiro
- **Administradores por cliente**: definir usuários isMaster por tenant
- **Equipe Rhally**: gestão de usuários internos com roles (SUPER, COMERCIAL, SUPORTE)
- **Auth**: JWT com `tipo: "admin"`, protegido por middleware separado

### Roles
| Role | Acesso |
|---|---|
| SUPER | Tudo, incluindo gestão de equipe |
| COMERCIAL | Clientes, contratos, faturas, módulos |
| SUPORTE | Visualização de clientes |

---

## Atualizações de Hoje — 22/06/2026

### Identidade Visual
- Logo da sidebar da plataforma corrigida e padronizada (`logo-icon-white.png`)
- Logo do header de `rhally.com.br` substituída pelo logo completo (`logo-icon.png`)
- Logo da tela de login de `plataforma.rhally.com.br` aumentada (52px → 100px)
- Remoção de texto "rhally" duplicado na sidebar
- Padronização da tipografia: Nunito 900, sem letter-spacing (fiel à marca)

### Admin Portal (completo)
- Novo sistema de autenticação para equipe interna (JWT separado)
- CRUD completo de clientes, contratos e faturas
- Widget de módulos mais usados com dados reais do banco de produção
- Deploy em `admin.rhally.com.br` com SSL + nginx

### Portal do Cliente Backend
- Migração de 30 clientes do PostgreSQL legado para MySQL
- Módulos corretos da Rhally seedados (HUB, People, Produtividade, Talent, Cultura, Safety, Compliance, Intelligence, Remuneração, Benefícios, Academy, Marketplace)
- Novas rotas: `/api/admin-rhally/stats/modulos-uso` (dados reais de uso)
- Dependência `mysql2` adicionada para consulta direta ao rhallydb

### Trial
- Sistema de trial 14 dias funcionando em `rhally.com.br/trial`
- Envio de e-mails de convite via SMTP (`noreply@maisrh.com`)

---

## Repositórios

| Repo | Descrição |
|---|---|
| `rhally-frontend` | Plataforma principal — React + Vite |
| `rhally-backend` | API principal — Node.js + TypeScript |
| `rhally-admin` | Admin interno — React + Vite + TypeScript |
| `portal-cliente-backend` | Portal do cliente — Node.js + Prisma + MySQL |
| `rhally-landing` | Site de marketing — React + Vite |

---

*Gerado em 22/06/2026 — Rhally © O cérebro do RH*
