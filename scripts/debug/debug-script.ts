import { prismaNoteRepository } from "@/features/notesapp/services/notes/note-repository/prisma-note-repository";

async function main() {
  console.log("Starting debug script...");

  // 1. Create a category
  const category = await prismaNoteRepository.createCategory({
    name: "Debug Category " + Date.now(),
    description: "Debug category description",
    color: null,
    parentId: null,
    notebookId: null
  });

  console.log("Created category:", category.id);

  // 2. Create a note
  const note = await prismaNoteRepository.create({
    name: "Debug Note",
    title: "Debug Note",
    content: "Content",
    notebookId: null,
    editorType: 'markdown',
    categoryId: category.id,
    themeId: null,
    isPinned: false,
    isArchived: false,
    isFavorite: false,
  });
  console.log("Created note:", note.id);

  // 3. Update note to add category
  console.log("Updating note to add category...");
  const updatedNote = await prismaNoteRepository.update(note.id, {
    categoryId: category.id,
  });
  
  console.log("Updated note category:", updatedNote?.categoryId);

  if (updatedNote?.categoryId === category.id) {
    console.log("SUCCESS: Category added correctly.");
  } else {
    console.log("FAILURE: Category NOT added.");
  }

  // Clean up
  await prismaNoteRepository.delete(note.id);
  await prismaNoteRepository.deleteCategory(category.id);
}

main().catch(console.error);
