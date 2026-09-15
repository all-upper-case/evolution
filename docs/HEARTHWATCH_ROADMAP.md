# Hearthwatch tentative roadmap

This is the working product strategy for Hearthwatch. It is intentionally tentative: evidence from long seeded runs, usability testing, and unexpectedly productive interactions should change the order when warranted.

## Product promise

Hearthwatch is an observation-first living-world simulation. Its pleasure should come from recognizing individuals, understanding why they act, and watching practical constraints, relationships, places, accidents, and history combine into stories nobody authored in advance. The viewer controls time and attention, not inhabitants.

## Design pillars

1. **Consequences before decoration.** Every visible job, possession, place, condition, and event should affect simulated life.
2. **Functional realism.** Model conservation, travel, labor, scarcity, recovery, memory, and tradeoffs accurately enough to create credible causes. Avoid microscopic detail that produces computation rather than stories.
3. **Persistent people.** Names, dispositions, competencies, relationships, memories, homes, injuries, and accomplishments should accumulate into biographies.
4. **Legible autonomy.** The inspector should explain the need, intention, destination, and relevant circumstances behind an action without exposing implementation trivia.
5. **Layered observation.** A glance should reveal settlement health; following a person should reveal a coherent life; deeper views should support forensic history without overwhelming the main screen.
6. **Deterministic, bounded, local-first simulation.** Seeds remain reproducible, state remains testable, browser workloads remain safe, and the core requires no account, backend, or paid service.

## Near future

### 1. Material survival loop — current increment

- Gather finite wild food into personal carrying capacity.
- Haul it to a communal raw-food stockpile.
- Let cooks convert raw ingredients into more nourishing prepared meals.
- Make hungry inhabitants return to camp and consume actual stored provisions.
- Give every founding role a causal competency rather than a decorative title.
- Show carried goods, stores, meals, intentions, and material events.

Success means the food totals reconcile, work can be interrupted by needs, no role is merely cosmetic, the settlement remains viable across representative seeds, and save/restore continuation remains exact.

### 2. Days, routines, and meaningful places

- Introduce a readable day/night rhythm and day summaries.
- Add shelter, beds, a hearth/kitchen, gathering space, and work sites.
- Make rest quality, meal timing, travel, and social opportunities depend on place and time.
- Give inhabitants remembered or preferred places.

This creates recognizable days instead of an undifferentiated stream of ticks.

### 3. Relationships and memory

- Record bounded memories of help, conversation, conflict, shared work, illness, and loss.
- Derive affinity and trust from interactions plus compatible or conflicting dispositions.
- Let relationships influence companionship, assistance, grief, collaboration, and avoidance.
- Add relationship views and individual timelines.

Memories must be caused by simulated events; prose should summarize state rather than fabricate it.

### 4. Autonomous priorities and settlement judgment

- Represent shared pressures such as food security, shelter, warmth, health, and maintenance.
- Let inhabitants select useful work from circumstances, competencies, obligations, and personal needs.
- Explain why one task outranked another.
- Preserve observation-only play: settlement priorities emerge from inhabitants and conditions, not player work orders.

### 5. Construction and material chains

- Add wood, stone, tools, hauling, storage constraints, wear, and repair.
- Let inhabitants identify needs, choose sites, and gradually construct shelters and workshops.
- Make partially completed and failed projects visible.
- Keep production chains short until each link creates a distinct decision or story.

### 6. Observation and storytelling tools

- Add follow mode, map focus, activity/role filters, alerts, and a clear legend.
- Add biographies, possessions, relationships, memories, and event timelines.
- Provide settlement summaries across days and seasons.
- Improve keyboard, screen-reader, narrow-screen, and reduced-motion behavior alongside each view.

Presentation should expose meaningful state already present in the model, not mask shallow behavior with generated flavor text.

## Medium horizon

- **Health and care:** injuries, illness, diagnosis, treatment, recovery, disability, and attributable death causes.
- **Weather, seasons, and ecology:** temperature, precipitation, plant cycles, terrain costs, water, shelter, and preparations for scarcity.
- **Wildlife and danger:** prey, predators, territorial behavior, defense, refuge, and risky travel.
- **Visitors and exchange:** migration, hospitality, trade, news, negotiation, and conflict between communities.
- **Families and generations:** partnership, caregiving, children, aging, inheritance, migration, and meaningful use of the original evolution model.
- **Culture and history:** customs emerging from repeated practices, named places, anniversaries, shared knowledge, leadership, and a durable settlement archive.

Predation, disease, childhood, and violence arrive only after food, work, place, and relationships can make their consequences legible.

## Realism and engagement strategy

- Track important matter and energy through explicit flows; do not create success by silently spawning supplies.
- Model different timescales: momentary actions, daily routines, seasonal pressure, and generational history.
- Generate variety through interacting needs, competence, scarcity, memory, geography, and imperfect information—not arbitrary event rolls alone.
- Give strengths costs or opportunity tradeoffs so there is no universally optimal person or settlement.
- Prefer a few deep systems with cross-effects over many isolated meters.
- Surface uncertainty honestly. Hearthwatch should feel plausible, not claim to predict real societies, ecology, or medicine.

## Quality gates for every increment

- Same seed and settings produce the same result and restored snapshots continue exactly.
- Resources, needs, histories, populations, path searches, and workloads remain bounded.
- Important state changes have attributable causes and do not allow duplication or double action.
- Multi-seed long runs show both viability and meaningful variation; a single entertaining seed is insufficient.
- The viewer can answer “what are they doing, why, and what changed?” without developer tools.
- New detail remains operable with keyboard, screen readers, and narrow screens.
- Rendering and prose remain downstream of simulation state.

## Guardrails

- Do not reproduce Dwarf Fortress feature-for-feature or terminology-for-terminology.
- Do not turn observation into disguised colony management.
- Do not require cloud persistence, runtime AI, accounts, or telemetry for the core experience.
- Do not add photorealism, unbounded populations, or sprawling production graphs before they serve individual stories.
- Keep the original Evolution laboratory available until Hearthwatch has equivalent reliability and a deliberate migration plan.

## Review cadence

Revisit this roadmap after each two or three material systems, at milestone boundaries, or whenever experiments show that the current order produces shallow, opaque, unstable, or repetitive life. Scientific integrity, user comprehension, and emergent-story quality may outrank the next checkbox.
