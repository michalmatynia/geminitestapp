When I click Generate PAth, the Connector inputs remain empty
 I also need a way of grouping paths.
Ai paths node movement
I cannot hightlight text in Product list, the finger pointer is too spread, also, the same for stock and price, I need a /cursor there

* For my AI Paths Trigger Buttons that are Attachable to modals and lists, Trigger button text highilight is 30 % lowe when the button has never been triggered and successfully completed a path, when the button is launched it should have a steady color progression that's tied to runtime progress, and come to full highlight when Runtime is successfully completed.

* My AI Paths Trigger buttons has a dropdown for an Icon Selector, use the same icon selector as Drafter feature (a matrix of icons)

* I need the button to lock the paths but also to activate or deactivate them.


GSAP effects are missing from my CMS Builder Page testP, I no longer see Fade in Animations.

 Backgroun Image Layering
Reordering of Grids,
Taking blocks from inside Columns Out

Unable to upload image into ImageElement


App manager



Note APP, simplified NoTE editing, which allows me to edit, delete text right in the note preview. Unless I want a deeper edit. Note Should Auto Save

Draft list should be reordered the same way as mapping parameters

LATER - Loader as a separate feature
LATER - ANalytics

Link Note to Product? Why not, a special kind of Theme that has this linking field

Notes App , Importing Mmarkdowns with file attachments

Custom fields in Product (to account for Excluded marketplaces field and Trader checkbox)

Add additional  information to Import Information, like when was the product imported as well as all the values that it was imported with.

In note app, If I drag the folder to the edge, it should be moved to root tree


## Filters
Add one button called Filter option that will hide show all available search fields and filter fields
When I click on that button, add another button below called Advanced filters, which reaveals a new panel over the basic filters, in this Panel I should be able to set up filtering conditions for more advanced searches.

In each product row, between a checkmark and an image I need a star that will mark the product as favourite, but upon clicking it, it will give me seven different color stars each being its own variant of favourite. Search by different star colors filter should be added to a basic filter section.



* When I create a product, when I upload an image and then resort it, the image starts flickering.
* The image slot menu has become bloated with options, make ti more elegant and clear
* When exporting Products to Base.com the Images are not getting exported.

* Let’s develop the query management system. 

* Move my Query Diagnostic into a Separate Admin Menu Link Called Analytics


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




Late-I need a carousel Element which will be a “folder” type and will contain Frames. in Each frame I shoul be able to drop different elements like Block, ImageElement or TextElement, In the Main Carousel folder, I should be able to set number of frames, the speed at which the frames change. Individual Fade in Animations should be set per frame folder

Background image

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

