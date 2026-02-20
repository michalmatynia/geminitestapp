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
    title: "Debug Note",
    content: "Content",
    color: null,
    tagIds: [],
    notebookId: null,
    editorType: 'markdown',
    isPinned: false,
    isArchived: false,
    isFavorite: false,
    categoryIds: [],
    relatedNoteIds: [],
  });
  console.log("Created note:", note.id);

  // 3. Update note to add category
  console.log("Updating note to add category...");
  const updatedNote = await prismaNoteRepository.update(note.id, {
    categoryIds: [category.id],
  });
  
  console.log("Updated note categories:", JSON.stringify(updatedNote?.categories, null, 2));

  if (updatedNote?.categories.length === 1 && updatedNote.categories[0]?.categoryId === category.id) {
    console.log("SUCCESS: Category added correctly.");
  } else {
    console.log("FAILURE: Category NOT added.");
  }

  // Clean up
  await prismaNoteRepository.delete(note.id);
  await prismaNoteRepository.deleteCategory(category.id);
}

main().catch(console.error);
