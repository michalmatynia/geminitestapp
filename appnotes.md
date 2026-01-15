Application notes

npx tsc
npx eslint
add proper debugging on visual studio code

# Note Taking App
I should 

## Note List
Note Filters

see the list of notes , created time, thumbnail, name
Note tags
Note parameters, that I can add cusomized, that I can use later on with AI to Identify and extra categorize my notes 
Each note needs a bread crumb
File handling (10 file slots benath, the first one being the thumbnail)

have AI to format my notes, validate the truth in my notes, Search the web to validate my notes, give me note suggestions (that I can Accept or Refuse), extend/refactor my notes, 

Move image/catalog operations behind a data-access abstraction so Mongo can fully own product data.

Chatbot connection

The folder tree state (which folders are collapse or not, should be in note settings, I should also have the option to uncollapse everythihng under the currently selected folder)

---


base.com with email: you@example.com password: YourPassword
remove  Agent job panel from the chatbox window, it duplicates what is already shown

At some point there should be note import and also the notes should be downloadable as markdown



# Database work
Set the cloud database mongoDB backup to local mongoDB setUP
Add Prisma and MongoDB Tabs for Database Management
Add MongoDB connections to Chatbot and agentic flow
Add MongoDB connections to CMS
Add MongoDB connections to Application Settings in General

# Address Redundancy

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
