# AI Paths Documentation

## Overview
AI Paths provide a flexible framework for defining and executing sequences of AI-driven logic and actions within the application. They allow for the orchestration of various AI handlers to create complex workflows, ranging from data parsing and transformation to AI model interactions and database operations. AI Paths are designed to be configurable, extensible, and triggerable via different mechanisms, including user interface elements like Trigger Buttons.

## Core Concepts

*   **Path**: A directed graph representing a sequence of AI operations (nodes). Each path defines a specific workflow.
*   **Node**: An individual step or operation within an AI Path. Each node has a type (e.g., `parser`, `model`, `database`) and associated configuration.
*   **Handler**: The underlying logic that implements a specific node type. Handlers define how a node processes its input context and produces output.
*   **Context**: A mutable data object that flows through the AI Path. Nodes read from and write to the context, allowing data to be transformed and passed between steps.
*   **Trigger**: A mechanism that initiates an AI Path run. This can be a UI element (like a Trigger Button), an API call, or a scheduled event.
*   **Runtime State**: The ephemeral state associated with a particular execution of an AI Path, including the current context, node execution status, and logs.

## Path Structure
An AI Path is essentially a graph composed of connected nodes. While the exact definition can vary, a typical path structure includes:
*   **Nodes**: An array of objects, where each object defines a node's `id`, `type`, and `config`.
*   **Connections**: Defines the flow between nodes, often implicitly by array order or explicitly via `next` pointers in node configs.
*   **Meta**: Metadata about the path, such as `name`, `description`, etc.

**Example (Conceptual JSON Structure):**
```json
{
  "id": "my_product_seo_path",
  "name": "Product SEO Description Generator",
  "description": "Generates SEO-optimized descriptions for products.",
  "nodes": [
    {
      "id": "start",
      "type": "input",
      "config": {
        "schema": {
          "productId": "string"
        }
      }
    },
    {
      "id": "fetch_product",
      "type": "database",
      "config": {
        "operation": "query",
        "model": "product",
        "where": { "id": "{{context.productId}}" },
        "output": "productData"
      }
    },
    {
      "id": "generate_description",
      "type": "model",
      "config": {
        "modelName": "gpt-4",
        "promptTemplate": "Generate an SEO description for a product named {{context.productData.name}} with features {{context.productData.features}}.",
        "output": "seoDescription"
      }
    },
    {
      "id": "update_product",
      "type": "database",
      "config": {
        "operation": "update",
        "model": "product",
        "where": { "id": "{{context.productId}}" },
        "data": { "description_seo": "{{context.seoDescription}}" }
      }
    },
    {
      "id": "end",
      "type": "output",
      "config": {
        "outputData": {
          "status": "success",
          "description": "{{context.seoDescription}}"
        }
      }
    }
  ]
}
```

## Available Handlers (Node Types)
Each node in an AI Path corresponds to a handler that processes data.

### `compare` Handler
*   **Purpose**: Compares two values within the context and sets a boolean `valid` flag in the output. Useful for conditional branching.
*   **Input**: `value1`, `value2` (paths to context variables or literal values), `operator` (e.g., `==`, `!=`, `>`, `<`, `>=`, `<=`).
*   **Output**: Sets `context.valid` to `true` or `false`.
*   **Example**: Check if `context.product.price` is greater than 100.

### `gate` Handler
*   **Purpose**: Acts as a conditional gate. If `context.valid` is `false`, the path can halt or take an alternative branch.
*   **Input**: Reads `context.valid`.
*   **Output**: Passes context through if `valid` is true, otherwise can set an error or redirect flow.
*   **Example**: Proceed only if product data is valid.

### `parser` Handler
*   **Purpose**: Extracts or transforms data from a source (e.g., a string, JSON object) using mapping rules (like JSONPath).
*   **Input**: `source` (context path to data), `mappings` (array of `{ path: string, outputKey: string, fallback?: any }`), `outputMode` (`single` or `bundle`).
*   **Output**: Extracted data assigned to context variables.
*   **Example**: Extract `product_name` and `price` from a JSON string in `context.apiResponse`.

### `mapper` Handler
*   **Purpose**: Maps, transforms, or renames variables within the context. Useful for preparing data for subsequent nodes.
*   **Input**: `mappings` (array of `{ source: string, target: string, transform?: string }`).
*   **Output**: Transformed context.
*   **Example**: Rename `context.oldPrice` to `context.newPrice`.

### `mutator` Handler
*   **Purpose**: Directly modifies a value in the context using a template or literal value.
*   **Input**: `target` (context path), `value` (template string or literal).
*   **Output**: Modified context.
*   **Example**: Set `context.user.score` to `20`.

### `validator` Handler
*   **Purpose**: Validates the presence or format of data in the context.
*   **Input**: `checks` (array of `{ path: string, type?: 'string' | 'number' | 'boolean', required?: boolean }`).
*   **Output**: Sets `context.valid` based on validation results.
*   **Example**: Ensure `context.order.id` and `context.order.amount` are present and correctly typed.

### `router` Handler
*   **Purpose**: Directs path flow based on conditions. Enables conditional branching.
*   **Input**: `conditions` (array of `{ match: any, nextNodeId: string }`), `defaultNextNodeId`.
*   **Output**: Determines the next node to execute.
*   **Example**: If `context.user.role` is `admin`, go to `admin_flow`, else to `user_flow`.

### `template` Handler
*   **Purpose**: Renders a template string (e.g., a prompt for an AI model) using values from the context.
*   **Input**: `templateString`, `outputKey`.
*   **Output**: Rendered string assigned to `context[outputKey]`.
*   **Example**: Generate an AI prompt like "Write a review for product: {{context.productName}}".

### `database` Handler
*   **Purpose**: Performs CRUD operations against the application's database (via Prisma or MongoDB).
*   **Input**: `operation` (`query`, `create`, `update`, `delete`), `model`, `where`, `data`, `output`.
*   **Output**: Database results assigned to context.
*   **Example**: Fetch product details, create a new user, update an order status.

### `model` Handler
*   **Purpose**: Interacts with external AI models (e.g., OpenAI, Ollama) to generate text, complete tasks, or analyze data.
*   **Input**: `modelName`, `prompt` (context path to prompt string), `output`.
*   **Output**: AI model's response assigned to context.
*   **Example**: Send `context.seoPrompt` to `gpt-4` and store the result in `context.generatedText`.

### `math` Handler
*   **Purpose**: Performs arithmetic operations on numerical values in the context.
*   **Input**: `operation` (`add`, `subtract`, `multiply`, `divide`), `operand1`, `operand2`, `output`.
*   **Output**: Result of the calculation assigned to context.
*   **Example**: Calculate `context.totalPrice = context.itemPrice * context.quantity`.

### `bundle` Handler
*   **Purpose**: Combines multiple context variables into a single object.
*   **Input**: `sources` (array of `{ key: string, value: string }`), `outputKey`.
*   **Output**: A new object in context containing bundled data.
*   **Example**: Create `context.summary = { name: context.productName, price: context.productPrice }`.

### `trigger` Handler
*   **Purpose**: Acts as a custom event trigger within a path, which can be used for logging, analytics, or triggering other processes.
*   **Input**: `event` (event identifier), `payload` (context path to data to include in the event).
*   **Output**: None (primarily side effect).
*   **Example**: Log a `product_updated` event with `context.product.id`.

### `aiDescription` Handler
*   **Purpose**: Specialised handler to generate AI product descriptions (likely uses an internal product description generation service).
*   **Input**: `productId`, `outputKey`.
*   **Output**: Generated description assigned to context.
*   **Example**: Generate description for `context.productId` and store in `context.description`.

### `dbSchema` Handler
*   **Purpose**: Fetches and formats the database schema for a given model. Useful for AI agents to understand database structure.
*   **Input**: `modelName`, `outputKey`.
*   **Output**: Formatted schema string assigned to context.
*   **Example**: Get schema for `product` model and store in `context.productSchema`.

## Trigger Buttons
Trigger Buttons are UI components that users can interact with to initiate AI Paths.
*   **Configuration**: Defined in the Admin UI, they link a button (with an icon, label, and display mode) to a specific AI Path and specify where in the UI it should appear (e.g., product modal, product list).
*   **Context Passing**: When a Trigger Button is activated, it passes relevant context (e.g., `productId`, `noteId`) to the associated AI Path.
*   **Location**: Configurable to appear in various parts of the application.

## Runtime Behavior
The AI Paths runtime engine processes nodes sequentially or conditionally.
*   **Context Management**: Ensures data consistency and flow between nodes.
*   **Error Handling**: Catches errors at the node level, allowing paths to define fallback logic or report failures.
*   **Retry Mechanisms**: Paths can implement retry logic for transient failures in AI model calls or external services.
*   **Logging**: Detailed logging of path execution, context changes, and errors is available for debugging and monitoring (`AiPathRun`, `AiPathRunNode`, `AiPathRunEvent` models).

## Extensibility
The AI Paths framework is designed to be extensible:
*   **New Handlers**: New node types can be added by implementing new handlers that conform to the expected interface.
*   **Custom Logic**: Existing handlers can be extended or configured to perform highly specific tasks.

## Testing
AI Paths components and handlers are tested using Vitest and `@testing-library/react`.
*   **Unit Tests**: Focus on individual handlers and utility functions (e.g., `extensive-handlers.test.ts`, `evaluate-graph.test.ts`).
*   **Integration Tests**: Test the interaction between multiple handlers or with external services (mocked).
*   **E2E Tests**: (If applicable) Test the entire workflow from Trigger Button activation to final outcome.

This documentation will continue to be updated as the AI Paths feature evolves.
