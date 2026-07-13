# Brief final para a reunião — Termo de Arrolamento RJ

**Participantes:** Israel, Prevedel e William  
**Meta:** sair com contrato mínimo implementável para homologação em 24/07/2026  
**Escopo:** MUPIs, Relógios e Abrigos. **Placas ficam fora.**

## Sua posição na conversa

Você não está levando uma solução fechada nem repassando recado. Você está fazendo a ponte entre a necessidade operacional do Prevedel e o contrato técnico que o William precisa para liberar implementação sem hipótese escondida.

Sua função é:

1. expor o que já está provado;
2. impedir que o prazo seja confundido com carga total;
3. obter três decisões;
4. fechar donos, evidências e próximo gate.

## Abertura de 90 segundos

> “Eu revisei a matriz inteira, a base JCDecaux e o encaixe no Operações. A boa notícia é que a fundação já existe: Place, Minha Rota, checklists configuráveis, fotos e PDF. Não precisamos criar outro Lens dentro do Operações.
>
> A fundação reutilizável existe, mas matching, correção auditável do Place e PDF/mapa ainda precisam de validação técnica. Para confirmar o corte de 24 de julho, precisamos fechar três decisões: o aceite de homologação, como uma correção de endereço ou GPS vira verdade no Place e quais regras fecham o checklist e as evidências.
>
> Também corrigi a planilha para expor os gaps. A matriz tinha 31 campos, o catálogo tinha 24, a capa falava em 27 e nem citava Abrigos. A cópia revisada reconcilia os 31 e marca em vermelho tudo que é proposta. Na JCDecaux há 1.546 Abrigos, mas sem identificador e sem coordenadas, então endereço não pode ser nossa única chave.
>
> Minha recomendação é homologar um Abrigo JCDecaux real ponta a ponta, com regras parametrizadas para MUPIs e Relógios. O PDF que Prevedel indicar como aprovado será o golden master. A carga em massa fica fora do aceite de 24/07.”

## O fato que muda o risco da JCDecaux

A planilha tem 2.108 linhas, mas somente 1.546 são Abrigos. Ela não tem nenhum valor em identificador do local, número Eletro, número da parada, latitude, longitude, bairro, CEP ou modelo de Abrigo. Há 1.952 endereços únicos, portanto 156 repetições além da primeira ocorrência.

**Tradução para a reunião:** ela pode iniciar o matching, mas não pode criar `Place` automaticamente usando apenas endereço.

## As três decisões da reunião

### 1. O que conta como entregue em 24/07?

Pergunte:

> “Para homologação, vocês querem validar a trilha ponta a ponta com ativos reais ou esperam a carga completa das três tipologias?”

Recomende:

- um Abrigo JCDecaux real ponta a ponta;
- regras parametrizadas para MUPIs e Relógios, sem exigir um exemplar de cada tipologia no aceite inicial;
- ampliar para um ativo real de cada tipologia somente se William confirmar viabilidade e Prevedel exigir isso como aceite;
- checklist, fotos, persistência, proposta de correção e PDF;
- read-back no banco/tela;
- carga em massa depois da regra de matching.

Não aceite “coloca tudo e depois vemos” como critério de homologação.

### 2. Como endereço e GPS viram fonte de verdade?

Pergunte:

> “Quando o técnico encontrar um endereço ou ponto diferente, ele altera o Place na hora ou envia uma proposta para aprovação?”

Recomende:

- guardar antes/depois, GPS, técnico e data;
- usar no Termo a informação confirmada em campo;
- aplicar ao `Place` após aprovação simples de backoffice;
- se o workflow não couber até 24/07, persistir a proposta no ticket e aprovar manualmente durante a homologação.

### 3. Qual é o contrato das perguntas e fotos?

Pergunte:

> “Podemos fechar que Sem ocorrência exclui as demais ocorrências da seção e que toda não conformidade exige foto? Dentro do limite de 14, quais imagens mínimas o Termo precisa?”

Também confirme:

- os sete campos adicionados ao catálogo;
- a divergência de amortecedor/difusor: Optional no catálogo e Obrigatório na matriz;
- qual atributo identifica Abrigo com face digital;
- se o mapa satélite é obrigatório nas três tipologias;
- qual PDF é o golden master aceito pela Prefeitura.

## Agenda de 15 minutos

| Minuto | Condução | Saída |
|---|---|---|
| 0–2 | Abertura e escopo | MUPIs, Relógios e Abrigos; placas fora |
| 2–5 | Mostrar os fatos da matriz e JCDecaux | Concordância sobre gaps reais |
| 5–8 | Decisão 1: aceite de 24/07 | Vertical slice ou cobertura completa |
| 8–11 | Decisão 2: fonte de verdade | Aprovação de correção e chave de matching |
| 11–13 | Decisão 3: checklist/evidências | Regras de exclusão, foto, digital e mapa |
| 13–15 | Ativo real, donos e datas | Gate seguinte objetivo |

## O menor fluxo ponta a ponta

1. `Place` RJ real identificado e classificado;
2. ticket de vistoria no `my-route`;
3. checklist definida pela tipologia;
4. respostas obrigatórias e fotos;
5. até 14 imagens;
6. endereço/GPS confirmados em campo como correção proposta;
7. conclusão e persistência;
8. PDF conforme o golden master a ser fornecido, com imagens dentro do limite aprovado e mapa se confirmado e tecnicamente validado;
9. read-back;
10. validação de Prevedel e William.

## Se William puxar para arquitetura

Diga:

> “Quero separar a decisão técnica da regra de negócio. A fundação de Place, my-route, checklist, fotos e PDF já existe. O que preciso de você hoje é validar o encaixe: uma atividade de vistoria com catálogo configurável, roteada por tipologia, e um gate simples para correção do Place.”

## Se Prevedel puxar para estética

Diga:

> “O PDF que você indicar como aprovado será o golden master. Até recebê-lo, layout e conteúdo final permanecem pendentes. Estética não entra como bloqueador para 24/07.”

## Se alguém recolocar placas no escopo

Diga:

> “Placas são uma família futura. Se entrarem agora, muda matriz, nomenclatura, carga e aceite. Para proteger 24/07, vamos fechar MUPIs, Relógios e Abrigos e abrir placas como fatia separada.”

## Perguntas e respostas rápidas

**“Por que não importar os 1.546 Abrigos?”**  
Porque eles não têm chave nem coordenada; endereço se repete. Sem matching, criamos duplicatas e corrompemos a fonte de verdade.

**“Podemos usar o endereço como ID?”**  
Não. Endereço pode ajudar no matching, mas não garante unicidade nem estabilidade.

**“Mapa satélite é muito caro?”**  
O risco imediato é configuração da API server-side e billing. William precisa validar a chave e o fallback antes de prometer.

**“Uma checklist ou três?”**  
Um catálogo de negócio com aplicabilidade por tipologia. A divisão técnica em aliases/configs pode ser decidida pelo William sem duplicar a regra funcional.

**“A correção pode atualizar Place direto?”**  
Pode tecnicamente, mas é arriscado operacionalmente. Recomendação: proposta auditável e aprovação simples.

## Fechamento palavra por palavra

> “Só para eu registrar: em 24/07 vamos aceitar __; a correção de endereço/GPS passa por __; a chave de matching dos Abrigos será __; a matriz oficial é a versão revisada depois de validar __; o golden master do Termo é __; e o primeiro ativo do teste é __. William fica com __, Prevedel com __ e eu consolido isso no plano e acompanho os gates.”

## Checklist antes de entrar

- [ ] Abrir o artefato e a aba “Gaps e Decisões” da matriz revisada.
- [ ] Deixar visíveis os números 31, 24, 1.546 e 156.
- [ ] Pedir o PDF golden master e um Abrigo JCDecaux real.
- [ ] Não deixar placas, estética ou dashboard consumirem os 15 minutos.
- [ ] Encerrar com donos e datas preenchidos, não com “vamos vendo”.
