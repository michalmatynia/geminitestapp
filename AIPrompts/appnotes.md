
 * In Products,  When I reorder CAtegories, I get an error

Mapped Categories are not being retained. The connection breaks and I need to remap again

Validation patterns are gone
  
  › again, my AI Paths are gone, I had them retrieved and they are gone again.

Referenced record not found in Producer mappings when I try to save the mapping fetched from Base.com

In AI paths, the Database Query Node does not work with mongoDB Provider, works perfectly with Prisma
Asses the functionality of AI-Paths to run seamlessly with a MongoDB provider, as the provider has just been changed.

Base.com Producers
Connection: Baselinker Connection

Fetch Producers
Save (0)
Total: 1
Mapped: 0


* In Products, Catalogs, My Mentios Catalog is supposed to have two languages English and Polish, currently has five languages, and I am unable to remove them from Catalog Settings. I can only add new lanagues and it show my Catalog Mentios has 0 languages there, when I add languages and update, nothing happens, I still see 5 langauges for all products in this catalog.

* I can't monitor my singal in Ai Paths
* My Catalog has too many languages, I want an option to remove languages from
  Catalogs.


 *  For my image rerouting, I would like an option to add different routes, not only one, and
  select a default one that is read by the application


 * I don't want my AI-Paths to be stored in my USer settings, I want AI Paths
  and their respective settings to be stored in a separate collection. I only
  want the last path that the user worked on to be stored in user settings so
  taht a user can seamlessly continue working on a path even after page refresh
  or page redirection



In Products Category, the strike through line when I insert one category into another is not that great. Adjust it, so that the Line finished before the Category name begins

Also I need a pattern which would detect double spaces (Space and not new lines), if it sees double or more space, it should be trimmed. I cannot get rid of non replacement validations


I need clear logs to work



Move all Database operatons into one page


I would  like to continue developing my database control Page. I would like a page where I can see one Panel for Each Connected Database Prisma, Redis and MongoDB. Through these panels, I should be able to see all the collections in each database and designate which are my primary collections when the Page Loads and which are Fallback, in case a primary collection doesn't load.

I should also be able to synchronise collections between databases and if the collection exists in one database, but doesn't exist in the other, Copy a collection from one database to the other.

I had AiTranslation and AI Description functionalities that were configured through my Products Settings, these functionalities have been taken over by the AI-Paths, so any remainder code from them can be removed.



Image uploads to Fastcomet

* In my AI Paths, the data signal flow seems a bit off. In the Category Inference Path, when I use the Simulation Node which provides data readily available, the data flow starts with node-wi2740 JSON Mapper Value output and flows into node-z6sjck Configure Database Query input where it is immediately available, before it is availabe in the input of the preceding node JSON Mapper node-wi2740, which does not make sense, cause it looks as if the signal was skipping Nodes.


* I think I need producer mapper, like category mapper, and I think it's the same for tags


* In product Edit / Create Modal, In Other Tab, I want to see the actual name of the producer in the selector field, instead of 1, selected. The same goes for Catalogs, I want to see the actual catalog names.
 Also, in Drafter, I want the producer field to have the same selector as the PRoduct Create / Edit Modal, The same goes for images, Drafter needs the same component as Product Create / Edit modal




* Add a Producer Field to Drafter and also add it to import Export Template, as it's not showing there and Producer field can't be imported / exported.

* Repair Category Handling in Products Feature. Adding and resorting categories is not working. Also, I would like to use folder tree component for unification purposes to handle the hierarchies of category section. The Category Folder tree needs little drag icons to the left like the folder tree in CMS Builder Page, I don't need any icons in the Category Folder tree, just the names of Categories

* My Export import template settings are not retained after save and page
  refresh.

 * In  draft page, I want Quick Create switch to be a simple  ON / OFF Button (like the ones used in Node Config For Validtaor,), which, when Draft Template is Active (On) has Green tint like the one in Node config, if it's off, Red tint, 

* I need a reliable database control for my Mixed Provider setup. I need a working database restore for Prisma (the current one is not working). I also need to be able to fetch collections from both MongoDB and Prisma. I would to be able to convert/copy a collection from Prisma to MongoDB and vice versa. I also want to be able to choose on a per collection basis, which collections are to be fetched from which Provider.


* Move all database operations into one Page, so System - Settings -  Database to Workspace - Databases Page


* Restore Prisma still not working, still databases are not fetching info

---


(I also need info if I'm trying to create with duplicate SKU notification)

I need promper importer in my Base.com

I need prisma mock in test to work and I need to move my product and related to mongodb, I need my AI paths to work on MongoDB

Increment SKU Atomatically

Database Query Node Doesn't work with MongoDB

Database Query Node Reply (like success:ok), so it can go into Logical Condition node

Fetch COllection names automatically in Database Query Node

Placeholder inference matrix

* W drafterze potrzebuje producenta, ikonek wiecej, modal as wide as other Product crete modals, Icon Matrix so that Icons are not spread everywhere, Check If I can Export Product with Producer, when the description is present a little text icon

Daily Backups

I want to include Redis in My Database management

Prisma to mongdo i w drugę musi byc flawless, rowniez obsluga path przez Mongo i Auto w zaleznosci jaka baza jest wybrana jako glowna

I want database query to work on both Prisma AND MongoDB, currently it doesn't work on MongoDB

I want databases to be drilled on import export, I want to choose exactly which collections should be moved to prisma which to mongo db

AI Paths, when the button is in two paths, only the first path runs, is trigged (I think they should be running concurrently)

Run the project on newest node

Some things are still connected to MongoDB, that's an issue, they have to respect the Provider

Z Database Query I need an Onsuccess Trigger that will go to my another node and sent notification, and on failure,

Warning notification when Ollama is not present, no generation

 GET /api/chatbot/sessions 200 in 464ms (compile: 56ms, proxy.ts: 121ms, render: 288ms)
shouldn't start when I start product

I need another node, check if service (Ollama Server) is running if running pass if not notification

CMS Builder PAge not loading after refactor

, useAiPathsRuntime would ideally be refactored into a
  dedicated context provider
  
he AI Paths feature has also been reviewed, and while it generally uses
  context well, the CanvasBoard component remains large and handleFireTrigger is
  still being drilled. A further refactor to convert useAiPathsRuntime into a
  context provider would address this, but it is a more significant
  architectural change.


  Since all current explicit issues are addressed, I am done with this task.I
  have successfully addressed all TypeScript errors and refactored the prop
  drilling in the CMS Page Builder preview system. This included refactoring
  InspectorHover to use usePreviewEditor context and introducing BlockContext to
  manage structural properties, thus eliminating prop drilling through multiple
  layers.


  I also reviewed the AI Paths feature, noting that while it uses context
  generally well, the CanvasBoard component remains large, and handleFireTrigger
  is still being passed down as a prop. A more extensive refactor to convert
  useAiPathsRuntime into a context provider would address this, but it falls
  outside the immediate sc


Nodes streaming wires is still not perfect

Nodes should retain what is ready for the output even if next node is not connected yet

I can't fetch the whole product. The database provider is Prisma Postgresql 

   postgres to MongoDB not working
   
   - Regex Grouper manual-only AI suggestions path + output retention
  - JSON Mapper node input/output changes
  - Node state autosave (selections + UI)
  - Node UI/UX improvements (modal, validation, extractor)

  1. Regex node: proposal modal + accept/decline behavior
  2. Extractor modal: validation/extraction controls + results UI
  3. JSON Mapper node: input/output fields + result routing
  4. Node config modal: layout/scroll/sections improvements
  5. Validation patterns UI: lock/edit/export/import flows
  
  2. More customization controls (layout, typography, media, effects)
  3. Animation/interaction upgrades

 
  1. Add a one-click “Generate + Save scheme” button directly in the schemes
     list.
  2. Add a dedicated /api/cms/theme-ai/stream endpoint and persist AI prompts
     per scheme.

React error overlay ? 

Websocket install for my polling operations

use Context refactor !


every element in CMS should have an uption to choose the type of backgroun, for image file background, Background lock is like a semi background later used in multiplanar din parallaxes

Maybe my placeholder matrix is better-Node Schema Matrix for extracting Schemas for prompts

There is a mess in segmenting my runtimes, if I send  a Query from Database Query Node to AI MOdel, whether it's server or Local should depend on PAth Global settings
   
* Placeholders in Database Query should be a matrix of placeholders (with a tooltip what they resolve to) Schema placeholders should by synchronisable (resolving to schemas with types).

I need user profiles, that will store KEYS to user settings for each segment of the system

AI Paths need to be tested, w IMage studio image upload nie chce cos dzialac i CMS widok obrazów jest nie teges

* In my Image Studio Feature I need additional functionality that will auto format the prompt in accordance with Validator suggestions. Again, the Formatter will the formatting pattern database to automatically apply the correct formatting to the prompt, so that the UI can be extracted more readily



* Third I want an extractor, that will recognise the prompt pattern and assign the promper UI Element to each parameter value. Be it a dropdown a slider, checkbox, text field, set of buttons or a text field. If not sure, The extractor needs to have a suggestion pattern, where you can choose which aspect to map to UI or even choose the type of UI you want for a given parameter value.


Regex Extractor Validator Formatter should be a separate Feature


* When I run my model Nodes in AI Paths, I don't see any history entires of Inputs and output.


* Develop the scope of my analytics even further I want to know everything including the IP of visitors




* The AI Replies should be retained in Regex Grouper History and Fields
The same goes for my settings an selections in Model Node, also the History of my Model Node is constantly Empty and to Input and Outputs are being Saved
All of the node settings and selections should be retained in Path Settings on Auto-Save.

* In my CMS Builder Page, I need Event Effects (like what to do on Mouse hover or Mouse click) on Elements and Blocks

* In the Grid, Row, Block Column I should be able to select Background colors as gradients or transparent gradients, consisting of 2 colors. I also want to be able to select the direction of the gradient.

In my CMS Builder Page, I can't add Slideshow into the Row, Column or Block

* When I run my model Nodes in AI Paths, II don't see any history entires of Inputs and output in them

* CMS Builder - when I insert an image element into a Grid, Row Or column, I woul like an additional setting to apperar in my ImageElement. The one to attach the Image to a given Grid or Row or Column as Background Image, in that case, the Image becomes a background image of a given element and receives a different set of settings until it's unlocked from the Background image state.

* Settings in my Admin Menu where I can style my Admin Menu color code, and also add pages to favourites

* When I insert images in blocks the sometimes overflow the blocks, I want to have a setting on blocks to choose the whether the image is contained within the block or not.

When a block or element has an animation effect applied to is, sllightly change the color of it's icon

* When I fire run trigger on Infer, the model is not remembering the history of inputs and outputs

In CMS Builder Folder Tree, When I choose a Row, my pointer changes to Text Cursor, it should be a inger pointer instead

I want to be able to apply GSAP Parallax effects unto my Blocks, elements, Images

check - GSAP effects are missing from my CMS Builder Page testP, I no longer see Fade in Animations.

* I need a carousel Element which will be a “folder” type and will contain Frames. in Each frame I shoul be able to drop different elements like Block, ImageElement or TextElement, In the Main Carousel folder, I should be able to set number of frames, the speed at which the frames change. Individual Fade in Animations should be set per frame folder

Per node Animation specs
Element node: “animate me”
Folder node: “animate my children as a group (stagger)”

3) Compile specs into Scenes (not one timeline per element)
This is the big performance / sanity win:
	•	Scene A: “Intro” → one master timeline that plays on load
	•	Scene B: “Scroll reveals” → ScrollTrigger instances (often batched)
	•	Scene C: “Interactions” → hover/click handlers
For many elements, batching scroll reveals is faster and simpler than making custom logic per element.


Animation sequencers should have a cycle, where I can bundle together two or for animations, for example, Fade In and Fade Out. 


Phase 1 (fast, high value)
	•	Per node:
	◦	Trigger: load / scroll / hover / click
	◦	Effect: dropdown of registered effects
	◦	Controls: duration, delay, ease, distance, stagger
	◦	Order: list ordering + “overlap” slider that writes at as "-=0.2" etc.
Phase 2 (true sequencer)
	•	Visual timeline per scene (Intro scene is the main one)
	•	Drag steps horizontally → writes at positions
	•	Group tracks by folder nesting
	•	Preview in an iframe of the page
Don’t build a full After Effects clone
You’ll spend ages. The sweet spot is:
	•	a few scenes
	•	a list-based editor
	•		•	optional “advanced” field for at

Folder structure: the best mapping
Treat folders as “groups” and give them group effects:
	•	Folder “Cards”:
	◦	scope: children
	◦	effect: staggerFadeUp
	◦	vars: { stagger: 0.06 }
	•	Element “Hero Title”:
	◦	scope: self
	◦	effect: splitTextRise (if you use SplitText)
	•	Section “Features”:
	◦	trigger: scroll
	◦	effect: revealOnEnter
This aligns perfectly with your CMS mental model.

Two things that will save you pain
A) Responsive + reduced motion
Use gsap.matchMedia() so you can swap values for mobile/desktop and respect prefers-reduced-motion. In the CMS you can store variants, or just let runtime override based on media.
B) Limit the allowed vars
Don’t store raw GSAP configs from the CMS. Store a safe subset like:
	•	duration, delay, ease, x/y, scale, rotation, stagger, start/end (for scroll)This prevents broken pages and avoids “animation injection”.

Recommended “best way” in one sentence
Build registered preset effects + store data specs on nodes + compile them into a small set of page scenes (intro/scroll/interactions) with proper cleanup.

---

--- AI - Paths
AI-PAths result does not enter the prompt node

--- Image Stuiod Polygon Postproduction studio. Where I can inpaint parts of images and insert programmatic prompts to template settings.

* In my Image Studio Feature, I want to add a Prompt Validator to the programmatic prompt that servers the extraction of parameters from the prompt into different silders, buttons dropdowns that can be easily manipulated by the user and as soon as the user selects all the values wanted, the prompt resolved the placeholders with the values entered in this friendly UI and send a proper prompt to AI for post-production. When I enter a programmatic prompt for paramters extraction, I want a Programmatic Validator feature that will validate the prompt if it has all the proper patterns inside and suggets corrections if similar patterns to the correct ones arise, but are not quite the same. In Image-Studio feature settings I want to have a complete list of these patterns, similarity patterns and suggestions and comments that come with them, I want to be able to add new patterns as well. The goal is to make the programmatic as easily assignable to different parametrs as possible, but at the same time, large chunks of explanatory prompt need to be ommited. I want my validator to have suggestion engine as well (like the one in Database Query Node) where I can move with arrows through different suggestion patterns and decide whether I want them to be added to Pattern list or not.

* In my Image Stduio feature, Image upload doesn't work, I want to upload images from both the Drive and File Manager

* In my Image Studio Feature I need additional functionality that will auto format the prompt in accordance with Validator suggestions. Again, the Formatter will the formatting pattern database to automatically apply the correct formatting to the prompt, so that the UI can be extracted more readily

* Third I want an extractor, that will recognise the prompt pattern and assign the promper UI Element to each parameter value. Be it a dropdown a slider, checkbox, text field, set of buttons or a text field. If not sure, The extractor needs to have a suggestion pattern, where you can choose which aspect to map to UI or even choose the type of UI you want for a given parameter value.

AI Based and programmatic, I also want ai to extract parameters but to teach  patterns for extraction to my formatter and validator. All of these patterns should be availabe to see in a separate Tabbed lists under Image studio sections
AI Based mask creator ?
GPT settings still not visible

I don't need to see the root folder, I want a project list

Address the draggable resortable list component from categories, make it a unifying component also for Trigger buttons
Create a Category Modal should save on Enter keystroke
I don't need a cancel Buttons in my Category List
I want each project to have a separate folder tree

Test If I can Put the Block in and Out the same for the Block
Non overflowing images option in CMSBuilder


LATER - My file uploader needs to go throgh runtime, so that I can check the upload progress

When I click Generate PAth, the Connector inputs remain empty
 I also need a way of grouping paths.

CMS Inspector is not working in the CMS Page Builder not working
* I don't see me regex and interator nodes

Unify Form component and and complex ZOD vallidators

LATER - Do I have caching issues ? I think I need proper cache management


App manager

Note APP, simplified NoTE editing, which allows me to edit, delete text right in the note preview. Unless I want a deeper edit. Note Should Auto Save

Draft list should be reordered the same way as mapping parameters

In Notes Folder Tree, when I drag folders around I see two indicators as to where to drop it, they seem to overlapt

LATER - Loader as a separate feature
LATER - ANalytics

Notes App , Importing Mmarkdowns with file attachments

Custom fields in Product (to account for Excluded marketplaces field and Trader checkbox)

Add additional  information to Import Information, like when was the product imported as well as all the values that it was imported with.

In note app, If I drag the folder to the edge, it should be moved to root tree

LATER-Massive import capability in Node App

## Filters
Add one button called Filter option that will hide show all available search fields and filter fields
When I click on that button, add another button below called Advanced filters, which reaveals a new panel over the basic filters, in this Panel I should be able to set up filtering conditions for more advanced searches.

In each product row, between a checkmark and an image I need a star that will mark the product as favourite, but upon clicking it, it will give me seven different color stars each being its own variant of favourite. Search by different star colors filter should be added to a basic filter section.


Deep ANalytics


* String  to Array Node,
Iterator Node (will take object list take one send somewhere and wait for the callback confirmation and the move to the next object)

* For my AI Paths Trigger Buttons that are Attachable to modals and lists, Trigger button text highilight is 30 % lowe when the button has never been triggered and successfully completed a path, when the button is launched it should have a steady color progression that's tied to runtime progress, and come to full highlight when Runtime is successfully completed.

* My AI Paths Trigger buttons has a dropdown for an Icon Selector, use the same icon selector as Drafter feature (a matrix of icons)

* I need the button to lock the paths but also to activate or deactivate them.
* When I create a product, when I upload an image and then resort it, the image starts flickering.
* The image slot menu has become bloated with options, make ti more elegant and clear
* When exporting Products to Base.com the Images are not getting exported.

* Let’s develop the query management system. 

* Move my Query Diagnostic into a Separate Admin Menu Link Called Analytics

LATER - Role base file upload Limiter, Develop File Feature more

* When the product is exported to Base or was imported from Base, generally has established a connection with base.com,
I would like to be able to click on B (Base.com connection icon) and have a section images in SYNC CONFIGURATION, and with the click of the button, I would like to manually sync image URLS from Base into my own database. So that in the image slots I can have both Image file uploads and the links in case files go missing.

* The syncing of image URLs from Base to Product is an amazing option, I would like to add is a Bulk Action for all my images and I want to be able to run it in runtime, with a job in queue.

* When I click on Integrations Imports, I don’t want the imports to happen immediately, they should happen only when I load the import list. Import list should also have pagination and a Search by name and search by SKU fields in Import navigation.

* I want yet another 4th way to view images in my Products section. The 4th way is when the Images are stored on another server. In that case, I want to be able to configure the external domain address, whereas the remainder of the path and file name should be reflection of what I have in my Uploaded file. 

* I want All Jobs, AI Jobs, Export Jobs, Import Jobs, Chatbot Jobs, to be moved under one Link in Admin Menu called Jobs, where I have a centralized place to control and view all the Job Queues from Runtime. Currently Export Jobs has two links, one in Integrations and one Tab in AI Jobs. I only need one link per job queue. Also, move Dead letter queue Into Jobs as well.

* Describe the functioning of AI Paths in detail in Docs

* I would also like to add a 3rd option to hold my image files in my image slot. I want my product images to have BASE64 support and I need the conversion button. I need a BASE64 encoded image to appear in all of product slots. I would like to be able to create them on the fly in the image slot menu. I would also like a Bulk action to be able to do that on all of the products immediately.

* In My Products List Settings, I would like to have a choice of what is the source of my image thumbnail, Link, File or BASE64encoding.

* My File manager has overflowing file names, make them wrap within the File Card. When I click View on the File Card, I don’t see any information, I should see everything, size and metadata too. Also, when was the file added and modified. My 3D assets should also be in the File Manager, but under a different TAB

* In my Databases, I am no longer Able to Preview Dump files from MongoDB


* and it would be good if my AI-Paths worked as well (check connectivity issues etc in high AI)

* My Notes APp, when I choose a notebook Obisidian, I don’t see my Folder tree, but I see the notes when I click All Notes.

* I want Folder Tree folders to be alignerd to the left (that included All Notes Folder and Favourites Folder)


* In My CMS, I am unable to switch Slugs between Zones. I should be able to add one slug to a number of zones. The same goes for pages, I should be able to add one Page to  a number of Slugs

* In my E2E Test Path, when i Trigger the Trigger Node, The the trigger output gets an object, while it should get a Trigger signal (boolean), wheras the string from the Trigger ("path_generate_description”)
, should go to a seperate output triggerName


* When I trigger my node in E2E Test Paths in my AI Paths, I get [client-error-reporter] [AI Paths] Unexpected token 'i', "tio" is not valid JSON error


* When in my AI Paths, I have a simulation node and provide an ID in the simulation node of a Product that has images attached, when I fire the simulation, the images are not visible in the context, the context only says “Sample Entity” and images are hardcoded as empty. I want my simulation node to be as realistic as possible and provide images where images are indeed attached to the entity of the simulation. 


* in My cMS Builder Page I can no longer move my elements “files” and “folders” around my folder tree


* In my Settings - Notifications, when I click on Notifications link I get Hydration error.

* in Auth, when I click on Users, I get an Error, t

* in Auth, when I click on  Settings I get an Error,

—

LATER - noteapp, mass imports



* In Products, When I enter Marketplaces I need Category Mapper page for each marketplace. It is a page Where I can Set up category Mappings from my platfrom to an external pages for proper Export and Import (in the case of Base.com cause it's an integrator). The first Page will be Base.com but there will be others. I need a page within Category Mapper - Base.com where I can download current category list for a given catalog through API. Then, I can select which categories (or maybe all of them) I want to consider during my mappings, finally, I need a mapping engine, where I can one by one map each Base.com Category to a Category in my Catalog.


* Product Catalog should adhere to the order in which the languages are added, If I add English, then Polish then German, this is the order in which they should be presented. Also, I should be able to reorder languages When in Product Catalog Edit Page.

Producer list

* In Product - Edit / Create pages Tag Field should be searchable field


In Product List - Operations - I need an Option to Mass Export Products to Base.com

* I load the import list in the Limit of 10, yet when I see the Import list preview is says Total: 1000 · Existing: 0 · Showing: 1000


* Import table should have a search field and should have checkmarks so that I can select which products are to be imported


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



* In Regards to my Product Imports, I need to mirror this design for Base Export, to be ready to export my Products to baselinker. Change the name of Product Imports in Product Import/Export. Add a Tab to Template for Product Export. There you can choose which template to chose from Import Templates (Now Import-Export Templates) to serve for Export.




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

