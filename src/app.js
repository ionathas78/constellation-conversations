// Independent enhancements keep a media failure from disabling reading or stories.
for (const module of ['theme', 'dice-ui', 'story-ui', 'media', 'feedback']) {
  import(`./${module}.js`).catch(error => console.warn(`Constellation: ${module} enhancement unavailable.`, error));
}
