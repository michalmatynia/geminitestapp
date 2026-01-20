add proper debugging on visual studio code

## Error Type
Console Error

## Error Message
Failed to load preferences


    at useUserPreferences.useEffect.loadPreferences (file:///Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/.next/dev/static/chunks/_6a57f4be._.js:2800:35)

Next.js version: 16.1.2 (Turbopack)

Errors when I run application

Product List, changing catalog still not retained

Notebook App, when I create a new notebook, I should have the option to choose whether I want the notebook to be WYSIWYG or Markdown

# IN PROGRESS

when importing from Base.com, consider also duplicate SKUs

View Listing Jobs in Product Export is not working

Exporting duplicate SKU might also be a problem
Export

Product List, Price column header should have an indication of which currenct it is in (most porbably a default currency for the catalog) 

* Product list should remember my choices in terms of navigation, catalog choice and record them in the database, when I leave the page, the settings stay the same. Also incorporate the current state of settings in Products - Preferences Page (which has a mirror layout of the settings page, but relate more to the technical aspects of the Product section as a whole)


* -Product default price group is the default Catalog price group, I don't need to make that selection for every single product, it's automatic.
-default price group still asks me to select from dropdown
* When a product is a added to a Catalog, its default Price Group is the one set in the Catalog. I should not need to make this additional when I create the product. Other non default pricegroups should also be visible in product Edit / Create panel. If the price group is dependent on a default price group, both the calculated price and the price group should be visible in product Edit / Create panel.*



Polling for AI jobs never stops


Check that ->In my Edit / Create Product Page, make the Catalogs Field a dropdown and move it to Other Tab


In Product List, Add a small indicator (maybe an icon underneath SKU) whether the product was added by the user or is the result of an import. 


* When my Dropdown in Product List is set to a given catalog, All PRoduct creations are to be assigned to this catalog.

I am still not seeing the Results in the AI Jobs Detail page when the job is run on a product Generate Description/
When I run the Generate description, I don't get to see the results in the AI Jobs Detail page.


I load the import list in the Limit of 10, yet when I see the Import list preview is says Total: 1000 · Existing: 0 · Showing: 1000

Title Path for auto generations, and Sending path, 


* In Regards to my Product Imports, I need to mirror this design for Base Export, to be ready to export my Products to baselinker. Change the name of Product Imports in Product Import/Export. Add a Tab to Template for Product Export. There you can choose which template to chose from Import Templates (Now Import-Export Templates) to serve for Export.




Add additional  information to Import Information, like when was the product imported as well as all the values that it was imported with.

In note app, If I drag the folder to the edge, it should be moved to root tree




In Product List, hovering over an image should give me a slightly bigger image preview.


Move the pagination in Product List under Min Price Max Price Fields 

The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy

I also have [auth][warn][debug-enabled] Read more: https://warnings.authjs.dev




## Filters
Add one button called Filter option that will hide show all available search fields and filter fields
When I click on that button, add another button below called Advanced filters, which reaveals a new panel over the basic filters, in this Panel I should be able to set up filtering conditions for more advanced searches.

In each product row, between a checkmark and an image I need a star that will mark the product as favourite, but upon clicking it, it will give me seven different color stars each being its own variant of favourite. Search by different star colors filter should be added to a basic filter section.


LATER
In My Product List, when I add Integration + to Base for Exports, it should sync export and price and import too maybe


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
