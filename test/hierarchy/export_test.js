const fs = require('fs');
const th = require('../test_helper');
const {exportToHierarchyJSON} = require('../../lib/hierarchy/export');

describe('#exportToHierarchyJSON()', th.commonTests(importFixture, exportNamespaces));

function exportNamespaces(...namespace) {
  let hierarchy = exportToHierarchyJSON(namespace);
  // for now, only check the first one (the primary entry of interest)
  return hierarchy;
}

function importFixture(name, ext='.json') {
  return JSON.parse(fs.readFileSync(`${__dirname}/fixtures/${name}${ext}`, 'utf8'));
}
