

* I need a simulation object node, like a simulation modal for a Product, where I can type in the product ID. The simulation object node can be connected to Trigger Button. When I click a trigger button, it will simulate clicking the button on the modal of that object that was connected through the simulation object node.

* wire AI Paths tightly to a notification system as there will be a lot of rules that certain nodes can't get connected etc.

* I need another node called result viewer, where I can see the output results coming from different nodes

When I enter the product ID in my simulation product modal it should automatically fetch simulation data that I can check in the inspector


Context grabber inputs Context

AI Jobs needs to be moved

I want context grab presets (e.g. “Light / Medium / Full”)


Using only my AI Paths node system, come up with a solution to Generate a description using AI just like it is done in AI Description, but use only the AI Paths system and nodes. You can come up with new node types, change wiring, inputs and outputs of particular node and do whatever is required within the node system to achieve the result as it is in AI Description feature that generates Product description with a press of a button by feeding the Product context into prompts using placeholders and then into AI models. I'm only interested in Generic modular solutions

* When I add a Context Grabber node, it has two outputs, but I don't know which is which, outputs should be named
with a tiny tag beside each output, the same goes for inputs.
--
COOL - 

In AI Paths, which mirrors the philosophy of AI Paths used in AI Description, but takes it to the next level. The AI Inference Page is a more modular solution to how the data travels around the page and how it can be transformed in between by different AI models, transformations, modulations etc.
Example of how it should work mirroring current AI Description functionality, but in a more detailed and modular way.
I open a modal Product Page, in which I have a button (Context Grabber) that I click on. Upon click, the action goes into my AI Paths and selects the ones that have this specific context grabber in them. Context grabber Collects all the Data about the context that it is in (in this case, a Product) and sends this information along the path to the next object, a JSON Parser. The Parser takes an Input as a JSON object (in this case, the Product JSON information from the context grabber) and Parses this information in accordance with user preference, for example, to extract Product ID only as one Output, which will be available as placeholder result in the Target Box. The same parser can carry another action and extract a different information, for example a Product Title and make it available as another placeholder result / Output ready to be connected to a different Target and so on. So in our case if we want to follow the AI Description functionality, we need to extract the Images from Product and a Title Field as well as the ProductID. These are extracted, the [images] [title] [productid] [content_en] outputs become available and can be connected further along the path into Text Field Object (Prompt) as Inputs. The Prompt can then be connected to another object which is a model selector (just like the one in AI Description) which will process the prompt and extract the result. For example, the model Gemma does visual analysis of the images as well as the title. The result of AI model Analysis is now available as Output and can be connected to another Text Field Prompt object as [result] which will in turn be connected to a as output to another AI model object which will formulate a reply. The reply is then sent into a Updater object, which will take the [productid] and [content_en] fields parsed previously and update the Product with  [productid] on a field / key [content_en] with the [result] that is the generated product description.

---

The things that can be added to the mind map are divided into different categories. The first thing to be added is:
1. Context Grabber - Context Grabbers can be buttons (that require user click) or markers (which don't require any user interaction) which grab the context of wherever they are placed in. For example, if a button Infer is placed in the Product Modal and the button has a specific ID, Name and is signified as Context Grabber, in AI Paths PAge, this button can be now selected and dragged into the mind map. Upon clicking, this button should Grab all the information about the product that it was clicked from. When I drag the button into the Paths Mind Map, I want to have the dropdown option to set withing the Context Grabber box whether I want the Context to be grabbed from wherever the button is placed in or whether I want to manually enter ID and object (Note or Product) where the information is grabber from (all for testing purposes)

Prepare a scaffolding for that functionality

2. JSON Parser - maybe using zod / io-ts / runtypes , or REGEX, Decode into a type (TS interface + runtime validator, Python pydantic, Go struct, Java class), Then access model.user.profile.email. Parser is an object that takes the JSON output (it's input can only be connected to JSON object) and filters / parses the information to extract data, the output is a JSON output, which, when connected, provides a Placeholder in the Target Box that can be referenced (for example via a prompt)

3. Regex Parser - for extracting information from Strings

--

Example of how it should work mirroring current AI Description functionality, but in a more detailed and modular way.
I open a modal Product Page, in which I have a button (Context Grabber) that I click on. Upon click, the action goes into my AI Paths and selects the ones that have this specific context grabber in them. Context grabber Collects all the Data about the context that it is in (in this case, a Product) and sends this information along the path to the next object, a JSON Parser. The Parser takes an Input as a JSON object (in this case, the Product JSON information from the context grabber) and Parses this information in accordance with user preference, for example, to extract Product ID only as one Output, which will be available as placeholder result in the Target Box. The same parser can carry another action and extract a different information, for example a Product Title and make it available as another placeholder result / Output ready to be connected to a different Target and so on. So in our case if we want to follow the AI Description functionality, we need to extract the Images from Product and a Title Field as well as the ProductID. These are extracted, the [images] [title] [productid] [content_en] outputs become available and can be connected further along the path into Text Field Object (Prompt) as Inputs. The Prompt can then be connected to another object which is a model selector (just like the one in AI Description) which will process the prompt and extract the result. For example, the model Gemma does visual analysis of the images as well as the title. The result of AI model Analysis is now available as Output and can be connected to another Text Field Prompt object as [result] which will in turn be connected to a as output to another AI model object which will formulate a reply. The reply is then sent into a Updater object, which will take the [productid] and [content_en] fields parsed previously and update the Product with  [productid] on a field / key [content_en] with the [result] that is the generated product description.


Result simulation.
Each AI job should be logged Separately and the AI path should wait for it's result to be Completed, the AI Path job is logged separately



In Product Settings I need another page for and AI Path for AI Category and Parameter Inference. You can AI Inference. It should mirror the AI Description Path, but this time, The Placeholders of title and images will be inserted into INPUT prompt and the AI model will Infer what other Product fields like Parameters, Size, Material and Category should be filled with. For Example I want the English Title, like for example "Stationary Guard | 4 cm | Pin | Attack On Titan" to be feed into the prompt as well as the images , and with the appropriate prompt the AI will infer different information about the product, then at another signal path the model will take the result and it will check check the current Category tree and choose the most fitting category for the product. It will also check the Size and fill that in automatically. 
WAIT, the Image recognition Inference IS NOT REQUIRED HERE, cause the results are readily available, I should Take the results from AI JOB Generate description AS wELL as the actual decsription and Feed it into the model for inference. The model need to grab the category tree for a catalog that is selected for that product and choose the most fitting one to the data provided. Then the app is autofilled, if not catalog selected, you can skip that step. Then it should do the same for Size, Paramters, Like Material parameter. I want this to look like a Mind map, with draggable Input and Output field that can be connected to one another. 
Ok I need a separate PAge for that, Remove empty space in Settings.
I need On Action, a button that can be placed,
Button is a context grabber, grabs all the information about the context that it is currently in (For example, a Product, a Note)
click the Inference button, this will gather the product information (including ID), find the related AIJOB by PRoduct Description and Gather the results, If you find more than one, gather results from all of them, refresh and show respective placeholders

 Assign variables or placeholders to results, so that I can Identify them. Then add a Text field (Prompt Field) then Add a model and feed the prompt into a model. The model should receive the information about which catalog the PRoduct belongs to. The model should also receive a complete Category tree for that catalog. Based on the fed information it should infer which category fits the product best. Also, based on the Parameter tree, fill in the PArameter values automatically. Also, prepare the size values (if known). The result should be send to another model for formatting and validation before the information is feed back to respective product fields.
It should then extract the information about the size and the formatted size information should be fed in the size fields.


* In Products, When I enter Marketplaces I need Category Mapper page for each marketplace. It is a page Where I can Set up category Mappings from my platfrom to an external pages for proper Export and Import (in the case of Base.com cause it's an integrator). The first Page will be Base.com but there will be others. I need a page within Category Mapper - Base.com where I can download current category list for a given catalog through API. Then, I can select which categories (or maybe all of them) I want to consider during my mappings, finally, I need a mapping engine, where I can one by one map each Base.com Category to a Category in my Catalog.


* Product Catalog should adhere to the order in which the languages are added, If I add English, then Polish then German, this is the order in which they should be presented. Also, I should be able to reorder languages When in Product Catalog Edit Page.
Infer Categories and size , material, Lore Tag Automatically

Producer list

* In Product - Edit / Create pages Tag Field should be searchable field


In Product List - Operations - I need an Option to Mass Export Products to Base.com


* I load the import list in the Limit of 10, yet when I see the Import list preview is says Total: 1000 · Existing: 0 · Showing: 1000


* Import table should have a search field and should have checkmarks so that I can select which products are to be imported


LATER - add other GEminiInstructions (especially for the use of tanstack query and schadcn/ui all across application) 

Note APP, simplified NoTE editing, which allows me to edit, delete text right in the note preview. Unless I want a deeper edit. Note Should Auto Save

Draft list should be reordered the same way as mapping parameters


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
