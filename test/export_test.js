const fs = require('fs');
const th = require('shr-test-helpers');
const {exportToJSON} = require('../lib/export');

describe('#exportToJSON()', th.commonExportTests(importFixture, exportNamespaces));

function exportNamespaces(...namespace) {
  return exportToJSON(namespace);
}

function importFixture(name, ext='.json') {
  return JSON.parse(fs.readFileSync(`${__dirname}/fixtures/${name}${ext}`, 'utf8'));
}
