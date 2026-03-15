export const timezonesPaths = {
  '/api/v1/timezones': {
    get: {
      tags: ['Timezones'],
      summary: 'Get supported IANA timezones',
      description:
        'Returns supported IANA timezone identifiers with UTC offset labels. Supports autocomplete by timezone name or UTC offset query (for example: "kyiv", "new_york", "+2", "utc-05:00").',
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: false,
          schema: { type: 'string', maxLength: 100 },
          description: 'Autocomplete query by timezone name or UTC offset',
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 200 },
          description: 'Maximum number of items returned',
        },
        {
          name: 'groupByOffset',
          in: 'query',
          required: false,
          schema: { type: 'boolean', default: false },
          description:
            'When true, returns one representative timezone per UTC offset for simpler selection',
        },
      ],
      responses: {
        200: {
          description: 'Timezone list',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TimezonesListResponse' },
              example: {
                items: [
                  { value: 'America/New_York', label: '(UTC-05:00) America/New_York' },
                  { value: 'UTC', label: '(UTC+00:00) UTC' },
                  { value: 'Europe/Kyiv', label: '(UTC+02:00) Europe/Kyiv' },
                  { value: 'Asia/Tokyo', label: '(UTC+09:00) Asia/Tokyo' },
                ],
              },
            },
          },
        },
      },
    },
  },
};
