function inferDependencies(parsedResources) {
  const deps = [];
  // Iterate over all resources
  for (const [type, resources] of Object.entries(parsedResources.resource || {})) {
    for (const [name, configs] of Object.entries(resources)) {
      // configs may be an array (from hcl2json)
      const configArray = Array.isArray(configs) ? configs : [configs];
      configArray.forEach((config, idx) => {
        const fromId = `${type}.${name}`;
        // Check for explicit depends_on
        if (config.depends_on) {
          (Array.isArray(config.depends_on) ? config.depends_on : [config.depends_on]).forEach(dep => {
            deps.push({ from: fromId, to: dep });
          });
        }
        // Check for implicit references in all string attributes
        for (const [attr, value] of Object.entries(config)) {
          if (typeof value === 'string') {
            const matches = value.match(/aws_[a-z_]+\.[a-zA-Z0-9_]+/g);
            if (matches) {
              matches.forEach(ref => {
                deps.push({ from: fromId, to: ref });
              });
            }
          }
          // Also check inside arrays of strings
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (typeof v === 'string') {
                const matches = v.match(/aws_[a-z_]+\.[a-zA-Z0-9_]+/g);
                if (matches) {
                  matches.forEach(ref => {
                    deps.push({ from: fromId, to: ref });
                  });
                }
              }
            });
          }
        }
      });
    }
  }
  return deps;
}

module.exports = { inferDependencies };
