# IoT Hub v2 ↔ Operações — Documento Fonte para NotebookLM

## 1. CONTEXTO DO PROJETO

A Eletromidia opera centenas de painéis digitais (abrigos de ônibus, painéis de rua) em todo o Brasil. Dois sistemas críticos rodam em paralelo sem integração:

- **IoT Hub v2** (Laravel 12, PHP 8.4, Google Cloud Run): Plataforma de telemetria em tempo real que monitora NUCs, RMCs, modems, réguas inteligentes, LEDs, disjuntores, gateways LoRa e estações meteorológicas. Cada dispositivo reporta a cada ~30 minutos.
- **Operacoes** (Laravel 8, PHP 7.4, on-premise :8089): Sistema de gestão de chamados de manutenção com ciclo completo de tickets, rotas, SLA e notificações Slack.

Hoje, apenas o **4YouSee** integra com Operacoes via webhook, criando tickets corretivos quando um player fica offline. Mas o 4YouSee envia apenas 3 campos: `place_sync_id`, `sync_id` e `status="offline"`.

## 2. O PROBLEMA OPERACIONAL

O monitoramento atual é **reativo**: o ticket só é criado quando o player já está offline. O técnico chega ao local sem saber se o problema é:
- Térmico (superaquecimento do RMC ou NUC)
- Elétrico (tensão instável, corrente anômala, disjuntor acionado)
- Conectividade (modem sem sinal, RSSI baixo)
- Hardware (fan falhando, LED com falha de pixel)
- Ambiental (porta aberta, sensor de inundação, umidade alta)
- Software (player travado, disco cheio, memória alta)

O IoT Hub tem TODA essa telemetria, mas ela não chega ao sistema de tickets. Alguém precisa olhar um dashboard separado e abrir ticket manualmente.

## 3. ARQUITETURA DO IOT HUB V2 — DETALHES TÉCNICOS

### Motor de Alertas

O alert engine é construído sobre 5 tabelas:

| Tabela | Função |
|--------|--------|
| `dispositivos_alertas_tipos` | Catálogo de tipos alertáveis (nome, descricao, model class) |
| `dispositivos_alertas_parametros` | Regras: coluna, operador (>, <, =), valor limite, mensagem, situação alvo, flag ativo |
| `dispositivos_alertas_localidades` | Pivot N:M que scopeia regra a localidades específicas |
| `dispositivos_alertas` | Alertas ativos (resolvido = 0) |
| `dispositivos_alertas_historicos` | Alertas resolvidos (movidos para manter tabela ativa pequena) |

O job `ProcessaDadosDispositivoAlertaJob` é o avaliador central:
1. Carrega todas as regras ativas com relacionamentos (tipo, localidades, situação)
2. Para cada regra, instancia dinamicamente o model class (`App\Models\{$parametro->tipo->model}`)
3. Verifica se o model tem constante `PARAMETROS_ALERTAS` definida
4. Para cada dispositivo do tipo relevante, compara `data_get($dispositivo, $coluna)` contra `{$sinal} {$valor}`
5. Se verdadeiro: upsert em `dispositivos_alertas` + atualiza `dispositivo_situacao_id`
6. Se falso: resolve alerta ativo (move para histórico com `resolved_at`)

### Situações de Dispositivo (com cores no dashboard)

| Situação | Cor | Significado |
|----------|-----|-------------|
| Ativo | Verde | Operando normalmente |
| Inativo | Cinza | Desligado/descomissionado |
| Manutenção | Azul | Em manutenção programada |
| Alerta | Amarelo | Threshold crítico atingido |
| Urgente | Vermelho | Falha severa/crítica |

### Subsistemas Monitorados (10+)

Cada `Dispositivo` é uma instalação física composta por:

1. **NUC** — Mini PC media player. Campos: cpu_temperatura, cpu_uso, memoria_uso, disco_uso, player_status, OS version
2. **RMC** — Remote Monitoring Controller. 100+ campos: temperatura interna, umidade, 24 slots de fan, tensão, corrente, potência, frequência, sensor de porta, sensor de inundação, backlight, HDMI, acelerômetro, firmware
3. **Modem** — Conectividade 3G/4G. Campos: IMEI, RSSI, RSRP, WiFi status, bandwidth download/upload, ping
4. **Régua** — Smart power strip com 4 canais de relé (K1-K4) para controle remoto de energia
5. **Disjuntor** — Disjuntor com sensor monitoring
6. **LED** — Painel com sending/receiving cards
7. **Estação Meteorológica** — Temperatura, umidade, vento, sensores de chuva
8. **Gateway** — LoRa gateway para comunicação long-range com sensores
9. **Simcard** — SIM celular com carrier e tracking de data usage
10. **ThingsBoard** — Mirror de telemetria adicional

### Buffer e Queue

- Telemetria chega via HTTP POST a cada ~30 min (~10K requests por burst)
- Buffer: Redis (primário) ou MySQL (fallback)
- Horizon workers processam 100 records a cada 30 segundos
- `ProcessaDadosBatchJob` processa batches
- Upsert em MySQL com historização completa

### API Surface

Endpoints device-facing em `/api/v1/*` — **SEM autenticação** (segurança por isolamento de rede):
- `POST /api/v1/dispositivos/storeOrUpdate` — Registro/update de dispositivo
- `POST /api/v1/nucs/storeOrUpdate` — Telemetria NUC
- `POST /api/v1/rmcs/storeOrUpdate` — Telemetria RMC
- `POST /api/v1/modems/storeOrUpdate` — Telemetria modem
- `POST /api/v1/reguas/pub` — Comandos régua
- `POST /api/v1/leds/storeOrUpdate` — Telemetria LED
- `GET /api/v1/buffer/dispatch` — Dispara buffer processing
- `GET /api/v1/thingsboard/telemetria` — ThingsBoard integration

Web routes usam Laravel Breeze (session-based auth).

### External Integrations

| Integração | Propósito |
|------------|-----------|
| Kore TM | LoRa device management (orgs, apps, devices, telemetry) |
| Kore Saitro | SIM card management e data usage tracking |
| ThingsBoard | Plataforma adicional de telemetria IoT |
| Google Maps | Mapeamento de dispositivos |

### Deployment

- **Produção**: Google Cloud Run (web app 1Gi + worker 512Mi, 1-10 instances)
- **Staging**: Mesma infra, Terraform workspace separado
- **Local**: Docker Compose (PHP 8.4 Apache + MySQL 8 + Redis 7 + Horizon)
- **CI/CD**: GitHub Actions (deploy on push to main/homolog)
- **Porta local**: 8001

### Identificador de Dispositivo

- Campo `sep` na tabela `dispositivos` (string, nullable)
- Localização por `localidade` (granularidade city-level: cidade, UF)

## 4. ARQUITETURA DO OPERACOES — DETALHES TÉCNICOS

### Pipeline de Criação de Tickets (Padrão 4YouSee)

Fluxo completo do webhook à criação do ticket:

```
POST /4yousee/ticket (auth:api Passport)
    ↓
TicketController::createTicket4YouSee(FourYouSeeTicketCreateRequest)
    ↓
TicketsRepository::createTicket4YouSee($request)
    ↓ getOrCreatePlaceForArray() — resolve place_id from sync_id
    ↓ CreateTicket4YouSeeJob::dispatch($data) — queue: tickets_default
    ↓
TicketCreateRepository::saveLevelZero4YouSee($ticketRequest)
    ↓ TicketHelper fluent builder chain:
      → setLevelByOrigin()
      → setOrigin()
      → setChannel()
      → setCreatedByEmail()
      → setType(CORRETIVA_ID)
      → setActivityTypeByOrigin()
      → setPlace()
      → validateIfTicketExists() — deduplicação
      → setPayloadChamado()
      → createLegacyTicket() — legacy Chamado table
      → setPayloadTicketMaster()
      → createTicketMaster()
      → setPayloadPlayer()
      → setPayloadTicket()
      → saveTicket()
      → processPlayerStatusUpdate()
```

### Validação do Payload 4YouSee

```php
// FourYouSee\TicketCreateRequest
return [
    'place_sync_id' => 'required|integer',
    'sync_id'       => 'required|string',
    'status'        => ['required', 'string', Rule::in(['offline'])],
];
```

### Job 4YouSee

```php
class CreateTicket4YouSeeJob {
    public int $tries = 3;
    public int $timeout = 120;
    public array $backoff = [60, 120, 300];

    public function handle() {
        $completeTicketData = [
            'player'     => $playerRequest,
            'place_id'   => $this->data['place_id'],
            'type_id'    => TicketType::CORRETIVA_ID,
            'user_email' => '4yousee@eletromidia.com.br',
            'origin_id'  => Origin::ELESTATUS_ID,
            'channel_id' => Channel::FOURYOUSEE_ID,
        ];
        // ... TicketCreateRepository::saveLevelZero4YouSee()
    }
}
```

### Auth

- Laravel Passport Bearer tokens (`auth:api` middleware)
- `api` middleware group: throttle (1000,1) + bindings + CORS
- Tokens expiram em 1 ano (`Passport::tokensExpireIn(now()->addYear(1))`)

### Place / Machine / Player Mapping

- `Place.sync_id` → legacy `Building.cod` (cod_predio)
- `Place` tem: sync_id, name, address, neighborhood, city, uf, square, latitude, longitude, environment_id, establishment_id (383=SP, 384=RJ), work_zone_id
- `Player`: sync_id, place_id, name, alias, local, active, status (online/offline)
- `Machine` referencia legacy via sync_id/cod

### Notifications

- `SlackNotificationService::getWebhookUrl()` lê `slack_notification_channels` por identifier + environment
- `Ticket::routeNotificationForSlack()` roteia para o service
- Notificações: TicketCreateMunicipalNotification, N1TicketNotification, TicketN3Notification, ProcessingErrorNotification
- **4YouSee NÃO notifica Slack em sucesso** — apenas em falha do job

### Deduplicação

`TicketHelper::validateIfTicketExists(false, false, false)`:
- Verifica tickets abertos/não cancelados para o mesmo place
- Exclui tickets N2/N3
- Usa lógica de exclusividade por activity-type
- Lança `TicketAlreadyExistsException` se duplicado (caught no job)

## 5. ANÁLISE ADVERSARIAL — SEIS MÉTODOS DE INTERCOMUNICAÇÃO

### Scoring Matrix (1-5, 5=melhor)

| Método | Confiab. | Latência | Acopla. | Segur. | Esforço | Ops | Escalab. | Reversib. | Total |
|--------|----------|----------|---------|--------|---------|-----|----------|-----------|-------|
| **Webhook IoT→Operacoes** | 4 | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **35** |
| RabbitMQ/SQS Queue | 5 | 4 | 4 | 5 | 2 | 3 | 5 | 3 | 31 |
| API Consumer (integrador) | 3 | 5 | 3 | 4 | 4 | 3 | 3 | 4 | 29 |
| Polling API | 3 | 2 | 4 | 4 | 4 | 4 | 2 | 5 | 28 |
| Shared Redis Pub/Sub | 1 | 5 | 1 | 2 | 3 | 2 | 2 | 2 | 18 |
| Database Read Replica | 2 | 2 | 1 | 1 | 2 | 2 | 3 | 1 | 14 |

### Fraquezas Principais

| Método | Fraqueza principal |
|--------|-------------------|
| Webhook | Sem outbox + idempotência, falhas viram perda silenciosa ou tickets duplicados |
| RabbitMQ/SQS | Melhor transporte tecnicamente, mas setup/ops pesado para MVP |
| API Consumer | IoT Hub sabe demais sobre internals do Operacoes e ciclo do PHP package |
| Shared Redis | Pub/Sub NÃO é durável — consumer outage = alertas perdidos. Audit trail pobre |
| DB Read Replica | Viola service boundaries. Acopla Operacoes ao schema do IoT |
| Polling | Simples e reversível, mas latência e burst handling fracos |

## 6. RECOMENDAÇÃO: WEBHOOK COM OUTBOX E IDEMPOTÊNCIA

### Arquitetura Recomendada

```
IoT Alert Created
→ IoT integration outbox row (delivery status, retries, last error)
→ HTTP POST /api/iot/alerts (to Operacoes)
→ Operacoes Passport auth (dedicated client, scope: iot-alerts:create)
→ IoTAlertWebhookController (validates payload + idempotency key)
→ CreateTicketFromIotAlertJob (queue: tickets_default)
→ TicketCreateRepository (saveLevelZeroIotHub)
→ Ticket note with concise telemetry summary
→ Full payload stored in integration/audit table
→ Slack notification if configured
```

### Por que Webhook venceu

1. **Latência e Esforço: nota máxima (5/5)** — IoT Hub já tem observer que dispara eventos
2. **Reversibilidade: nota máxima (5/5)** — fácil de reverter se der errado
3. **Segue padrão existente** — 4YouSee já usa webhook com sucesso
4. **Outbox resolve confiabilidade** — alerta não se perde se Operacoes estiver fora
5. **Estratégia evolutiva** — migra para RabbitMQ/SQS quando volume exigir, sem mudar contrato

### Quando evoluir para Message Queue

Três gatilhos objetivos:
1. Volume > 1.000 alertas/dia
2. Bidirecionalidade (Phase 2) exigir barramento de eventos
3. SLA de perda zero (99.99%)

## 7. MAPEAMENTO DE DISPOSITIVOS: IoT Hub ↔ Operacoes

### O Desafio

| Sistema | Identificador | Granularidade |
|---------|--------------|---------------|
| IoT Hub | `dispositivo.sep` (string, nullable) | `localidade` (city-level: cidade, UF) |
| Operacoes | `place.sync_id` (int, legacy Building.cod) | Address-level: lat/lon, square, establishment_id (383=SP, 384=RJ) |

### Estratégia Recomendada: Tabela de Mapeamento com Aprovação Manual

Criar `iot_device_place_mappings` em Operacoes:

| Coluna | Propósito |
|--------|-----------|
| id | Identidade |
| dispositivo_id | IoT Hub device id |
| dispositivo_sep | IoT SEP identifier |
| place_id | Operacoes place |
| place_sync_id | Legacy Building.cod reference |
| establishment_id | SP/RJ partition guard |
| confidence | manual, sep_match, coordinate_candidate |
| active | Habilitar/desabilitar |
| validated_by | Responsável pela aprovação |
| validated_at | Audit trail |
| notes | Observações de mapeamento |

### Hierarquia de Matching

| Prioridade | Método | Uso |
|-----------|--------|-----|
| 1 | Mapeamento manual aprovado | Verdade de produção |
| 2 | SEP ↔ place.sync_id | Só se dados provarem que SEP = legacy cod |
| 3 | Player.sync_id (se houver conexão) | Útil se player conecta os dois sistemas |
| 4 | Coordenadas + address | Apenas sugestão, nunca auto-criar ticket |
| 5 | Cidade/localidade fuzzy match | **Inaceitável** para automação |

### Comportamento para Alertas Não Mapeados

- NÃO criar ticket
- Armazenar como `mapping_pending`
- Notificar responsáveis pela integração com device id, SEP, localidade, tipo de alerta e amostra de telemetria
- Fila de revisão administrativa

## 8. MAPEAMENTO DE SEVERIDADE: IoT → Prioridade de Ticket

| Situação IoT | Prioridade Operacoes | Nível | Ação |
|-------------|---------------------|-------|------|
| Urgente | Máxima corretiva | N0/N1 | Auto-criar CORRETIVA |
| Alerta (parâmetro crítico) | Alta | N1 | Auto-criar apenas para regras críticas aprovadas |
| Alerta (non-critical) | Média | N2 | Phase 2 ou revisão manual |
| Inativo | Depende do papel do device | N1/N2 | Auto-criar apenas se device deveria estar online |
| Manutenção | Sem ticket corretivo | N3/info | Suprimir |
| Ativo | Nenhuma | — | Sem ticket; pode resolver/anotar depois |

### Regra MVP

Criar tickets APENAS para:
- Situação `Urgente`
- Situação `Alerta` onde `parametro.tipo` ou rule config está marcado `ticketable = true`
- Dispositivos com mapeamento validado
- Sem ticket equivalente aberto

## 9. TOP 5 RISCOS

| Rank | Risco | Impacto | Mitigação |
|-----|-------|---------|-----------|
| 1 | Mapeamento device→place errado cria ticket no local errado | Muito alto | Tabela de mapeamento com aprovação manual; sem auto-fuzzy |
| 2 | Tempestade de tickets duplicados durante alert flapping | Muito alto | Idempotency key, open-ticket guard, debounce window |
| 3 | Perda silenciosa de mensagens entre IoT e Operacoes | Alto | IoT outbox, retry state, replay command, delivery dashboard |
| 4 | Bypass de segurança via endpoints IoT sem auth | Alto | Apenas alertas server-side emitem eventos; Passport + HMAC |
| 5 | Ticket note vira dump de telemetria ilegível | Médio | Summary em note; payload completo em integration audit table |

## 10. FASES DE IMPLEMENTAÇÃO

### Phase 0 — Contract Alignment (1 semana)

**Thomas / IoT Hub:**
- Definir alert event payload v1 (estrutura dos 30+ campos)
- Confirmar stable alert id e device identifiers
- Marcar quais alert rules são ticketable

**William / Operacoes:**
- Definir required ticket fields
- Confirmar priority mapping
- Confirmar duplicate ticket semantics
- Definir mapping table ownership

### Phase 1 — MVP Unidirectional (2-3 semanas)

**Thomas / IoT Hub:**
- Adicionar integration outbox para alertas críticos ticketable
- Enviar webhook para Operacoes
- Retry de deliveries falhadas com backoff
- Expor replay/admin command

**William / Operacoes:**
- Adicionar authenticated webhook endpoint
- Validar payload e idempotency key
- Resolver dispositivo_id/sep → place_id
- Despachar ticket creation job
- Criar ticket note com resumo conciso de telemetria
- Armazenar payload completo em integration/audit table

### Phase 2 — Operational Hardening (2 semanas)

**Thomas:**
- Métricas: sent, failed, retried, acknowledged
- Alert suppression/debounce para flapping

**William:**
- Mapping pending queue
- Slack notification para critical alerts unmapped
- Dashboard/report de integration health

### Phase 3 — Bidirectional Lifecycle (2-3 semanas)

**Thomas:**
- Aceitar ticket lifecycle callback do Operacoes
- Decidir se resolution do Operacoes resolve alerta IoT ou apenas anota

**William:**
- Emitir ticket resolved/reopened event
- Link ticket id back to IoT alert id

### Phase 4 — Transport Upgrade (se necessário)

**Ambos:**
- Mover de HTTP webhook para RabbitMQ/SQS se volume/delivery exigir
- Preservar mesmo event payload e idempotency

## 11. TABELA DE ATRIBUIÇÕES

| Área | Owner | Notas |
|------|-------|-------|
| IoT alert rule eligibility | Thomas / IoT Hub | Define quais alertas viram ticket |
| Event payload contract | Thomas + William | Acordo conjunto; versionado |
| Webhook sender/outbox | Thomas / IoT Hub | Delivery, retry, replay |
| Auth client/token | William / Operacoes | Passport client, scopes, rotation |
| Webhook endpoint | William / Operacoes | Validation e job dispatch |
| Ticket creation rules | William / Operacoes | Priority, type, channel, origin, user email |
| Device-place mapping table | William owns, Thomas supports | Operacoes deve ter pois ticket correctness depende do place |
| Mapping data validation | William + operations team | Manual approval required for production |
| Telemetry summary format | Thomas + William | IoT sabe o significado; Operacoes sabe a usabilidade do ticket |
| Integration monitoring | Ambos | IoT tracks delivery; Operacoes tracks processing |
| Bidirectional resolution | Phase 3 joint ownership | Não deve estar no MVP |

## 12. NOVOS REGISTROS NECESSÁRIOS NO OPERACOES

| Tabela | Registro | Descrição |
|--------|----------|-----------|
| `origins` | IOTHUB_ID | Nova origem "IoT Hub" para rastreabilidade |
| `channels` | IOTHUB_ID | Novo canal "IoT Hub" |
| `users` | iothub@eletromidia.com.br | Usuário virtual service account |
| `slack_notification_channels` | chamados-iot | Opcional, se alertas Slack forem necessários |
| `iot_device_place_mappings` | — | Nova tabela de mapeamento device↔place |

## 13. PAYLOAD DE EXEMPLO — WEBHOOK IoT → OPERACOES v1

```json
{
  "event_version": 1,
  "event_id": "iot-alert-uuid-here",
  "timestamp": "2026-07-07T14:30:00Z",
  "dispositivo_id": 123,
  "dispositivo_sep": "SEP-2024-001",
  "localidade": {
    "nome": "Terminal Corinthians",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "alerta": {
    "tipo": "Temperatura RMC",
    "parametro": "temperatura_interna",
    "valor_atual": 52.3,
    "valor_limite": 45.0,
    "severidade": "critico",
    "unidade": "°C",
    "ticketable": true
  },
  "telemetria_contexto": {
    "rmc": {
      "temperatura_interna": 52.3,
      "umidade": 78.2,
      "fans_ativos": 18,
      "fans_total": 24,
      "tensao": 127.5,
      "corrente": 2.1,
      "potencia_ativa": 267.75,
      "porta_aberta": false,
      "inundacao": false
    },
    "nuc": {
      "cpu_temperatura": 68.5,
      "cpu_uso": 72.3,
      "memoria_uso": 81.0,
      "disco_uso": 55.2,
      "player_status": "running"
    },
    "modem": {
      "rssi": -75,
      "rsrp": -105,
      "bandwidth_download": 12.5,
      "wifi_status": "connected"
    }
  }
}
```

Comparado ao payload 4YouSee (`place_sync_id`, `sync_id`, `status`), o payload IoT oferece contexto diagnóstico completo.

## 14. PESSOAS ENVOLVIDAS

| Pessoa | Cargo | Contexto |
|--------|-------|----------|
| **Thomas Melo** | Tech Lead IoT Hub | Apresentou o IoT Hub para Israel (24/04/2026). Referência técnica. |
| **William Pinheiro** | Backend Developer Operacoes | Desenvolvedor principal do Operacoes. API changes, ticket pipeline. |
| **Israel Toledo** | Project Owner / Tech Lead | Conectando IoT Hub ao ecossistema Eletromidia. |
| **Doglas Santana** | Tech Lead | Aprovação arquitetural. |

## 15. REFERÊNCIAS

- PRD original: `10-Projects/iothub-v2/Decisions/2026-04-23-PRD-Alerta-Ticket-Pipeline.md` (Obsidian vault)
- Ecosystem intersection: `10-Projects/iothub-v2/Architecture/Operacoes Ecosystem Intersection.md`
- IoT Hub project: `10-Projects/iothub-v2/Project.md`
- Código 4YouSee: `routes/4yousee.php`, `CreateTicket4YouSeeJob.php`, `TicketCreateRepository.php`, `TicketHelper.php`
- Repos: `eletromidia/iothub-v2` (Laravel 12), `eletromidia/operacoes` (Laravel 8)
