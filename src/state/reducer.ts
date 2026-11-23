import { createDefaultSettings, createDefaultState, STORAGE_VERSION } from '../lib/storage';
import {
  applyDraftToEvent,
  createEvent,
  duplicateEvent,
  sortEvents,
  type EventDraftInput,
} from '../lib/events';
import {
  configureRoadshow,
  finishRoadshow,
  pauseRoadshow,
  resetRoadshow,
  resumeRoadshow,
  startRoadshow,
} from '../lib/roadshow';
import type { EventItem, PersistedState, Settings } from '../types';

export type Action =
  | { type: 'event/add'; draft: EventDraftInput; now: number; id?: string }
  | { type: 'event/update'; id: string; draft: EventDraftInput; now: number }
  | { type: 'event/delete'; id: string }
  | { type: 'event/duplicate'; id: string; now: number; newEventId?: string }
  | { type: 'event/activate'; id: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'settings/reset' }
  | {
      type: 'data/import';
      events: EventItem[];
      settings: Settings;
      activeEventId: string | null;
    }
  | { type: 'data/reset'; now: number }
  | { type: 'roadshow/start'; now: number; durationMs?: number }
  | { type: 'roadshow/pause'; now: number }
  | { type: 'roadshow/resume'; now: number }
  | { type: 'roadshow/reset' }
  | { type: 'roadshow/configure'; durationMs: number }
  | { type: 'roadshow/finish' }
  | { type: 'roadshow/setTeamName'; teamName: string };

export function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'event/add': {
      const event = createEvent(action.draft, action.now, action.id);
      return {
        ...state,
        events: sortEvents([...state.events, event]),
        activeEventId: event.id,
      };
    }
    case 'event/update': {
      const index = state.events.findIndex((event) => event.id === action.id);
      if (index === -1) return state;
      const updated = applyDraftToEvent(state.events[index], action.draft, action.now);
      const events = [...state.events];
      events[index] = updated;
      return { ...state, events: sortEvents(events) };
    }
    case 'event/delete': {
      const events = state.events.filter((event) => event.id !== action.id);
      const activeEventId =
        state.activeEventId === action.id ? (events[0]?.id ?? null) : state.activeEventId;
      return { ...state, events, activeEventId };
    }
    case 'event/duplicate': {
      const source = state.events.find((event) => event.id === action.id);
      if (!source) return state;
      const copy = duplicateEvent(source, action.now, action.newEventId);
      return {
        ...state,
        events: sortEvents([...state.events, copy]),
        activeEventId: copy.id,
      };
    }
    case 'event/activate': {
      if (!state.events.some((event) => event.id === action.id)) return state;
      return { ...state, activeEventId: action.id };
    }
    case 'settings/update': {
      return { ...state, settings: { ...state.settings, ...action.patch } };
    }
    case 'settings/reset': {
      return { ...state, settings: createDefaultSettings() };
    }
    case 'data/import': {
      const events = sortEvents(action.events);
      if (events.length === 0) return state;
      const activeEventId =
        action.activeEventId && events.some((event) => event.id === action.activeEventId)
          ? action.activeEventId
          : events[0].id;
      return { ...state, version: STORAGE_VERSION, events, settings: action.settings, activeEventId };
    }
    case 'data/reset': {
      return createDefaultState(action.now);
    }
    case 'roadshow/start':
      return { ...state, roadshow: startRoadshow(state.roadshow, action.now, action.durationMs) };
    case 'roadshow/pause':
      return { ...state, roadshow: pauseRoadshow(state.roadshow, action.now) };
    case 'roadshow/resume':
      return { ...state, roadshow: resumeRoadshow(state.roadshow, action.now) };
    case 'roadshow/reset':
      return { ...state, roadshow: resetRoadshow(state.roadshow) };
    case 'roadshow/configure':
      return { ...state, roadshow: configureRoadshow(state.roadshow, action.durationMs) };
    case 'roadshow/finish':
      return { ...state, roadshow: finishRoadshow(state.roadshow) };
    case 'roadshow/setTeamName':
      return { ...state, roadshow: { ...state.roadshow, teamName: action.teamName } };
    default:
      return state;
  }
}
