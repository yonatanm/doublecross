# Crossword Puzzle Builder & Printer Application Prompt

## Project Title: Crossword Puzzle Builder & Printer

## Objective:
Develop a full-stack web application for creating, editing, and printing crossword puzzles, with specific features for user interaction and print-friendly output.

## Technology Stack:
*   **Frontend:** React, TypeScript. optional:  Tailwind CSS, Shadcn/ui components, Lucide React icons, React Router DOM, @tanstack/react-query.
*   **Backend:**  : firebase as storage and authentication (google)

## Core Functionality Requirements:

### 1. Crossword Entity Definition:
Create a `Crossword` entity with the following schema:
*   `title` (string): Name of the crossword.
*   `description` (string, optional): Brief theme description.
*   `grid_size` (number, default 15): Size of the grid (e.g., 15 for 15x15).
*   `grid` (array of arrays): 2D array representing the crossword grid cells. Each cell object:
    *   `letter` (string, optional): The letter in the cell.
    *   `isBlocked` (boolean): True if the cell is a black block.
    *   `number` (number, optional): Clue number for the start of a word.
*   `raw_clues` (array of objects): User-entered clues and answers (`{ clue: string, answer: string }`).
*   `clues_across` (array of objects): Generated across clues (`{ number: number, clue: string, answer: string }`).
*   `clues_down` (array of objects): Generated down clues (`{ number: number, clue: string, answer: string }`).
*   `highlighted_cells` (array of strings): List of 'row-col' strings (e.g., "0-0", "0-1") indicating cells highlighted as hints.
*   `status` (string, enum: "draft", "published", "archived", default "draft").
*   `difficulty` (string, enum: "easy", "medium", "hard", default "medium").

### 2. Home Page (`/`):
*   Display a list of all existing crossword puzzles.
*   Allow users to search and filter crosswords by `status` (Draft, Published, Archived).
*   Provide a button to create a new crossword (links to `CrosswordEditor`).
*   For each crossword, display a `CrosswordCard` showing its title, creation date, status, and difficulty.
*   Each `CrosswordCard` should include actions: "Edit" (links to `CrosswordEditor?id=<crosswordId>`), "Print", and "Archive" (marks `status` as "archived").
*   Implement an empty state message when no crosswords exist.

### 3. Crossword Editor Page (`/editor` or `CrosswordEditor?id=<crosswordId>`):
*   Allows creating new crosswords or editing existing ones (fetched by ID from URL params).
*   Input field for `title`.
*   Dropdown for `status` (Draft, Published).
*   Textarea for entering `raw_clues`. Each line should be in the format: `clue-answer` (e.g., "Domestic animal-CAT"). The editor should parse these into an array of `{ clue, answer }` objects.
*   "Generate Crossword" button:
    *   When clicked, it should take the `raw_clues` and generate the crossword grid (`grid`), `clues_across`, and `clues_down`.
    *   It should use an internal utility function (e.g., `crosswordLayoutOptimizer`) to perform this generation, aiming for optimal word placement and intersections.
    *   Display any `unplacedClues` after generation.
*   **Interactive Crossword Preview:**
    *   Display the generated crossword grid visually.
    *   Users must be able to click on any non-blocked cell in the preview to toggle its "highlighted" state. This state should be managed locally (`highlightedCells` state: map of `row-col` keys to boolean values).
*   "Save" button:
    *   Saves the `title`, `status`, generated `grid`, `raw_clues`, `clues_across`, `clues_down`, and the current `highlighted_cells` state to the `Crossword` entity in the database.
    *   On successful save of a new crossword, navigate the user to the editor page for that newly created crossword (e.g., `CrosswordEditor?id=<newId>`).
*   Loading state for fetching/saving crosswords.
*   Header with navigation back to Home and save functionality.

### 4. Crossword Printing Functionality (`PrintDialog` and `/print?id=<crosswordId>`):
*   When the "Print" action is triggered from the Home page (or any other relevant location), a `PrintDialog` should appear.
*   This dialog should contain a preview of the crossword *as it will be printed*.
*   It should have a "Print" button that triggers the browser's print functionality.
*   **Crucial Print-Specific Logic:**
    *   The printed crossword grid must display the letters for cells included in `highlighted_cells`.
    *   These highlighted cells **must appear on a plain white background**, *without* any yellow or other colored highlighting, only the letter should be visible as a hint.
    *   Blocked cells should be black.
    *   Non-highlighted, non-blocked cells should be white and empty (no letter).
    *   The printed output should include the crossword title, an optional creation date, the grid, and lists of "Across" and "Down" clues, sorted by number.
    *   Ensure a clean, readable layout for printing (e.g., using `window.open` to create a print-specific HTML document).

### 5. General UI/UX:
*   All UI elements should be responsive and visually appealing.
*   The application should support Right-to-Left (RTL) text direction for all text (e.g., Hebrew).
*   Use `shadcn/ui` components for consistency and `lucide-react` for icons.
*   Loading indicators where necessary.

## Instructions for the Coding Agent:
*   Start by defining the `Crossword` entity.
*   Implement the `Home` page, including the `CrosswordCard` and its actions.
*   Develop the `CrosswordEditor` page with input, generation, interactive preview, and saving logic.
*   Create the `PrintDialog` and its print-specific rendering logic, ensuring highlighted cells show letters on a white background only for printing.
*   Ensure all data interactions use `@tanstack/react-query`  
*   Adhere to the specified technology stack and best practices for React, Tailwind CSS, 
*   Prioritize modularity by creating small, focused components and utilities.
