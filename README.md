# Gemini Test App

This project is a Next.js application designed as a monochrome admin dashboard with full CRUD (Create, Read, Update, Delete) capabilities for managing products. It leverages modern web technologies to provide a clean, efficient, and type-safe development experience. It also features a user-facing frontend to display the products.

This project was analyzed and partially updated by the Gemini CLI Agent.

## Getting Started

To get the project up and running locally, please follow these steps.

### Prerequisites

You will need to have Node.js and npm installed on your machine.

You will also need to create a `.env` file in the root of the project. You can use the `.env.example` file as a template. You will need to provide your own API keys for ImageKit and OpenAI.

### Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Initialize the database:**
    ```bash
    npx prisma migrate dev
    ```
3.  **Seed the database with initial data:**
    ```bash
    npm run seed
    ```
4.  **Start the development server:**
    ```bash
    npm run dev
    ```
The application will be available at `http://localhost:3000`.