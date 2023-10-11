import { Doc } from 'yjs';
import syncedStore from '@syncedstore/core';
import { enableVueBindings } from '@syncedstore/core';
import * as Vue from 'vue';
import { Buffer } from 'buffer';
import { applyUpdate } from 'yjs';
import { record } from '../store/record';

enableVueBindings(Vue);

const recordVersion = "3";

export const doc = new Doc();

doc.on('update', () => {
  if (record.value.id.toString().length > 0) {
    localStorage.setItem('isActive', String(true));
  } else {
    localStorage.removeItem('isActive');
  }
});

/** @type {import('../typedefs').HealthRecordDocType} */
const shape = {
  id: 'text',
  version: 'text',
  firstName: 'text',
  lastName: 'text',
  // @ts-expect-error
  user: {},
  /** @type {import('../typedefs').Person[]} */
  people: [],
  /** @type {import('../typedefs').Vital[]} */
  vitals: [],
  /** @type {import('../typedefs').Measurement[]} */
  measurements: []
}

export const createSyncedStore = () => {
  return syncedStore(shape, doc);
}

/**
 * @param {string} recordData Record JSON stringified
 */
export const load = (recordData) => {
  const recordObject = JSON.parse(recordData);
  if ('state' in recordObject) {
    importState(recordObject);
  } else {
    importRecord(recordObject)
  }
  record.value = syncedStore(shape, doc);
}

/**
 * Imports HealthRecord data into a SyncedStore, extracts doc, and applies to existing as Doc update
 * @param {import('../typedefs').HealthRecord} recordData Stringified HealthRecord data
 */
const importRecord = (recordData) => {

  record.value.version.insert(0, recordVersion);
  record.value.people.push(...recordData.people);
  record.value.vitals.push(...recordData.vitals);
  record.value.measurements.push(...recordData.measurements);

  migrate(recordData, record.value);
}

/**
 * Import state from Yjs Doc Uint8Array state
 * @param {{type: string, state: string, prefs: import('../typedefs').PersonPreferences}} recordData 
 */
const importState = (recordData) => {
  const state = recordData.state;
  const update = Buffer.from(state, 'base64');
  applyUpdate(doc, update);

  setTimeout(() => {
    migrateState();
  }, 100)
}

/**
 * Run migrations for older record versions
 * @param {import("../typedefs").HealthRecord} importedRecord 
 * @param {import('../typedefs').HealthRecordSyncedStore} syncedStore 
 */
const migrate = (importedRecord, syncedStore) => {
  if (! importedRecord.version || Number(importedRecord.version) <= 1) {
    syncedStore.id.insert(0, crypto.randomUUID());
  } else {
    syncedStore.id.insert(0, importedRecord.id);
  }

  if (!importedRecord.version || Number(importedRecord.version) < 3) {
    // @ts-expect-error
    syncedStore.user.firstName   = importedRecord.firstName;
    // @ts-expect-error
    syncedStore.user.lastName    = importedRecord.lastName;
    syncedStore.user.preferences = { webRTC: { enabled:false, signalerUrl: null } };
  } else {
    syncedStore.user.firstName   = importedRecord.user.firstName;
    syncedStore.user.lastName    = importedRecord.user.firstName;
    syncedStore.user.preferences = importedRecord.user.preferences;
  }
}

const migrateState = () => {
  if (!record.value.user.firstName) {
    record.value.user.firstName = record.value.firstName.toString();
    record.value.user.lastName = record.value.lastName.toString();
    record.value.user.preferences = {
      webRTC: {
        enabled: false,
        signalerUrl: null
      }
    }
  }
}
