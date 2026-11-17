require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  getEventDates,
  getTomorrowsDay,
} = require('@/services/webhooks/ultimate-thread/event-dates');

const RealDate = Date;

const withFixedNow = (iso, run) => {
  global.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [iso]));
    }
  };
  try {
    run();
  } finally {
    global.Date = RealDate;
  }
};

test('event date is the upcoming Saturday at midnight', () => {
  withFixedNow('2026-11-17T15:30:00', () => {
    const { eventDate } = getEventDates();
    assert.equal(eventDate.getDay(), 6);
    assert.equal(eventDate.getDate(), 21);
    assert.equal(eventDate.getHours(), 0);
  });
});

test('event date stays on the same day when today is Saturday', () => {
  withFixedNow('2026-11-21T09:00:00', () => {
    assert.equal(getEventDates().eventDate.getDate(), 21);
  });
});

test('expiration is three days after the event', () => {
  withFixedNow('2026-11-17T15:30:00', () => {
    const { eventDate, expirationDate } = getEventDates();
    assert.equal((expirationDate - eventDate) / 86_400_000, 3);
  });
});

test('formats the event day as dd/mm/yyyy', () => {
  withFixedNow('2026-11-17T15:30:00', () => {
    assert.equal(getTomorrowsDay(), '21/11/2026');
  });
});
