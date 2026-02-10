/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FolderTree } from '@/features/foldertree/components/FolderTree';
import type { CategoryWithChildren } from '@/shared/types/domain/notes';


// Mocking useToast
vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
    }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

const mockFolders: CategoryWithChildren[] = [
  {
    id: 'f1',
    name: 'Work',
    children: [
      {
        id: 'f1.1',
        name: 'Projects',
        children: [],
        _count: { notes: 1 },
        notes: [
          { id: 'n1', title: 'Project A', createdAt: new Date(), updatedAt: new Date() } as any,
        ],
      },
    ],
    _count: { notes: 0 },
    notes: [],
  },
  {
    id: 'f2',
    name: 'Personal',
    children: [],
    _count: { notes: 0 },
    notes: [],
  },
];

const defaultProps = {
  folders: mockFolders,
  selectedFolderId: null,
  onSelectFolder: vi.fn(),
  onCreateFolder: vi.fn(),
  onCreateNote: vi.fn(),
  onDeleteFolder: vi.fn(),
  onRenameFolder: vi.fn(),
  onSelectNote: vi.fn(),
  onDuplicateNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onRenameNote: vi.fn(),
  onRelateNotes: vi.fn(),
  onDropNote: vi.fn(),
  onDropFolder: vi.fn(),
  draggedNoteId: null,
  setDraggedNoteId: vi.fn(),
};

describe('FolderTree Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with top-level folders', () => {
    renderWithProviders(<FolderTree {...defaultProps} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('All Notes')).toBeInTheDocument();
  });

  it('calls onSelectFolder(null) when \'All Notes\' is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    await user.click(screen.getByText('All Notes'));
    expect(defaultProps.onSelectFolder).toHaveBeenCalledWith(null);
  });

  it('calls onCreateFolder(null) when the \'Add Folder\' button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    const addBtn = screen.getByLabelText('Add folder');
    await user.click(addBtn);
    expect(defaultProps.onCreateFolder).toHaveBeenCalledWith(null);
  });

  it('expands a folder and shows its children and notes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    // Initially, subfolders and notes might be hidden depending on default expansion logic.
    // The component has: setExpandedFolderIds(new Set(collectFolderIds(folders)));
    // So it should be expanded by default on initial load.
    
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Project A')).toBeInTheDocument();
    
    // Test collapsing
    const collapseBtn = screen.getByRole('button', { name: /collapse work/i });
    await user.click(collapseBtn);
    
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    expect(screen.queryByText('Project A')).not.toBeInTheDocument();
  });

  it('calls onSelectFolder when a folder is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    await user.click(screen.getByText('Work'));
    expect(defaultProps.onSelectFolder).toHaveBeenCalledWith('f1');
  });

  it('calls onSelectNote when a note is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    await user.click(screen.getByText('Project A'));
    expect(defaultProps.onSelectNote).toHaveBeenCalledWith('n1');
  });

  it('shows undo button when onUndo is provided', () => {
    const onUndo = vi.fn();
    renderWithProviders(<FolderTree {...defaultProps} onUndo={onUndo} canUndo={true} />);
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('calls onUndo when undo button is clicked', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    renderWithProviders(<FolderTree {...defaultProps} onUndo={onUndo} canUndo={true} />);
    await user.click(screen.getByText('Undo'));
    expect(onUndo).toHaveBeenCalled();
  });

  it('shows history entries when undoHistory is provided', () => {
    const undoHistory = [{ label: 'Created folder \'Test\'' }];
    renderWithProviders(<FolderTree {...defaultProps} undoHistory={undoHistory} />);
    
    expect(screen.getByText('History')).toBeInTheDocument();
    // It might be collapsed by default or expanded. 
    // const [isHistoryExpanded, setIsHistoryExpanded] = useState(true); -> Expanded by default
    expect(screen.getByText('Created folder \'Test\'')).toBeInTheDocument();
  });

  it('toggles dropzone visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const uploadBtn = screen.getByLabelText('Show dropzone');
    await user.click(uploadBtn);
    
    expect(screen.getByText(/Drop folder\(s\) here to import/i)).toBeInTheDocument();
    
    await user.click(uploadBtn);
    expect(screen.queryByText(/Drop folder\(s\) here to import/i)).not.toBeInTheDocument();
  });

  it('calls onDeleteFolder when delete folder button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const workFolder = screen.getByText('Work').closest('.group');
    const deleteBtn = within(workFolder as HTMLElement).getByTitle('Delete folder and all contents');
    await user.click(deleteBtn);
    
    expect(defaultProps.onDeleteFolder).toHaveBeenCalledWith('f1');
  });

  it('enters rename mode for a folder and calls onRenameFolder', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const workFolder = screen.getByText('Work').closest('.group');
    const renameBtn = within(workFolder as HTMLElement).getByTitle('Rename folder');
    await user.click(renameBtn);
    
    const input = screen.getByDisplayValue('Work');
    await user.clear(input);
    await user.type(input, 'New Work Name{enter}');
    
    expect(defaultProps.onRenameFolder).toHaveBeenCalledWith('f1', 'New Work Name');
  });

  it('calls onCreateSubfolder when add subfolder button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const workFolder = screen.getByText('Work').closest('.group');
    const addSubfolderBtn = within(workFolder as HTMLElement).getByTitle('Add subfolder');
    await user.click(addSubfolderBtn);
    
    expect(defaultProps.onCreateFolder).toHaveBeenCalledWith('f1');
  });

  it('calls onCreateNote when add note button is clicked for a folder', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const workFolder = screen.getByText('Work').closest('.group');
    const addNoteBtn = within(workFolder as HTMLElement).getByTitle('Add note');
    await user.click(addNoteBtn);
    
    expect(defaultProps.onCreateNote).toHaveBeenCalledWith('f1');
  });

  it('calls onDeleteNote when delete note button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const deleteBtn = screen.getByTitle('Delete note');
    await user.click(deleteBtn);
    
    expect(defaultProps.onDeleteNote).toHaveBeenCalledWith('n1');
  });

  it('enters rename mode for a note and calls onRenameNote', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const renameBtn = screen.getByTitle('Rename note');
    await user.click(renameBtn);
    
    const input = screen.getByDisplayValue('Project A');
    await user.clear(input);
    await user.type(input, 'New Note Name{enter}');
    
    expect(defaultProps.onRenameNote).toHaveBeenCalledWith('n1', 'New Note Name');
  });

  it('calls onDuplicateNote when duplicate note button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FolderTree {...defaultProps} />);
    
    const duplicateBtn = screen.getByTitle('Duplicate note');
    await user.click(duplicateBtn);
    
    expect(defaultProps.onDuplicateNote).toHaveBeenCalledWith('n1');
  });

  it('simulates dropping a note onto a folder', () => {
    renderWithProviders(<FolderTree {...defaultProps} draggedNoteId='n2' />);
    
    const workFolder = screen.getByText('Work').closest('.group');
    
    // We need to simulate the drop event
    // The drop handler in FolderNode uses e.dataTransfer.getData("noteId") or draggedNoteId prop
    fireEvent.drop(workFolder!, {
      dataTransfer: {
        getData: (type: string) => type === 'noteId' ? 'n2' : '',
      },
    });
    
    expect(defaultProps.onDropNote).toHaveBeenCalledWith('n2', 'f1');
  });
});
