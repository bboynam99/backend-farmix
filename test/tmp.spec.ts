import { Address } from '@ton/core';

describe('tmp', () => {

  it('tmp', async () => {
    const addr = Address.parse('0QBqZd4MRHZacq6v_s_s0v85AVq4eXlUE4gj386BAi-GV5RR');

    console.log(addr.toRawString());

  });
});