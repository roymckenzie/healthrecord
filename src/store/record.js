import { Y, getYjsDoc } from '@syncedstore/core';
import { reactive, watch, shallowRef } from 'vue';
import { Buffer } from 'buffer';

/** @type {import('vue').ShallowRef<import('@syncedstore/core/types/doc').MappedTypeDescription<import('../typedefs').HealthRecord>>} */
export const record = shallowRef();

/**
 * Record store
 * 
 * @since 0.1.0
 */
export const store  = reactive({

  record,

  downloadable() {
    const doc = getYjsDoc(record.value);
    const encodedState = Y.encodeStateAsUpdate(doc);
    const state = Buffer.from(encodedState).toString('base64');
    const exportable = {
      state,
      type: 'healthRecord'
    }
    return exportable;
  }
});

watch(record, (value) => {
  if (value) {
    localStorage.setItem('isActive', true);
  } else {
    localStorage.removeItem('isActive');
  }
});
