Application notes
base.com with email: you@example.com password: YourPassword

Enhance functionality of
1. Planner/replanner vs. executor (already split for you) V
2. Self‑questioning/critique (already split for you) V
3. Extraction/validation model (evidence checking, schema validation, de‑duplication) V
4. Memory validation + summarization (fast model to filter, stronger model to write) V
5. Tool selection & fallback strategy (small model for routing)
6. Loop detection + recovery (fast heuristic + LLM guard) V
7. Safety/approval gate checks (separate policy model) V
8. DOM/selector inference (cheap model good at pattern matching) V
9. Result formatting/normalization (small model to clean outputs) V

add separate model choices for Memory validation and summarization (fast model to filter, stronger model to write) 

why do you use "llama3" in my codebase ? It's not even a choice in my model list, remove all instances of "llama3" and use a respective model instead
analyze my current model list and the model choices and their respective tasks and choose automatically the best model for each task and save this choice as default settings in chatbox settings

when planning or replanning of Agent Job was done by a specific model, stamp the model signature and make it visible Job details
when planning or replanning of Agent Job Step was done by a specific model, stamp the model signature and make it visible in Step Details
ETC.

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


context length slider (I think it's a server setting on Ollama, I can skip it for now)


TAGS PARAMETERS Additional fields


Pagination in Product List

Filtering
Tradera Listing, vinted listing

add red star

Check the Uploaded File Handling policies

The images should be import from Base.com links


Also the stock should be present


I should have teh possibility to drag Images around to change their order

In Product Create
If the field is empty, the text in TAB is slightly Darkened

Integration with Base

3. Extend Product Create, Product List and add a matching PRoduct Edit to it all


Create Product  is not working


Data Importer and data mapper

Connection to Base.com

Crosslister
Vinted flagger
depop
shpock


Connect email to add orders from email like tradera


Bypassing Captchas
https://medium.com/@w908683127/how-to-bypass-captcha-with-playwright-an-in-depth-guide-71b0b08e61b5
