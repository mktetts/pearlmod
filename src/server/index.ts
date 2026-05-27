import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { forms } from './routes/forms';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/form', forms);
internal.route('/triggers', triggers);

app.route('/api', api);
app.route('/internal', internal);

import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';

app.post('/internal/menu/mop-comments', async (c) => {
  const _input = await c.req.json<MenuItemRequest>();
  return c.json<UiResponse>({
    showForm: {
      name: 'mopForm',
      form: {
        title: 'Mop Comments',
        acceptLabel: 'Mop',
        cancelLabel: 'Cancel',
        fields: [
          { name: 'remove', label: 'Remove comments', type: 'boolean', defaultValue: true },
          { name: 'lock', label: 'Lock comments', type: 'boolean', defaultValue: false },
          {
            name: 'skipDistinguished',
            label: 'Skip distinguished comments',
            type: 'boolean',
            defaultValue: false,
          },
        ],
      },
    },
  });
});

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
