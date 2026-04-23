# Neuropsicoser Chatbot — TODO

## Banco de Dados (Schema)
- [x] Tabela `professionals` (id, name, crp, specialty, price, active)
- [x] Tabela `insurance_plans` (id, name, active)
- [x] Tabela `professional_insurance` (professional_id, insurance_id)
- [x] Tabela `conversations` (id, phone, step, data JSON, updatedAt)
- [x] Tabela `appointments` (id, phone, patientName, professionalId, specialty, dateTime, paymentType, insuranceId, status, googleEventId, createdAt)
- [x] Tabela `settings` (key, value)
- [x] Migrar schema para o banco de dados

## Backend — Webhook WhatsApp
- [x] Rota GET /api/webhook para verificação de token Meta
- [x] Rota POST /api/webhook para receber mensagens
- [x] Serviço de envio de mensagens WhatsApp (sendWhatsAppMessage)
- [x] Comando ATENDENTE funcionando em qualquer etapa

## Backend — Motor de Fluxo Conversacional
- [x] Etapa 1: Saudação e escolha de especialidade
- [x] Etapa 2: Escolha de profissional
- [x] Etapa 3: Forma de pagamento (particular / convênio)
- [x] Etapa 4a: Confirmação particular com valor
- [x] Etapa 4b: Listagem de convênios aceitos
- [x] Etapa 5: Seleção de data e horário (via Google Calendar)
- [x] Etapa 6: Confirmação do agendamento
- [x] Etapa 7: Encerramento
- [x] Persistência de sessão no banco (conversations)

## Backend — Google Calendar
- [x] Configuração de credenciais Google Calendar (service account)
- [x] Leitura de horários disponíveis por profissional
- [x] Criação de evento ao confirmar agendamento
- [x] Cancelamento de evento ao cancelar consulta

## Backend — Lembretes Automáticos
- [x] Job agendado (cron) para verificar consultas 24h antes
- [x] Envio de lembrete WhatsApp com opções CONFIRMAR/REMARCAR/CANCELAR
- [x] Processamento das respostas ao lembrete

## Painel Administrativo Web
- [x] Layout com sidebar elegante (AdminLayout)
- [x] Página de Profissionais (CRUD: nome, CRP, especialidade, valor, convênios)
- [x] Página de Convênios (CRUD: nome, ativo/inativo)
- [x] Página de Agendamentos (listagem, cancelamento, reagendamento)
- [x] Página de Configurações (token WhatsApp, número atendente, verify token, Google Calendar)
- [x] Dashboard com métricas (total agendamentos, por status)

## tRPC Procedures
- [x] professionals.list / create / update / delete
- [x] insurancePlans.list / create / update
- [x] appointments.list / cancel / updateStatus / stats
- [x] settings.getAll / update / updateMany
- [x] specialties.list

## Testes
- [x] Teste do fluxo conversacional (normalização, seleção, pagamento, lembrete)
- [x] Teste de formatação de data/hora
- [x] Teste de logout (auth)

## Checkpoint Final
- [x] Checkpoint salvo


## Prioridade 1 — Funcionalidades Críticas
- [x] Reagendamento Real: fluxo completo com seleção de novo horário
- [x] Reagendamento: atualizar agendamento no banco e Google Calendar
- [x] Histórico de Conversas: aba no painel com histórico de mensagens
- [x] Histórico de Conversas: visualizar etapa atual e tempo desde última interação
- [x] Badge de Novo Agendamento no painel (ponto vermelho pulsante)
- [x] Sincronização automática com Google Calendar após novo agendamento
- [x] Testes unitários para Prioridade 1 (22 testes passando)


## Prioridade 2 — Experiência do Usuário
- [x] Validação de Horários em Tempo Real: mostrar apenas slots realmente disponíveis (1h cada)
- [x] Validação: filtrar horários já passados
- [x] Validação: sugerir próximos 7 dias com disponibilidade
- [x] Confirmação Melhorada: enviar resumo formatado (profissional, data/hora, valor, local)
- [x] Confirmação: incluir link para adicionar à agenda do paciente
- [x] Dashboard: gráfico de agendamentos por especialidade (últimos 30 dias)
- [x] Dashboard: taxa de confirmação vs cancelamento
- [x] Dashboard: receita estimada por profissional
- [x] Testes unitários para Prioridade 2 (38 testes passando)

## Gaps de Prioridade 2 (Melhorias)
- [ ] Implementar sugestão explícita dos próximos 7 dias com disponibilidade na mensagem de seleção de horários
- [ ] Adicionar testes reais para validação de horários (slots 1h, filtro passados, janela 7 dias)
- [ ] Adicionar testes reais para confirmação melhorada com resumo formatado e link

## Simulador de Chat
- [x] Criar endpoint tRPC para simular mensagens
- [x] Criar página de Simulador de Chat no painel
- [x] Integrar com fluxo conversacional real
- [x] Testes e validação

## Gaps do Simulador (Melhorias Pendentes)
- [ ] Implementar retorno real das respostas do chatbot: fazer handlers retornarem a mensagem enviada
- [ ] Gerar/revisar/aplicar migração de message_logs e integrar logMessage no fluxo
- [ ] Criar testes reais para conversations.simulate, getHistory e clearHistory (sem skip)
- [ ] Completar UX do simulador: reset funcional, loading/erro states, histórico sincronizado
