# Operações reuse-first freshness sweep

Date: 2026-06-10

## Updated decision

Asset Documentation and the phased-installation pilot should first reuse existing Operações infrastructure:

- Project Tickets;
- checklist rules and fields;
- answers and photos;
- geolocation;
- live authorization;
- previous-ticket retrieval;
- existing PDF conventions.

The physical installation phases are:

1. Fundação
2. Implantação
3. Acabamento
4. Entrega

N1, N2, and N3 remain attendance and escalation levels. They do not replace the physical phases.

## Repository evidence

- `resources/js/store/modules/project-route/ChecklistRules.js` selects required checklists by activity and blocks ticket completion when applicable checklists are incomplete.
- `resources/js/components/my-project-route/checklists/Items.vue` renders conditional text, select, textarea, and image fields with required validation and geolocation.
- `app/Repositories/Projects/ProjectRoutesRepository.php::getChecklistItems` reads `ProjectAnswer` rows and photos from `last_ticket_id`.
- `ProjectWorkInstallation` has `parent_id`; `ProjectTicket` belongs to an installation. The exact continuation chain must be confirmed by a spike.
- `ProjectRouteController::getChecklistItems` enforces `myRoute` authorization.

## Strategic company context

The Obsidian Ops Optimization project records a company-wide Lean Six Sigma program to standardize operational processes across Brazilian branches.

- Operações is the centralized hub and standardization vehicle.
- Eletromidia Operations has more than 620 people.
- There are 11 operational centers across Brazil.

National standardization is therefore strategically plausible, but this does not prove that every local workflow needs a new module.

## Scenario: São Paulo only

- Add four explicit SP checklists.
- Reuse previous-ticket answers and evidence.
- Show only pending or reopened phases.
- Generate a specific PDF.
- Avoid a builder, workflow engine, Curve tables, Template tables, or a new module.

## Scenario: Brazil-wide standardization

- Execute the same reuse-first pilot.
- Compare SP, RJ, and at least one additional concession.
- Normalize only observed variation.
- Consider versioned configuration only when multiple real concessions require different phases, fields, evidence, approvals, or reports.

## Hypothesis to challenge

Standardize the operational contract now:

- canonical Place;
- authenticated Ticket execution;
- checklist identity;
- evidence and history;
- authorization;
- output/PDF contract.

Delay configurable architecture until at least two real concessions expose divergent requirements.

A new module is justified only if the current model cannot safely preserve:

- phase and evidence identity;
- independent revision and approval;
- portfolio planning;
- national reporting;
- required versioning;
- unambiguous continuation history.

## Question for NotebookLM

Considering the Eletromidia and Operações sources in this notebook, what is the strongest architecture and product recommendation? Challenge the reuse-first hypothesis, identify where it could fail, and state which decisions should be made now versus after the pilot.
