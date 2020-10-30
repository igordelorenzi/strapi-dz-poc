'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#bootstrap
 */

const findPublicRole = async () => {
  const result = await strapi
    .query('role', 'users-permissions')
    .findOne({ type: 'public' });
  return result;
};

const setDefaultPermissions = async () => {
  const role = await findPublicRole();
  const permissions = await strapi
    .query('permission', 'users-permissions')
    .find({
      type: 'application',
      action: ['count', 'find', 'findone'],
      role: role.id,
    });
  await Promise.all(
    permissions.map(p =>
      strapi
        .query('permission', 'users-permissions')
        .update({ id: p.id }, { enabled: true })
    )
  );
};

const isFirstRun = async () => {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  const initHasRun = await pluginStore.get({ key: 'initHasRun' });
  await pluginStore.set({ key: 'initHasRun', value: true });
  return !initHasRun;
};

const createSeedData = async () => {
  const devEntry = await strapi.services.development.findOne({ id: 1 });
  if (!devEntry) {
    await strapi.services.development.create({
      sections: [
        {
          __component: 'development.about-section',
          description: 'Lorem ipsum...'
        },
        {
          __component: 'development.custom-section',
          items: [
            {
                __component: 'development.title',
                text: 'Magazine'
            },
            {
                __component: 'development.long-text',
                text: 'Lorem ipsum...'
            }
          ]
        }
      ]
    });
    console.log('Created development data.');
  }
  const homeEntry = await strapi.services.home.find({ id: 1 });
  if (!homeEntry) {
    await strapi.services.home.createOrUpdate({
      featured_portfolio: {
        __component: 'home.featured-portfolio',
        title: 'Portfolio',
        neighborhoods: [
          {
            __component: 'portfolio.neighborhood-block',
            subtitle: 'Centro',
            developments: [1],
          },
        ],
      }
    });
    console.log('Created home data.');
  }
};

const wipeTables = async () => {
  let knexConfig = {
    client: 'sqlite',
    connection: {
      filename: '.tmp/data.db',
    },
    useNullAsDefault: true,
  };
  const knex = require('knex')(knexConfig);
  const bookshelf = require('bookshelf')(knex);
  // const query = "SELECT name FROM sqlite_master WHERE type='table'";
  // const res = await bookshelf.knex.raw(query);
  // console.log(res);
  try {
    await bookshelf.knex('developments_components').truncate();
    await bookshelf.knex('developments').truncate();
    await bookshelf.knex('homes_components').truncate();
    await bookshelf.knex('homes').truncate();
    const pluginStore = strapi.store({
      environment: strapi.config.environment,
      type: 'type',
      name: 'setup',
    });
    await pluginStore.set({ key: 'initHasRun', value: false });
    console.log('Custom tables successfully wiped.');
  } catch (e) {
    console.log('Unable to wipe tables.');
    console.error(e);
  }
};

module.exports = async () => {
  // await wipeTables();
  const shouldSetDefaultPermissions = await isFirstRun();
  if (shouldSetDefaultPermissions) {
    await setDefaultPermissions();
    await createSeedData();
  }
};
