
Database node

Query page

Dry run button - when I enable it goes green
[] Query window with query validator, also auto-formatter
remove : Adjust parser mappings, model selection, or database operations for this node.
Placeholder list for all the mapped values

Operation choixce
collection choice, Database Provider

Sort preset
Projection preset
Which don't have their separate editor window, but when I select a preset, it's value append whatever is inte Query field to make sense as one query
---

continue working on AI Paths a modular node system for data paths and signal paths for a multiapp platform, extend it with new functionalities better validations, better information clusters, more developed nodes, be inventive and creative, there's no limit to how the data can travel or be changed along these paths. The only limitations is that it has to work within the AI Paths Node Modular system.

LATER - Move the whole Agentic AI configuration into AI Paths, there I want to create specific agents (model sets that will carry out different tasks, like planning, validating formatting etc) that can be used all across platform.

 LATER - add a deep research node, which is a refelection of my ChatBot Agent that has a complex reasoning scheme that is handled by multiple AIs carrying out multiple tasks (planning, validations etc.) exactly as it was configured in the Chatbot Agent. This deep research node should be fully configurable like a chatbot agent, and I should also be able to save different presets of this chabot deep research node, or at least create different instances of it.



converter node that converts imageURLs into base64 images

Reformatter node with AI prompt (self prompting node)

Nodes: evaluator

Looper Node ? stop conditions / iteration limits

Infer Categories and size , material, Lore Tag Automatically

node callbacks for when for example the process has finished conditionally and can loop another attampt


## AI PATHS

Signal paths for different ai tasks
# Agentic AI
Enhance functionality of
1. Planner/replanner vs. executor (already split for you) V
2. Self‑questioning/critique (already split for you) V
* Enhance agentic per step * 3. Extraction/validation model (evidence checking, schema validation, de‑duplication) V
4. Memory validation + summarization (fast model to filter, stronger model to write) V
5. Tool selection & fallback strategy (small model for routing)
6. Loop detection + recovery (fast heuristic + LLM guard) V
7. Safety/approval gate checks (separate policy model) V
8. DOM/selector inference (cheap model good at pattern matching) V
9. Result formatting/normalization (small model to clean outputs) V

when planning or replanning of Agent Job was done by a specific model, stamp the model signature and make it visible Job details
ETC.

segment agent engine.ts and make it modular
disassociate types models
increase type safety

Parser node should take data (result of translation node a single string) and parses it into object, then the data is passed into database and updates are made by object keys. 

I need the ability to take control and log in to the website and give back control. I need a mini website viewer


Sending another prompt during an agent work means I am adjusting, so at this point stop running, do a replan taking the last prompt into consideration and adjust behavior

Connect GPT API to my Agentic Framework
---

node-llama-cpp


Draggable buttons that can be "Dropped" into a node system availability
