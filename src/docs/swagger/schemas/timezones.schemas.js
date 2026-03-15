export const timezonesSchemas = {
  TimezoneItem: {
    type: 'object',
    required: ['value', 'label'],
    properties: {
      value: {
        type: 'string',
        description: 'IANA timezone identifier',
        example: 'Europe/Kyiv',
      },
      label: {
        type: 'string',
        description: 'Human-readable label with UTC offset',
        example: '(UTC+02:00) Europe/Kyiv',
      },
    },
  },
  TimezonesListResponse: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/TimezoneItem' },
        description: 'List of supported IANA timezones',
      },
    },
  },
};
