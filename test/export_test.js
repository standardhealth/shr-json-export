const fs = require('fs');
const th = require('shr-test-helpers');
const {exportToHierarchyJSON} = require('../lib/export');

describe('#exportToJSON()', th.commonExportTests(importFixture, exportNamespaces));

function exportNamespaces(...namespace) {
  let hierarchy = exportToHierarchyJSON(namespace);
  // for now, only check the first one (the primary entry of interest)
  return hierarchy;
}

function importFixture(name, ext='.json') {
  return JSON.parse(fs.readFileSync(`${__dirname}/fixtures/${name}${ext}`, 'utf8'));
}
