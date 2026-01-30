Cloud image storage (or maybe from fastcomet ? ) path conversion
Front page GSAP builder
App manager
Mock data for store management, so Bas64 file storage maybe ? 
---
enable requiring explicit type annotations
Require typedef and module boundaries and one more need to be set to true

Products 
Changing currency doesn't work again

I cannot hightlight text in Product list, the finger pointer is too spread, also, the same for stock and price, I need a cursor there

unify Refresh button so that it's one component everywhere

Collapsible Menu on the left in the Admin should be remembered if I left it collapsed or not
Disconnecting the wire should clear the information in the connection socket (but not from the history of node input output)

---
I need to implement a persistent RUNTIME and decouple AI Model Nodes from their regular polling operations. They should start working within a general runtime framework
Jobs system for the whole Path

Polling

Action logger
 1. Persistent runtime engine (resume runs, track node status, replay/retry, audit history) <-
  2. Execution scheduling (queue, concurrency limits, retries, backoff, dead-letter) <-
     a. Add a dead‑letter review screen (filter + requeue from DLQ). <- 
  b. Add per‑node retry controls in the Run Details modal. <-

  3. Streaming + progress tracking (node-by-node status, live logs, timestamps)
  4. Deterministic execution + caching (hash inputs, memoize node outputs)  <- done
  5. Multi-tenant safety (per-user isolation, permissions, rate limits)
  6. Visual runtime timeline (per-run trace + logs shown in UI)

There is an error in the prompt node, when I first connected the EntityID output to Result input in the Prompt Node before any run was made, the result was shown in the output as prompt, it should not be the result there but be whatever is in the prompt field. If the prompt is empty, the prompt output should also be empty.

* Each node should have an input output history, everything that goes in or out is to be recorder on a per node basis with timestap, which path executed it, which node did the information come from and which node did the information go to or whether a node failed or delayed passing the information.

AI Paths should have a separate Job queue, meaning a separate Tab for job queue, job queue entries should contain maximum information about each run (timestamps, run history, which nodes participates, input and outputs. everything you can record about a job  run should be there)

Animated wires, that show the signal path, if data is on the way to another node, the node that takes data is should have some visual signifier that the input has been loaded or that the output is out
  describe everything in Docs

* The whole AI Paths system is connected to MongoDB as this is the currently default Database
  * Each Node connector is also an individual data container that retains data passed around. When I hover over a connector, I should be able to see the data that it currently holds that is to be passover, or the data from previous passes


---
node module inputs and output should have a step by step logger, logging all the data that is coming in and that is coming out

---


Generating Product updates via Database Query Node works if I click on Run, It works through trigger event as well, and goes through a complete signal path until it reaches the Database Query Node where it updates a product, but only if the ID is harcoded in the Query, like so:
{
  "id": "8f9c5c77-6c14-477a-9945-5ae41afdf908"
}

{ "$set":{"description_en": "test"}
}
Also, I need to hard refresh my PRoduct list to see the change, which is a proble,
if I'm using a placeholder like this {{entityId}}, the Trigger event of Signal Path in AI Paths doesn't work. PRoducts are not updated via Database Query Node. Here's the query I used. 

{
  "id": "{{entityId}}"
}

{ "$set":{"description_en": "test"}
}

---

AI jobs are created even if the signal path in AI Paths doesn't have any AI model nodes connected, look at this job "36627686-61be-42be-aa1a-1985e3405e62"

---

I need to define schemas for database




I can't see the product immediately after product creation

the mapper can assign the object {"fieldName": "{{value}}"}, this should also be helpful

"{{result}}" (escaped JSON object) {{result}} (JSON object ) write it somewhere

* AI Prompt needs to be sent on pressing the return button in Database Query Node.

When AI model generates content, it keeps on appearing in my prompt suggestion in Database, maybe for suggestions I need another  channel ?

images still flicker

LATER - All Jobs / runners should be in one place 
* In Products, When I enter Marketplaces I need Category Mapper page for each marketplace. It is a page Where I can Set up category Mappings from my platfrom to an external pages for proper Export and Import (in the case of Base.com cause it's an integrator). The first Page will be Base.com but there will be others. I need a page within Category Mapper - Base.com where I can download current category list for a given catalog through API. Then, I can select which categories (or maybe all of them) I want to consider during my mappings, finally, I need a mapping engine, where I can one by one map each Base.com Category to a Category in my Catalog.


* Product Catalog should adhere to the order in which the languages are added, If I add English, then Polish then German, this is the order in which they should be presented. Also, I should be able to reorder languages When in Product Catalog Edit Page.

Producer list

* In Product - Edit / Create pages Tag Field should be searchable field


In Product List - Operations - I need an Option to Mass Export Products to Base.com

* I load the import list in the Limit of 10, yet when I see the Import list preview is says Total: 1000 · Existing: 0 · Showing: 1000


* Import table should have a search field and should have checkmarks so that I can select which products are to be imported

Note APP, simplified NoTE editing, which allows me to edit, delete text right in the note preview. Unless I want a deeper edit. Note Should Auto Save

Draft list should be reordered the same way as mapping parameters

LATER - Loader as a separate feature
LATER - ANalytics

Link Note to Product? Why not, a special kind of Theme that has this linking field

Notes App , Importing Mmarkdowns with file attachments

Custom fields in Product (to account for Excluded marketplaces field and Trader checkbox)
---

* Note App, Note cards show two images even if there is only one image file attached

* Note Links, Notes Rellated to one another are not longer visible in Note Cards and Note Preview

* Notebook Rename doesn't work in Notes APP

Markdown TO Wysywig make it a dropdown and place it by Delete

* Opening WYSYWIG Note fails in Edit Mode

LATER - Analytics
LATER - aI SHop manager
LATER - AI teaching embeddings feature
LATER - Post Production Studio -> Should have changeable options for relight etc. also an option to Generate, or add environemet. Also, each post-production work should be handled in one session, so it's easier to regenerate with an addidtional prompt (or prompt suggestions)

I am unable to Open my Note, if I migrate it to Wysiwyg

In my Note theme I should be able to set I only want the Markdown note or Wysiwyg or code snippet notes. the default being Markdown. I should also be able to apply Theme to All Notes

* Within omyne note database structure, I want the mark down note to be like a separate note from Wysiwyg. Although you can add a button in Note to Migrate from Markdown and vice versa.

* I would like a third mode aside from Wysiwyg and Markdown, which is Code snippets, which actually is a Markdown, but with specific code coloring, depending how the code is identified with ``` element. The code snippet mode give me the possibility to copy snippet right from the note card with a little "Copy" button.

* Note App, When I move the note to folder, do not uncollapse the folder. 


* Notebook App, when I create a new notebook, I should have the option to choose whether I want the notebook to be WYSIWYG or Markdown. Employ the USe of WYSIWYG in Notes.


* The Note Themes should also offer the option to preselect all the belonging notes to either Wysiwyg or markdown.


LATER
In My Product List, when I add Integration + to Base for Exports, it should sync export and price and import too maybe

add proper debugging on visual studio code

* I need an option to import one specific product only (found by SKU or Base product id)
LATER - Aut-Save Product Modal draft on product create, not to loose info.  

LATER - Category Mapping to Base.com

LATER LATER - At some point the exported product should sync image URLs links with my website


LATER - In Integrations Baslinker Tab, create a separate Sync Tab, Where I can set Synchronization intervals. Also, I should be able to setup which way the syning is preferred for each field. So if stock changes in Base.com, should it overwrite what is in my platform, or should it be the other way round. which specific fields are synchronised is set up on per Product basis. So remove syn Price and Sync Inventory Tabs. - 

LATER - per  User Activity Log system
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

