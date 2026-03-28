import { jest } from '@jest/globals';

const getTimezonesMock = jest.fn();

jest.unstable_mockModule('../../src/services/timezones.service.js', () => ({
  getTimezones: getTimezonesMock,
}));

const { getTimezonesHandler } = await import('../../../src/controllers/timezones.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('timezones.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with service result', async () => {
    const req = {
      query: { q: 'kyiv', limit: '10', groupByOffset: 'true' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    getTimezonesMock.mockReturnValue({
      items: [{ value: 'Europe/Kyiv', label: '(UTC+02:00) Europe/Kyiv' }],
    });

    await getTimezonesHandler(req, res, next);

    expect(getTimezonesMock).toHaveBeenCalledWith({
      q: 'kyiv',
      limit: '10',
      groupByOffset: 'true',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [{ value: 'Europe/Kyiv', label: '(UTC+02:00) Europe/Kyiv' }],
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('passes errors to next', async () => {
    const req = { query: {} };
    const res = createResponseMock();
    const next = jest.fn();
    const error = new Error('service failed');

    getTimezonesMock.mockImplementation(() => {
      throw error;
    });

    await getTimezonesHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
