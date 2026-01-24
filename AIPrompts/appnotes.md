
npx prisma migrate dev
npx prisma generate
/admin/system/logs

Resorting images during product create from draft still causes image flickering 

* When I create a user manually I should have the option to add their role, including the super user role, also , I should be able to verify them manually by clicking edit.

* mock logging

* In my Product Create / Edit modal, I can now see Price Groups overview with a Standard Group, PLN, EUR. Standard Group shouldn't be there, it's not a price group it's just a type of price group.

* In my Products, I need a Constructor Page, where I can construct how I want my Product to look like. The first subpage will be Parameters page, Where I can add custom Parameters and their values to the product. The Parameters are multilingual and should be translatable. Add Parameters Tab to Product Create / Edit Page. Also Add it to Drafts PAge. In Parameters list within a product, I can choose from the parameter list dropdown to the left (and choose parameters based on my Parameter list from construct), to the right, I can add a parameter value. which is just a text field where I can enter values.*
->Link it with Draft
->PArameter Product

* In Products, When I enter Marketplaces I need Category Mapper page for each marketplace. It is a page Where I can Set up category Mappings from my platfrom to an external pages for proper Export and Import (in the case of Base.com cause it's an integrator). The first Page will be Base.com but there will be others. I need a page within Category Mapper - Base.com where I can download current category list for a given catalog through API. Then, I can select which categories (or maybe all of them) I want to consider during my mappings, finally, I need a mapping engine, where I can one by one map each Base.com Category to a Category in my Catalog. *

Producer list

* In Product - Edit / Create pages Tag Field should be searchable field

Infer Categories and size , material, Lore Tag Automatically

In Product List - Operations - I need an Option to Mass Export Products to Base.com


* I load the import list in the Limit of 10, yet when I see the Import list preview is says Total: 1000 · Existing: 0 · Showing: 1000


* my Product list Filter choices are not retained (for example catalog) when I change between pages, they were supposed to be kept in Mongo DB and be persistent.


* Import table should have a search field and should have checkmarks so that I can select which products are to be imported


LATER - add other GEminiInstructions (especially for the use of tanstack query and schadcn/ui all across application)

add a centralized error handling and logging to all global APIs (countries, price groups, system logs, chatbot, drafts, settings, etc.).
LATER - apply consistent error mapping and handling all across the application
routes and services 
standardize the internal createErrorResponse sources to match the new wrapper sources
* Convert all API routes to use centralized apiHandler/createErrorResponse,
* Add a shared error mapping helper and wire it into all routes
Add a shared error mapping helper and wire it into key services
* Create client-side error handling utilities and implement on the client-side
* Add error metrics and statistics tracking
* Create critical error notification service
* Add error fingerprinting for grouping similar errors
* Create error recovery patterns for transient errors
enhance the centralized error handling and logging system
apply consistent centralized error handling and logging system

Note APP, simplified NoTE editing, which allows me to edit, delete text right in the note preview. Unless I want a deeper edit. Note Should Auto Save

Draft list reorders like mapping parameters


Link Note to Product? Why not, a special kind of Theme that has this linking field

---

* Note App, Note cards show two images even if there is only one image file attached

* Note Links, Notes Rellated to one another are not longer visible in Note Cards and Note Preview

* Notebook Rename doesn't work in Notes APP

Markdown TO Wysywig make it a dropdown and place it by Delete

* Opening WYSYWIG Note fails in Edit Mode

Analytics

LATER - Post Production Studio -> Should have changeable options for relight etc. also an option to Generate, or add environemet. Also, each post-production work should be handled in one session, so it's easier to regenerate with an addidtional prompt (or prompt suggestions)

I am unable to Open my Note, if I migrate it to Wysiwyg

In my Note theme I should be able to set I only want the Markdown note or Wysiwyg or code snippet notes. the default being Markdown. I should also be able to apply Theme to All Notes

* Within omyne note database structure, I want the mark down note to be like a separate note from Wysiwyg. Although you can add a button in Note to Migrate from Markdown and vice versa.

* I would like a third mode aside from Wysiwyg and Markdown, which is Code snippets, which actually is a Markdown, but with specific code coloring, depending how the code is identified with ``` element. The code snippet mode give me the possibility to copy snippet right from the note card with a little "Copy" button.

* Note App, When I move the note to folder, do not uncollapse the folder. 



* Notebook App, when I create a new notebook, I should have the option to choose whether I want the notebook to be WYSIWYG or Markdown. Employ the USe of WYSIWYG in Notes.


* Product Catalog should adhere to the order in which the languages are added, If I add English, then Polish then German, this is the order in which they should be presented. Also, I should be able to reorder languages When in Product Catalog Edit Page.

* The Note Themes should also offer the option to preselect all the belonging notes to either Wysiwyg or markdown.



LATER
In My Product List, when I add Integration + to Base for Exports, it should sync export and price and import too maybe




add proper debugging on visual studio code

* I need an option to import one specific product only (found by SKU or Base product id)
LATER - Aut-Save Product Modal draft on product create, not to loose info.  

LATER - Category Mapping to Base.com

LATER LATER - At some point the exported product should sync image URLs links with my website


LATER - In Integrations Baslinker Tab, create a separate Sync Tab, Where I can set Synchronization intervals. Also, I should be able to setup which way the syning is preferred for each field. So if stock changes in Base.com, should it overwrite what is in my platform, or should it be the other way round. which specific fields are synchronised is set up on per Product basis. So remove syn Price and Sync Inventory Tabs. - 


# IN PROGRESS


Title Path for auto generations, and Sending path, 


* In Regards to my Product Imports, I need to mirror this design for Base Export, to be ready to export my Products to baselinker. Change the name of Product Imports in Product Import/Export. Add a Tab to Template for Product Export. There you can choose which template to chose from Import Templates (Now Import-Export Templates) to serve for Export.




Add additional  information to Import Information, like when was the product imported as well as all the values that it was imported with.

In note app, If I drag the folder to the edge, it should be moved to root tree





## Filters
Add one button called Filter option that will hide show all available search fields and filter fields
When I click on that button, add another button below called Advanced filters, which reaveals a new panel over the basic filters, in this Panel I should be able to set up filtering conditions for more advanced searches.

In each product row, between a checkmark and an image I need a star that will mark the product as favourite, but upon clicking it, it will give me seven different color stars each being its own variant of favourite. Search by different star colors filter should be added to a basic filter section.




# AUTH START

# AUTH END

# Notes App
#
Multi APP manager
Top right extendable menu
that shows Active tools


# PRODUCT IMPORT FROM BASE

We need to handle of import of downloadable image file from Base, preferably, If we could download them and instantly attach them into product image slots
# PRODUCT LIST START

## COURT CASE RESOLVER -> 
Notes WYSIWYG, select notebook, Build context by dragging documents into context container and filling in the fillers. I should also be able to prompt out the fillers between them. The contexts should be a mind map. Come up with plan of action and choose different paths.


## Parameters
PARAMETERS Additional fields

Filtering
Tradera Listing, vinted listing

Also the stock should be present

Crosslister
Vinted flagger
depop
shpock

## Product List END

# NOTE APP

NOTEBOOK Only for  SNippets Type

Moving folders between notebooks

when I create a note, you don't need to uncollapse folders

My image thumbnail preview disappeared from my Note List view. my Notes card no longer show a minature thumbnail of the addded image file. If the thumbnail is a file that is not an image, don't add it at all.


# Email Connect
Connect email to add orders from email like tradera


# PRODUCT LIST END

# Database Restore not working

I can't preview MongoDB Dumps

# Note Taking App START

## Note List
The state of the folder tree (which folders are collapsed or uncollapsed), should be kept in the database for retention
The same goes for folder tree whether it's in a collapsed or expanded state at the moment, it should be kept in the database.
LATER Note parameters, that I can add cusomized, that I can use later on with AI to Identify and extra categorize my notes.

## Note history
Undo history during edit
At some point there should be note import and also the notes should be downloadable as markdown

## Note App Chatbot connection
Apply GPT Notes

Infer text from image and write a snippet

have AI to format my notes, validate the truth in my notes, Search the web to validate my notes, give me note suggestions (that I can Accept or Refuse), extend/refactor my notes, 

Make code AI Valide code snippets

Prompted search, I can search by means of

# Note Taking App END

base.com with email: you@example.com password: YourPassword
remove  Agent job panel from the chatbox window, it duplicates what is already shown


Move image/catalog operations behind a data-access abstraction so Mongo can fully own product data.

My agent mode was configured to use different models for different tasks, but now this option is gone I can't see it.
# Database work
Set the cloud database mongoDB backup to local mongoDB setUP
Add MongoDB connections to Chatbot and agentic flow
Add MongoDB connections to CMS
Add MongoDB connections to Application Settings in General

# Address Redundancy

# Product

# Integrations
Integration with Base

# Set Global Settings
* Move Product Database Choice there
* Choose Global Database as well as individual database for different aspects of the page.

# Develop components
Enhance Components
Make components more robust and modular
Segment them into proper sections

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

I need the ability to take control and log in to the website and give back control. I need a mini website viewer


Sending another prompt during an agent work means I am adjusting, so at this point stop running, do a replan taking the last prompt into consideration and adjust behavior

Connect GPT API to my Agentic Framework
---



Bypassing Captchas
https://medium.com/@w908683127/how-to-bypass-captcha-with-playwright-an-in-depth-guide-71b0b08e61b5
