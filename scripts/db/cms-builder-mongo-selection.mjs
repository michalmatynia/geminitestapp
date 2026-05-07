export const cmsSettingsFilter = {
  $or: [{ key: /^cms_/ }, { _id: /^cms_/ }],
};

export const cmsAnalyticsFilter = {
  path: /^\/(?:[a-z]{2}\/)?(?:cms|admin\/cms)(?:\/|$)/,
};

export const cmsImageFilesFilter = {
  $or: [{ filepath: /^\/uploads\/cms(?:\/|$)/ }, { tags: 'cms' }],
};

export const cmsFileUploadEventsFilter = {
  $or: [{ category: 'cms' }, { filepath: /^\/uploads\/cms(?:\/|$)/ }],
};

export const parseDbNameFromUri = (uri, fallback) => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, '').trim();
    return dbName || fallback;
  } catch {
    return fallback;
  }
};

export const buildMongoOptions = (uri) => ({
  ...(uri.startsWith('mongodb+srv://') ? {} : { directConnection: true }),
  serverSelectionTimeoutMS: 3000,
});

export const isFullCmsBuilderCollection = (name) => name.startsWith('cms_');

export const collectCmsBuilderMongoSelections = async (sourceDb) => {
  const sourceCollections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
  const sourceCollectionNames = new Set(sourceCollections.map((item) => item.name));
  const selections = [...sourceCollectionNames]
    .filter(isFullCmsBuilderCollection)
    .sort()
    .map((name) => ({ name, filter: {}, scope: 'full-collection' }));

  if (sourceCollectionNames.has('settings')) {
    selections.push({ name: 'settings', filter: cmsSettingsFilter, scope: 'cms-settings' });
  }

  if (sourceCollectionNames.has('image_files')) {
    selections.push({
      name: 'image_files',
      filter: cmsImageFilesFilter,
      scope: 'cms-image-files',
    });
  }

  if (sourceCollectionNames.has('file_upload_events')) {
    selections.push({
      name: 'file_upload_events',
      filter: cmsFileUploadEventsFilter,
      scope: 'cms-file-upload-events',
    });
  }

  if (sourceCollectionNames.has('analytics_events')) {
    selections.push({
      name: 'analytics_events',
      filter: cmsAnalyticsFilter,
      scope: 'cms-analytics',
    });
  }

  return { sourceCollectionNames, selections };
};
