import { jest } from '@jest/globals';

const technologiesServiceMock = {
  getTechnologyTypes: jest.fn(),
  searchTechnologies: jest.fn(),
};

jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);

const technologiesController = await import('../../src/controllers/technologies.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('technologies.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getTechnologies parses params and returns 200', async () => {
    technologiesServiceMock.searchTechnologies.mockResolvedValue({ items: [{ id: 'tech-1' }] });

    const req = { query: { q: 'node', type: 'BACKEND', limit: '10', activeOnly: 'false' } };
    const res = createResponseMock();
    const next = jest.fn();

    await technologiesController.getTechnologies(req, res, next);

    expect(technologiesServiceMock.searchTechnologies).toHaveBeenCalledWith({
      q: 'node',
      type: 'BACKEND',
      limit: 10,
      activeOnly: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 'tech-1' }] });
    expect(next).not.toHaveBeenCalled();
  });

  test('getTechnologyTypesList returns enum list', async () => {
    technologiesServiceMock.getTechnologyTypes.mockReturnValue(['BACKEND', 'FRONTEND']);

    const req = {};
    const res = createResponseMock();
    const next = jest.fn();

    await technologiesController.getTechnologyTypesList(req, res, next);

    expect(technologiesServiceMock.getTechnologyTypes).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: ['BACKEND', 'FRONTEND'] });
    expect(next).not.toHaveBeenCalled();
  });

  test('getTechnologies forwards errors to next', async () => {
    const error = new Error('service failed');
    technologiesServiceMock.searchTechnologies.mockRejectedValue(error);

    const req = { query: { q: 'node' } };
    const res = createResponseMock();
    const next = jest.fn();

    await technologiesController.getTechnologies(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
