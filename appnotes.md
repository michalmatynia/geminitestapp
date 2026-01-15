Application notes

npx tsc
npx eslint
add proper debugging on visual studio code

# Database work
Set the cloud database mongoDB backup to local mongoDB setUP
Add Prisma and MongoDB Tabs for Database Management
Add MongoDB connections to Chatbot and agentic flow
Add MongoDB connections to CMS
Add MongoDB connections to Application Settings in General

# Product
# UI
Add shadcn

# Integrations
Integration with Base

# Set Global Settings
* Move Product Database Choice there
* Choose Global Database as well as individual database for different aspects of the page.

# Page refactor
Get rid of bloated code files by segmenting then
Make them more modular
Make the whole Application more Type safe
Move Types into Types Folder

# Increase Debugging
For each section add tests
Add Error Boundaries - should I add them ? or only during debugging
Increase Type Safety
Try Catch Blocks

# Note Taking App
Move image/catalog operations behind a data-access abstraction so Mongo can fully own product data.

base.com with email: you@example.com password: YourPassword
remove  Agent job panel from the chatbox window, it duplicates what is already shown

# Develop components
Enhance Components
Make components more robust and modular
Segment them into proper sections


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

I need the ability to take control and log in to the website and give back control. I need a mini website viewer


Sending another prompt during an agent work means I am adjusting, so at this point stop running, do a replan taking the last prompt into consideration and adjust behavior

Connect GPT API to my Agentic Framework
---

Refactor

Product LIST
When I create the product, a notification should pop-up that the product has been created

Catalogs 
-default catalog, the first created catalog is always default one
--In Edit Catalog
Available languages in Tag box (Required to have at least one)
Default Language (required field) choose from available languages
Available price groups(Required to have at least one)
Default Price group (required field) choose from available languages

Categories
Add Category
---> Category Name
---> Category Catalog
Parent Category---->
Category listing cateogries are grouped by catalogs to which they belong
categories are draggable into hierarchies
Each category can only belong to one catalog


TAGS PARAMETERS Additional fields


Pagination in Product List

Filtering
Tradera Listing, vinted listing

add red star

Check the Uploaded File Handling policies

The images should be import from Base.com links


Also the stock should be present

I should have teh possibility to drag Images around to change their order


Data Importer and data mapper

Connection to Base.com

Crosslister
Vinted flagger
depop
shpock


Connect email to add orders from email like tradera


Bypassing Captchas
https://medium.com/@w908683127/how-to-bypass-captcha-with-playwright-an-in-depth-guide-71b0b08e61b5
