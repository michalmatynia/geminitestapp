'use client';

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { useToast } from '@/shared/ui/primitives.public';

import {
  createFilemakerEvent,
  removeFilemakerEvent,
} from '../settings';
import type {
  FilemakerDatabase,
  FilemakerEvent,
} from '../types';

type PersistDatabase = (next: FilemakerDatabase, message: string) => Promise<void>;
type EventDraft = Partial<FilemakerEvent>;

export type EventPageState = {
  editingEvent: FilemakerEvent | null;
  eventDraft: EventDraft;
  handleCreateEvent: () => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
  handleStartEditEvent: (event: FilemakerEvent) => void;
  isEventModalOpen: boolean;
  openCreateEvent: () => void;
  setEventDraft: Dispatch<SetStateAction<EventDraft>>;
  setIsEventModalOpen: Dispatch<SetStateAction<boolean>>;
};

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const createDraftEvent = (eventName: string): FilemakerEvent =>
  createFilemakerEvent({
    eventName,
    id: createId('event'),
    addressId: createId('addr'),
    street: '',
    streetNumber: '',
    city: '',
    postalCode: '',
    country: '',
    countryId: '',
  });

export function useEventPageState(
  database: FilemakerDatabase,
  persistDatabase: PersistDatabase
): EventPageState {
  const { toast } = useToast();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FilemakerEvent | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft>({});

  const openCreateEvent = useCallback(() => {
    setEditingEvent(null);
    setEventDraft({});
    setIsEventModalOpen(true);
  }, []);

  const handleStartEditEvent = useCallback((event: FilemakerEvent) => {
    setEditingEvent(event);
    setEventDraft(event);
    setIsEventModalOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      const nextDatabase = removeFilemakerEvent(database, id);
      await persistDatabase(nextDatabase, 'Event deleted.');
    },
    [database, persistDatabase]
  );

  const handleCreateEvent = useCallback(async (): Promise<void> => {
    const eventName = eventDraft.eventName;
    if (eventName === undefined || eventName === '') {
      toast('Event name is required.', { variant: 'warning' });
      return;
    }
    await persistDatabase(
      { ...database, events: [...database.events, createDraftEvent(eventName)] },
      'Event created.'
    );
    setIsEventModalOpen(false);
    setEventDraft({});
  }, [database, eventDraft, persistDatabase, toast]);

  return {
    editingEvent,
    eventDraft,
    handleCreateEvent,
    handleDeleteEvent,
    handleStartEditEvent,
    isEventModalOpen,
    openCreateEvent,
    setEventDraft,
    setIsEventModalOpen,
  };
}
