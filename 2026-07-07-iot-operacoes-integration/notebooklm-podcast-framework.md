# IoT Hub ↔ Operações — Integração de Alertas
## NotebookLM Podcast Framework + Q&A

**Notebook**: [IoT Hub ↔ Operações — Integração de Alertas](https://notebooklm.google.com/notebook/9991dfaf-82b7-492a-a56e-8911bc8e6f11)
**Notebook ID**: `9991dfaf-82b7-492a-a56e-8911bc8e6f11`
**Gerado em**: 2026-07-07
**Público-alvo**: William Pinheiro (Tech Lead Operações) e Thomas Melo (Tech Lead IoT Hub)
**Fontes**: PRD da Integração + Análise Adversarial de Métodos e Riscos

---

## Podcast: "IoT Hub ↔ Operações — Integração de Alertas"

**Formato**: Deep Dive, dois hosts conversacionais
**Idioma**: Português (pt-BR)
**Duração alvo**: 10–12 minutos
**Tom**: executivo-técnico, acessível, focado no "porquê" e nos próximos passos

---

### Roteiro Completo

#### INTRO (00:00–01:30)

**Host A (Marina)**:
Bem-vindos ao Deep Dive de hoje. Eu sou a Marina.

**Host B (Rafael)**:
E eu sou o Rafael. Hoje a gente vai falar sobre uma integração que está na mesa dos times de tecnologia da Eletromidia: conectar o IoT Hub — que monitora centenas de painéis de mídia — com o Operações, o sistema que gerencia os tickets de manutenção.

**Marina**:
Exato. E o contexto aqui é interessante. Hoje o 4YouSee já manda webhooks pro Operações quando um player fica offline. Funciona, mas manda só 3 campos. A ideia agora é trazer os alertas do IoT Hub — que tem telemetria de 10+ subsistemas diferentes — com 30+ campos de contexto, seguindo o mesmo padrão que já funciona.

**Rafael**:
E o público dessa conversa? William Pinheiro, tech lead do Operações, e Thomas Melo, tech lead do IoT Hub. A gente vai focar no "porquê" das decisões e no que cada time precisa fazer pra essa integração sair do papel.

---

#### SEGMENTO 1 — Por que integrar? (01:30–03:30)

**Marina**:
Rafael, por que a gente precisa dessa integração? Não daria pra continuar como está?

**Rafael**:
Olha, Marina, o problema é que o IoT Hub e o Operações rodam como sistemas paralelos hoje. O IoT Hub coleta telemetria riquíssima — temperatura, umidade, energia, conectividade, velocidade dos fans, status do NUC, do RMC, do modem, da régua de LED, da estação meteorológica. Mas tudo isso fica lá, isolado.

**Marina**:
E quando dá problema?

**Rafael**:
Quando um painel superaquece ou perde conectividade, o IoT Hub sabe na hora. Mas essa informação não chega automaticamente na equipe de manutenção. Alguém precisa olhar um dashboard e abrir um ticket manualmente. Isso é lento, é falho, e não escala.

**Marina**:
Então a integração resolve exatamente esse gap: o alerta vira ticket automaticamente. O IoT Hub detecta → o Operações age. E o mais importante: seguindo o padrão que o 4YouSee já estabeleceu. Nada de reinventar a roda.

---

#### SEGMENTO 2 — O método escolhido: Webhook com Outbox (03:30–05:30)

**Rafael**:
E aqui vem a primeira decisão arquitetural importante. A equipe fez uma análise adversarial de 6 métodos de integração diferentes. Quer que eu leia o ranking?

**Marina**:
Manda ver.

**Rafael**:
Primeiro lugar, com 35 de 40 pontos: webhook com outbox local e idempotência. Depois RabbitMQ/SQS com 31, API consumer com 29, polling com 28, Redis compartilhado com 18, e leitura de réplica de banco com 14.

**Marina**:
O webhook ganhou com folga. E por quê?

**Rafael**:
Três motivos principais. Primeiro: latência e esforço — nota máxima, 5 de 5. O IoT Hub já tem um observer que dispara eventos, então adicionar um webhook é natural. Segundo: reversibilidade — também nota 5. Se der errado, é fácil voltar atrás. E terceiro: ele segue o mesmo padrão que o 4YouSee já usa com sucesso.

**Marina**:
E o outbox local? Isso é importante.

**Rafael**:
Fundamental. O outbox garante que se o webhook falhar — se o Operações estiver fora do ar, por exemplo — o alerta não se perde. Ele fica gravado localmente e é reenviado quando o endpoint voltar. Combinado com idempotência no endpoint, a gente evita ticket duplicado.

**Marina**:
Resumindo: simples, rápido de implementar, fácil de reverter, e com garantia de entrega. Pra um MVP, não tem escolha melhor.

---

#### SEGMENTO 3 — Os riscos e como mitigar (05:30–07:30)

**Marina**:
Mas nem tudo são flores. A análise adversarial mapeou 5 riscos principais. Rafael, quais são e como a gente se blinda?

**Rafael**:
O risco número 1 é o que mais assusta: mapeamento errado. Imagina o dispositivo do shopping X mapeado pro lugar do shopping Y. O ticket de manutenção vai pro lugar errado.

**Marina**:
E como resolve?

**Rafael**:
Com a tabela `iot_device_place_mappings` — e o ponto crítico é que o mapeamento exige aprovação manual. Nada automático sem revisão humana. E tem uma hierarquia de prioridades: primeiro manual, depois match por SEP, depois por player, depois coordenadas como sugestão. E cidade? Totalmente inaceitável como critério de mapeamento.

**Marina**:
Risco 2?

**Rafael**:
Tempestade de tickets. Uma falha em cascata no IoT Hub poderia gerar centenas de tickets de uma vez, sobrecarregando a equipe de manutenção.

**Marina**:
A mitigação aqui é o MVP: só alertas críticos geram tickets. E tem regras de severidade claras — alertas de dispositivos em manutenção são suprimidos, dispositivos ativos não geram nada.

**Rafael**:
Risco 3: perda silenciosa. O webhook falha e o alerta morre sem ninguém saber. A mitigação é exatamente o outbox local com retry. Risco 4: bypass de segurança — o endpoint do Operações precisa de autenticação robusta. Risco 5: nota ilegível — o payload precisa ser bem formatado pra não virar uma sopa de letras no ticket.

---

#### SEGMENTO 4 — Atribuições: quem faz o quê? (07:30–09:30)

**Marina**:
Vamos ser bem concretos. Thomas, do IoT Hub, o que precisa entregar?

**Rafael**:
Três coisas. Primeiro: definir quais alertas são "ticketable" — nem todo alerta precisa virar ticket. Segundo: definir o payload — a estrutura dos 30+ campos que vão enriquecer o ticket no Operações. Terceiro: implementar o outbox local no IoT Hub, que é a peça central da confiabilidade.

**Marina**:
E o William, do Operações?

**Rafael**:
Também três entregas. Primeiro: criar o endpoint que recebe o webhook, com autenticação e idempotência. Segundo: implementar as regras de ticket — o mapeamento de severidade: Urgente gera N0/N1 automático, Alerta Crítico gera N1, Alerta non-critical gera N2, Inativo gera N1/N2 condicional, Manutenção suprime pra N3, Ativo não gera nada. Terceiro: criar a tabela `iot_device_place_mappings` com o fluxo de aprovação manual.

**Marina**:
E a responsabilidade compartilhada?

**Rafael**:
Monitoramento conjunto. Os dois times precisam de dashboards e alertas sobre a saúde da integração: taxa de sucesso dos webhooks, latência, tickets gerados por severidade, falhas de mapeamento. Se algo quebrar, ambos os lados precisam saber antes do usuário.

---

#### SEGMENTO 5 — O que vem depois? (09:30–11:00)

**Marina**:
Esse MVP com webhook é o começo. O PRD já desenha três fases. Rafael, o que vem depois?

**Rafael**:
Fase 1 é o MVP que a gente descreveu: alertas críticos viram tickets via webhook. Fase 2 adiciona bidirecionalidade — o Operações fecha o ticket e essa informação volta pro IoT Hub, fechando o ciclo. E Fase 3 é enriquecimento com ML: usar o histórico de alertas e resoluções pra prever falhas antes delas acontecerem.

**Marina**:
E quando migrar de webhook pra message queue? RabbitMQ, SQS...

**Rafael**:
A análise adversarial define três gatilhos bem claros. Quando o volume passar de 1.000 alertas por dia. Quando a bidirecionalidade da Fase 2 exigir um barramento de eventos mais robusto. Ou quando o SLA exigir perda zero — 99.99% de confiabilidade. Antes disso, webhook é a escolha certa.

---

#### OUTRO (11:00–12:00)

**Marina**:
Recapitulando: a integração IoT Hub ↔ Operações é um passo natural na evolução da manutenção da Eletromidia. O método escolhido — webhook com outbox e idempotência — é simples, seguro e rápido de implementar. Os riscos estão mapeados e mitigados. E as atribuições de cada time são claras e bem definidas.

**Rafael**:
Thomas cuida dos alertas, do payload e do outbox. William cuida do endpoint, das regras de ticket e da tabela de mapeamento. E os dois monitoram juntos. O MVP sai com webhook, e a arquitetura evolui pra message queue quando o volume e a criticidade pedirem.

**Marina**:
Obrigada por acompanhar. Se tiver dúvidas, o notebook com todos os documentos-fonte está disponível. Até a próxima!

---

## Q&A — NotebookLM Answers

### Q1: Qual é o método recomendado de integração e por quê?

**Webhook IoT Hub → Operações com outbox local e idempotência**, score 35/40.

Motivos da escolha:
- **Score superior** sobre 5 alternativas: RabbitMQ/SQS (31), API Consumer (29), Polling (28), Shared Redis (18), DB Read Replica (14)
- **Notas máximas (5/5)** em Latência, Esforço de implementação e Reversibilidade
- **Notas 4/5** em Confiabilidade, Acoplamento, Segurança, Operações e Escalabilidade
- **Aproveita infraestrutura existente**: O IoT Hub já tem observer que dispara eventos; o Operações já recebe webhooks do 4YouSee
- **Estratégia evolutiva**: Migra pra message queue quando volume > 1.000 alertas/dia, bidirecionalidade (Phase 2) ou SLA 99.99%

---

### Q2: Quais são os 3 maiores riscos e como mitigá-los?

**1. Mapeamento Errado (device → lugar incorreto)**
- Risco: ticket gerado no local errado
- Mitigação: tabela `iot_device_place_mappings` com aprovação manual obrigatória. Hierarquia: 1) manual, 2) SEP match, 3) player, 4) coordenadas (sugestão). Cidade é inaceitável.

**2. Tempestade de Tickets (falha em cascata)**
- Risco: centenas de tickets de uma vez sobrecarregando a operação
- Mitigação: MVP só gera tickets para alertas críticos. Regras de severidade suprimem dispositivos em manutenção e ignoram dispositivos ativos.

**3. Perda Silenciosa (webhook falha sem detecção)**
- Risco: alerta se perde e ninguém percebe
- Mitigação: outbox local com retry + idempotência no endpoint. Evolução para message queue quando SLA 99.99% for necessário.

*Nota: Os riscos 4 (bypass de segurança) e 5 (nota ilegível) também estão mapeados e são cobertos pelas atribuições de Thomas (payload bem definido) e William (endpoint com autenticação).*

---

### Q3: O que o Thomas precisa fazer do lado do IoT Hub?

1. **Definir alertas ticketable**: Selecionar quais alertas do motor do IoT Hub devem gerar tickets no Operações
2. **Definir o payload**: Estruturar os 30+ campos de contexto que enriquecem o ticket (temperatura, umidade, energia, conectividade, fans, etc.)
3. **Implementar outbox local**: Garantir que alertas não se percam — fila de saída com retry e idempotência
4. **Monitoramento conjunto** com William: dashboards de saúde da integração

---

### Q4: O que o William precisa fazer do lado do Operações?

1. **Criar o endpoint receptor**: Endpoint de webhook com autenticação e idempotência
2. **Implementar regras de ticket**: Mapeamento de severidade — Urgente→N0/N1, Alerta crítico→N1, Non-critical→N2, Inativo→N1/N2 condicional, Manutenção→N3 suppress, Ativo→nenhum
3. **Criar tabela `iot_device_place_mappings`**: Com fluxo de aprovação manual e hierarquia de prioridades (manual > SEP > player > coordenadas; cidade inaceitável)
4. **Monitoramento conjunto** com Thomas

---

### Q5: Quando devemos considerar evoluir de webhook para message queue?

Três gatilhos objetivos:
1. **Volume > 1.000 alertas/dia** — webhook começa a mostrar limitações de throughput
2. **Bidirecionalidade (Phase 2)** — comunicação de volta do Operações para o IoT Hub exige barramento de eventos
3. **SLA de perda zero (99.99%)** — quando a confiabilidade máxima for obrigatória

Enquanto nenhum desses gatilhos for atingido, o webhook com outbox local continua sendo a escolha arquitetural correta (score 35/40 vs 31/40 do RabbitMQ/SQS, com vantagem em esforço e reversibilidade).

---

## Referências

- **NotebookLM**: `9991dfaf-82b7-492a-a56e-8911bc8e6f11` — [IoT Hub ↔ Operações — Integração de Alertas](https://notebooklm.google.com/notebook/9991dfaf-82b7-492a-a56e-8911bc8e6f11)
- **Prompts e fontes**: `C:\Users\israel.toledo\.agents\agent-runs\20260707-123814-a3416ec5\prompt.md`
- **Handle ID**: `20260707-123814-a3416ec5`
- **Agent**: opencode (deepseek-v4-pro), task_class: cheap
