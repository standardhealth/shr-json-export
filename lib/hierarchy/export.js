// export SHR specification content as a hierarchy in JSON format
// Author: Greg Quinn
// The exportToHierarchyJSON function produces a JSON object representing all the SHR content provided as input in a hierarchal form. Each node 
// has a name, type, and children attribute. If name is omitted, the node is anonymous. The type attribute must always exist though.
// If children is omitted, the node is a leaf (no children).
// Some types of nodes can have additional attributes as appropriate to their type.
// In the representation below, the children attribute is shown by indented node(s) on the next numbered line(s). Note that each numbered line 
// represents a type of node and can be repeated 0 to many times (except the root SHR node which there is only 1 of).
// If a node (numbered line) has 2 or more indented nodes under it, then it can have multiple types of nodes as children. Note that each of those 
// may have children too so its all the numbered lines under it that are one indent level in that represent the possible types of children of a node.

// Attribute values like <x> mean that x is the name of the attribute on the JSON object in models.js that is the value of the attribute. The type
// attribute corresponds to the JSON object in models.js.
// More complicated value expressions like:
//   <identifier.namespace>":"<identifier.name>
// This means the value of the namespace attribute of identifier followed by a colon then the value of the name attribute  of identifier.

// When an attribute value is *Type, that's a reference to one of the Types at the end of the hierarchy which specifies the format of that JSON
// object. Often it will be "*Type1 or Type2" which means the value of that attribute can be Type1 or Type2 so see the definition of *Type1 and
// *Type2.
// One of the types is *Subclass of Value which means the type can be any of the types extending from Value. That type in the type list at the end
// has multiple lines representing each of the possible subtypes that can appear in that case.

// Each line starts with a number representing its level in the hierarchy. Long node specifications are continued on the next line indented without a number

// 1{ name: SHR, type: SHR}
//		2{ name: <namespace>, type: "Namespace" }
//			3{ name: <identifier.name>, type: "Group", isEntry: <isEntry>, concepts: [ *Concept ], description: <description> }
//				4{ *QuantifiedValue }
//          3{ name: <identifier.name>, type: "DataElement", isEntry: <isEntry>, concepts: [ *Concept ], description: <description>, 
//						value: *Value or *Subclass of Value or *QuantifiedValue or *OrValues }

// *Concept				= { name: <label>" ("<codesystem>":"<code>")", type: "Concept", codesystem: <codesystem>, code: <code>, url: <url for concept> }
// *QuantifiedValue		= { type: "QuantifiedValue", min: <min>, max: <max> but if max=* then this attribute left out, value: *Value or OrValues }
// *Value 				= { name: <identifier.namespace>":"<identifier.name>, type: Value, identifier: *Identifier of DataElement or Group }
// *OrValues 			= { type: "OrValues", values: [ *Value or *QuantifiedValue or *OrValues ] }
// *Subclass of Value	= { name: "code from "<valueset>, type: "CodeFromValueSetValue", valueset: <valueset> }
//						  { name: "code descending from "<ancestor.label>" ("<ancestor.codesystem>":"<ancestor.code>")",
							type: "CodeFromAncestorValue", ancestor: *Concept }
//						  { name: <identifier.namespace>":"<identifier.name>, type: "RefValue", identifier: *Identifier}
// *Identifier			= { name: <name>, type: "Identifier", namespace: <namespace> }

// Example of JSON produced:
//{ 	name: "shr", type: "SHR",
//		children: [
//			{ 	name:"shr.actors", type:"Namespace",
//				children: [ 
//					{ 	name:"MedicalProfessional", 
//						type:"Group",
//						isEntry: true,
//						concepts:[{concept:"",...}], 
//						description:"A person who is licensed to practice a healing art.", 
//						children: [
//							{	type:"QuantifiedValue",
//								min:1,
//								value: {	name: "HumanName",
//											type: "Value" },
//							{ 	type:"QuantifiedValue", 
//								min:0, 
//								value: { 	name: "ContactInformation",
//								value: { 	name: "ContactInformation",
//											type: "Value" },
//							{	type:"QuantifiedValue", 
//								min:0, 
//								max:1, 
//								value: { 	name: "OrganizationAffiliation",
//											type: "Value" },
//							...
//						]
//					},
// ...

const {Group, QuantifiedValue, CodeFromValueSetValue, CodeFromAncestorValue, RefValue, OrValues, Value} = require('../models');

function exportToHierarchyJSON(namespaces) {
  const result = [];
  
  for (const ns of namespaces) {
	  result.push(namespaceToHierarchyJSON(ns));
  }
  return {
	name: "SHR",
	type: "SHR",
    children: result  };
}

function namespaceToHierarchyJSON(ns) {
  const definitions = [];
	
  let defs = ns.definitions.sort(function(l,r) {return l.identifier.name.localeCompare(r.identifier.name);});
  for (const def of defs) {
    definitions.push(definitionToHierarchyJSON(def));
  }	
  return {
	name: ns.namespace,
	type: "Namespace",
	children: definitions };
}

function definitionToHierarchyJSON(def) {
  if (def instanceof Group) return groupToHierarchyJSON(def);
  else return dataElementToHierarchyJSON(def);
}

function groupToHierarchyJSON(def) {
//			3{ *BaseElement, type: "Group" }
//				4{ *QuantifiedValue }
  var  result = {};
  result["type"] = "Group";
  result = baseElementToHierarchyJSON(def, result);
  const children = [];
  for (const el of def.elements) {
	  children.push(quantifiedValueToHierarchyJSON(el));
  }
  result["children"] = children;
  return result;
}

function dataElementToHierarchyJSON(def) {
//          3{ *BaseElement, type: "DataElement", 
//						value: *Value or *Subclass of Value or *QuantifiedValue or *OrValues }
  var result = {};
  result["type"] = "DataElement";
  result = baseElementToHierarchyJSON(def, result);
  if (def.value instanceof CodeFromValueSetValue) {
    result["value"] = codeFromValueSetValueToHierarchyJSON(def.value);
  } else if (def.value instanceof CodeFromAncestorValue) {
    result["value"] = codeFromAncestorValueToHierarchyJSON(def.value);
  } else if (def.value instanceof RefValue) {
    result["value"] = refValueSetValueToHierarchyJSON(def.value);
  } else if (def.value instanceof Value) {
	result["value"] = valueToHierarchyJSON(def.value);
  } else if (def.value instanceof QuantifiedValue) {
	result["value"] = quantifiedValueToHierarchyJSON(def.value);
  } else if (def.value instanceof OrValues) {
	result["value"] = orValuesToHierarchyJSON(def.value);
  }  
  return result;
}

function baseElementToHierarchyJSON(def, result) {
//3{ name: <identifier.name>, isEntry: <isEntry>, concepts: [ *Concept ], description: <description> 
  result["name"] = def.identifier.name;
  result["isEntry"] = def.isEntry;
  result["concepts"] = conceptsToHierarchyJSON(def.concepts);
  result["description"] = def.description;
  return result;
}

function conceptsToHierarchyJSON(concepts) {
  const result = [];
	
  if (concepts.length > 0) {
    for (const concept of concepts) {
      result.push(conceptToHierarchyJSON(concept));
    }
  }
	
  return result;
}

function quantifiedValueToHierarchyJSON(value) {
// *QuantifiedValue		= { type: "QuantifiedValue", min: <min>, max: <max> but if max=* then this attribute left out, value: *Value or OrValues }
  const result = {};
  result["type"] = "QuantifiedValue";
  result["min"] = value.min;
  if (!value.isMaxUnbounded()) {
	  result["max"] = value.max;
  }
  if (value.value instanceof Value) {
	  result["value"] = valueToHierarchyJSON(value.value);
  } else {
	  result["value"] = orValuesToHierarchyJSON(value.value);
  }
  return result;
}

function valueToHierarchyJSON(value) {
// *Value 				= { name: <identifier.namespace>":"<identifier.name>, type: Value, identifier: *Identifier of DataElement or Group }
  return {	name: identifierToString(value.identifier),
			type: "Value",
			identifier: identifierToHierarchyJSON(value.identifier) };
}

function orValuesToHierarchyJSON(value) {
// *OrValues 			= { type: "OrValues", values: [ *Value or *QuantifiedValue or *OrValues ] }
  const result = {};
  result["type"] = "OrValues";
  const valuesResult = [];
  for (const v of value.values) {
	  if (v instanceof QuantifiedValue) {
		  valuesResult.push(quantifiedValueToHierarchyJSON(v));
	  } else if (v instanceof OrValues) {
		  valuesResult.push(orValuesToHierarchyJSON(v));
	  } else {
		  valuesResult.push(valueToHierarchyJSON(v));
	  }
  }
  result["values"] = valuesResult;
  return result;
}

// *Subclass of Value	= { name: <valueset>, type: "CodeFromValueSetValue" }
//						  { type: "CodeFromAncestorValue", ancestor: *Concept }
//						  { name: <identifier.namespace>":"<identifier.name>, type: "RefValue", identifier: *Identifier}
function codeFromValueSetValueToHierarchyJSON(value) {
	return {	name: `code from ${value.valueset}`,
				type: "CodeFromValueSetValue",
				valueset: value.valueset };
}

function codeFromAncestorValueToHierarchyJSON(value) {
	return {	name: `code descending from ${conceptToString(value.ancestor)}`,
				type: "CodeFromAncestorValue",
				ancestor: conceptToHierarchyJSON(value.ancestor) };
}

function refValueSetValueToHierarchyJSON(value) {
	return {	name: identifierToString(value.identifier),
				type: "RefValue",
				identifier: identifierToHierarchyJSON(value.identifier) };
}

function conceptToString(concept) {
  if (concept.label) {
	  return `${concept.label} (${concept.codesystem}:${concept.code})`;
  } else {
	  return `${concept.codesystem}:${concept.code}`
  }
}

function conceptToHierarchyJSON(concept) {
// *Concept				= { name: <label> else <codesystem>":"<code>, type: "Concept", codesystem: <codesystem>, code: <code>, url: <url for concept> }
  const result = {};
  result["name"] = conceptToString(concept);
  result["type"] = "Concept";
  result["codesystem"] = concept.codesystem;
  result["code"] = concept.code;
  
  var url;
  switch (concept.codesystem) {
  case 'http://uts.nlm.nih.gov/metathesaurus':
	url = `https://uts.nlm.nih.gov/metathesaurus.html?cui=${concept.code}`;
	break;
  case 'http://snomed.info/sct':
	url = `https://uts.nlm.nih.gov/snomedctBrowser.html?conceptId=${concept.code}`;
	break;
  case 'http://loinc.org':
	url = `http://s.details.loinc.org/LOINC/${concept.code}.html`;
	break;
  case 'http://unitsofmeasure.org':
	url = 'http://unitsofmeasure.org/ucum.html#section-Alphabetic-Index-By-Symbol';
	break;
  default:
	url = `${concept.codesystem}/${concept.code}`;
  }
  result["url"] = url;
  return result;
}

function identifierToString(identifier) {
	return `${identifier.namespace}:${identifier.name}`;
}

function identifierToHierarchyJSON(identifier) {
// *Identifier			= { name: <name>, type: "Identifier", namespace: <namespace> }
  return { 	name: identifier.name, 
			type: "Identifier",
			namespace: identifier.namespace };
}

module.exports = {exportToHierarchyJSON};