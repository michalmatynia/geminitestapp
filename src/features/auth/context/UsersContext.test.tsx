import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  UsersProvider,
  useUsersData,
  useUsersDialogs,
  useUsersRoles,
  useUsersSearch,
} from './UsersContext';

vi.mock('../hooks/useUsersState', () => ({
  useUsersState: () => ({
    users: [],
    filteredUsers: [],
    isLoading: false,
    isFetching: false,
    canReadUsers: true,
    canManageSecurity: false,
    roles: [],
    provider: 'mock-provider',
    refetch: vi.fn(),
    userSecurity: undefined,
    loadingSecurity: false,
    mutations: {},
    search: 'alice',
    setSearch: vi.fn(),
    localUserRoles: {},
    handleRoleChange: vi.fn(),
    dirtyRoles: false,
    saveRoles: vi.fn(),
    editingUser: null,
    setEditingUser: vi.fn(),
    userToDelete: null,
    setUserToDelete: vi.fn(),
    deleteUser: vi.fn(),
    createOpen: false,
    setCreateOpen: vi.fn(),
    createForm: { email: '', password: '', name: '' },
    setCreateForm: vi.fn(),
    mockOpen: false,
    setMockOpen: vi.fn(),
    mockEmail: 'mock@example.com',
    setMockEmail: vi.fn(),
    mockPassword: 'secret',
    setMockPassword: vi.fn(),
  }),
}));

function Consumer(): React.JSX.Element {
  const data = useUsersData();
  const search = useUsersSearch();
  const roles = useUsersRoles();
  const dialogs = useUsersDialogs();

  return (
    <div>
      {data.provider}:{search.search}:{String(roles.dirtyRoles)}:{dialogs.mockEmail}
    </div>
  );
}

describe('UsersContext', () => {
  it('throws outside provider', () => {
    expect(() => render(<Consumer />)).toThrow(
      'useUsersData must be used within a UsersProvider'
    );
  });

  it('exposes all users subcontexts inside provider', () => {
    render(
      <UsersProvider>
        <Consumer />
      </UsersProvider>
    );

    expect(screen.getByText('mock-provider:alice:false:mock@example.com')).toBeInTheDocument();
  });
});
