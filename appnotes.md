Application notes

npx tsc
npx eslint
add proper debugging on visual studio code

# IN PROGRESS


# PRODUCT LIST START



Product list and currency, 

Produc and Price Groop

In Product List view, add a Currency dropdown, near langauge dropdown.  The currency dropdown is a default currency of the default price group attached to catalog, which can later be switched to other currencies attached to a price group attached to a catalog.


## Filters
Add one button called Filter option that will hide show all available search fields and filter fields
When I click on that button, add another button below called Advanced filters, which reaveals a new panel over the basic filters, in this Panel I should be able to set up filtering conditions for more advanced searches.

In each product row, between a checkmark and an image I need a star that will mark the product as favourite, but upon clicking it, it will give me seven different color stars each being its own variant of favourite. Search by different star colors filter should be added to a basic filter section.

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

# Database work
Set the cloud database mongoDB backup to local mongoDB setUP
Add Prisma and MongoDB Tabs for Database Management
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
